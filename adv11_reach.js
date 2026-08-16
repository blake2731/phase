(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const p = G.player;

  const TUNE = { x:1325, y:650, hollowR:300 };
  const SUM = { x:2360, y:1840, hollowR:390, modes:new Set() };

  const RANGE = Object.freeze({
    base: 240,
    resonant: 350,
    octave: 420,
    superposition: 490,
    common: 570,
    harmonic: 660
  });

  function ensure(reset = false) {
    if (reset || !s.v11) {
      s.v11 = {
        resonantReach:false,
        octaveReach:false,
        superpositionReach:false,
        commonReach:false,
        harmonicReach:false,
        echoPulse:false,
        sumSolved:false,
        sumModes:new Set(),
        echoQueue:[],
        lastNearMiss:-999
      };
    }
    if (!(s.v11.sumModes instanceof Set)) s.v11.sumModes = new Set(s.v11.sumModes || []);
    if (!Array.isArray(s.v11.echoQueue)) s.v11.echoQueue = [];
  }

  function configureHub() {
    const h = s.originHub;
    if (!h?.echoes) return;
    const tune = h.echoes.find(e => e.id === "tune");
    if (tune) {
      tune.x = TUNE.x;
      tune.y = TUNE.y;
    }
  }

  function hideLegacySum() {
    const legacy = s.collectibles?.find(item => item.formula === "∑");
    if (legacy) legacy.collected = true;
  }

  G.getPulseRange = () => {
    ensure();
    if (s.v11.harmonicReach) return RANGE.harmonic;
    if (s.v11.commonReach) return RANGE.common;
    if (s.v11.superpositionReach || G.hasBonus?.("superposition_reach")) return RANGE.superposition;
    if (s.v11.octaveReach) return RANGE.octave;
    if (s.v11.resonantReach) return RANGE.resonant;
    return RANGE.base;
  };

  function story(title, body, mark, kind = "reach") {
    if (G.showStoryMoment) {
      G.showStoryMoment({
        kind,
        kicker:"RESONANCE",
        title,
        body,
        mark,
        minMs:1250,
        chord:[1, 5/4, 3/2, 2]
      });
    } else {
      G.showDiscovery(title, mark, body, 4200);
    }
  }

  function unlock(flag, title, range, body) {
    ensure();
    if (s.v11[flag]) return;
    s.v11[flag] = true;
    story(title, body, "PULSE RADIUS " + range);
    G.refreshJournal?.();
    G.updateQuest?.();
  }

  const baseReset = G.resetWorld;
  G.resetWorld = () => {
    baseReset();
    ensure(true);
    configureHub();
    hideLegacySum();
    SUM.modes = new Set();
  };

  const baseEmitWave = G.emitWave;
  G.emitWave = () => {
    ensure();
    const before = s.waves.length;
    baseEmitWave();
    if (s.waves.length <= before) return;
    const wave = s.waves[s.waves.length - 1];
    wave.maxR = G.getPulseRange();
    wave.v11PlayerWave = true;
    if (s.v11.echoPulse) {
      s.v11.echoQueue.push({
        x:wave.x,
        y:wave.y,
        prime:wave.prime,
        fireAt:G.gameTime + 0.72,
        range:Math.round(wave.maxR * 0.78)
      });
    }
  };

  const baseAddSecret = G.addSecret;
  G.addSecret = (title, formula, note, insight = 1) => {
    ensure();
    const before = s.secrets.length;
    baseAddSecret(title, formula, note, insight);
    if (s.secrets.length === before) return;

    if (formula === "f_mote ← f_P") {
      unlock("resonantReach", "RESONANT REACH", RANGE.resonant, "Three fieldlings copied P's pulse. Repetition carries farther.");
    } else if (formula === "2 → 4 → 8") {
      unlock("octaveReach", "OCTAVE REACH", RANGE.octave, "Mode 2 repeated into a larger harmonic pattern.");
    } else if (formula === "∑") {
      unlock("superpositionReach", "SUPERPOSITION REACH", RANGE.superposition, "Two modes reached the same distant structure.");
    } else if (formula === "2 · 3 · 5") {
      unlock("commonReach", "COMMON REACH", RANGE.common, "Three natural modes now reinforce one field.");
    } else if (formula === "2 : 3 : 5") {
      unlock("harmonicReach", "HARMONIC REACH", RANGE.harmonic, "A stable harmonic relay carries P's influence farther.");
    } else if (formula === "f_out = f_in" && !s.v11.echoPulse) {
      s.v11.echoPulse = true;
      story("ECHO PULSE", "The field can repeat P's pulse after a short delay.", "SECOND WAVE UNLOCKED", "ability");
      G.refreshJournal?.();
    }
  };

  function pushOutsideCircle(cx, cy, r) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const d = Math.hypot(dx, dy);
    if (d >= r || d < 0.001) return false;
    const scale = r / d;
    p.x = cx + dx * scale;
    p.y = cy + dy * scale;
    p.vx *= 0.15;
    p.vy *= 0.15;
    return true;
  }

  const baseMove = G.updateMovement;
  G.updateMovement = dt => {
    baseMove(dt);
    ensure();
    configureHub();

    if (s.stage === "origin_hub") {
      // The existing Origin hub clamp ends immediately before this hollow.
      // This circular rule makes the visible topology match the collision rule.
      pushOutsideCircle(TUNE.x, TUNE.y, TUNE.hollowR);
    }

    if (!s.v11.sumSolved && ["basin","span","garden","exit","threshold","far_field"].includes(s.stage)) {
      pushOutsideCircle(SUM.x, SUM.y, SUM.hollowR);
    }
  };

  function testSuperpositionTarget(wave) {
    ensure();
    if (s.v11.sumSolved || !G.hasMode?.(3)) return;
    if (![2,3].includes(wave.prime)) return;
    const distance = Math.hypot(SUM.x - wave.x, SUM.y - wave.y);
    if (Math.abs(distance - wave.r) > 34) return;
    const key = "v11sum:" + wave.prime;
    if (wave.hit?.has(key)) return;
    wave.hit?.add(key);
    s.v11.sumModes.add(wave.prime);
    G.tone(250 + wave.prime * 28, .15, .015, "triangle");
    if (s.v11.sumModes.size >= 2) {
      s.v11.sumSolved = true;
      G.addSecret("SUPERPOSITION", "∑", "Modes 2 and 3 reached the same structure across unstable coordinates.");
      G.chord?.(110, [1, 4/3, 3/2, 2]);
    }
  }

  const baseTestWave = G.testWave;
  G.testWave = wave => {
    baseTestWave(wave);
    testSuperpositionTarget(wave);
  };

  function processEchoQueue() {
    ensure();
    for (let i = s.v11.echoQueue.length - 1; i >= 0; i--) {
      const item = s.v11.echoQueue[i];
      if (G.gameTime < item.fireAt) continue;
      s.v11.echoQueue.splice(i, 1);
      s.waves.push({
        x:item.x,
        y:item.y,
        r:0,
        speed:430,
        maxR:item.range,
        prime:item.prime,
        alpha:.72,
        hit:new Set(),
        v11Echo:true
      });
      G.tone(145 + item.prime * 21, .16, .010, "sine");
    }
  }

  const baseUpdate = G.update;
  G.update = dt => {
    ensure();
    configureHub();

    // Before Resonant Reach, suppress the older hint that tells the player
    // to pulse the unreachable Mode 3 note. The fieldlings are the lesson.
    if (s.stage === "origin_hub" && s.abilities?.pulse && !s.v11.resonantReach && s.originHub) {
      s.originHub.hintAge = 0;
    }

    baseUpdate(dt);
    if (!G.running || G.paused) return;

    if (!s.v11.resonantReach && s.originHub?.moteDiscoveries >= 3) {
      unlock("resonantReach", "RESONANT REACH", RANGE.resonant, "Three fieldlings copied P's pulse. Repetition carries farther.");
    }

    if (G.hasBonus?.("superposition_reach") && !s.v11.superpositionReach) {
      unlock("superpositionReach", "SUPERPOSITION REACH", RANGE.superposition, "Two modes can reinforce the same distant response.");
    }

    processEchoQueue();
  };

  const baseQuest = G.updateQuest;
  G.updateQuest = () => {
    ensure();
    if (s.stage === "origin_hub" && s.abilities?.pulse && !s.v11.resonantReach) {
      G.el.questTitle.textContent = "Restore Origin";
      G.el.questHint.textContent = "The small fieldlings react to Mode 2.";
      G.el.questProgress.textContent = "PULSE REACH • " + G.getPulseRange();
      return;
    }
    if (s.stage === "origin_hub" && s.v11.resonantReach) {
      const tune = s.originHub?.echoes?.find(e => e.id === "tune");
      if (tune && !tune.done) {
        G.el.questTitle.textContent = "Restore Origin";
        G.el.questHint.textContent = "Your Pulse reaches farther now.";
        G.el.questProgress.textContent = "TRIANGULAR NOTE • EAST";
        return;
      }
    }
    baseQuest();
  };

  const baseRefresh = G.refreshJournal;
  G.refreshJournal = () => {
    baseRefresh();
    ensure();
    const bonuses = document.getElementById("journalBonuses");
    if (bonuses) {
      const chip = document.createElement("span");
      chip.className = "bonusChip v11ReachChip";
      chip.textContent = "PULSE REACH • " + G.getPulseRange();
      bonuses.appendChild(chip);
      if (s.v11.echoPulse) {
        const echo = document.createElement("span");
        echo.className = "bonusChip";
        echo.textContent = "ECHO PULSE • ACTIVE";
        bonuses.appendChild(echo);
      }
    }
    document.querySelectorAll("#abilityList .journalEntry").forEach(entry => {
      const title = entry.querySelector("strong")?.textContent?.trim();
      if (title !== "PRIME PULSE") return;
      const note = entry.querySelector("span:not(.journalEffect)");
      if (note) note.textContent = "Emit the active mode. Current radius: " + G.getPulseRange() + ".";
    });
  };

  G.V11 = { TUNE, SUM, RANGE };
  ensure();
})();