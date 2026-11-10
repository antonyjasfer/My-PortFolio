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

  const courier = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 12),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 }),
  );
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.24, 0.3, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  courier.add(halo);

  /**
   * @param dt seconds
   * @param speed 0..1 global multiplier (intro ramp)
   * @param posOf (id) => {x,y,z} current node position
   * @param visOf (edgeIndex) => 0..1 visibility (focus * edge drawn)
   */
  function update(dt, speed, posOf, visOf) {
    for (let i = 0; i < msgs.length; i++) {
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
      dummy.position.copy(v);
      dummy.scale.setScalar(visOf(m.e) * Math.min(1, speed * 2) * (0.6 + 0.7 * Math.sin(m.t * Math.PI)));
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
