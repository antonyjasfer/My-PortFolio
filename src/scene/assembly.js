// Pure maths for the load "assembly": nodes fly in from a scattered cloud,
// then edges draw from project to skill.

import { makeRng } from "./layout.js";

export const SCATTER_MIN = 12;
export const SCATTER_MAX = 18;
export const EDGE_START = 0.55; // edges begin drawing once assembly passes this

/** Scattered start position for every node, at radius SCATTER_MIN..SCATTER_MAX. */
export function scatter(graph, seed = 11) {
  const rnd = makeRng(seed), out = {};
  for (const n of graph.nodes) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = SCATTER_MIN + rnd() * (SCATTER_MAX - SCATTER_MIN);
    const s = Math.sqrt(1 - u * u);
    out[n.id] = { x: Math.cos(th) * s * r, y: u * r, z: Math.sin(th) * s * r };
  }
  return out;
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Local progress of node i of n for global assembly t. Arrival is staggered
 * across `spread` (a fraction of the timeline): projects lead, skills follow.
 */
export function nodeProgress(t, i, n, spread = 0.35) {
  const delay = n > 1 ? (i / (n - 1)) * spread : 0;
  return easeOutCubic(clamp01((t - delay) / (1 - spread)));
}

/** How much of each edge is drawn (0..1) for global assembly t. */
export function edgeProgress(t) {
  return easeOutCubic(clamp01((t - EDGE_START) / (1 - EDGE_START)));
}

export const lerp3 = (a, b, k, out = {}) => {
  out.x = a.x + (b.x - a.x) * k; out.y = a.y + (b.y - a.y) * k; out.z = a.z + (b.z - a.z) * k;
  return out;
};
