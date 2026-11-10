// Precomputes the graph layout (src/scene/layout.json, read by the scene so
// the browser never runs the force loop) and draws the same layout as a
// static SVG (public/graph-fallback.svg) for browsers without WebGL.
import { writeFileSync } from "node:fs";
import { PROJECTS } from "../src/data/projects.js";
import { buildGraph } from "../src/scene/graph.js";
import { layoutForce, toPositions } from "../src/scene/layout.js";

const SEED = 7, ITERATIONS = 260;
const g = layoutForce(buildGraph(PROJECTS), { seed: SEED, iterations: ITERATIONS });
writeFileSync(new URL("../src/scene/layout.json", import.meta.url),
  JSON.stringify({ seed: SEED, iterations: ITERATIONS, positions: toPositions(g) }) + "\n");

// Orthographic projection at v1's starting rotation (rotY .4, rotX .12).
const ry = 0.4, rx = 0.12, W = 960, H = 720, S = 52;
const proj = ({ x, y, z }) => {
  const x1 = x * Math.cos(ry) + z * Math.sin(ry), z1 = -x * Math.sin(ry) + z * Math.cos(ry);
  const y1 = y * Math.cos(rx) - z1 * Math.sin(rx), z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
  return { x: W / 2 + x1 * S, y: H / 2 - y1 * S, z: z2 };
};
const P = Object.fromEntries(g.nodes.map((n) => [n.id, proj(n.p)]));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const f = (v) => v.toFixed(1);

const lines = g.edges.map(([a, b]) => `<line x1="${f(P[a].x)}" y1="${f(P[a].y)}" x2="${f(P[b].x)}" y2="${f(P[b].y)}"/>`).join("");
const order = [...g.nodes].sort((a, b) => P[a.id].z - P[b.id].z);
const dots = order.map((n) => n.kind === "p"
  ? `<circle cx="${f(P[n.id].x)}" cy="${f(P[n.id].y)}" r="9" fill="#16213E"/>`
  : `<circle cx="${f(P[n.id].x)}" cy="${f(P[n.id].y)}" r="4" fill="#5B6B82"/>`).join("");
const labels = g.nodes.filter((n) => n.kind === "p")
  .map((n) => `<text x="${f(P[n.id].x)}" y="${f(P[n.id].y + 24)}">${esc(n.label)}</text>`).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">` +
  `<title id="t">Graph of ${PROJECTS.length} projects connected to the skills they use</title>` +
  `<g stroke="#5B6B82" stroke-opacity=".35" stroke-width="1.2">${lines}</g>${dots}` +
  `<g font-family="IBM Plex Sans, system-ui, sans-serif" font-size="13" fill="#16213E" text-anchor="middle">${labels}</g></svg>\n`;
writeFileSync(new URL("../public/graph-fallback.svg", import.meta.url), svg);
console.log(`layout.json + graph-fallback.svg written (${g.nodes.length} nodes, ${svg.length} bytes)`);
