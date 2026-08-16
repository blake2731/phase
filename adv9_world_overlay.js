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

  function drawInvitations() {
    const anchors = [900, 2550, 3560];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    anchors.forEach((x, i) => {
      const alpha = 0.045 + 0.025 * Math.sin(G.gameTime * 1.2 + i);
      ctx.strokeStyle = `rgba(119, 216, 244, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 13]);
      ctx.lineDashOffset = -G.gameTime * (14 + i * 3);
      ctx.beginPath();
      ctx.moveTo(x, 1540);
      ctx.bezierCurveTo(x + (i - 1) * 80, 1750, x - (i - 1) * 110, 1940, x, 2140);
      ctx.stroke();
      const glow = ctx.createRadialGradient(x, 2140, 2, x, 2140, 70);
      glow.addColorStop(0, "rgba(135,225,255,0.10)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, 2140, 70, 0, G.TAU); ctx.fill();
    });
    ctx.restore();
  }

  const baseDraw = G.draw;
  G.draw = () => {
    baseDraw();
    ctx.save();
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.translate(-G.camera.x, -G.camera.y);
    drawInvitations();
    if (p.y >= 1680 || G.camera.y >= 1200) {
      G.drawTrail();
      G.drawWaves();
      G.drawBursts();
      G.drawSignal();
      G.drawPlayer();
    }
    ctx.restore();
  };
})();