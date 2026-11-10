// Boot and wiring. The only module that knows about data, scene and motion
// together, and the owner of the single frame loop (gsap.ticker).
import "./styles/base.css";
import "./styles/sections.css";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PROJECTS, FEATURED, repoUrl } from "./data/projects.js";
import { PATH } from "./data/path.js";
import { buildGraph } from "./scene/graph.js";
import { createNullScene } from "./scene/null-scene.js";
import { createFocus } from "./state/focus.js";
import { readTokens } from "./motion/tokens.js";
import { initSmoothScroll } from "./motion/lenis.js";
import { playIntro } from "./motion/intro.js";
import { initTour } from "./motion/tour.js";
import { initSectionFocus, initWipes } from "./motion/sections.js";
import { initMagnetic, initCursor } from "./motion/pointer.js";
import { initProjectsList } from "./ui/projects-list.js";
import { initResearchDemo, initPath } from "./ui/research-demo.js";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const $ = (s) => document.querySelector(s);
const mqReduced = matchMedia("(prefers-reduced-motion: reduce)");
const reduced = mqReduced.matches;
const mobile = matchMedia("(max-width: 860px), (pointer: coarse)").matches;
const wide = () => innerWidth > 860;

// Start fetching the three.js chunk immediately; it never blocks the text.
const sceneModule = import("./scene/scene.js");

const graph = buildGraph(PROJECTS);
const tokens = readTokens();

// ---- scene handle: a no-op stand-in until three.js is ready ----
let scene = createNullScene();
const getScene = () => scene;
const focus = createFocus((v) => {
  scene.setFocus({ ids: v.ids, aimId: v.aimId });
  scene.setShift(v.shift[0], v.shift[1]);
});

// ---- DOM content ----
renderTourPanels(FEATURED);
initPath(PATH);
initResearchDemo();
const list = initProjectsList({ projects: PROJECTS, graph, focus });

// ---- motion ----
const lenis = initSmoothScroll({ reduced });
gsap.ticker.lagSmoothing(0);
gsap.ticker.add((time, deltaMs) => {
  lenis?.raf(time * 1000);
  // clamp dt so a long frame (or a returning background tab) never jumps the graph
  scene.render(Math.min((deltaMs || 16.7) / 1000, 0.05));
});

const intro = playIntro({ hero: $("#top"), tokens, reduced });
const sections = initSectionFocus({ graph, focus, wide });
const tour = initTour({ section: $("#work"), steps: FEATURED, graph, focus, getScene, tokens, reduced, wide });
initWipes({ reduced });
const offMagnet = initMagnetic("[data-magnetic]", { tokens, reduced });
const offCursor = initCursor({ tokens, reduced });

// ---- scene ----
sceneModule
  .then(({ createScene }) => {
    const s = createScene({
      canvas: $("#graph"), labels: $("#labels"), tip: $("#tip"), graph, reduced,
      particles: mobile ? 40 : 150,
    });
    scene = s;
    focus.refresh();
    intro.attachScene(s);
    s.onPick((hit) => (hit.kind === "p" ? list.open(hit.id) : list.selectChip(hit.label)));
    s.onLost(() => useFallback("context lost"));
  })
  .catch((err) => useFallback(err));

function useFallback(reason) {
  if (import.meta.env.DEV) console.info("[graph] static fallback:", reason?.message || reason);
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
  rt = setTimeout(() => { scene.resize(); sections.refresh(); ScrollTrigger.refresh(); }, 150);
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
    const a = document.createElement("a"); a.href = repoUrl(p); a.textContent = `${p.t} on GitHub`; links.appendChild(a);
    if (p.live) { const b = document.createElement("a"); b.href = p.live; b.textContent = "Live site"; links.appendChild(b); }
    ol.appendChild(li);
  }
}

// Dev-only handle for debugging and the e2e script (stripped from production builds).
if (import.meta.env.DEV) window.__portfolio = { getScene, focus, lenis };

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    scene.dispose(); tour.kill(); offMagnet(); offCursor(); lenis?.destroy();
    ScrollTrigger.getAll().forEach((t) => t.kill());
  });
}
