(() => {
  "use strict";

  const startButton = document.getElementById("startButton");
  const startScreen = document.getElementById("startScreen");
  const prologue = document.getElementById("prologue");
  const storyWorld = document.getElementById("storyWorld");
  const worldCtx = storyWorld.getContext("2d");
  const prologuePoint = document.getElementById("prologuePoint");
  const prologueTrail = document.getElementById("prologueTrail");
  const prologueText = document.getElementById("prologueText");
  const prologueFormula = document.getElementById("prologueFormula");
  const prologueHint = document.getElementById("prologueHint");
  const storyMemory = document.getElementById("storyMemory");
  const storyChoice = document.getElementById("storyChoice");
  const hud = document.getElementById("hud");
  const help = document.getElementById("help");

  const TAU = Math.PI * 2;
  const STORY = Object.freeze({
    TITLE: 0,
    POINT: 1,
    MOTION: 2,
    VELOCITY: 3,
    DISTANCE: 4,
    FIELD: 5,
    OTHER: 6,
    OSCILLATION: 7,
    STRATEGY: 8,
    INTERFERENCE: 9,
    COMPLETE: 10
  });

  const STAGE_CLASS = [
    "title",
    "point",
    "motion",
    "velocity",
    "distance",
    "field",
    "other",
    "oscillation",
    "strategy",
    "interference",
    "complete"
  ];

  const state = {
    stage: STORY.TITLE,
    active: false,
    bypassStartIntercept: false,
    x: 50,
    y: 50,
    vx: 0,
    vy: 0,
    originX: 50,
    originY: 50,
    pathDistance: 0,
    displacement: 0,
    trail: [],
    keys: new Set(),
    lastFrame: performance.now(),
    stageStarted: 0,
    discoveries: [],
    knowledge: 0,
    entity: {
      visible: false,
      x: 79,
      y: 34,
      prime: 5,
      phase: 0,
      pulse: 0,
      cycle: 2.4,
      lastPulseAt: 0,
      response: "unknown"
    },
    waves: [],
    choiceAttempts: 0,
    transitionTimer: null,
    audio: null
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function ensureAudio() {
    if (!state.audio) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) state.audio = new AudioContext();
    }
    if (state.audio && state.audio.state === "suspended") state.audio.resume();
  }

  function tone(frequency, duration = 0.16, volume = 0.025, type = "sine", delay = 0) {
    if (!state.audio) return;
    const now = state.audio.currentTime + delay;
    const oscillator = state.audio.createOscillator();
    const gain = state.audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(state.audio.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function discoveryChord(root, ratios) {
    ratios.forEach((ratio, index) => {
      tone(root * ratio, 0.38, 0.016, "sine", index * 0.035);
    });
  }

  function setStage(stage) {
    state.stage = stage;
    state.stageStarted = performance.now();
    prologue.dataset.stage = STAGE_CLASS[stage] || "unknown";
    state.knowledge = stage / STORY.COMPLETE;
  }

  function setDiscovery(title, formula = "", hint = "", memory = "") {
    prologueText.textContent = title;
    prologueFormula.textContent = formula;
    prologueHint.textContent = hint;

    prologueText.classList.remove("storyPulse");
    prologueFormula.classList.remove("storyPulse");
    void prologueText.offsetWidth;
    prologueText.classList.add("storyPulse");
    prologueFormula.classList.add("storyPulse");

    if (memory) remember(memory);
  }

  function remember(label) {
    if (state.discoveries.includes(label)) return;
    state.discoveries.push(label);

    const item = document.createElement("div");
    item.className = "storyMemoryItem";
    item.textContent = label;
    storyMemory.appendChild(item);
    requestAnimationFrame(() => item.classList.add("visible"));
  }

  function enterStory() {
    ensureAudio();
    clearTimeout(state.transitionTimer);

    state.active = true;
    state.x = 50;
    state.y = 50;
    state.vx = 0;
    state.vy = 0;
    state.originX = 50;
    state.originY = 50;
    state.pathDistance = 0;
    state.displacement = 0;
    state.trail.length = 0;
    state.keys.clear();
    state.waves.length = 0;
    state.discoveries.length = 0;
    state.choiceAttempts = 0;
    state.entity.visible = false;
    state.entity.phase = 0;
    state.entity.lastPulseAt = performance.now();
    state.entity.response = "unknown";

    prologueTrail.innerHTML = "";
    storyMemory.innerHTML = '<div class="storyMemoryLabel">KNOWN</div>';
    storyChoice.classList.remove("visible", "cooperate", "oppose");
    storyChoice.innerHTML = "";

    startScreen.classList.remove("visible");
    hud.classList.add("storyHidden");
    help.classList.add("storyHidden");
    prologue.classList.add("visible");

    setStage(STORY.POINT);
    updatePoint(true);
    setDiscovery(
      "POSITION DETECTED",
      "P = (x, y)",
      "There is one point. Nothing else has been established.",
      "position"
    );
    discoveryChord(110, [1]);

    state.transitionTimer = window.setTimeout(() => {
      if (!state.active || state.stage !== STORY.POINT) return;
      prologueHint.textContent = "Try to change where the point is.";
    }, 1800);
  }

  function updatePoint(force = false) {
    prologuePoint.style.left = state.x + "%";
    prologuePoint.style.top = state.y + "%";

    if (!force && state.pathDistance < 0.3) return;

    const trailPoint = document.createElement("span");
    trailPoint.style.left = state.x + "%";
    trailPoint.style.top = state.y + "%";
    trailPoint.style.opacity = String(clamp(0.07 + state.knowledge * 0.2, 0.07, 0.3));
    prologueTrail.appendChild(trailPoint);
    state.trail.push(trailPoint);

    while (state.trail.length > 130) {
      const oldest = state.trail.shift();
      oldest.remove();
    }
  }

  function movePoint(dt) {
    if (!state.active || state.stage >= STORY.STRATEGY) return;

    let inputX = 0;
    let inputY = 0;
    for (const code of state.keys) {
      const dir = directionFor(code);
      if (!dir) continue;
      inputX += dir[0];
      inputY += dir[1];
    }

    if (inputX || inputY) {
      const magnitude = Math.hypot(inputX, inputY);
      inputX /= magnitude;
      inputY /= magnitude;
    }

    const acceleration = state.stage < STORY.VELOCITY ? 32 : 45;
    const drag = state.stage < STORY.VELOCITY ? 9.5 : 5.5;
    state.vx += inputX * acceleration * dt;
    state.vy += inputY * acceleration * dt;

    const dragFactor = Math.exp(-drag * dt);
    state.vx *= dragFactor;
    state.vy *= dragFactor;

    const maxSpeed = state.stage < STORY.VELOCITY ? 6.4 : 8.8;
    const speed = Math.hypot(state.vx, state.vy);
    if (speed > maxSpeed) {
      state.vx = state.vx / speed * maxSpeed;
      state.vy = state.vy / speed * maxSpeed;
    }

    const oldX = state.x;
    const oldY = state.y;
    state.x = clamp(state.x + state.vx * dt * 7.5, 6, 94);
    state.y = clamp(state.y + state.vy * dt * 7.5, 8, 92);

    const moved = Math.hypot(state.x - oldX, state.y - oldY);
    if (moved > 0.015) {
      state.pathDistance += moved;
      state.displacement = Math.hypot(state.x - state.originX, state.y - state.originY);
      updatePoint();
    }

    if (state.stage === STORY.POINT && moved > 0.02) {
      setStage(STORY.MOTION);
      setDiscovery(
        "CHANGE DETECTED",
        "ΔP ≠ 0",
        "A position can become another position.",
        "change"
      );
      discoveryChord(110, [1, 3 / 2]);
    }

    if (state.stage === STORY.MOTION && state.pathDistance > 7) {
      setStage(STORY.VELOCITY);
      setDiscovery(
        "DIRECTION EMERGES",
        "v = ΔP / Δt",
        "Motion has magnitude and direction. Momentum now lingers briefly after input.",
        "velocity"
      );
      discoveryChord(110, [1, 3 / 2, 2]);
    }

    if (state.stage === STORY.VELOCITY && state.pathDistance > 18) {
      setStage(STORY.DISTANCE);
      setDiscovery(
        "DISTANCE EXISTS",
        "d = √((x₂ − x₁)² + (y₂ − y₁)²)",
        "Your path and your displacement are not the same thing.",
        "distance"
      );
      discoveryChord(110, [1, 5 / 4, 3 / 2, 2]);
    }

    if (state.stage === STORY.DISTANCE && state.pathDistance > 34) {
      setStage(STORY.FIELD);
      setDiscovery(
        "THE SPACE HAS STATE",
        "Φ = Φ(x, y, t)",
        "Movement changes the field around you. The world is beginning to answer.",
        "field"
      );
      discoveryChord(110, [1, 4 / 3, 3 / 2, 2]);
      state.transitionTimer = window.setTimeout(revealOther, 2800);
    }
  }

  function revealOther() {
    if (!state.active || state.stage !== STORY.FIELD) return;

    setStage(STORY.OTHER);
    state.entity.visible = true;
    state.entity.lastPulseAt = performance.now();
    setDiscovery(
      "ANOTHER SYSTEM",
      "S₅(θ) = S₅(θ + 2π/5)",
      "Its fivefold symmetry repeats under rotation. It is not you.",
      "symmetry"
    );
    discoveryChord(110, [1, 5 / 4, 3 / 2]);

    state.transitionTimer = window.setTimeout(() => {
      if (!state.active || state.stage !== STORY.OTHER) return;
      setStage(STORY.OSCILLATION);
      setDiscovery(
        "IT COMMUNICATES BY CHANGE",
        "A(t) = sin(ωt + φ)",
        "Watch its pulse. Press Space to answer with your own.",
        "oscillation"
      );
    }, 3600);
  }

  function emitStoryWave() {
    if (!state.active || state.stage < STORY.OSCILLATION || state.stage > STORY.STRATEGY) return;

    ensureAudio();
    const now = performance.now();
    state.waves.push({
      x: state.x,
      y: state.y,
      born: now,
      duration: 1750,
      source: "player"
    });
    tone(220, 0.22, 0.026, "sine");

    if (state.stage === STORY.OSCILLATION) {
      setStage(STORY.STRATEGY);
      setDiscovery(
        "TWO SYSTEMS CAN INTERACT",
        "Δφ = φ₁ − φ₂",
        "Timing is now a choice. Pulse with it to align. Pulse between its beats to oppose.",
        "phase"
      );
      return;
    }

    evaluateStrategy(now);
  }

  function evaluateStrategy(now) {
    if (state.stage !== STORY.STRATEGY) return;

    state.choiceAttempts += 1;
    const cycleMs = state.entity.cycle * 1000;
    const elapsed = (now - state.entity.lastPulseAt) % cycleMs;
    let phase = elapsed / cycleMs * TAU;
    phase = Math.abs(Math.atan2(Math.sin(phase), Math.cos(phase)));

    if (phase < Math.PI * 0.34) {
      resolveStrategy("cooperate");
      return;
    }

    if (phase > Math.PI * 0.66) {
      resolveStrategy("oppose");
      return;
    }

    const direction = phase < Math.PI / 2 ? "closer to its pulse" : "farther from its pulse";
    setDiscovery(
      "PHASE DIFFERENCE OBSERVED",
      "Δφ ≈ " + phase.toFixed(2) + " rad",
      "That response was ambiguous. Try again, " + direction + "."
    );
  }

  function resolveStrategy(choice) {
    setStage(STORY.INTERFERENCE);
    state.entity.response = choice;
    localStorage.setItem("phase_first_strategy", choice);

    storyChoice.classList.add("visible", choice);

    if (choice === "cooperate") {
      storyChoice.innerHTML = "<strong>RECIPROCITY</strong><span>Your timing increased the shared amplitude.</span>";
      setDiscovery(
        "CONSTRUCTIVE INTERFERENCE",
        "A = A₁ + A₂",
        "Your actions reinforced one another. Cooperation is now part of this world's history.",
        "cooperation"
      );
      discoveryChord(110, [1, 5 / 4, 3 / 2, 2]);
    } else {
      storyChoice.innerHTML = "<strong>OPPOSITION</strong><span>Your timing reduced the shared amplitude.</span>";
      setDiscovery(
        "DESTRUCTIVE INTERFERENCE",
        "A = A₁ + A₂ ≈ 0",
        "Your actions opposed one another. Conflict is now part of this world's history.",
        "competition"
      );
      tone(110, 0.48, 0.025, "sine");
      tone(116.5, 0.48, 0.02, "sine");
    }

    remember("strategy");

    state.transitionTimer = window.setTimeout(() => {
      if (!state.active || state.stage !== STORY.INTERFERENCE) return;
      setStage(STORY.COMPLETE);
      setDiscovery(
        "A WORLD IS FORMING",
        "knowledge → possibility",
        "You did not receive its rules. You discovered enough rules to enter it.",
        "agency"
      );
      discoveryChord(110, [1, 9 / 8, 5 / 4, 3 / 2, 2]);
      state.transitionTimer = window.setTimeout(completeStory, 3300);
    }, 3600);
  }

  function completeStory() {
    if (!state.active) return;

    state.active = false;
    prologue.classList.add("departing");
    hud.classList.remove("storyHidden");
    help.classList.remove("storyHidden");

    state.bypassStartIntercept = true;
    startButton.click();
    state.bypassStartIntercept = false;

    window.setTimeout(() => {
      prologue.classList.remove("visible", "departing");
      prologue.dataset.stage = "title";
      prologueTrail.innerHTML = "";
      storyChoice.classList.remove("visible", "cooperate", "oppose");
    }, 1900);
  }

  function directionFor(code) {
    switch (code) {
      case "KeyW":
      case "ArrowUp":
        return [0, -1];
      case "KeyS":
      case "ArrowDown":
        return [0, 1];
      case "KeyA":
      case "ArrowLeft":
        return [-1, 0];
      case "KeyD":
      case "ArrowRight":
        return [1, 0];
      default:
        return null;
    }
  }

  function resizeStoryCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    storyWorld.width = Math.floor(window.innerWidth * dpr);
    storyWorld.height = Math.floor(window.innerHeight * dpr);
    storyWorld.style.width = window.innerWidth + "px";
    storyWorld.style.height = window.innerHeight + "px";
    worldCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawWorld(now) {
    if (!state.active) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    worldCtx.clearRect(0, 0, width, height);

    const knowledge = state.knowledge;
    const px = state.x / 100 * width;
    const py = state.y / 100 * height;

    drawUncertainty(width, height, knowledge, now);
    drawCoordinates(width, height, knowledge);
    drawField(width, height, px, py, knowledge, now);
    drawVelocity(px, py);
    drawEntity(width, height, now);
    drawStoryWaves(width, height, now);
  }

  function drawUncertainty(width, height, knowledge, now) {
    const count = 110;
    const disorder = 1 - smoothstep(0.08, 0.72, knowledge);
    const alpha = 0.04 + disorder * 0.11;

    for (let i = 0; i < count; i++) {
      const baseX = ((i * 0.61803398875) % 1) * width;
      const baseY = ((i * 0.41421356237) % 1) * height;
      const driftX = Math.sin(now * 0.00031 + i * 1.77) * 26 * disorder;
      const driftY = Math.cos(now * 0.00027 + i * 1.31) * 26 * disorder;
      const x = baseX + driftX;
      const y = baseY + driftY;
      worldCtx.fillStyle = "rgba(170, 205, 235, " + alpha + ")";
      worldCtx.beginPath();
      worldCtx.arc(x, y, 0.6 + disorder * 0.8, 0, TAU);
      worldCtx.fill();
    }
  }

  function drawCoordinates(width, height, knowledge) {
    const visibility = smoothstep(0.18, 0.52, knowledge);
    if (visibility <= 0.001) return;

    const spacing = 72;
    worldCtx.lineWidth = 1;
    worldCtx.strokeStyle = "rgba(100, 175, 220, " + (visibility * 0.055) + ")";
    worldCtx.beginPath();
    for (let x = width / 2 % spacing; x < width; x += spacing) {
      worldCtx.moveTo(x, 0);
      worldCtx.lineTo(x, height);
    }
    for (let y = height / 2 % spacing; y < height; y += spacing) {
      worldCtx.moveTo(0, y);
      worldCtx.lineTo(width, y);
    }
    worldCtx.stroke();

    worldCtx.strokeStyle = "rgba(180, 225, 250, " + (visibility * 0.09) + ")";
    worldCtx.beginPath();
    worldCtx.moveTo(width / 2, 0);
    worldCtx.lineTo(width / 2, height);
    worldCtx.moveTo(0, height / 2);
    worldCtx.lineTo(width, height / 2);
    worldCtx.stroke();
  }

  function drawField(width, height, px, py, knowledge, now) {
    const visibility = smoothstep(0.35, 0.62, knowledge);
    if (visibility <= 0.001) return;

    const gap = 62;
    for (let y = gap / 2; y < height; y += gap) {
      for (let x = gap / 2; x < width; x += gap) {
        const dx = x - px;
        const dy = y - py;
        const distance = Math.hypot(dx, dy);
        const wave = Math.sin(distance * 0.038 - now * 0.0024);
        const falloff = Math.exp(-distance / 470);
        const amplitude = wave * falloff;
        const radius = 0.7 + Math.abs(amplitude) * 2.2;
        const alpha = visibility * (0.025 + Math.abs(amplitude) * 0.12);
        worldCtx.fillStyle = "rgba(90, 218, 255, " + alpha + ")";
        worldCtx.beginPath();
        worldCtx.arc(x, y, radius, 0, TAU);
        worldCtx.fill();
      }
    }
  }

  function drawVelocity(px, py) {
    if (state.stage < STORY.VELOCITY || state.stage >= STORY.STRATEGY) return;
    const scale = 7;
    const endX = px + state.vx * scale;
    const endY = py + state.vy * scale;
    const speed = Math.hypot(state.vx, state.vy);
    if (speed < 0.2) return;

    worldCtx.strokeStyle = "rgba(150, 235, 255, 0.22)";
    worldCtx.lineWidth = 1;
    worldCtx.beginPath();
    worldCtx.moveTo(px, py);
    worldCtx.lineTo(endX, endY);
    worldCtx.stroke();

    const angle = Math.atan2(endY - py, endX - px);
    worldCtx.beginPath();
    worldCtx.moveTo(endX, endY);
    worldCtx.lineTo(endX - Math.cos(angle - 0.5) * 7, endY - Math.sin(angle - 0.5) * 7);
    worldCtx.moveTo(endX, endY);
    worldCtx.lineTo(endX - Math.cos(angle + 0.5) * 7, endY - Math.sin(angle + 0.5) * 7);
    worldCtx.stroke();
  }

  function drawEntity(width, height, now) {
    if (!state.entity.visible) return;

    const entity = state.entity;
    const elapsed = (now - entity.lastPulseAt) / 1000;
    entity.phase = elapsed / entity.cycle * TAU;

    while (entity.phase >= TAU) {
      entity.phase -= TAU;
      entity.lastPulseAt += entity.cycle * 1000;
      state.waves.push({
        x: entity.x,
        y: entity.y,
        born: now,
        duration: 1900,
        source: "entity"
      });
      tone(275, 0.12, 0.012, "sine");
    }

    let ex = entity.x / 100 * width;
    let ey = entity.y / 100 * height;
    const responseProgress = smoothstep(0, 1, (now - state.stageStarted) / 3200);

    if (entity.response === "cooperate") {
      ex += (state.x / 100 * width - ex) * responseProgress * 0.18;
      ey += (state.y / 100 * height - ey) * responseProgress * 0.18;
    } else if (entity.response === "oppose") {
      ex += Math.sin(now * 0.003) * 12;
      ey += Math.cos(now * 0.0027) * 12;
    }

    const pulse = 1 + 0.08 * Math.sin(entity.phase);
    const baseRadius = 31 * pulse;
    const hue = entity.response === "oppose" ? 18 : entity.response === "cooperate" ? 292 : 275;
    const alpha = state.stage >= STORY.OTHER ? 0.68 : 0.2;

    worldCtx.save();
    worldCtx.translate(ex, ey);
    worldCtx.rotate(now * 0.00016);
    worldCtx.globalCompositeOperation = "lighter";
    worldCtx.shadowBlur = 18;
    worldCtx.shadowColor = "hsla(" + hue + ", 88%, 68%, 0.6)";
    worldCtx.strokeStyle = "hsla(" + hue + ", 90%, 74%, " + alpha + ")";
    worldCtx.lineWidth = 1.4;

    worldCtx.beginPath();
    for (let i = 0; i <= entity.prime; i++) {
      const angle = i / entity.prime * TAU;
      const x = Math.cos(angle) * baseRadius;
      const y = Math.sin(angle) * baseRadius;
      if (i === 0) worldCtx.moveTo(x, y);
      else worldCtx.lineTo(x, y);
    }
    worldCtx.closePath();
    worldCtx.stroke();

    worldCtx.rotate(-now * 0.00037);
    worldCtx.beginPath();
    for (let i = 0; i <= entity.prime * 2; i++) {
      const angle = i / (entity.prime * 2) * TAU;
      const radius = baseRadius * (0.5 + 0.15 * Math.sin(entity.prime * angle + entity.phase));
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) worldCtx.moveTo(x, y);
      else worldCtx.lineTo(x, y);
    }
    worldCtx.closePath();
    worldCtx.stroke();
    worldCtx.restore();
  }

  function drawStoryWaves(width, height, now) {
    for (let i = state.waves.length - 1; i >= 0; i--) {
      const wave = state.waves[i];
      const age = now - wave.born;
      const t = age / wave.duration;
      if (t >= 1) {
        state.waves.splice(i, 1);
        continue;
      }

      const x = wave.x / 100 * width;
      const y = wave.y / 100 * height;
      const radius = t * Math.max(width, height) * 0.42;
      const alpha = (1 - t) * 0.34;
      const hue = wave.source === "player" ? 192 : state.entity.response === "oppose" ? 18 : 282;

      worldCtx.save();
      worldCtx.globalCompositeOperation = "lighter";
      worldCtx.strokeStyle = "hsla(" + hue + ", 92%, 72%, " + alpha + ")";
      worldCtx.lineWidth = 1.6;
      worldCtx.beginPath();
      worldCtx.arc(x, y, radius, 0, TAU);
      worldCtx.stroke();
      worldCtx.restore();
    }
  }

  function storyLoop(now) {
    const dt = clamp((now - state.lastFrame) / 1000, 0, 0.04);
    state.lastFrame = now;

    if (state.active) {
      movePoint(dt);
      drawWorld(now);
    }

    requestAnimationFrame(storyLoop);
  }

  startButton.addEventListener("click", event => {
    if (state.bypassStartIntercept) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    enterStory();
  }, true);

  window.addEventListener("keydown", event => {
    if (!state.active) return;

    const dir = directionFor(event.code);
    if (dir) {
      event.preventDefault();
      state.keys.add(event.code);
    }

    if (event.code === "Space" && state.stage >= STORY.OSCILLATION && state.stage <= STORY.STRATEGY) {
      event.preventDefault();
      emitStoryWave();
    }
  }, true);

  window.addEventListener("keyup", event => {
    state.keys.delete(event.code);
  }, true);

  window.addEventListener("resize", resizeStoryCanvas);
  resizeStoryCanvas();
  requestAnimationFrame(storyLoop);
})();
