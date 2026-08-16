(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;

  const MESSAGE = new Map([
    ["NO STABLE COORDINATES BEYOND THIS EDGE", "FIELD EDGE"],
    ["THE GATE IS MISSING ITS CORE", "KEY MISSING"],
    ["CORE MISSING", "KEY MISSING"],
    ["PHI CAN CROSS THE EDGE", "PHI CAN REACH IT"],
    ["PHI TAKES THE CORE", "PHI TAKES THE KEY"],
    ["PHI LOOKS WEST", "PHI LOOKS WEST"],
    ["PHI CAN REACH BEYOND P'S FIELD", "PHI CAN CROSS THE EDGE"],
    ["FIELD EFFECT • VECTOR STEP", "VECTOR STEP"],
    ["PHI EXTENDED THE INTERACTION", "PHI REACHED IT"],
    ["THE EASTERN BOUNDARY HAS NO STABLE SOLUTION", "BOUNDARY UNSTABLE"],
    ["NO PATH EXISTS HERE YET", "NO PATH"]
  ]);

  const DISCOVERY = {
    "IT ANSWERED": ["RESONANCE", "f = f₀", "The modes match."],
    "THE BASIN BECOMES COHERENT": ["BASIN COHERENT", "R = {2, 3, 5}", "The eastern boundary opens."],
    "TIMING BECAME GEOMETRY": ["PATH FORMED", "A₃(t) + A₅(t)", "Both resonances are active."],
    "φ": ["PHI", "φ = (1 + √5) / 2", "The fivefold signal is stable."],
    "PHI WAS GOING SOMEWHERE": ["A DISTANT SOURCE", "→ ?", "Phi was following something."],
    "MOTION INSUFFICIENT": ["STRONG CURRENT", "|v| < |F|", "The field pushes back."],
    "UNDERSTANDING BECAME ACCESS": ["CURRENT CROSSED", "ΔP / Δt", "Greater motion resists the field."],
    "PATH OPEN": ["GATE OPEN", "key + φ", "The eastern passage is stable."],
    "ORIGIN HOLDS": ["ORIGIN RESTORED", "3 notes returned", "Home is stable again."]
  };

  const baseMessage = G.showMessage;
  G.showMessage = (text, duration) => baseMessage(MESSAGE.get(text) || text, duration);

  const baseDiscovery = G.showDiscovery;
  G.showDiscovery = (title, formula, meaning, duration, observation) => {
    const clean = DISCOVERY[title];
    if (clean) return baseDiscovery(clean[0], clean[1], clean[2], duration, observation);
    const shortMeaning = typeof meaning === "string" && meaning.length > 108
      ? meaning.slice(0, 105).replace(/\s+\S*$/, "") + "…"
      : meaning;
    return baseDiscovery(title, formula, shortMeaning, duration, observation);
  };

  const originalFillText = G.ctx.fillText.bind(G.ctx);
  G.ctx.fillText = function(text, ...args) {
    if (text === "BEYOND P'S COHERENCE") return;
    return originalFillText(text, ...args);
  };

  function renderOwnedQuest() {
    const title = G.el.questTitle;
    const hint = G.el.questHint;
    const progress = G.el.questProgress;
    if (!title || !hint || !progress) return false;

    if (s.stage === "origin_hub") {
      title.textContent = "Restore Origin";
      hint.textContent = "Three notes are missing.";
      progress.textContent = (s.originHub?.recovered || 0) + " / 3";
      return true;
    }

    if (s.stage === "follow") {
      title.textContent = "Follow the signal";
      hint.textContent = "";
      progress.textContent = "EAST";
      return true;
    }

    if (s.stage === "basin") {
      const n = s.basinNodes.filter(x => x.active).length;
      title.textContent = "Wake the resonators";
      hint.textContent = "Match each structure's mode.";
      progress.textContent = n + " / 3";
      return true;
    }

    if (s.stage === "span") {
      const n = s.spanLocks.filter(x => x.timer > 0).length;
      title.textContent = "Hold both resonances";
      hint.textContent = "Wake the second before the first fades.";
      progress.textContent = n + " / 2";
      return true;
    }

    if (s.stage === "garden") {
      const n = s.gardenAnchors.filter(x => x.active).length;
      title.textContent = "Restore the fivefold pattern";
      hint.textContent = "Mode 5. Stay close to each anchor.";
      progress.textContent = n + " / 5";
      return true;
    }

    if (s.stage === "exit" && s.v8 && !s.v8.keyInstalled) {
      if (!s.v8.keyRetrieved) {
        title.textContent = "Find the Fivefold Key";
        hint.textContent = s.v8.keySeen ? "Phi can reach what P cannot." : "The gate is missing its center.";
        progress.textContent = "RETURN WEST";
      } else {
        title.textContent = "Return to the Fivefold Gate";
        hint.textContent = "Phi carries the key.";
        progress.textContent = "EAST";
      }
      return true;
    }

    if (s.stage === "threshold") {
      title.textContent = "Follow the current";
      hint.textContent = G.hasBonus?.("vector_step") ? "Vector Step weakens the resistance." : "The field grows stronger to the east.";
      progress.textContent = "SOURCE AHEAD";
      return true;
    }

    return false;
  }

  const baseQuest = G.updateQuest;
  G.updateQuest = () => {
    // v9 owns the stages it explicitly understands. This avoids running
    // several generations of older quest wrappers before replacing them.
    if (renderOwnedQuest()) return;
    baseQuest();
  };

  function setText(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }

  function cleanAcquisition() {
    const wrap = document.getElementById("acquisition");
    if (!wrap?.classList.contains("visible")) return;
    const title = document.getElementById("acquisitionTitle");
    const body = document.getElementById("acquisitionBody");
    const effect = document.getElementById("acquisitionEffect");
    if (!title || !body || !effect) return;

    const t = title.textContent.trim();
    if (t === "LATTICE CORE") {
      setText(title, "FIVEFOLD KEY");
      setText(body, "Phi reached it.");
      setText(effect, "Fits the eastern gate.");
    } else if (t === "FIELD JOURNAL") {
      setText(body, "P can record discoveries.");
      setText(effect, "Press J to open.");
    } else if (t === "PRIME PULSE") {
      setText(body, "P can emit Mode 2.");
      setText(effect, "SPACE / CLICK");
    } else if (/^MODE \d+$/.test(t)) {
      const n = t.match(/\d+/)[0];
      setText(body, "P learned Mode " + n + ".");
      setText(effect, "Q / E to change mode");
    } else if (t === "PHI") {
      setText(body, "Phi stays with P.");
      setText(effect, "Companion ability unlocked");
    }
  }

  const acquisition = document.getElementById("acquisition");
  if (acquisition) {
    const observer = new MutationObserver(cleanAcquisition);
    observer.observe(acquisition, { attributes:true, childList:true, subtree:true });
  }

  const baseRefresh = G.refreshJournal;
  G.refreshJournal = () => {
    baseRefresh();
    document.querySelectorAll("#keyItemList .journalEntry strong").forEach(el => {
      setText(el, el.textContent.trim() === "LATTICE CORE" ? "FIVEFOLD KEY" : el.textContent);
    });
    document.querySelectorAll("#keyItemList .journalEntry span").forEach(el => {
      setText(el, "Recovered by Phi. Fits the eastern gate.");
    });
  };
})();