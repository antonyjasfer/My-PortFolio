// About: a short first-person paragraph, the photo (or an "AJ" monogram if it
// cannot load) with a small depth effect, and a few facts as a typographic list.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SITE } from "../data/site.js";

gsap.registerPlugin(ScrollTrigger);

// Depth per layer: how far each one moves for the same pointer offset or scroll.
export const DEPTH = { plate: -0.45, photo: 0.18, dot: 0.9, maxPx: 14 };

export function initAbout({ reduced, tokens }) {
  const $ = (s) => document.querySelector(s);
  // The paragraph and facts are written into the HTML at build time (scripts/seo.mjs).

  // photo fallback: a monogram built from the brand tokens
  const fig = $("#portrait"), img = fig.querySelector("img");
  const toMonogram = () => {
    const m = document.createElement("span");
    m.className = "portrait-photo monogram";
    m.setAttribute("role", "img");
    m.setAttribute("aria-label", SITE.name);
    m.textContent = SITE.initials;
    fig.querySelector("picture")?.replaceWith(m);
  };
  if (img.complete && img.naturalWidth === 0) toMonogram();
  else img.addEventListener("error", toMonogram, { once: true });

  if (reduced) return () => {};
  const plate = fig.querySelector(".portrait-plate"), dot = fig.querySelector(".portrait-dot");
  const photo = () => fig.querySelector(".portrait-photo");

  // desktop: layers follow the pointer at different depths
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const q = (el) => [gsap.quickTo(el, "x", { duration: tokens.dur.slow, ease: tokens.ease.out }), gsap.quickTo(el, "y", { duration: tokens.dur.slow, ease: tokens.ease.out })];
    const qs = { plate: q(plate), photo: q(photo()), dot: q(dot) };
    const section = $("#about");
    const move = (e) => {
      const r = fig.getBoundingClientRect();
      const nx = gsap.utils.clamp(-1, 1, (e.clientX - (r.left + r.width / 2)) / (r.width * 1.5));
      const ny = gsap.utils.clamp(-1, 1, (e.clientY - (r.top + r.height / 2)) / (r.height * 1.5));
      for (const k of ["plate", "photo", "dot"]) { qs[k][0](nx * DEPTH[k] * DEPTH.maxPx); qs[k][1](ny * DEPTH[k] * DEPTH.maxPx); }
    };
    const leave = () => { for (const k of ["plate", "photo", "dot"]) { qs[k][0](0); qs[k][1](0); } };
    section.addEventListener("pointermove", move, { passive: true });
    section.addEventListener("pointerleave", leave);
    return () => { section.removeEventListener("pointermove", move); section.removeEventListener("pointerleave", leave); };
  }

  // touch: the same depth, driven by scroll instead
  const tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: "top bottom", end: "bottom top", scrub: true } });
  for (const [el, d] of [[plate, DEPTH.plate], [dot, DEPTH.dot]]) tl.fromTo(el, { y: -d * DEPTH.maxPx * 1.5 }, { y: d * DEPTH.maxPx * 1.5, ease: "none" }, 0);
  return () => tl.scrollTrigger?.kill();
}
