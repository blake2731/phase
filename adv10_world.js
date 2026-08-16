(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const p = G.player;
  const ctx = G.ctx;
  const WORLD_W = 6900;
  const RELAY_X = 5200;
  const SOURCE = { x:6550, y:1000 };
  const newRightEdge = y => 6760 + Math.sin(y * 0.0055 + 1.3) * 20 + Math.sin(y * 0.014) * 8;
  const bottomEdge = x => 3070 + Math.sin(x * 0.0028 + 2.1) * 44 - Math.sin(x * 0.0094) * 17;
  const relayNodes = [
    { prime:2, x:5650, y:690, active:false },
    { prime:3, x:5830, y:835, active:false },
    { prime:5, x:5660, y:1015, active:false }
  ];
  const echoWell = { x:6100, y:1540, r:72, primed:false, prime:2, fireAt:0, fired:false };

  function applyBounds() {
    G.WORLD.width = WORLD_W;
    if (G.V8) G.V8.rightEdge = newRightEdge;
  }

  function resetV10() {
    s.v10 = {
      farFieldStarted:false,
      relaySolved:false,
      echoWellFound:false,
      sourceReached:false
    };
    relayNodes.forEach(n => n.active = false);
    Object.assign(echoWell, { primed:false, prime:2, fireAt:0, fired:false });
    applyBounds();
  }

  const baseReset = G.resetWorld;
  G.resetWorld = () => {
    baseReset();
    resetV10();
  };
  applyBounds();
  if (!s.v10) resetV10();

  const baseFinish = G.finishDemo;
  G.finishDemo = () => {
    if (s.stage === "threshold" && !s.v10.farFieldStarted) {
      s.v10.farFieldStarted = true;
      s.thresholdCrossed = true;
      s.stage = "far_field";
      s.area = "ECHO REACH";
      G.el.areaName.textContent = s.area;
      G.addKnown("SIGNAL RELAY", "The first source was a relay. Its pattern continues farther east.");
      G.updateQuest();
      G.refreshJournal?.();
      return;
    }
    if (s.stage === "far_field" && p.x < SOURCE.x - 70) return;
    if (s.stage === "far_field") s.v10.sourceReached = true;
    baseFinish();
  };

  const baseMove = G.updateMovement;
  G.updateMovement = dt => {
    baseMove(dt);
    if (s.stage === "far_field" && p.x > SOURCE.x - 70) G.finishDemo();
  };

  const baseArea = G.updateArea;
  G.updateArea = () => {
    baseArea();
    if (s.v10?.farFieldStarted && p.x > 5250 && p.y < 1950) {
      if (s.area !== "ECHO REACH") {
        s.area = "ECHO REACH";
        G.el.areaName.textContent = s.area;
        if (!s.visitedAreas.has(s.area)) {
          s.visitedAreas.add(s.area);
          G.showMessage("ECHO REACH", 900);
        }
      }
    }
  };

  const baseQuest = G.updateQuest;
  G.updateQuest = () => {
    if (s.stage === "far_field") {
      G.el.questTitle.textContent = "Follow the signal";
      G.el.questHint.textContent = "The relay was not the source.";
      G.el.questProgress.textContent = "EAST";
      return;
    }
    baseQuest();
  };

  const baseTestWave = G.testWave;
  G.testWave = wave => {
    baseTestWave(wave);
    if (!s.v10?.farFieldStarted) return;

    relayNodes.forEach((n, i) => {
      const key = "v10relay:" + i;
      if (n.active || wave.hit?.has(key)) return;
      if (Math.abs(Math.hypot(n.x - wave.x, n.y - wave.y) - wave.r) > 38) return;
      wave.hit?.add(key);
      if (wave.prime === n.prime) {
        n.active = true;
        G.tone(230 + n.prime * 28, 0.15, 0.016, "triangle");
      }
    });
    if (!s.v10.relaySolved && relayNodes.every(n => n.active)) {
      s.v10.relaySolved = true;
      G.addSecret("HARMONIC RELAY", "2 : 3 : 5", "Three learned modes stabilize a relay outside the main route.");
      G.chord?.(110, [1, 5/4, 3/2, 2]);
    }

    const wellKey = "v10well";
    if (!wave.hit?.has(wellKey) && Math.abs(Math.hypot(echoWell.x - wave.x, echoWell.y - wave.y) - wave.r) <= echoWell.r) {
      wave.hit?.add(wellKey);
      if (!echoWell.primed) {
        echoWell.primed = true;
        echoWell.prime = wave.prime;
        echoWell.fireAt = G.gameTime + 0.82;
        echoWell.fired = false;
      }
    }
  };

  const baseUpdate = G.update;
  G.update = dt => {
    baseUpdate(dt);
    if (!G.running || G.paused || !s.v10?.farFieldStarted) return;
    if (echoWell.primed && !echoWell.fired && G.gameTime >= echoWell.fireAt) {
      echoWell.fired = true;
      s.waves.push({ x:echoWell.x, y:echoWell.y, r:0, speed:430, maxR:430, prime:echoWell.prime, alpha:1, hit:new Set() });
      G.tone(150 + echoWell.prime * 22, 0.2, 0.012, "sine");
      if (!s.v10.echoWellFound) {
        s.v10.echoWellFound = true;
        G.addSecret("RETURNING WAVE", "f_out = f_in", "The field returned the same mode after a delay.");
      }
    }
  };

  function poly(x, y, r, n, rot = -Math.PI / 2) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = rot + i * G.TAU / n;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function clipExpansion() {
    const top = G.V8?.topEdge || (() => 130);
    ctx.beginPath();
    for (let x = 5120; x <= 6800; x += 50) {
      const y = top(x) + 8;
      if (x === 5120) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    for (let x = 6800; x >= 5120; x -= 50) ctx.lineTo(x, bottomEdge(x) - 8);
    ctx.closePath();
    ctx.clip();
  }

  function drawExpansion() {
    ctx.save();
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.translate(-G.camera.x, -G.camera.y);
    clipExpansion();

    const bg = ctx.createLinearGradient(5120, 0, 6800, 0);
    bg.addColorStop(0, "rgba(5,11,22,0.98)");
    bg.addColorStop(0.45, "rgba(8,11,28,0.99)");
    bg.addColorStop(1, "rgba(4,8,18,0.99)");
    ctx.fillStyle = bg;
    ctx.fillRect(5100, 0, 1750, G.WORLD.height);

    ctx.strokeStyle = "rgba(115,165,215,0.045)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 5120; x <= 6800; x += 64) { ctx.moveTo(x, 120); ctx.lineTo(x, 3070); }
    for (let y = 160; y <= 3070; y += 64) { ctx.moveTo(5120, y); ctx.lineTo(6800, y); }
    ctx.stroke();

    const glow = ctx.createRadialGradient(6000, 1050, 30, 6000, 1050, 950);
    glow.addColorStop(0, "rgba(158,112,235,0.055)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow; ctx.fillRect(5100, 120, 1700, 2850);

    if (s.v10?.farFieldStarted) {
      ctx.save();
      ctx.strokeStyle = "rgba(191,174,255,0.18)";
      ctx.setLineDash([4, 14]);
      ctx.lineDashOffset = -G.gameTime * 18;
      ctx.beginPath();
      ctx.moveTo(RELAY_X + 40, 1000);
      ctx.bezierCurveTo(5550, 900, 6050, 1100, SOURCE.x - 80, SOURCE.y);
      ctx.stroke();
      ctx.restore();

      relayNodes.forEach(n => {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        const hue = G.primeHue(n.prime);
        ctx.strokeStyle = `hsla(${hue},90%,72%,${n.active ? 0.82 : 0.3})`;
        ctx.shadowBlur = n.active ? 18 : 6; ctx.shadowColor = `hsla(${hue},90%,65%,0.5)`;
        poly(n.x, n.y, 30, n.prime); ctx.stroke();
        ctx.fillStyle = "rgba(239,247,255,0.74)"; ctx.font = "700 11px ui-monospace"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(String(n.prime), n.x, n.y);
        ctx.restore();
      });

      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const pulse = 0.5 + 0.5 * Math.sin(G.gameTime * 2.2);
      ctx.strokeStyle = `rgba(148,219,255,${0.14 + pulse * 0.1})`;
      for (let r of [28, 48, 70]) { ctx.beginPath(); ctx.arc(echoWell.x, echoWell.y, r, 0, G.TAU); ctx.stroke(); }
      ctx.restore();

      ctx.save(); ctx.translate(SOURCE.x, SOURCE.y); ctx.globalCompositeOperation="lighter";
      ctx.shadowBlur=32; ctx.shadowColor="rgba(218,178,255,.62)";
      ctx.strokeStyle="rgba(231,213,255,.78)"; ctx.lineWidth=1.8;
      for (let r of [42,68,94]) { ctx.save(); ctx.rotate(G.gameTime * 0.05 * (r === 68 ? -1 : 1)); poly(0,0,r,5); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle="rgba(210,244,255,.92)"; ctx.beginPath(); ctx.arc(0,0,7,0,G.TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.setTransform(G.dpr,0,0,G.dpr,0,0);
    ctx.translate(-G.camera.x,-G.camera.y);
    ctx.strokeStyle="rgba(126,220,250,0.34)"; ctx.setLineDash([2,9]);
    ctx.beginPath();
    for (let y=120; y<=3070; y+=36) {
      const x=newRightEdge(y); if (y===120) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke(); ctx.restore();
  }

  const baseDraw = G.draw;
  G.draw = () => {
    baseDraw();
    if (G.camera.x + G.screenW < 5050) return;
    drawExpansion();
    // Redraw active actors after painting over the old eastern mask.
    ctx.save();
    ctx.setTransform(G.dpr,0,0,G.dpr,0,0);
    ctx.translate(-G.camera.x,-G.camera.y);
    G.drawTrail(); G.drawWaves(); G.drawBursts(); G.drawSignal(); G.drawPlayer();
    ctx.restore();
  };
})();