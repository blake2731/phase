(() => {
  "use strict";

  const startButton = document.getElementById("startButton");
  const startScreen = document.getElementById("startScreen");
  const prologue = document.getElementById("prologue");
  const prologuePoint = document.getElementById("prologuePoint");
  const prologueTrail = document.getElementById("prologueTrail");
  const prologueText = document.getElementById("prologueText");
  const prologueFormula = document.getElementById("prologueFormula");
  const prologueHint = document.getElementById("prologueHint");
  const hud = document.getElementById("hud");
  const help = document.getElementById("help");

  const STORY = Object.freeze({
    TITLE: 0,
    POINT: 1,
    MOTION: 2,
    DISTANCE: 3,
    DISTURBANCE: 4,
    OSCILLATION: 5,
    COMPLETE: 6
  });

  const state = {
    stage: STORY.TITLE,
    active: false,
    bypassStartIntercept: false,
    x: 50,
    y: 50,
    originX: 50,
    originY: 50,
    distance: 0,
    trail: [],
    keys: new Set()
  };

  function setDiscovery(title, formula = "", hint = "") {
    prologueText.textContent = title;
    prologueFormula.textContent = formula;
    prologueHint.textContent = hint;

    prologueText.classList.remove("storyPulse");
    prologueFormula.classList.remove("storyPulse");
    void prologueText.offsetWidth;
    prologueText.classList.add("storyPulse");
    prologueFormula.classList.add("storyPulse");
  }

  function enterStory() {
    state.active = true;
    state.stage = STORY.POINT;
    state.x = 50;
    state.y = 50;
    state.originX = 50;
    state.originY = 50;
    state.distance = 0;
    state.trail.length = 0;
    state.keys.clear();

    startScreen.classList.remove("visible");
    hud.classList.add("storyHidden");
    help.classList.add("storyHidden");
    prologue.classList.add("visible");
    updatePoint();

    setDiscovery("POSITION DETECTED", "P = (x, y)", "There is one point. Nothing else has been proven.");

    window.setTimeout(() => {
      if (!state.active || state.stage !== STORY.POINT) return;
      prologueHint.textContent = "Try to change where the point is.";
    }, 1700);
  }

  function updatePoint() {
    prologuePoint.style.left = state.x + "%";
    prologuePoint.style.top = state.y + "%";

    const trailPoint = document.createElement("span");
    trailPoint.style.left = state.x + "%";
    trailPoint.style.top = state.y + "%";
    trailPoint.style.opacity = String(Math.min(0.32, 0.08 + state.distance / 500));
    prologueTrail.appendChild(trailPoint);
    state.trail.push(trailPoint);

    while (state.trail.length > 90) {
      const oldest = state.trail.shift();
      oldest.remove();
    }
  }

  function movePoint(dx, dy) {
    if (!state.active || state.stage >= STORY.OSCILLATION) return;

    const speed = 0.72;
    const oldX = state.x;
    const oldY = state.y;

    state.x = Math.max(7, Math.min(93, state.x + dx * speed));
    state.y = Math.max(9, Math.min(91, state.y + dy * speed));

    const moved = Math.hypot(state.x - oldX, state.y - oldY);
    if (!moved) return;

    state.distance += moved;
    updatePoint();

    if (state.stage === STORY.POINT) {
      state.stage = STORY.MOTION;
      setDiscovery("CHANGE DETECTED", "ΔP ≠ 0", "A position can become another position.");
    }

    if (state.stage === STORY.MOTION && state.distance > 12) {
      state.stage = STORY.DISTANCE;
      const d = Math.hypot(state.x - state.originX, state.y - state.originY).toFixed(2);
      setDiscovery("DISTANCE EXISTS", "d = √((x₂ − x₁)² + (y₂ − y₁)²)", "You are not where you were.  d = " + d);
    }

    if (state.stage === STORY.DISTANCE && state.distance > 28) {
      state.stage = STORY.DISTURBANCE;
      prologue.classList.add("disturbed");
      setDiscovery("DISTURBANCE DETECTED", "∂Φ/∂t ≠ 0", "Movement changed more than your position.");

      window.setTimeout(() => {
        if (!state.active || state.stage !== STORY.DISTURBANCE) return;
        state.stage = STORY.OSCILLATION;
        setDiscovery("ANOTHER OPERATION IS POSSIBLE", "?", "Press Space.");
      }, 2200);
    }
  }

  function emitStoryWave() {
    if (!state.active || state.stage !== STORY.OSCILLATION) return;

    const ring = document.createElement("div");
    ring.className = "storyWave";
    ring.style.left = state.x + "%";
    ring.style.top = state.y + "%";
    prologue.appendChild(ring);

    window.setTimeout(() => ring.remove(), 1700);

    setDiscovery("OSCILLATION DETECTED", "A(r,t) = sin(kr − ωt)", "The point can disturb the field without moving through it.");
    state.stage = STORY.COMPLETE;

    window.setTimeout(() => {
      setDiscovery("PHASE", "The field is listening.", "Entering the active system.");
    }, 1650);

    window.setTimeout(completeStory, 3400);
  }

  function completeStory() {
    if (!state.active) return;

    state.active = false;
    prologue.classList.remove("visible", "disturbed");
    hud.classList.remove("storyHidden");
    help.classList.remove("storyHidden");
    prologueTrail.innerHTML = "";

    state.bypassStartIntercept = true;
    startButton.click();
    state.bypassStartIntercept = false;
  }

  function directionFor(code) {
    switch (code) {
      case "KeyW":
      case "ArrowUp":
        return [0, -1];
      case "KeyS":
      case "ArrowDown":
        return [0, 1];
      case "KeyA":
      case "ArrowLeft":
        return [-1, 0];
      case "KeyD":
      case "ArrowRight":
        return [1, 0];
      default:
        return null;
    }
  }

  function storyLoop() {
    if (state.active && state.keys.size) {
      let dx = 0;
      let dy = 0;

      for (const code of state.keys) {
        const dir = directionFor(code);
        if (!dir) continue;
        dx += dir[0];
        dy += dir[1];
      }

      if (dx || dy) {
        const mag = Math.hypot(dx, dy);
        movePoint(dx / mag, dy / mag);
      }
    }

    requestAnimationFrame(storyLoop);
  }

  startButton.addEventListener("click", event => {
    if (state.bypassStartIntercept) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    enterStory();
  }, true);

  window.addEventListener("keydown", event => {
    if (!state.active) return;

    const dir = directionFor(event.code);
    if (dir) {
      event.preventDefault();
      state.keys.add(event.code);
    }

    if (event.code === "Space" && state.stage === STORY.OSCILLATION) {
      event.preventDefault();
      emitStoryWave();
    }
  }, true);

  window.addEventListener("keyup", event => {
    state.keys.delete(event.code);
  }, true);

  requestAnimationFrame(storyLoop);
})();
