// App wiring, loaded by main.js after first paint. The only module that knows
// about data, scene and motion together, and the owner of the single frame
// loop (gsap.ticker).
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PROJECTS, FEATURED, repoUrl } from "./data/projects.js";
import { PATH } from "./data/path.js";
import { buildGraph } from "./scene/graph.js";
import { createNullScene } from "./scene/null-scene.js";
import { createWatchdog } from "./scene/quality.js";
import { createFocus } from "./state/focus.js";
import { readTokens } from "./motion/tokens.js";
import { initSmoothScroll } from "./motion/lenis.js";
import { playIntro } from "./motion/intro.js";
import { initTour } from "./motion/tour.js";
import { initSectionFocus, initWipes } from "./motion/sections.js";
import { initMagnetic, initCursor } from "./motion/pointer.js";
import { initProjectsList } from "./ui/projects-list.js";
import { initProjectView } from "./ui/project-view.js";
import { initAbout } from "./ui/about.js";
import { initContact } from "./ui/contact.js";
import { initPath } from "./ui/path.js";
import { initExplorable } from "./research/explorable.js";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const $ = (s) => document.querySelector(s);
// Yield to the browser between boot stages so no single task blocks input for long.
const yieldTask = () => new Promise((r) => setTimeout(r, 0));
const mqReduced = matchMedia("(prefers-reduced-motion: reduce)");
const reduced = mqReduced.matches;
const wide = () => innerWidth > 860;

// The three.js chunk loads once the page has loaded and the main thread is
// idle, so building the scene never competes with first paint or the intro.
const whenIdle = () => new Promise((resolve) => {
  const go = () => ("requestIdleCallback" in window ? requestIdleCallback(() => resolve(), { timeout: 1200 }) : setTimeout(resolve, 300));
  if (document.readyState === "complete") go(); else addEventListener("load", go, { once: true });
});
const sceneModule = whenIdle().then(() => import("./scene/host.js"));
sceneModule.catch(() => {}); // handled below; this only stops an unhandled-rejection report during boot

const graph = buildGraph(PROJECTS);
const tokens = readTokens();

// ---- scene handle: a no-op stand-in until three.js is ready ----
let scene = createNullScene();
const getScene = () => scene;
const focus = createFocus((v) => {
  scene.setFocus({ ids: v.ids, aimId: v.aimId });
  scene.setShift(v.shift[0], v.shift[1]);
});

// ---- hero first: the intro is the only thing visible above the fold ----
const intro = playIntro({ hero: $("#top"), tokens, reduced });
const lenis = initSmoothScroll({ reduced });
gsap.ticker.lagSmoothing(0);

// Render on demand. Full rate while anything moves (scroll, input, assembly,
// focus changes, tour); otherwise the graph's ambient drift runs at the tier's
// idle frame rate. Input wakes it on the same frame.
let lastInput = 0, idleAcc = 0;
const wake = () => { lastInput = performance.now(); };
for (const t of ["pointermove", "pointerdown", "wheel", "touchstart", "keydown"]) addEventListener(t, wake, { passive: true });
// One-way quality watchdog: sustained slow full-rate frames step the scene down a tier.
const watchdog = createWatchdog({ budgetMs: 22, windowMs: 2000, onStepDown: () => scene.stepDown() });

gsap.ticker.add((time, deltaMs) => {
  lenis?.raf(time * 1000);
  const dt = Math.min((deltaMs || 16.7) / 1000, 0.05); // clamp: a returning tab never jumps the graph
  const active = scene.needsFrame() || Math.abs(lenis?.velocity ?? 0) > 0.01 || performance.now() - lastInput < 600;
  if (active || reduced) {
    scene.render(Math.min(dt + idleAcc, 0.1));
    idleAcc = 0;
    if (active && !reduced && scene.assembled) watchdog.feed(deltaMs);
  } else if (scene.idleFps > 0) {
    idleAcc += dt;
    if (idleAcc >= 1 / scene.idleFps) { scene.render(Math.min(idleAcc, 0.1)); idleAcc = 0; }
  }
});

await yieldTask();

