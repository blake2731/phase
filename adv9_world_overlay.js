(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const p = G.player;
  const ctx = G.ctx;

  const baseArea = G.updateArea;
  G.updateArea = () => {
    baseArea();
    if (p.y > 1980 && !G.intro?.active) {
      if (s.area !== "DEEP FIELD") {
        s.area = "DEEP FIELD";
        G.el.areaName.textContent = s.area;
        if (!s.visitedAreas.has(s.area)) {
          s.visitedAreas.add(s.area);
          G.showMessage("DEEP FIELD", 900);
        }
      }
    }
  };

  const baseDraw = G.draw;
  G.draw = () => {
    baseDraw();
    if (p.y < 1680 && G.camera.y < 1200) return;
    ctx.save();
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.translate(-G.camera.x, -G.camera.y);
    G.drawTrail();
    G.drawWaves();
    G.drawBursts();
    G.drawSignal();
    G.drawPlayer();
    ctx.restore();
  };
})();