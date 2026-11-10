// Same API as createScene() with no behaviour. Used before three.js has
// loaded, and permanently when WebGL is unavailable or the context is lost,
// so motion code never has to null-check the scene.
export function createNullScene() {
  const noop = () => {};
  return {
    isNull: true,
    ready: Promise.resolve(),
    setFocus: noop, setSettle: noop, setAssembly: noop, setSpeed: noop, setTour: noop, setShift: noop,
    resize: noop, render: noop, invalidate: noop, warmSteps: () => [], stepDown: () => false,
    needsFrame: () => false, idleFps: 0, tier: "none", assembled: true,
    onPick: () => noop, onLost: () => noop, dispose: noop,
  };
}
