import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Smooth scrolling, driven by the single gsap.ticker that main.js owns
 * (autoRaf:false). Returns null with reduced motion, so native scrolling is used.
 */
export function initSmoothScroll({ reduced }) {
  if (reduced) return null;
  const lenis = new Lenis({ autoRaf: false, lerp: 0.11 });
  lenis.on("scroll", ScrollTrigger.update);
  // In-page section links scroll smoothly. Project routes (#/...) are left to the router.
  document.addEventListener("click", (e) => {
    const a = e.target.closest?.('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute("href");
    if (href.startsWith("#/") || href === "#") return;
    const target = document.getElementById(href.slice(1));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: href === "#main" ? 0 : -72 });
    if (href === "#main") target.focus?.({ preventScroll: true });
  });
  return lenis;
}

/** Scroll to an element or y position, with or without Lenis. */
export function scrollToTarget(lenis, target, { immediate = false } = {}) {
  if (lenis) return lenis.scrollTo(target, { immediate });
  const y = typeof target === "number" ? target : target.getBoundingClientRect().top + scrollY;
  scrollTo({ top: y, behavior: "auto" });
}
