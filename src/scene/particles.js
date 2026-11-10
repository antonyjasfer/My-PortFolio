import * as THREE from "three";

/**
 * Message particles that travel edge to edge (one InstancedMesh, one draw
 * call), plus a single brighter "courier" that leads the camera on the tour.
 */
export function createParticles(graph, count, color) {
  const { edges, adj } = graph;
  const mesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.065, 10, 8),
    new THREE.MeshBasicMaterial({ color }),
    count,
  );
  mesh.frustumCulled = false;
  let seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const msgs = Array.from({ length: count }, () => ({
    e: Math.floor(rnd() * edges.length), dir: rnd() < 0.5, t: rnd(), sp: 0.25 + rnd() * 0.35,
  }));
  const dummy = new THREE.Object3D(), v = new THREE.Vector3();
  // where each message rests when they gather on one node: a small shell around it
  const shell = Array.from({ length: count }, (_, i) => {
    const y = 1 - ((i + 0.5) / count) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996;
    return new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(0.34 + (i % 3) * 0.06);
  });

  const courier = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 12),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 }),
  );
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.24, 0.3, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }),
  );
  courier.add(halo);

  /**
   * @param dt seconds
   * @param speed 0..1 global multiplier (intro ramp)
   * @param posOf (id) => {x,y,z} current node position
   * @param visOf (edgeIndex) => 0..1 visibility (focus * edge drawn)
   * @param gather {x,y,z} | null  node the messages gather on (closing motion)
   * @param gatherK 0..1  how far they have gathered
   */
  function update(dt, speed, posOf, visOf, gather = null, gatherK = 0) {
    for (let i = 0; i < mesh.count; i++) {  // only the instances the tier draws
      const m = msgs[i];
      m.t += dt * m.sp * speed;
      if (m.t >= 1) {
        const [a, b] = edges[m.e], at = m.dir ? b : a, opts = adj[at];
        m.e = opts[Math.floor(rnd() * opts.length)];
        m.dir = edges[m.e][0] === at;
        m.t = 0;
      }
      const [a, b] = edges[m.e], A = posOf(a), B = posOf(b);
      const from = m.dir ? A : B, to = m.dir ? B : A;
      v.set(from.x + (to.x - from.x) * m.t, from.y + (to.y - from.y) * m.t, from.z + (to.z - from.z) * m.t);
      if (gather && gatherK > 0) {
        // ease each message toward the gathering node, staggered by index so they arrive one by one
        const k = Math.min(1, Math.max(0, gatherK * 1.6 - (i / mesh.count) * 0.6));
        const sx = gather.x + shell[i].x, sy = gather.y + shell[i].y, sz = gather.z + shell[i].z;
        v.x += (sx - v.x) * k; v.y += (sy - v.y) * k; v.z += (sz - v.z) * k;
      }
      dummy.position.copy(v);
      const vis = gather && gatherK > 0.5 ? 1 : visOf(m.e);   // gathered messages stay visible
      dummy.scale.setScalar(vis * Math.min(1, Math.max(speed, gatherK) * 2) * (0.6 + 0.7 * Math.sin(m.t * Math.PI)));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function dispose() {
    mesh.geometry.dispose(); mesh.material.dispose(); mesh.dispose();
    courier.geometry.dispose(); courier.material.dispose();
    halo.geometry.dispose(); halo.material.dispose();
  }

  return { mesh, courier, halo, update, dispose };
}
