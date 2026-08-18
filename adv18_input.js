(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const acq = document.getElementById("acquisition");
  const button = document.getElementById("acquisitionButton");
  const effect = document.getElementById("acquisitionEffect");
  const title = document.getElementById("acquisitionTitle");

  function isJournalAcquisition() {
    return Boolean(s.acquisitionActive && s.acquisitionCurrent?.openJournal);
  }

  window.addEventListener("keydown", event => {
    if (event.code !== "KeyJ" || !isJournalAcquisition()) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    // Respect the same dramatic ready state as the Continue button. Once the
    // acquisition is ready, J becomes a literal shortcut for OPEN JOURNAL.
    if (button && !button.disabled) button.click();
  }, true);

  if (acq) {
    const observer = new MutationObserver(() => {
      if (!acq.classList.contains("visible")) return;
      if (title?.textContent?.trim() !== "FIELD JOURNAL") return;
      if (effect) effect.textContent = "J / OPEN JOURNAL  •  enter the Field Journal";
      if (button) button.textContent = "OPEN JOURNAL";
    });
    observer.observe(acq, { attributes:true, attributeFilter:["class"] });
  }
})();