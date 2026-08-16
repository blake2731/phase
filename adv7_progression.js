(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const p = G.player;

  const acq = {
    wrap: document.getElementById("acquisition"),
    kicker: document.getElementById("acquisitionKicker"),
    glyph: document.getElementById("acquisitionGlyph"),
    title: document.getElementById("acquisitionTitle"),
    body: document.getElementById("acquisitionBody"),
    effect: document.getElementById("acquisitionEffect"),
    button: document.getElementById("acquisitionButton")
  };

  function ensureProgression(reset = false) {
    if (reset || !s.abilities) {
      s.abilities = {
        journal: false,
        pulse: false,
        modes: new Set(),
        order: []
      };
    }
    if (!(s.abilities.modes instanceof Set)) s.abilities.modes = new Set(s.abilities.modes || []);
    if (!Array.isArray(s.abilities.order)) s.abilities.order = [];
    if (reset || !Array.isArray(s.acquisitionQueue)) s.acquisitionQueue = [];
    if (reset || typeof s.acquisitionActive !== "boolean") s.acquisitionActive = false;
    if (reset) s.acquisitionCurrent = null;
  }

  G.hasAbility = name => {
    ensureProgression();
    return Boolean(s.abilities[name]);
  };

  G.hasMode = prime => {
    ensureProgression();
    return s.abilities.modes.has(prime);
  };

  function updateHelp() {
    const help = G.el.help;
    if (!help) return;
    ensureProgression();
    const rows = ['<div><strong>Move</strong> WASD / Arrows</div>'];
    if (s.abilities.pulse) rows.push('<div><strong>Pulse</strong> Space / Click</div>');
    if (s.abilities.order.length > 1) rows.push('<div><strong>Tune</strong> Q / E</div>');
    if (s.abilities.journal) rows.push('<div><strong>Journal</strong> J</div>');
    help.innerHTML = rows.join("");
  }

  function updateModeShelf() {
    const shelf = document.getElementById("modeShelf");
    if (!shelf) return;
    ensureProgression();
    if (!s.abilities.pulse) {
      shelf.innerHTML = '<span class="modeLocked">PULSE UNKNOWN</span>';
      return;
    }
    const current = G.PRIMES[p.freqIndex];
    shelf.innerHTML = s.abilities.order.map(prime => {
      const cls = prime === current ? "modeChip active" : "modeChip";
      return '<span class="' + cls + '">' + prime + '</span>';
    }).join("");
  }

  function renderAbilityJournal() {
    const list = document.getElementById("abilityList");
    if (!list) return;
    ensureProgression();
    const entries = [];
    if (s.abilities.journal) entries.push({ glyph:"J", title:"FIELD JOURNAL", text:"Retains laws, observations, bonds and anomalies discovered by P." });
    if (s.abilities.pulse) entries.push({ glyph:"2", title:"PRIME PULSE", text:"Emit a radial disturbance using the active learned mode." });
    s.abilities.order.filter(n => n !== 2).forEach(prime => entries.push({ glyph:String(prime), title:"MODE " + prime, text:"A learned natural mode P can reproduce with Q / E." }));
    list.innerHTML = entries.length
      ? entries.map(item => '<div class="journalEntry abilityEntry"><div class="journalGlyph">' + item.glyph + '</div><strong>' + item.title + '</strong><span>' + item.text + '</span></div>').join("")
      : '<div class="journalEmpty">P has not learned to manipulate the field yet.</div>';
  }

  function setCurrentMode(prime) {
    const index = G.PRIMES.indexOf(prime);
    if (index >= 0) p.freqIndex = index;
    G.updateHud();
    updateModeShelf();
  }

  function addMode(prime) {
    ensureProgression();
    if (s.abilities.modes.has(prime)) return false;
    s.abilities.modes.add(prime);
    s.abilities.order.push(prime);
    if (s.abilities.order.length === 1) setCurrentMode(prime);
    return true;
  }

  function queueAcquisition(item) {
    ensureProgression();
    s.acquisitionQueue.push(item);
    if (!s.acquisitionActive) showNextAcquisition();
  }

  function showNextAcquisition() {
    ensureProgression();
    const item = s.acquisitionQueue.shift();
    if (!item || !acq.wrap) {
      s.acquisitionActive = false;
      s.acquisitionCurrent = null;
      G.paused = false;
      return;
    }
    s.acquisitionActive = true;
    s.acquisitionCurrent = item;
    G.paused = true;
    G.keys.clear();
    acq.wrap.dataset.kind = item.kind || "ability";
    acq.kicker.textContent = item.kicker || "ACQUIRED";
    acq.glyph.textContent = item.glyph || "•";
    acq.title.textContent = item.title || "DISCOVERY";
    acq.body.textContent = item.body || "";
    acq.effect.textContent = item.effect || "";
    acq.button.textContent = item.button || "CONTINUE";
    acq.wrap.classList.add("visible");
    G.chord?.(110, item.chord || [1, 5/4, 3/2, 2]);
  }

  function dismissAcquisition() {
    if (!s.acquisitionActive) return;
    const item = s.acquisitionCurrent;
    acq.wrap?.classList.remove("visible");
    s.acquisitionActive = false;
    s.acquisitionCurrent = null;

    if (s.acquisitionQueue.length) {
      window.setTimeout(showNextAcquisition, 180);
      return;
    }

    G.paused = false;
    if (item?.openJournal) {
      window.setTimeout(() => G.toggleJournal(true), 180);
    }
  }

  acq.button?.addEventListener("click", dismissAcquisition);
  acq.wrap?.addEventListener("click", event => {
    if (event.target === acq.wrap) dismissAcquisition();
  });
  window.addEventListener("keydown", event => {
    if (!s.acquisitionActive) return;
    if (["Space", "Enter", "Escape"].includes(event.code)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      dismissAcquisition();
    }
  }, true);

  G.unlockJournal = () => {
    ensureProgression();
    if (s.abilities.journal) return;
    s.abilities.journal = true;
    G.addKnown("FIELD JOURNAL", "P can now retain what the field teaches instead of letting each event disappear into the next.");
    queueAcquisition({
      kind:"journal",
      kicker:"KEY ITEM",
      glyph:"J",
      title:"FIELD JOURNAL",
      body:"P can retain discoveries now.",
      effect:"Laws, observations, bonds and anomalies will be recorded here.",
      button:"OPEN JOURNAL",
      openJournal:true,
      chord:[1, 4/3, 3/2, 2]
    });
    updateHelp();
    G.refreshJournal();
  };

  G.unlockPulse = () => {
    ensureProgression();
    if (s.abilities.pulse) return;
    s.abilities.pulse = true;
    addMode(2);
    setCurrentMode(2);
    G.addKnown("PRIME PULSE", "P can now disturb the field intentionally instead of only moving through it.");
    queueAcquisition({
      kind:"ability",
      kicker:"ABILITY ACQUIRED",
      glyph:"2",
      title:"PRIME PULSE",
      body:"P learned the first reproducible field mode.",
      effect:"SPACE / CLICK  •  emit MODE 2",
      chord:[1, 3/2, 2]
    });
    updateHelp();
    G.refreshJournal();
  };

  G.unlockMode = (prime, options = {}) => {
    ensureProgression();
    if (!addMode(prime)) return;
    if (options.select !== false) setCurrentMode(prime);
    G.addKnown("MODE " + prime, options.known || ("P can now reproduce natural mode " + prime + "."));
    queueAcquisition({
      kind: options.kind || "mode",
      kicker: options.kicker || "MODE LEARNED",
      glyph: String(prime),
      title: options.title || ("MODE " + prime),
      body: options.body || ("The field answered in " + prime + ". P learned the pattern."),
      effect: options.effect || "Q / E  •  switch learned modes",
      chord: options.chord || [1, 5/4, 3/2, 2]
    });
    updateHelp();
    G.refreshJournal();
  };

  G.onHubEchoRecovered = echo => {
    if (!echo) return;
    if (echo.id === "path") {
      G.unlockJournal();
      return;
    }
    if (echo.id === "pulse") {
      G.unlockPulse();
      return;
    }
    if (echo.id === "tune") {
      G.unlockMode(3, {
        title:"MODE 3",
        body:"The triangular note answered your pulse at a new natural mode.",
        effect:"Q / E  •  switch between 2 and 3",
        chord:[1, 6/5, 3/2, 2]
      });
    }
  };

  const baseReset = G.resetWorld;
  G.resetWorld = () => {
    baseReset();
    ensureProgression(true);
    p.freqIndex = 0;
    updateHelp();
    updateModeShelf();
    renderAbilityJournal();
  };

  const baseEmitWave = G.emitWave;
  G.emitWave = () => {
    ensureProgression();
    if (!s.abilities.pulse) {
      if (s.stage === "origin_hub") G.showMessage("P DOES NOT KNOW HOW TO PULSE YET", 700);
      return;
    }
    baseEmitWave();
  };

  G.changeFrequency = dir => {
    ensureProgression();
    if (!G.running || G.paused || !s.abilities.pulse) return;
    if (s.abilities.order.length < 2) {
      G.showMessage("ONLY MODE 2 IS KNOWN", 650);
      return;
    }
    const current = G.PRIMES[p.freqIndex];
    let index = s.abilities.order.indexOf(current);
    if (index < 0) index = 0;
    index = (index + dir + s.abilities.order.length) % s.abilities.order.length;
    const prime = s.abilities.order[index];
    setCurrentMode(prime);
    G.tone(165 + prime * 18, 0.075, 0.018, "triangle");
    G.showMessage("MODE " + prime, 500);
  };

  const baseToggleJournal = G.toggleJournal;
  G.toggleJournal = force => {
    ensureProgression();
    if (!s.abilities.journal) {
      if (!G.intro?.active) G.showMessage("JOURNAL NOT YET ACQUIRED", 750);
      return;
    }
    baseToggleJournal(force);
  };

  const baseUpdateHud = G.updateHud;
  G.updateHud = () => {
    ensureProgression();
    baseUpdateHud();
    if (!s.abilities.pulse) G.el.freqText.textContent = "—";
    updateModeShelf();
  };

  const baseRefreshJournal = G.refreshJournal;
  G.refreshJournal = () => {
    baseRefreshJournal();
    renderAbilityJournal();
    updateModeShelf();
  };

  const baseActivateBasinNode = G.activateBasinNode;
  G.activateBasinNode = (node, index) => {
    baseActivateBasinNode(node, index);
    if (G.hasMode(5)) return;
    const two = s.basinNodes.find(n => n.prime === 2)?.active;
    const three = s.basinNodes.find(n => n.prime === 3)?.active;
    if (two && three) {
      G.unlockMode(5, {
        kind:"bond",
        kicker:"PATTERN SHARED",
        title:"MODE 5",
        body:"The broken fivefold signal repeats its own pattern close enough for P to learn it.",
        effect:"MODE 5 acquired from the signal",
        chord:[1, 5/4, 3/2, 15/8, 2]
      });
    }
  };

  const baseRepairPhi = G.repairPhi;
  G.repairPhi = () => {
    baseRepairPhi();
    queueAcquisition({
      kind:"bond",
      kicker:"BOND FORMED",
      glyph:"φ",
      title:"PHI",
      body:"The fivefold signal is stable. It chooses to remain with P.",
      effect:"Companion interactions unlocked",
      chord:[1, 5/4, 3/2, 15/8, 2]
    });
  };

  const baseUpdateSecrets = G.updateSecrets;
  G.updateSecrets = () => {
    baseUpdateSecrets();
    if (!G.hasMode(7) && ["basin","span","garden","exit","threshold"].includes(s.stage) && p.x > 1350 && p.x < 1750 && p.y > 250 && p.y < 520) {
      s.sevenBloom = true;
      G.addSecret("A SEVENTH MODE WAS LISTENING", "7", "You looked where no objective pointed. The field answered with another natural mode.");
      G.unlockMode(7, {
        kicker:"OPTIONAL MODE DISCOVERED",
        title:"MODE 7",
        body:"Curiosity uncovered a mode the main path never required.",
        effect:"MODE 7 added to P's learned patterns",
        chord:[1, 7/6, 3/2, 7/4, 2]
      });
    }
  };

  const baseUpdate = G.update;
  G.update = dt => {
    baseUpdate(dt);
    ensureProgression();
    if (s.thresholdCrossed && !G.hasMode(11)) {
      G.unlockMode(11, {
        kind:"anomaly",
        kicker:"DISTANT MODE DETECTED",
        title:"MODE 11",
        body:"The source beyond the Threshold is broadcasting a pattern P has never encountered.",
        effect:"MODE 11 learned from the distant source",
        chord:[1, 11/8, 3/2, 2]
      });
    }
  };

  updateHelp();
  updateModeShelf();
})();