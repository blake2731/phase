(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const p = G.player;

  const opening = document.getElementById("openingSequence");
  const kicker = document.getElementById("openingKicker");
  const title = document.getElementById("openingTitle");
  const formula = document.getElementById("openingFormula");
  const prompt = document.getElementById("openingPrompt");
  const ready = document.getElementById("openingReady");

  G.intro = {
    active: false,
    phase: "idle",
    elapsed: 0,
    distance: 0,
    phaseTime: 0,
    lastX: p.x,
    lastY: p.y
  };

  function setOpening(nextKicker, nextTitle, nextFormula, nextPrompt, readyText = "") {
    if (!opening) return;
    kicker.textContent = nextKicker;
    title.textContent = nextTitle;
    formula.textContent = nextFormula;
    prompt.textContent = nextPrompt;
    ready.textContent = readyText;
    ready.classList.toggle("visible", Boolean(readyText));
    opening.classList.add("visible");
  }

  function setPhase(phase) {
    G.intro.phase = phase;
    G.intro.phaseTime = 0;
  }

  function beginOpening() {
    G.resetWorld();
    G.running = true;
    G.paused = false;
    G.lastTime = performance.now();
    s.stage = "awakening";
    s.area = "FIRST CLEARING";
    s.signal.visible = false;
    p.speed = 224;

    G.el.startScreen.classList.remove("visible");
    G.el.hud.classList.add("storyHidden");
    G.el.help.classList.add("storyHidden");
    G.el.quest.classList.add("storyHidden");
    G.el.discovery.classList.remove("visible");
    G.el.completePanel.classList.remove("visible");

    G.intro.active = true;
    G.intro.phase = "orient";
    G.intro.elapsed = 0;
    G.intro.phaseTime = 0;
    G.intro.distance = 0;
    G.intro.lastX = p.x;
    G.intro.lastY = p.y;

    if (G.startMusic) G.startMusic();
    else G.ensureAudio();

    setOpening(
      "FIRST OBSERVATION",
      "YOU ARE HERE",
      "P = (x, y)",
      "Nothing is asking anything of you yet. Move when you are ready."
    );
  }

  function enterMotionBeat() {
    setPhase("motion");
    G.addKnown("POSITION", "A point can describe its location with coordinates. For now, this is the simplest thing you know about yourself.");
    G.tone(220, 0.16, 0.011, "sine");
    setOpening(
      "SECOND OBSERVATION",
      "MOTION LEAVES EVIDENCE",
      "ΔP ≠ 0",
      "The field can distinguish where you are from where you were. Keep moving. There is no wrong direction here."
    );
  }

  function enterReadyBeat() {
    setPhase("ready");
    G.addKnown("MOTION", "Change in position over time gives motion a measurable direction and magnitude. Your trail is evidence that a state changed.");
    G.tone(275, 0.18, 0.011, "triangle");
    setOpening(
      "THE FIELD IS QUIET",
      "LISTEN BEFORE YOU ACT",
      "v = ΔP / Δt",
      "You know enough to move through it. Stay here as long as you want and listen to the field.",
      "SPACE OR CLICK WHEN YOU ARE READY"
    );
  }

  function revealSignal() {
    if (G.intro.phase !== "ready") return;
    setPhase("reveal");
    const sig = s.signal;
    sig.x = G.clamp(p.x + 300, 520, 900);
    sig.y = G.clamp(p.y + (p.y < 1000 ? 95 : -95), 420, 1580);
    sig.targetX = sig.x;
    sig.targetY = sig.y;
    sig.visible = true;
    sig.pulseTimer = 0;

    G.chord(146.83, [1, 5/4]);
    setOpening(
      "A SECOND SYSTEM",
      "SOMETHING ANSWERED",
      "5 pulses • 1 missing",
      "It is nearby. The rhythm is incomplete, and it did not begin until you moved."
    );
  }

  function finishOpening() {
    G.intro.active = false;
    G.intro.phase = "complete";
    s.stage = "signal";
    if (G.applyBonuses) G.applyBonuses();
    else p.speed = 292;

    opening.classList.remove("visible");
    G.el.hud.classList.remove("storyHidden");
    G.el.help.classList.remove("storyHidden");
    G.el.quest.classList.remove("storyHidden");
    G.updateHud();
    G.updateQuest();
    G.refreshJournal();
    G.showMessage("FIELD JOURNAL AVAILABLE • J", 1250);
  }

  const baseStartGame = G.startGame;
  G.startGame = () => beginOpening();

  const baseEmitWave = G.emitWave;
  G.emitWave = () => {
    if (G.intro.active) {
      if (G.intro.phase === "ready") revealSignal();
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
      G.showMessage("NOTHING HAS BEEN RETAINED YET", 800);
      return;
    }
    baseToggleJournal(force);
  };

  const baseUpdate = G.update;
  G.update = dt => {
    baseUpdate(dt);
    if (!G.intro.active) return;

    const intro = G.intro;
    intro.elapsed += dt;
    intro.phaseTime += dt;

    const moved = Math.hypot(p.x - intro.lastX, p.y - intro.lastY);
    intro.distance += moved;
    intro.lastX = p.x;
    intro.lastY = p.y;

    if (intro.phase !== "reveal") {
      if (p.x > 900) {
        p.x = 900;
        p.vx = Math.min(0, p.vx);
      }
      p.y = G.clamp(p.y, 260, 1740);
    }

    if (intro.phase === "orient" && intro.elapsed >= 2 && intro.distance >= 90) {
      enterMotionBeat();
      return;
    }

    if (intro.phase === "motion" && intro.elapsed >= 6.5 && intro.distance >= 360) {
      enterReadyBeat();
      return;
    }

    if (intro.phase === "reveal" && intro.phaseTime >= 3.2) finishOpening();
  };
})();
