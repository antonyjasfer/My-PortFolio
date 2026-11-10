// Same API as createScene() with no behaviour. Used before three.js has
// loaded, and permanently when WebGL is unavailable or the context is lost,
// so motion code never has to null-check the scene.
export function createNullScene() {
  const noop = () => {};
  return {
    isNull: true,
    setFocus: noop, setAssembly: noop, setSpeed: noop, setTour: noop, setShift: noop,
    resize: noop, render: noop, invalidate: noop, warm: noop,
    onPick: () => noop, onLost: () => noop, dispose: noop,
  };
}
