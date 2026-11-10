// Deterministic force-directed layout, ported from v1 with plain {x,y,z} maths
// so it runs in node (scripts/render-fallback.mjs writes the result to
// layout.json and the browser never runs this loop).

const add = (a, b) => { a.x += b.x; a.y += b.y; a.z += b.z; };
const len = (v) => Math.hypot(v.x, v.y, v.z);

export function makeRng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/**
 * Positions every node. Mutates node.p = {x,y,z}.
 * @param {{nodes:any[], edges:[string,string][], adj:Record<string,number[]>, byId:Record<string,any>}} graph
 */
export function layoutForce(graph, { seed = 7, iterations = 260 } = {}) {
  const { nodes, edges, adj, byId } = graph;
  const rnd = makeRng(seed);
  const pN = nodes.filter((n) => n.kind === "p");
  // projects on a Fibonacci sphere, as in v1
  pN.forEach((n, i) => {
    const y = 1 - ((i + 0.5) / pN.length) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996;
    n.p = { x: Math.cos(th) * r * 5.4, y: y * 4.2, z: Math.sin(th) * r * 5.4 };
  });
  // skills start near the centroid of their projects
  for (const n of nodes) {
    if (n.kind !== "s") continue;
    const c = { x: 0, y: 0, z: 0 };
    for (const ei of adj[n.id]) add(c, byId[edges[ei][0]].p);
    const k = 0.55 / adj[n.id].length;
    n.p = { x: c.x * k + rnd() - 0.5, y: c.y * k + rnd() - 0.5, z: c.z * k + rnd() - 0.5 };
  }
  const N = nodes.length;
  for (let it = 0; it < iterations; it++) {
    const f = nodes.map(() => ({ x: 0, y: 0, z: 0 }));
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const a = nodes[i].p, b = nodes[j].p;
      const d = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
      const L = Math.max(len(d), 0.3), l = len(d) || 1, m = 1.6 / (L * L) / l;
      d.x *= m; d.y *= m; d.z *= m;
      add(f[i], d); f[j].x -= d.x; f[j].y -= d.y; f[j].z -= d.z;
    }
    for (const [ia, ib] of edges) {
      const A = byId[ia], B = byId[ib];
      const d = { x: B.p.x - A.p.x, y: B.p.y - A.p.y, z: B.p.z - A.p.z };
      const L = len(d), m = ((L - 2.7) * 0.06) / (L || 1);
      d.x *= m; d.y *= m; d.z *= m;
      add(f[A.i], d); f[B.i].x -= d.x; f[B.i].y -= d.y; f[B.i].z -= d.z;
    }
    nodes.forEach((n, i) => {
      const fi = f[i];
      fi.x -= n.p.x * 0.012; fi.y -= n.p.y * 0.012; fi.z -= n.p.z * 0.012;
      const l = len(fi);
      if (l > 0.4) { fi.x *= 0.4 / l; fi.y *= 0.4 / l; fi.z *= 0.4 / l; }
      add(n.p, fi);
    });
  }
  const c = { x: 0, y: 0, z: 0 };
  for (const n of nodes) add(c, n.p);
  for (const n of nodes) { n.p.x -= c.x / N; n.p.y -= c.y / N; n.p.z -= c.z / N; }
  return graph;
}

/** Serialisable form: {id: [x,y,z]} rounded to 1e-4. */
export function toPositions(graph) {
  const out = {};
  for (const n of graph.nodes) out[n.id] = [n.p.x, n.p.y, n.p.z].map((v) => Math.round(v * 1e4) / 1e4);
  return out;
}

/** Applies positions from layout.json; nodes missing from it fall back to the origin. */
export function applyPositions(graph, positions) {
  for (const n of graph.nodes) {
    const p = positions[n.id] || [0, 0, 0];
    n.p = { x: p[0], y: p[1], z: p[2] };
  }
  return graph;
}
