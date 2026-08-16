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
    drawPrologueGuidance();
  };

  function worldDot(x, y, radius, fill, blur = 0, shadow = fill) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = fill;
    if (blur) {
      ctx.shadowBlur = blur;
      ctx.shadowColor = shadow;
    }
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, G.TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawFlowDots(ax, ay, bx, by, alpha, offset = 0, count = 8) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < count; i++) {
      const t = ((i / count) + offset) % 1;
      const eased = t * t * (3 - 2 * t);
      const x = ax + (bx - ax) * eased;
      const y = ay + (by - ay) * eased;
      worldDot(x, y, 1.7 + t * 0.9, "rgba(220,239,255," + alpha * (0.35 + t * 0.65) + ")", 8);
    }
    ctx.restore();
  }

  function drawOrigin() {
    const intro = G.intro;
    if (!intro || (!intro.active && !s.prologueComplete)) return;

    const origin = intro.origin;
    const lights = intro.homeLights || [];
    const broken = Boolean(origin.broken);
    const t = G.gameTime;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const auraRadius = intro.active && intro.phase === "return" ? 330 : 250;
    const aura = ctx.createRadialGradient(origin.x, origin.y, 12, origin.x, origin.y, auraRadius);
    aura.addColorStop(0, broken ? "rgba(160,205,255,0.13)" : "rgba(255,222,151,0.16)");
    aura.addColorStop(0.45, broken ? "rgba(100,180,230,0.045)" : "rgba(145,220,255,0.055)");
    aura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, auraRadius, 0, G.TAU);
    ctx.fill();

    ctx.translate(origin.x, origin.y);
    ctx.strokeStyle = broken ? "rgba(155,205,235,0.34)" : "rgba(255,224,165,0.56)";
    ctx.shadowBlur = broken ? 10 : intro.active && intro.phase === "return" ? 34 : 22;
    ctx.shadowColor = broken ? "rgba(100,190,245,0.35)" : "rgba(255,210,130,0.58)";
    ctx.lineWidth = intro.active && intro.phase === "return" ? 2.1 : 1.5;

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

    ctx.fillStyle = broken ? "rgba(180,220,245,0.72)" : "rgba(255,239,204,0.96)";
    ctx.beginPath();
    ctx.arc(0, 0, 5.5 + Math.sin(t * 2) * 0.8, 0, G.TAU);
    ctx.fill();
    ctx.restore();

    lights.forEach((light, index) => {
      ctx.save();
      ctx.translate(light.x, light.y);
      const active = light.active && !light.broken;
      const hue = active ? 42 + index * 13 : light.broken ? 286 : 198;
      const nextLight = intro.active && intro.phase === "home" && !active && !light.broken && lights.find(item => !item.active && !item.broken) === light;
      const attention = nextLight ? 0.34 + 0.24 * (0.5 + 0.5 * Math.sin(t * 3.4)) : 0;
      const alpha = light.broken ? 0.34 : active ? 0.78 : 0.22 + attention;
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "hsla(" + hue + ",92%,76%," + alpha + ")";
      ctx.fillStyle = "hsla(" + hue + ",92%,80%," + (alpha * 0.9) + ")";
      ctx.shadowBlur = nextLight ? 28 : active ? 18 : 7;
      ctx.shadowColor = "hsla(" + hue + ",92%,70%,0.58)";
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
      ctx.arc(0, 0, active ? 3.5 : nextLight ? 3 : 2.2, 0, G.TAU);
      ctx.fill();
      if (nextLight) {
        ctx.strokeStyle = "rgba(255,238,194,0.32)";
        ctx.beginPath();
        ctx.arc(0, 0, 26 + Math.sin(t * 3.4) * 5, 0, G.TAU);
        ctx.stroke();
      }
      if (light.broken) {
        ctx.strokeStyle = "rgba(226,190,255,0.52)";
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(-11, -14);
        ctx.lineTo(10, 13);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 29 + Math.sin(t * 2.2) * 4, 0, G.TAU);
        ctx.stroke();
      }
      ctx.restore();

      const activationAge = G.gameTime - (light.activatedAt ?? -999);
      if (activationAge >= 0 && activationAge < 1.25) {
        drawFlowDots(light.x, light.y, origin.x, origin.y, 0.62 * (1 - activationAge / 1.25), activationAge * 0.8, 11);
      }
    });

    if (lights.length) {
      ctx.save();
      ctx.strokeStyle = broken ? "rgba(135,195,225,0.07)" : "rgba(255,222,166,0.12)";
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

    if (intro.active && intro.phase === "return") {
      lights.filter(light => light.active).forEach((light, index) => {
        drawFlowDots(light.x, light.y, origin.x, origin.y, 0.42, (t * 0.42 + index * 0.17) % 1, 7);
      });
      ctx.save();
      ctx.strokeStyle = "rgba(255,228,176,0.18)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, 90 + Math.sin(t * 2.4) * 10, 0, G.TAU);
      ctx.stroke();
      ctx.restore();
    }

    if (intro.breakAge < 2.8) {
      const progress = intro.breakAge / 2.8;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(206,166,255," + (1 - progress) * 0.55 + ")";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, 70 + progress * 650, 0, G.TAU);
      ctx.stroke();
      ctx.strokeStyle = "rgba(225,177,255," + (1 - progress) * 0.36 + ")";
      ctx.beginPath();
      ctx.moveTo(origin.x + 65, origin.y);
      ctx.bezierCurveTo(origin.x + 230, origin.y - 110, origin.x + 430, origin.y + 70, origin.x + 720, origin.y - 145);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawPrologueGuidance() {
    const intro = G.intro;
    if (!intro || !intro.active) return;
    const t = G.gameTime;

    if (intro.phase === "home") {
      const target = intro.homeLights.find(light => !light.active && !light.broken);
      if (target && p.stillTime > 0.65) {
        drawFlowDots(p.x, p.y, target.x, target.y, Math.min(0.36, (p.stillTime - 0.65) * 0.16), (t * 0.24) % 1, 7);
      }
    }

    if (intro.phase === "signal" || intro.phase === "depart") {
      const sig = s.signal;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(218,181,255,0.18)";
      ctx.setLineDash([3, 12]);
      ctx.beginPath();
      ctx.moveTo(intro.origin.x + 170, intro.origin.y - 184);
      ctx.quadraticCurveTo((intro.origin.x + sig.x) / 2, intro.origin.y - 260, sig.x, sig.y);
      ctx.stroke();
      ctx.restore();

      if (intro.phase === "depart") {
        drawFlowDots(sig.x, sig.y, 1180, 740, 0.32, (t * 0.32) % 1, 9);
      }
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

    let focusWorldX = p.x;
    let focusWorldY = p.y;
    if (intro.phase === "return" || intro.phase === "answer" || intro.phase === "break") {
      focusWorldX = intro.origin.x;
      focusWorldY = intro.origin.y;
    }
    if (intro.phase === "signal" || intro.phase === "depart") {
      focusWorldX = s.signal.x;
      focusWorldY = s.signal.y;
    }

    const sx = focusWorldX - G.camera.x;
    const sy = focusWorldY - G.camera.y;
    const radiusByPhase = {
      wake: 320,
      home: 610,
      return: 720,
      answer: 760,
      break: 820,
      signal: 760,
      depart: 980
    };
    const radius = radiusByPhase[intro.phase] || 680;

    ctx.save();
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    const veil = ctx.createRadialGradient(sx, sy, radius * 0.34, sx, sy, radius);
    veil.addColorStop(0, "rgba(2,4,10,0)");
    veil.addColorStop(0.58, "rgba(2,4,10,0.1)");
    veil.addColorStop(1, "rgba(1,3,8,0.965)");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, G.screenW, G.screenH);

    if (intro.phase === "wake") {
      const px = p.x - G.camera.x;
      const py = p.y - G.camera.y;
      const alpha = Math.min(0.82, intro.phaseTime * 0.48);
      ctx.fillStyle = "rgba(226,247,255," + alpha + ")";
      ctx.font = "900 14px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText("P", px, py - 36);
    }
    ctx.restore();
  }
})();