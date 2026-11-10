// Shortest path between two nodes over graph edges (BFS). The pinned project
// tour uses it so the camera travels project -> shared skill -> project.

/** @returns {string[] | null} node ids from `from` to `to` inclusive, or null if unreachable */
export function routeBetween(graph, from, to) {
  if (!graph.byId[from] || !graph.byId[to]) return null;
  if (from === to) return [from];
  const prev = { [from]: null }, queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    for (const ei of graph.adj[cur]) {
      const [a, b] = graph.edges[ei], nxt = a === cur ? b : a;
      if (nxt in prev) continue;
      prev[nxt] = cur;
      if (nxt === to) {
        const path = [to];
        for (let p = cur; p !== null; p = prev[p]) path.unshift(p);
        return path;
      }
      queue.push(nxt);
    }
  }
  return null;
}
