import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Smooth scrolling, driven by the single gsap.ticker that main.js owns
 * (autoRaf:false). Returns null with reduced motion, so native scrolling is used.
 */
export function initSmoothScroll({ reduced }) {
  if (reduced) return null;
  const lenis = new Lenis({ autoRaf: false, anchors: { offset: -72 }, lerp: 0.11 });
  lenis.on("scroll", ScrollTrigger.update);
  return lenis;
}

/** Scroll to an element or y position, with or without Lenis. */
export function scrollToTarget(lenis, target, { immediate = false } = {}) {
  if (lenis) return lenis.scrollTo(target, { immediate });
  const y = typeof target === "number" ? target : target.getBoundingClientRect().top + scrollY;
  scrollTo({ top: y, behavior: "auto" });
}
