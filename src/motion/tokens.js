import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { parseTokens, EASE_KEYS } from "./token-parse.js";

gsap.registerPlugin(CustomEase);

let cached = null;

/**
 * Reads the motion tokens from :root and registers each easing as a GSAP
 * ease called "out", "in-out" or "travel". Returns {dur, stagger, ease}, where
 * ease maps each key to that registered name.
 */
export function readTokens() {
  if (cached) return cached;
  const cs = getComputedStyle(document.documentElement);
  const t = parseTokens((n) => cs.getPropertyValue(n));
  const names = {};
  for (const k of EASE_KEYS) {
    if (t.ease[k]) CustomEase.create(k, t.ease[k].join(","));
    names[k] = t.ease[k] ? k : "power2.out";
  }
  cached = { dur: t.dur, stagger: t.stagger, ease: names };
  return cached;
}
