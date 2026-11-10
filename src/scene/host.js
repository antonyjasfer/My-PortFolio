// Main-thread side of the skill graph. Owns everything that needs the DOM
// (labels, tooltip, pointer events, pausing) and drives the scene core either
// in a Web Worker on an OffscreenCanvas (preferred: rendering never blocks the
// main thread) or in this thread when OffscreenCanvas is unavailable.
// Exposes the SceneAPI that app.js and the motion modules use.
import { lowerTier } from "./quality.js";

/**
 * @param {{canvas: HTMLCanvasElement, labels: HTMLElement, tip: HTMLElement, graph: any, reduced: boolean}} o
 * @returns SceneAPI plus `ready: Promise<void>` (resolves once shaders are warm)
 */
export function createSceneHost({ canvas, labels: labelBox, tip, graph, reduced }) {
  const { nodes } = graph;
  const signals = () => ({
    cores: navigator.hardwareConcurrency, memory: navigator.deviceMemory,
    width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1,
  });
  const pickCbs = new Set(), lostCbs = new Set();
  let state = { busy: true, assembled: false, tier: "high", idleFps: 30 };
  let inFlight = false, pendingDt = 0, disposed = false, lost = false;
  let resolveReady, rejectReady;
  const ready = new Promise((res, rej) => { resolveReady = res; rejectReady = rej; });

  // ---- labels: created on first show, written only when they change ----
  const els = new Array(nodes.length).fill(null);
  const last = nodes.map(() => ({ op: 0, x: -1, y: -1 }));
  function applyLabels(buf) {
    for (let i = 0; i < nodes.length; i++) {
      const o = i * 3, op = buf[o + 2], prev = last[i];
      let el = els[i];
      if (!el) {
        if (op === 0) continue;
        el = els[i] = document.createElement("div");
        el.className = "nlabel" + (nodes[i].kind === "s" ? " skill" : "");
        el.textContent = nodes[i].label;
        labelBox.appendChild(el);
      }
      if (op !== prev.op) { el.style.opacity = op; prev.op = op; }
      if (op === 0) continue;
      const x = buf[o], y = buf[o + 1];
      if (x !== prev.x || y !== prev.y) {
        el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
        prev.x = x; prev.y = y;
      }
    }
  }

  // ---- events coming back from the core ----
  let px = 0, py = 0;
  function onEvent(type, data) {
    if (type === "frame") {
      inFlight = false;
      state = { busy: data.busy, assembled: data.assembled, tier: data.tier, idleFps: data.idleFps };
      if (data.labels) applyLabels(data.labels);
    } else if (type === "ready") {
      state = { ...state, tier: data.tier, idleFps: data.idleFps };
      resolveReady();
    } else if (type === "hover") {
      if (data) {
        tip.textContent = data.kind === "p" ? "Open " + data.label : "Show projects using " + data.label;
        tip.style.transform = `translate(${px + 14}px,${py + 14}px)`;
        tip.style.opacity = 1;
      } else tip.style.opacity = 0;
    } else if (type === "cursor") {
      canvas.style.cursor = data;
    } else if (type === "pick") {
      pickCbs.forEach((cb) => cb(data));
    } else if (type === "lost" || type === "error") {
      lost = true;
      rejectReady(new Error(type === "lost" ? "WebGL context lost" : data));
      lostCbs.forEach((cb) => cb());
    }
  }

  // ---- backend: worker if possible, otherwise the core in this thread ----
  let send;      // (type, payload) => void
  let worker = null, local = null;
  const useWorker = typeof Worker !== "undefined" && "transferControlToOffscreen" in canvas;
  if (useWorker) {
    worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data: m }) => onEvent(m.type, m.data);
    worker.onerror = (e) => onEvent("error", e.message || "worker failed");
    const off = canvas.transferControlToOffscreen();
    worker.postMessage({ type: "init", canvas: off, reduced, signals: signals() }, [off]);
    send = (type, payload) => worker.postMessage({ type, ...payload });
  } else {
    send = (type, payload) => {
      if (!local) return;
      if (type === "frame") {
        const drew = local.render(payload.dt);
        onEvent("frame", { labels: drew ? local.labels() : null, ...local.state() });
      } else local[payload.name](...payload.args);
    };
    import("./core.js")
      .then(({ createCore }) => {
        if (disposed) return;
        local = createCore({ canvas, reduced, signals: signals(), emit: onEvent });
        return local.warm();
      })
      .catch((err) => onEvent("error", String(err?.message || err)));
  }
  const call = (name, ...args) => { if (!disposed && !lost) send("call", { name, args }); };

  // ---- pointer events, forwarded in canvas coordinates ----
  const fwd = (type) => (e) => {
    px = e.clientX; py = e.clientY;
    if (type === "down") { canvas.setPointerCapture?.(e.pointerId); canvas.classList.add("dragging"); }
    if (type === "up" || type === "cancel") canvas.classList.remove("dragging");
    if (type === "leave") tip.style.opacity = 0;
    call("pointer", { type, x: e.clientX, y: e.clientY, pointerType: e.pointerType });
  };
  const handlers = { pointerdown: fwd("down"), pointermove: fwd("move"), pointerup: fwd("up"),
    pointerleave: fwd("leave"), pointercancel: fwd("cancel"), lostpointercapture: fwd("cancel") };
  for (const [t, h] of Object.entries(handlers)) canvas.addEventListener(t, h);

  // ---- pause when the tab is hidden or the canvas is off screen ----
  let tabHidden = document.hidden, offscreen = false;
  const syncPause = () => call("setPaused", tabHidden || offscreen);
  const onVis = () => { tabHidden = document.hidden; syncPause(); };
  document.addEventListener("visibilitychange", onVis);
  const io = new IntersectionObserver(([en]) => { offscreen = !en.isIntersecting; syncPause(); });
  io.observe(canvas);

  // e2e hook only: lets the test simulate a lost GPU context in the worker
  if (new URLSearchParams(location.search).has("e2e")) window.__graph = { loseContext: () => call("loseContext") };

  return {
    isNull: false,
    ready,
    get tier() { return state.tier; },
    get idleFps() { return state.idleFps; },
    get assembled() { return state.assembled; },
    needsFrame: () => state.busy,
    setFocus(f) { call("setFocus", f && f.ids ? { ids: [...f.ids], aimId: f.aimId } : f && f.aimId ? { ids: null, aimId: f.aimId } : null); },
    setAssembly: (t) => call("setAssembly", t),
    setSpeed: (k) => call("setSpeed", k),
    setTour: (from, to, t) => call("setTour", from ?? null, to, t),
    setShift: (x, y) => call("setShift", x, y),
    setSettle: (k) => call("setSettle", k),
    resize: () => call("resize", innerWidth, innerHeight, devicePixelRatio || 1),
    invalidate: () => call("invalidate"),
    /** One frame request at a time: dt accumulates while the core is still drawing. */
    render(dt) {
      if (disposed || lost) return;
      pendingDt += dt;
      if (inFlight) return;
      inFlight = true;
      send("frame", { dt: Math.min(pendingDt, 0.1) });
      pendingDt = 0;
    },
    stepDown() {
      const next = lowerTier(state.tier);
      if (!next) return false;
      state = { ...state, tier: next };
      call("stepDown");
      return true;
    },
    warmSteps: () => [],
    onPick(cb) { pickCbs.add(cb); return () => pickCbs.delete(cb); },
    onLost(cb) { lostCbs.add(cb); return () => lostCbs.delete(cb); },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const [t, h] of Object.entries(handlers)) canvas.removeEventListener(t, h);
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
      if (worker) worker.terminate(); else local?.dispose();
      els.forEach((el) => el?.remove());
      pickCbs.clear(); lostCbs.clear();
    },
  };
}
