(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G || !G.V11) return;
  const s = G.state;
  const p = G.player;
  const ctx = G.ctx;
  const { TUNE, SUM } = G.V11;

  function worldTransform() {
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.translate(-G.camera.x, -G.camera.y);
  }

  function polygon(x, y, r, n, rot = -Math.PI / 2) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = rot + i * G.TAU / n;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function hollow(cx, cy, r, hue, alpha = .28) {
    ctx.save();
    const g = ctx.createRadialGradient(cx, cy, r * .25, cx, cy, r * 1.08);
    g.addColorStop(0, "rgba(1,3,8,.52)");
    g.addColorStop(.72, "rgba(2,4,10,.28)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, G.TAU); ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    ctx.setLineDash([3, 11]);
    ctx.lineDashOffset = -G.gameTime * 18;
    for (let i = 0; i < 3; i++) {
      const wobble = Math.sin(G.gameTime * 1.2 + i) * 4;
      ctx.strokeStyle = `hsla(${hue},88%,72%,${alpha / (i + 1)})`;
      ctx.lineWidth = i === 0 ? 1.8 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r + i * 13 + wobble, 0, G.TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawOriginReachLesson() {
    if (s.stage !== "origin_hub") return;
    const tune = s.originHub?.echoes?.find(e => e.id === "tune");
    if (!tune || tune.done) return;

    hollow(TUNE.x, TUNE.y, TUNE.hollowR, 248, .32);

    // Before the first range increase, make the harmless fieldlings read as
    // a family of things worth experimenting on without adding a waypoint.
    if (s.abilities?.pulse && !s.v11?.resonantReach) {
      const motes = s.originHub?.fieldMotes || [];
      motes.filter(m => !m.noticed).slice(0, 4).forEach((m, i) => {
        const x = m.x + Math.cos(G.gameTime * .7 + m.phase) * 18;
        const y = m.y + Math.sin(G.gameTime * .9 + m.phase) * 14;
        const pulse = .5 + .5 * Math.sin(G.gameTime * 2.2 + i);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = `rgba(135,226,255,${.12 + pulse * .13})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 9 + pulse * 5, 0, G.TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 16 + pulse * 8, 0, G.TAU); ctx.stroke();
        ctx.restore();
      });
    }

    // After Resonant Reach, the formerly unreachable note becomes the most
    // coherent object inside the hollow.
    if (s.v11?.resonantReach) {
      const pulse = .5 + .5 * Math.sin(G.gameTime * 2.4);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(215,205,255,${.15 + pulse * .18})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(TUNE.x, TUNE.y, 72 + pulse * 12, 0, G.TAU); ctx.stroke();
      ctx.restore();
    }
  }

  function drawSuperpositionTarget() {
    if (!s.v11 || s.v11.sumSolved || !G.hasMode?.(3)) return;
    if (!["basin","span","garden","exit","threshold","far_field"].includes(s.stage)) return;

    hollow(SUM.x, SUM.y, SUM.hollowR, 216, .26);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const pulse = .5 + .5 * Math.sin(G.gameTime * 1.8);
    const got2 = s.v11.sumModes?.has?.(2);
    const got3 = s.v11.sumModes?.has?.(3);

    ctx.strokeStyle = got2 ? "rgba(145,235,255,.78)" : `rgba(145,235,255,${.25 + pulse * .12})`;
    ctx.lineWidth = got2 ? 2 : 1.2;
    polygon(SUM.x - 18, SUM.y, 33, 2, Math.PI / 4);
    ctx.stroke();

    ctx.strokeStyle = got3 ? "rgba(204,211,255,.82)" : `rgba(204,211,255,${.25 + (1-pulse) * .12})`;
    ctx.lineWidth = got3 ? 2 : 1.2;
    polygon(SUM.x + 18, SUM.y, 38, 3);
    ctx.stroke();

    ctx.strokeStyle = "rgba(225,238,255,.18)";
    ctx.setLineDash([4, 8]);
    ctx.beginPath(); ctx.arc(SUM.x, SUM.y, 65, 0, G.TAU); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(235,246,255,.82)";
    ctx.font = "800 10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("2", SUM.x - 18, SUM.y + 4);
    ctx.fillText("3", SUM.x + 18, SUM.y + 4);
    ctx.restore();
  }

  function drawPulseTermination() {
    if (!Array.isArray(s.waves)) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    s.waves.forEach(w => {
      if (!w.maxR || w.r < w.maxR * .78) return;
      const t = G.clamp((w.r / w.maxR - .78) / .22, 0, 1);
      const hue = G.primeHue(w.prime);
      ctx.strokeStyle = `hsla(${hue},100%,82%,${(1-t) * .08 + t * .24})`;
      ctx.lineWidth = 1.2 + t * 2.8;
      ctx.shadowBlur = 10 + t * 18;
      ctx.shadowColor = `hsla(${hue},100%,72%,.5)`;
      ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, G.TAU); ctx.stroke();
      if (t > .82) {
        ctx.strokeStyle = `hsla(${hue},100%,90%,${(1-t) * .18})`;
        ctx.beginPath(); ctx.arc(w.x, w.y, w.maxR, 0, G.TAU); ctx.stroke();
      }
    });
    ctx.restore();
  }

  const baseDraw = G.draw;
  G.draw = () => {
    baseDraw();
    ctx.save();
    worldTransform();
    drawOriginReachLesson();
    drawSuperpositionTarget();
    drawPulseTermination();
    ctx.restore();
  };
})();