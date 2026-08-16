(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const p = G.player;

  function releaseMovement() {
    G.keys?.clear?.();
    if (p) {
      p.vx = 0;
      p.vy = 0;
    }
  }

  G.releaseMovement = releaseMovement;

  window.addEventListener("blur", releaseMovement, true);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) releaseMovement();
  }, true);
  window.addEventListener("pointerout", event => {
    if (!event.relatedTarget) releaseMovement();
  }, true);
  window.addEventListener("mousedown", event => {
    if (event.target !== G.el.game) releaseMovement();
  }, true);

  const baseToggleJournal = G.toggleJournal;
  if (baseToggleJournal) {
    G.toggleJournal = force => {
      releaseMovement();
      return baseToggleJournal(force);
    };
  }

  [G.el.journal, document.getElementById("acquisition"), G.el.completePanel].filter(Boolean).forEach(el => {
    const observer = new MutationObserver(() => {
      if (el.classList.contains("visible")) releaseMovement();
    });
    observer.observe(el, { attributes:true, attributeFilter:["class"] });
  });
})();