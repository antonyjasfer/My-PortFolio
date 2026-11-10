import * as THREE from "three";

/** DOM labels that follow the nodes (ported from v1). Hidden from assistive tech. */
export function createLabels(container, nodes) {
  const els = nodes.map((n) => {
    const el = document.createElement("div");
    el.className = "nlabel" + (n.kind === "s" ? " skill" : "");
    el.textContent = n.label;
    container.appendChild(el);
    return el;
  });
  const v = new THREE.Vector3();

  /** show(n) decides visibility; opacityOf(n) gives 0..1 */
  function update(camera, meshes, W, H, show, opacityOf) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i], el = els[i];
      meshes[i].getWorldPosition(v).project(camera);
      const op = v.z < 1 && show(n) ? opacityOf(n) : 0;
      el.style.opacity = op.toFixed(2);
      if (op < 0.01) continue;
      const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H + (n.kind === "p" ? 26 : 18);
      el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
    }
  }
  function dispose() { els.forEach((el) => el.remove()); }
  return { update, dispose };
}
