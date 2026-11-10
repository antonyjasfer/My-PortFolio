// The three.js skill graph with no DOM access, so it can run in a Web Worker
// on an OffscreenCanvas (src/scene/worker.js) or on the main thread as a
// fallback (src/scene/host.js). It talks to the page only through emit():
//   "frame"  {labels: Float32Array [x, y, opacity] per node, busy, assembled}
//   "hover"  {kind, label} | null     "pick" {kind: "p", id} | {kind: "s", label}
//   "cursor" "pointer" | ""           "lost"
//   "ready"  {tier, idleFps, renderer}
import * as THREE from "three";
import { PROJECTS } from "../data/projects.js";
import { buildGraph } from "./graph.js";
import { applyPositions } from "./layout.js";
import { routeBetween } from "./route.js";
import { scatter, nodeProgress, edgeProgress, lerp3 } from "./assembly.js";
import { createParticles } from "./particles.js";
import { createRig } from "./camera.js";
import { pickTier, TIERS, TIER_ORDER, lowerTier } from "./quality.js";
import LAYOUT from "./layout.json";

const INK = new THREE.Color("#16213E"), SLATE = new THREE.Color("#8796AC"), SAFF = new THREE.Color("#E8A317");
const PAPER = new THREE.Color("#EEF1F5"), EDGE = new THREE.Color("#5C6B84");
const DIM = 0.13;                       // opacity-equivalent of a dimmed node
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();
const worse = (a, b) => (TIER_ORDER.indexOf(a) > TIER_ORDER.indexOf(b) ? a : b);
const tick = () => new Promise((r) => setTimeout(r, 0));

/**
 * @param {{canvas: HTMLCanvasElement|OffscreenCanvas, reduced: boolean,
 *          signals: {cores?:number, memory?:number, width:number, height:number, dpr:number},
 *          emit: (type: string, data?: any, transfer?: Transferable[]) => void}} o
 */
