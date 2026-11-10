import { test } from "node:test";
import assert from "node:assert/strict";
import { PROJECTS, FEATURED } from "../src/data/projects.js";
import { PATH } from "../src/data/path.js";

// Repos that exist under github.com/antonyjasfer (checked 2026-11-10).
const REPOS = new Set([
  "arbiter", "Budget-Coupled-Robust-Belief-Propagation-for-Visual-Hallucination-Detection",
  "VISCA-BARCA-mtah2027", "ledgerguard", "strands-bedrock-preflight", "papertrail", "legallens",
  "CLAIRS-Autonomous-Defense", "nexus-ct-match", "StadiumIQ", "lumina-chepauk", "vote-assistant",
  "GSOC-2026-ML4SCI-Tasks", "F1-Strategy-Net", "NBA-Accreditation-Assistant-RAG",
  "SWYNEX-Final-Cloud-Deployment", "arenapulse", "Carbon-Footprint-Awareness-Platform",
]);

test("every project has the required fields", () => {
  for (const p of PROJECTS) {
    for (const f of ["id", "t", "w", "repo", "d", "s"]) assert.ok(typeof p[f] === "string" && p[f].length, `${p.id}.${f}`);
    assert.ok(Array.isArray(p.k) && p.k.length > 0, `${p.id}.k`);
  }
});

test("ids are unique and repos are real", () => {
  assert.equal(new Set(PROJECTS.map((p) => p.id)).size, PROJECTS.length);
  for (const p of PROJECTS) assert.ok(REPOS.has(p.repo), p.repo);
});

test("exactly six featured projects for the pinned tour", () => {
  assert.equal(FEATURED.length, 6);
});

test("no achievement language without README backing", () => {
  const banned = /\b(award|awarded|winner|won|finalist|users|customers)\b|\d+%/i;
  for (const p of PROJECTS) {
    const text = [p.t, p.w, p.d, p.s].join(" ");
    assert.ok(!banned.test(text), `${p.id}: ${text.match(banned)?.[0]}`);
  }
});

test("path entries are [when, what, detail]", () => {
  for (const e of PATH) assert.equal(e.length, 3);
});
