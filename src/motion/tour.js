import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { neighbourhood } from "../scene/graph.js";

gsap.registerPlugin(ScrollTrigger);

// Each step is one viewport of scroll. The first TRAVEL of a step moves the
// camera along the graph route; the panel lands as the camera arrives.
export const CHOREO = { travel: 0.4, panelIn: 0.18, panelOut: 0.0, panelOutLen: 0.22 };

/**
 * Pinned project tour. Camera, courier and panels are all driven by one
 * scrubbed timeline, so they stay in sync whichever way the user scrolls.
 * With reduced motion it does nothing and the panels stay a static list.
 */
export function initTour({ section, steps, graph, focus, getScene, tokens, reduced, wide }) {
  const panels = [...section.querySelectorAll(".tour-panel")];
  const count = section.querySelector("#tour-count");
  const n = steps.length;
  let active = -1;

  function setActive(i) {
    if (i === active) return;
    active = i;
    panels.forEach((p, k) => {
      const on = k === i;
      p.inert = !on;                       // off-screen panels leave the tab order
      p.classList.toggle("is-active", on);
    });
    count.textContent = `${i + 1} of ${n}`;
  }

  if (reduced) {
    section.querySelector(".tour").classList.add("static");
    panels.forEach((p) => (p.inert = false));
    return { kill() {} };
  }

  const shift = () => (wide() ? [-3.2, 0] : [0, 2.6]);
  const tl = gsap.timeline({ defaults: { ease: tokens.ease.out } });
  // panels: all start offstage except the first
  gsap.set(panels.slice(1), { xPercent: 30, opacity: 0 });
  for (let i = 1; i < n; i++) {
    tl.to(panels[i - 1], { xPercent: -20, opacity: 0, duration: CHOREO.panelOutLen, ease: tokens.ease["in-out"] }, i + CHOREO.panelOut)
      .to(panels[i], { xPercent: 0, opacity: 1, duration: CHOREO.travel - CHOREO.panelIn + 0.05 }, i + CHOREO.panelIn);
  }
  tl.to({}, { duration: 1 }, n - 1); // dwell on the last step

  const st = ScrollTrigger.create({
    trigger: section.querySelector(".tour"),
    start: "top top",
    end: () => "+=" + innerHeight * n,
    pin: true,
    scrub: true,
    animation: tl,
    invalidateOnRefresh: true,
    onUpdate(self) {
      const p = self.progress * n, i = Math.min(n - 1, Math.floor(p)), local = p - i;
      setActive(i);
      const from = i === 0 ? steps[0].id : steps[i - 1].id, to = steps[i].id;
      getScene().setTour(from, to, i === 0 ? 1 : Math.min(1, local / CHOREO.travel));
      focus.set("tour", { ids: neighbourhood(graph, to), shift: shift() });
    },
    onToggle(self) {
      if (!self.isActive) { getScene().setTour(null); focus.release("tour"); }
    },
  });

  setActive(0);
  return { trigger: st, kill() { st.kill(); tl.kill(); } };
}
