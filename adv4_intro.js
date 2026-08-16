(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const p = G.player;

  const ui = {
    wrap: document.getElementById("openingSequence"),
    kicker: document.getElementById("openingKicker"),
    title: document.getElementById("openingTitle"),
    formula: document.getElementById("openingFormula"),
    prompt: document.getElementById("openingPrompt"),
    ready: document.getElementById("openingReady"),
    chapter: document.getElementById("chapterCard"),
    chapterKicker: document.getElementById("chapterKicker"),
    chapterTitle: document.getElementById("chapterTitle"),
    chapterSubtitle: document.getElementById("chapterSubtitle")
  };

  const ORIGIN = { x: 520, y: 1000 };
  const HOME_RADIUS = 184;
  const HOME_FREQS = [220, 275, 330, 412.5];

  G.intro = {
    active: false,
    phase: "idle",
    phaseTime: 0,
    elapsed: 0,
    distance: 0,
    lastX: p.x,
    lastY: p.y,
    origin: { ...ORIGIN, broken: false, pulse: 0 },
    homeLights: [],
    breakAge: 99,
    signalRevealed: false
  };

  function buildHomeLights() {
    G.intro.homeLights = [];
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + i * G.TAU / 4;
      G.intro.homeLights.push({
        x: ORIGIN.x + Math.cos(a) * HOME_RADIUS,
        y: ORIGIN.y + Math.sin(a) * HOME_RADIUS,
        active: false,
        broken: false,
        phase: i * Math.PI / 2
      });
    }
  }

  function setNarrative(kicker, title, formula, prompt, ready = "") {
    if (!ui.wrap) return;
    ui.kicker.textContent = kicker;
    ui.title.textContent = title;
    ui.formula.textContent = formula;
    ui.prompt.textContent = prompt;
    ui.ready.textContent = ready;
    ui.ready.classList.toggle("visible", Boolean(ready));
    ui.wrap.classList.add("visible");
  }

  function setPhase(phase) {
    G.intro.phase = phase;
    G.intro.phaseTime = 0;
  }

  function hideNarrative() {
    ui.wrap?.classList.remove("visible");
  }

  function showChapter() {
    if (!ui.chapter) return;
    ui.chapterKicker.textContent = "CHAPTER I";
    ui.chapterTitle.textContent = "FIRST SIGNAL";
    ui.chapterSubtitle.textContent = "Find the missing note.";
    ui.chapter.classList.add("visible");
    window.setTimeout(() => ui.chapter?.classList.remove("visible"), 2500);
  }

  function beginPrologue() {
    G.resetWorld();
    buildHomeLights();
    G.running = true;
    G.paused = false;
    G.lastTime = performance.now();
    s.stage = "prologue";
    s.area = "ORIGIN";
    s.signal.visible = false;
    s.signalMet = false;
    s.signalAtBasin = false;
    s.prologueComplete = false;
    p.x = 338;
    p.y = 1000;
    p.vx = 0;
    p.vy = 0;
    p.speed = 238;
    p.trail.length = 0;

    G.intro.active = true;
    G.intro.phase = "wake";
    G.intro.phaseTime = 0;
    G.intro.elapsed = 0;
    G.intro.distance = 0;
    G.intro.lastX = p.x;
    G.intro.lastY = p.y;
    G.intro.origin = { ...ORIGIN, broken: false, pulse: 0 };
    G.intro.breakAge = 99;
    G.intro.signalRevealed = false;

    G.el.startScreen.classList.remove("visible");
    G.el.hud.classList.add("storyHidden");
    G.el.help.classList.add("storyHidden");
    G.el.quest.classList.add("storyHidden");
    G.el.discovery.classList.remove("visible");
    G.el.completePanel.classList.remove("visible");

    if (G.startMusic) G.startMusic();
    else G.ensureAudio();

    setNarrative(
      "A SMALL BEGINNING",
      "THIS IS P.",
      "P",
      "P does not remember being made. P remembers one place."
    );
  }

  function enterHome() {
    setPhase("home");
    G.tone(220, 0.18, 0.011, "sine");
    setNarrative(
      "ORIGIN",
      "THIS IS HOME.",
      "O = (0, 0)",
      "Four familiar lights circle Origin. P has traced this path more times than memory can count.",
      "MOVE • WAKE THE FOUR LIGHTS"
    );
  }

  function wakeHomeLight(light, index) {
    if (light.active) return;
    light.active = true;
    G.intro.origin.pulse = 1;
    G.tone(HOME_FREQS[index], 0.24, 0.014, index % 2 ? "triangle" : "sine");
    const awake = G.intro.homeLights.filter(item => item.active).length;
    ui.ready.textContent = awake + " / 4 LIGHTS AWAKE";
    ui.ready.classList.add("visible");
    if (awake === 4) window.setTimeout(enterReturn, 700);
  }

  function enterReturn() {
    if (!G.intro.active || G.intro.phase !== "home") return;
    setPhase("return");
    G.chord(110, [1, 5/4, 3/2, 15/8]);
    setNarrative(
      "THE OLD PATTERN",
      "EVERY PATH CAME BACK HERE.",
      "4 notes • always the same",
      "Origin is waiting for P's answer.",
      "RETURN TO ORIGIN • SPACE"
    );
  }

  function answerOrigin() {
    if (G.intro.phase !== "return") return;
    if (Math.hypot(p.x - ORIGIN.x, p.y - ORIGIN.y) > 150) {
      G.showMessage("ORIGIN IS TOO FAR TO HEAR", 800);
      return;
    }
    setPhase("answer");
    G.intro.origin.pulse = 2.2;
    G.chord(110, [1, 5/4, 3/2, 15/8]);
    setNarrative(
      "HOME",
      "ORIGIN ANSWERS.",
      "1 : 5/4 : 3/2 : 15/8",
      "The same four notes. The same return."
    );
    window.setTimeout(beginBreak, 1450);
  }

  function beginBreak() {
    if (!G.intro.active || G.intro.phase !== "answer") return;
    setPhase("break");
    G.intro.origin.broken = true;
    G.intro.homeLights[3].broken = true;
    G.intro.homeLights[3].active = false;
    G.intro.breakAge = 0;
    document.body.classList.add("phaseBreak");
    window.setTimeout(() => document.body.classList.remove("phaseBreak"), 900);

    G.tone(110, 0.5, 0.018, "sine");
    G.tone(155.56, 0.46, 0.015, "triangle", 0.03);
    G.tone(82.41, 0.75, 0.012, "sine", 0.07);

    setNarrative(
      "FOR THE FIRST TIME",
      "ORIGIN MISSED A BEAT.",
      "4 → 3",
      "P has never heard silence in that place before."
    );
  }

  function revealBrokenSignal() {
    if (!G.intro.active || G.intro.signalRevealed) return;
    G.intro.signalRevealed = true;
    setPhase("signal");

    const sig = s.signal;
    sig.x = 860;
    sig.y = 860;
    sig.targetX = 1120;
    sig.targetY = 760;
    sig.visible = true;
    sig.broken = true;
    sig.phase = 0;
    sig.pulseTimer = 0;

    G.chord(146.83, [1, 5/4]);
    setNarrative(
      "SOMETHING BEYOND HOME",
      "ANOTHER PATTERN IS BROKEN.",
      "5 points • 1 missing",
      "Different shape. Same absence. Then it turns east."
    );
  }

  function completePrologue() {
    if (!G.intro.active) return;
    G.intro.active = false;
    G.intro.phase = "complete";
    s.prologueComplete = true;
    s.signalMet = true;
    s.stage = "follow";
    s.signal.trust = Math.max(1, s.signal.trust);
    s.signal.targetX = 1120;
    s.signal.targetY = 760;

    if (G.applyBonuses) G.applyBonuses();
    else p.speed = 292;

    if (Array.isArray(s.bonds) && !s.bonds.some(item => item.title === "ORIGIN")) {
      s.bonds.push({
        title: "ORIGIN",
        glyph: "O",
        note: "The first stable pattern P remembers. Home answered the same way until one note vanished.",
        effect: "Reason to leave: find what broke the pattern."
      });
    }
    G.addKnown("POSITION", "P can be somewhere. Origin is the first place P remembers returning to.");
    G.addKnown("MOTION", "A change in position leaves evidence. For the first time, P's path now leads away from home.");

    hideNarrative();
    G.el.hud.classList.remove("storyHidden");
    G.el.help.classList.remove("storyHidden");
    G.el.quest.classList.remove("storyHidden");
    G.updateHud();
    G.updateQuest();
    G.refreshJournal();
    showChapter();
  }

  const baseStartGame = G.startGame;
  G.startGame = () => beginPrologue();

  const baseEmitWave = G.emitWave;
  G.emitWave = () => {
    if (G.intro.active) {
      if (G.intro.phase === "return") answerOrigin();
      return;
    }
    baseEmitWave();
  };

  const baseChangeFrequency = G.changeFrequency;
  G.changeFrequency = dir => {
    if (G.intro.active) return;
    baseChangeFrequency(dir);
  };

  const baseToggleJournal = G.toggleJournal;
  G.toggleJournal = force => {
    if (G.intro.active) {
      G.showMessage("P HAS NOT BEGUN RECORDING THE FIELD YET", 900);
      return;
    }
    baseToggleJournal(force);
  };

  const baseUpdateCollectibles = G.updateCollectibles;
  G.updateCollectibles = () => {
    if (G.intro.active) return;
    baseUpdateCollectibles();
  };

  const baseUpdateSecrets = G.updateSecrets;
  G.updateSecrets = () => {
    if (G.intro.active) return;
    baseUpdateSecrets();
  };

  const baseUpdateMovement = G.updateMovement;
  G.updateMovement = dt => {
    if (G.intro.active && G.intro.phase === "wake") {
      p.vx *= Math.exp(-dt * 10);
      p.vy *= Math.exp(-dt * 10);
      return;
    }

    baseUpdateMovement(dt);

    if (!G.intro.active) return;
    p.x = G.clamp(p.x, 120, 940);
    p.y = G.clamp(p.y, 520, 1480);
  };

  const baseUpdateQuest = G.updateQuest;
  G.updateQuest = () => {
    if (s.prologueComplete && s.stage === "follow") {
      G.el.questTitle.textContent = "Follow the broken signal";
      G.el.questHint.textContent = "Origin lost a note when the fivefold pattern appeared. It is the only lead P has.";
      G.el.questProgress.textContent = "OBJECTIVE • FIND WHAT CHANGED THE FIELD";
      return;
    }
    baseUpdateQuest();
  };

  const baseUpdate = G.update;
  G.update = dt => {
    baseUpdate(dt);
    if (!G.intro.active) return;

    const intro = G.intro;
    intro.elapsed += dt;
    intro.phaseTime += dt;
    intro.origin.pulse *= Math.pow(0.07, dt);
    intro.breakAge += dt;

    const moved = Math.hypot(p.x - intro.lastX, p.y - intro.lastY);
    intro.distance += moved;
    intro.lastX = p.x;
    intro.lastY = p.y;

    if (intro.phase === "wake" && intro.phaseTime >= 2.6) {
      enterHome();
      return;
    }

    if (intro.phase === "home") {
      intro.homeLights.forEach((light, index) => {
        if (!light.active && Math.hypot(p.x - light.x, p.y - light.y) < 54) wakeHomeLight(light, index);
      });
      return;
    }

    if (intro.phase === "break" && intro.phaseTime >= 2.35) {
      revealBrokenSignal();
      return;
    }

    if (intro.phase === "signal" && intro.phaseTime >= 3.1) {
      completePrologue();
    }
  };
})();