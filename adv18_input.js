(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const acq = document.getElementById("acquisition");
  const button = document.getElementById("acquisitionButton");
  const effect = document.getElementById("acquisitionEffect");
  const title = document.getElementById("acquisitionTitle");
  let pendingJournalOpen = false;

  function isJournalAcquisition() {
    return Boolean(s.acquisitionActive && s.acquisitionCurrent?.openJournal);
  }

  function tryOpenJournal() {
    if (!pendingJournalOpen || !isJournalAcquisition()) return;
    if (!button || button.disabled) return;
    pendingJournalOpen = false;
    button.click();
  }

  window.addEventListener("keydown", event => {
    if (event.code !== "KeyJ" || !isJournalAcquisition()) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    // J is the semantic action the screen is teaching. If the dramatic reveal
    // is not ready to dismiss yet, retain the player's intent rather than
    // silently throwing the input away.
    pendingJournalOpen = true;
    tryOpenJournal();
  }, true);

  window.setInterval(tryOpenJournal, 70);

  if (acq) {
    const observer = new MutationObserver(() => {
      if (!acq.classList.contains("visible")) {
        pendingJournalOpen = false;
        return;
      }
      if (title?.textContent?.trim() !== "FIELD JOURNAL") return;
      if (effect) effect.textContent = "J / OPEN JOURNAL  •  enter the Field Journal";
      if (button) button.textContent = "OPEN JOURNAL";
    });
    observer.observe(acq, { attributes:true, attributeFilter:["class"] });
  }
})();