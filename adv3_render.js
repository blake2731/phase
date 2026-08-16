(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const p = G.player;
  const ctx = G.ctx;

  const baseDrawWorldBase = G.drawWorldBase;
  G.drawWorldBase = () => {
    baseDrawWorldBase();
    drawThreshold();
  };

  function drawThreshold() {
    if (!s.thresholdStarted && p.x < 3920) return;

    ctx.save();
    const left = 4140;
    const sourceX = 5200;
    const sourceY = 1000;

    G.zoneGlow(4680, 1000, 760, 318, 0.04);

    const gradient = ctx.createLinearGradient(left, 0, 4860, 0);
    gradient.addColorStop(0, "rgba(190,155,255,0.015)");
    gradient.addColorStop(0.48, "rgba(125,190,255,0.07)");
    gradient.addColorStop(1, "rgba(190,155,255,0.02)");
    ctx.fillStyle = gradient;
    ctx.fillRect(left, 170, 760, 1660);

    for (let x = 4210; x < 4850; x += 46) {
      const strength = G.clamp((x - 4210) / 520, 0, 1);
      const sway = Math.sin(G.gameTime * 1.2 + x * 0.013) * 22;
      ctx.strokeStyle = "rgba(163,205,255," + (0.035 + strength * 0.075) + ")";
      ctx.lineWidth = 1 + strength * 0.7;
      ctx.beginPath();
      for (let y = 260; y <= 1740; y += 70) {
        const px = x + Math.sin(y * 0.012 + G.gameTime) * 13 + sway;
        if (y === 260) ctx.moveTo(px, y);
        else ctx.lineTo(px - 30 - strength * 26, y);
      }
      ctx.stroke();
    }

    if (!G.hasBonus || !G.hasBonus("vector_step")) {
      ctx.strokeStyle = "rgba(213,174,255,0.17)";
      ctx.setLineDash([3, 10]);
      ctx.beginPath();
      ctx.moveTo(4470, 300);
      ctx.lineTo(4470, 1700);
      ctx.stroke();
    }

    if (s.thresholdCrossed) {
      ctx.strokeStyle = "rgba(126,231,255,0.13)";
      ctx.setLineDash([10, 14]);
      ctx.beginPath();
      ctx.moveTo(4580, 1000);
      ctx.lineTo(sourceX - 80, sourceY);
      ctx.stroke();
    }

    ctx.translate(sourceX, sourceY);
    const pulse = 1 + Math.sin(G.gameTime * 1.7) * 0.06;
    ctx.rotate(G.gameTime * 0.08);
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = 26;
    ctx.shadowColor = "rgba(208,170,255,0.55)";
    ctx.strokeStyle = "rgba(220,201,255,0.52)";
    ctx.lineWidth = 1.4;

    for (let ring = 0; ring < 3; ring++) {
      const r = (34 + ring * 18) * pulse;
      ctx.save();
      ctx.rotate((ring % 2 ? -1 : 1) * G.gameTime * 0.06);
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) {
        const a = i / 5 * G.TAU;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = "rgba(140,226,255,0.34)";
    ctx.beginPath();
    ctx.arc(0, 0, 8 + Math.sin(G.gameTime * 2.2) * 2, 0, G.TAU);
    ctx.stroke();
    ctx.restore();
  }
})();
