(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const p = G.player;
  const BASE_SPEED = 292;

  const BOONS = Object.freeze({
    "P ≠ origin": {
      id: "vector_step",
      name: "VECTOR STEP",
      glyph: "ΔP",
      effect: "+15% movement speed",
      note: "Displacement is no longer just recorded. You use it to move through the field more efficiently."
    },
    "∑": {
      id: "superposition_reach",
      name: "SUPERPOSITION REACH",
      glyph: "∑",
      effect: "+18% pulse reach",
      note: "Your pulse holds useful amplitude farther from its origin."
    },
    "Δt": {
      id: "temporal_memory",
      name: "TEMPORAL MEMORY",
      glyph: "Δt",
      effect: "+35% resonance memory",
      note: "Systems you excite retain their useful state longer before decay wins."
    },
    "φ": {
      id: "phi_reach",
      name: "PHI REACH",
      glyph: "φ",
      effect: "+40% companion reach",
      note: "Phi can complete interactions farther from your own position."
    }
  });

  const LAW_GLYPHS = Object.freeze({
    "POSITION": "P",
    "MOTION": "v",
    "RESONANCE": "≈",
    "NATURAL MODES": "f",
    "COHERENT NETWORK": "R",
    "SIMULTANEOUS STATE": "∑",
    "ROTATIONAL SYMMETRY": "S₅",
    "FIELD SENSE": "Φ",
    "PHI": "φ",
    "RELATIONSHIP": "↔",
    "VELOCITY ACCESS": "v+",
    "SOURCE BEARING": "→"
  });

  function ensureProgressState(reset = false) {
    if (reset || !(s.bonuses instanceof Set)) s.bonuses = new Set();
    if (reset || !Array.isArray(s.bonds)) s.bonds = [];
    if (reset || !Array.isArray(s.anomalies)) s.anomalies = [];
    if (reset || typeof s.thresholdStarted !== "boolean") s.thresholdStarted = false;
    if (reset || typeof s.thresholdCrossed !== "boolean") s.thresholdCrossed = false;
    if (reset || typeof s.thresholdBlockedTime !== "number") s.thresholdBlockedTime = 0;
    if (reset || typeof s.thresholdWarningCooldown !== "number") s.thresholdWarningCooldown = 0;
  }

  G.hasBonus = id => {
    ensureProgressState();
    return s.bonuses.has(id);
  };

  G.applyBonuses = () => {
    ensureProgressState();
    p.speed = BASE_SPEED * (G.hasBonus("vector_step") ? 1.15 : 1);
  };

  G.unlockBonus = boon => {
    ensureProgressState();
    if (!boon || s.bonuses.has(boon.id)) return;
    s.bonuses.add(boon.id);
    G.applyBonuses();
    G.showMessage("FIELD EFFECT • " + boon.name, 1450);
    G.tone(466.16, 0.1, 0.014, "triangle");
    setTimeout(() => G.tone(698.46, 0.16, 0.011, "sine"), 90);
    G.refreshJournal();
  };

  const baseAddSecret = G.addSecret;
  G.addSecret = (title, formula, note, insight = 1) => {
    const before = s.secrets.length;
    baseAddSecret(title, formula, note, insight);
    if (s.secrets.length > before && BOONS[formula]) G.unlockBonus(BOONS[formula]);
    if (s.secrets.length > before && formula === "?") {
      ensureProgressState();
      if (!s.anomalies.some(item => item.title === title)) s.anomalies.push({ title, formula, note });
    }
    G.refreshJournal();
  };

  const baseRepairPhi = G.repairPhi;
  G.repairPhi = () => {
    baseRepairPhi();
    ensureProgressState();
    if (!s.bonds.some(item => item.title === "PHI")) {
      s.bonds.push({
        title: "PHI",
        glyph: "φ",
        note: "A damaged fivefold system stabilized after you restored its symmetry. It chose to remain near you.",
        effect: "Companion interactions enabled"
      });
    }
    G.refreshJournal();
  };

  const baseEmitWave = G.emitWave;
  G.emitWave = () => {
    const before = s.waves.length;
    baseEmitWave();
    if (s.waves.length > before && G.hasBonus("superposition_reach")) {
      const wave = s.waves[s.waves.length - 1];
      wave.maxR *= 1.18;
    }
  };

  const baseActivateSpanLock = G.activateSpanLock;
  G.activateSpanLock = node => {
    baseActivateSpanLock(node);
    if (G.hasBonus("temporal_memory") && node.timer > 0 && node.timer < 900) node.timer *= 1.35;
  };

  const baseUpdateCollectibles = G.updateCollectibles;
  G.updateCollectibles = () => {
    baseUpdateCollectibles();
    if (!G.hasBonus("phi_reach") || !s.phiRepaired || !s.signal.following) return;
    s.collectibles.forEach(item => {
      if (item.collected) return;
      if (item.frequency !== null && G.PRIMES[p.freqIndex] !== item.frequency) return;
      if (Math.hypot(s.signal.x - item.x, s.signal.y - item.y) > 102) return;
      item.collected = true;
      s.insight += 1;
      s.bursts.push({ x:item.x, y:item.y, prime:5, age:0, duration:1.3, kind:"friend" });
      G.showMessage("PHI EXTENDED THE INTERACTION", 1150);
      G.chord(146.83, [1,5/4,3/2]);
      G.addSecret("FOUND • " + item.formula, item.formula, item.note, 0);
      G.updateHud();
    });
  };

  function stageRank() {
    if (s.complete) return 5;
    if (s.stage === "threshold") return 5;
    if (s.phiRepaired || s.stage === "exit") return 4;
    if (s.stage === "garden") return 4;
    if (s.stage === "span") return 3;
    if (s.stage === "basin") return 2;
    if (s.signalMet || s.stage === "follow") return 1;
    return 0;
  }

  function journeyPercent() {
    if (s.complete) return 100;
    if (s.stage === "threshold") return s.thresholdCrossed ? 97 : 93;
    if (s.stage === "exit") return 89;
    if (s.stage === "garden") return 68 + s.gardenAnchors.filter(n => n.active).length * 4;
    if (s.stage === "span") return 53 + s.spanLocks.filter(n => n.timer > 0).length * 6;
    if (s.stage === "basin") return 27 + s.basinNodes.filter(n => n.active).length * 8;
    if (s.stage === "follow") return 22;
    if (s.stage === "signal") return 15;
    if (s.stage === "awakening") return Math.max(3, Math.min(12, Math.round((G.intro?.distance || 0) / 42)));
    return 5;
  }

  function currentNodeMarkup(index, glyph, label, rank) {
    const classes = ["journeyNode"];
    if (index <= rank) classes.push("unlocked");
    if (index === rank) classes.push("current");
    return '<div class="' + classes.join(" ") + '"><div class="journeyNodeSymbol">' + glyph + '</div><div class="journeyNodeLabel">' + label + '</div></div>';
  }

  function renderProgress() {
    const fill = document.getElementById("journalProgressFill");
    const text = document.getElementById("journalProgressText");
    const nodes = document.getElementById("journeyNodes");
    if (!fill || !text || !nodes) return;
    const percent = journeyPercent();
    fill.style.width = percent + "%";
    text.textContent = percent + "%";
    const rank = stageRank();
    nodes.innerHTML = [
      currentNodeMarkup(0, "P", "SELF", rank),
      currentNodeMarkup(1, "◌", "SIGNAL", rank),
      currentNodeMarkup(2, "{p}", "MODES", rank),
      currentNodeMarkup(3, "∑", "SPAN", rank),
      currentNodeMarkup(4, "φ", "BOND", rank),
      currentNodeMarkup(5, "?", "SOURCE", rank)
    ].join("");
  }

  function effectForLaw(title) {
    if (title === "FIELD SENSE") return "Effect: compatible structures receive stronger visual emphasis.";
    if (title === "VELOCITY ACCESS") return "Effect: sufficient motion can cross high gradient regions.";
    return "";
  }

  function entryHtml(glyph, title, note, effect = "") {
    return '<div class="journalEntry"><div class="journalGlyph">' + glyph + '</div><strong>' + title + '</strong><span>' + note + '</span>' + (effect ? '<span class="journalEffect">' + effect + '</span>' : '') + '</div>';
  }

  G.refreshJournal = () => {
    ensureProgressState();
    const knownList = document.getElementById("knownList");
    const secretList = document.getElementById("secretList");
    const bondList = document.getElementById("bondList");
    const anomalyList = document.getElementById("anomalyList");
    const bonuses = document.getElementById("journalBonuses");
    if (!knownList || !secretList || !bondList || !anomalyList) return;

    knownList.innerHTML = s.known.length
      ? s.known.map(item => entryHtml(LAW_GLYPHS[item.title] || "·", item.title, item.note, effectForLaw(item.title))).join("")
      : '<div class="journalEmpty">Nothing has been named yet. Experience comes before explanation.</div>';

    const ordinarySecrets = s.secrets.filter(item => item.formula !== "?");
    secretList.innerHTML = ordinarySecrets.length
      ? ordinarySecrets.map(item => {
          const boon = BOONS[item.formula];
          return entryHtml(item.formula, item.title, item.note, boon && G.hasBonus(boon.id) ? "Effect: " + boon.effect : "");
        }).join("")
      : '<div class="journalEmpty">The field rewards attention, but it does not announce every question.</div>';

    bondList.innerHTML = s.bonds.length
      ? s.bonds.map(item => entryHtml(item.glyph || "↔", item.title, item.note, item.effect || "")).join("")
      : '<div class="journalEmpty">No other system has chosen to remain with you.</div>';

    anomalyList.innerHTML = s.anomalies.length
      ? s.anomalies.map(item => entryHtml(item.formula || "?", item.title, item.note, "Further implications unknown")).join("")
      : '<div class="journalEmpty">Nothing currently violates your model of the field.</div>';

    if (bonuses) {
      const active = Object.values(BOONS).filter(boon => G.hasBonus(boon.id));
      bonuses.innerHTML = active.length
        ? active.map(boon => '<span class="bonusChip">' + boon.name + ' • ' + boon.effect + '</span>').join("")
        : '<span class="bonusChip">NO ACTIVE FIELD EFFECTS</span>';
    }
    renderProgress();
  };

  const baseUpdateHud = G.updateHud;
  G.updateHud = () => {
    baseUpdateHud();
    renderProgress();
  };

  const baseUpdateQuest = G.updateQuest;
  G.updateQuest = () => {
    if (s.stage === "threshold") {
      G.el.questTitle.textContent = G.hasBonus("vector_step") ? "Follow Phi toward the source" : "Your motion is insufficient";
      G.el.questHint.textContent = G.hasBonus("vector_step")
        ? "The eastern current is strong, but your retained understanding of displacement lets you move through it."
        : "The current exceeds your present motion. Your journal still contains an unresolved displacement near the beginning of the journey.";
      G.el.questProgress.textContent = G.hasBonus("vector_step") ? "VECTOR STEP ACTIVE • source ahead" : "FIELD EFFECT REQUIRED • inspect earlier observations";
      renderProgress();
      return;
    }
    baseUpdateQuest();
    renderProgress();
  };

  const baseResetWorld = G.resetWorld;
  G.resetWorld = () => {
    baseResetWorld();
    ensureProgressState(true);
    G.WORLD.width = 5400;
    G.applyBonuses();
    G.refreshJournal();
  };

  const baseUpdateArea = G.updateArea;
  G.updateArea = () => {
    baseUpdateArea();
    if (s.thresholdStarted && p.x >= 4050 && s.area !== "THE THRESHOLD") {
      s.area = "THE THRESHOLD";
      G.el.areaName.textContent = s.area;
      if (!s.visitedAreas.has(s.area)) {
        s.visitedAreas.add(s.area);
        G.showMessage(s.area, 1100);
      }
    }
  };

  const baseFinishDemo = G.finishDemo;
  G.finishDemo = () => {
    ensureProgressState();
    if (!s.thresholdStarted) {
      s.thresholdStarted = true;
      s.stage = "threshold";
      s.area = "THE THRESHOLD";
      s.thresholdBlockedTime = 0;
      s.thresholdWarningCooldown = 0;
      G.el.areaName.textContent = s.area;
      G.showDiscovery(
        "PHI WAS GOING SOMEWHERE",
        "direction ≠ destination",
        "The garden was not the end of its route. Beyond the boundary, a persistent source is pulling on the same fivefold pattern.",
        5400
      );
      G.chord(110, [1, 9/8, 3/2]);
      G.updateQuest();
      G.refreshJournal();
      return;
    }
    baseFinishDemo();
  };

  const baseUpdateMovement = G.updateMovement;
  G.updateMovement = dt => {
    baseUpdateMovement(dt);
    if (s.stage !== "threshold") return;

    s.thresholdWarningCooldown = Math.max(0, s.thresholdWarningCooldown - dt);
    if (p.x > 4380 && !G.hasBonus("vector_step")) {
      s.thresholdBlockedTime += dt;
      p.x = Math.min(p.x, 4470);
      p.vx = Math.min(p.vx, -70);
      if (s.thresholdWarningCooldown <= 0) {
        s.thresholdWarningCooldown = 2.2;
        G.showMessage("CURRENT > MOTION", 900);
      }
      if (s.thresholdBlockedTime > 1.8 && !s.known.some(item => item.title === "VELOCITY ACCESS")) {
        G.addKnown("VELOCITY ACCESS", "Some regions are not locked by a key. Their field gradient simply exceeds the motion you can currently sustain.");
        G.showDiscovery("MOTION INSUFFICIENT", "|v| < v_threshold", "The barrier is not refusing you. You are physically failing to cross its gradient. Something you observed earlier may change that.", 5000);
      }
      G.updateQuest();
      return;
    }

    if (G.hasBonus("vector_step") && !s.thresholdCrossed && p.x > 4580) {
      s.thresholdCrossed = true;
      G.addKnown("VELOCITY ACCESS", "A retained understanding of displacement changed your movement enough to cross a field gradient that previously exceeded you.");
      G.showDiscovery("UNDERSTANDING BECAME ACCESS", "ΔP / Δt > v_threshold", "The same world became traversable because what you learned changed what you could do.", 4800);
      G.updateQuest();
    }

    if (p.x > 5160) {
      if (!s.anomalies.some(item => item.title === "SOURCE BEARING")) {
        s.anomalies.push({
          title: "SOURCE BEARING",
          formula: "→ ?",
          note: "Phi's pulse and the distant source share structure. Its journey had a direction before you understood there was a destination."
        });
      }
      G.addKnown("SOURCE BEARING", "The unknown source gives the journey a measurable direction. Phi appears to have been trying to reach it before you met.");
      baseFinishDemo();
      const title = document.getElementById("completeTitle");
      if (title) title.textContent = "The signal had a destination.";
      G.el.completeSummary.textContent = "You learned enough of the field to help Phi, used retained knowledge to cross a region that once exceeded you, and established a bearing toward the source it was trying to reach.";
      G.el.completeStats.textContent = s.insight + " insight • " + s.secrets.length + " observations • " + s.known.length + " laws recorded";
      G.refreshJournal();
    }
  };

  ensureProgressState();
})();
