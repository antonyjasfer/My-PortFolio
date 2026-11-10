// Adaptive quality for the skill graph. Pure functions (no DOM, no three), so
// node tests cover the tier choice and the watchdog.

export const TIER_ORDER = ["high", "medium", "low"];

/**
 * Settings per tier. Every tier draws the same graph, particles and courier;
 * lower tiers draw less of it, at lower resolution.
 * detail: icosahedron subdivision for nodes. particles: message count.
 * idleFps: frame rate when nothing is moving. edgeAlpha: per-vertex edge alpha
 * (false = one uniform opacity, a cheaper shader).
 */
export const TIERS = {
  high:   { detail: 1, antialias: true,  maxDpr: 2,    particles: 150, idleFps: 30, edgeAlpha: true,  skillLabels: true },
  medium: { detail: 1, antialias: false, maxDpr: 1.5,  particles: 60,  idleFps: 24, edgeAlpha: true,  skillLabels: false },
  low:    { detail: 0, antialias: false, maxDpr: 1.25, particles: 24,  idleFps: 12, edgeAlpha: false, skillLabels: false },
};

const SOFTWARE_GL = /swiftshader|llvmpipe|softpipe|software|microsoft basic render|mesa offscreen/i;

/**
 * Picks a tier from what the browser reports.
 * @param {{cores?:number, memory?:number, width:number, height:number, renderer?:string}} d
 *   memory is navigator.deviceMemory in GB (undefined in Safari and Firefox: treated as 4).
 * @returns {"high"|"medium"|"low"}
 */
export function pickTier({ cores = 4, memory, width, height, renderer = "" }) {
  if (SOFTWARE_GL.test(renderer)) return "low";   // no GPU: every frame is CPU work
  const mem = memory ?? 4;
  const small = Math.min(width, height) < 600;   // phones, portrait or landscape
  if (cores <= 2 || mem <= 2) return "low";
  if (cores <= 4 && mem <= 4 && small) return "low";
  if (cores >= 8 && mem >= 8 && !small) return "high";
  return "medium";
}

/** The next tier down, or null if already at the lowest. */
export const lowerTier = (tier) => TIER_ORDER[TIER_ORDER.indexOf(tier) + 1] ?? null;

/**
 * Watches full-rate frame times. When the average over a full window stays
 * above budget it calls onStepDown() once and starts a fresh window. One-way:
 * it never asks to step back up. Feed it only frames rendered at full rate
 * (not idle frames, not the intro, not hidden tabs).
 * @param {{budgetMs?:number, windowMs?:number, onStepDown:() => boolean}} o
 *   onStepDown returns false when there is no lower tier; the watchdog then stops.
 */
export function createWatchdog({ budgetMs = 22, windowMs = 2000, onStepDown }) {
  let sum = 0, count = 0, stopped = false;
  const reset = () => { sum = 0; count = 0; };
  return {
    /** @param {number} dtMs time since the previous full-rate frame */
    feed(dtMs) {
      if (stopped || !(dtMs > 0)) return;
      if (dtMs > 250) { reset(); return; }        // a gap (tab switch, idle wake), not a slow frame
      sum += dtMs; count++;
      if (sum < windowMs) return;
      const avg = sum / count;
      reset();
      if (avg > budgetMs && onStepDown() === false) stopped = true;
    },
    reset,
    get stopped() { return stopped; },
  };
}
