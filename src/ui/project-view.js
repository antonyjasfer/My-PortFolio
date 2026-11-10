// Project detail view at #/project/<id>. Opens with a shared-element
// transition from wherever the user came from (View Transitions API, with a
// GSAP FLIP fallback); Back and Esc return to the same scroll position and to
// the element that opened it.
import { gsap } from "gsap";
import { repoUrl } from "../data/projects.js";
import { neighbourhood } from "../scene/graph.js";

const ROUTE = /^#\/project\/([\w-]+)$/;
export const routeId = (hash) => (ROUTE.exec(hash || "") || [])[1] || null;

export function initProjectView({ projects, graph, focus, lenis, reduced, tokens }) {
  const $ = (s) => document.querySelector(s);
  const view = $("#project-view"), title = $("#pv-title");
  const background = [$("main"), $("header.top"), $(".foot")];
  let current = null, opener = null, source = null, savedY = 0, pushed = false;

  function fill(p) {
    title.textContent = p.t;
    $("#pv-where").textContent = p.w;
    $("#pv-desc").textContent = p.d;
    $("#pv-status").textContent = p.s;
    const ul = $("#pv-skills"); ul.replaceChildren();
    for (const k of p.k) { const li = document.createElement("li"); li.textContent = k; ul.appendChild(li); }
    const links = $("#pv-links"); links.replaceChildren();
    const a = document.createElement("a"); a.href = repoUrl(p); a.className = "btn"; a.textContent = "Code on GitHub"; links.appendChild(a);
    if (p.live) {
      const b = document.createElement("a"); b.href = p.live; b.className = "btn ghost"; b.textContent = "Live site";
      b.setAttribute("aria-label", `${p.t} live site`); links.appendChild(b);
    }
  }

  const setOpen = (on) => {
    view.hidden = !on;
    document.documentElement.classList.toggle("pv-open", on);
    background.forEach((el) => el && (el.inert = on));
    if (on) lenis?.stop(); else lenis?.start();
  };

  // shared element: the clicked title morphs into the heading (or back)
  function transition(update, from, to) {
    // a shared element needs both ends; without one (deep link, graph pick) it is a plain swap
    const shared = !reduced && from && to;
    const canVT = shared && typeof document.startViewTransition === "function";
    if (canVT) {
      from.style.viewTransitionName = "project-title";
      const vt = document.startViewTransition(() => { from.style.viewTransitionName = ""; update(); to.style.viewTransitionName = "project-title"; });
      vt.finished.finally(() => { to.style.viewTransitionName = ""; });
      return vt.updateCallbackDone;
    }
    const a = shared ? from.getBoundingClientRect() : null;
    update();
    if (a && to.isConnected && to.offsetParent !== null) {
      const b = to.getBoundingClientRect();
      gsap.from(to, { x: a.left - b.left, y: a.top - b.top, scale: a.height / b.height, transformOrigin: "0 0", duration: tokens.dur.base, ease: tokens.ease.out, clearProps: "transform" });
    }
    return Promise.resolve();
  }

  function open(id, { from = null } = {}) {
    const p = projects.find((x) => x.id === id);
    if (!p) return false;
    if (!current) { savedY = scrollY; opener = document.activeElement !== document.body ? document.activeElement : null; }
    current = id; source = from;
    fill(p);
    transition(() => setOpen(true), from, title).then(() => title.focus({ preventScroll: true }));
    view.scrollTop = 0;
    focus.set("dialog", { ids: neighbourhood(graph, id), aimId: id });
    return true;
  }

  function close() {
    if (!current) return;
    const back = source && source.isConnected ? source : null;
    current = null;
    focus.release("dialog");
    transition(() => {
      setOpen(false);
      // restore the reading position before the shared element lands
      if (lenis) lenis.scrollTo(savedY, { immediate: true, force: true }); else scrollTo(0, savedY);
    }, title, back).then(() => {
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      opener = null; source = null;
    });
  }

  // leave the route: history.back() if we added the entry, otherwise replace it
  function leave() {
    if (pushed) { pushed = false; history.back(); return; }
    history.replaceState(null, "", location.pathname + location.search);
    close();
  }

  // in-page links to a project remember which element they came from
  document.addEventListener("click", (e) => {
    const a = e.target.closest?.("[data-project-link]");
    if (!a) return;
    e.preventDefault();
    const id = a.dataset.projectLink;
    const from = a.closest("li, article")?.querySelector("h3, b, .pt") || a;
    history.pushState({ project: id }, "", `#/project/${id}`);
    pushed = true;
    open(id, { from });
  });

  addEventListener("popstate", () => {
    const id = routeId(location.hash);
    if (id) open(id); else { pushed = false; close(); }
  });
  addEventListener("hashchange", () => {
    const id = routeId(location.hash);
    if (id && id !== current) open(id);
    else if (!id && current) close();
  });
  $("#pv-back").addEventListener("click", leave);
  view.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); leave(); } });

  // deep link on first load: open without a transition
  const initial = routeId(location.hash);
  if (initial) open(initial);

  return {
    /** open from code (graph picks, list buttons) as if a link was followed */
    show(id, from = null) {
      if (!projects.some((p) => p.id === id)) return;
      history.pushState({ project: id }, "", `#/project/${id}`);
      pushed = true;
      open(id, { from });
    },
    isOpen: () => current !== null,
  };
}
