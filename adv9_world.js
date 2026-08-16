(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const p = G.player;
  const ctx = G.ctx;
  const OLD_BOTTOM = 1860;
  const WORLD_H = 3200;
  const bottomEdge = x => 3070 + Math.sin(x * 0.0028 + 2.1) * 44 - Math.sin(x * 0.0094) * 17;
  const sites = {
    orbit: { x: 900, y: 2500, r: 118 },
    triad: { x: 2550, y: 2520, r: 145, nodes: [] },
    still: { x: 3560, y: 2580, r: 112 }
  };
  sites.triad.nodes = [
    { prime: 2, x: sites.triad.x - 105, y: sites.triad.y + 55, active: false },
    { prime: 3, x: sites.triad.x, y: sites.triad.y - 118, active: false },
    { prime: 5, x: sites.triad.x + 108, y: sites.triad.y + 56, active: false }
  ];

  function resetV9() {
    s.v9 = {
      edgeMsgAt: -999,
      orbitLast: null,
      orbitTravel: 0,
      orbitDone: false,
      triadDone: false,
      stillDone: false
    };
    sites.triad.nodes.forEach(n => n.active = false);
    G.WORLD.height = WORLD_H;
  }

  const baseReset = G.resetWorld;
  G.resetWorld = () => {
    baseReset();
    resetV9();
  };

  function keyDown(code) { return G.keys.has(code); }
  function movementInput() {
    let x = 0, y = 0;
    if (keyDown("KeyA") || keyDown("ArrowLeft")) x--;
    if (keyDown("KeyD") || keyDown("ArrowRight")) x++;
    if (keyDown("KeyW") || keyDown("ArrowUp")) y--;
    if (keyDown("KeyS") || keyDown("ArrowDown")) y++;
    if (x || y) { const m = Math.hypot(x, y); x /= m; y /= m; }
    return { x, y };
  }

  function edgeMessage() {
    if (!s.v9 || G.gameTime - s.v9.edgeMsgAt < 1.4 || G.intro?.active) return;
    s.v9.edgeMsgAt = G.gameTime;
    G.showMessage("FIELD EDGE", 650);
  }

  function crossBlocked(oldX, nx, x) {
    return (oldX < x && nx >= x) || (oldX > x && nx <= x);
  }

  G.updateMovement = dt => {
    const input = movementInput();
    const smooth = 1 - Math.exp(-dt * 9);
    p.vx += (input.x * p.speed - p.vx) * smooth;
    p.vy += (input.y * p.speed - p.vy) * smooth;

    const oldX = p.x, oldY = p.y;
    let nx = p.x + p.vx * dt;
    let ny = p.y + p.vy * dt;

    const left = G.V8?.leftEdge ? G.V8.leftEdge(ny) + 15 : 70;
    const right = G.V8?.rightEdge ? G.V8.rightEdge(ny) - 15 : G.WORLD.width - 70;
    const top = G.V8?.topEdge ? G.V8.topEdge(nx) + 15 : 120;
    const bottom = bottomEdge(nx) - 15;
    let edgeHit = false;
    if (nx < left) { nx = left; p.vx = Math.max(0, p.vx); edgeHit = true; }
    if (nx > right) { nx = right; p.vx = Math.min(0, p.vx); edgeHit = true; }
    if (ny < top) { ny = top; p.vy = Math.max(0, p.vy); edgeHit = true; }
    if (ny > bottom) { ny = bottom; p.vy = Math.min(0, p.vy); edgeHit = true; }
    if (edgeHit) edgeMessage();

    if (!s.gateOpen && crossBlocked(oldX, nx, 1900)) {
      nx = oldX < 1900 ? 1878 : 1922;
      p.vx = 0;
      G.showMessage("BOUNDARY UNSTABLE", 650);
    }

    const inRift = nx > 2760 && nx < 2980;
    const bridgeLane = ny > 820 && ny < 1180;
    if (inRift && !(s.bridgeOpen && bridgeLane)) {
      nx = oldX < 2760 ? 2738 : 3002;
      p.vx = 0;
      if (!s.bridgeOpen) G.showMessage("NO PATH", 600);
    }

    const gateX = G.V8?.GATE?.x ?? 3970;
    const gateOpen = Boolean(s.v8?.keyInstalled);
    const gateLane = ny > 825 && ny < 1175;
    if (crossBlocked(oldX, nx, gateX) && (!gateOpen || !gateLane)) {
      nx = oldX < gateX ? gateX - 42 : gateX + 42;
      p.vx = 0;
      if (!gateOpen) G.showMessage("CORE MISSING", 700);
    }

    if (G.intro?.active) {
      nx = G.clamp(nx, 120, 940);
      ny = G.clamp(ny, 520, 1480);
    }

    if (s.stage === "threshold" && nx > 4210) {
      const current = G.clamp((nx - 4210) / 900, 0, 1);
      const resistance = (36 + current * 72) * (G.hasBonus?.("vector_step") ? 0.62 : 1);
      nx -= resistance * dt;
    }

    p.x = nx; p.y = ny;
    const moved = Math.hypot(p.x - oldX, p.y - oldY);
    if (moved > 0.35) {
      p.stillTime = 0;
      p.trail.push({ x:p.x, y:p.y, t:G.gameTime });
      while (p.trail.length > 110) p.trail.shift();
    } else p.stillTime += dt;

    if (s.stage === "signal") G.updateSignalMeeting();
    if (s.stage === "follow" && p.x > 960) {
      s.stage = "basin";
      s.signalAtBasin = true;
      G.addKnown("RESONANCE", "Matching modes create a strong response.");
      G.updateQuest();
    }
    if (s.stage === "exit" && Math.hypot(p.x - 4140, p.y - 1000) < 86) G.finishDemo();
    if (s.stage === "threshold" && p.x > 5160) G.finishDemo();
  };

  function addExplorationSecret(title, formula, note) {
    if (!s.abilities?.journal) return;
    G.addSecret(title, formula, note);
  }

  function updateOrbit() {
    if (s.v9.orbitDone) return;
    const site = sites.orbit;
    const d = Math.hypot(p.x - site.x, p.y - site.y);
    if (d < 75 || d > 185) { s.v9.orbitLast = null; return; }
    const a = Math.atan2(p.y - site.y, p.x - site.x);
    if (s.v9.orbitLast !== null) {
      let da = a - s.v9.orbitLast;
      while (da > Math.PI) da -= G.TAU;
      while (da < -Math.PI) da += G.TAU;
      s.v9.orbitTravel += Math.abs(da);
      if (s.v9.orbitTravel > G.TAU * 0.92) {
        s.v9.orbitDone = true;
        addExplorationSecret("CLOSED PATH", "∮", "A full orbit returns P to the same place with new information.");
        G.chord?.(130, [1, 4/3, 3/2, 2]);
      }
    }
    s.v9.orbitLast = a;
  }

  function updateStill() {
    if (s.v9.stillDone) return;
    const site = sites.still;
    if (Math.hypot(p.x - site.x, p.y - site.y) < site.r && p.stillTime > 4.2) {
      s.v9.stillDone = true;
      addExplorationSecret("STILL FIELD", "v = 0", "When P stops moving, a quiet structure becomes visible.");
      G.chord?.(98, [1, 3/2, 2]);
    }
  }

  const baseTestWave = G.testWave;
  G.testWave = wave => {
    baseTestWave(wave);
    if (!s.v9 || s.v9.triadDone) return;
    sites.triad.nodes.forEach((n, i) => {
      const key = "v9triad:" + i;
      if (wave.hit?.has(key) || n.active) return;
      if (Math.abs(Math.hypot(n.x - wave.x, n.y - wave.y) - wave.r) > 36) return;
      wave.hit?.add(key);
      if (wave.prime === n.prime) {
        n.active = true;
        G.tone(230 + n.prime * 28, 0.16, 0.018, "triangle");
      }
    });
    if (sites.triad.nodes.every(n => n.active)) {
      s.v9.triadDone = true;
      addExplorationSecret("COMMON FIELD", "2 · 3 · 5", "Three learned modes can share one stable structure.");
      G.chord?.(110, [1, 5/4, 3/2, 2]);
    }
  };

  const baseUpdate = G.update;
  G.update = dt => {
    baseUpdate(dt);
    if (!G.running || G.paused || !s.v9) return;
    updateOrbit();
    updateStill();
  };

  function polygon(x, y, r, n, rot = 0) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = rot + i * G.TAU / n;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function worldTransform() {
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.translate(-G.camera.x, -G.camera.y);
  }

  function drawSouthernField() {
    const top = OLD_BOTTOM - 130;
    const bottom = WORLD_H;
    const fade = ctx.createLinearGradient(0, top, 0, top + 260);
    fade.addColorStop(0, "rgba(4, 9, 18, 0)");
    fade.addColorStop(0.42, "rgba(4, 10, 19, 0.93)");
    fade.addColorStop(1, "rgba(4, 10, 19, 0.98)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, top, G.WORLD.width, bottom - top);

    ctx.strokeStyle = "rgba(105,160,205,0.045)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= G.WORLD.width; x += 64) { ctx.moveTo(x, top + 100); ctx.lineTo(x, bottom); }
    for (let y = 1984; y <= bottom; y += 64) { ctx.moveTo(0, y); ctx.lineTo(G.WORLD.width, y); }
    ctx.stroke();

    const g = ctx.createLinearGradient(0, 1950, 0, 3100);
    g.addColorStop(0, "rgba(80, 185, 230, 0.015)");
    g.addColorStop(0.55, "rgba(110, 95, 205, 0.028)");
    g.addColorStop(1, "rgba(20, 40, 70, 0.01)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 1920, G.WORLD.width, 1200);

    ctx.save();
    ctx.strokeStyle = "rgba(120,216,245,0.32)";
    ctx.setLineDash([2, 9]);
    ctx.beginPath();
    for (let x = 0; x <= G.WORLD.width; x += 36) {
      const y = bottomEdge(x);
      if (!x) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawOrbitSite() {
    const q = sites.orbit;
    ctx.save(); ctx.translate(q.x, q.y); ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(116,224,255,0.24)"; ctx.lineWidth = 1.2;
    for (let r of [54, 86, 118]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, G.TAU); ctx.stroke(); }
    const a = G.gameTime * 0.45;
    ctx.fillStyle = "rgba(208,247,255,0.8)";
    ctx.beginPath(); ctx.arc(Math.cos(a)*86, Math.sin(a)*86, 5, 0, G.TAU); ctx.fill();
    ctx.restore();
  }

  function drawTriadSite() {
    const q = sites.triad;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(188,199,255,0.12)";
    ctx.beginPath();
    sites.triad.nodes.forEach((n,i) => { if (!i) ctx.moveTo(n.x,n.y); else ctx.lineTo(n.x,n.y); });
    ctx.closePath(); ctx.stroke();
    sites.triad.nodes.forEach(n => {
      const hue = G.primeHue(n.prime);
      ctx.save(); ctx.translate(n.x,n.y); ctx.rotate(G.gameTime * 0.08 * (n.prime % 2 ? 1 : -1));
      ctx.strokeStyle = `hsla(${hue},90%,72%,${n.active ? 0.82 : 0.32})`;
      ctx.shadowBlur = n.active ? 20 : 7; ctx.shadowColor = `hsla(${hue},90%,65%,0.5)`;
      polygon(0,0,30,n.prime,-Math.PI/2); ctx.stroke();
      ctx.fillStyle = "rgba(239,247,255,0.72)"; ctx.font = "700 11px ui-monospace"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(String(n.prime),0,0);
      ctx.restore();
    });
    ctx.restore();
  }

  function drawStillSite() {
    const q = sites.still;
    ctx.save(); ctx.translate(q.x,q.y); ctx.globalCompositeOperation = "lighter";
    const quiet = Math.min(1, p.stillTime / 4.2);
    for (let i=0;i<5;i++) {
      ctx.strokeStyle = `rgba(184,211,255,${0.05 + quiet*0.08})`;
      ctx.beginPath(); ctx.arc(0,0,34+i*18,0,G.TAU); ctx.stroke();
    }
    if (quiet > 0.35) {
      ctx.strokeStyle = `rgba(218,192,255,${quiet*0.38})`;
      polygon(0,0,46,6,Math.PI/6); ctx.stroke();
    }
    ctx.restore();
  }

  const baseDraw = G.draw;
  G.draw = () => {
    baseDraw();
    ctx.save(); worldTransform();
    drawSouthernField();
    drawOrbitSite(); drawTriadSite(); drawStillSite();
    ctx.restore();
  };

  resetV9();
})();