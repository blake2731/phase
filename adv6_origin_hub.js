(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const p = G.player;

  const ECHOES = [
    { id:"path", x:470, y:520, glyph:"ΔP", title:"PATH NOTE", color:190, done:false, step:0,
      steps:[{x:380,y:760},{x:420,y:680},{x:455,y:600},{x:470,y:520}] },
    { id:"pulse", x:860, y:1230, glyph:"2", title:"PULSE NOTE", color:205, done:false },
    { id:"tune", x:875, y:650, glyph:"3", title:"TUNING NOTE", color:248, done:false }
  ];

  function resetHub() {
    s.originHub = {
      active:false,
      recovered:0,
      echoes:ECHOES.map(e => JSON.parse(JSON.stringify(e))),
      launched:false,
      launchedAt:0,
      completed:false,
      hintAge:0,
      lastHint:"",
      moteDiscoveries:0,
      fieldMotes:Array.from({length:7},(_,i)=>({
        x:245+(i%4)*155,
        y:825+Math.floor(i/4)*260+(i%2)*45,
        phase:i*.83,
        mode:null,
        react:0,
        noticed:false
      }))
    };
  }

  const baseResetWorld = G.resetWorld;
  G.resetWorld = () => {
    baseResetWorld();
    resetHub();
  };

  G.launchOriginHub = () => {
    if (!s.originHub) resetHub();
    const h = s.originHub;
    h.active = true;
    h.launched = true;
    h.launchedAt = G.gameTime;
    h.recovered = 0;
    h.completed = false;
    h.hintAge = 0;
    h.echoes.forEach(e => {
      e.done = false;
      e.returnedAt = -999;
      if (e.id === "path") e.step = 0;
    });
    s.stage = "origin_hub";
    s.area = "ORIGIN";
    s.signal.visible = true;
    s.signal.x = 760;
    s.signal.y = 930;
    s.signal.targetX = 760;
    s.signal.targetY = 930;
    s.signal.broken = true;
    s.signal.following = false;
    p.speed = 292;
    G.el.hud.classList.remove("storyHidden");
    G.el.help.classList.remove("storyHidden");
    G.el.quest.classList.remove("storyHidden");
    G.updateHud();
    G.updateQuest();
    G.showMessage("3 NOTES SCATTERED", 1100);
    G.chord?.(110, [1,5/4,3/2]);
  };

  function healOrigin(index) {
    const lights = G.intro?.homeLights;
    if (Array.isArray(lights) && lights[index]) {
      lights[index].broken = false;
      lights[index].active = true;
      lights[index].activatedAt = G.gameTime;
    }
    if (G.intro?.origin) {
      G.intro.origin.pulse = 2;
      if (index === 3) G.intro.origin.broken = false;
    }
  }

  function recoverEcho(e) {
    if (e.done) return;
    e.done = true;
    e.returnedAt = G.gameTime;
    const h = s.originHub;
    h.recovered += 1;
    healOrigin(h.recovered);

    s.bursts.push({
      x:e.x,
      y:e.y,
      prime:e.id === "tune" ? 3 : 2,
      age:0,
      duration:1.25,
      kind:"friend"
    });
    G.tone(330 + h.recovered * 55, .18, .018, "triangle");
    setTimeout(() => G.tone(440 + h.recovered * 55, .22, .013, "sine"), 90);
    G.showMessage(e.title + " RETURNED", 950);

    if (h.recovered === 1) {
      G.addKnown("RETURN", "A displaced pattern can be restored by reproducing the condition that shaped it.");
    }

    if (typeof G.onHubEchoRecovered === "function") G.onHubEchoRecovered(e, h.recovered);

    if (h.recovered >= 3) {
      h.completed = true;
      h.active = false;
      if (G.intro?.origin) G.intro.origin.broken = false;
      s.stage = "follow";
      s.signalMet = true;
      s.signal.trust = Math.max(2, s.signal.trust);
      s.signal.targetX = 1120;
      s.signal.targetY = 760;
      G.addKnown("RESTORED CHORD", "Origin can hold its pattern again. The fivefold visitor is still incomplete.");
      G.showDiscovery("ORIGIN HOLDS", "3 notes returned", "The visitor turns east.", 2400);
      setTimeout(() => {
        G.showMessage("FOLLOW IT", 1000);
        G.updateQuest();
      }, 900);
      G.refreshJournal?.();
    }

    G.updateQuest();
  }

  function updatePath(e) {
    const step = e.steps[e.step];
    if (!step) return;
    if (Math.hypot(p.x - step.x, p.y - step.y) < 48) {
      e.step += 1;
      G.tone(220 + e.step * 38, .11, .011, "sine");
      if (e.step >= e.steps.length) recoverEcho(e);
    }
  }

  function updatePulsePickup(e) {
    if (e.done) return;
    if (Math.hypot(p.x - e.x, p.y - e.y) < 58) recoverEcho(e);
  }

  function testMotes(wave) {
    const h = s.originHub;
    if (!h?.active) return;
    h.fieldMotes.forEach((m, i) => {
      const key = "mote:" + i;
      if (wave.hit?.has(key)) return;
      if (Math.abs(Math.hypot(m.x - wave.x, m.y - wave.y) - wave.r) > 24) return;
      wave.hit?.add(key);
      m.mode = wave.prime;
      m.react = 1;
      if (!m.noticed) {
        m.noticed = true;
        h.moteDiscoveries += 1;
        G.tone(300 + wave.prime * 16, .1, .008, "triangle");
        if (h.moteDiscoveries === 3) {
          G.addSecret("THE SMALL ONES COPY YOU", "f_mote ← f_P", "You pulsed three harmless fieldlings. Each borrowed the symmetry of the mode that touched it.");
        }
      }
    });
  }

  function hubWaveTest(wave) {
    if (!s.originHub?.active) return;
    testMotes(wave);
    s.originHub.echoes.forEach(e => {
      if (e.done || e.id !== "tune") return;
      const key = "hub:" + e.id;
      if (wave.hit?.has(key)) return;
      if (Math.abs(Math.hypot(e.x - wave.x, e.y - wave.y) - wave.r) > 44) return;
      wave.hit?.add(key);
      recoverEcho(e);
      G.showMessage("THE NOTE ANSWERS AT 3", 900);
    });
  }

  const baseTestWave = G.testWave;
  G.testWave = wave => {
    hubWaveTest(wave);
    baseTestWave(wave);
  };

  const baseUpdate = G.update;
  G.update = dt => {
    baseUpdate(dt);
    const h = s.originHub;
    if (!h?.active) return;

    h.hintAge += dt;
    h.fieldMotes.forEach(m => m.react *= Math.pow(.08, dt));

    const path = h.echoes.find(e => e.id === "path");
    if (path && !path.done) updatePath(path);

    const pulse = h.echoes.find(e => e.id === "pulse");
    if (pulse && !pulse.done) updatePulsePickup(pulse);

    p.x = G.clamp(p.x, 120, 1010);
    p.y = G.clamp(p.y, 390, 1510);

    if (h.hintAge > 10) {
      h.hintAge = 0;
      const remaining = h.echoes.filter(e => !e.done);
      if (remaining.length) {
        const nearest = remaining.slice().sort((a,b) =>
          Math.hypot(p.x-a.x,p.y-a.y) - Math.hypot(p.x-b.x,p.y-b.y)
        )[0];
        let hint = "";
        if (nearest.id === "path") hint = "FOLLOW THE LIT STEPS";
        else if (nearest.id === "pulse") hint = "GO TO THE PULSING RING";
        else if (G.hasAbility?.("pulse")) hint = "PULSE THE TRIANGULAR NOTE";
        else hint = "ANOTHER NOTE IS PULSING NEARBY";
        if (hint !== h.lastHint) {
          h.lastHint = hint;
          G.showMessage(hint, 850);
        }
      }
    }
  };

  const baseUpdateQuest = G.updateQuest;
  G.updateQuest = () => {
    if (s.stage === "origin_hub" && s.originHub) {
      G.el.questTitle.textContent = "Bring the lost notes home";
      G.el.questHint.textContent = "Three bright disturbances landed around Origin. Each teaches P something different.";
      G.el.questProgress.textContent = s.originHub.recovered + " / 3 NOTES RETURNED";
      return;
    }
    baseUpdateQuest();
  };

  const baseUpdateCollectibles = G.updateCollectibles;
  G.updateCollectibles = () => {
    if (s.stage === "origin_hub") return;
    baseUpdateCollectibles();
  };

  const baseUpdateSecrets = G.updateSecrets;
  G.updateSecrets = () => {
    if (s.stage === "origin_hub") return;
    baseUpdateSecrets();
  };

  const baseUpdateArea = G.updateArea;
  G.updateArea = () => {
    if (s.stage === "origin_hub") {
      s.area = "ORIGIN";
      G.el.areaName.textContent = "ORIGIN";
      return;
    }
    baseUpdateArea();
  };
})();