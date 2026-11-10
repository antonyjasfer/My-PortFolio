import * as THREE from "three";

/** DOM labels that follow the nodes (ported from v1). Hidden from assistive tech. */
export function createLabels(container, nodes, { skills = true } = {}) {
  // on small screens skill labels are never shown, so their DOM is not built
  const els = nodes.map((n) => {
    if (n.kind === "s" && !skills) return null;
    const el = document.createElement("div");
    el.className = "nlabel" + (n.kind === "s" ? " skill" : "");
    el.textContent = n.label;
    container.appendChild(el);
    return el;
  });
  const v = new THREE.Vector3();
  const last = nodes.map(() => ({ op: -1, x: 0, y: 0 }));

  /** show(n) decides visibility; opacityOf(n) gives 0..1 */
  function update(camera, meshes, W, H, show, opacityOf) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i], el = els[i], prev = last[i];
      if (!el) continue;
      let op = 0;
      if (show(n)) {
        meshes[i].getWorldPosition(v).project(camera);
        if (v.z < 1) op = Math.round(opacityOf(n) * 50) / 50;
      }
      if (op !== prev.op) { el.style.opacity = op; prev.op = op; }
      if (op === 0) continue;
      const x = Math.round((v.x * 0.5 + 0.5) * W), y = Math.round((-v.y * 0.5 + 0.5) * H + (n.kind === "p" ? 26 : 18));
      if (x !== prev.x || y !== prev.y) {
        el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
        prev.x = x; prev.y = y;
      }
    }
  }
  function dispose() { els.forEach((el) => el?.remove()); }
  return { update, dispose };
}
