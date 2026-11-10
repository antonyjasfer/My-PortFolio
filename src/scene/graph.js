// Pure graph model: one node per project ("p") and per skill ("s"),
// one edge per project-skill pair. Ported from v1 (legacy/index.html).

/**
 * @param {{id:string,t:string,k:string[]}[]} projects
 * @returns {{nodes:{id:string,kind:"p"|"s",label:string,i:number}[], edges:[string,string][],
 *            adj:Record<string,number[]>, byId:Record<string,object>}}
 */
export function buildGraph(projects) {
  const nodes = [], byId = {}, edges = [];
  for (const p of projects) {
    const n = { id: p.id, kind: "p", label: p.t };
    nodes.push(n); byId[p.id] = n;
  }
  for (const p of projects) {
    for (const k of p.k) {
      const id = skillId(k);
      if (!byId[id]) { const n = { id, kind: "s", label: k }; nodes.push(n); byId[id] = n; }
      edges.push([p.id, id]);
    }
  }
  nodes.forEach((n, i) => (n.i = i));
  const adj = {};
  for (const n of nodes) adj[n.id] = [];
  edges.forEach(([a, b], i) => { adj[a].push(i); adj[b].push(i); });
  return { nodes, edges, adj, byId };
}

export const skillId = (name) => "s:" + name;

/** ids of the node and its direct neighbours */
export function neighbourhood(graph, id) {
  const s = new Set([id]);
  for (const ei of graph.adj[id] || []) { const [a, b] = graph.edges[ei]; s.add(a === id ? b : a); }
  return s;
}
