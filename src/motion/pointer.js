import { gsap } from "gsap";

// Pull strength and cap for magnetic elements (choreography constants;
// durations and easings come from tokens).
export const MAGNET = { pull: 0.3, max: 10 };

const finePointer = () => matchMedia("(hover: hover) and (pointer: fine)").matches;

/** Primary links drift toward the pointer, up to MAGNET.max px, and settle back on leave. */
export function initMagnetic(selector, { tokens, reduced }) {
  if (reduced || !finePointer()) return () => {};
  const offs = [];
  for (const el of document.querySelectorAll(selector)) {
    const qx = gsap.quickTo(el, "x", { duration: tokens.dur.quick, ease: tokens.ease.out });
    const qy = gsap.quickTo(el, "y", { duration: tokens.dur.quick, ease: tokens.ease.out });
    const clamp = gsap.utils.clamp(-MAGNET.max, MAGNET.max);
    const move = (e) => {
      const r = el.getBoundingClientRect();
      qx(clamp((e.clientX - (r.left + r.width / 2)) * MAGNET.pull));
      qy(clamp((e.clientY - (r.top + r.height / 2)) * MAGNET.pull));
    };
    const leave = () => { qx(0); qy(0); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    offs.push(() => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); });
  }
  return () => offs.forEach((f) => f());
}

/**
 * Desktop-only cursor: a saffron dot plus an ink ring that grows over
 * interactive elements. The native cursor stays visible; this only adds to it.
 */
export function initCursor({ tokens, reduced }) {
  if (reduced || !finePointer()) return () => {};
  const ring = document.createElement("div"), dot = document.createElement("div");
  ring.className = "cursor-ring"; dot.className = "cursor-dot";
  ring.setAttribute("aria-hidden", "true"); dot.setAttribute("aria-hidden", "true");
  document.body.append(ring, dot);
  const rx = gsap.quickTo(ring, "x", { duration: tokens.dur.base, ease: tokens.ease.out });
  const ry = gsap.quickTo(ring, "y", { duration: tokens.dur.base, ease: tokens.ease.out });
  const dx = gsap.quickSetter(dot, "x", "px"), dy = gsap.quickSetter(dot, "y", "px");
  const interactive = "a, button, input, label, [data-magnetic], canvas";
  let shown = false;
  const move = (e) => {
    if (e.pointerType !== "mouse") return;
    if (!shown) { shown = true; document.documentElement.classList.add("has-cursor"); }
    rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
  };
  const over = (e) => ring.classList.toggle("is-hot", !!e.target.closest?.(interactive));
  const out = (e) => { if (!e.relatedTarget) { shown = false; document.documentElement.classList.remove("has-cursor"); } };
  addEventListener("pointermove", move, { passive: true });
  addEventListener("pointerover", over, { passive: true });
  document.addEventListener("pointerout", out);
  return () => {
    removeEventListener("pointermove", move);
    removeEventListener("pointerover", over);
    document.removeEventListener("pointerout", out);
    ring.remove(); dot.remove();
  };
}
