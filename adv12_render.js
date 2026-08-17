(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G || !G.V12) return;
  const s = G.state;
  const ctx = G.ctx;

  function worldTransform() {
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.translate(-G.camera.x, -G.camera.y);
  }

  function drawOpenRing(id, q) {
    const def = G.V12.DEFINITIONS[id];
    const t = def?.target?.();
    if (!t) return;

    const flash = s.v12?.flashes?.get?.(id);
    const flashAge = flash ? G.gameTime - flash.at : 999;
    const flashBoost = flashAge < 1.5 ? (1 - flashAge / 1.5) * (flash.strength || 1) : 0;
    if (q.resolved && flashBoost <= 0) return;

    const d = Math.hypot(G.player.x - t.x, G.player.y - t.y);
    const nearby = G.clamp(1 - (d - 260) / 780, 0, 1);
    if (!q.resolved && nearby <= 0 && !G.state.worldSense) return;

    const pulse = .5 + .5 * Math.sin(G.gameTime * 2.1 + id.length);
    const alpha = q.resolved
      ? .12 + flashBoost * .38
      : .07 + nearby * .11 + pulse * .045 + flashBoost * .28;
    const radius = 54 + pulse * 5 + flashBoost * 9;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(t.x, t.y);
    ctx.rotate(G.gameTime * .12 * (id.length % 2 ? 1 : -1));
    ctx.strokeStyle = q.resolved
      ? `rgba(185,239,255,${alpha})`
      : `rgba(222,202,255,${alpha})`;
    ctx.lineWidth = 1.2 + flashBoost * 1.8;
    ctx.shadowBlur = 10 + flashBoost * 24;
    ctx.shadowColor = q.resolved ? "rgba(133,229,255,.5)" : "rgba(202,164,255,.5)";

    if (q.resolved) {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, G.TAU);
      ctx.stroke();
    } else {
      const gap = .72;
      ctx.beginPath();
      ctx.arc(0, 0, radius, gap, G.TAU - gap * .35);
      ctx.stroke();
      const a = G.gameTime * .7;
      ctx.fillStyle = `rgba(240,226,255,${Math.min(.78, alpha * 3.1)})`;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * radius, Math.sin(a) * radius, 2.2 + flashBoost * 2, 0, G.TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  const baseDraw = G.draw;
  G.draw = () => {
    baseDraw();
    if (!s.v12?.questions?.length) return;
    ctx.save();
    worldTransform();
    s.v12.questions.forEach(q => drawOpenRing(q.id, q));
    ctx.restore();
  };
})();
