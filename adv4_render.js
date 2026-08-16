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
    drawOrigin();
  };

  function drawOrigin() {
    const intro = G.intro;
    if (!intro || (!intro.active && !s.prologueComplete)) return;

    const origin = intro.origin;
    const lights = intro.homeLights || [];
    const broken = Boolean(origin.broken);
    const t = G.gameTime;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const aura = ctx.createRadialGradient(origin.x, origin.y, 12, origin.x, origin.y, 250);
    aura.addColorStop(0, broken ? "rgba(160,205,255,0.12)" : "rgba(255,222,151,0.12)");
    aura.addColorStop(0.45, broken ? "rgba(100,180,230,0.045)" : "rgba(145,220,255,0.045)");
    aura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 250, 0, G.TAU);
    ctx.fill();

    ctx.translate(origin.x, origin.y);
    ctx.strokeStyle = broken ? "rgba(155,205,235,0.34)" : "rgba(255,224,165,0.48)";
    ctx.shadowBlur = broken ? 10 : 22;
    ctx.shadowColor = broken ? "rgba(100,190,245,0.35)" : "rgba(255,210,130,0.5)";
    ctx.lineWidth = 1.5;

    const pulse = 1 + Math.sin(t * 1.2) * 0.035 + (origin.pulse || 0) * 0.03;
    for (let ring = 0; ring < 3; ring++) {
      const r = (35 + ring * 18) * pulse;
      ctx.save();
      ctx.rotate((ring % 2 ? -1 : 1) * t * (0.05 + ring * 0.018));
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const a = Math.PI / 4 + i * G.TAU / 4;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = broken ? "rgba(180,220,245,0.72)" : "rgba(255,239,204,0.92)";
    ctx.beginPath();
    ctx.arc(0, 0, 5.5 + Math.sin(t * 2) * 0.8, 0, G.TAU);
    ctx.fill();
    ctx.restore();

    lights.forEach((light, index) => {
      ctx.save();
      ctx.translate(light.x, light.y);
      const active = light.active && !light.broken;
      const hue = active ? 42 + index * 13 : 198;
      const alpha = light.broken ? 0.12 : active ? 0.72 : 0.24;
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "hsla(" + hue + ",92%,76%," + alpha + ")";
      ctx.fillStyle = "hsla(" + hue + ",92%,80%," + (alpha * 0.85) + ")";
      ctx.shadowBlur = active ? 18 : 7;
      ctx.shadowColor = "hsla(" + hue + ",92%,70%,0.48)";
      ctx.rotate(t * 0.16 + light.phase);
      ctx.beginPath();
      ctx.arc(0, 0, 12 + Math.sin(t * 1.8 + index) * 1.5, 0, G.TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-17, 0);
      ctx.lineTo(17, 0);
      ctx.moveTo(0, -17);
      ctx.lineTo(0, 17);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, active ? 3.5 : 2.2, 0, G.TAU);
      ctx.fill();
      if (light.broken) {
        ctx.strokeStyle = "rgba(220,225,235,0.24)";
        ctx.beginPath();
        ctx.moveTo(-10, -12);
        ctx.lineTo(9, 11);
        ctx.stroke();
      }
      ctx.restore();
    });

    if (lights.length) {
      ctx.save();
      ctx.strokeStyle = broken ? "rgba(135,195,225,0.08)" : "rgba(255,222,166,0.095)";
      ctx.setLineDash([4, 13]);
      ctx.beginPath();
      lights.forEach((light, index) => {
        if (index === 0) ctx.moveTo(light.x, light.y);
        else ctx.lineTo(light.x, light.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    if (intro.breakAge < 2.4) {
      const progress = intro.breakAge / 2.4;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(206,166,255," + (1 - progress) * 0.45 + ")";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, 70 + progress * 560, 0, G.TAU);
      ctx.stroke();
      ctx.strokeStyle = "rgba(125,215,255," + (1 - progress) * 0.24 + ")";
      ctx.beginPath();
      ctx.moveTo(origin.x + 65, origin.y);
      ctx.bezierCurveTo(origin.x + 210, origin.y - 80, origin.x + 420, origin.y + 95, origin.x + 650, origin.y - 140);
      ctx.stroke();
      ctx.restore();
    }
  }

  const baseDraw = G.draw;
  G.draw = () => {
    baseDraw();
    drawPrologueOverlay();
  };

  function drawPrologueOverlay() {
    const intro = G.intro;
    if (!intro || !intro.active) return;

    const sx = p.x - G.camera.x;
    const sy = p.y - G.camera.y;
    const radiusByPhase = {
      wake: 270,
      home: 520,
      return: 650,
      answer: 720,
      break: 850,
      signal: 1100
    };
    const radius = radiusByPhase[intro.phase] || 650;

    ctx.save();
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    const veil = ctx.createRadialGradient(sx, sy, radius * 0.35, sx, sy, radius);
    veil.addColorStop(0, "rgba(2,4,10,0)");
    veil.addColorStop(0.62, "rgba(2,4,10,0.12)");
    veil.addColorStop(1, "rgba(1,3,8,0.97)");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, G.screenW, G.screenH);

    if (intro.phase === "wake" || (intro.phase === "home" && intro.phaseTime < 2.5)) {
      const alpha = intro.phase === "wake" ? Math.min(0.75, intro.phaseTime * 0.35) : Math.max(0, 0.75 - intro.phaseTime * 0.3);
      ctx.fillStyle = "rgba(214,244,255," + alpha + ")";
      ctx.font = "800 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText("P", sx, sy - 34);
    }
    ctx.restore();
  }
})();