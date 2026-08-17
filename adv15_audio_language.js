(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;

  const acquisition = document.getElementById("acquisition");
  const acquisitionTitle = document.getElementById("acquisitionTitle");
  const acquisitionGlyph = document.getElementById("acquisitionGlyph");
  const story = document.getElementById("storyMoment");
  const storyTitle = document.getElementById("storyMomentTitle");
  let lastCueAt = -Infinity;

  function tone(freq, delay, duration, gain, type = "triangle") {
    G.tone?.(freq, duration, gain, type, delay);
  }

  function beginCue(duck = .12, hold = .85) {
    G.ensureAudio?.();
    if (!G.audio) return false;
    G.duckMusic?.(duck, hold, .45);
    lastCueAt = performance.now();
    return true;
  }

  function resolved(root = 196) {
    if (!beginCue(.10, .9)) return;
    tone(root, 0, .42, .010, "sine");
    tone(root * 3 / 2, .13, .38, .014);
    tone(root * 2, .34, .62, .019, "sine");
  }

  function observation(root = 261.63) {
    if (!beginCue(.16, .72)) return;
    tone(root * 5 / 4, 0, .24, .009, "sine");
    tone(root * 3 / 2, .16, .34, .011, "triangle");
    tone(root * 15 / 8, .39, .52, .008, "sine");
  }

  function worldChange(root = 130.81) {
    if (!beginCue(.065, 1.15)) return;
    tone(root, 0, .70, .015, "sine");
    tone(root * 3 / 2, .15, .62, .018, "triangle");
    tone(root * 2, .37, .88, .023, "sine");
    tone(root * 5 / 2, .48, .58, .008, "triangle");
  }

  function anomaly(root = 174.61) {
    if (!beginCue(.12, .92)) return;
    tone(root, 0, .44, .010, "sine");
    tone(root * 11 / 8, .14, .62, .011, "triangle");
    tone(root * 7 / 4, .31, .74, .008, "sine");
  }

  function modeCue(prime) {
    if (!beginCue(.08, 1.05)) return;
    const root = 196;
    const palettes = {
      2:[1,2],
      3:[1,5/4,3/2],
      5:[1,9/8,5/4,3/2,2],
      7:[1,9/8,5/4,4/3,3/2,5/3,2],
      11:[1,9/8,5/4,11/8,3/2,15/8,2]
    };
    const notes = palettes[prime] || [1,5/4,3/2,2];
    const spacing = Math.max(.075, .34 / notes.length);
    notes.forEach((ratio, i) => tone(root * ratio, i * spacing, .25 + i * .035, .010 + i * .0015, i === notes.length - 1 ? "sine" : "triangle"));
  }

  function journalCue() {
    if (!beginCue(.18, .55)) return;
    tone(330, 0, .16, .008, "triangle");
    tone(392, .10, .18, .009, "triangle");
    tone(523.25, .22, .32, .011, "sine");
  }

  function keyCue() {
    if (!beginCue(.08, 1.0)) return;
    [1,5/4,3/2,15/8,2].forEach((ratio, i) => tone(174.61 * ratio, i * .075, .28 + i * .025, .010 + i * .0015, i === 4 ? "sine" : "triangle"));
    tone(87.31, .05, .62, .008, "sine");
  }

  function bondCue() {
    if (!beginCue(.07, 1.25)) return;
    tone(220 * 5/4, 0, .72, .011, "sine");
    tone(220 * 3/2, 0, .72, .011, "sine");
    tone(220, .34, .60, .010, "triangle");
    tone(440, .48, .88, .022, "sine");
  }

  function fourNotesCue() {
    if (!beginCue(.075, 1.25)) return;
    [220,275,330,412.5].forEach((freq, i) => tone(freq, i * .23, .42, .014 + i * .0015, i % 2 ? "triangle" : "sine"));
    tone(220, 1.02, .62, .007, "sine");
  }

  function playAcquisition() {
    const title = acquisitionTitle?.textContent?.trim() || "";
    const glyph = acquisitionGlyph?.textContent?.trim() || "";
    const kind = acquisition?.dataset?.kind || "";

    const modeMatch = title.match(/MODE\s+(\d+)/i);
    if (modeMatch) return modeCue(Number(modeMatch[1]));
    if (title === "PRIME PULSE") return modeCue(2);
    if (title.includes("JOURNAL")) return journalCue();
    if (kind === "bond" || title === "PHI") return bondCue();
    if (kind === "key" || /KEY|CORE/i.test(title) || glyph === "⌬") return keyCue();
    if (kind === "anomaly") return anomaly();
    resolved(220);
  }

  const baseDiscovery = G.showDiscovery;
  G.showDiscovery = (title, formula, meaning, duration, isObservation) => {
    const result = baseDiscovery(title, formula, meaning, duration, isObservation);
    if (["ORIGIN HOLDS","PATH OPEN","GATE OPEN"].includes(title)) return result;
    if (performance.now() - lastCueAt < 120) return result;

    if (isObservation) observation();
    else if (/BASIN|COHERENT|PATH|TIMING|BRIDGE|RESTORED/i.test(title)) worldChange();
    else if (/ANOMAL|UNKNOWN|SEVENTH|DISTANT/i.test(title)) anomaly();
    else resolved();
    return result;
  };

  if (acquisition) {
    let wasVisible = acquisition.classList.contains("visible");
    const observer = new MutationObserver(() => {
      const visible = acquisition.classList.contains("visible");
      if (visible && !wasVisible) window.setTimeout(playAcquisition, 105);
      wasVisible = visible;
    });
    observer.observe(acquisition, { attributes:true, attributeFilter:["class"] });
  }

  if (story) {
    let wasVisible = story.classList.contains("visible");
    const observer = new MutationObserver(() => {
      const visible = story.classList.contains("visible");
      if (visible && !wasVisible) {
        const title = storyTitle?.textContent?.trim() || "";
        if (title === "FOUR NOTES") fourNotesCue();
        else if (title === "A PATH EXISTS") worldChange(146.83);
      }
      wasVisible = visible;
    });
    observer.observe(story, { attributes:true, attributeFilter:["class"] });
  }

  G.V15Audio = { resolved, observation, worldChange, anomaly, modeCue, keyCue, bondCue, fourNotesCue };
})();