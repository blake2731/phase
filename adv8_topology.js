(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const p = G.player;

  const KEY = { x: 48, y: 1375 };
  const GATE = { x: 3970, y: 1000 };

  const leftEdge = y => 112 + Math.sin(y * 0.0062) * 18 + Math.sin(y * 0.017) * 8;
  const rightEdge = y => 5290 + Math.sin(y * 0.0055 + 1.3) * 18 + Math.sin(y * 0.014) * 7;
  const topEdge = x => 132 + Math.sin(x * 0.0031) * 42 + Math.sin(x * 0.0107 + 0.8) * 16;
  const bottomEdge = x => 1868 + Math.sin(x * 0.0028 + 2.1) * 40 - Math.sin(x * 0.0094) * 15;

  G.V8 = { KEY, GATE, leftEdge, rightEdge, topEdge, bottomEdge };

  function ensureState(reset = false) {
    if (reset || !s.v8) {
      s.v8 = {
        edgeLearned: false,
        edgeMessageAt: -999,
        keySeen: false,
        keyRetrieved: false,
        keyWithPhi: false,
        keyAcquisitionShown: false,
        keyInstalled: false,
        gateSeen: false,
        gateOpenedAt: -999,
        phiTask: null,
        phiTaskStartedAt: -999
      };
    }
    if (!Array.isArray(s.keyItems)) s.keyItems = [];
  }

  function renderKeyItems() {
    const list = document.getElementById("keyItemList");
    if (!list) return;
    ensureState();
    if (!s.keyItems.length) {
      list.innerHTML = '<div class="journalEmpty">No carried structures yet.</div>';
      return;
    }
    list.innerHTML = s.keyItems.map(item =>
      '<div class="journalEntry keyItemEntry"><div class="journalGlyph">' + item.glyph + '</div><strong>' + item.title + '</strong><span>' + item.note + '</span></div>'
    ).join("");
  }

  const baseRefreshJournal = G.refreshJournal;
  G.refreshJournal = () => {
    baseRefreshJournal();
    renderKeyItems();
  };

  const baseResetWorld = G.resetWorld;
  G.resetWorld = () => {
    baseResetWorld();
    ensureState(true);
    s.keyItems.length = 0;
    renderKeyItems();
  };

  function edgeMessage() {
    ensureState();
    if (G.gameTime - s.v8.edgeMessageAt < 1.5) return;
    s.v8.edgeMessageAt = G.gameTime;
    G.showMessage("NO STABLE COORDINATES BEYOND THIS EDGE", 900);
    if (!s.v8.edgeLearned) {
      s.v8.edgeLearned = true;
      G.addKnown("COHERENCE EDGE", "Beyond the visible contour, P has no stable coordinate to occupy. The field is not walled off; it stops being a place P can stand.");
    }
  }

  function enforceWorldEdge() {
    const margin = 15;
    const minX = leftEdge(p.y) + margin;
    const maxX = rightEdge(p.y) - margin;
    const minY = topEdge(p.x) + margin;
    const maxY = bottomEdge(p.x) - margin;
    let hit = false;

    if (p.x < minX) { p.x = minX; p.vx = Math.max(0, p.vx); hit = true; }
    if (p.x > maxX) { p.x = maxX; p.vx = Math.min(0, p.vx); hit = true; }
    if (p.y < minY) { p.y = minY; p.vy = Math.max(0, p.vy); hit = true; }
    if (p.y > maxY) { p.y = maxY; p.vy = Math.min(0, p.vy); hit = true; }

    if (hit && !G.intro?.active) edgeMessage();
  }

  function blockInternalGate(oldX) {
    if (!s.gateOpen && oldX < 1900 && p.x >= 1900) {
      p.x = 1878;
      p.vx = Math.min(0, p.vx);
      G.showMessage("THE BOUNDARY IS NOT COHERENT YET", 780);
    }
  }

  function blockLatticeGate(oldX) {
    ensureState();
    if (s.v8.keyInstalled) return;
    if (oldX < GATE.x - 28 && p.x >= GATE.x - 28) {
      p.x = GATE.x - 46;
      p.vx = Math.min(0, p.vx);
      s.v8.gateSeen = true;
      G.showMessage("THE GATE IS MISSING ITS CORE", 950);
    }
    if (oldX > GATE.x + 28 && p.x <= GATE.x + 28) {
      p.x = GATE.x + 46;
      p.vx = Math.max(0, p.vx);
    }
  }

  const baseUpdateMovement = G.updateMovement;
  G.updateMovement = dt => {
    const oldX = p.x;
    baseUpdateMovement(dt);
    enforceWorldEdge();
    blockInternalGate(oldX);
    blockLatticeGate(oldX);
  };

  function showKeyAcquisition() {
    ensureState();
    if (s.v8.keyAcquisitionShown || s.acquisitionActive) return;
    const wrap = document.getElementById("acquisition");
    if (!wrap) return;
    const kicker = document.getElementById("acquisitionKicker");
    const glyph = document.getElementById("acquisitionGlyph");
    const title = document.getElementById("acquisitionTitle");
    const body = document.getElementById("acquisitionBody");
    const effect = document.getElementById("acquisitionEffect");
    const button = document.getElementById("acquisitionButton");

    s.v8.keyAcquisitionShown = true;
    s.acquisitionActive = true;
    s.acquisitionCurrent = { kind:"key" };
    s.acquisitionQueue = s.acquisitionQueue || [];
    G.paused = true;
    G.keys.clear();
    wrap.dataset.kind = "bond";
    kicker.textContent = "KEY ITEM RECOVERED";
    glyph.textContent = "⌬";
    title.textContent = "LATTICE CORE";
    body.textContent = "Phi crossed the coherence edge and brought back something P could never reach.";
    effect.textContent = "Fits the empty fivefold gate east of the Symmetry Garden.";
    button.textContent = "CONTINUE";
    wrap.classList.add("visible");
    G.chord?.(110, [1, 5/4, 3/2, 15/8, 2]);
  }

  function addKeyItem() {
    ensureState();
    if (!s.keyItems.some(item => item.id === "lattice_core")) {
      s.keyItems.push({
        id:"lattice_core",
        glyph:"⌬",
        title:"LATTICE CORE",
        note:"Recovered by Phi from beyond the western coherence edge. Its fivefold geometry matches the empty gate socket."
      });
    }
    G.addKnown("COMPANION REACH", "Phi can remain coherent beyond boundaries that P cannot occupy, allowing it to retrieve and carry structures across unstable space.");
    G.refreshJournal();
  }

  function startRetrieveTask() {
    ensureState();
    if (s.v8.phiTask || !s.phiRepaired || s.v8.keyRetrieved) return;
    s.v8.phiTask = "retrieve";
    s.v8.phiTaskStartedAt = G.gameTime;
    s.signal.following = false;
    G.showMessage("PHI CAN CROSS THE EDGE", 1050);
    G.chord?.(146.83, [1, 5/4, 3/2]);
  }

  function startInstallTask() {
    ensureState();
    if (s.v8.phiTask || !s.v8.keyRetrieved || s.v8.keyInstalled) return;
    s.v8.phiTask = "install";
    s.v8.phiTaskStartedAt = G.gameTime;
    s.signal.following = false;
    G.showMessage("PHI TAKES THE CORE", 900);
  }

  function updatePhiTask(dt) {
    ensureState();
    const v = s.v8;
    if (v.phiTask === "retrieve") {
      const f = 1 - Math.exp(-dt * 2.4);
      s.signal.x += (KEY.x - s.signal.x) * f;
      s.signal.y += (KEY.y - s.signal.y) * f;
      if (Math.hypot(s.signal.x - KEY.x, s.signal.y - KEY.y) < 12) {
        v.keyRetrieved = true;
        v.keyWithPhi = true;
        v.phiTask = null;
        s.signal.following = true;
        addKeyItem();
      }
      return;
    }

    if (v.phiTask === "install") {
      const f = 1 - Math.exp(-dt * 2.6);
      s.signal.x += (GATE.x - s.signal.x) * f;
      s.signal.y += (GATE.y - s.signal.y) * f;
      if (Math.hypot(s.signal.x - GATE.x, s.signal.y - GATE.y) < 14) {
        v.keyInstalled = true;
        v.keyWithPhi = false;
        v.phiTask = null;
        v.gateOpenedAt = G.gameTime;
        s.signal.following = true;
        G.addKnown("LATTICE GATE", "The gate did not respond to P alone. Phi carried the missing fivefold core into its socket and completed the structure.");
        G.showDiscovery("PATH OPEN", "core + φ → coherent passage", "Phi completed the gate from inside the interaction. The eastern field can now be entered.", 3300);
        G.chord?.(110, [1, 5/4, 3/2, 15/8, 2]);
        G.updateQuest();
        G.refreshJournal();
      }
    }
  }

  function updateCompanionPuzzle() {
    ensureState();
    const v = s.v8;

    if (!v.keyRetrieved && Math.hypot(p.x - KEY.x, p.y - KEY.y) < 430) {
      v.keySeen = true;
      if (s.phiRepaired && !v.phiTask) startRetrieveTask();
    }

    if (v.keyRetrieved && v.keyWithPhi && s.signal.following && !v.keyAcquisitionShown && Math.hypot(s.signal.x - p.x, s.signal.y - p.y) < 125) {
      showKeyAcquisition();
    }

    if (!v.keyInstalled && v.keyRetrieved && s.phiRepaired && Math.hypot(p.x - GATE.x, p.y - GATE.y) < 260) {
      startInstallTask();
    }
  }

  const baseUpdate = G.update;
  G.update = dt => {
    baseUpdate(dt);
    if (!G.running || G.paused) return;
    updatePhiTask(dt);
    updateCompanionPuzzle();
  };

  const baseUpdateQuest = G.updateQuest;
  G.updateQuest = () => {
    ensureState();
    if (s.stage === "exit" && !s.v8.keyInstalled) {
      if (!s.v8.keyRetrieved) {
        G.el.questTitle.textContent = "The eastern gate is incomplete";
        G.el.questHint.textContent = s.v8.keySeen
          ? "The missing core has been visible beyond Origin's western edge since the beginning. P cannot reach it. Phi can."
          : "The socket matches a fivefold structure. Phi reacts toward Origin when you approach.";
        G.el.questProgress.textContent = "RETURN WEST WITH PHI";
      } else if (s.v8.phiTask === "install") {
        G.el.questTitle.textContent = "Phi is completing the gate";
        G.el.questHint.textContent = "Stay near the passage while Phi carries the core into its socket.";
        G.el.questProgress.textContent = "COMPANION INTERACTION";
      } else {
        G.el.questTitle.textContent = "Bring the Lattice Core east";
        G.el.questHint.textContent = "Phi is carrying the structure P could not reach.";
        G.el.questProgress.textContent = "RETURN TO THE FIVEFOLD GATE";
      }
      return;
    }
    baseUpdateQuest();
  };

  const baseRepairPhi = G.repairPhi;
  G.repairPhi = () => {
    baseRepairPhi();
    ensureState();
    setTimeout(() => {
      if (!s.v8.keyRetrieved) {
        G.showMessage(s.v8.keySeen ? "PHI LOOKS WEST" : "PHI CAN REACH BEYOND P'S FIELD", 1250);
      }
    }, 1200);
  };

  const baseActivateSpanLock = G.activateSpanLock;
  G.activateSpanLock = node => {
    baseActivateSpanLock(node);
    if (node.timer > 0 && node.timer < 900) {
      const bonus = G.hasBonus && G.hasBonus("temporal_memory") ? 1.35 : 1;
      node.timer = 6.8 * bonus;
    }
  };

  ensureState();
  renderKeyItems();
})();