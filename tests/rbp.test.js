import { test } from "node:test";
import assert from "node:assert/strict";
import { robustInterval, nominal, rootField, sigmoid, DEMO_TREE, budgetFor } from "../src/research/rbp.js";

// Brute force over the same grid the DP uses: every δ_i ∈ {0, ±step, …, ±eps}
// with Σ|δ_i| ≤ budget. Small tree so this stays fast.
function brute(tree, eps, budget, units, sign) {
  const idx = tree.nodes.map((n, i) => i).filter((i) => i > 0 && tree.nodes[i].attackable !== false);
  const step = eps / units;
  let best = sign > 0 ? -Infinity : Infinity;
  const delta = new Array(tree.nodes.length).fill(0);
  (function rec(p, used) {
    if (p === idx.length) {
      const v = rootField(tree, delta);
      best = sign > 0 ? Math.max(best, v) : Math.min(best, v);
      return;
    }
    for (let u = 0; u <= units && used + u * step <= budget + 1e-9; u++) {
      delta[idx[p]] = sign * u * step;
      rec(p + 1, used + u * step);
    }
    delta[idx[p]] = 0;
  })(0, 0);
  return sigmoid(2 * best);
}

const SMALL = {
  nodes: [
    { id: "r", theta: 0.2, attackable: false },
    { id: "a", theta: 0.8, parent: 0, J: 0.9 },
    { id: "b", theta: 0.3, parent: 0, J: 0.6 },
    { id: "c", theta: -0.4, parent: 1, J: 0.7 },
  ],
};

test("DP matches brute force on the grid (coupled and uncoupled)", () => {
  for (const [eps, budget] of [[0.5, 0.75], [0.8, 1.2], [0.6, Infinity]]) {
    const r = robustInterval(SMALL, { eps, budget, units: 4 });
    assert.ok(Math.abs(r.upper - brute(SMALL, eps, budget, 4, +1)) < 1e-12, `upper eps=${eps} B=${budget}`);
    assert.ok(Math.abs(r.lower - brute(SMALL, eps, budget, 4, -1)) < 1e-12, `lower eps=${eps} B=${budget}`);
  }
});

test("zero budget collapses the interval to the nominal belief", () => {
  const r = robustInterval(DEMO_TREE, { eps: 0, budget: 0 });
  assert.equal(r.lower, r.nominal);
  assert.equal(r.upper, r.nominal);
});

test("interval contains the nominal belief and widens with ε", () => {
  let prev = 0;
  for (const eps of [0.1, 0.3, 0.6, 1.0]) {
    const r = robustInterval(DEMO_TREE, { eps, budget: budgetFor(eps, true) });
    assert.ok(r.lower <= r.nominal + 1e-12 && r.nominal <= r.upper + 1e-12);
    assert.ok(r.upper - r.lower >= prev - 1e-12);
    prev = r.upper - r.lower;
  }
});

test("a shared budget never gives a wider interval than independent radii", () => {
  for (const eps of [0.2, 0.5, 0.9]) {
    const c = robustInterval(DEMO_TREE, { eps, budget: budgetFor(eps, true) });
    const u = robustInterval(DEMO_TREE, { eps, budget: budgetFor(eps, false) });
    assert.ok(u.upper - u.lower >= c.upper - c.lower - 1e-12);
  }
});

test("witness respects the uncertainty set and leaves the claim alone", () => {
  const eps = 0.5, budget = budgetFor(eps, true);
  const r = robustInterval(DEMO_TREE, { eps, budget });
  for (const w of [r.witnessLower, r.witnessUpper]) {
    assert.equal(w[0], 0, "claim field is fixed");
    assert.ok(w.every((d) => Math.abs(d) <= eps + 1e-12));
    assert.ok(w.reduce((s, d) => s + Math.abs(d), 0) <= budget + 1e-9);
  }
  assert.ok(r.witnessLower.every((d) => d <= 0) && r.witnessUpper.every((d) => d >= 0));
  // the witness reproduces the bound
  assert.ok(Math.abs(sigmoid(2 * rootField(DEMO_TREE, r.witnessLower)) - r.lower) < 1e-12);
});

test("the demo claim starts believable", () => {
  const p = nominal(DEMO_TREE);
  assert.ok(p > 0.6 && p < 0.95, String(p));
});
