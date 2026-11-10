import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDuration, parseEase, parseTokens } from "../src/motion/token-parse.js";

test("durations parse to seconds", () => {
  assert.equal(parseDuration("480ms"), 0.48);
  assert.equal(parseDuration(" 1.6s "), 1.6);
  assert.equal(parseDuration("0ms"), 0);
});

test("cubic-bezier parses to four numbers", () => {
  assert.deepEqual(parseEase("cubic-bezier(.2, .8, .2, 1)"), [0.2, 0.8, 0.2, 1]);
  assert.equal(parseEase("ease"), null);
});

test("tokens.css defines every motion token JS reads", () => {
  const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
  const root = css.slice(css.indexOf(":root {"), css.indexOf("@media"));
  const get = (name) => (root.match(new RegExp(`${name}:\\s*([^;]+);`)) || [])[1];
  const t = parseTokens(get);
  assert.equal(t.dur.base, 0.48);
  assert.equal(t.dur.epic, 1.6);
  assert.equal(t.stagger.line, 0.08);
  assert.deepEqual(t.ease.out, [0.2, 0.8, 0.2, 1]);
  assert.deepEqual(t.ease.travel, [0.45, 0.05, 0.2, 1]);
});

test("reduced motion zeroes every duration", () => {
  const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
  const rm = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  for (const k of ["instant", "quick", "base", "slow", "epic"]) assert.match(rm, new RegExp(`--dur-${k}: 0ms`));
});
