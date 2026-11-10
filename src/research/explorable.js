// Research explorable: robust belief propagation on a seven-node tree.
// All numbers come from rbp.js (exact budget-grid DP). Message particles
// reuse the graph's saffron "message" language. Works with keyboard only and
// with reduced motion (no particles; the step buttons walk the messages).
import { gsap } from "gsap";
import { robustInterval, messages, DEMO_TREE, budgetFor, nominal } from "./rbp.js";

const NS = "http://www.w3.org/2000/svg";
const POS = [[188, 30], [110, 100], [258, 100], [64, 172], [150, 172], [222, 172], [306, 172]];
const R = [15, 11, 11, 9, 9, 9, 9];
const EPS_MAX = 2, CURVE_STEP = 0.1;
const fmt = (p) => p.toFixed(2).replace("-", "\u2212"); // typographic minus
const el = (parent, name, attrs = {}, text) => {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  parent.appendChild(e);
  return e;
};

export function initExplorable(root, { reduced, tokens }) {
  if (!root) return { destroy() {} };
  const tree = DEMO_TREE, nodes = tree.nodes;
  const $ = (s) => root.querySelector(s);
  const eps = $("#rx-eps"), epsOut = $("#rx-eps-out"), couple = $("#rx-couple"), verdict = $("#rx-verdict");
  const svg = $("#rx-tree"), band = $("#rx-band"), chart = $("#rx-chart"), stepBtns = [...root.querySelectorAll("[data-rx-step]")];
  const stepLabel = $("#rx-step-label");

  // ---- tree ----
  const gEdges = el(svg, "g"), gMsgs = el(svg, "g"), gNodes = el(svg, "g"), gLabels = el(svg, "g", { class: "rx-labels" });
  const edgeEls = [], msgText = [], rings = [], deltaText = [];
  nodes.forEach((n, i) => {
    if (i === 0) return;
    const [x1, y1] = POS[i], [x2, y2] = POS[n.parent];
    edgeEls[i] = el(gEdges, "line", { x1, y1, x2, y2, class: "rx-edge" });
    const mx = (x1 + x2) / 2 + (x1 < x2 ? -14 : 14), my = (y1 + y2) / 2;
    msgText[i] = el(gLabels, "text", { x: mx, y: my, class: "rx-msg", "text-anchor": x1 < x2 ? "end" : "start" });
  });
  nodes.forEach((n, i) => {
    const [x, y] = POS[i];
    rings[i] = el(gNodes, "circle", { cx: x, cy: y, r: R[i] + 4, class: "rx-ring" });
    el(gNodes, "circle", { cx: x, cy: y, r: R[i], class: i === 0 ? "rx-node rx-claim" : i < 3 ? "rx-node rx-group" : "rx-node rx-obs" });
    const below = i >= 3;
    const tx = i === 0 ? x + 24 : i === 1 ? x - 18 : i === 2 ? x + 18 : x;
    const ty = i === 0 ? y + 5 : below ? y + 26 : y + 4;
    el(gLabels, "text", { x: tx, y: ty, class: "rx-label", "text-anchor": i === 0 || i === 2 ? "start" : i === 1 ? "end" : "middle" }, n.label);
    if (below) deltaText[i] = el(gLabels, "text", { x, y: y + 40, class: "rx-delta", "text-anchor": "middle" });
  });

  // ---- interval band (0..1) ----
  const bw = 360, bx = (p) => 10 + p * (bw - 20);
  el(band, "line", { x1: bx(0), y1: 28, x2: bx(1), y2: 28, class: "rx-axis" });
  for (const t of [0, 0.5, 1]) {
    el(band, "line", { x1: bx(t), y1: 22, x2: bx(t), y2: 34, class: t === 0.5 ? "rx-threshold" : "rx-tick" });
    el(band, "text", { x: bx(t), y: 50, class: "rx-ticklabel", "text-anchor": "middle" }, t === 0.5 ? "0.5" : String(t));
  }
  const bandRect = el(band, "rect", { y: 20, height: 16, rx: 4, class: "rx-interval" });
  const nomTick = el(band, "line", { y1: 14, y2: 42, class: "rx-nominal" });
  const loText = el(band, "text", { y: 12, class: "rx-bandlabel", "text-anchor": "end" });
  const hiText = el(band, "text", { y: 12, class: "rx-bandlabel", "text-anchor": "start" });

  // ---- particles (one per edge, child -> parent) ----
  const dots = nodes.map((n, i) => (i === 0 ? null : el(gMsgs, "circle", { r: 3, class: "rx-particle", cx: POS[i][0], cy: POS[i][1] })));
  const flow = { t: 0 };
  let tween = null;
  function drawParticles() {
    nodes.forEach((n, i) => {
      if (!i) return;
      // leaves send first; the group nodes pass their message on in the second half
      const local = i >= 3 ? Math.min(1, flow.t * 2) : Math.max(0, flow.t * 2 - 1);
      const [x1, y1] = POS[i], [x2, y2] = POS[n.parent];
      dots[i].setAttribute("cx", x1 + (x2 - x1) * local);
      dots[i].setAttribute("cy", y1 + (y2 - y1) * local);
      dots[i].setAttribute("opacity", local > 0 && local < 1 ? 1 : 0);
    });
  }
  if (!reduced) {
    tween = gsap.to(flow, { t: 1, duration: tokens.dur.epic * 1.4, ease: "none", repeat: -1, repeatDelay: tokens.dur.base, onUpdate: drawParticles, paused: true });
  } else {
    dots.forEach((d) => d?.setAttribute("opacity", 0));
  }
  // only animate while the explorable is on screen
  const io = new IntersectionObserver(([en]) => { if (tween) en.isIntersecting ? tween.play() : tween.pause(); });
  io.observe(svg);

  // ---- message steps (keyboard and reduced-motion path) ----
  const STEPS = ["Messages hidden", "Step 1 of 2: observations send to their group", "Step 2 of 2: groups send to the claim"];
  let step = 0, result = null;
  function renderStep() {
    stepLabel.textContent = STEPS[step];
    stepBtns.forEach((b) => (b.disabled = (b.dataset.rxStep === "prev" && step === 0) || (b.dataset.rxStep === "next" && step === 2)));
    const { msgs } = messages(tree, result.witnessLower);
    nodes.forEach((n, i) => {
      if (!i) return;
      const layer = i >= 3 ? 1 : 2;
      const on = step >= layer;
      edgeEls[i].classList.toggle("is-active", on && step === layer);
      msgText[i].textContent = on ? fmt(msgs[i]) : "";
    });
  }
  stepBtns.forEach((b) => b.addEventListener("click", () => {
    step = Math.max(0, Math.min(2, step + (b.dataset.rxStep === "next" ? 1 : -1)));
    renderStep();
  }));

  // ---- width-vs-ε chart (computed once, when the section is near) ----
  const cw = 360, ch = 170, m = { l: 36, r: 86, t: 12, b: 28 };
  const cx = (e) => m.l + (e / EPS_MAX) * (cw - m.l - m.r), cy = (w) => ch - m.b - w * (ch - m.t - m.b);
  for (const w of [0, 0.5, 1]) {
    el(chart, "line", { x1: m.l, x2: cw - m.r, y1: cy(w), y2: cy(w), class: "rx-grid" });
    el(chart, "text", { x: m.l - 6, y: cy(w) + 4, class: "rx-ticklabel", "text-anchor": "end" }, String(w));
  }
  for (const e of [0, 0.5, 1, 1.5, 2]) el(chart, "text", { x: cx(e), y: ch - 8, class: "rx-ticklabel", "text-anchor": "middle" }, String(e));
  el(chart, "text", { x: cw - m.r, y: ch - 8, class: "rx-axislabel", "text-anchor": "start", dx: 8 }, "ε");
  const lineC = el(chart, "path", { class: "rx-line rx-coupled" }), lineU = el(chart, "path", { class: "rx-line rx-uncoupled" });
  const endC = el(chart, "text", { class: "rx-endlabel", dx: 6 }), endU = el(chart, "text", { class: "rx-endlabel", dx: 6 });
  const rule = el(chart, "line", { y1: m.t, y2: ch - m.b, class: "rx-rule" });
  const hoverRule = el(chart, "line", { y1: m.t, y2: ch - m.b, class: "rx-hover", opacity: 0 });
  const tip = $("#rx-tip"), table = $("#rx-table tbody");
  let curve = null;

  function buildCurve() {
    if (curve) return;
    curve = [];
    for (let e = 0; e <= EPS_MAX + 1e-9; e += CURVE_STEP) {
      const ee = Math.round(e * 100) / 100;
      const c = robustInterval(tree, { eps: ee, budget: budgetFor(ee, true), units: 8 });
      const u = robustInterval(tree, { eps: ee, budget: budgetFor(ee, false), units: 8 });
      curve.push({ e: ee, c: c.upper - c.lower, u: u.upper - u.lower });
    }
    const path = (key) => curve.map((p, i) => `${i ? "L" : "M"}${cx(p.e).toFixed(1)},${cy(p[key]).toFixed(1)}`).join("");
    lineC.setAttribute("d", path("c")); lineU.setAttribute("d", path("u"));
    const last = curve[curve.length - 1];
    endC.setAttribute("x", cx(last.e)); endC.setAttribute("y", cy(last.c) + 4); endC.textContent = "shared";
    endU.setAttribute("x", cx(last.e)); endU.setAttribute("y", cy(last.u) + 4); endU.textContent = "independent";
    table.replaceChildren();
    for (const p of curve.filter((_, i) => i % 5 === 0)) {
      const tr = document.createElement("tr");
      for (const v of [p.e.toFixed(1), fmt(p.c), fmt(p.u)]) { const td = document.createElement("td"); td.textContent = v; tr.appendChild(td); }
      table.appendChild(tr);
    }
  }
  const nearIo = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    nearIo.disconnect();
    ("requestIdleCallback" in window ? requestIdleCallback : setTimeout)(() => buildCurve());
  }, { rootMargin: "400px 0px" });
  nearIo.observe(chart);

  // crosshair: pointer or arrow keys; snaps to the computed ε steps
  let hoverIdx = -1;
  function showHover(i) {
    if (!curve) buildCurve();
    hoverIdx = Math.max(0, Math.min(curve.length - 1, i));
    const p = curve[hoverIdx];
    hoverRule.setAttribute("x1", cx(p.e)); hoverRule.setAttribute("x2", cx(p.e)); hoverRule.setAttribute("opacity", 1);
    tip.hidden = false;
    tip.querySelector("[data-v=e]").textContent = `ε = ${p.e.toFixed(1)}`;
    tip.querySelector("[data-v=c]").textContent = fmt(p.c);
    tip.querySelector("[data-v=u]").textContent = fmt(p.u);
    const box = chart.getBoundingClientRect(), scale = box.width / cw;
    tip.style.transform = `translate(${Math.min(cx(p.e) * scale + 12, box.width - 150)}px, 0)`;
  }
  function hideHover() { hoverRule.setAttribute("opacity", 0); tip.hidden = true; hoverIdx = -1; }
  chart.addEventListener("pointermove", (e) => {
    const box = chart.getBoundingClientRect(), x = ((e.clientX - box.left) / box.width) * cw;
    showHover(Math.round((((x - m.l) / (cw - m.l - m.r)) * EPS_MAX) / CURVE_STEP));
  });
  chart.addEventListener("pointerleave", hideHover);
  chart.addEventListener("blur", hideHover);
  chart.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    showHover((hoverIdx < 0 ? Math.round(+eps.value / CURVE_STEP) : hoverIdx) + (e.key === "ArrowRight" ? 1 : -1));
  });

  // ---- one update path: every readout comes from the same result object ----
  let raf = 0;
  function update() {
    const e = +eps.value, coupled = couple.checked;
    result = robustInterval(tree, { eps: e, budget: budgetFor(e, coupled) });
    epsOut.textContent = e.toFixed(2);
    root.dataset.mode = coupled ? "shared" : "independent";
    const L = result.lower, U = result.upper;
    bandRect.setAttribute("x", bx(L)); bandRect.setAttribute("width", Math.max(2, bx(U) - bx(L)));
    nomTick.setAttribute("x1", bx(result.nominal)); nomTick.setAttribute("x2", bx(result.nominal));
    loText.setAttribute("x", bx(L) - 4); loText.textContent = fmt(L);
    hiText.setAttribute("x", bx(U) + 4); hiText.textContent = fmt(U);
    rule.setAttribute("x1", cx(Math.min(e, EPS_MAX))); rule.setAttribute("x2", cx(Math.min(e, EPS_MAX)));
    nodes.forEach((n, i) => {
      const d = result.witnessLower[i];
      rings[i].setAttribute("stroke-width", d ? 1.5 + 3 * Math.min(1, Math.abs(d) / Math.max(e, 1e-9)) : 0);
      rings[i].classList.toggle("is-hit", d < 0);
      if (deltaText[i]) deltaText[i].textContent = d < 0 ? `δ ${fmt(d)}` : "";
    });
    renderStep();
    clearTimeout(raf);
    // announce after the slider settles, so screen readers hear one sentence, not every step
    raf = setTimeout(() => {
      verdict.textContent = `Belief in the claim ranges from ${fmt(L)} to ${fmt(U)}. ` +
        (L < 0.5 ? "The low end is under 0.5, so this claim would be flagged for review." : "Even the low end stays above 0.5, so the claim is kept.");
      verdict.classList.toggle("flag", L < 0.5);
    }, 250);
    root.dataset.lower = fmt(L);   // read by the e2e check
  }
  eps.addEventListener("input", update);
  couple.addEventListener("change", update);
  $("#rx-nominal").textContent = fmt(nominal(tree));
  update();

  return {
    destroy() { tween?.kill(); io.disconnect(); nearIo.disconnect(); clearTimeout(raf); },
  };
}
