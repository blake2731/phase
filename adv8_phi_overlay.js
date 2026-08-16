(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G || !G.V8) return;
  const s = G.state;
  const ctx = G.ctx;
  const { leftEdge, rightEdge, topEdge, bottomEdge } = G.V8;

  function phiOutside() {
    const x = s.signal.x;
    const y = s.signal.y;
    return x < leftEdge(y) || x > rightEdge(y) || y < topEdge(x) || y > bottomEdge(x);
  }

  const baseDraw = G.draw;
  G.draw = () => {
    baseDraw();
    if (!s.signal.visible || !phiOutside()) return;
    ctx.save();
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.translate(-G.camera.x, -G.camera.y);
    G.drawSignal();
    ctx.restore();
  };
})();