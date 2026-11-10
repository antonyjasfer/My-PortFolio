// Runs the skill graph off the main thread. The page transfers its canvas
// here as an OffscreenCanvas, so WebGL context creation, shader linking and
// every frame's rendering never block scrolling, input or the intro.
// Protocol (page -> worker): {type:"init", canvas, reduced, signals}
//   {type:"frame", dt}  {type:"call", name, args}
// (worker -> page): the core's emit() events, plus "frame" with label data.
import { createCore } from "./core.js";

let core = null;
const emit = (type, data) => postMessage({ type, data });

onmessage = async ({ data: m }) => {
  if (m.type === "init") {
    try {
      core = createCore({ canvas: m.canvas, reduced: m.reduced, signals: m.signals, emit });
      await core.warm();
    } catch (err) {
      emit("error", String(err?.message || err));
    }
    return;
  }
  if (!core) return;
  if (m.type === "frame") {
    // Always answer a frame request, even if drawing failed: the page sends
    // one request at a time, so a missing reply would freeze the graph.
    let drew = false;
    try { drew = core.render(m.dt); } catch (err) { console.error("[graph] frame failed:", err); }
    // label positions travel back as a copy; 47 nodes x 3 floats is tiny
    postMessage({ type: "frame", data: { labels: drew ? core.labels().slice() : null, ...core.state() } });
  } else if (m.type === "call" && typeof core[m.name] === "function") {
    try { core[m.name](...m.args); } catch (err) { console.error(`[graph] ${m.name} failed:`, err); }
  }
};
