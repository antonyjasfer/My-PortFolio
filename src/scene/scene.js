// The three.js skill graph. This module (and the three files it imports) is
// the lazy chunk: main.js loads it with import() after the hero has painted.
// Everything outside src/scene talks to it only through the API returned here.
import * as THREE from "three";
import { applyPositions } from "./layout.js";
import { routeBetween } from "./route.js";
import { scatter, nodeProgress, edgeProgress, lerp3 } from "./assembly.js";
import { createParticles } from "./particles.js";
import { createRig } from "./camera.js";
import { createLabels } from "./labels.js";
import LAYOUT from "./layout.json";

const INK = new THREE.Color("#16213E"), SLATE = new THREE.Color("#8796AC"), SAFF = new THREE.Color("#E8A317");
const DIM = 0.13;
const ONE = new THREE.Vector3();

/**
 * @param {{canvas:HTMLCanvasElement, labels:HTMLElement, tip:HTMLElement, graph:any,
 *          reduced:boolean, particles:number}} opts
 */
export function createScene({ canvas, labels: labelBox, tip, graph, reduced, particles: particleCount }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: devicePixelRatio < 2, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const { nodes, edges, byId } = applyPositions(graph, LAYOUT.positions);
  const start = scatter(graph);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const dl = new THREE.DirectionalLight(0xffffff, 2.2); dl.position.set(4, 6, 8); scene.add(dl);
  const world = new THREE.Group(); scene.add(world);
  const rig = createRig(camera, world, { reduced });

  // nodes: one mesh each (about 50 draw calls), so per-node opacity is plain material state
  const pGeo = new THREE.IcosahedronGeometry(0.46, 1), sGeo = new THREE.IcosahedronGeometry(0.17, 1);
  const cur = {}; // current (animated) position per node id
  const meshes = nodes.map((n) => {
    const mat = new THREE.MeshStandardMaterial({ color: n.kind === "p" ? INK : SLATE, flatShading: true, roughness: 0.55, metalness: 0.1, transparent: true });
    const m = new THREE.Mesh(n.kind === "p" ? pGeo : sGeo, mat);
    m.userData.n = n; n.mesh = m; n.op = 1; n.target = 1;
    cur[n.id] = { ...n.p };
    world.add(m);
    return m;
  });

  const ePos = new Float32Array(edges.length * 6), eCol = new Float32Array(edges.length * 8);
  const eGeo = new THREE.BufferGeometry();
  eGeo.setAttribute("position", new THREE.BufferAttribute(ePos, 3));
  eGeo.setAttribute("color", new THREE.BufferAttribute(eCol, 4));
  const eMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
  const lines = new THREE.LineSegments(eGeo, eMat); lines.frustumCulled = false;
  world.add(lines);

  const P = createParticles(graph, particleCount, SAFF);
  world.add(P.mesh, P.courier);

  const lab = createLabels(labelBox, nodes);

  // ---- state ----
  let assembly = reduced ? 1 : 0, speed = reduced ? 0.3 : 0, edgeK = edgeProgress(assembly);
  let focus = null, hover = null, dirty = true, paused = false, dead = false, disposed = false;
  let tour = null; // {key, curve, t}
  const pickCbs = new Set(), lostCbs = new Set();

  function place() {
    const n = nodes.length;
    for (const node of nodes) {
      const k = nodeProgress(assembly, node.i, n);
      lerp3(start[node.id], node.p, k, cur[node.id]);
      node.mesh.position.set(cur[node.id].x, cur[node.id].y, cur[node.id].z);
    }
    edgeK = edgeProgress(assembly);
    edges.forEach(([a, b], i) => {
      const A = cur[a], B = cur[b], o = i * 6;
      ePos[o] = A.x; ePos[o + 1] = A.y; ePos[o + 2] = A.z;
      ePos[o + 3] = A.x + (B.x - A.x) * edgeK; ePos[o + 4] = A.y + (B.y - A.y) * edgeK; ePos[o + 5] = A.z + (B.z - A.z) * edgeK;
    });
    eGeo.attributes.position.needsUpdate = true;
  }
  place();

  // ---- API ----
  const api = {
    isNull: false,
    debug: () => { const v = new THREE.Vector3(); meshes[0].getWorldPosition(v); const w = v.clone().project(camera); return { assembly, speed, paused, dead, tour: tour && tour.key, op: nodes[0].op, target: nodes[0].target, pos: v.toArray().map((x) => +x.toFixed(2)), proj: w.toArray().map((x) => +x.toFixed(2)), camZ: camera.position.z, size: [renderer.domElement.width, renderer.domElement.height], calls: renderer.info.render.calls, frame: renderer.info.render.frame }; },
    setFocus(f) {
      focus = f && f.ids ? f.ids : null;
      for (const n of nodes) n.target = !focus || focus.has(n.id) ? 1 : DIM;
      if (!tour) rig.aimAt(f && f.aimId && byId[f.aimId] ? byId[f.aimId].p : null);
      if (reduced) for (const n of nodes) n.op = n.target;
      api.invalidate();
    },
    setAssembly(t) { assembly = t; place(); api.invalidate(); },
    setSpeed(k) { speed = k; },
    setTour(fromId, toId, t) {
      if (fromId == null) {
        if (tour) { tour = null; P.courier.material.opacity = 0; P.halo.material.opacity = 0; rig.state.zoomT = 1; rig.aimAt(null); }
        api.invalidate();
        return;
      }
      const key = fromId + ">" + toId;
      if (!tour || tour.key !== key) {
        const route = routeBetween(graph, fromId, toId);
        const pts = route ? route.map((id) => byId[id].p) : [byId[fromId].p, { x: 0, y: 0, z: 0 }, byId[toId].p];
        const v = pts.map((p) => new THREE.Vector3(p.x, p.y, p.z));
        if (v.length === 1) v.push(v[0].clone());
        tour = { key, curve: new THREE.CatmullRomCurve3(v, false, "centripetal") };
      }
      tour.t = Math.max(0, Math.min(1, t));
      const p = tour.curve.getPointAt(tour.t);
      P.courier.position.copy(p);
      // the courier leads the way, then hands over to the node it arrives at
      const glow = reduced ? 0 : Math.min(1, (1 - tour.t) * 5);
      P.courier.material.opacity = glow; P.halo.material.opacity = glow * 0.6;
      rig.aimAt(p, 0.14);
      rig.state.zoomT = 0.66;
      api.invalidate();
    },
    setShift(x, y) { rig.state.shiftXT = x; rig.state.shiftYT = y; api.invalidate(); },
    resize() {
      const w = innerWidth, h = innerHeight;
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      rig.state.baseZ = w < 860 ? 33 : w < 1200 ? 27 : 24;
      camera.updateProjectionMatrix();
      api.invalidate();
    },
    invalidate() { dirty = true; },
    render(dt) {
      if (paused || dead || disposed) return;
      // reduced motion: draw only when something changed
      if (reduced && !dirty) return;
      dirty = false;
      rig.update(dt, reduced);
      let settling = false;
      for (const n of nodes) {
        n.op += (n.target - n.op) * (reduced ? 1 : 1 - Math.pow(0.88, dt * 60));
        if (Math.abs(n.target - n.op) > 1e-3) settling = true;
        n.mesh.material.opacity = n.op;
        const s = hover === n ? 1.3 : 1;
        n.mesh.scale.lerp(ONE.set(s, s, s), reduced ? 1 : 0.2);
      }
      edges.forEach(([a, b], i) => {
        const o = Math.min(byId[a].op, byId[b].op) * 0.45;
        for (let k = 0; k < 2; k++) { const c = i * 8 + k * 4; eCol[c] = 0.36; eCol[c + 1] = 0.42; eCol[c + 2] = 0.52; eCol[c + 3] = o; }
      });
      eGeo.attributes.color.needsUpdate = true;
      P.update(reduced ? 0 : dt, speed,
        (id) => cur[id],
        (ei) => (edgeK >= 1 && Math.min(byId[edges[ei][0]].op, byId[edges[ei][1]].op) > 0.5 ? 1 : 0));
      if (P.halo.material.opacity > 0) P.halo.lookAt(camera.position);
      renderer.render(scene, camera);
      lab.update(camera, meshes, innerWidth, innerHeight,
        (n) => n.kind === "p" || hover === n || (focus && focus.has(n.id) && focus.size < 12),
        (n) => n.op * Math.min(1, assembly * 1.4));
      if (reduced && (settling || rig.settling())) dirty = true;
    },
    onPick(cb) { pickCbs.add(cb); return () => pickCbs.delete(cb); },
    onLost(cb) { lostCbs.add(cb); return () => lostCbs.delete(cb); },
    dispose,
  };

  // ---- interaction (ported from v1) ----
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  let sx = 0, sy = 0, moved = 0;
  function pick(e) {
    mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(meshes).find((h) => h.object.userData.n.op > 0.5);
    return hit ? hit.object.userData.n : null;
  }
  const onDown = (e) => {
    rig.state.dragging = true; moved = 0; sx = e.clientX; sy = e.clientY;
    canvas.setPointerCapture(e.pointerId); canvas.classList.add("dragging");
  };
  const onMove = (e) => {
    if (rig.state.dragging) {
      const dx = e.clientX - sx, dy = e.clientY - sy; moved += Math.abs(dx) + Math.abs(dy);
      rig.drag(dx, dy); sx = e.clientX; sy = e.clientY; api.invalidate();
    }
    if (e.pointerType === "mouse") {
      const h = pick(e);
      if (h !== hover) { hover = h; api.invalidate(); }
      canvas.style.cursor = hover && hover.kind === "p" ? "pointer" : "";
      if (hover) {
        tip.textContent = hover.kind === "p" ? "Open " + hover.label : "Show projects using " + hover.label;
        tip.style.transform = `translate(${e.clientX + 14}px,${e.clientY + 14}px)`;
        tip.style.opacity = 1;
      } else tip.style.opacity = 0;
    }
  };
  const onUp = (e) => {
    rig.state.dragging = false; canvas.classList.remove("dragging"); rig.release();
    if (moved < 6) {
      const n = pick(e);
      if (n) pickCbs.forEach((cb) => cb(n.kind === "p" ? { kind: "p", id: n.id } : { kind: "s", label: n.label }));
    }
  };
  const onLeave = () => { tip.style.opacity = 0; if (hover) { hover = null; api.invalidate(); } };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointerleave", onLeave);

  // ---- pausing: hidden tab or offscreen canvas ----
  let tabHidden = document.hidden, offscreen = false;
  const syncPause = () => { paused = tabHidden || offscreen; if (!paused) api.invalidate(); };
  const onVis = () => { tabHidden = document.hidden; syncPause(); };
  document.addEventListener("visibilitychange", onVis);
  const io = new IntersectionObserver(([en]) => { offscreen = !en.isIntersecting; syncPause(); });
  io.observe(canvas);

  const onLostEvt = (e) => { e.preventDefault(); dead = true; lostCbs.forEach((cb) => cb()); };
  canvas.addEventListener("webglcontextlost", onLostEvt);

  function dispose() {
    if (disposed) return;
    disposed = true;
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointerleave", onLeave);
    canvas.removeEventListener("webglcontextlost", onLostEvt);
    document.removeEventListener("visibilitychange", onVis);
    io.disconnect();
    pGeo.dispose(); sGeo.dispose(); meshes.forEach((m) => m.material.dispose());
    eGeo.dispose(); eMat.dispose(); P.dispose(); lab.dispose();
    renderer.dispose();
    pickCbs.clear(); lostCbs.clear();
  }

  api.resize();
  return api;
}
