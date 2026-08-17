(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;

  const MOVEMENT = new Set(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"]);
  const CONFIRM = new Set(["Space","Enter"]);
  const QUIET_MS = 620;
  const POST_BOUNDARY_MS = 420;
  let postBoundaryUntil = 0;

  const overlays = [];

  function makeGuard(wrapId, buttonId, minMs, phases) {
    const wrap = document.getElementById(wrapId);
    const button = document.getElementById(buttonId);
    if (!wrap || !button) return null;

    const rec = {
      wrap,
      button,
      minMs,
      phases,
      visible:false,
      openedAt:0,
      readyAt:0,
      lastConfirmAt:-Infinity,
      keyboardCommit:false,
      timers:[]
    };

    function clearTimers() {
      rec.timers.forEach(clearTimeout);
      rec.timers.length = 0;
    }

    function setPhase(name) {
      if (rec.visible) wrap.dataset.attentionPhase = name;
    }

    function opened() {
      clearTimers();
      rec.visible = true;
      rec.openedAt = performance.now();
      rec.readyAt = rec.openedAt + minMs;
      rec.lastConfirmAt = rec.openedAt;
      rec.keyboardCommit = false;
      button.disabled = true;
      wrap.dataset.attentionPhase = phases[0].name;
      G.releaseMovement?.();

      phases.slice(1).forEach(phase => {
        rec.timers.push(window.setTimeout(() => setPhase(phase.name), phase.at));
      });
      document.body.classList.add("phaseFocus");
    }

    function closed() {
      clearTimers();
      rec.visible = false;
      rec.keyboardCommit = false;
      delete wrap.dataset.attentionPhase;
      button.disabled = false;
      postBoundaryUntil = performance.now() + POST_BOUNDARY_MS;
      G.releaseMovement?.();
      if (!overlays.some(o => o.visible)) document.body.classList.remove("phaseFocus");
    }

    const observer = new MutationObserver(() => {
      const nowVisible = wrap.classList.contains("visible");
      if (nowVisible && !rec.visible) opened();
      if (!nowVisible && rec.visible) closed();
    });
    observer.observe(wrap, { attributes:true, attributeFilter:["class"] });

    overlays.push(rec);
    return rec;
  }

  const story = makeGuard("storyMoment", "storyMomentButton", 2350, [
    { name:"settle", at:0 },
    { name:"title", at:420 },
    { name:"meaning", at:1050 },
    { name:"ready", at:2050 }
  ]);

  const acquisition = makeGuard("acquisition", "acquisitionButton", 1900, [
    { name:"settle", at:0 },
    { name:"symbol", at:260 },
    { name:"title", at:760 },
    { name:"meaning", at:1160 },
    { name:"ready", at:1650 }
  ]);

  function activeGuard() {
    if (story?.visible) return story;
    if (acquisition?.visible) return acquisition;
    return null;
  }

  function refreshReadyState(rec) {
    if (!rec?.visible || rec.keyboardCommit) return;
    const now = performance.now();
    const ready = now >= rec.readyAt && now - rec.lastConfirmAt >= QUIET_MS;
    rec.button.disabled = !ready;
    if (ready) rec.wrap.dataset.attentionPhase = "ready";
  }

  window.setInterval(() => {
    overlays.forEach(refreshReadyState);
  }, 80);

  window.addEventListener("keydown", event => {
    const rec = activeGuard();
    if (rec) {
      if (CONFIRM.has(event.code) || event.code === "Escape") {
        const now = performance.now();
        const quietBeforePress = now - rec.lastConfirmAt >= QUIET_MS;
        rec.lastConfirmAt = now;
        event.preventDefault();
        event.stopImmediatePropagation();

        if (!CONFIRM.has(event.code) || event.repeat) return;
        if (now < rec.readyAt || !quietBeforePress) return;

        rec.keyboardCommit = true;
        rec.button.disabled = false;
        rec.button.click();
        return;
      }
      if (MOVEMENT.has(event.code)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
    }

    if (MOVEMENT.has(event.code) && performance.now() < postBoundaryUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
      G.releaseMovement?.();
    }
  }, true);

  window.addEventListener("click", event => {
    const rec = activeGuard();
    if (!rec || !rec.wrap.contains(event.target)) return;

    if (event.target === rec.button) {
      if (rec.keyboardCommit && !event.isTrusted) {
        rec.keyboardCommit = false;
        return;
      }

      refreshReadyState(rec);
      if (rec.button.disabled) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  G.V13Attention = {
    isFocused:() => Boolean(activeGuard()),
    postBoundaryActive:() => performance.now() < postBoundaryUntil
  };
})();