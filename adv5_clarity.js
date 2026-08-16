(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const p = G.player;
  const ctx = G.ctx;

  function firstSentence(text) {
    if (!text) return "";
    const match = String(text).match(/^(.+?[.!?])(?:\s|$)/);
    if (match) return match[1];
    return String(text).length > 112 ? String(text).slice(0, 109).trimEnd() + "…" : String(text);
  }

  const baseShowDiscovery = G.showDiscovery;
  G.showDiscovery = (title, formula, meaning, duration = 3800, observation = false) => {
    baseShowDiscovery(title, formula, firstSentence(meaning), Math.max(duration, 4800), observation);
  };

  const baseUpdateQuest = G.updateQuest;
  G.updateQuest = () => {
    baseUpdateQuest();
    if (G.intro?.active) return;

    if (s.stage === "basin") {
      const active = s.basinNodes.filter(n => n.active).length;
      G.el.questTitle.textContent = active ? "Wake the remaining resonators" : "Wake the resonators";
      G.el.questHint.textContent = "Match its number with Q or E. Pulse with Space.";
      G.el.questProgress.textContent = active + " / 3 AWAKE";
    } else if (s.stage === "span") {
      const active = s.spanLocks.filter(n => n.timer > 0).length;
      G.el.questTitle.textContent = "Hold both notes at once";
      G.el.questHint.textContent = "Each one fades. Wake the other before it does.";
      G.el.questProgress.textContent = active + " / 2 HELD";
    } else if (s.stage === "garden") {
      const active = s.gardenAnchors.filter(n => n.active).length;
      G.el.questTitle.textContent = "Repair the broken shape";
      G.el.questHint.textContent = "Mode 5. Stand near each missing anchor and pulse.";
      G.el.questProgress.textContent = active + " / 5 RESTORED";
    } else if (s.stage === "exit") {
      G.el.questTitle.textContent = "Go with Phi";
      G.el.questHint.textContent = "The eastern boundary is responding to both of you.";
      G.el.questProgress.textContent = "PATH OPEN";
    }
  };

  function dot(x, y, r, alpha, hue = 194) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "hsla(" + hue + ",92%,78%," + alpha + ")";
    ctx.shadowBlur = 9;
    ctx.shadowColor = "hsla(" + hue + ",92%,70%,0.48)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, G.TAU);
    ctx.fill();
    ctx.restore();
  }

  function movingDots(ax, ay, bx, by, alpha, hue, speed = 0.28, count = 8, offset = 0) {
    for (let i = 0; i < count; i++) {
      const t = ((i / count) + G.gameTime * speed + offset) % 1;
      const e = t * t * (3 - 2 * t);
      dot(ax + (bx - ax) * e, ay + (by - ay) * e, 1.5 + t, alpha * (0.35 + 0.65 * t), hue);
    }
  }

  function attentionRing(x, y, radius, hue, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "hsla(" + hue + ",92%,76%," + alpha + ")";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, y, radius + Math.sin(G.gameTime * 3) * 5, 0, G.TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawBasinCue() {
    if (s.stage !== "basin") return;
    const remaining = s.basinNodes.filter(n => !n.active);
    if (!remaining.length) return;
    const target = remaining.reduce((best, node) => {
      const d = Math.hypot(p.x - node.x, p.y - node.y);
      return !best || d < best.d ? { node, d } : best;
    }, null)?.node;
    if (!target) return;

    const hue = G.primeHue(target.prime);
    attentionRing(target.x, target.y, target.radius * 1.55, hue, 0.16 + 0.08 * (0.5 + 0.5 * Math.sin(G.gameTime * 2.5)));
    if (p.stillTime > 1.1 && s.signal.visible) {
      movingDots(s.signal.x, s.signal.y, target.x, target.y, Math.min(0.2, (p.stillTime - 1.1) * 0.08), hue, 0.18, 7);
    }
  }

  function drawSpanCue() {
    if (s.stage !== "span" || s.spanLocks.length < 2) return;
    const active = s.spanLocks.find(n => n.timer > 0);
    const inactive = s.spanLocks.find(n => n.timer <= 0);

    if (active && inactive) {
      const hue = G.primeHue(inactive.prime);
      attentionRing(inactive.x, inactive.y, inactive.radius * 1.45, hue, 0.26);
      movingDots(active.x, active.y, inactive.x, inactive.y, 0.23, hue, 0.36, 10);
      return;
    }

    if (!active) {
      s.spanLocks.forEach((lock, index) => {
        attentionRing(lock.x, lock.y, lock.radius * 1.42, G.primeHue(lock.prime), 0.1 + 0.05 * Math.sin(G.gameTime * 2.2 + index * Math.PI));
      });
    }
  }

  function drawGardenCue() {
    if (s.stage !== "garden") return;
    const cx = 3450;
    const cy = 1000;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    s.gardenAnchors.forEach(anchor => {
      const alpha = anchor.active ? 0.055 : 0.17;
      ctx.strokeStyle = "rgba(214,191,255," + alpha + ")";
      ctx.lineWidth = anchor.active ? 1 : 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(anchor.x, anchor.y);
      ctx.stroke();
      if (!anchor.active) attentionRing(anchor.x, anchor.y, anchor.radius * 1.38, 286, 0.16);
    });
    ctx.restore();
  }

  const baseDrawWorldBase = G.drawWorldBase;
  G.drawWorldBase = () => {
    baseDrawWorldBase();
    if (G.intro?.active) return;
    drawBasinCue();
    drawSpanCue();
    drawGardenCue();
  };
})();