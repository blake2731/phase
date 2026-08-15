(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });

  const hpBar = document.getElementById("hpBar");
  const hpText = document.getElementById("hpText");
  const freqText = document.getElementById("freqText");
  const scoreText = document.getElementById("scoreText");
  const levelText = document.getElementById("levelText");
  const message = document.getElementById("message");
  const startScreen = document.getElementById("startScreen");
  const startButton = document.getElementById("startButton");
  const upgradeScreen = document.getElementById("upgradeScreen");
  const upgradeChoices = document.getElementById("upgradeChoices");
  const gameOver = document.getElementById("gameOver");
  const finalScore = document.getElementById("finalScore");
  const restartButton = document.getElementById("restartButton");
  const bossReadout = document.getElementById("bossReadout");
  const bossBar = document.getElementById("bossBar");
  const bossText = document.getElementById("bossText");
  const bossPrime = document.getElementById("bossPrime");

  const TAU = Math.PI * 2;
  const PRIMES = [2, 3, 5, 7, 11, 13];
  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false };

  let W = innerWidth;
  let H = innerHeight;
  let DPR = Math.min(devicePixelRatio || 1, 2);
  let running = false;
  let paused = false;
  let lastTime = performance.now();
  let gameTime = 0;
  let enemyId = 0;
  let waveId = 0;
  let spawnTimer = 0;
  let score = 0;
  let kills = 0;
  let level = 1;
  let nextUpgradeAt = 7;
  let bossSpawned = false;
  let bossDefeated = false;
  let shake = 0;
  let flash = 0;
  let audio = null;

  const player = {
    x: W / 2,
    y: H / 2,
    vx: 0,
    vy: 0,
    radius: 6,
    speed: 260,
    maxHp: 100,
    hp: 100,
    freqIndex: 0,
    cooldown: 0,
    cooldownBase: 0.32,
    waveSpeed: 430,
    waveRadius: 480,
    waveDamage: 15,
    resonance: 2.8,
    pulseWidth: 7,
    invuln: 0
  };

  const waves = [];
  const enemies = [];
  const projectiles = [];
  const fragments = [];
  const trail = [];
  const stars = [];
  const fieldNodes = [];

  function resize() {
    W = innerWidth;
    H = innerHeight;
    DPR = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    generateBackground();
  }

  function generateBackground() {
    stars.length = 0;
    fieldNodes.length = 0;

    const seedCount = Math.floor((W * H) / 14000);
    for (let i = 0; i < seedCount; i++) {
      const phi = (i * 1.618033988749895) % 1;
      const psi = (i * 0.7548776662466927) % 1;
      stars.push({
        x: phi * W,
        y: psi * H,
        a: 0.12 + 0.3 * ((Math.sin(i * 12.9898) + 1) * 0.5),
        r: 0.4 + ((i * 7) % 5) * 0.16
      });
    }

    const gap = 76;
    for (let y = gap / 2; y < H; y += gap) {
      for (let x = gap / 2; x < W; x += gap) {
        fieldNodes.push({ x, y });
      }
    }
  }

  function reset() {
    waves.length = 0;
    enemies.length = 0;
    projectiles.length = 0;
    fragments.length = 0;
    trail.length = 0;

    player.x = W / 2;
    player.y = H / 2;
    player.vx = 0;
    player.vy = 0;
    player.maxHp = 100;
    player.hp = 100;
    player.freqIndex = 0;
    player.cooldown = 0;
    player.cooldownBase = 0.32;
    player.waveSpeed = 430;
    player.waveRadius = 480;
    player.waveDamage = 15;
    player.resonance = 2.8;
    player.pulseWidth = 7;
    player.invuln = 0;

    score = 0;
    kills = 0;
    level = 1;
    nextUpgradeAt = 7;
    bossSpawned = false;
    bossDefeated = false;
    spawnTimer = 0.4;
    gameTime = 0;
    shake = 0;
    flash = 0;
    bossReadout.classList.add("hidden");

    for (let i = 0; i < 4; i++) spawnEnemy();
    updateHud();
  }

  function startGame() {
    ensureAudio();
    reset();
    running = true;
    paused = false;
    startScreen.classList.remove("visible");
    gameOver.classList.remove("visible");
    upgradeScreen.classList.remove("visible");
    lastTime = performance.now();
  }

  function ensureAudio() {
    if (!audio) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audio = new Ctx();
    }
    if (audio && audio.state === "suspended") audio.resume();
  }

  function tone(freq, duration = 0.08, gainValue = 0.035, type = "sine") {
    if (!audio) return;
    const now = audio.currentTime;
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

  function emitWave() {
    if (!running || paused || player.cooldown > 0) return;
    ensureAudio();

    const prime = PRIMES[player.freqIndex];
    const frequency = 130 + prime * 22;

    waves.push({
      id: ++waveId,
      x: player.x,
      y: player.y,
      r: 0,
      speed: player.waveSpeed,
      maxR: player.waveRadius,
      prime,
      alpha: 1,
      hit: new Set()
    });

    player.cooldown = player.cooldownBase;
    tone(frequency, 0.11, 0.028, "sine");
  }

  function changeFrequency(dir) {
    if (!running || paused) return;
    player.freqIndex = (player.freqIndex + dir + PRIMES.length) % PRIMES.length;
    const prime = PRIMES[player.freqIndex];
    tone(170 + prime * 20, 0.06, 0.02, "triangle");
    showMessage("Frequency " + prime);
    updateHud();
  }

  function showMessage(text, duration = 750) {
    message.textContent = text;
    message.style.opacity = "1";
    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => {
      message.style.opacity = "0";
    }, duration);
  }

  function spawnEnemy(forcePrime = null) {
    if (enemies.length > 34) return;

    const margin = 90;
    let x, y;
    const edge = Math.floor(Math.random() * 4);

    if (edge === 0) {
      x = Math.random() * W;
      y = -margin;
    } else if (edge === 1) {
      x = W + margin;
      y = Math.random() * H;
    } else if (edge === 2) {
      x = Math.random() * W;
      y = H + margin;
    } else {
      x = -margin;
      y = Math.random() * H;
    }

    const maxPrimeIndex = Math.min(PRIMES.length - 1, 1 + Math.floor(level / 2));
    const prime = forcePrime || PRIMES[Math.floor(Math.random() * (maxPrimeIndex + 1))];
    const radius = 18 + prime * 0.85;
    const hp = 26 + prime * 4 + level * 3;

    enemies.push({
      id: ++enemyId,
      x,
      y,
      vx: 0,
      vy: 0,
      radius,
      prime,
      phase: Math.random() * TAU,
      rotation: (Math.random() < 0.5 ? -1 : 1) * (0.32 + 1 / prime),
      hp,
      maxHp: hp,
      speed: 38 + Math.min(48, level * 2.2) + 30 / Math.sqrt(prime),
      shotTimer: 1.3 + Math.random() * 2,
      age: 0,
      destabilize: 0,
      boss: false
    });
  }

  function spawnBoss() {
    bossSpawned = true;
    const hp = 920;
    enemies.push({
      id: ++enemyId,
      x: W / 2,
      y: -130,
      vx: 0,
      vy: 0,
      radius: 72,
      prime: 3,
      phase: 0,
      rotation: 0.18,
      hp,
      maxHp: hp,
      speed: 24,
      shotTimer: 1.0,
      age: 0,
      destabilize: 0,
      boss: true,
      cycles: [3, 5, 7],
      cycleIndex: 0
    });
    bossReadout.classList.remove("hidden");
    showMessage("Primorial entity detected", 1700);
    tone(70, 0.6, 0.055, "sawtooth");
  }

  function fireEnemy(enemy) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const base = Math.atan2(dy, dx);
    const count = enemy.boss ? enemy.prime : Math.min(5, Math.max(1, Math.floor(enemy.prime / 3)));

    for (let i = 0; i < count; i++) {
      const spread = enemy.boss ? 0.22 : 0.13;
      const angle = base + (i - (count - 1) / 2) * spread;
      const speed = enemy.boss ? 190 : 145 + level * 3;
      projectiles.push({
        x: enemy.x,
        y: enemy.y,
        px: enemy.x,
        py: enemy.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 5,
        prime: enemy.prime,
        radius: enemy.boss ? 4 : 3,
        hostile: true
      });
    }
  }

  function damageEnemy(enemy, wave) {
    if (wave.hit.has(enemy.id)) return;

    const distance = Math.hypot(enemy.x - wave.x, enemy.y - wave.y);
    if (Math.abs(distance - wave.r) > enemy.radius + player.pulseWidth * 1.5) return;

    wave.hit.add(enemy.id);

    const exact = wave.prime === enemy.prime;
    const ratio = Math.max(wave.prime, enemy.prime) / Math.min(wave.prime, enemy.prime);
    const harmonic = !exact && Math.abs(ratio - Math.round(ratio)) < 0.06;

    let damage = player.waveDamage;
    if (exact) damage *= player.resonance;
    else if (harmonic) damage *= 1.45;
    else damage *= 0.62;

    enemy.hp -= damage;
    enemy.destabilize = Math.min(1.4, enemy.destabilize + (exact ? 0.8 : 0.24));

    if (exact) {
      showMessage("Resonance × " + player.resonance.toFixed(1), 430);
      tone(240 + enemy.prime * 26, 0.1, 0.035, "triangle");
      shake = Math.max(shake, 3);
    }

    if (enemy.hp <= 0) destroyEnemy(enemy);
  }

  function destroyEnemy(enemy) {
    const index = enemies.indexOf(enemy);
    if (index >= 0) enemies.splice(index, 1);

    const count = enemy.boss ? 80 : 14 + enemy.prime * 2;
    for (let i = 0; i < count; i++) {
      const angle = TAU * i / count + enemy.phase;
      const harmonic = 0.75 + 0.35 * Math.sin(enemy.prime * angle);
      const speed = (enemy.boss ? 190 : 105) * harmonic * (0.7 + Math.random() * 0.7);
      fragments.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7 + Math.random() * 0.9,
        maxLife: 1.6,
        prime: enemy.prime,
        size: enemy.boss ? 3.5 : 2
      });
    }

    shake = Math.max(shake, enemy.boss ? 16 : 7);
    flash = Math.max(flash, enemy.boss ? 0.7 : 0.16);
    tone(enemy.boss ? 52 : 95 + enemy.prime * 7, enemy.boss ? 0.8 : 0.18, enemy.boss ? 0.08 : 0.04, "sawtooth");

    if (enemy.boss) {
      bossDefeated = true;
      bossReadout.classList.add("hidden");
      score += 5000;
      showMessage("Primorial phase collapsed", 2500);
    } else {
      kills += 1;
      score += 100 + enemy.prime * 18;
      if (kills >= nextUpgradeAt) openUpgrade();
    }

    updateHud();
  }

  function openUpgrade() {
    paused = true;
    level += 1;
    nextUpgradeAt += 7 + Math.floor(level * 0.7);

    const choices = shuffle([
      {
        name: "Amplitude",
        desc: "Increase wave damage by 32 percent.",
        apply: () => { player.waveDamage *= 1.32; }
      },
      {
        name: "Propagation",
        desc: "Increase wave speed and maximum radius.",
        apply: () => { player.waveSpeed *= 1.16; player.waveRadius *= 1.12; }
      },
      {
        name: "Phase Control",
        desc: "Emit waves more frequently.",
        apply: () => { player.cooldownBase = Math.max(0.13, player.cooldownBase * 0.84); }
      },
      {
        name: "Resonance",
        desc: "Matched frequencies destabilize enemies more violently.",
        apply: () => { player.resonance += 0.55; }
      },
      {
        name: "Integrity",
        desc: "Increase maximum integrity and repair the field point.",
        apply: () => {
          player.maxHp += 24;
          player.hp = Math.min(player.maxHp, player.hp + 40);
        }
      },
      {
        name: "Wavefront",
        desc: "Thicken the wavefront so collisions are easier to achieve.",
        apply: () => { player.pulseWidth += 2.3; }
      }
    ]).slice(0, 3);

    upgradeChoices.innerHTML = "";
    choices.forEach((choice, i) => {
      const div = document.createElement("div");
      div.className = "upgrade";
      div.innerHTML =
        '<div class="key">' + (i + 1) + '</div>' +
        '<h3>' + choice.name + '</h3>' +
        '<p>' + choice.desc + '</p>';
      div.addEventListener("click", () => selectUpgrade(choice));
      upgradeChoices.appendChild(div);
      choice.key = String(i + 1);
    });

    openUpgrade.choices = choices;
    upgradeScreen.classList.add("visible");
    updateHud();
  }

  function selectUpgrade(choice) {
    choice.apply();
    paused = false;
    upgradeScreen.classList.remove("visible");
    showMessage(choice.name + " integrated", 1000);
    tone(330, 0.12, 0.03, "triangle");
    setTimeout(() => tone(440, 0.15, 0.025, "triangle"), 70);
    updateHud();
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function playerHit(amount) {
    if (player.invuln > 0) return;
    player.hp -= amount;
    player.invuln = 0.5;
    shake = Math.max(shake, 10);
    flash = Math.max(flash, 0.35);
    tone(58, 0.18, 0.055, "square");

    if (player.hp <= 0) endGame();
    updateHud();
  }

  function endGame() {
    running = false;
    paused = true;
    finalScore.textContent = "Score " + Math.floor(score) + " · Level " + level + " · " + kills + " systems collapsed";
    gameOver.classList.add("visible");
  }

  function update(dt) {
    if (!running || paused) return;

    gameTime += dt;
    player.cooldown = Math.max(0, player.cooldown - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    shake *= Math.pow(0.03, dt);
    flash *= Math.pow(0.02, dt);

    let mx = 0;
    let my = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) my -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) my += 1;

    if (mx || my) {
      const mag = Math.hypot(mx, my);
      mx /= mag;
      my /= mag;
    }

    const smoothing = 1 - Math.exp(-dt * 10);
    player.vx += (mx * player.speed - player.vx) * smoothing;
    player.vy += (my * player.speed - player.vy) * smoothing;
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    const pad = 18;
    player.x = Math.max(pad, Math.min(W - pad, player.x));
    player.y = Math.max(pad, Math.min(H - pad, player.y));

    trail.push({ x: player.x, y: player.y, t: gameTime });
    while (trail.length > 95) trail.shift();

    if (mouse.down) emitWave();

    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.r += w.speed * dt;
      w.alpha = Math.max(0, 1 - w.r / w.maxR);

      for (const enemy of [...enemies]) damageEnemy(enemy, w);

      if (w.r >= w.maxR) waves.splice(i, 1);
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !bossSpawned) {
      spawnEnemy();
      spawnTimer = Math.max(0.28, 1.45 - level * 0.055) * (0.75 + Math.random() * 0.55);
    }

    if (!bossSpawned && kills >= 32) spawnBoss();

    for (const enemy of [...enemies]) {
      enemy.age += dt;
      enemy.phase += enemy.rotation * dt;
      enemy.destabilize *= Math.pow(0.14, dt);

      if (enemy.boss) {
        const cyclePeriod = 1.05;
        enemy.cycleIndex = Math.floor(enemy.age / cyclePeriod) % enemy.cycles.length;
        enemy.prime = enemy.cycles[enemy.cycleIndex];
      }

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.max(0.001, Math.hypot(dx, dy));
      const nx = dx / dist;
      const ny = dy / dist;

      const orbit = Math.sin(enemy.age * (0.6 + enemy.prime * 0.07) + enemy.id) * (enemy.boss ? 35 : 20);
      const tx = nx * enemy.speed + -ny * orbit;
      const ty = ny * enemy.speed + nx * orbit;
      const response = 1 - Math.exp(-dt * (enemy.boss ? 2.5 : 4));
      enemy.vx += (tx - enemy.vx) * response;
      enemy.vy += (ty - enemy.vy) * response;
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      enemy.shotTimer -= dt;
      if (enemy.shotTimer <= 0) {
        fireEnemy(enemy);
        enemy.shotTimer = enemy.boss
          ? 0.78 + 0.12 * enemy.prime
          : 1.7 + 7 / enemy.prime + Math.random() * 0.6;
      }

      if (dist < enemy.radius + player.radius + 3) {
        playerHit(enemy.boss ? 22 : 11);
        const push = 32;
        enemy.x -= nx * push;
        enemy.y -= ny * push;
      }
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.px = p.x;
      p.py = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (Math.hypot(p.x - player.x, p.y - player.y) < p.radius + player.radius + 2) {
        projectiles.splice(i, 1);
        playerHit(8 + Math.min(8, p.prime * 0.35));
        continue;
      }

      if (p.life <= 0 || p.x < -100 || p.x > W + 100 || p.y < -100 || p.y > H + 100) {
        projectiles.splice(i, 1);
      }
    }

    for (let i = fragments.length - 1; i >= 0; i--) {
      const f = fragments[i];
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vx *= Math.pow(0.12, dt);
      f.vy *= Math.pow(0.12, dt);
      f.life -= dt;
      if (f.life <= 0) fragments.splice(i, 1);
    }

    updateHud();
  }

  function updateHud() {
    const hpRatio = Math.max(0, player.hp / player.maxHp);
    hpBar.style.width = (hpRatio * 100).toFixed(1) + "%";
    hpText.textContent = Math.max(0, Math.ceil(player.hp));
    freqText.textContent = PRIMES[player.freqIndex];
    scoreText.textContent = Math.floor(score);
    levelText.textContent = level;

    const boss = enemies.find(e => e.boss);
    if (boss) {
      const ratio = Math.max(0, boss.hp / boss.maxHp);
      bossBar.style.width = (ratio * 100).toFixed(1) + "%";
      bossText.textContent = Math.ceil(ratio * 100) + "%";
      bossPrime.textContent = boss.prime;
    }
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const sx = shake ? (Math.random() - 0.5) * shake : 0;
    const sy = shake ? (Math.random() - 0.5) * shake : 0;

    ctx.save();
    ctx.translate(sx, sy);

    const bg = ctx.createRadialGradient(
      player.x, player.y, 10,
      player.x, player.y, Math.max(W, H) * 0.82
    );
    bg.addColorStop(0, "#07111f");
    bg.addColorStop(0.38, "#050a13");
    bg.addColorStop(1, "#02040a");
    ctx.fillStyle = bg;
    ctx.fillRect(-30, -30, W + 60, H + 60);

    drawGrid();
    drawStars();
    drawField();
    drawInterference();
    drawTrail();
    drawWaves();
    drawProjectiles();
    drawEnemies();
    drawFragments();
    drawPlayer();

    if (flash > 0.01) {
      ctx.fillStyle = "rgba(190, 230, 255, " + Math.min(0.25, flash * 0.22) + ")";
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }

    ctx.restore();
  }

  function drawGrid() {
    const spacing = 64;
    const offsetX = ((-player.x * 0.035) % spacing + spacing) % spacing;
    const offsetY = ((-player.y * 0.035) % spacing + spacing) % spacing;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(90, 140, 190, 0.045)";
    ctx.beginPath();

    for (let x = offsetX; x <= W; x += spacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }

    for (let y = offsetY; y <= H; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }

    ctx.stroke();

    ctx.strokeStyle = "rgba(90, 170, 220, 0.025)";
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
  }

  function drawStars() {
    for (const s of stars) {
      const pulse = 0.65 + 0.35 * Math.sin(gameTime * 0.4 + s.x * 0.012 + s.y * 0.017);
      ctx.fillStyle = "rgba(150, 190, 230, " + (s.a * pulse) + ")";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
  }

  function drawField() {
    const prime = PRIMES[player.freqIndex];
    const wavelength = 28 + prime * 4;

    for (const n of fieldNodes) {
      const dx = n.x - player.x;
      const dy = n.y - player.y;
      const r = Math.hypot(dx, dy);
      if (r > 420) continue;

      const amplitude = Math.sin(r / wavelength - gameTime * 2.1) * Math.exp(-r / 340);
      const a = Math.abs(amplitude) * 0.07;
      ctx.fillStyle = "rgba(115, 205, 255, " + a + ")";
      ctx.beginPath();
      ctx.arc(n.x, n.y, 1 + Math.abs(amplitude) * 1.6, 0, TAU);
      ctx.fill();
    }
  }

  function drawTrail() {
    if (trail.length < 2) return;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    for (let i = 1; i < trail.length; i++) {
      const p0 = trail[i - 1];
      const p1 = trail[i];
      const age = i / trail.length;
      const oscillation = 0.5 + 0.5 * Math.sin(i * 0.65 + gameTime * 5);
      const alpha = age * 0.18 * (0.65 + 0.35 * oscillation);
      ctx.strokeStyle = "rgba(95, 220, 255, " + alpha + ")";
      ctx.lineWidth = 0.8 + age * 2.4;
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

    for (const w of waves) {
      const hue = primeHue(w.prime);
      const alpha = Math.max(0, w.alpha);

      ctx.strokeStyle = "hsla(" + hue + ", 95%, 72%, " + (alpha * 0.45) + ")";
      ctx.lineWidth = player.pulseWidth;
      ctx.shadowBlur = 18;
      ctx.shadowColor = "hsla(" + hue + ", 95%, 70%, 0.8)";
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, TAU);
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.strokeStyle = "hsla(" + hue + ", 100%, 88%, " + (alpha * 0.8) + ")";
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, TAU);
      ctx.stroke();

      const tickCount = w.prime;
      for (let i = 0; i < tickCount; i++) {
        const a = TAU * i / tickCount + gameTime * 0.15;
        const x = w.x + Math.cos(a) * w.r;
        const y = w.y + Math.sin(a) * w.r;
        ctx.fillStyle = "hsla(" + hue + ", 100%, 82%, " + (alpha * 0.9) + ")";
        ctx.beginPath();
        ctx.arc(x, y, 1.7, 0, TAU);
        ctx.fill();
      }
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function circleIntersections(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);

    if (d === 0 || d > a.r + b.r || d < Math.abs(a.r - b.r)) return [];

    const x = (a.r * a.r - b.r * b.r + d * d) / (2 * d);
    const h2 = a.r * a.r - x * x;
    if (h2 < 0) return [];

    const h = Math.sqrt(h2);
    const xm = a.x + x * dx / d;
    const ym = a.y + x * dy / d;
    const rx = -dy * h / d;
    const ry = dx * h / d;

    return [
      { x: xm + rx, y: ym + ry },
      { x: xm - rx, y: ym - ry }
    ];
  }

  function drawInterference() {
    if (waves.length < 2) return;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "rgba(205, 240, 255, 0.8)";

    for (let i = 0; i < waves.length; i++) {
      for (let j = i + 1; j < waves.length; j++) {
        const points = circleIntersections(waves[i], waves[j]);
        for (const p of points) {
          const phase = Math.sin((waves[i].r - waves[j].r) * 0.05 + gameTime * 6);
          const radius = 2.2 + Math.abs(phase) * 2.7;
          ctx.fillStyle = "rgba(215, 246, 255, 0.8)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, TAU);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  function drawEnemyShape(enemy, radius, alpha, lineWidth) {
    const points = Math.max(36, enemy.prime * 8);
    ctx.beginPath();

    for (let i = 0; i <= points; i++) {
      const theta = TAU * i / points;
      const resonanceNoise = enemy.destabilize * 0.08 * Math.sin(theta * (enemy.prime + 2) + gameTime * 13);
      const radial =
        radius *
        (0.82 +
          0.18 * Math.sin(enemy.prime * theta + enemy.phase * 2) +
          resonanceNoise);

      const a = theta + enemy.phase;
      const x = enemy.x + Math.cos(a) * radial;
      const y = enemy.y + Math.sin(a) * radial;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.closePath();
    const hue = primeHue(enemy.prime);
    ctx.strokeStyle = "hsla(" + hue + ", 92%, 72%, " + alpha + ")";
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  function drawEnemies() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const enemy of enemies) {
      const hue = primeHue(enemy.prime);
      const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);

      ctx.shadowBlur = enemy.boss ? 28 : 15;
      ctx.shadowColor = "hsla(" + hue + ", 90%, 62%, 0.7)";

      if (enemy.boss) drawBossGeometry(enemy);

      drawEnemyShape(enemy, enemy.radius, 0.72, enemy.boss ? 2.2 : 1.35);
      drawEnemyShape(enemy, enemy.radius * 0.68, 0.36, 1);

      for (let i = 0; i < enemy.prime; i++) {
        const a = TAU * i / enemy.prime + enemy.phase * 1.6;
        const r = enemy.radius * 0.48;
        const x = enemy.x + Math.cos(a) * r;
        const y = enemy.y + Math.sin(a) * r;
        ctx.fillStyle = "hsla(" + hue + ", 100%, 78%, 0.8)";
        ctx.beginPath();
        ctx.arc(x, y, enemy.boss ? 2.8 : 1.8, 0, TAU);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(238, 247, 255, 0.88)";
      ctx.font = enemy.boss ? "700 14px ui-monospace, monospace" : "700 11px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(enemy.prime), enemy.x, enemy.y);

      const barWidth = enemy.boss ? 90 : enemy.radius * 1.5;
      const y = enemy.y + enemy.radius + 10;
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(enemy.x - barWidth / 2, y, barWidth, 2);
      ctx.fillStyle = "hsla(" + hue + ", 90%, 72%, 0.65)";
      ctx.fillRect(enemy.x - barWidth / 2, y, barWidth * hpRatio, 2);
    }

    ctx.restore();
  }

  function drawBossGeometry(enemy) {
    const rings = [3, 5, 7];
    rings.forEach((prime, idx) => {
      const active = prime === enemy.prime;
      const r = enemy.radius * (1.2 + idx * 0.28);
      const hue = primeHue(prime);
      ctx.strokeStyle = "hsla(" + hue + ", 92%, 70%, " + (active ? 0.5 : 0.15) + ")";
      ctx.lineWidth = active ? 2.3 : 1;
      ctx.beginPath();

      const n = prime;
      for (let i = 0; i <= n; i++) {
        const a = TAU * i / n - enemy.phase * (idx % 2 ? 1 : -1);
        const x = enemy.x + Math.cos(a) * r;
        const y = enemy.y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    });

    const t = (enemy.age % 10.5) / 10.5;
    ctx.strokeStyle = "rgba(255, 230, 240, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius * (1.95 + t * 0.38), 0, TAU);
    ctx.stroke();
  }

  function drawProjectiles() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const p of projectiles) {
      const hue = primeHue(p.prime);
      ctx.strokeStyle = "hsla(" + hue + ", 100%, 70%, 0.55)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      ctx.fillStyle = "hsla(" + hue + ", 100%, 78%, 0.9)";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "hsla(" + hue + ", 100%, 60%, 0.9)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, TAU);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawFragments() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const f of fragments) {
      const a = Math.max(0, f.life / f.maxLife);
      const hue = primeHue(f.prime);
      ctx.fillStyle = "hsla(" + hue + ", 100%, 76%, " + (a * 0.75) + ")";
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * a + 0.4, 0, TAU);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawPlayer() {
    const prime = PRIMES[player.freqIndex];
    const hue = primeHue(prime);
    const flicker = player.invuln > 0 && Math.floor(player.invuln * 20) % 2 === 0;

    if (flicker) return;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(player.x, player.y);

    const speed = Math.hypot(player.vx, player.vy);
    const stretch = 1 + Math.min(0.75, speed / player.speed * 0.55);
    const angle = Math.atan2(player.vy, player.vx);
    ctx.rotate(angle);
    ctx.scale(stretch, 1 / Math.sqrt(stretch));

    ctx.shadowBlur = 24;
    ctx.shadowColor = "hsla(" + hue + ", 100%, 70%, 1)";
    ctx.fillStyle = "hsla(" + hue + ", 100%, 82%, 0.96)";
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "hsla(" + hue + ", 100%, 75%, 0.26)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 13 + Math.sin(gameTime * prime) * 2, 0, TAU);
    ctx.stroke();

    ctx.restore();

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(gameTime * 0.3);
    ctx.strokeStyle = "hsla(" + hue + ", 100%, 72%, 0.22)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let i = 0; i <= prime; i++) {
      const a = TAU * i / prime;
      const r = 20;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function primeHue(prime) {
    const map = {
      2: 190,
      3: 205,
      5: 248,
      7: 286,
      11: 328,
      13: 34
    };
    return map[prime] ?? 195;
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;

    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  addEventListener("resize", resize);

  addEventListener("keydown", e => {
    keys.add(e.code);

    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }

    if (e.code === "Space") emitWave();
    if (e.code === "KeyQ") changeFrequency(-1);
    if (e.code === "KeyE") changeFrequency(1);

    if (paused && upgradeScreen.classList.contains("visible") && ["Digit1", "Digit2", "Digit3"].includes(e.code)) {
      const index = Number(e.code.slice(-1)) - 1;
      const choice = openUpgrade.choices?.[index];
      if (choice) selectUpgrade(choice);
    }
  });

  addEventListener("keyup", e => keys.delete(e.code));

  canvas.addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  canvas.addEventListener("mousedown", () => {
    mouse.down = true;
    emitWave();
  });

  addEventListener("mouseup", () => {
    mouse.down = false;
  });

  canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    mouse.down = true;
    emitWave();
  }, { passive: false });

  canvas.addEventListener("touchend", e => {
    e.preventDefault();
    mouse.down = false;
  }, { passive: false });

  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", startGame);

  resize();
  draw();
  requestAnimationFrame(loop);
})();
