(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;

  const COPY = {
    "FIELD JOURNAL": "Records what P learns.",
    "PRIME PULSE": "Emit a wave in the active mode.",
    "MODE 3": "Reproduce natural mode 3.",
    "MODE 5": "Reproduce natural mode 5.",
    "MODE 7": "Reproduce natural mode 7.",
    "MODE 11": "Reproduce natural mode 11.",
    "POSITION": "P occupies a stable coordinate.",
    "MOTION": "Movement changes P's position.",
    "RESONANCE": "Matching modes produce a strong response.",
    "NATURAL MODES": "Some structures answer only to specific modes.",
    "COHERENT NETWORK": "Several stable modes can support one structure.",
    "SIMULTANEOUS STATE": "Two active resonances can create a path.",
    "ROTATIONAL SYMMETRY": "Fivefold geometry repeats under rotation.",
    "FIELD SENSE": "Compatible structures become easier to notice.",
    "PHI": "A stable fivefold companion.",
    "RELATIONSHIP": "Two systems can change what each other can reach.",
    "VELOCITY ACCESS": "Greater motion resists stronger field currents.",
    "SOURCE BEARING": "The distant source has a measurable direction.",
    "RETURN": "A displaced pattern can be restored.",
    "RESTORED CHORD": "Origin holds its pattern again.",
    "COMPANION REACH": "Phi can remain coherent where P cannot.",
    "COHERENCE EDGE": "P cannot occupy unstable coordinates beyond the field.",
    "LATTICE GATE": "A missing core completes the fivefold gate.",
    "LATTICE CORE": "A fivefold core recovered by Phi. It fits the eastern gate.",
    "CLOSED PATH": "A full orbit returns to the same point with new information.",
    "COMMON FIELD": "Modes 2, 3 and 5 can support one shared structure.",
    "STILL FIELD": "A quiet structure appears when motion approaches zero."
  };

  const EMPTY_COPY = {
    "Abilities": "No field abilities learned yet.",
    "Key Items": "No key structures carried.",
    "Laws": "No laws recorded yet.",
    "Observations": "No optional observations recorded yet.",
    "Bonds": "No bonds formed yet.",
    "Anomalies": "No unresolved anomalies recorded."
  };

  function polygonPoints(n, r = 19, cx = 28, cy = 24, rot = -Math.PI / 2) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = rot + i * Math.PI * 2 / n;
      pts.push((cx + Math.cos(a) * r).toFixed(1) + "," + (cy + Math.sin(a) * r).toFixed(1));
    }
    return pts.join(" ");
  }

  function sketchMarkup(title, glyph) {
    const prime = /^MODE (\d+)$/.test(title) ? Number(title.match(/\d+/)[0]) : (/^\d+$/.test(glyph) ? Number(glyph) : null);
    const base = 'viewBox="0 0 88 52" aria-hidden="true"';
    if (prime && prime >= 2) {
      return `<svg ${base}><polygon points="${polygonPoints(prime)}"/><circle cx="28" cy="24" r="3"/><path d="M52 24h25"/><circle cx="75" cy="24" r="2"/></svg>`;
    }
    if (title === "FIELD JOURNAL") {
      return `<svg ${base}><path d="M15 12h24c6 0 9 4 9 9v20c-3-4-6-6-12-6H15z"/><path d="M48 21c0-5 3-9 9-9h18v23H60c-6 0-9 2-12 6z"/><path d="M22 19h12M22 25h14M56 19h12M56 25h10"/></svg>`;
    }
    if (title === "PRIME PULSE") {
      return `<svg ${base}><circle cx="27" cy="26" r="4"/><circle cx="27" cy="26" r="12"/><circle cx="27" cy="26" r="21"/><path d="M52 26h25"/></svg>`;
    }
    if (["PHI","ROTATIONAL SYMMETRY"].includes(title) || glyph === "φ" || glyph === "S₅") {
      return `<svg ${base}><polygon points="${polygonPoints(5,19,30,26)}"/><path d="M30 7L41 41L12 20L48 20L19 41Z"/><circle cx="67" cy="26" r="7"/></svg>`;
    }
    if (title === "LATTICE CORE" || glyph === "⌬") {
      return `<svg ${base}><polygon points="${polygonPoints(5,21,31,26)}"/><polygon points="${polygonPoints(5,11,31,26,Math.PI/2)}"/><circle cx="31" cy="26" r="3"/><path d="M55 26h22"/></svg>`;
    }
    if (title.includes("COHERENT") || title === "COMMON FIELD") {
      return `<svg ${base}><circle cx="22" cy="19" r="11"/><circle cx="38" cy="19" r="11"/><circle cx="30" cy="32" r="11"/><path d="M51 26h25"/></svg>`;
    }
    if (title.includes("SIMULTANEOUS") || glyph === "∑") {
      return `<svg ${base}><path d="M15 35c10-25 20-25 30 0"/><path d="M15 17c10 25 20 25 30 0"/><path d="M55 14h18M55 38h18M64 14v24"/></svg>`;
    }
    if (title.includes("MOTION") || title.includes("VELOCITY") || glyph === "ΔP" || glyph === "v") {
      return `<svg ${base}><circle cx="18" cy="31" r="3"/><path d="M21 29C34 15 47 16 62 22"/><path d="M58 17l8 6-9 4"/><circle cx="69" cy="23" r="3"/></svg>`;
    }
    if (title === "CLOSED PATH" || glyph === "∮") {
      return `<svg ${base}><ellipse cx="36" cy="26" rx="22" ry="15"/><path d="M54 15l6 5-7 3"/><circle cx="36" cy="11" r="3"/></svg>`;
    }
    if (title === "STILL FIELD" || glyph.includes("0")) {
      return `<svg ${base}><circle cx="30" cy="26" r="4"/><circle cx="30" cy="26" r="13"/><circle cx="30" cy="26" r="22"/><path d="M60 19v14M54 26h12"/></svg>`;
    }
    if (title.includes("SOURCE") || glyph === "→") {
      return `<svg ${base}><circle cx="18" cy="26" r="4"/><path d="M24 26h40"/><path d="M58 19l9 7-9 7"/><circle cx="73" cy="26" r="5"/></svg>`;
    }
    return `<svg ${base}><circle cx="28" cy="26" r="4"/><path d="M14 26h28M28 12v28"/><circle cx="67" cy="26" r="10"/><path d="M57 26h20"/></svg>`;
  }

  function cleanJournalEntries() {
    document.querySelectorAll("#journal section").forEach(section => {
      const heading = section.querySelector("h3")?.textContent?.trim();
      const empty = section.querySelector(".journalEmpty");
      if (empty && EMPTY_COPY[heading]) empty.textContent = EMPTY_COPY[heading];
    });

    document.querySelectorAll("#journal .journalEntry").forEach(entry => {
      const titleEl = entry.querySelector("strong");
      if (!titleEl) return;
      const title = titleEl.textContent.trim();
      const note = entry.querySelector("span:not(.journalEffect)");
      const glyph = entry.querySelector(".journalGlyph")?.textContent?.trim() || "·";
      if (note && COPY[title]) note.textContent = COPY[title];
      if (!entry.querySelector(".journalSketch")) {
        const sketch = document.createElement("div");
        sketch.className = "journalSketch";
        sketch.innerHTML = sketchMarkup(title, glyph);
        entry.appendChild(sketch);
      }
    });
  }

  function milestonePercent() {
    let score = 0;
    if (s.abilities?.journal) score += 8;
    if (s.abilities?.pulse) score += 8;
    if (s.abilities?.modes?.has?.(3)) score += 8;
    if (s.abilities?.modes?.has?.(5)) score += 10;
    if (s.gateOpen) score += 10;
    if (s.bridgeOpen) score += 12;
    if (s.phiRepaired) score += 14;
    if (s.v8?.keyRetrieved) score += 10;
    if (s.v8?.keyInstalled) score += 10;
    if (s.thresholdStarted) score += 5;
    if (s.thresholdCrossed) score += 3;
    if (s.complete) score += 2;
    return Math.min(100, score);
  }

  function journeyRank() {
    if (s.thresholdStarted || s.complete) return 5;
    if (s.phiRepaired) return 4;
    if (s.bridgeOpen) return 3;
    if (s.abilities?.modes?.has?.(5)) return 2;
    if (s.signalMet) return 1;
    return 0;
  }

  function renderProgress() {
    const fill = document.getElementById("journalProgressFill");
    const text = document.getElementById("journalProgressText");
    const nodes = document.getElementById("journeyNodes");
    if (!fill || !text || !nodes) return;
    const pct = milestonePercent();
    fill.style.width = pct + "%";
    text.textContent = pct + "%";
    const rank = journeyRank();
    const data = [["P","SELF"],["◌","SIGNAL"],["{p}","MODES"],["∑","SPAN"],["φ","BOND"],["?","SOURCE"]];
    nodes.innerHTML = data.map((d,i) => `<div class="journeyNode${i<=rank?" unlocked":""}${i===rank?" current":""}"><div class="journeyNodeSymbol">${d[0]}</div><div class="journeyNodeLabel">${d[1]}</div></div>`).join("");
  }

  const baseRefresh = G.refreshJournal;
  G.refreshJournal = () => {
    baseRefresh();
    cleanJournalEntries();
    renderProgress();
  };

  const baseHud = G.updateHud;
  G.updateHud = () => {
    baseHud();
    renderProgress();
  };

  const baseQuest = G.updateQuest;
  G.updateQuest = () => {
    baseQuest();
    renderProgress();
  };

  renderProgress();
})();