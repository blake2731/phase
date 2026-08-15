(() => {
  "use strict";

  const startButton = document.getElementById("startButton");
  const startScreen = document.getElementById("startScreen");
  const tutorial = document.getElementById("tutorial");
  const canvas = document.getElementById("tutorialWorld");
  const ctx = canvas.getContext("2d");
  const lessonNumber = document.getElementById("lessonNumber");
  const lessonTitle = document.getElementById("lessonTitle");
  const lessonFormula = document.getElementById("lessonFormula");
  const lessonMeaning = document.getElementById("lessonMeaning");
  const lessonObjective = document.getElementById("lessonObjective");
  const lessonStatus = document.getElementById("lessonStatus");
  const knownList = document.getElementById("knownList");
  const hud = document.getElementById("hud");
  const help = document.getElementById("help");

  const TAU = Math.PI * 2;
  const PRIMES = [2, 3, 5, 7, 11, 13];

  let W = innerWidth;
  let H = innerHeight;
  let DPR = Math.min(devicePixelRatio || 1, 2);
  let active = false;
  let bypassStart = false;
  let last = performance.now();
  let lesson = 0;
  let lessonStarted = 0;
  let transitionPending = false;
  let audio = null;

  const keys = new Set();
  const player = {
    x: 0.5,
    y: 0.55,
    vx: 0,
    vy: 0,
    frequencyIndex: 0,
    trail: []
  };

  const state = {
    originX: 0.5,
    originY: 0.55,
    target: { x: 0.68, y: 0.55, r: 0.035 },
    secondTarget: { x: 0.32, y: 0.36, r: 0.035 },
    speedReached: false,
    emittedWave: false,
    mismatchTried: false,
    selectedThree: false,
    resonanceHits: 0,
    generalTargets: [],
    waves: [],
    rejectionBursts: [],
    resonanceBursts: []
  };

  const LESSONS = [
    {
      title: "POSITION",
      formula: "P = (x, y)",
      meaning: "A point needs only two numbers to say where it is. Right now, position is almost everything you know.",
      objective: "Move into the faint circle using WASD or the arrow keys.",
      known: "position"
    },
    {
      title: "DISTANCE",
      formula: "d = √((x₂ − x₁)² + (y₂ − y₁)²)",
      meaning: "Distance measures separation between positions. The line on screen is not decoration. Its length is the quantity in the equation.",
      objective: "Move into the new circle and watch the measured distance change.",
      known: "distance"
    },
    {
      title: "VELOCITY",
      formula: "v = ΔP / Δt",
      meaning: "Velocity combines speed with direction. The arrow shows the direction of your motion. Its length shows how fast you are moving.",
      objective: "Build visible speed, then release the controls and come nearly to rest.",
      known: "velocity"
    },
    {
      title: "WAVE",
      formula: "A(r,t) = sin(kr − ωt)",
      meaning: "A disturbance can move through a field even when you do not travel with it. Your pulse is an expanding wavefront.",
      objective: "Press Space once and watch the disturbance propagate.",
      known: "wave"
    },
    {
      title: "FREQUENCY",
      formula: "f = cycles / time",
      meaning: "Frequency describes how quickly a repeating system cycles. Your active frequency is 2. The training structure has a natural mode of 3.",
      objective: "First pulse the 3 structure while your frequency is 2. Then use Q or E to select frequency 3.",
      known: "frequency"
    },
    {
      title: "RESONANCE",
      formula: "f_drive = f_natural",
      meaning: "When the driving frequency matches a natural mode, energy transfer becomes strong. In PHASE, mismatched modes can perturb a structure, but they do not damage its stability.",
      objective: "With frequency 3 selected, land two pulses on the 3 structure.",
      known: "resonance"
    },
    {
      title: "MODE COUPLING",
      formula: "match mode → transfer energy",
      meaning: "Different structures respond to different modes. Spamming one frequency is not enough. Observation and switching are part of combat.",
      objective: "Collapse both training structures by matching 3 to 3 and 5 to 5.",
      known: "coupling"
    },
    {
      title: "THE FIELD OPENS",
      formula: "knowledge → possibility",
      meaning: "You know enough to survive the first layer of this world. More of its mathematics will become visible only when you are ready to use it.",
      objective: "Press Space when you are ready to enter the active field.",
      known: "agency"
    }
  ];

  function resize() {
    W = innerWidth;
    H = innerHeight;
    DPR = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function ensureAudio() {
    if (!audio) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audio = new AudioContext();
    }
    if (audio && audio.state === "suspended") audio.resume();
  }

  function tone(frequency, duration = 0.12, gainValue = 0.025, type = "sine") {
    if (!audio) return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function primeHue(prime) {
    const map = { 2: 190, 3: 205, 5: 248, 7: 286, 11: 328, 13: 34 };
    return map[prime] ?? 195;
  }

  function resetTutorial() {
    lesson = 0;
    transitionPending = false;
    player.x = 0.5;
    player.y = 0.55;
    player.vx = 0;
    player.vy = 0;
    player.frequencyIndex = 0;
    player.trail.length = 0;
    state.originX = player.x;
    state.originY = player.y;
    state.target = { x: 0.68, y: 0.55, r: 0.035 };
    state.secondTarget = { x: 0.32, y: 0.36, r: 0.035 };
    state.speedReached = false;
    state.emittedWave = false;
    state.mismatchTried = false;
    state.selectedThree = false;
    state.resonanceHits = 0;
    state.generalTargets = [];
    state.waves.length = 0;
    state.rejectionBursts.length = 0;
    state.resonanceBursts.length = 0;
    knownList.innerHTML = "";
    setLesson(0, true);
  }

  function setLesson(index, first = false) {
    lesson = index;
    lessonStarted = performance.now();
    transitionPending = false;
    const data = LESSONS[index];
    lessonNumber.textContent = String(index + 1).padStart(2, "0") + " / " + String(LESSONS.length).padStart(2, "0");
    lessonTitle.textContent = data.title;
    lessonFormula.textContent = data.formula;
    lessonMeaning.textContent = data.meaning;
    lessonObjective.textContent = data.objective;
    lessonStatus.textContent = "TRY IT";
    lessonStatus.className = "lessonStatus";

    if (!first && index > 0) addKnown(LESSONS[index - 1].known);
    if (index === 1) {
      state.originX = player.x;
      state.originY = player.y;
    }
    if (index === 4) {
      player.frequencyIndex = 0;
      state.generalTargets = [makeTarget(3, 0.73, 0.47, 2)];
    }
    if (index === 5) {
      const target = state.generalTargets[0];
      if (target) {
        target.stability = 2;
        target.maxStability = 2;
        target.collapsed = false;
      }
    }
    if (index === 6) {
      state.generalTargets = [
        makeTarget(3, 0.7, 0.38, 1),
        makeTarget(5, 0.73, 0.67, 1)
      ];
    }
    if (index === 7) {
      state.generalTargets = [];
      addKnown(LESSONS[6].known);
    }
    tone(130 + index * 18, 0.18, 0.018, "sine");
  }

  function addKnown(text) {
    if ([...knownList.children].some(node => node.textContent === text)) return;
    const item = document.createElement("span");
    item.textContent = text;
    knownList.appendChild(item);
  }

  function makeTarget(prime, x, y, stability) {
    return {
      prime,
      x,
      y,
      radius: 32 + prime * 0.6,
      stability,
      maxStability: stability,
      phase: Math.random() * TAU,
      collapsed: false,
      reject: 0,
      resonate: 0
    };
  }

  function completeLesson(message) {
    if (transitionPending) return;
    transitionPending = true;
    lessonStatus.textContent = message || "UNDERSTOOD";
    lessonStatus.className = "lessonStatus complete";
    tone(330, 0.14, 0.022, "triangle");
    setTimeout(() => tone(440, 0.18, 0.018, "triangle"), 70);
    window.setTimeout(() => {
      if (!active) return;
      if (lesson < LESSONS.length - 1) setLesson(lesson + 1);
    }, 1550);
  }

  function begin() {
    ensureAudio();
    startScreen.classList.remove("visible");
    hud.classList.add("storyHidden");
    help.classList.add("storyHidden");
    tutorial.classList.add("visible");
    active = true;
    last = performance.now();
    resetTutorial();
  }

  function finish() {
    if (!active) return;
    addKnown(LESSONS[7].known);
    active = false;
    tutorial.classList.add("departing");
    hud.classList.remove("storyHidden");
    help.classList.remove("storyHidden");
    window.setTimeout(() => {
      tutorial.classList.remove("visible", "departing");
      bypassStart = true;
      startButton.click();
      bypassStart = false;
    }, 900);
  }

  function emitWave() {
    if (!active) return;
    const prime = PRIMES[player.frequencyIndex];
    state.waves.push({
      x: player.x,
      y: player.y,
      radius: 0,
      speed: 0.55,
      prime,
      alpha: 1,
      hit: new Set()
    });
    tone(130 + prime * 22, 0.11, 0.025, "sine");
    if (lesson === 3 && !state.emittedWave) {
      state.emittedWave = true;
      completeLesson("WAVE OBSERVED");
    }
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

    const response = lesson >= 2 ? 8 : 14;
    const maxSpeed = lesson >= 2 ? 0.34 : 0.27;
    player.vx += (ix * maxSpeed - player.vx) * (1 - Math.exp(-response * dt));
    player.vy += (iy * maxSpeed - player.vy) * (1 - Math.exp(-response * dt));
    player.x = Math.max(0.07, Math.min(0.93, player.x + player.vx * dt));
    player.y = Math.max(0.1, Math.min(0.9, player.y + player.vy * dt));

    if (Math.hypot(player.vx, player.vy) > 0.002) {
      player.trail.push({ x: player.x, y: player.y });
      while (player.trail.length > 110) player.trail.shift();
    }

    const readable = performance.now() - lessonStarted > 1700;
    if (lesson === 0 && readable) {
      const d = Math.hypot(player.x - state.target.x, player.y - state.target.y);
      if (d < state.target.r) completeLesson("POSITION CHANGED");
    }
    if (lesson === 1 && readable) {
      const d = Math.hypot(player.x - state.secondTarget.x, player.y - state.secondTarget.y);
      if (d < state.secondTarget.r) completeLesson("DISTANCE MEASURED");
    }
    if (lesson === 2 && readable) {
      const speed = Math.hypot(player.vx, player.vy);
      if (speed > 0.19) state.speedReached = true;
      if (state.speedReached && speed < 0.025 && !ix && !iy) completeLesson("VELOCITY OBSERVED");
    }
  }

  function updateWaves(dt) {
    for (let i = state.waves.length - 1; i >= 0; i--) {
      const wave = state.waves[i];
      wave.radius += wave.speed * dt;
      wave.alpha = Math.max(0, 1 - wave.radius / 0.82);

      for (const target of state.generalTargets) {
        if (target.collapsed || wave.hit.has(target)) continue;
        const d = Math.hypot(target.x - wave.x, target.y - wave.y);
        const normalizedRadius = target.radius / Math.min(W, H);
        if (Math.abs(d - wave.radius) > normalizedRadius + 0.012) continue;
        wave.hit.add(target);
        const exact = wave.prime === target.prime;

        if (exact) {
          target.resonate = 1;
          state.resonanceBursts.push({ x: target.x, y: target.y, age: 0, hue: primeHue(target.prime) });
          if (lesson >= 5) {
            target.stability -= 1;
            if (lesson === 5) {
              state.resonanceHits += 1;
              lessonStatus.textContent = "RESONANT HITS  " + state.resonanceHits + " / 2";
              lessonStatus.className = "lessonStatus active";
            }
          }
          tone(240 + target.prime * 24, 0.14, 0.034, "triangle");
          if (target.stability <= 0) {
            target.collapsed = true;
            tone(90 + target.prime * 8, 0.26, 0.04, "sawtooth");
          }
        } else {
          target.reject = 1;
          state.rejectionBursts.push({ x: target.x, y: target.y, age: 0, hue: primeHue(wave.prime) });
          tone(82, 0.09, 0.018, "sine");
          if (lesson === 4) {
            state.mismatchTried = true;
            lessonStatus.textContent = "0 STABILITY DAMAGE  ·  NOW MATCH 3";
            lessonStatus.className = "lessonStatus rejected";
          }
        }
      }

      if (wave.radius > 0.82) state.waves.splice(i, 1);
    }

    for (const target of state.generalTargets) {
      target.phase += dt * (0.8 + 2 / target.prime);
      target.reject *= Math.pow(0.025, dt);
      target.resonate *= Math.pow(0.04, dt);
    }
    for (let i = state.rejectionBursts.length - 1; i >= 0; i--) {
      state.rejectionBursts[i].age += dt;
      if (state.rejectionBursts[i].age > 0.8) state.rejectionBursts.splice(i, 1);
    }
    for (let i = state.resonanceBursts.length - 1; i >= 0; i--) {
      state.resonanceBursts[i].age += dt;
      if (state.resonanceBursts[i].age > 0.9) state.resonanceBursts.splice(i, 1);
    }

    if (lesson === 4 && state.mismatchTried && PRIMES[player.frequencyIndex] === 3 && !transitionPending) {
      state.selectedThree = true;
      completeLesson("FREQUENCY MATCHED");
    }
    if (lesson === 5 && state.resonanceHits >= 2 && !transitionPending) completeLesson("RESONANCE TRANSFERS ENERGY");
    if (lesson === 6 && state.generalTargets.length && state.generalTargets.every(target => target.collapsed) && !transitionPending) completeLesson("MODES UNDERSTOOD");
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const gradient = ctx.createRadialGradient(W * 0.5, H * 0.52, 20, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
    gradient.addColorStop(0, "rgba(7,17,31,0.98)");
    gradient.addColorStop(1, "rgba(2,4,10,1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    drawKnowledgeField();
    drawLessonGeometry();
    drawTrail();
    drawTargets();
    drawWaves();
    drawPlayer();
  }

  function drawKnowledgeField() {
    const reveal = lesson / (LESSONS.length - 1);
    const spacing = 72;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(90,160,205," + (0.015 + reveal * 0.045) + ")";
    ctx.beginPath();
    for (let x = spacing / 2; x < W; x += spacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = spacing / 2; y < H; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    if (lesson >= 3) {
      const gap = 66;
      const px = player.x * W;
      const py = player.y * H;
      for (let y = gap / 2; y < H; y += gap) {
        for (let x = gap / 2; x < W; x += gap) {
          const d = Math.hypot(x - px, y - py);
          const amp = Math.sin(d * 0.035 - performance.now() * 0.002) * Math.exp(-d / 430);
          ctx.fillStyle = "rgba(105,210,245," + (0.025 + Math.abs(amp) * 0.07) + ")";
          ctx.beginPath();
          ctx.arc(x, y, 0.8 + Math.abs(amp) * 1.4, 0, TAU);
          ctx.fill();
        }
      }
    }
  }

  function drawLessonGeometry() {
    if (lesson === 0) drawTargetCircle(state.target);
    if (lesson === 1) {
      drawTargetCircle(state.secondTarget);
      const ox = state.originX * W;
      const oy = state.originY * H;
      const px = player.x * W;
      const py = player.y * H;
      ctx.strokeStyle = "rgba(130,225,255,0.32)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.setLineDash([]);
      const d = Math.hypot(player.x - state.originX, player.y - state.originY);
      ctx.fillStyle = "rgba(215,245,255,0.72)";
      ctx.font = "12px ui-monospace, monospace";
      ctx.fillText("d = " + d.toFixed(3), (ox + px) / 2 + 8, (oy + py) / 2 - 8);
    }
    if (lesson === 2) {
      const px = player.x * W;
      const py = player.y * H;
      const scale = 280;
      const ex = px + player.vx * scale;
      const ey = py + player.vy * scale;
      ctx.strokeStyle = "rgba(130,235,255,0.62)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      const speed = Math.hypot(player.vx, player.vy);
      ctx.fillStyle = "rgba(215,245,255,0.78)";
      ctx.font = "12px ui-monospace, monospace";
      ctx.fillText("|v| = " + speed.toFixed(3), px + 18, py - 22);
    }
  }

  function drawTargetCircle(target) {
    ctx.strokeStyle = "rgba(135,220,255,0.26)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.arc(target.x * W, target.y * H, target.r * Math.min(W, H), 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawTrail() {
    if (player.trail.length < 2) return;
    ctx.lineCap = "round";
    for (let i = 1; i < player.trail.length; i++) {
      const a = i / player.trail.length;
      ctx.strokeStyle = "rgba(90,220,255," + (a * 0.16) + ")";
      ctx.lineWidth = 0.7 + a * 2;
      ctx.beginPath();
      ctx.moveTo(player.trail[i - 1].x * W, player.trail[i - 1].y * H);
      ctx.lineTo(player.trail[i].x * W, player.trail[i].y * H);
      ctx.stroke();
    }
  }

  function drawTargets() {
    for (const target of state.generalTargets) {
      if (target.collapsed) continue;
      const x = target.x * W;
      const y = target.y * H;
      const hue = primeHue(target.prime);
      const radius = target.radius;
      const points = Math.max(36, target.prime * 10);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(target.phase);
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowBlur = 14 + target.resonate * 18;
      ctx.shadowColor = "hsla(" + hue + ",90%,65%,0.65)";
      ctx.strokeStyle = "hsla(" + hue + ",94%,72%,0.72)";
      ctx.lineWidth = 1.5 + target.resonate * 1.7;
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const theta = TAU * i / points;
        const radial = radius * (0.82 + 0.18 * Math.sin(target.prime * theta));
        const px = Math.cos(theta) * radial;
        const py = Math.sin(theta) * radial;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "rgba(240,248,255,0.9)";
      ctx.font = "700 14px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(target.prime), x, y);

      if (lesson >= 5) {
        const ratio = target.stability / target.maxStability;
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(x - 34, y + radius + 14, 68, 3);
        ctx.fillStyle = "hsla(" + hue + ",90%,72%,0.7)";
        ctx.fillRect(x - 34, y + radius + 14, 68 * Math.max(0, ratio), 3);
      }

      if (target.reject > 0.02) {
        ctx.strokeStyle = "rgba(210,225,235," + target.reject * 0.5 + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius * (1.35 + 0.15 * (1 - target.reject)), 0, TAU);
        ctx.stroke();
        ctx.fillStyle = "rgba(225,235,242," + target.reject * 0.78 + ")";
        ctx.font = "700 11px ui-monospace, monospace";
        ctx.fillText("NO COUPLING", x, y - radius - 18);
      }
    }
  }

  function drawWaves() {
    for (const wave of state.waves) {
      const hue = primeHue(wave.prime);
      const px = wave.x * W;
      const py = wave.y * H;
      const radius = wave.radius * Math.min(W, H);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "hsla(" + hue + ",96%,72%," + wave.alpha * 0.5 + ")";
      ctx.lineWidth = 5;
      ctx.shadowBlur = 14;
      ctx.shadowColor = "hsla(" + hue + ",96%,65%,0.7)";
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    for (const burst of state.rejectionBursts) {
      const ratio = burst.age / 0.8;
      ctx.strokeStyle = "rgba(220,232,240," + (1 - ratio) * 0.32 + ")";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(burst.x * W, burst.y * H, 34 + ratio * 34, 0, TAU);
      ctx.stroke();
    }

    for (const burst of state.resonanceBursts) {
      const ratio = burst.age / 0.9;
      ctx.strokeStyle = "hsla(" + burst.hue + ",100%,78%," + (1 - ratio) * 0.65 + ")";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(burst.x * W, burst.y * H, 26 + ratio * 60, 0, TAU);
      ctx.stroke();
    }
  }

  function drawPlayer() {
    const prime = PRIMES[player.frequencyIndex];
    const hue = primeHue(prime);
    const x = player.x * W;
    const y = player.y * H;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = 22;
    ctx.shadowColor = "hsla(" + hue + ",100%,70%,0.9)";
    ctx.fillStyle = "hsla(" + hue + ",100%,82%,0.95)";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, TAU);
    ctx.fill();

    if (lesson >= 4) {
      ctx.strokeStyle = "hsla(" + hue + ",100%,75%,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "hsla(" + hue + ",100%,88%,0.9)";
      ctx.font = "700 12px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("f=" + prime, x, y - 27);
    }
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
    last = now;
    if (active) {
      updateMovement(dt);
      updateWaves(dt);
      draw();
    }
    requestAnimationFrame(frame);
  }

  startButton.addEventListener("click", event => {
    if (bypassStart) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    begin();
  }, true);

  addEventListener("keydown", event => {
    if (!active) return;
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
      keys.add(event.code);
    }
    if (event.code === "Space") {
      event.preventDefault();
      if (lesson === 7) finish();
      else if (lesson >= 3) emitWave();
    }
    if (lesson >= 4 && (event.code === "KeyQ" || event.code === "KeyE")) {
      event.preventDefault();
      const direction = event.code === "KeyE" ? 1 : -1;
      player.frequencyIndex = (player.frequencyIndex + direction + PRIMES.length) % PRIMES.length;
      tone(170 + PRIMES[player.frequencyIndex] * 20, 0.06, 0.018, "triangle");
      if (lesson === 4 && state.mismatchTried) {
        lessonStatus.textContent = "ACTIVE FREQUENCY  " + PRIMES[player.frequencyIndex];
        lessonStatus.className = "lessonStatus active";
      }
    }
  }, true);

  addEventListener("keyup", event => keys.delete(event.code), true);
  addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
})();
