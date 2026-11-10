import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { neighbourhood } from "../scene/graph.js";

gsap.registerPlugin(ScrollTrigger);

/**
 * v1's section-to-focus mapping: whichever section crosses the middle of the
 * viewport sets the "section" focus layer and the graph's composition offset.
 */
export function initSectionFocus({ graph, focus, wide }) {
  const sections = [...document.querySelectorAll("main section[data-focus]")];
  const links = [...document.querySelectorAll(".top-nav a")];
  const projectIds = new Set(graph.nodes.filter((n) => n.kind === "p").map((n) => n.id));
  let current = null;

  function valueFor(sec) {
    const w = wide(), f = sec.dataset.focus;
    const shift = sec.id === "top" ? (w ? [4.2, 0] : [0, 3.2]) : (w ? [-5, 0] : [0, 0]);
    if (f === "projects") return { ids: projectIds, shift };
    if (f && f !== "all" && graph.byId[f]) return { ids: neighbourhood(graph, f), aimId: f, shift };
    return { ids: null, shift };
  }
  function apply(sec) {
    current = sec;
    links.forEach((a) => {
      if (a.getAttribute("href") === "#" + sec.id) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    focus.set("section", valueFor(sec));
  }
  const io = new IntersectionObserver((es) => es.forEach((en) => en.isIntersecting && apply(en.target)),
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
  sections.forEach((s) => io.observe(s));
  apply(sections[0]);
  return { refresh: () => current && apply(current), disconnect: () => io.disconnect() };
}

/**
 * Section transitions: each block's content is revealed by a clip-path wipe
 * from its top edge, scrubbed to scroll. Content, not the viewport, is wiped,
 * so the graph stays visible.
 */
export function initWipes({ reduced }) {
  if (reduced) return [];
  return gsap.utils.toArray(".wipe").map((el) =>
    gsap.fromTo(el,
      { clipPath: "inset(0% 0% 100% 0% round var(--wipe-radius, 0px))" },
      {
        clipPath: "inset(0% 0% 0% 0% round var(--wipe-radius, 0px))",
        ease: "none",
        scrollTrigger: { trigger: el, start: "top 88%", end: "top 52%", scrub: true },
      }));
}
