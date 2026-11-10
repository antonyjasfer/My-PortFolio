import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PROJECTS } from "../src/data/projects.js";
import { buildGraph, neighbourhood } from "../src/scene/graph.js";
import { layoutForce, toPositions } from "../src/scene/layout.js";
import { routeBetween } from "../src/scene/route.js";
import { scatter, nodeProgress, edgeProgress, SCATTER_MIN } from "../src/scene/assembly.js";

const skills = new Set(PROJECTS.flatMap((p) => p.k));
const pairs = PROJECTS.reduce((n, p) => n + p.k.length, 0);

test("one node per project and per unique skill, one edge per pair", () => {
  const g = buildGraph(PROJECTS);
  assert.equal(g.nodes.length, PROJECTS.length + skills.size);
  assert.equal(g.edges.length, pairs);
  assert.deepEqual([...neighbourhood(g, "lumina")].sort(), ["lumina", "s:Gemini", "s:JavaScript", "s:React"]);
});

test("layout is deterministic and centred", () => {
  const a = toPositions(layoutForce(buildGraph(PROJECTS)));
  const b = toPositions(layoutForce(buildGraph(PROJECTS)));
  assert.deepEqual(a, b);
  const vals = Object.values(a), n = vals.length;
  for (const axis of [0, 1, 2]) assert.ok(Math.abs(vals.reduce((s, v) => s + v[axis], 0) / n) < 1e-3);
});

test("layout.json matches the layout code (no drift)", () => {
  const json = JSON.parse(readFileSync(new URL("../src/scene/layout.json", import.meta.url), "utf8"));
  assert.deepEqual(json.positions, toPositions(layoutForce(buildGraph(PROJECTS), json)));
});

test("routes go through a shared skill", () => {
  const g = buildGraph(PROJECTS);
  assert.deepEqual(routeBetween(g, "arbiter", "ledgerguard"), ["arbiter", "s:LLM agents", "ledgerguard"]);
});

test("projects with no shared skill route through a neighbour project", () => {
  const g = buildGraph(PROJECTS);
  const r = routeBetween(g, "arbiter", "visca");
  assert.equal(r.length, 5);
  for (let i = 1; i < r.length; i++) {
    const ok = g.edges.some(([a, b]) => (a === r[i - 1] && b === r[i]) || (b === r[i - 1] && a === r[i]));
    assert.ok(ok, `${r[i - 1]} -> ${r[i]} is not an edge`);
  }
});

test("unknown or disconnected nodes give null", () => {
  const g = buildGraph([{ id: "a", t: "A", k: ["x"] }, { id: "b", t: "B", k: ["y"] }]);
  assert.equal(routeBetween(g, "a", "b"), null);
  assert.equal(routeBetween(g, "a", "nope"), null);
});

test("the whole graph is connected, so every tour step has a route", () => {
  const g = buildGraph(PROJECTS);
  for (const p of PROJECTS) assert.ok(routeBetween(g, PROJECTS[0].id, p.id), p.id);
});

test("scatter starts every node outside the layout", () => {
  const g = buildGraph(PROJECTS);
  for (const p of Object.values(scatter(g))) assert.ok(Math.hypot(p.x, p.y, p.z) >= SCATTER_MIN - 1e-9);
});

test("assembly progress endpoints", () => {
  assert.equal(nodeProgress(0, 0, 10), 0);
  assert.equal(nodeProgress(1, 9, 10), 1);
  assert.ok(nodeProgress(0.3, 0, 10) > nodeProgress(0.3, 9, 10));
  assert.equal(edgeProgress(0.5), 0);
  assert.equal(edgeProgress(1), 1);
});
