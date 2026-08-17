(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const ui = {
    wrap: document.getElementById("storyMoment"),
    kicker: document.getElementById("storyMomentKicker"),
    title: document.getElementById("storyMomentTitle"),
    body: document.getElementById("storyMomentBody"),
    mark: document.getElementById("storyMomentMark"),
    button: document.getElementById("storyMomentButton")
  };
  if (!ui.wrap) return;

  const queue = [];
  let active = false;
  let unlockAt = 0;
  let currentItem = null;

  function releaseInput() {
    if (G.releaseMovement) G.releaseMovement();
    else {
      G.keys?.clear?.();
      G.player.vx = 0;
      G.player.vy = 0;
    }
  }

  function openNext() {
    if (active || !queue.length) return;
    const item = queue.shift();
    currentItem = item;
    active = true;
    unlockAt = performance.now() + (item.minMs || 1250);
    releaseInput();
    ui.wrap.dataset.kind = item.kind || "story";
    ui.kicker.textContent = item.kicker || "";
    ui.title.textContent = item.title || "";
    ui.body.textContent = item.body || "";
    ui.mark.textContent = item.mark || "";
    ui.button.textContent = item.button || "CONTINUE";
    ui.button.disabled = true;
    ui.wrap.classList.add("visible");
    window.setTimeout(() => {
      if (active) ui.button.disabled = false;
    }, item.minMs || 1250);
    if (item.chord) G.chord?.(item.root || 110, item.chord);
  }

  function show(item) {
    queue.push(item);
    openNext();
  }

  function close() {
    if (!active || performance.now() < unlockAt) return;
    const finished = currentItem;
    currentItem = null;
    active = false;
    ui.wrap.classList.remove("visible");
    releaseInput();
    G.lastTime = performance.now();
    window.setTimeout(() => {
      if (typeof finished?.onClose === "function") finished.onClose();
      openNext();
    }, 160);
  }

  ui.button.addEventListener("click", close);
  ui.wrap.addEventListener("mousedown", event => {
    if (event.target === ui.wrap) close();
  });
  window.addEventListener("keydown", event => {
    if (!active) return;
    if (["Space", "Enter"].includes(event.code)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    }
  }, true);

  G.showStoryMoment = show;
  G.storyMomentActive = () => active;

  const baseStart = G.startGame;
  G.startGame = () => {
    baseStart();
    show({
      kind:"origin",
      kicker:"THE FIRST MEMORY",
      title:"ORIGIN",
      body:"Before P knew paths, there was one place that always answered.",
      mark:"HOME",
      minMs:1900
    });
  };

  const baseUpdate = G.update;
  G.update = dt => {
    if (active) {
      releaseInput();
      return;
    }

    const phaseBefore = G.intro?.phase;
    baseUpdate(dt);
    const phaseAfter = G.intro?.phase;

    if (phaseBefore !== "break" && phaseAfter === "break") {
      show({
        kind:"break",
        kicker:"THE OLD SONG STOPS",
        title:"ORIGIN BREAKS",
        body:"Three notes are torn from home.",
        mark:"3 MISSING",
        minMs:1700
      });
    }
  };
})();