export function createCore({ canvas, reduced, signals, emit }) {
  // Antialias is fixed when the context is created, so it comes from the
  // hardware signals alone; the renderer probe can only lower live settings.
  const preTier = pickTier(signals);
  const gl = canvas.getContext("webgl2", { antialias: TIERS[preTier].antialias, alpha: true, powerPreference: "low-power" });
  if (!gl) throw new Error("WebGL2 unavailable");
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const rendererName = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || "");
  let tierName = worse(preTier, pickTier({ ...signals, renderer: rendererName }));
  let tier = TIERS[tierName];
  let size = { w: signals.width, h: signals.height, dpr: signals.dpr };

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl });
  // Checking shader errors queries link status, which blocks until the GPU
  // process finishes compiling. Keep the check in development only.
  renderer.debug.checkShaderErrors = !!import.meta.env.DEV;

  const graph = applyPositions(buildGraph(PROJECTS), LAYOUT.positions);
  const { nodes, edges, byId } = graph;
  const start = scatter(graph);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const dl = new THREE.DirectionalLight(0xffffff, 2.2); dl.position.set(4, 6, 8); scene.add(dl);
  const world = new THREE.Group(); scene.add(world);
  const rig = createRig(camera, world, { reduced });

  // Nodes: one InstancedMesh per kind (a handful of draw calls, one shader).
  // Dimming mixes each node's colour toward the paper instead of using
  // transparency, which keeps them opaque and cheap.
  const pGeo = new THREE.IcosahedronGeometry(0.46, tier.detail), sGeo = new THREE.IcosahedronGeometry(0.17, tier.detail);
  const nodeMat = new THREE.MeshLambertMaterial({ flatShading: true });
  const pNodes = nodes.filter((n) => n.kind === "p"), sNodes = nodes.filter((n) => n.kind === "s");
  const pMesh = new THREE.InstancedMesh(pGeo, nodeMat, pNodes.length), sMesh = new THREE.InstancedMesh(sGeo, nodeMat, sNodes.length);
  const cur = {};
  for (const [mesh, list, base] of [[pMesh, pNodes, INK], [sMesh, sNodes, SLATE]]) {
    mesh.frustumCulled = false;
    list.forEach((n, i) => { n.mesh = mesh; n.inst = i; n.base = base; n.op = 1; n.target = 1; n.scale = 1; mesh.setColorAt(i, base); });
    world.add(mesh);
  }
  for (const n of nodes) cur[n.id] = { ...n.p };
  const writeNode = (n) => {
    _m.compose(_p.set(cur[n.id].x, cur[n.id].y, cur[n.id].z), _q, _s.setScalar(n.scale));
    n.mesh.setMatrixAt(n.inst, _m);
  };
  const tintNode = (n) => n.mesh.setColorAt(n.inst, _c.copy(n.base).lerp(PAPER, (1 - n.op) * 0.92));

  // Edges: high/medium fade each edge with its nodes (per-vertex alpha); the
  // low tier draws opaque lines tinted toward the paper instead.
  const ePos = new Float32Array(edges.length * 6), eCol = new Float32Array(edges.length * (tier.edgeAlpha ? 8 : 6));
  const eGeo = new THREE.BufferGeometry();
  eGeo.setAttribute("position", new THREE.BufferAttribute(ePos, 3));
  eGeo.setAttribute("color", new THREE.BufferAttribute(eCol, tier.edgeAlpha ? 4 : 3));
  const eMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: tier.edgeAlpha, depthWrite: !tier.edgeAlpha });
  const lines = new THREE.LineSegments(eGeo, eMat); lines.frustumCulled = false;
  world.add(lines);
  const colourEdges = () => {
    edges.forEach(([a, b], i) => {
      const o = Math.min(byId[a].op, byId[b].op);
      if (tier.edgeAlpha) {
        for (let k = 0; k < 2; k++) { const c = i * 8 + k * 4; eCol[c] = 0.36; eCol[c + 1] = 0.42; eCol[c + 2] = 0.52; eCol[c + 3] = o * 0.45; }
      } else {
        _c.copy(EDGE).lerp(PAPER, 1 - o * 0.45);
        for (let k = 0; k < 2; k++) _c.toArray(eCol, i * 6 + k * 3);
      }
    });
    eGeo.attributes.color.needsUpdate = true;
  };

  const P = createParticles(graph, TIERS.high.particles, SAFF);
  P.mesh.count = tier.particles;
  world.add(P.mesh, P.courier);

  // ---- state ----
  let assembly = reduced ? 1 : 0, speed = reduced ? 0.3 : 0, edgeK = edgeProgress(assembly);
  let focus = null, hover = null, dirty = true, paused = false, dead = false, disposed = false;
  let tour = null, tourMoving = false;          // tour: {key, curve, t}
  let edgeColDirty = true, busy = true, hoverDirty = false;
  // label output: [x, y, opacity] per node, in CSS pixels
  const labelBuf = new Float32Array(nodes.length * 3);
  const v = new THREE.Vector3();

  function place() {
    for (const node of nodes) {
      lerp3(start[node.id], node.p, nodeProgress(assembly, node.i, nodes.length), cur[node.id]);
      writeNode(node);
    }
    pMesh.instanceMatrix.needsUpdate = true; sMesh.instanceMatrix.needsUpdate = true;
    edgeK = edgeProgress(assembly);
    edges.forEach(([a, b], i) => {
      const A = cur[a], B = cur[b], o = i * 6;
      ePos[o] = A.x; ePos[o + 1] = A.y; ePos[o + 2] = A.z;
      ePos[o + 3] = A.x + (B.x - A.x) * edgeK; ePos[o + 4] = A.y + (B.y - A.y) * edgeK; ePos[o + 5] = A.z + (B.z - A.z) * edgeK;
    });
    eGeo.attributes.position.needsUpdate = true;
  }
  place();

  const posOf = (id) => cur[id];
  const visOf = (ei) => (edgeK >= 1 && Math.min(byId[edges[ei][0]].op, byId[edges[ei][1]].op) > 0.5 ? 1 : 0);
  const showLabel = (n) => n.kind === "p" || hover === n || (tier.skillLabels && focus && focus.has(n.id) && focus.size < 12);

  function writeLabels() {
    const { w, h } = size;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i], o = i * 3;
      let op = 0;
      if (showLabel(n)) {
        v.set(cur[n.id].x, cur[n.id].y, cur[n.id].z).applyMatrix4(world.matrixWorld).project(camera);
        if (v.z < 1) op = Math.round(n.op * Math.min(1, assembly * 1.4) * 50) / 50;
      }
      labelBuf[o] = Math.round((v.x * 0.5 + 0.5) * w);
      labelBuf[o + 1] = Math.round((-v.y * 0.5 + 0.5) * h + (n.kind === "p" ? 26 : 18));
      labelBuf[o + 2] = op;
    }
  }

  function setTier(name) {
    tierName = name; tier = TIERS[name];
    P.mesh.count = Math.min(P.mesh.count, tier.particles);
    api.resize(size.w, size.h, size.dpr);
  }

  // ---- interaction (ported from v1; pointer events are forwarded by the host) ----
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  let sx = 0, sy = 0, moved = 0;
  function pick(x, y) {
    mouse.set((x / size.w) * 2 - 1, -(y / size.h) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    for (const h of ray.intersectObjects([pMesh, sMesh])) {
      const n = (h.object === pMesh ? pNodes : sNodes)[h.instanceId];
      if (n && n.op > 0.5) return n;
    }
    return null;
  }

  const api = {
    /** focus: {ids: string[] | null, aimId?: string} | null */
    setFocus(f) {
      focus = f && f.ids ? new Set(f.ids) : null;
      for (const n of nodes) n.target = !focus || focus.has(n.id) ? 1 : DIM;
      if (!tour) rig.aimAt(f && f.aimId && byId[f.aimId] ? byId[f.aimId].p : null);
      if (reduced) for (const n of nodes) { n.op = n.target; tintNode(n); }
      edgeColDirty = true; hoverDirty = true; dirty = true;
    },
    setAssembly(t) { assembly = t; place(); dirty = true; },
    setSpeed(k) { speed = k; },
    setTour(fromId, toId, t) {
      if (fromId == null) {
        if (tour) { tour = null; P.courier.material.opacity = 0; P.halo.material.opacity = 0; rig.state.zoomT = 1; rig.aimAt(null); }
        dirty = true;
        return;
      }
      const key = fromId + ">" + toId;
      if (!tour || tour.key !== key) {
        const route = routeBetween(graph, fromId, toId);
        const pts = route ? route.map((id) => byId[id].p) : [byId[fromId].p, { x: 0, y: 0, z: 0 }, byId[toId].p];
        const vs = pts.map((p) => new THREE.Vector3(p.x, p.y, p.z));
        if (vs.length === 1) vs.push(vs[0].clone());
        tour = { key, curve: new THREE.CatmullRomCurve3(vs, false, "centripetal"), t: -1 };
      }
      const nt = Math.max(0, Math.min(1, t));
      if (nt !== tour.t) tourMoving = true;
      tour.t = nt;
      const p = tour.curve.getPointAt(tour.t);
      P.courier.position.copy(p);
      // the courier leads the way, then hands over to the node it arrives at
      const glow = reduced ? 0 : Math.min(1, (1 - tour.t) * 5);
      P.courier.material.opacity = glow; P.halo.material.opacity = glow * 0.6;
      rig.aimAt(p, 0.14);
      rig.state.zoomT = 0.66;
      dirty = true;
    },
    setShift(x, y) { rig.state.shiftXT = x; rig.state.shiftYT = y; dirty = true; },
    resize(w, h, dpr) {
      size = { w, h, dpr };
      renderer.setPixelRatio(Math.min(dpr, tier.maxDpr));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      rig.state.baseZ = w < 860 ? 33 : w < 1200 ? 27 : 24;
      camera.updateProjectionMatrix();
      dirty = true;
    },
    setPaused(p) { paused = p; dirty = true; },
    invalidate() { dirty = true; },
    /** test hook (host exposes it only with ?e2e): simulate a lost GPU context */
    loseContext() { gl.getExtension("WEBGL_lose_context")?.loseContext(); },
    /** Watchdog step-down: lower resolution and particle count only (no new shaders). */
    stepDown() {
      const next = lowerTier(tierName);
      if (!next) return false;
      setTier(next);
      return true;
    },
    /**
     * Compiles each shader program and draws it once, one program per task, so
     * the link wait and uniform lookups never pile up in one long task.
     */
    async warm() {
      const all = [pMesh, sMesh, lines, P.mesh, P.courier];
      for (const g of [[pMesh, sMesh], [lines], [P.mesh], [P.courier]]) {
        await tick();
        if (disposed || dead) return;
        all.forEach((o) => (o.visible = g.includes(o)));
        renderer.render(scene, camera);
        all.forEach((o) => (o.visible = true));
      }
      colourEdges();
      emit("ready", { tier: tierName, idleFps: tier.idleFps, renderer: rendererName });
    },
    render(dt) {
      if (paused || dead || disposed) return false;
      if (reduced && !dirty) return false;
      dirty = false;
      rig.update(dt, reduced);
      let settling = false, changed = hoverDirty;
      hoverDirty = false;
      for (const n of nodes) {
        const op = n.op + (n.target - n.op) * (reduced ? 1 : 1 - Math.pow(0.88, dt * 60));
        if (Math.abs(n.target - op) > 1e-3) settling = true;
        if (op !== n.op) { n.op = op; tintNode(n); changed = true; }
        const s = hover === n ? 1.3 : 1, sc = n.scale + (s - n.scale) * (reduced ? 1 : 0.2);
        if (Math.abs(sc - n.scale) > 1e-4) { n.scale = sc; writeNode(n); changed = true; settling = true; }
      }
      if (changed) {
        pMesh.instanceColor.needsUpdate = true; sMesh.instanceColor.needsUpdate = true;
        pMesh.instanceMatrix.needsUpdate = true; sMesh.instanceMatrix.needsUpdate = true;
      }
      // edge colour follows node opacity, so it only needs rewriting while opacities move
      if (settling || edgeColDirty) { edgeColDirty = settling; colourEdges(); }
      P.update(reduced ? 0 : dt, speed, posOf, visOf);
      if (P.halo.material.opacity > 0) P.halo.lookAt(camera.position);
      renderer.render(scene, camera);
      writeLabels();
      busy = settling || rig.busy() || (tour !== null && tourMoving);
      tourMoving = false;
      if (reduced && (settling || rig.settling())) dirty = true;
      return true;
    },
    labels: () => labelBuf,
    state: () => ({ busy: busy || dirty || assembly < 1 || rig.state.dragging, assembled: assembly >= 1, tier: tierName, idleFps: tier.idleFps }),
    /** e: {type, x, y, pointerType} in CSS pixels relative to the canvas */
    pointer(e) {
      if (e.type === "down") { rig.state.dragging = true; moved = 0; sx = e.x; sy = e.y; return; }
      if (e.type === "move") {
        if (rig.state.dragging) {
          const dx = e.x - sx, dy = e.y - sy; moved += Math.abs(dx) + Math.abs(dy);
          rig.drag(dx, dy); sx = e.x; sy = e.y; dirty = true;
        }
        if (e.pointerType === "mouse") {
          const h = pick(e.x, e.y);
          if (h !== hover) {
            hover = h; hoverDirty = true; dirty = true;
            emit("hover", h ? { kind: h.kind, label: h.label } : null);
            emit("cursor", h && h.kind === "p" ? "pointer" : "");
          }
        }
        return;
      }
      if (e.type === "up") {
        rig.state.dragging = false; rig.release();
        if (moved < 6) {
          const n = pick(e.x, e.y);
          if (n) emit("pick", n.kind === "p" ? { kind: "p", id: n.id } : { kind: "s", label: n.label });
        }
        return;
      }
      if (e.type === "cancel") { rig.state.dragging = false; rig.release(); return; }
      if (e.type === "leave" && hover) { hover = null; hoverDirty = true; dirty = true; emit("hover", null); emit("cursor", ""); }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener("webglcontextlost", onLost);
      pGeo.dispose(); sGeo.dispose(); nodeMat.dispose(); pMesh.dispose(); sMesh.dispose();
      eGeo.dispose(); eMat.dispose(); P.dispose();
      renderer.dispose();
    },
  };

  const onLost = (e) => { e.preventDefault(); dead = true; emit("lost"); };
  canvas.addEventListener("webglcontextlost", onLost);

  api.resize(size.w, size.h, size.dpr);
  return api;
}
