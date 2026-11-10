import { test } from "node:test";
import assert from "node:assert/strict";
import { pickTier, lowerTier, createWatchdog, TIERS } from "../src/scene/quality.js";

const phone = { width: 390, height: 844 };
const laptop = { width: 1440, height: 900 };

test("software GL is always low tier", () => {
  const r = "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)";
  assert.equal(pickTier({ ...laptop, cores: 16, memory: 16, renderer: r }), "low");
});

test("tiers from hardware signals", () => {
  assert.equal(pickTier({ ...laptop, cores: 8, memory: 8, renderer: "Apple M2" }), "high");
  assert.equal(pickTier({ ...phone, cores: 8, memory: 8, renderer: "Adreno (TM) 730" }), "medium", "phones cap at medium");
  assert.equal(pickTier({ ...phone, cores: 4, memory: 4, renderer: "Mali-G52" }), "low");
  assert.equal(pickTier({ ...laptop, cores: 4, renderer: "Intel UHD" }), "medium", "unknown memory counts as 4 GB");
  assert.equal(pickTier({ ...laptop, cores: 2, memory: 8 }), "low");
});

test("low tier respects the brief: DPR <= 1.5, no antialias, fewer particles", () => {
  assert.ok(TIERS.low.maxDpr <= 1.5);
  assert.equal(TIERS.low.antialias, false);
  assert.ok(TIERS.low.particles < TIERS.medium.particles && TIERS.medium.particles < TIERS.high.particles);
});

test("lowerTier steps down and stops at low", () => {
  assert.equal(lowerTier("high"), "medium");
  assert.equal(lowerTier("medium"), "low");
  assert.equal(lowerTier("low"), null);
});

const frames = (wd, ms, n) => { for (let i = 0; i < n; i++) wd.feed(ms); };

test("watchdog steps down after a full slow window, never on a fast one", () => {
  let downs = 0;
  const wd = createWatchdog({ budgetMs: 22, windowMs: 2000, onStepDown: () => (downs++, true) });
  frames(wd, 16, 125);                 // exactly one 2 s window at 60 fps
  assert.equal(downs, 0);
  frames(wd, 30, 66);                  // 1.98 s slow: window not full yet
  assert.equal(downs, 0);
  frames(wd, 30, 1);                   // window fills while slow
  assert.equal(downs, 1);
});

test("watchdog ignores gaps such as a tab switch", () => {
  let downs = 0;
  const wd = createWatchdog({ onStepDown: () => (downs++, true) });
  frames(wd, 16, 100);
  wd.feed(5000);                       // returning tab: one huge dt
  frames(wd, 16, 100);
  assert.equal(downs, 0);
});

test("watchdog stops once there is no lower tier, and never steps up", () => {
  let downs = 0;
  const wd = createWatchdog({ windowMs: 1000, onStepDown: () => (++downs < 2) });
  frames(wd, 40, 200);
  assert.equal(downs, 2);
  assert.equal(wd.stopped, true);
  frames(wd, 40, 200);
  assert.equal(downs, 2);
});
