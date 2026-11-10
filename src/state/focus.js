// Single owner of "what is the graph looking at". Several sources want a say
// (the open project dialog, a skill chip, the pinned tour, the section in
// view), so each one only sets its own layer and the highest set layer wins.

export const LAYERS = ["dialog", "chip", "tour", "section"]; // highest first

/**
 * A focus value is {ids: Set<string>|null, aimId?: string, shift?: [x, y]}.
 * ids null means "everything". shift falls through to the highest layer that has one.
 * @param {(v: {ids:Set<string>|null, aimId?:string, shift:[number,number]}) => void} apply
 */
export function createFocus(apply) {
  const layers = {};
  let last = null;
  function resolve() {
    let top = null, shift = [0, 0];
    for (const l of LAYERS) if (layers[l] !== undefined && !top) top = layers[l];
    for (const l of LAYERS) if (layers[l]?.shift) { shift = layers[l].shift; break; }
    return { ids: top ? top.ids ?? null : null, aimId: top?.aimId, shift };
  }
  function push() { last = resolve(); apply(last); }
  return {
    set(layer, value) { layers[layer] = value; push(); },
    release(layer) { if (layers[layer] !== undefined) { delete layers[layer]; push(); } },
    has(layer) { return layers[layer] !== undefined; },
    current: () => last ?? resolve(),
    refresh: push,
  };
}
