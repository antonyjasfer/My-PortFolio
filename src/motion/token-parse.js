// Pure parsing of CSS motion tokens, so node tests can run it without a DOM.

/** "480ms" | "1.2s" -> seconds */
export function parseDuration(v) {
  const s = String(v).trim();
  if (s.endsWith("ms")) return parseFloat(s) / 1000;
  if (s.endsWith("s")) return parseFloat(s);
  const n = parseFloat(s);
  return Number.isFinite(n) ? n / 1000 : 0;
}

/** "cubic-bezier(.2, .8, .2, 1)" -> [0.2, 0.8, 0.2, 1] */
export function parseEase(v) {
  const m = String(v).match(/cubic-bezier\(([^)]+)\)/);
  if (!m) return null;
  const nums = m[1].split(",").map(Number);
  return nums.length === 4 && nums.every(Number.isFinite) ? nums : null;
}

export const DUR_KEYS = ["instant", "quick", "base", "slow", "epic"];
export const STAGGER_KEYS = ["line", "node"];
export const EASE_KEYS = ["out", "in-out", "travel"];

/** get(name) returns the raw custom property value; returns {dur, stagger, ease} */
export function parseTokens(get) {
  const dur = {}, stagger = {}, ease = {};
  for (const k of DUR_KEYS) dur[k] = parseDuration(get(`--dur-${k}`));
  for (const k of STAGGER_KEYS) stagger[k] = parseDuration(get(`--stagger-${k}`));
  for (const k of EASE_KEYS) ease[k] = parseEase(get(`--ease-${k}`));
  return { dur, stagger, ease };
}
