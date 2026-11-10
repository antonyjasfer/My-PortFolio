// Budget-coupled robust belief propagation on a small tree, for the research
// explorable. Mirrors the method in the research repo
// (antonyjasfer/Budget-Coupled-Robust-Belief-Propagation-for-Visual-Hallucination-Detection,
// src/robust_bp/solver.py) at toy scale:
//   binary attractive tree, fields θ_i + δ_i, couplings J ≥ 0,
//   messages f_J(x) = atanh(tanh J · tanh x), P(h_root = +1) = σ(2η),
//   adversary δ ∈ U = {|δ_i| ≤ ε_i, Σ|δ_i| ≤ B},
//   bounds by exact dynamic programming over a budget grid (max-plus for the
//   upper bound with δ ≥ 0, min-plus for the lower bound with δ ≤ 0).
// The parameters used on the page are illustrative, not fitted to data.

export const sigmoid = (x) => 1 / (1 + Math.exp(-x));
/** f_J(x) = atanh(tanh(J) tanh(x)), clamped away from ±1 for stability */
export const fJ = (J, x) => {
  const t = Math.tanh(J) * Math.tanh(x);
  return Math.atanh(Math.max(-0.999999, Math.min(0.999999, t)));
};

/**
 * A tree: nodes[0] is the root (the claim). Each other node has {theta, parent, J}
 * where J couples it to its parent. attackable: false keeps a node fixed.
 */
export function children(tree) {
  const ch = tree.nodes.map(() => []);
  tree.nodes.forEach((n, i) => { if (i > 0) ch[n.parent].push(i); });
  return ch;
}

/** Every message for a given δ: msgs[i] is node i's message to its parent; fields[i] its total field. */
export function messages(tree, delta = []) {
  const ch = children(tree), msgs = new Array(tree.nodes.length).fill(0), fields = new Array(tree.nodes.length).fill(0);
  const visit = (i) => {
    let s = tree.nodes[i].theta + (delta[i] || 0);
    for (const c of ch[i]) { visit(c); s += msgs[c]; }
    fields[i] = s;
    if (i > 0) msgs[i] = fJ(tree.nodes[i].J, s);
  };
  visit(0);
  return { msgs, fields };
}

export const rootField = (tree, delta = []) => messages(tree, delta).fields[0];
export const nominal = (tree) => sigmoid(2 * rootField(tree));

/**
 * Robust interval [lower, upper] for P(claim) over the uncertainty set.
 * @param {{eps:number, budget:number, units?:number}} o
 *   eps: per-node radius for attackable nodes; budget: total B (Infinity = uncoupled);
 *   units: grid steps per eps (the DP is exact on this grid).
 * @returns {{lower:number, upper:number, nominal:number, witnessLower:number[], witnessUpper:number[]}}
 */
export function robustInterval(tree, { eps, budget, units = 12 }) {
  const n = tree.nodes.length, ch = children(tree);
  const nom = nominal(tree);
  const attack = tree.nodes.map((nd, i) => i > 0 && nd.attackable !== false);
  const nAttack = attack.filter(Boolean).length;
  if (!(eps > 0) || !(budget > 0)) {
    return { lower: nom, upper: nom, nominal: nom, witnessLower: new Array(n).fill(0), witnessUpper: new Array(n).fill(0) };
  }
  const step = eps / units;
  // total budget in grid units, never more than every node at full radius
  const K = Math.min(Math.floor(budget / step + 1e-9), nAttack * units);

  function solve(sign) {               // +1: upper bound (max-plus), -1: lower bound (min-plus)
    const better = sign > 0 ? (a, b) => a > b : (a, b) => a < b;
    function node(i) {
      let acc = Array.from({ length: K + 1 }, (_, k) => (attack[i] ? sign * Math.min(k, units) * step : 0));
      const parts = [];                // per child: chosen child budget at each k
      for (const c of ch[i]) {
        const sub = node(c);
        const g = sub.F.map((x) => fJ(tree.nodes[c].J, x));
        const next = new Array(K + 1), arg = new Array(K + 1);
        for (let k = 0; k <= K; k++) {
          let best = acc[k] + g[0], bi = 0;
          for (let j = 1; j <= k; j++) {
            const v = acc[k - j] + g[j];
            if (better(v, best)) { best = v; bi = j; }
          }
          next[k] = best; arg[k] = bi;
        }
        acc = next; parts.push({ arg, sub });
      }
      const F = acc.map((v) => tree.nodes[i].theta + v);
      const alloc = (k, out) => {      // witness: how the optimal δ spends k units
        for (let p = parts.length - 1; p >= 0; p--) {
          const kc = parts[p].arg[k];
          parts[p].sub.alloc(kc, out);
          k -= kc;
        }
        out[i] = attack[i] ? sign * Math.min(k, units) * step : 0;
      };
      return { F, alloc };
    }
    const root = node(0);
    const witness = new Array(n).fill(0);
    root.alloc(K, witness);
    return { p: sigmoid(2 * root.F[K]), witness };
  }

  const up = solve(+1), lo = solve(-1);
  return { lower: lo.p, upper: up.p, nominal: nom, witnessLower: lo.witness, witnessUpper: up.witness };
}

/**
 * The tree on the page: a claim fed by two kinds of visual evidence, each with
 * two observations. Illustrative numbers, not fitted to data. Only the
 * observations (leaves) can be corrupted. The claim and the two aggregating
 * nodes are held fixed: by the root-dominance result in the research repo, a
 * budget is otherwise spent on the nodes closest to the claim, which would
 * hide how corrupted evidence travels up the tree.
 */
export const DEMO_TREE = {
  nodes: [
    { id: "claim", label: "Claim: there is a dog", theta: 0.25, attackable: false },
    { id: "det", label: "Object detector", theta: 0.15, parent: 0, J: 0.9, attackable: false },
    { id: "sim", label: "Image-text match", theta: 0.1, parent: 0, J: 0.7, attackable: false },
    { id: "d1", label: "Box 1", theta: 0.9, parent: 1, J: 0.8 },
    { id: "d2", label: "Box 2", theta: 0.7, parent: 1, J: 0.8 },
    { id: "s1", label: "Region 1", theta: 0.6, parent: 2, J: 0.8 },
    { id: "s2", label: "Region 2", theta: -0.2, parent: 2, J: 0.8 },
  ],
};

/** Coupled: one shared budget of COUPLED_FACTOR × ε for the whole tree. Uncoupled: every node may use its full ε. */
export const COUPLED_FACTOR = 2;
export const budgetFor = (eps, coupled) => (coupled ? COUPLED_FACTOR * eps : Infinity);