// ---- below-the-fold content ----
renderTourPanels(FEATURED);
const view = initProjectView({ projects: PROJECTS, graph, focus, lenis, reduced, tokens });
const list = initProjectsList({ projects: PROJECTS, graph, focus, openProject: (id, from) => view.show(id, from), isOpen: view.isOpen });
const explorable = initExplorable($("#rx"), { reduced, tokens });
await yieldTask();

// ScrollTriggers must be created in page order: the tour's pin adds six
// viewports of spacing, and triggers below it are measured after it.
const sections = initSectionFocus({ graph, focus, wide });
// Pinning needs room: short or very narrow viewports (and 400% zoom) get the static list.
const roomy = innerHeight >= 560 && innerWidth >= 320;
const tour = initTour({ section: $("#work"), steps: FEATURED, graph, focus, getScene, tokens, reduced: reduced || !roomy, wide });
await yieldTask();
initAbout({ reduced, tokens });
initPath(PATH, { reduced });
initContact({ getScene, reduced });
initWipes({ reduced });
const offMagnet = initMagnetic("[data-magnetic]", { tokens, reduced });
const offCursor = initCursor({ tokens, reduced });

// ---- scene ----
let pending = null; // a scene that exists but is not attached yet
sceneModule
  .then(async ({ createSceneHost }) => {
    // The graph renders in a worker when the browser allows it (see scene/host.js).
    const s = pending = createSceneHost({ canvas: $("#graph"), labels: $("#labels"), tip: $("#tip"), graph, reduced });
    s.onLost(() => useFallback("context lost"));
    await s.ready; // shaders compiled, one program per task
    scene = s; pending = null;
    focus.refresh();
    intro.attachScene(s);
    tour.trigger?.update(); // if the user is parked mid-tour, show the tour camera now
    s.onPick((hit) => (hit.kind === "p" ? view.show(hit.id) : list.selectChip(hit.label)));
  })
  .catch((err) => useFallback(err));

function useFallback(reason) {
  if (import.meta.env.DEV) console.info("[graph] static fallback:", reason?.message || reason);
  pending?.dispose(); pending = null;
  scene.dispose();
  scene = createNullScene();
  document.documentElement.classList.add("nogl");
  $("#graph-fallback").hidden = false;
  intro.attachScene(scene);
}

// ---- resize: scene first, then scroll positions ----
let rt = 0;
addEventListener("resize", () => {
  clearTimeout(rt);
  rt = setTimeout(() => { scene.resize(); sections.refresh(); }, 150); // ScrollTrigger refreshes itself on resize
});

// Turning reduced motion on or off changes what is set up; reload is simplest and safe.
mqReduced.addEventListener("change", () => location.reload());

document.fonts?.ready.then(() => ScrollTrigger.refresh());

function renderTourPanels(steps) {
  const ol = $("#tour-panels");
  for (const p of steps) {
    const li = document.createElement("li");
    li.className = "tour-panel";
    li.innerHTML = `<article><h3></h3><p class="where"></p><p class="desc"></p><p class="status"></p><p class="links"></p></article>`;
    li.querySelector("h3").textContent = p.t;
    li.querySelector(".where").textContent = p.w;
    li.querySelector(".desc").textContent = p.d;
    li.querySelector(".status").textContent = p.s;
    const links = li.querySelector(".links");
    const more = document.createElement("a"); more.href = `#/project/${p.id}`; more.dataset.projectLink = p.id; more.textContent = `More about ${p.t}`; links.appendChild(more);
    const a = document.createElement("a"); a.href = repoUrl(p); a.textContent = `${p.t} on GitHub`; links.appendChild(a);
    if (p.live) { const b = document.createElement("a"); b.href = p.live; b.textContent = "Live site"; b.setAttribute("aria-label", `${p.t} live site`); links.appendChild(b); }
    ol.appendChild(li);
  }
}

// Dev-only handle for debugging and the e2e script (stripped from production builds).
if (import.meta.env.DEV) window.__portfolio = { getScene, focus, lenis, watchdog };

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    scene.dispose(); tour.kill(); sections.disconnect(); offMagnet(); offCursor(); lenis?.destroy();
    ScrollTrigger.getAll().forEach((t) => t.kill());
  });
}
