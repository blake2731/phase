(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G || !G.V8) return;
  const s = G.state;
  const p = G.player;
  const ctx = G.ctx;
  const { KEY, GATE, leftEdge, rightEdge, topEdge, bottomEdge } = G.V8;

  function worldTransform() {
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.translate(-G.camera.x, -G.camera.y);
  }

  function polygon(x, y, r, n, rotation = 0) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = rotation + i * G.TAU / n;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function maskOutsideField() {
    ctx.save();
    ctx.fillStyle = "rgba(1, 3, 8, 0.88)";

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(G.WORLD.width, 0);
    for (let x = G.WORLD.width; x >= 0; x -= 72) ctx.lineTo(x, topEdge(x));
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, G.WORLD.height);
    ctx.lineTo(G.WORLD.width, G.WORLD.height);
    for (let x = G.WORLD.width; x >= 0; x -= 72) ctx.lineTo(x, bottomEdge(x));
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let y = 0; y <= G.WORLD.height; y += 60) ctx.lineTo(leftEdge(y), y);
    ctx.lineTo(0, G.WORLD.height);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(G.WORLD.width, 0);
    for (let y = 0; y <= G.WORLD.height; y += 60) ctx.lineTo(rightEdge(y), y);
    ctx.lineTo(G.WORLD.width, G.WORLD.height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawHorizontalContour(fn, hue, offset, alpha) {
    ctx.strokeStyle = `hsla(${hue}, 80%, 70%, ${alpha})`;
    ctx.lineWidth = offset === 0 ? 1.8 : 1;
    ctx.setLineDash(offset === 0 ? [2, 8] : [2, 13]);
    ctx.lineDashOffset = -G.gameTime * (offset === 0 ? 18 : 9);
    ctx.beginPath();
    for (let x = 0; x <= G.WORLD.width; x += 34) {
      const y = fn(x) + offset;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function drawVerticalContour(fn, hue, offset, alpha) {
    ctx.strokeStyle = `hsla(${hue}, 80%, 70%, ${alpha})`;
    ctx.lineWidth = offset === 0 ? 1.8 : 1;
    ctx.setLineDash(offset === 0 ? [2, 8] : [2, 13]);
    ctx.lineDashOffset = G.gameTime * (offset === 0 ? 18 : 9);
    ctx.beginPath();
    for (let y = 0; y <= G.WORLD.height; y += 30) {
      const x = fn(y) + offset;
      if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function drawCoherenceEdges() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawHorizontalContour(topEdge, 196, 0, 0.34);
    drawHorizontalContour(topEdge, 196, 14, 0.10);
    drawHorizontalContour(bottomEdge, 196, 0, 0.34);
    drawHorizontalContour(bottomEdge, 196, -14, 0.10);
    drawVerticalContour(leftEdge, 196, 0, 0.42);
    drawVerticalContour(leftEdge, 196, 14, 0.12);
    drawVerticalContour(rightEdge, 196, 0, 0.34);
    drawVerticalContour(rightEdge, 196, -14, 0.10);

    for (let i = 0; i < 34; i++) {
      const y = 120 + ((i * 173 + G.gameTime * 22) % 1760);
      const x = leftEdge(y) - 20 - (i % 4) * 13;
      const a = 0.05 + (i % 3) * 0.025;
      ctx.fillStyle = `rgba(135, 211, 242, ${a})`;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.restore();
  }

  function drawLatticeCore() {
    if (!s.v8 || s.v8.keyRetrieved) return;
    const t = G.gameTime;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const aura = ctx.createRadialGradient(KEY.x, KEY.y, 4, KEY.x, KEY.y, 95);
    aura.addColorStop(0, "rgba(255, 222, 142, 0.20)");
    aura.addColorStop(0.48, "rgba(218, 168, 255, 0.08)");
    aura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(KEY.x, KEY.y, 95, 0, G.TAU); ctx.fill();

    ctx.translate(KEY.x, KEY.y);
    ctx.rotate(t * 0.18);
    ctx.shadowBlur = 24;
    ctx.shadowColor = "rgba(255, 208, 120, 0.65)";
    ctx.strokeStyle = "rgba(255, 229, 169, 0.88)";
    ctx.lineWidth = 2;
    polygon(0, 0, 24 + Math.sin(t * 1.8) * 2, 5, -Math.PI / 2);
    ctx.stroke();
    ctx.rotate(-t * 0.42);
    ctx.strokeStyle = "rgba(222, 180, 255, 0.72)";
    polygon(0, 0, 14, 5, -Math.PI / 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 247, 220, 0.94)";
    ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, G.TAU); ctx.fill();
    ctx.restore();

    if (Math.hypot(p.x - KEY.x, p.y - KEY.y) < 330 && !s.phiRepaired) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 225, 168, 0.62)";
      ctx.font = "800 9px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.fillText("BEYOND P'S COHERENCE", KEY.x + 42, KEY.y - 5);
      ctx.restore();
    }
  }

  function drawCarriedCore() {
    if (!s.v8?.keyWithPhi || !s.v8.keyRetrieved) return;
    const x = s.signal.x + Math.cos(G.gameTime * 2.2) * 24;
    const y = s.signal.y - 29 + Math.sin(G.gameTime * 2.2) * 8;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(x, y);
    ctx.rotate(G.gameTime * 0.35);
    ctx.shadowBlur = 18;
    ctx.shadowColor = "rgba(255, 211, 133, 0.65)";
    ctx.strokeStyle = "rgba(255, 232, 175, 0.86)";
    polygon(0, 0, 11, 5, -Math.PI / 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawLatticeGate() {
    if (!s.v8) return;
    const open = s.v8.keyInstalled;
    const top = topEdge(GATE.x) + 26;
    const bottom = bottomEdge(GATE.x) - 26;
    const gapTop = 825;
    const gapBottom = 1175;
    const pulse = 0.5 + 0.5 * Math.sin(G.gameTime * 2);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = open ? 1.4 : 2.1;
    ctx.strokeStyle = open ? "rgba(146, 225, 255, 0.18)" : "rgba(206, 184, 255, 0.44)";
    ctx.setLineDash(open ? [9, 15] : [3, 8]);
    ctx.lineDashOffset = -G.gameTime * 18;

    ctx.beginPath();
    ctx.moveTo(GATE.x, top);
    ctx.lineTo(GATE.x, open ? gapTop : bottom);
    if (open) { ctx.moveTo(GATE.x, gapBottom); ctx.lineTo(GATE.x, bottom); }
    ctx.stroke();

    for (let y = top + 55; y < bottom; y += 92) {
      if (open && y > gapTop - 35 && y < gapBottom + 35) continue;
      const reach = 24 + Math.sin(y * 0.017 + G.gameTime) * 9;
      ctx.strokeStyle = open ? "rgba(112, 213, 244, 0.08)" : "rgba(188, 163, 255, 0.18)";
      ctx.beginPath();
      ctx.moveTo(GATE.x - reach, y);
      ctx.lineTo(GATE.x + reach, y + 8);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.translate(GATE.x, GATE.y);
    ctx.rotate(G.gameTime * 0.12);
    ctx.shadowBlur = open ? 22 : 14;
    ctx.shadowColor = open ? "rgba(116, 226, 255, 0.5)" : "rgba(205, 171, 255, 0.5)";
    ctx.strokeStyle = open ? "rgba(180, 241, 255, 0.84)" : "rgba(223, 201, 255, 0.68)";
    ctx.lineWidth = 1.8;
    polygon(0, 0, 39 + pulse * 3, 5, -Math.PI / 2);
    ctx.stroke();
    ctx.rotate(-G.gameTime * 0.28);
    ctx.strokeStyle = open ? "rgba(255, 231, 172, 0.78)" : "rgba(185, 177, 220, 0.30)";
    polygon(0, 0, 18, 5, -Math.PI / 2);
    ctx.stroke();
    if (!open) {
      ctx.fillStyle = "rgba(222, 205, 245, 0.54)";
      ctx.font = "800 13px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("∅", 0, 1);
    }
    ctx.restore();
  }

  const baseDrawBoundary = G.drawBoundary;
  G.drawBoundary = (x, open) => {
    if (Math.abs(x - 1900) > 1) { baseDrawBoundary(x, open); return; }
    const top = topEdge(x) + 20;
    const bottom = bottomEdge(x) - 20;
    ctx.save();
    ctx.strokeStyle = open ? "rgba(110,230,255,0.08)" : "rgba(145,210,245,0.34)";
    ctx.lineWidth = open ? 1 : 2;
    ctx.setLineDash(open ? [6,20] : [2,8]);
    ctx.lineDashOffset = -G.gameTime * 12;
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
    if (!open) {
      for (let y = top + 45; y < bottom; y += 88) {
        const wobble = Math.sin(G.gameTime * 2 + y * 0.02) * 10;
        ctx.strokeStyle = "rgba(100,205,245,0.13)";
        ctx.beginPath(); ctx.moveTo(x - 22 - wobble, y); ctx.lineTo(x + 22 + wobble, y); ctx.stroke();
      }
    }
    ctx.restore();
  };

  const baseDraw = G.draw;
  G.draw = () => {
    baseDraw();
    ctx.save();
    worldTransform();
    maskOutsideField();
    drawCoherenceEdges();
    drawLatticeCore();
    drawLatticeGate();
    drawCarriedCore();
    ctx.restore();
  };
})();