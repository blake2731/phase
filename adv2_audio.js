(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;

  const PHI = (1 + Math.sqrt(5)) / 2;
  const JUST = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8];
  const MUSIC_BASE_GAIN = 0.32;
  const AREA_ROOT = {
    "FIRST CLEARING": 55,
    "COORDINATE BASIN": 55 * 9 / 8,
    "RESONANT SPAN": 55 * 4 / 3,
    "SYMMETRY GARDEN": 55 * 3 / 2
  };

  let graph = null;
  let musicTimer = null;
  let musicStep = 0;
  let lastArea = "";

  function buildGraph() {
    if (!G.audio) return null;
    if (graph && graph.ctx === G.audio) return graph;

    const ctx = G.audio;
    const master = ctx.createGain();
    const music = ctx.createGain();
    const sfx = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();

    master.gain.value = 0.82;
    music.gain.value = MUSIC_BASE_GAIN;
    sfx.gain.value = 0.78;
    compressor.threshold.value = -20;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.012;
    compressor.release.value = 0.25;

    music.connect(master);
    sfx.connect(master);
    master.connect(compressor);
    compressor.connect(ctx.destination);

    graph = { ctx, master, music, sfx, compressor };
    return graph;
  }

  G.ensureAudio = () => {
    if (!G.audio) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) G.audio = new AudioContext();
    }
    if (G.audio && G.audio.state === "suspended") G.audio.resume();
    buildGraph();
  };

  function voice(freq, when, duration, volume, type, destination, detune = 0) {
    if (!G.audio || !destination) return;
    const ctx = G.audio;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    osc.detune.setValueAtTime(detune, when);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(5200, Math.max(900, freq * 9)), when);
    filter.Q.setValueAtTime(0.35, when);

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + Math.min(0.12, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    osc.start(when);
    osc.stop(when + duration + 0.03);
  }

  G.tone = (freq, duration = 0.1, gainValue = 0.025, type = "sine", delay = 0) => {
    if (!G.audio) return;
    const g = buildGraph();
    if (!g) return;
    const when = G.audio.currentTime + Math.max(0, delay);
    voice(freq, when, duration, gainValue, type, g.sfx);
  };

  G.chord = (root, ratios) => {
    ratios.forEach((ratio, i) => G.tone(root * ratio, 0.42, 0.015, "sine", i * 0.035));
  };

  G.duckMusic = (level = 0.075, holdSeconds = 1.45, recoverSeconds = 0.6) => {
    if (!G.audio) return;
    const g = buildGraph();
    if (!g) return;
    const now = G.audio.currentTime;
    const target = Math.max(0.015, Math.min(MUSIC_BASE_GAIN, level));
    const hold = Math.max(0.1, holdSeconds);
    const recover = Math.max(0.15, recoverSeconds);
    const current = Math.max(0.0001, g.music.gain.value || MUSIC_BASE_GAIN);

    g.music.gain.cancelScheduledValues(now);
    g.music.gain.setValueAtTime(current, now);
    g.music.gain.exponentialRampToValueAtTime(target, now + 0.09);
    g.music.gain.setValueAtTime(target, now + hold);
    g.music.gain.exponentialRampToValueAtTime(MUSIC_BASE_GAIN, now + hold + recover);
  };

  // Exploration pads keep the same harmonic identity, but routine ambience no
  // longer sustains the 55 Hz fundamental. The lowest sustained voice now sits
  // an octave higher, leaving the deep register available for real tension.
  function padChord(root, ratios, when, duration = 3.8, volume = 0.016) {
    const g = buildGraph();
    if (!g) return;
    ratios.forEach((ratio, i) => {
      const f = root * ratio * 2;
      voice(f, when + i * 0.038, duration * 0.86, volume * 0.82, "sine", g.music, i % 2 ? 2.5 : -2.5);
      voice(f * 2, when + i * 0.038, duration * 0.68, volume * 0.12, "triangle", g.music, i % 2 ? -3 : 3);
    });
  }

  function pluck(freq, when, volume = 0.018, duration = 0.75) {
    const g = buildGraph();
    if (!g) return;
    voice(freq, when, duration, volume, "triangle", g.music);
    voice(freq * 2, when + 0.018, duration * 0.58, volume * 0.22, "sine", g.music);
  }

  // Instead of one static low drone, exploration gets a quiet four-note bass
  // contour. It moves through consonant ratios and returns without sounding
  // like a warning siren under every scene.
  function bassFigure(root, when, area) {
    const g = buildGraph();
    if (!g) return;
    const figures = area === "RESONANT SPAN"
      ? [1, 4 / 3, 3 / 2, 9 / 8]
      : area === "SYMMETRY GARDEN"
        ? [1, 5 / 4, 15 / 8, 3 / 2]
        : [1, 3 / 2, 5 / 4, 15 / 8];
    figures.forEach((ratio, i) => {
      voice(root * 2 * ratio, when + i * 0.22, 0.48, 0.0048, i % 2 ? "triangle" : "sine", g.music);
    });
  }

  function getRoot() {
    const area = G.state?.area || "FIRST CLEARING";
    return AREA_ROOT[area] || 55;
  }

  function musicTick() {
    if (!G.audio || !G.running) return;
    const ctx = G.audio;
    const now = ctx.currentTime + 0.035;
    const area = G.state?.area || "FIRST CLEARING";
    const root = getRoot();
    const phiIndex = Math.floor(((musicStep * PHI) % 1) * JUST.length);
    const degree = JUST[phiIndex];
    const prime = G.PRIMES?.[G.player?.freqIndex || 0] || 2;

    if (area !== lastArea) {
      lastArea = area;
      padChord(root, [1, 5 / 4, 3 / 2], now, 4.6, 0.015);
      bassFigure(root, now + 0.18, area);
    }

    if (musicStep % 8 === 0) {
      const areaChord = area === "RESONANT SPAN"
        ? [1, 4 / 3, 3 / 2]
        : area === "SYMMETRY GARDEN"
          ? [1, 5 / 4, 3 / 2, 15 / 8]
          : [1, 5 / 4, 3 / 2];
      padChord(root, areaChord, now, 4.8, G.state?.phiRepaired ? 0.018 : 0.014);
      if (musicStep > 0) bassFigure(root, now + 0.16, area);
    }

    if (musicStep % 2 === 0) {
      const octave = musicStep % 10 === 0 ? 4 : 2;
      pluck(root * degree * octave, now + 0.06, 0.011 + Math.min(0.006, prime * 0.00045), 0.7 + (prime % 3) * 0.11);
    }

    if (musicStep % 16 === 6 || musicStep % 16 === 11) {
      const modeRatio = JUST[(G.player?.freqIndex || 0) % JUST.length];
      pluck(root * modeRatio * 4, now + 0.13, 0.008, 1.15);
    }

    if (G.state?.phiRepaired && musicStep % 4 === 1) {
      const friendDegrees = [1, 5 / 4, 3 / 2, 15 / 8, 2];
      const idx = musicStep % friendDegrees.length;
      pluck(root * friendDegrees[idx] * 2, now + 0.21, 0.009, 1.35);
    }

    musicStep += 1;
  }

  G.startMusic = () => {
    G.ensureAudio();
    if (!G.audio) return;
    if (musicTimer) return;
    musicStep = 0;
    lastArea = "";
    musicTick();
    const intervalMs = Math.round(1000 * (1 / PHI));
    musicTimer = window.setInterval(musicTick, intervalMs);
  };

  G.stopMusic = () => {
    if (musicTimer) window.clearInterval(musicTimer);
    musicTimer = null;
  };

  G.musicMath = Object.freeze({
    phi: PHI,
    justRatios: JUST.slice(),
    pulseMilliseconds: Math.round(1000 * (1 / PHI))
  });
})();