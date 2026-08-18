(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const p = G.player;
  const ctx = G.ctx;

  const RECIPES = [
    {
      id:"survey_lens",
      glyph:"⊙",
      name:"SURVEY LENS",
      needs:["P ≠ origin", "f_mote ← f_P"],
      description:"Bind displacement to copied resonance.",
      effect:"Compatible structures become visible slightly beyond current Pulse reach."
    },
    {
      id:"resonance_coil",
      glyph:"≈",
      name:"RESONANCE COIL",
      needs:["2 → 4 → 8", "Δt"],
      description:"Bind harmonic repetition to retained timing.",
      effect:"Every fourth Pulse carries 28% farther."
    },
    {
      id:"phi_thread",
      glyph:"φ↔",
      name:"PHI THREAD",
      needs:["φ", "∮"],
      description:"Bind fivefold relation to a completed path.",
      effect:"Phi periodically points toward a nearby unresolved field observation."
    }
  ];

  function ensure(reset = false) {
    if (reset || !s.v18) {
      s.v18 = {
        crafted:new Set(),
        equipped:null,
        synthesisNotified:false,
        coilCount:0,
        phiNextPing:0,
        phiTarget:null,
        phiTargetUntil:0
      };
    }
    if (!(s.v18.crafted instanceof Set)) s.v18.crafted = new Set(s.v18.crafted || []);
  }

  function normalizeEarlyObservation() {
    const item = s.collectibles?.find(c => c.formula === "P ≠ origin");
    if (item) item.note = "P can occupy a position independent of Origin. That distinction makes displacement measurable and useful.";
    const secret = s.secrets?.find(c => c.formula === "P ≠ origin");
    if (secret) {
      secret.title = "DISPLACEMENT";
      secret.note = "P can occupy a position independent of Origin. That distinction makes displacement measurable and useful.";
    }
  }

  function knownPatterns() {
    return new Set((s.secrets || []).map(item => item.formula));
  }

  function recipeStatus(recipe) {
    const known = knownPatterns();
    const count = recipe.needs.filter(n => known.has(n)).length;
    return { known, count, ready:count === recipe.needs.length };
  }

  function ensureSection() {
    const grid = document.querySelector("#journal .journalGrid");
    if (!grid) return null;
    let section = document.getElementById("synthesisSection");
    if (section) return section;

    section = document.createElement("section");
    section.id = "synthesisSection";
    section.className = "journalSectionWide synthesisSection";
    section.innerHTML = `
      <div class="synthesisHeading">
        <div><h3>Synthesis</h3><p>Combine retained patterns into one active field construct. Patterns are never consumed.</p></div>
        <div id="synthesisEquipped" class="synthesisEquipped">NO CONSTRUCT EQUIPPED</div>
      </div>
      <div id="synthesisList" class="synthesisList"></div>`;

    const observations = document.getElementById("secretList")?.closest("section");
    if (observations) grid.insertBefore(section, observations);
    else grid.appendChild(section);

    section.addEventListener("click", event => {
      const button = event.target.closest("button[data-synthesis]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      activateRecipe(button.dataset.synthesis);
    });
    return section;
  }

  function requirementsMarkup(recipe, known) {
    return recipe.needs.map(formula => {
      const learned = known.has(formula);
      return `<span class="synthesisPattern${learned ? " known" : ""}">${learned ? formula : "?"}</span>`;
    }).join('<span class="synthesisPlus">+</span>');
  }

  function renderSynthesis() {
    ensure();
    normalizeEarlyObservation();
    const section = ensureSection();
    if (!section) return;
    const list = section.querySelector("#synthesisList");
    const equipped = section.querySelector("#synthesisEquipped");
    if (!list || !equipped) return;

    const visible = RECIPES.filter(recipe => {
      const status = recipeStatus(recipe);
      return status.count > 0 || s.v18.crafted.has(recipe.id);
    });

    if (!visible.length) {
      list.innerHTML = '<div class="synthesisEmpty">No compatible pattern pair has been retained yet. Exploration will reveal possible constructs.</div>';
    } else {
      list.innerHTML = visible.map(recipe => {
        const status = recipeStatus(recipe);
        const crafted = s.v18.crafted.has(recipe.id);
        const active = s.v18.equipped === recipe.id;
        const label = active ? "UNEQUIP" : crafted ? "EQUIP" : status.ready ? "SYNTHESIZE" : "INCOMPLETE";
        const detail = status.ready || crafted ? recipe.effect : "A second compatible pattern is still missing.";
        return `<article class="synthesisRecipe${active ? " equipped" : ""}${status.ready ? " ready" : ""}">
          <div class="synthesisGlyph">${recipe.glyph}</div>
          <div class="synthesisRecipeBody">
            <strong>${recipe.name}</strong>
            <div class="synthesisNeeds">${requirementsMarkup(recipe, status.known)}</div>
            <span>${status.ready || crafted ? recipe.description : detail}</span>
            ${(status.ready || crafted) ? `<span class="synthesisEffect">Effect: ${recipe.effect}</span>` : ""}
          </div>
          <button data-synthesis="${recipe.id}" ${(!status.ready && !crafted) ? "disabled" : ""}>${label}</button>
        </article>`;
      }).join("");
    }

    const activeRecipe = RECIPES.find(r => r.id === s.v18.equipped);
    equipped.textContent = activeRecipe ? `ACTIVE • ${activeRecipe.name}` : "NO CONSTRUCT EQUIPPED";
  }

  function maybeNotifySynthesis() {
    ensure();
    if (s.v18.synthesisNotified || !s.abilities?.journal) return;
    const ready = RECIPES.some(recipe => recipeStatus(recipe).ready);
    if (!ready) return;
    s.v18.synthesisNotified = true;
    window.setTimeout(() => {
      if (!G.storyMomentActive?.() && !s.acquisitionActive) {
        G.showMessage?.("SYNTHESIS POSSIBLE • OPEN JOURNAL", 1500);
        G.V15Audio?.resolved?.(246.94);
      }
    }, 380);
  }

  function activateRecipe(id) {
    ensure();
    const recipe = RECIPES.find(r => r.id === id);
    if (!recipe) return;
    const status = recipeStatus(recipe);
    const crafted = s.v18.crafted.has(id);
    if (!crafted && !status.ready) return;

    if (!crafted) {
      s.v18.crafted.add(id);
      s.v18.equipped = id;
      G.showDiscovery?.("SYNTHESIZED", recipe.glyph, `${recipe.name} now exists as a stable field construct. ${recipe.effect}`, 3800);
      G.V15Audio?.worldChange?.(164.81);
    } else if (s.v18.equipped === id) {
      s.v18.equipped = null;
      G.showMessage?.(`${recipe.name} • UNEQUIPPED`, 900);
    } else {
      s.v18.equipped = id;
      G.showMessage?.(`${recipe.name} • EQUIPPED`, 900);
      G.tone?.(277.18, .16, .010, "triangle");
      G.tone?.(415.30, .22, .009, "sine", .08);
    }
    renderSynthesis();
    G.refreshJournal?.();
  }

  const baseAddSecret = G.addSecret;
  G.addSecret = (title, formula, note, insight = 1) => {
    if (formula === "P ≠ origin") {
      title = "DISPLACEMENT";
      note = "P can occupy a position independent of Origin. That distinction makes displacement measurable and useful.";
    }
    const result = baseAddSecret(title, formula, note, insight);
    normalizeEarlyObservation();
    maybeNotifySynthesis();
    renderSynthesis();
    return result;
  };

  const baseReset = G.resetWorld;
  G.resetWorld = () => {
    baseReset();
    ensure(true);
    normalizeEarlyObservation();
    renderSynthesis();
  };

  const baseRefresh = G.refreshJournal;
  G.refreshJournal = () => {
    baseRefresh();
    ensure();
    normalizeEarlyObservation();
    renderSynthesis();
  };

  const baseEmit = G.emitWave;
  G.emitWave = () => {
    ensure();
    const before = s.waves.length;
    baseEmit();
    if (s.v18.equipped !== "resonance_coil" || s.waves.length <= before) return;
    const wave = s.waves[s.waves.length - 1];
    if (!wave?.v11PlayerWave) return;
    s.v18.coilCount += 1;
    if (s.v18.coilCount % 4 !== 0) return;
    wave.maxR = Math.round(wave.maxR * 1.28);
    wave.v18Coil = true;
    s.bursts?.push?.({ x:p.x, y:p.y, prime:wave.prime, age:0, duration:.9, kind:"resonate" });
    G.tone?.(196 + wave.prime * 18, .20, .012, "triangle");
    G.tone?.((196 + wave.prime * 18) * 2, .28, .009, "sine", .12);
  };

  function updatePhiThread() {
    if (s.v18.equipped !== "phi_thread" || !s.phiRepaired || !s.signal?.following) return;
    if (G.gameTime < s.v18.phiNextPing) return;
    s.v18.phiNextPing = G.gameTime + 3.8;

    const candidates = (s.collectibles || []).filter(item => {
      if (item.collected) return false;
      if (item.frequency !== null && !G.hasMode?.(item.frequency)) return false;
      return Math.hypot(item.x - p.x, item.y - p.y) < 1050;
    });
    candidates.sort((a,b) => Math.hypot(a.x-p.x,a.y-p.y) - Math.hypot(b.x-p.x,b.y-p.y));
    s.v18.phiTarget = candidates[0] || null;
    s.v18.phiTargetUntil = s.v18.phiTarget ? G.gameTime + 1.7 : 0;
    if (s.v18.phiTarget) G.tone?.(349.23, .12, .006, "sine");
  }

  const baseUpdate = G.update;
  G.update = dt => {
    baseUpdate(dt);
    if (!G.running || G.paused) return;
    ensure();
    updatePhiThread();
    maybeNotifySynthesis();
  };

  function surveyTargets() {
    const current = G.PRIMES?.[p.freqIndex] || 2;
    const targets = [];
    const tune = s.originHub?.echoes?.find?.(e => e.id === "tune");
    if (tune && !tune.done && current === 3) targets.push({ x:tune.x, y:tune.y, prime:3 });
    if (G.V11?.SUM && !s.v11?.sumSolved && [2,3].includes(current)) targets.push({ x:G.V11.SUM.x, y:G.V11.SUM.y, prime:current });
    if (s.stage === "basin") (s.basinNodes || []).filter(n => !n.active && n.prime === current).forEach(n => targets.push(n));
    if (s.stage === "span") (s.spanLocks || []).filter(n => n.timer <= 0 && n.prime === current).forEach(n => targets.push(n));
    if (s.stage === "garden" && current === 5) (s.gardenAnchors || []).filter(n => !n.active).forEach(n => targets.push(n));
    return targets;
  }

  function worldTransform() {
    ctx.setTransform(G.dpr,0,0,G.dpr,0,0);
    ctx.translate(-G.camera.x,-G.camera.y);
  }

  function drawConstruct() {
    if (!s.v18.equipped) return;
    const a = G.gameTime * 1.25;
    const x = p.x + Math.cos(a) * 27;
    const y = p.y + Math.sin(a) * 27;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(x,y);
    ctx.rotate(a*.35);
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(180,220,255,.55)";
    ctx.strokeStyle = "rgba(190,231,255,.58)";
    ctx.lineWidth = 1.2;
    if (s.v18.equipped === "survey_lens") {
      ctx.beginPath(); ctx.arc(0,0,8,0,G.TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0,0,3,0,G.TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-11,0); ctx.lineTo(11,0); ctx.stroke();
    } else if (s.v18.equipped === "resonance_coil") {
      for (let i=0;i<4;i++) { ctx.beginPath(); ctx.arc(0,0,4+i*2.4,i*.7,Math.PI*1.15+i*.7); ctx.stroke(); }
    } else {
      ctx.beginPath(); ctx.arc(-5,0,4,0,G.TAU); ctx.arc(5,0,4,0,G.TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-1,-3); ctx.lineTo(1,3); ctx.stroke();
    }
    ctx.restore();
  }

  function drawSurvey() {
    if (s.v18.equipped !== "survey_lens") return;
    const range = G.getPulseRange?.() || 240;
    const max = range * 1.42;
    surveyTargets().forEach(target => {
      const d = Math.hypot(target.x - p.x, target.y - p.y);
      if (d <= range*.92 || d > max) return;
      const t = 1 - (d-range*.92)/(max-range*.92);
      const pulse = .5 + .5*Math.sin(G.gameTime*4 + d*.02);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(160,226,255,${.12 + t*.22 + pulse*.05})`;
      ctx.setLineDash([3,7]);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(target.x,target.y,24+pulse*5,0,G.TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(target.x-31,target.y); ctx.lineTo(target.x-20,target.y);
      ctx.moveTo(target.x+20,target.y); ctx.lineTo(target.x+31,target.y);
      ctx.moveTo(target.x,target.y-31); ctx.lineTo(target.x,target.y-20);
      ctx.moveTo(target.x,target.y+20); ctx.lineTo(target.x,target.y+31);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawPhiThread() {
    if (s.v18.equipped !== "phi_thread" || !s.v18.phiTarget || G.gameTime > s.v18.phiTargetUntil) return;
    const target = s.v18.phiTarget;
    const age = G.clamp((s.v18.phiTargetUntil - G.gameTime)/1.7, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(214,184,255,${.08 + age*.28})`;
    ctx.setLineDash([3,10]);
    ctx.lineDashOffset = -G.gameTime*20;
    ctx.beginPath();
    ctx.moveTo(s.signal.x,s.signal.y);
    const mx=(s.signal.x+target.x)/2, my=(s.signal.y+target.y)/2-55;
    ctx.quadraticCurveTo(mx,my,target.x,target.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(225,211,255,${.18 + age*.35})`;
    ctx.beginPath(); ctx.arc(target.x,target.y,18+(1-age)*14,0,G.TAU); ctx.stroke();
    ctx.restore();
  }

  function drawCoilWaves() {
    if (s.v18.equipped !== "resonance_coil") return;
    (s.waves || []).filter(w => w.v18Coil).forEach(w => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(211,188,255,${Math.max(0,w.alpha)*.32})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(w.x,w.y,w.r+5,0,G.TAU); ctx.stroke();
      ctx.restore();
    });
  }

  const baseDraw = G.draw;
  G.draw = () => {
    baseDraw();
    ensure();
    ctx.save();
    worldTransform();
    drawSurvey();
    drawPhiThread();
    drawCoilWaves();
    drawConstruct();
    ctx.restore();
  };

  G.V18Synthesis = {
    recipes:RECIPES,
    equipped:() => s.v18?.equipped || null
  };

  ensure();
  normalizeEarlyObservation();
  renderSynthesis();
})();