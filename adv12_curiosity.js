(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G || !G.V11) return;
  const s = G.state;
  const p = G.player;

  const ECHO_WELL = { x:6100, y:1540 };
  const SOURCE = { x:6550, y:1000 };

  const DEFINITIONS = {
    mode3: {
      title:"THE DISTANT TRIANGLE",
      prompt:"The triangular note is visible, but P's Pulse falls short.",
      answer:"A longer Pulse reached it. The structure revealed Mode 3.",
      mark:"3",
      target:() => G.V11.TUNE
    },
    superposition: {
      title:"ONE STRUCTURE, TWO MODES",
      prompt:"Modes 2 and 3 are both encoded across unstable coordinates.",
      answer:"Both modes reached the same structure. Their responses overlapped.",
      mark:"∑",
      target:() => G.V11.SUM
    },
    phi_edge: {
      title:"BEYOND P'S EDGE",
      prompt:"A fivefold object exists where P cannot stand.",
      answer:"Phi stayed coherent beyond the edge and returned with the Fivefold Key.",
      mark:"φ",
      target:() => G.V8?.KEY
    },
    echo_well: {
      title:"THE QUIET WELL",
      prompt:"The well holds a Pulse instead of simply absorbing it.",
      answer:"It returns the same mode after a delay.",
      mark:"↺",
      target:() => ECHO_WELL
    },
    relay: {
      title:"THE RELAY IS NOT THE SOURCE",
      prompt:"If this only repeats the signal, what is transmitting it?",
      answer:"The signal continues to a larger fivefold source farther east.",
      mark:"→",
      target:() => SOURCE
    }
  };

  function ensure(reset = false) {
    if (reset || !s.v12) {
      s.v12 = {
        questions:[],
        flashes:new Map(),
        pulseNearMisses:new Set()
      };
    }
    if (!(s.v12.flashes instanceof Map)) s.v12.flashes = new Map();
    if (!(s.v12.pulseNearMisses instanceof Set)) s.v12.pulseNearMisses = new Set();
    if (!Array.isArray(s.v12.questions)) s.v12.questions = [];
  }

  function getQuestion(id) {
    ensure();
    return s.v12.questions.find(q => q.id === id);
  }

  function flash(id, strength = 1) {
    ensure();
    s.v12.flashes.set(id, { at:G.gameTime, strength });
    const def = DEFINITIONS[id];
    const t = def?.target?.();
    if (t) {
      s.bursts.push({ x:t.x, y:t.y, prime:id === "mode3" ? 3 : 5, age:0, duration:.7, kind:"friend" });
      G.tone?.(190 + (id.length * 9), .08, .006, "sine");
    }
  }

  function record(id) {
    ensure();
    if (!DEFINITIONS[id] || getQuestion(id)) return false;
    s.v12.questions.push({ id, openedAt:G.gameTime, resolved:false, resolvedAt:null });
    flash(id, .8);
    G.refreshJournal?.();
    return true;
  }

  function resolve(id) {
    ensure();
    const q = getQuestion(id);
    if (!q || q.resolved) return false;
    q.resolved = true;
    q.resolvedAt = G.gameTime;
    flash(id, 1.25);
    G.chord?.(110, [1, 5/4, 3/2]);
    G.refreshJournal?.();
    return true;
  }

  function near(x, y, r) {
    return Math.hypot(p.x - x, p.y - y) <= r;
  }

  function watchNearMisses() {
    ensure();
    for (const w of s.waves || []) {
      if (!w.v11PlayerWave || !w.maxR || w.r < w.maxR * .82) continue;

      const tests = [];
      if (s.stage === "origin_hub" && !G.hasMode?.(3)) tests.push(["mode3", G.V11.TUNE]);
      if (G.hasMode?.(3) && !s.v11?.sumSolved && ["basin","span","garden","exit","threshold","far_field"].includes(s.stage)) {
        tests.push(["superposition", G.V11.SUM]);
      }

      for (const [id, target] of tests) {
        const key = `${id}:${Math.round(w.x)}:${Math.round(w.y)}:${w.prime}`;
        if (s.v12.pulseNearMisses.has(key)) continue;
        const distance = Math.hypot(target.x - w.x, target.y - w.y);
        const shortBy = distance - w.maxR;
        if (shortBy > 0 && shortBy <= 115) {
          s.v12.pulseNearMisses.add(key);
          record(id);
          flash(id, 1.15);
        }
      }
    }
  }

  function updateQuestions() {
    ensure();

    if (s.stage === "origin_hub" && s.abilities?.pulse && !G.hasMode?.(3) && near(G.V11.TUNE.x, G.V11.TUNE.y, 640)) {
      record("mode3");
    }
    if (G.hasMode?.(3)) resolve("mode3");

    if (G.hasMode?.(3) && !s.v11?.sumSolved && near(G.V11.SUM.x, G.V11.SUM.y, 820)) {
      record("superposition");
    }
    if (s.v11?.sumSolved) resolve("superposition");

    if (s.v8?.keySeen && !s.v8?.keyRetrieved) record("phi_edge");
    if (s.v8?.keyRetrieved) resolve("phi_edge");

    if (s.v10?.farFieldStarted && near(ECHO_WELL.x, ECHO_WELL.y, 520) && !s.v10?.echoWellFound) record("echo_well");
    if (s.v10?.echoWellFound) resolve("echo_well");

    if (s.v10?.farFieldStarted) record("relay");
    if (s.v10?.sourceReached || (s.complete && p.x > SOURCE.x - 140)) resolve("relay");
  }

  function renderQuestions() {
    const list = document.getElementById("questionList");
    if (!list) return;
    ensure();
    if (!s.v12.questions.length) {
      list.innerHTML = '<div class="journalEmpty">No unresolved questions recorded.</div>';
      return;
    }

    list.innerHTML = s.v12.questions.map(q => {
      const d = DEFINITIONS[q.id];
      const state = q.resolved ? "ANSWERED" : "OPEN";
      const text = q.resolved ? d.answer : d.prompt;
      return `<div class="journalEntry questionEntry ${q.resolved ? "resolved" : "open"}" data-question="${q.id}">
        <div class="journalGlyph questionGlyph">${d.mark}</div>
        <strong>${d.title}</strong>
        <span>${text}</span>
        <span class="questionState">${state}</span>
      </div>`;
    }).join("");
  }

  const baseReset = G.resetWorld;
  G.resetWorld = () => {
    baseReset();
    ensure(true);
    renderQuestions();
  };

  const baseRefresh = G.refreshJournal;
  G.refreshJournal = () => {
    baseRefresh();
    renderQuestions();
  };

  const baseUpdate = G.update;
  G.update = dt => {
    baseUpdate(dt);
    if (!G.running || G.paused) return;
    watchNearMisses();
    updateQuestions();
  };

  G.V12 = { DEFINITIONS, recordQuestion:record, resolveQuestion:resolve };
  ensure();
})();
