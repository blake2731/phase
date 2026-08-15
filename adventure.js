(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const startButton = document.getElementById("startButton");
  const hud = document.getElementById("hud");
  const help = document.getElementById("help");
  const freqText = document.getElementById("freqText");
  const scoreText = document.getElementById("scoreText");
  const levelText = document.getElementById("levelText");
  const message = document.getElementById("message");
  const adventureArea = document.getElementById("adventureArea");
  const adventureObjective = document.getElementById("adventureObjective");
  const adventureHint = document.getElementById("adventureHint");
  const adventureProgress = document.getElementById("adventureProgress");
  const discovery = document.getElementById("adventureDiscovery");
  const discoveryTitle = document.getElementById("discoveryTitle");
  const discoveryFormula = document.getElementById("discoveryFormula");
  const discoveryMeaning = document.getElementById("discoveryMeaning");
  const completePanel = document.getElementById("adventureComplete");
  const completeSummary = document.getElementById("completeSummary");
  const replayButton = document.getElementById("replayButton");

  const TAU = Math.PI * 2;
  const PRIMES = [2, 3, 5, 7, 11, 13];
  const WORLD = { width: 3600, height: 1800 };
  const keys = new Set();

  let screenW = innerWidth;
  let screenH = innerHeight;
  let dpr = Math.min(devicePixelRatio || 1, 2);
  let running = false;
  let lastTime = performance.now();
  let gameTime = 0;
  let audio = null;
  let knowledge = 0;
  let discoveryTimer = null;
  let messageTimer = null;
  let wrongPulseCooldown = 0;

  const camera = { x: 0, y: 0 };
  const player = {
    x: 260,
    y: 900,
    vx: 0,
    vy: 0,
    radius: 7,
    speed: 285,
    freqIndex: 0,
    cooldown: 0,
    trail: []
  };

  const state = {
    stage: "basin",
    area: "COORDINATE BASIN",
    gateOpen: false,
    bridgeOpen: false,
    companionRepaired: false,
    complete: false,
    waves: [],
    bursts: [],
    basinNodes: [],
    spanLocks: [],
    gardenAnchors: [],
    companion: { x: 2760, y: 900, phase: 0, followPhase: 0, pulseTimer: 1.8 }
  };

  function primeHue(prime) {
    const map = { 2: 190, 3: 205, 5: 248, 7: 286, 11: 328, 13: 34 };
    return map[prime] ?? 195;
  }

  function ensureAudio() {
    if (!audio) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audio = new AudioContext();
    }
    if (audio && audio.state === "suspended") audio.resume();
  }

  function tone(freq, duration = 0.1, gainValue = 0.025, type = "sine", delay = 0) {
    if (!audio) return;
    const now = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function chord(root, ratios) {
    ratios.forEach((ratio, i) => tone(root * ratio, 0.32, 0.017, "sine", i * 0.035));
  }

  function resize() {
    screenW = innerWidth;
    screenH = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(screenW * dpr);
    canvas.height = Math.floor(screenH * dpr);
    canvas.style.width = screenW + "px";
    canvas.style.height = screenH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeNode(prime, x, y, type = "resonator") {
    return {
      prime,
      x,
      y,
      type,
      radius: type === "anchor" ? 20 : 34 + prime * 0.7,
      active: false,
      timer: 0,
      reject: 0,
      resonate: 0,
      phase: Math.random() * TAU
    };
  }

  function resetAdventure() {
    player.x = 260;
    player.y = 900;
    player.vx = 0;
    player.vy = 0;
    player.freqIndex = 0;
    player.cooldown = 0;
    player.trail.length = 0;
    gameTime = 0;
    knowledge = 0;
    wrongPulseCooldown = 0;

    state.stage = "basin";
    state.area = "COORDINATE BASIN";
    state.gateOpen = false;
    state.bridgeOpen = false;
    state.companionRepaired = false;
    state.complete = false;
    state.waves.length = 0;
    state.bursts.length = 0;

    state.basinNodes = [
      makeNode(2, 450, 610),
      makeNode(3, 700, 1010),
      makeNode(5, 870, 540)
    ];

    state.spanLocks = [
      makeNode(3, 1420, 650, "lock"),
      makeNode(5, 1720, 1110, "lock")
    ];

    state.gardenAnchors = [];
    const cx = 2760;
    const cy = 900;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * TAU / 5;
      state.gardenAnchors.push(makeNode(5, cx + Math.cos(a) * 190, cy + Math.sin(a) * 190, "anchor"));
    }

    state.companion.x = 2760;
    state.companion.y = 900;
    state.companion.phase = 0;
    state.companion.followPhase = 0;
    state.companion.pulseTimer = 1.8;

    completePanel.classList.remove("visible");
    updateObjective();
    updateHud();
    showDiscovery(
      "THE FIELD IS NO LONGER AN ARENA",
      "observe → infer → interact",
      "The same laws you learned are now tools. Nothing here needs to be destroyed to let you pass.",
      4600
    );
  }

  function startAdventure() {
    ensureAudio();
    resetAdventure();
    running = true;
    hud.classList.remove("storyHidden");
    help.classList.remove("storyHidden");
    lastTime = performance.now();
  }

  function showMessage(text, duration = 1000) {
    message.textContent = text;
    message.style.opacity = "1";
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => { message.style.opacity = "0"; }, duration);
  }

  function showDiscovery(title, formula, meaning, duration = 3600) {
    discoveryTitle.textContent = title;
    discoveryFormula.textContent = formula;
    discoveryMeaning.textContent = meaning;
    discovery.classList.add("visible");
    clearTimeout(discoveryTimer);
    discoveryTimer = setTimeout(() => discovery.classList.remove("visible"), duration);
  }

  function addKnowledge(amount, label) {
    knowledge += amount;
    if (label) showMessage("DISCOVERED • " + label, 1200);
    updateHud();
  }

  function updateHud() {
    freqText.textContent = PRIMES[player.freqIndex];
    scoreText.textContent = knowledge;
    levelText.textContent = state.area;
  }

  function updateObjective() {
    adventureArea.textContent = state.area;
    if (state.stage === "basin") {
      const active = state.basinNodes.filter(n => n.active).length;
      adventureObjective.textContent = "Awaken the resonator network";
      adventureHint.textContent = "Each structure responds only to its own natural mode. Tune with Q / E and pulse with Space.";
      adventureProgress.textContent = active + " / 3 modes awake";
    } else if (state.stage === "span") {
      const active = state.spanLocks.filter(n => n.timer > 0).length;
      adventureObjective.textContent = "Create a standing bridge";
      adventureHint.textContent = "Hold both locks in resonance at the same time. Their stored oscillations decay, so timing and switching matter.";
      adventureProgress.textContent = active + " / 2 locks resonating";
    } else if (state.stage === "garden") {
      const active = state.gardenAnchors.filter(n => n.active).length;
      adventureObjective.textContent = "Restore fivefold symmetry";
      adventureHint.textContent = "Tune to 5. The missing structure becomes legible through the matching lens. Move close enough to charge each anchor.";
      adventureProgress.textContent = active + " / 5 symmetry anchors";
    } else if (state.stage === "exit") {
      adventureObjective.textContent = "Follow the new signal";
      adventureHint.textContent = "The repaired system is following you. Take it to the boundary glyph at the far edge of the garden.";
      adventureProgress.textContent = "companion acquired";
    } else {
      adventureObjective.textContent = "Chapter fragment complete";
      adventureHint.textContent = "The field has changed because you understood it.";
      adventureProgress.textContent = "knowledge preserved";
    }
  }

  function changeFrequency(dir) {
    if (!running || state.complete) return;
    player.freqIndex = (player.freqIndex + dir + PRIMES.length) % PRIMES.length;
    const prime = PRIMES[player.freqIndex];
    tone(165 + prime * 18, 0.075, 0.018, "triangle");
    showMessage("LENS • MODE " + prime, 620);
    updateHud();
  }

  function emitWave() {
    if (!running || state.complete || player.cooldown > 0) return;
    ensureAudio();
    const prime = PRIMES[player.freqIndex];
    state.waves.push({ x: player.x, y: player.y, r: 0, speed: 470, maxR: 520, prime, alpha: 1, hit: new Set() });
    player.cooldown = 0.38;
    tone(130 + prime * 22, 0.12, 0.026, "sine");
  }

  function rejectNode(node) {
    node.reject = 1;
    state.bursts.push({ x: node.x, y: node.y, prime: node.prime, age: 0, duration: 0.75, kind: "reject" });
    tone(78, 0.09, 0.018, "square");
    if (wrongPulseCooldown <= 0) {
      showMessage("NO COUPLING • NATURAL MODE " + node.prime, 900);
      wrongPulseCooldown = 0.75;
    }
  }

  function resonateNode(node) {
    node.resonate = 1;
    state.bursts.push({ x: node.x, y: node.y, prime: node.prime, age: 0, duration: 0.9, kind: "resonate" });
    tone(235 + node.prime * 24, 0.13, 0.03, "triangle");
  }

  function activateBasinNode(node) {
    if (node.active) return;
    node.active = true;
    resonateNode(node);
    addKnowledge(1, "mode " + node.prime + " awakened");
    const active = state.basinNodes.filter(n => n.active).length;
    if (active === 3) {
      state.gateOpen = true;
      state.stage = "span";
      addKnowledge(2);
      chord(110, [1, 5 / 4, 3 / 2, 2]);
      showDiscovery(
        "A NETWORK CAN HOLD MORE THAN ONE MODE",
        "R = {2, 3, 5}",
        "You did not overpower the gate. You made three independent structures coherent enough to define a path.",
        4800
      );
    }
    updateObjective();
  }

  function activateSpanLock(node) {
    node.timer = 8.5;
    node.active = true;
    resonateNode(node);
    updateObjective();
    if (state.spanLocks.every(n => n.timer > 0)) {
      state.bridgeOpen = true;
      state.stage = "garden";
      state.spanLocks.forEach(n => { n.timer = 999; n.active = true; });
      addKnowledge(3, "constructive persistence");
      chord(110, [1, 4 / 3, 3 / 2, 2]);
      showDiscovery(
        "SIMULTANEOUS STATES CREATE A PATH",
        "S(t) = A₃(t) + A₅(t)",
        "The bridge exists because two oscillating systems are sustaining the field together. Timing has become geometry.",
        5200
      );
      updateObjective();
    }
  }

  function activateGardenAnchor(node) {
    if (node.active) return;
    const originDistance = Math.hypot(node.x - player.x, node.y - player.y);
    if (originDistance > 125) {
      showMessage("SIGNAL TOO WEAK • MOVE CLOSER", 820);
      node.reject = 0.6;
      return;
    }
    node.active = true;
    resonateNode(node);
    addKnowledge(1);
    updateObjective();
    if (state.gardenAnchors.every(n => n.active)) {
      state.companionRepaired = true;
      state.stage = "exit";
      addKnowledge(4, "symmetry restored");
      chord(110, [1, 5 / 4, 3 / 2, 15 / 8, 2]);
      showDiscovery(
        "SYMMETRY RESTORED",
        "S₅(θ) = S₅(θ + 2π/5)",
        "It was not a lock. It was damaged. The structure stabilizes, recognizes your pulse, and chooses to move with you.",
        6000
      );
      updateObjective();
    }
  }

  function testWaveAgainstNodes(wave) {
    const groups = [
      ["basin", state.basinNodes],
      ["span", state.spanLocks],
      ["garden", state.gardenAnchors]
    ];

    for (const [groupName, nodes] of groups) {
      nodes.forEach((node, index) => {
        const key = groupName + ":" + index;
        if (wave.hit.has(key)) return;
        const distance = Math.hypot(node.x - wave.x, node.y - wave.y);
        if (Math.abs(distance - wave.r) > node.radius + 10) return;
        wave.hit.add(key);

        if (groupName === "basin" && state.stage !== "basin") return;
        if (groupName === "span" && !["span", "garden", "exit"].includes(state.stage)) return;
        if (groupName === "garden" && !["garden", "exit"].includes(state.stage)) return;

        if (wave.prime !== node.prime) {
          rejectNode(node);
          return;
        }

        if (groupName === "basin") activateBasinNode(node);
        if (groupName === "span" && state.stage === "span") activateSpanLock(node);
        if (groupName === "garden" && state.stage === "garden") activateGardenAnchor(node);
      });
    }
  }

  function update(dt) {
    if (!running || state.complete) return;
    gameTime += dt;
    player.cooldown = Math.max(0, player.cooldown - dt);
    wrongPulseCooldown = Math.max(0, wrongPulseCooldown - dt);
    updateMovement(dt);

    for (let i = state.waves.length - 1; i >= 0; i--) {
      const wave = state.waves[i];
      wave.r += wave.speed * dt;
      wave.alpha = Math.max(0, 1 - wave.r / wave.maxR);
      testWaveAgainstNodes(wave);
      if (wave.r >= wave.maxR) state.waves.splice(i, 1);
    }

    for (const node of [...state.basinNodes, ...state.spanLocks, ...state.gardenAnchors]) {
      node.phase += dt * (0.45 + node.prime * 0.025);
      node.reject *= Math.pow(0.05, dt);
      node.resonate *= Math.pow(0.025, dt);
    }

    if (state.stage === "span") {
      let changed = false;
      for (const node of state.spanLocks) {
        if (node.timer > 0) {
          node.timer = Math.max(0, node.timer - dt);
          if (node.timer === 0) { node.active = false; changed = true; }
        }
      }
      if (changed) updateObjective();
    }

    for (let i = state.bursts.length - 1; i >= 0; i--) {
      state.bursts[i].age += dt;
      if (state.bursts[i].age >= state.bursts[i].duration) state.bursts.splice(i, 1);
    }

    updateCompanion(dt);
    updateArea();
    updateCamera(dt);
  }

  function updateMovement(dt) {
    let ix = 0;
    let iy = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) ix -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) ix += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) iy -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) iy += 1;
    if (ix || iy) {
      const mag = Math.hypot(ix, iy);
      ix /= mag;
      iy /= mag;
    }

    const smoothing = 1 - Math.exp(-dt * 9);
    player.vx += (ix * player.speed - player.vx) * smoothing;
    player.vy += (iy * player.speed - player.vy) * smoothing;

    const oldX = player.x;
    const oldY = player.y;
    let nx = Math.max(70, Math.min(WORLD.width - 70, player.x + player.vx * dt));
    let ny = Math.max(120, Math.min(WORLD.height - 120, player.y + player.vy * dt));

    if (!state.gateOpen && oldX < 1060 && nx >= 1060 && ny > 300 && ny < 1500) {
      nx = 1038;
      player.vx = Math.min(0, player.vx);
      showMessage("THE NETWORK IS INCOMPLETE", 700);
    }
    if (!state.gateOpen && oldX > 1080 && nx <= 1080 && ny > 300 && ny < 1500) {
      nx = 1102;
      player.vx = Math.max(0, player.vx);
    }

    const entersRift = nx > 1910 && nx < 2110;
    const inBridgeLane = ny > 760 && ny < 1040;
    if (entersRift && !(state.bridgeOpen && inBridgeLane)) {
      nx = oldX < 1910 ? 1888 : 2132;
      player.vx = 0;
      if (!state.bridgeOpen) showMessage("NO STABLE PATH ACROSS THE FIELD", 750);
    }

    player.x = nx;
    player.y = ny;
    const moved = Math.hypot(player.x - oldX, player.y - oldY);
    if (moved > 0.35) {
      player.trail.push({ x: player.x, y: player.y, t: gameTime });
      while (player.trail.length > 105) player.trail.shift();
    }

    if (state.stage === "exit" && Math.hypot(player.x - 3370, player.y - 900) < 82) finishAdventure();
  }

  function updateCompanion(dt) {
    if (!state.companionRepaired) return;
    const c = state.companion;
    c.followPhase += dt * 1.25;
    const targetX = player.x - 78 + Math.cos(c.followPhase) * 26;
    const targetY = player.y + 62 + Math.sin(c.followPhase * 1.4) * 24;
    const follow = 1 - Math.exp(-dt * 3.4);
    c.x += (targetX - c.x) * follow;
    c.y += (targetY - c.y) * follow;
    c.phase += dt * 0.75;
    c.pulseTimer -= dt;
    if (c.pulseTimer <= 0) {
      c.pulseTimer = 2.7;
      state.bursts.push({ x: c.x, y: c.y, prime: 5, age: 0, duration: 1.4, kind: "friend" });
      tone(310, 0.12, 0.012, "sine");
    }
  }

  function updateArea() {
    let area;
    if (player.x < 1100) area = "COORDINATE BASIN";
    else if (player.x < 2130) area = "RESONANT SPAN";
    else area = "SYMMETRY GARDEN";
    if (area !== state.area && !state.complete) {
      state.area = area;
      updateHud();
      adventureArea.textContent = area;
    }
  }

  function updateCamera(dt) {
    const targetX = player.x - screenW / 2;
    const targetY = player.y - screenH / 2;
    const maxX = Math.max(0, WORLD.width - screenW);
    const maxY = Math.max(0, WORLD.height - screenH);
    const follow = 1 - Math.exp(-dt * 5.5);
    camera.x += (Math.max(0, Math.min(maxX, targetX)) - camera.x) * follow;
    camera.y += (Math.max(0, Math.min(maxY, targetY)) - camera.y) * follow;
  }

  function finishAdventure() {
    if (state.complete) return;
    state.complete = true;
    state.stage = "complete";
    knowledge += 5;
    updateObjective();
    updateHud();
    chord(110, [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 15 / 8, 2]);
    completeSummary.textContent = "You awakened three natural modes, sustained a bridge through simultaneous resonance, and repaired a damaged fivefold system. It followed you because you restored it, not because you defeated it.";
    setTimeout(() => completePanel.classList.add("visible"), 900);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = ctx.createRadialGradient(screenW * 0.5, screenH * 0.5, 20, screenW * 0.5, screenH * 0.5, Math.max(screenW, screenH));
    bg.addColorStop(0, "#08121f");
    bg.addColorStop(0.55, "#040912");
    bg.addColorStop(1, "#02040a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, screenW, screenH);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    drawWorldBase();
    drawFrequencyLens();
    drawBasin();
    drawSpan();
    drawGarden();
    drawTrail();
    drawWaves();
    drawBursts();
    drawCompanion();
    drawPlayer();
    ctx.restore();
  }

  function drawWorldBase() {
    const spacing = 64;
    ctx.strokeStyle = "rgba(105, 160, 205, 0.045)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= WORLD.width; x += spacing) { ctx.moveTo(x, 0); ctx.lineTo(x, WORLD.height); }
    for (let y = 0; y <= WORLD.height; y += spacing) { ctx.moveTo(0, y); ctx.lineTo(WORLD.width, y); }
    ctx.stroke();
    zoneGlow(520, 900, 760, 190, 0.045);
    zoneGlow(1540, 900, 760, 248, 0.045);
    zoneGlow(2800, 900, 800, 286, 0.05);
    drawBoundary(1080, state.gateOpen);
    drawRift();
  }

  function zoneGlow(x, y, radius, hue, alpha) {
    const g = ctx.createRadialGradient(x, y, 20, x, y, radius);
    g.addColorStop(0, "hsla(" + hue + ",75%,55%," + alpha + ")");
    g.addColorStop(1, "hsla(" + hue + ",75%,30%,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
  }

  function drawBoundary(x, open) {
    ctx.save();
    ctx.strokeStyle = open ? "rgba(110,230,255,0.08)" : "rgba(145,210,245,0.32)";
    ctx.lineWidth = open ? 1 : 2;
    ctx.setLineDash(open ? [6, 20] : [2, 8]);
    ctx.beginPath();
    ctx.moveTo(x, 300);
    ctx.lineTo(x, 1500);
    ctx.stroke();
    if (!open) {
      for (let y = 360; y < 1500; y += 90) {
        const wobble = Math.sin(gameTime * 2 + y * 0.02) * 10;
        ctx.strokeStyle = "rgba(100,205,245,0.13)";
        ctx.beginPath();
        ctx.moveTo(x - 22 - wobble, y);
        ctx.lineTo(x + 22 + wobble, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawRift() {
    const left = 1910;
    const right = 2110;
    ctx.fillStyle = "rgba(0,0,0,0.52)";
    ctx.fillRect(left, 90, right - left, WORLD.height - 180);
    for (let i = 0; i < 18; i++) {
      const y = 150 + i * 88;
      const x1 = left + 20 + Math.sin(gameTime * 0.8 + i) * 26;
      const x2 = right - 20 + Math.cos(gameTime * 0.7 + i * 0.7) * 22;
      ctx.strokeStyle = "rgba(120,125,220,0.08)";
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.bezierCurveTo((left + right) / 2, y - 35, (left + right) / 2, y + 35, x2, y);
      ctx.stroke();
    }
    if (state.bridgeOpen) {
      const y1 = 780;
      const y2 = 1020;
      const g = ctx.createLinearGradient(left, 0, right, 0);
      g.addColorStop(0, "rgba(105,220,255,0.06)");
      g.addColorStop(0.5, "rgba(196,180,255,0.18)");
      g.addColorStop(1, "rgba(105,220,255,0.06)");
      ctx.fillStyle = g;
      ctx.fillRect(left, y1, right - left, y2 - y1);
      ctx.strokeStyle = "rgba(205,235,255,0.26)";
      ctx.setLineDash([12, 12]);
      ctx.strokeRect(left, y1, right - left, y2 - y1);
      ctx.setLineDash([]);
    }
  }

  function drawFrequencyLens() {
    const prime = PRIMES[player.freqIndex];
    const hue = primeHue(prime);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "hsla(" + hue + ",90%,70%,0.055)";
    const centers = [[420,310],[820,1310],[1300,350],[1660,1450],[2300,420],[2500,1320],[3100,410],[3300,1370]];
    centers.forEach((c, idx) => {
      ctx.save();
      ctx.translate(c[0], c[1]);
      ctx.rotate(gameTime * 0.04 * (idx % 2 ? -1 : 1));
      ctx.beginPath();
      for (let i = 0; i <= prime; i++) {
        const a = i / prime * TAU;
        const r = 45 + prime * 3;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  }

  function drawBasin() {
    const activeNodes = state.basinNodes.filter(n => n.active);
    if (activeNodes.length >= 2) {
      ctx.strokeStyle = "rgba(145,225,250,0.12)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      activeNodes.forEach((node, i) => { if (i === 0) ctx.moveTo(node.x, node.y); else ctx.lineTo(node.x, node.y); });
      if (activeNodes.length === 3) ctx.closePath();
      ctx.stroke();
    }
    state.basinNodes.forEach(node => drawNode(node, true));
    ctx.fillStyle = "rgba(215,235,250,0.14)";
    ctx.font = "700 12px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("COORDINATE BASIN", 620, 250);
  }

  function drawSpan() {
    state.spanLocks.forEach(node => drawNode(node, true));
    for (let row = 0; row < 4; row++) {
      ctx.strokeStyle = "rgba(155,150,240," + (0.035 + row * 0.01) + ")";
      ctx.beginPath();
      for (let x = 1160; x <= 1880; x += 12) {
        const y = 430 + row * 300 + Math.sin((x - 1160) * 0.015 * (row + 2) - gameTime * (0.6 + row * 0.15)) * 28;
        if (x === 1160) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    if (state.stage === "span") {
      state.spanLocks.forEach(node => {
        if (node.timer <= 0) return;
        const ratio = Math.min(1, node.timer / 8.5);
        ctx.strokeStyle = "hsla(" + primeHue(node.prime) + ",90%,72%," + (0.16 + ratio * 0.24) + ")";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 18, -Math.PI / 2, -Math.PI / 2 + TAU * ratio);
        ctx.stroke();
      });
    }
    ctx.fillStyle = "rgba(220,220,255,0.13)";
    ctx.font = "700 12px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("RESONANT SPAN", 1530, 230);
  }

  function drawGarden() {
    const cx = 2760;
    const cy = 900;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(gameTime * 0.035);
    for (let ring = 0; ring < 4; ring++) {
      const radius = 260 + ring * 105;
      ctx.strokeStyle = "rgba(195,145,245," + (0.04 + ring * 0.012) + ")";
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) {
        const a = i / 5 * TAU + ring * 0.18;
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();

    const lensFive = PRIMES[player.freqIndex] === 5;
    state.gardenAnchors.forEach(node => drawNode(node, lensFive || node.active, node.active ? 1 : lensFive ? 0.9 : 0.11));
    if (!state.companionRepaired) drawDamagedCompanion(cx, cy);
    drawExitGlyph();
    ctx.fillStyle = "rgba(230,205,255,0.13)";
    ctx.font = "700 12px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("SYMMETRY GARDEN", 2760, 230);
  }

  function drawNode(node, showLabel, alphaOverride = 1) {
    const hue = primeHue(node.prime);
    const alpha = alphaOverride * (node.active ? 0.9 : 0.58);
    const r = node.radius * (1 + 0.035 * Math.sin(node.phase * node.prime));
    const glow = node.resonate > 0 ? 26 : node.active ? 18 : 10;
    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.rotate(node.phase * 0.35);
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = glow;
    ctx.shadowColor = "hsla(" + hue + ",95%,65%," + (alpha * 0.7) + ")";
    ctx.strokeStyle = "hsla(" + hue + ",92%,72%," + alpha + ")";
    ctx.lineWidth = node.active ? 2.1 : 1.35;
    ctx.beginPath();
    for (let i = 0; i <= node.prime; i++) {
      const a = i / node.prime * TAU;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    if (node.active) {
      ctx.rotate(-node.phase * 0.7);
      ctx.strokeStyle = "hsla(" + hue + ",100%,82%," + (alpha * 0.42) + ")";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.55, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();

    if (showLabel) {
      ctx.fillStyle = "hsla(" + hue + ",100%,88%," + (0.4 + alpha * 0.45) + ")";
      ctx.font = "700 12px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(node.prime), node.x, node.y + 4);
    }

    if (node.reject > 0.05) {
      ctx.strokeStyle = "rgba(220,232,240," + node.reject * 0.42 + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 22 + (1 - node.reject) * 18, 0, TAU);
      ctx.stroke();
    }
  }

  function drawDamagedCompanion(x, y) {
    const hue = primeHue(5);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(gameTime * 0.12);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "hsla(" + hue + ",80%,72%,0.42)";
    ctx.lineWidth = 1.6;
    ctx.setLineDash([18, 8]);
    const points = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * TAU / 5;
      points.push([Math.cos(a) * 76, Math.sin(a) * 76]);
    }
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(0, 0, 10 + Math.sin(gameTime * 2) * 2, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawCompanion() {
    if (!state.companionRepaired) return;
    const c = state.companion;
    const hue = primeHue(5);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.phase);
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = 22;
    ctx.shadowColor = "hsla(" + hue + ",90%,70%,0.8)";
    ctx.strokeStyle = "hsla(" + hue + ",96%,80%,0.82)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const a = i / 5 * TAU;
      const x = Math.cos(a) * 24;
      const y = Math.sin(a) * 24;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "rgba(245,235,255,0.85)";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawExitGlyph() {
    const x = 3370;
    const y = 900;
    const active = state.companionRepaired;
    const alpha = active ? 0.72 : 0.1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(gameTime * 0.12);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(215,235,255," + alpha + ")";
    ctx.lineWidth = active ? 2 : 1;
    for (let ring = 0; ring < 3; ring++) {
      ctx.beginPath();
      ctx.arc(0, 0, 34 + ring * 22 + Math.sin(gameTime + ring) * 3, 0, TAU);
      ctx.stroke();
    }
    ctx.rotate(-gameTime * 0.25);
    ctx.strokeRect(-31, -31, 62, 62);
    ctx.restore();
  }

  function drawTrail() {
    if (player.trail.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (let i = 1; i < player.trail.length; i++) {
      const p0 = player.trail[i - 1];
      const p1 = player.trail[i];
      const t = i / player.trail.length;
      ctx.strokeStyle = "rgba(105,220,255," + t * 0.11 + ")";
      ctx.lineWidth = 0.8 + t * 1.8;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWaves() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const wave of state.waves) {
      const hue = primeHue(wave.prime);
      ctx.strokeStyle = "hsla(" + hue + ",95%,72%," + wave.alpha * 0.43 + ")";
      ctx.lineWidth = 5;
      ctx.shadowBlur = 16;
      ctx.shadowColor = "hsla(" + hue + ",95%,65%,0.7)";
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.r, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 1;
      for (let i = 0; i < wave.prime; i++) {
        const a = i / wave.prime * TAU + gameTime * 0.15;
        const x = wave.x + Math.cos(a) * wave.r;
        const y = wave.y + Math.sin(a) * wave.r;
        ctx.fillStyle = "hsla(" + hue + ",100%,85%," + wave.alpha * 0.75 + ")";
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawBursts() {
    for (const burst of state.bursts) {
      const t = burst.age / burst.duration;
      const alpha = Math.max(0, 1 - t);
      const hue = primeHue(burst.prime);
      ctx.strokeStyle = burst.kind === "reject"
        ? "rgba(225,235,242," + alpha * 0.34 + ")"
        : "hsla(" + hue + ",100%,78%," + alpha * 0.55 + ")";
      ctx.lineWidth = burst.kind === "friend" ? 1 : 2;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, 28 + t * (burst.kind === "friend" ? 110 : 72), 0, TAU);
      ctx.stroke();
    }
  }

  function drawPlayer() {
    const prime = PRIMES[player.freqIndex];
    const hue = primeHue(prime);
    const speed = Math.hypot(player.vx, player.vy);
    const angle = Math.atan2(player.vy, player.vx);
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(angle);
    const stretch = 1 + Math.min(0.5, speed / player.speed * 0.42);
    ctx.scale(stretch, 1 / Math.sqrt(stretch));
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = 24;
    ctx.shadowColor = "hsla(" + hue + ",100%,70%,1)";
    ctx.fillStyle = "hsla(" + hue + ",100%,84%,0.96)";
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(gameTime * 0.25);
    ctx.strokeStyle = "hsla(" + hue + ",100%,75%,0.28)";
    ctx.beginPath();
    for (let i = 0; i <= prime; i++) {
      const a = i / prime * TAU;
      const x = Math.cos(a) * 22;
      const y = Math.sin(a) * 22;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "hsla(" + hue + ",100%,90%,0.78)";
    ctx.font = "700 10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("f=" + prime, player.x, player.y - 34);
  }

  function loop(now) {
    const dt = Math.min(0.033, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  addEventListener("resize", resize);
  addEventListener("keydown", event => {
    if (!running || state.complete) return;
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
      keys.add(event.code);
    }
    if (event.code === "Space") { event.preventDefault(); emitWave(); }
    if (event.code === "KeyQ") { event.preventDefault(); changeFrequency(-1); }
    if (event.code === "KeyE") { event.preventDefault(); changeFrequency(1); }
  });
  addEventListener("keyup", event => keys.delete(event.code));

  startButton.addEventListener("click", startAdventure);
  replayButton.addEventListener("click", () => {
    completePanel.classList.remove("visible");
    startAdventure();
  });

  resize();
  draw();
  requestAnimationFrame(loop);
})();
