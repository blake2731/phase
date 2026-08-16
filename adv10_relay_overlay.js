(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const ctx = G.ctx;
  const s = G.state;
  const X = 5200, Y = 1000;

  function polygon(r, n, rot = -Math.PI / 2) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = rot + i * G.TAU / n;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  const baseDraw = G.draw;
  G.draw = () => {
    baseDraw();
    if (!s.thresholdStarted || G.camera.x + G.screenW < X - 180) return;
    ctx.save();
    ctx.setTransform(G.dpr,0,0,G.dpr,0,0);
    ctx.translate(X - G.camera.x, Y - G.camera.y);
    ctx.globalCompositeOperation = "lighter";
    const pulse = .5 + .5 * Math.sin(G.gameTime * 2);
    ctx.shadowBlur = 22;
    ctx.shadowColor = "rgba(197,170,255,.48)";
    ctx.strokeStyle = `rgba(216,198,255,${.48 + pulse * .16})`;
    ctx.lineWidth = 1.6;
    ctx.save(); ctx.rotate(G.gameTime * .08); polygon(58,5); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.rotate(-G.gameTime * .13); polygon(34,5,Math.PI/2); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = "rgba(145,226,255,.45)";
    ctx.beginPath(); ctx.arc(0,0,9 + pulse * 3,0,G.TAU); ctx.stroke();
    if (s.v10?.farFieldStarted) {
      ctx.strokeStyle = "rgba(185,185,255,.24)";
      ctx.setLineDash([3,10]);
      ctx.beginPath(); ctx.moveTo(64,0); ctx.lineTo(180,0); ctx.stroke();
    }
    ctx.restore();
  };
})();