(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");
  const startScreen = document.getElementById("startScreen");
  const gameOver = document.getElementById("gameOver");
  const finalScore = document.getElementById("finalScore");
  const upgradeScreen = document.getElementById("upgradeScreen");
  const upgradeChoices = document.getElementById("upgradeChoices");
  const hpBar = document.getElementById("hpBar");
  const hpText = document.getElementById("hpText");
  const freqText = document.getElementById("freqText");
  const scoreText = document.getElementById("scoreText");
  const levelText = document.getElementById("levelText");
  const message = document.getElementById("message");
  const bossReadout = document.getElementById("bossReadout");
  const bossBar = document.getElementById("bossBar");
  const bossText = document.getElementById("bossText");
  const bossPrime = document.getElementById("bossPrime");

  const TAU = Math.PI * 2;
  const PRIMES = [2, 3, 5, 7, 11, 13];
  const keys = new Set();
  const mouse = { down: false };

  let W = innerWidth;
  let H = innerHeight;
  let DPR = Math.min(devicePixelRatio || 1, 2);
  let running = false;
  let paused = false;
  let last = performance.now();
  let t = 0;
  let score = 0;
  let kills = 0;
  let level = 1;
  let nextUpgrade = 6;
  let spawnTimer = 3;
  let enemyId = 0;
  let shake = 0;
  let flash = 0;
  let bossSpawned = false;
  let audio = null;

  const player = {
    x: W / 2,
    y: H / 2,
    vx: 0,
    vy: 0,
    radius: 6,
    speed: 255,
    hp: 100,
    maxHp: 100,
    freqIndex: 0,
    cooldown: 0,
    cooldownBase: 0.32,
    waveSpeed: 430,
    waveRadius: 480,
    waveDamage: 15,
    resonance: 2,
    pulseWidth: 7,
    invuln: 0
  };

  const enemies = [];
  const waves = [];
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
    const count = Math.floor(W * H / 14000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: ((i * 0.61803398875) % 1) * W,
        y: ((i * 0.41421356237) % 1) * H,
        a: 0.12 + ((Math.sin(i * 12.9898) + 1) * 0.12),
        r: 0.5 + (i % 4) * 0.18
      });
    }
    for (let y = 38; y < H; y += 76) {
      for (let x = 38; x < W; x += 76) fieldNodes.push({ x, y });
    }
  }

  function ensureAudio() {
    if (!audio) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audio = new Ctx();
    }
    if (audio && audio.state === "suspended") audio.resume();
  }

  function tone(freq, duration = 0.08, volume = 0.03, type = "sine") {
    if (!audio) return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function reset() {
    enemies.length = 0;
    waves.length = 0;
    projectiles.length = 0;
    fragments.length = 0;
    trail.length = 0;
    player.x = W / 2;
    player.y = H / 2;
    player.vx = 0;
    player.vy = 0;
    player.hp = player.maxHp = 100;
    player.freqIndex = 0;
    player.cooldown = 0;
    player.cooldownBase = 0.32;
    player.waveSpeed = 430;
    player.waveRadius = 480;
    player.waveDamage = 15;
    player.resonance = 2;
    player.pulseWidth = 7;
    player.invuln = 0;
    score = 0;
    kills = 0;
    level = 1;
    nextUpgrade = 6;
    spawnTimer = 3.2;
    bossSpawned = false;
    shake = 0;
    flash = 0;
    bossReadout.classList.add("hidden");
    spawnEnemy(2, true);
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
    last = performance.now();
  }

  function showMessage(text, duration = 650) {
    message.textContent = text;
    message.style.opacity = "1";
    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => message.style.opacity = "0", duration);
  }

  function emitWave() {
    if (!running || paused || player.cooldown > 0) return;
    ensureAudio();
    const prime = PRIMES[player.freqIndex];
    waves.push({
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
    tone(130 + prime * 22, 0.11, 0.026, "sine");
  }

  function changeFrequency(dir) {
    if (!running || paused) return;
    player.freqIndex = (player.freqIndex + dir + PRIMES.length) % PRIMES.length;
    const prime = PRIMES[player.freqIndex];
    tone(170 + prime * 20, 0.06, 0.018, "triangle");
    showMessage("FREQUENCY  " + prime, 420);
    updateHud();
  }

  function spawnEnemy(forcePrime = null, first = false) {
    if (enemies.length > 30) return;
    const margin = first ? 70 : 90;
    let x, y;
    if (first) {
      x = W * 0.78;
      y = H * 0.5;
    } else {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) { x = Math.random() * W; y = -margin; }
      if (edge === 1) { x = W + margin; y = Math.random() * H; }
      if (edge === 2) { x = Math.random() * W; y = H + margin; }
      if (edge === 3) { x = -margin; y = Math.random() * H; }
    }
    const maxIndex = Math.min(PRIMES.length - 1, 1 + Math.floor(level / 2));
    const prime = forcePrime || PRIMES[Math.floor(Math.random() * (maxIndex + 1))];
    const hp = 40 + prime * 5 + level * 4;
    enemies.push({
      id: ++enemyId,
      x, y, vx: 0, vy: 0,
      prime,
      radius: 18 + prime * 0.85,
      hp, maxHp: hp,
      phase: Math.random() * TAU,
      rotation: (Math.random() < 0.5 ? -1 : 1) * (0.3 + 1 / prime),
      speed: first ? 20 : 38 + Math.min(45, level * 2.1) + 28 / Math.sqrt(prime),
      shotTimer: first ? 4.2 : 1.8 + 6 / prime + Math.random(),
      age: 0,
      destabilize: 0,
      rejection: 0,
      resonanceFlash: 0,
      first,
      boss: false
    });
  }

  function spawnBoss() {
    bossSpawned = true;
    const hp = 900;
    enemies.push({
      id: ++enemyId,
      x: W / 2,
      y: -120,
      vx: 0, vy: 0,
      prime: 3,
      radius: 70,
      hp, maxHp: hp,
      phase: 0,
      rotation: 0.18,
      speed: 24,
      shotTimer: 1,
      age: 0,
      destabilize: 0,
      rejection: 0,
      resonanceFlash: 0,
      cycles: [3, 5, 7],
      cycleIndex: 0,
      boss: true
    });
    bossReadout.classList.remove("hidden");
    showMessage("PRIMORIAL ENTITY", 1500);
    tone(70, 0.55, 0.05, "sawtooth");
  }

  function fireEnemy(enemy) {
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const count = enemy.boss ? enemy.prime : Math.min(4, Math.max(1, Math.floor(enemy.prime / 4)));
    for (let i = 0; i < count; i++) {
      const spread = enemy.boss ? 0.2 : 0.12;
      const a = angle + (i - (count - 1) / 2) * spread;
      const speed = enemy.boss ? 190 : 145 + level * 3;
      projectiles.push({
        x: enemy.x, y: enemy.y,
        px: enemy.x, py: enemy.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 5,
        prime: enemy.prime,
        radius: enemy.boss ? 4 : 3
      });
    }
  }

  function hitEnemy(enemy, wave) {
    if (wave.hit.has(enemy.id)) return;
    const distance = Math.hypot(enemy.x - wave.x, enemy.y - wave.y);
    if (Math.abs(distance - wave.r) > enemy.radius + player.pulseWidth * 1.5) return;
    wave.hit.add(enemy.id);

    if (wave.prime !== enemy.prime) {
      enemy.rejection = 1;
      enemy.destabilize = Math.min(0.18, enemy.destabilize + 0.06);
      tone(82, 0.055, 0.009, "sine");
      return;
    }

    enemy.hp -= player.waveDamage * player.resonance;
    enemy.destabilize = Math.min(1.4, enemy.destabilize + 0.85);
    enemy.resonanceFlash = 1;
    shake = Math.max(shake, 3);
    showMessage("RESONANCE  " + wave.prime + " = " + enemy.prime, 360);
    tone(240 + enemy.prime * 26, 0.1, 0.03, "triangle");
    if (enemy.hp <= 0) destroyEnemy(enemy);
  }

  function destroyEnemy(enemy) {
    const index = enemies.indexOf(enemy);
    if (index >= 0) enemies.splice(index, 1);
    const count = enemy.boss ? 80 : 14 + enemy.prime * 2;
    for (let i = 0; i < count; i++) {
      const angle = TAU * i / count + enemy.phase;
      const harmonic = 0.75 + 0.35 * Math.sin(enemy.prime * angle);
      const speed = (enemy.boss ? 185 : 105) * harmonic * (0.75 + Math.random() * 0.6);
      fragments.push({
        x: enemy.x, y: enemy.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7 + Math.random() * 0.8,
        maxLife: 1.5,
        prime: enemy.prime,
        size: enemy.boss ? 3.5 : 2
      });
    }
    shake = Math.max(shake, enemy.boss ? 15 : 7);
    flash = Math.max(flash, enemy.boss ? 0.65 : 0.14);
    tone(enemy.boss ? 52 : 95 + enemy.prime * 7, enemy.boss ? 0.7 : 0.16, enemy.boss ? 0.07 : 0.035, "sawtooth");

    if (enemy.boss) {
      score += 5000;
      bossReadout.classList.add("hidden");
      showMessage("PRIMORIAL PHASE COLLAPSED", 2200);
    } else {
      kills += 1;
      score += 100 + enemy.prime * 18;
      if (kills >= nextUpgrade) openUpgrade();
    }
    updateHud();
  }

  function openUpgrade() {
    paused = true;
    level += 1;
    nextUpgrade += 6 + Math.floor(level * 0.7);
    const pool = [
      { name: "Amplitude", desc: "Resonant hits transfer 28 percent more energy.", apply: () => player.waveDamage *= 1.28 },
      { name: "Propagation", desc: "Waves travel farther and faster.", apply: () => { player.waveSpeed *= 1.14; player.waveRadius *= 1.12; } },
      { name: "Phase Control", desc: "Reduce the time between pulses.", apply: () => player.cooldownBase = Math.max(0.14, player.cooldownBase * 0.84) },
      { name: "Resonance", desc: "Matching modes couple more strongly.", apply: () => player.resonance += 0.38 },
      { name: "Integrity", desc: "Increase maximum integrity and repair damage.", apply: () => { player.maxHp += 22; player.hp = Math.min(player.maxHp, player.hp + 38); } },
      { name: "Wavefront", desc: "Thicken the active wavefront.", apply: () => player.pulseWidth += 2 }
    ];
    pool.sort(() => Math.random() - 0.5);
    const choices = pool.slice(0, 3);
    upgradeChoices.innerHTML = "";
    choices.forEach((choice, i) => {
      const div = document.createElement("div");
      div.className = "upgrade";
      div.innerHTML = '<div class="key">' + (i + 1) + '</div><h3>' + choice.name + '</h3><p>' + choice.desc + '</p>';
      div.addEventListener("click", () => chooseUpgrade(choice));
      upgradeChoices.appendChild(div);
    });
    openUpgrade.choices = choices;
    upgradeScreen.classList.add("visible");
    updateHud();
  }

  function chooseUpgrade(choice) {
    choice.apply();
    paused = false;
    upgradeScreen.classList.remove("visible");
    showMessage(choice.name.toUpperCase() + " INTEGRATED", 900);
    tone(330, 0.12, 0.025, "triangle");
    setTimeout(() => tone(440, 0.15, 0.02, "triangle"), 70);
    updateHud();
  }

  function playerHit(amount) {
    if (player.invuln > 0) return;
    player.hp -= amount;
    player.invuln = 0.5;
    shake = Math.max(shake, 9);
    flash = Math.max(flash, 0.32);
    tone(58, 0.16, 0.045, "square");
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
    t += dt;
    player.cooldown = Math.max(0, player.cooldown - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    shake *= Math.pow(0.03, dt);
    flash *= Math.pow(0.02, dt);

    let mx = 0, my = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) my -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) my += 1;
    if (mx || my) {
      const mag = Math.hypot(mx, my);
      mx /= mag; my /= mag;
    }
    const response = 1 - Math.exp(-dt * 10);
    player.vx += (mx * player.speed - player.vx) * response;
    player.vy += (my * player.speed - player.vy) * response;
    player.x = Math.max(18, Math.min(W - 18, player.x + player.vx * dt));
    player.y = Math.max(18, Math.min(H - 18, player.y + player.vy * dt));
    trail.push({ x: player.x, y: player.y });
    while (trail.length > 95) trail.shift();

    if (mouse.down) emitWave();

    for (let i = waves.length - 1; i >= 0; i--) {
      const wave = waves[i];
      wave.r += wave.speed * dt;
      wave.alpha = Math.max(0, 1 - wave.r / wave.maxR);
      for (const enemy of [...enemies]) hitEnemy(enemy, wave);
      if (wave.r >= wave.maxR) waves.splice(i, 1);
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !bossSpawned) {
      spawnEnemy();
      spawnTimer = Math.max(0.55, 1.7 - level * 0.06) * (0.8 + Math.random() * 0.5);
    }
    if (!bossSpawned && kills >= 26) spawnBoss();

    for (const enemy of [...enemies]) {
      enemy.age += dt;
      enemy.phase += enemy.rotation * dt;
      enemy.destabilize *= Math.pow(0.14, dt);
      enemy.rejection *= Math.pow(0.018, dt);
      enemy.resonanceFlash *= Math.pow(0.025, dt);

      if (enemy.boss) {
        enemy.cycleIndex = Math.floor(enemy.age / 1.15) % enemy.cycles.length;
        enemy.prime = enemy.cycles[enemy.cycleIndex];
      }

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.max(0.001, Math.hypot(dx, dy));
      const nx = dx / dist, ny = dy / dist;
      const orbit = Math.sin(enemy.age * (0.6 + enemy.prime * 0.07) + enemy.id) * (enemy.boss ? 34 : 18);
      const tx = nx * enemy.speed - ny * orbit;
      const ty = ny * enemy.speed + nx * orbit;
      const r = 1 - Math.exp(-dt * (enemy.boss ? 2.5 : 4));
      enemy.vx += (tx - enemy.vx) * r;
      enemy.vy += (ty - enemy.vy) * r;
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      enemy.shotTimer -= dt;
      if (enemy.shotTimer <= 0) {
        fireEnemy(enemy);
        enemy.shotTimer = enemy.boss ? 0.9 + 0.1 * enemy.prime : 1.9 + 7 / enemy.prime + Math.random() * 0.6;
      }

      if (dist < enemy.radius + player.radius + 3) {
        playerHit(enemy.boss ? 22 : 10);
        enemy.x -= nx * 30;
        enemy.y -= ny * 30;
      }
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.px = p.x; p.py = p.y;
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (Math.hypot(p.x - player.x, p.y - player.y) < p.radius + player.radius + 2) {
        projectiles.splice(i, 1);
        playerHit(8 + Math.min(8, p.prime * 0.35));
        continue;
      }
      if (p.life <= 0 || p.x < -100 || p.x > W + 100 || p.y < -100 || p.y > H + 100) projectiles.splice(i, 1);
    }

    for (let i = fragments.length - 1; i >= 0; i--) {
      const f = fragments[i];
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.vx *= Math.pow(0.12, dt); f.vy *= Math.pow(0.12, dt);
      f.life -= dt;
      if (f.life <= 0) fragments.splice(i, 1);
    }
    updateHud();
  }

  function updateHud() {
    hpBar.style.width = Math.max(0, player.hp / player.maxHp * 100) + "%";
    hpText.textContent = Math.max(0, Math.ceil(player.hp));
    freqText.textContent = PRIMES[player.freqIndex];
    scoreText.textContent = Math.floor(score);
    levelText.textContent = level;
    const boss = enemies.find(enemy => enemy.boss);
    if (boss) {
      const ratio = Math.max(0, boss.hp / boss.maxHp);
      bossBar.style.width = ratio * 100 + "%";
      bossText.textContent = Math.ceil(ratio * 100) + "%";
      bossPrime.textContent = boss.prime;
    }
  }

  function primeHue(prime) {
    return ({ 2: 190, 3: 205, 5: 248, 7: 286, 11: 328, 13: 34 })[prime] ?? 195;
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const sx = shake ? (Math.random() - 0.5) * shake : 0;
    const sy = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.save();
    ctx.translate(sx, sy);

    const bg = ctx.createRadialGradient(player.x, player.y, 10, player.x, player.y, Math.max(W, H) * 0.82);
    bg.addColorStop(0, "#07111f");
    bg.addColorStop(0.38, "#050a13");
    bg.addColorStop(1, "#02040a");
    ctx.fillStyle = bg;
    ctx.fillRect(-30, -30, W + 60, H + 60);

    drawGrid();
    drawStars();
    drawField();
    drawTrail();
    drawWaves();
    drawProjectiles();
    drawEnemies();
    drawFragments();
    drawPlayer();

    if (flash > 0.01) {
      ctx.fillStyle = "rgba(190,230,255," + Math.min(0.24, flash * 0.2) + ")";
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }
    ctx.restore();
  }

  function drawGrid() {
    ctx.strokeStyle = "rgba(90,140,190,0.045)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < W; x += 64) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y < H; y += 64) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
  }

  function drawStars() {
    for (const s of stars) {
      const pulse = 0.65 + 0.35 * Math.sin(t * 0.4 + s.x * 0.012 + s.y * 0.017);
      ctx.fillStyle = "rgba(150,190,230," + s.a * pulse + ")";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    }
  }

  function drawField() {
    const prime = PRIMES[player.freqIndex];
    const wavelength = 28 + prime * 4;
    for (const n of fieldNodes) {
      const r = Math.hypot(n.x - player.x, n.y - player.y);
      if (r > 420) continue;
      const amp = Math.sin(r / wavelength - t * 2.1) * Math.exp(-r / 340);
      ctx.fillStyle = "rgba(115,205,255," + Math.abs(amp) * 0.07 + ")";
      ctx.beginPath(); ctx.arc(n.x, n.y, 1 + Math.abs(amp) * 1.6, 0, TAU); ctx.fill();
    }
  }

  function drawTrail() {
    if (trail.length < 2) return;
    ctx.lineCap = "round";
    for (let i = 1; i < trail.length; i++) {
      const a = i / trail.length;
      ctx.strokeStyle = "rgba(95,220,255," + a * 0.16 + ")";
      ctx.lineWidth = 0.7 + a * 2.2;
      ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
    }
  }

  function drawWaves() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const wave of waves) {
      const hue = primeHue(wave.prime);
      ctx.strokeStyle = "hsla(" + hue + ",95%,72%," + wave.alpha * 0.45 + ")";
      ctx.lineWidth = player.pulseWidth;
      ctx.shadowBlur = 18;
      ctx.shadowColor = "hsla(" + hue + ",95%,70%,0.8)";
      ctx.beginPath(); ctx.arc(wave.x, wave.y, wave.r, 0, TAU); ctx.stroke();
      for (let i = 0; i < wave.prime; i++) {
        const a = TAU * i / wave.prime + t * 0.15;
        ctx.fillStyle = "hsla(" + hue + ",100%,82%," + wave.alpha * 0.85 + ")";
        ctx.beginPath(); ctx.arc(wave.x + Math.cos(a) * wave.r, wave.y + Math.sin(a) * wave.r, 1.6, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawEnemies() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const activePrime = PRIMES[player.freqIndex];
    for (const enemy of enemies) {
      const hue = primeHue(enemy.prime);
      const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
      const ready = activePrime === enemy.prime;
      ctx.shadowBlur = enemy.boss ? 28 : 15;
      ctx.shadowColor = "hsla(" + hue + ",90%,62%,0.7)";

      if (ready) {
        ctx.strokeStyle = "hsla(" + hue + ",100%,82%,0.18)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius * 1.32, 0, TAU); ctx.stroke();
      }
      if (enemy.rejection > 0.015) {
        ctx.strokeStyle = "rgba(218,232,240," + enemy.rejection * 0.5 + ")";
        ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius * 1.42, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (enemy.resonanceFlash > 0.015) {
        ctx.strokeStyle = "hsla(" + hue + ",100%,88%," + enemy.resonanceFlash * 0.7 + ")";
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius * 1.2, 0, TAU); ctx.stroke();
      }
      if (enemy.boss) drawBoss(enemy);
      drawEnemyShape(enemy, enemy.radius, 0.72, enemy.boss ? 2.2 : 1.35);
      drawEnemyShape(enemy, enemy.radius * 0.68, 0.34, 1);

      for (let i = 0; i < enemy.prime; i++) {
        const a = TAU * i / enemy.prime + enemy.phase * 1.6;
        const r = enemy.radius * 0.48;
        ctx.fillStyle = "hsla(" + hue + ",100%,78%,0.8)";
        ctx.beginPath(); ctx.arc(enemy.x + Math.cos(a) * r, enemy.y + Math.sin(a) * r, enemy.boss ? 2.8 : 1.8, 0, TAU); ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(238,247,255,0.9)";
      ctx.font = enemy.boss ? "700 14px ui-monospace, monospace" : "700 11px ui-monospace, monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(enemy.prime), enemy.x, enemy.y);
      const bw = enemy.boss ? 90 : enemy.radius * 1.5;
      const by = enemy.y + enemy.radius + 10;
      ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(enemy.x - bw / 2, by, bw, 2);
      ctx.fillStyle = "hsla(" + hue + ",90%,72%,0.65)"; ctx.fillRect(enemy.x - bw / 2, by, bw * hpRatio, 2);
    }
    ctx.restore();
  }

  function drawEnemyShape(enemy, radius, alpha, width) {
    const points = Math.max(36, enemy.prime * 8);
    const hue = primeHue(enemy.prime);
    ctx.strokeStyle = "hsla(" + hue + ",92%,72%," + alpha + ")";
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const theta = TAU * i / points;
      const noise = enemy.destabilize * 0.08 * Math.sin(theta * (enemy.prime + 2) + t * 13);
      const radial = radius * (0.82 + 0.18 * Math.sin(enemy.prime * theta + enemy.phase * 2) + noise);
      const a = theta + enemy.phase;
      const x = enemy.x + Math.cos(a) * radial;
      const y = enemy.y + Math.sin(a) * radial;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.stroke();
  }

  function drawBoss(enemy) {
    [3, 5, 7].forEach((prime, i) => {
      const active = prime === enemy.prime;
      const hue = primeHue(prime);
      const r = enemy.radius * (1.2 + i * 0.28);
      ctx.strokeStyle = "hsla(" + hue + ",92%,70%," + (active ? 0.5 : 0.13) + ")";
      ctx.lineWidth = active ? 2.2 : 1;
      ctx.beginPath();
      for (let j = 0; j <= prime; j++) {
        const a = TAU * j / prime - enemy.phase * (i % 2 ? 1 : -1);
        const x = enemy.x + Math.cos(a) * r;
        const y = enemy.y + Math.sin(a) * r;
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    });
  }

  function drawProjectiles() {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const p of projectiles) {
      const hue = primeHue(p.prime);
      ctx.strokeStyle = "hsla(" + hue + ",100%,70%,0.5)";
      ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.fillStyle = "hsla(" + hue + ",100%,78%,0.9)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawFragments() {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const f of fragments) {
      const a = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = "hsla(" + primeHue(f.prime) + ",100%,76%," + a * 0.75 + ")";
      ctx.beginPath(); ctx.arc(f.x, f.y, f.size * a + 0.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer() {
    const prime = PRIMES[player.freqIndex];
    const hue = primeHue(prime);
    if (player.invuln > 0 && Math.floor(player.invuln * 20) % 2 === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(player.x, player.y);
    const speed = Math.hypot(player.vx, player.vy);
    const stretch = 1 + Math.min(0.7, speed / player.speed * 0.5);
    ctx.rotate(Math.atan2(player.vy, player.vx));
    ctx.scale(stretch, 1 / Math.sqrt(stretch));
    ctx.shadowBlur = 24;
    ctx.shadowColor = "hsla(" + hue + ",100%,70%,1)";
    ctx.fillStyle = "hsla(" + hue + ",100%,82%,0.96)";
    ctx.beginPath(); ctx.arc(0, 0, player.radius, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(t * 0.3);
    ctx.strokeStyle = "hsla(" + hue + ",100%,72%,0.22)";
    ctx.beginPath();
    for (let i = 0; i <= prime; i++) {
      const a = TAU * i / prime;
      const x = Math.cos(a) * 20, y = Math.sin(a) * 20;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.restore();
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  addEventListener("resize", resize);
  addEventListener("keydown", event => {
    keys.add(event.code);
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
    if (event.code === "Space") emitWave();
    if (event.code === "KeyQ") changeFrequency(-1);
    if (event.code === "KeyE") changeFrequency(1);
    if (paused && upgradeScreen.classList.contains("visible") && ["Digit1", "Digit2", "Digit3"].includes(event.code)) {
      const choice = openUpgrade.choices?.[Number(event.code.slice(-1)) - 1];
      if (choice) chooseUpgrade(choice);
    }
  });
  addEventListener("keyup", event => keys.delete(event.code));
  canvas.addEventListener("mousedown", () => { mouse.down = true; emitWave(); });
  addEventListener("mouseup", () => mouse.down = false);
  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", startGame);

  resize();
  draw();
  requestAnimationFrame(loop);
})();
