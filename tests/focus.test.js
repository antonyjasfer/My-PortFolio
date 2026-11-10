import { test } from "node:test";
import assert from "node:assert/strict";
import { createFocus } from "../src/state/focus.js";

test("highest layer wins, and releasing falls back", () => {
  const seen = [];
  const f = createFocus((v) => seen.push(v));
  f.set("section", { ids: null, shift: [4, 0] });
  f.set("tour", { ids: new Set(["a"]), shift: [-3, 0] });
  f.set("dialog", { ids: new Set(["b"]), aimId: "b" });
  assert.deepEqual([...seen.at(-1).ids], ["b"]);
  assert.equal(seen.at(-1).aimId, "b");
  assert.deepEqual(seen.at(-1).shift, [-3, 0], "dialog has no shift, so the tour's applies");
  f.release("dialog");
  assert.deepEqual([...seen.at(-1).ids], ["a"]);
  f.release("tour");
  assert.equal(seen.at(-1).ids, null);
  assert.deepEqual(seen.at(-1).shift, [4, 0]);
});

test("a lower layer changing under a higher one does not override it", () => {
  const seen = [];
  const f = createFocus((v) => seen.push(v));
  f.set("chip", { ids: new Set(["s:Python"]) });
  f.set("section", { ids: new Set(["bp"]), aimId: "bp", shift: [-5, 0] });
  assert.deepEqual([...seen.at(-1).ids], ["s:Python"]);
  assert.equal(seen.at(-1).aimId, undefined);
});
