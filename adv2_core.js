(() => {
  "use strict";
  const G = window.PHASEV2 = {};

  G.el = {};
  ["game","startScreen","startButton","hud","help","quest","freqText","insightText","signalStatus","areaName","questTitle","questHint","questProgress","message","discovery","discoveryKicker","discoveryTitle","discoveryFormula","discoveryMeaning","journal","closeJournal","knownList","secretList","completePanel","completeSummary","completeStats","continueButton","replayButton"].forEach(id => G.el[id] = document.getElementById(id));
  G.ctx = G.el.game.getContext("2d", { alpha: false });
  G.TAU = Math.PI * 2;
  G.PRIMES = [2, 3, 5, 7, 11, 13];
  G.WORLD = { width: 4300, height: 2000 };
  G.keys = new Set();
  G.screenW = innerWidth;
  G.screenH = innerHeight;
  G.dpr = Math.min(devicePixelRatio || 1, 2);
  G.running = false;
  G.paused = false;
  G.lastTime = performance.now();
  G.gameTime = 0;
  G.audio = null;
  G.messageTimer = null;
  G.discoveryTimer = null;
  G.camera = { x: 0, y: 0 };
  G.player = { x: 260, y: 1000, vx: 0, vy: 0, speed: 292, radius: 9, freqIndex: 0, cooldown: 0, trail: [], stillTime: 0 };
  G.state = {
    stage: "signal", area: "FIRST CLEARING", insight: 0, worldSense: false, complete: false, postGame: false,
    gateOpen: false, bridgeOpen: false, signalMet: false, signalAtBasin: false, phiRepaired: false,
    basinNodes: [], spanLocks: [], gardenAnchors: [], waves: [], bursts: [], collectibles: [], known: [], secrets: [],
    visitedAreas: new Set(), pulseCount: new Map(), reversedSpanOrder: false, spanFirstPrime: null,
    introOrbitAngle: 0, introLastAngle: null, bridgeStillSecret: false, sevenBloom: false,
    signal: { x: 560, y: 1000, targetX: 560, targetY: 1000, phase: 0, pulseTimer: 0.5, visible: true, broken: true, following: false, trust: 0, name: "?" }
  };

  G.clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  G.primeHue = prime => ({ 2:190, 3:205, 5:248, 7:286, 11:328, 13:34 }[prime] ?? 195);

  G.ensureAudio = () => {
    if (!G.audio) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) G.audio = new AudioContext();
    }
    if (G.audio && G.audio.state === "suspended") G.audio.resume();
  };

  G.tone = (freq, duration = 0.1, gainValue = 0.025, type = "sine", delay = 0) => {
    if (!G.audio) return;
    const now = G.audio.currentTime + delay;
    const osc = G.audio.createOscillator();
    const gain = G.audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain); gain.connect(G.audio.destination); osc.start(now); osc.stop(now + duration);
  };

  G.chord = (root, ratios) => ratios.forEach((ratio, i) => G.tone(root * ratio, 0.34, 0.015, "sine", i * 0.035));

  G.resize = () => {
    G.screenW = innerWidth; G.screenH = innerHeight; G.dpr = Math.min(devicePixelRatio || 1, 2);
    G.el.game.width = Math.floor(G.screenW * G.dpr); G.el.game.height = Math.floor(G.screenH * G.dpr);
    G.el.game.style.width = G.screenW + "px"; G.el.game.style.height = G.screenH + "px";
    G.ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
  };

  G.makeNode = (prime, x, y, type = "resonator") => ({
    prime, x, y, type, radius: type === "anchor" ? 25 : 38 + prime * 0.8,
    active: false, timer: 0, reject: 0, resonate: 0, phase: Math.random() * G.TAU
  });

  G.makeCollectible = (x, y, formula, note, frequency = null) => ({ x, y, formula, note, frequency, collected: false, phase: Math.random() * G.TAU });

  G.showMessage = (text, duration = 950) => {
    G.el.message.textContent = text; G.el.message.style.opacity = "1";
    clearTimeout(G.messageTimer); G.messageTimer = setTimeout(() => { G.el.message.style.opacity = "0"; }, duration);
  };

  G.showDiscovery = (title, formula, meaning, duration = 3800, observation = false) => {
    G.el.discoveryKicker.textContent = observation ? "OBSERVATION" : "DISCOVERY";
    G.el.discoveryTitle.textContent = title; G.el.discoveryFormula.textContent = formula; G.el.discoveryMeaning.textContent = meaning;
    G.el.discovery.classList.toggle("observation", observation); G.el.discovery.classList.add("visible");
    clearTimeout(G.discoveryTimer); G.discoveryTimer = setTimeout(() => G.el.discovery.classList.remove("visible"), duration);
  };

  G.addKnown = (title, note) => {
    if (G.state.known.some(item => item.title === title)) return;
    G.state.known.push({ title, note }); G.refreshJournal();
  };

  G.addSecret = (title, formula, note, insight = 1) => {
    if (G.state.secrets.some(item => item.title === title)) return;
    G.state.secrets.push({ title, formula, note }); G.state.insight += insight;
    G.showDiscovery(title, formula, note, 4200, true);
    G.tone(392, 0.12, 0.016, "triangle"); setTimeout(() => G.tone(523.25, 0.18, 0.014, "sine"), 80);
    if (!G.state.worldSense && G.state.secrets.length >= 3) setTimeout(() => { if (!G.state.worldSense) G.unlockWorldSense(); }, 1600);
    G.updateHud(); G.refreshJournal();
  };

  G.unlockWorldSense = () => {
    G.state.worldSense = true;
    G.addKnown("FIELD SENSE", "Curiosity has made compatible structures slightly easier to read through the active frequency lens.");
    G.showDiscovery("FIELD SENSE AWAKENED", "observation → perception", "You found three things nobody required. Compatible structures now answer your active mode with a faint visual emphasis.", 5000);
  };

  G.refreshJournal = () => {
    G.el.knownList.innerHTML = ""; G.el.secretList.innerHTML = "";
    if (!G.state.known.length) G.el.knownList.innerHTML = '<div class="journalEntry"><span>Nothing has been named yet.</span></div>';
    else G.state.known.forEach(item => {
      const div = document.createElement("div"); div.className = "journalEntry";
      div.innerHTML = '<strong>' + item.title + '</strong><span>' + item.note + '</span>'; G.el.knownList.appendChild(div);
    });
    if (!G.state.secrets.length) G.el.secretList.innerHTML = '<div class="journalEntry"><span>The field rewards attention, but it does not announce every question.</span></div>';
    else G.state.secrets.forEach(item => {
      const div = document.createElement("div"); div.className = "journalEntry";
      div.innerHTML = '<strong>' + item.title + ' • ' + item.formula + '</strong><span>' + item.note + '</span>'; G.el.secretList.appendChild(div);
    });
  };

  G.updateHud = () => {
    G.el.freqText.textContent = G.PRIMES[G.player.freqIndex]; G.el.insightText.textContent = G.state.insight; G.el.areaName.textContent = G.state.area;
    if (!G.state.signalMet) G.el.signalStatus.textContent = "SIGNAL • ?";
    else if (!G.state.phiRepaired) G.el.signalStatus.textContent = "SIGNAL • UNSTABLE";
    else G.el.signalStatus.textContent = "PHI • STABLE";
  };

  G.updateQuest = () => {
    const s = G.state;
    if (s.stage === "signal") {
      G.el.questTitle.textContent = "Find the repeating signal";
      G.el.questHint.textContent = "No marker. Listen and watch for the faint fivefold pulse nearby."; G.el.questProgress.textContent = "distance unknown";
    } else if (s.stage === "follow") {
      G.el.questTitle.textContent = "Follow it"; G.el.questHint.textContent = "It reacted to you, then moved east. It waits when you fall behind."; G.el.questProgress.textContent = "signal unstable";
    } else if (s.stage === "basin") {
      const active = s.basinNodes.filter(n => n.active).length;
      G.el.questTitle.textContent = active === 0 ? "It stopped beside a structure" : "Wake the resonator network";
      G.el.questHint.textContent = active === 0 ? "Pulse with Space. If the structure rejects you, inspect its mode and retune with Q or E." : "Each resonator has its own natural mode. Match it, then pulse.";
      G.el.questProgress.textContent = active + " / 3 resonators awake";
    } else if (s.stage === "span") {
      const active = s.spanLocks.filter(n => n.timer > 0).length;
      G.el.questTitle.textContent = "Make a path that does not exist"; G.el.questHint.textContent = "The 3 and 5 locks remember resonance briefly. Sustain both before either memory fades."; G.el.questProgress.textContent = active + " / 2 oscillations sustained";
    } else if (s.stage === "garden") {
      const active = s.gardenAnchors.filter(n => n.active).length;
      G.el.questTitle.textContent = "The signal brought you here"; G.el.questHint.textContent = active === 0 ? "Its missing geometry matches the five anchors around it. Tune to 5 and inspect the whole shape." : "Restore the remaining anchors. Move near them to transfer enough energy."; G.el.questProgress.textContent = active + " / 5 anchors restored";
    } else if (s.stage === "exit") {
      G.el.questTitle.textContent = "Phi is following you"; G.el.questHint.textContent = "A boundary glyph has awakened to the east. You can leave together, or wander first."; G.el.questProgress.textContent = s.insight + " insight • " + s.secrets.length + " observations";
    } else {
      G.el.questTitle.textContent = "The field remains open"; G.el.questHint.textContent = "You finished the demo path. Curiosity can still uncover anything you skipped."; G.el.questProgress.textContent = s.insight + " insight • " + s.secrets.length + " observations";
    }
  };

  G.resetWorld = () => {
    const p = G.player, s = G.state;
    G.gameTime = 0; G.paused = false; p.x = 260; p.y = 1000; p.vx = 0; p.vy = 0; p.freqIndex = 0; p.cooldown = 0; p.trail.length = 0; p.stillTime = 0;
    Object.assign(s, { stage:"signal", area:"FIRST CLEARING", insight:0, worldSense:false, complete:false, postGame:false, gateOpen:false, bridgeOpen:false, signalMet:false, signalAtBasin:false, phiRepaired:false, reversedSpanOrder:false, spanFirstPrime:null, introOrbitAngle:0, introLastAngle:null, bridgeStillSecret:false, sevenBloom:false });
    s.waves.length = 0; s.bursts.length = 0; s.known.length = 0; s.secrets.length = 0; s.visitedAreas = new Set(["FIRST CLEARING"]); s.pulseCount = new Map();
    Object.assign(s.signal, { x:560, y:1000, targetX:560,targetY:1000, phase:0, pulseTimer:0.55, visible:true, broken:true, following:false, trust:0, name:"?" });
    s.basinNodes = [G.makeNode(2,1180,760), G.makeNode(3,1450,1120), G.makeNode(5,1690,650)];
    s.spanLocks = [G.makeNode(3,2220,700,"lock"), G.makeNode(5,2550,1240,"lock")];
    s.gardenAnchors = []; const cx = 3450, cy = 1000;
    for (let i=0;i<5;i++) { const a = -Math.PI/2 + i*G.TAU/5; s.gardenAnchors.push(G.makeNode(5,cx+Math.cos(a)*210,cy+Math.sin(a)*210,"anchor")); }
    s.collectibles = [
      G.makeCollectible(820,610,"P ≠ origin","You checked the edge before following the signal."),
      G.makeCollectible(1520,1470,"7","A sevenfold pattern exists here even though nothing asked you to look for it.",7),
      G.makeCollectible(2320,1450,"∑","Not every useful quantity sits on the shortest path."),
      G.makeCollectible(2940,520,"Δt","The span remembers timing even away from its locks."),
      G.makeCollectible(3750,1480,"φ","The garden was hiding its ratio before you knew its name.",5),
      G.makeCollectible(4050,640,"?","The boundary is not the end of the field.",11)
    ];
    G.el.completePanel.classList.remove("visible"); G.el.journal.classList.remove("visible"); G.refreshJournal(); G.updateHud(); G.updateQuest(); G.updateCamera(1);
  };

  G.startGame = () => {
    G.ensureAudio(); if (G.startMusic) G.startMusic(); G.resetWorld(); G.running = true; G.el.startScreen.classList.remove("visible");
    G.el.hud.classList.remove("storyHidden"); G.el.help.classList.remove("storyHidden"); G.el.quest.classList.remove("storyHidden"); G.lastTime = performance.now();
    G.showDiscovery("LISTEN", "five pulses. one missing.", "Something nearby is repeating a pattern badly. It grows clearer when you move toward it.", 4200);
  };
})();