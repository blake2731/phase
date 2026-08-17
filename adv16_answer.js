(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const p = G.player;
  const ctx = G.ctx;

  const ORIGIN = { x:520, y:1000 };
  const ANSWER = { x:1060, y:1000 };
  const HOME_NOTES = [220, 275, 330, 412.5];
  const RESPONSE_NOTE = 440;

  function ensure(reset = false) {
    if (reset || !s.v16) {
      s.v16 = {
        ritualActive:false,
        answerKnown:false,
        answerResponded:false,
        answerSevered:false,
        originRestored:false,
        phiRecognized:false,
        phiRevealQueued:false,
        responseAt:-Infinity,
        severedAt:-Infinity
      };
    }
  }

  function playTone(freq, delay, duration=.42, gain=.016, type="sine") {
    G.tone?.(freq, duration, gain, type, delay);
  }

  function playCall({ broken=false } = {}) {
    G.ensureAudio?.();
    G.duckMusic?.(.055, 1.5, .7);
    HOME_NOTES.forEach((freq, i) => {
      playTone(freq, i * .24, .40, .014 + i*.0014, i%2 ? "triangle" : "sine");
    });
    if (broken) {
      playTone(RESPONSE_NOTE, 1.12, .16, .007, "sine");
      playTone(RESPONSE_NOTE * .982, 1.27, .28, .005, "triangle");
    }
  }

  function playCleanResponse(delay=1.14) {
    G.ensureAudio?.();
    G.duckMusic?.(.05, 1.3, .72);
    playTone(RESPONSE_NOTE, delay, .82, .026, "sine");
    playTone(RESPONSE_NOTE/2, delay+.02, .88, .008, "sine");
  }

  function beginAnswerRitual(done) {
    ensure();
    if (s.v16.ritualActive) return;
    s.v16.ritualActive = true;
    s.v16.answerKnown = true;
    s.v16.answerSevered = false;
    s.v16.answerResponded = false;
    G.releaseMovement?.();
    G.ensureAudio?.();
    G.duckMusic?.(.04, 2.8, .85);

    HOME_NOTES.forEach((freq, i) => {
      playTone(freq, i * .24, .42, .015 + i*.0014, i%2 ? "triangle" : "sine");
    });

    window.setTimeout(() => {
      s.v16.answerResponded = true;
      s.v16.responseAt = performance.now();
      playCleanResponse(0);
      s.bursts?.push?.({ x:ANSWER.x, y:ANSWER.y, prime:5, age:0, duration:1.15, kind:"friend" });
    }, 1110);

    window.setTimeout(() => {
      G.showStoryMoment?.({
        kind:"bond",
        kicker:"FROM BEYOND THE FIELD",
        title:"AN ANSWER",
        body:"Origin sends four notes into the dark. Something beyond the field has always sent one back.",
        mark:"CALL ↔ RESPONSE",
        minMs:2350,
        onClose:() => {
          s.v16.ritualActive = false;
          if (typeof done === "function") done();
        }
      });
    }, 1470);
  }

  function severAnswer() {
    ensure();
    s.v16.answerSevered = true;
    s.v16.answerResponded = false;
    s.v16.severedAt = performance.now();
    playTone(RESPONSE_NOTE, 0, .11, .010, "sine");
    playTone(RESPONSE_NOTE * .943, .09, .28, .007, "triangle");
  }

  function addOrUpdateAnswerBond(state) {
    if (!Array.isArray(s.bonds)) return;
    let item = s.bonds.find(b => b.title === "THE ANSWER");
    if (!item) {
      item = { title:"THE ANSWER", glyph:"↔", note:"", effect:"" };
      s.bonds.push(item);
    }
    if (state === "broken") {
      item.note = "Origin's four-note call once received a fifth note from beyond the field. The response was severed during the rupture.";
      item.effect = "Unresolved: follow the broken response.";
    } else if (state === "phi") {
      item.note = "Phi was the voice that answered Origin. Its attention remains fixed toward something farther east.";
      item.effect = "The relation continues beyond Phi.";
    }
    G.refreshJournal?.();
  }

  function showWhenClear(item, delay=180, beforeShow=null) {
    const tryShow = () => {
      if (s.acquisitionActive || G.storyMomentActive?.()) {
        window.setTimeout(tryShow, 120);
        return;
      }
      if (typeof beforeShow === "function") beforeShow();
      G.showStoryMoment?.(item);
    };
    window.setTimeout(tryShow, delay);
  }

  const baseStory = G.showStoryMoment;
  G.showStoryMoment = item => {
    if (item?.title === "ORIGIN") {
      return baseStory?.({
        ...item,
        body:"Before P knew paths, there was one place it could always return.",
        mark:"HOME"
      });
    }
    if (item?.title === "ORIGIN BREAKS") {
      return baseStory?.({
        ...item,
        body:"Three notes are torn from home. The answering voice goes silent.",
        mark:"3 MISSING • RESPONSE LOST"
      });
    }
    return baseStory?.(item);
  };

  const baseDiscovery = G.showDiscovery;
  G.showDiscovery = (title, formula, meaning, duration, observation) => {
    if (title === "ORIGIN HOLDS") {
      ensure();
      s.v16.originRestored = true;
      addOrUpdateAnswerBond("broken");
      showWhenClear({
        kind:"origin",
        kicker:"THE CHORD RETURNS",
        title:"HOME IS WHOLE",
        body:"The four notes return. The fifth voice does not answer from beyond. Its broken echo is here.",
        mark:"THE ANSWER IS NOT",
        minMs:2750
      }, 180, () => playCall({ broken:true }));
      return;
    }
    return baseDiscovery(title, formula, meaning, duration, observation);
  };

  const baseRepairPhi = G.repairPhi;
  G.repairPhi = () => {
    ensure();
    const wasRepaired = Boolean(s.phiRepaired);
    baseRepairPhi();
    if (wasRepaired || !s.phiRepaired || s.v16.phiRevealQueued) return;
    s.v16.phiRevealQueued = true;

    showWhenClear({
      kind:"bond",
      kicker:"THE FAMILIAR NOTE RETURNS",
      title:"THE ANSWER",
      body:"The voice beyond Origin was Phi. And Phi is still listening for something farther east.",
      mark:"φ → ?",
      minMs:3000,
      onClose:() => {
        s.v16.phiRecognized = true;
        addOrUpdateAnswerBond("phi");
        G.updateQuest?.();
      }
    }, 320, () => playCleanResponse(0));
  };

  const baseQuest = G.updateQuest;
  G.updateQuest = () => {
    baseQuest();
    ensure();
    if (s.stage === "follow" && s.v16.originRestored && !s.phiRepaired) {
      G.el.questTitle.textContent = "Follow the broken Answer";
      G.el.questHint.textContent = "The fivefold signal carries the voice that once answered home.";
      G.el.questProgress.textContent = "EAST";
    }
  };

  function pentagon(x, y, r, rotation=-Math.PI/2) {
    ctx.beginPath();
    for (let i=0; i<=5; i++) {
      const a = rotation + i * G.TAU/5;
      const px = x + Math.cos(a)*r;
      const py = y + Math.sin(a)*r;
      if (!i) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.closePath();
  }

  function drawAnswer() {
    ensure();
    if (!G.intro?.active || G.intro.phase !== "answer" || s.v16.answerSevered) return;

    const now = performance.now();
    const respondedAge = s.v16.responseAt > 0 ? (now - s.v16.responseAt)/1000 : -1;
    const pulse = .5 + .5*Math.sin(now*.004);
    const strength = s.v16.answerResponded ? 1 : .25;

    ctx.save();
    ctx.setTransform(G.dpr,0,0,G.dpr,0,0);
    ctx.translate(-G.camera.x,-G.camera.y);
    ctx.globalCompositeOperation = "lighter";

    const grad = ctx.createLinearGradient(ORIGIN.x, ORIGIN.y, ANSWER.x, ANSWER.y);
    grad.addColorStop(0, "rgba(155,226,255,.02)");
    grad.addColorStop(.74, `rgba(190,170,255,${.025 + strength*.035})`);
    grad.addColorStop(1, "rgba(220,205,255,.01)");
    ctx.strokeStyle = grad;
    ctx.setLineDash([3,14]);
    ctx.lineDashOffset = -G.gameTime*18;
    ctx.beginPath();
    ctx.moveTo(ORIGIN.x+34, ORIGIN.y);
    ctx.lineTo(ANSWER.x-24, ANSWER.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.translate(ANSWER.x, ANSWER.y);
    ctx.rotate(G.gameTime*.12);
    ctx.strokeStyle = `rgba(222,208,255,${.12 + strength*.34 + pulse*.06})`;
    ctx.lineWidth = 1.4 + strength*.9;
    ctx.shadowBlur = 12 + strength*24;
    ctx.shadowColor = "rgba(205,176,255,.72)";
    pentagon(0,0,28 + pulse*3);
    ctx.stroke();
    for (let i=0;i<5;i++) {
      const a = i*G.TAU/5;
      ctx.beginPath();
      ctx.arc(Math.cos(a)*42, Math.sin(a)*42, 2.2 + strength*1.3, 0, G.TAU);
      ctx.fillStyle = `rgba(232,223,255,${.18 + strength*.48})`;
      ctx.fill();
    }

    if (respondedAge >= 0 && respondedAge < 1.4) {
      ctx.rotate(-G.gameTime*.12);
      ctx.strokeStyle = `rgba(218,240,255,${(1-respondedAge/1.4)*.42})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0,0,42 + respondedAge*110,0,G.TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  const baseDraw = G.draw;
  G.draw = () => {
    baseDraw();
    drawAnswer();
  };

  const baseReset = G.resetWorld;
  G.resetWorld = () => {
    baseReset();
    ensure(true);
  };

  G.V16Bond = {
    beginAnswerRitual,
    severAnswer,
    playCall,
    playCleanResponse,
    ANSWER
  };

  ensure();
})();
