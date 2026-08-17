(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;

  const ROOT = 220;
  const story = document.getElementById("storyMoment");
  const title = document.getElementById("storyMomentTitle");
  if (!story || !title) return;

  function note(ratio, delay, duration = .34, gain = .021, type = "triangle") {
    G.tone?.(ROOT * ratio, duration, gain, type, delay);
  }

  function playOriginMotif(kind) {
    G.ensureAudio?.();
    if (!G.audio) return;

    if (kind === "break") G.duckMusic?.(.045, 1.45, .8);
    else if (kind === "restored") G.duckMusic?.(.038, 2.05, .9);
    else G.duckMusic?.(.055, 1.55, .7);

    note(1, 0, .38, .018);
    note(5 / 4, .24, .38, .019);
    note(3 / 2, .50, .42, .020);
    note(15 / 8, .79, kind === "break" ? .82 : .50, .021, "sine");

    // The phrase normally resolves from 15/8 to the octave. Origin's rupture
    // removes that expected arrival. Restoration delays it long enough to be
    // felt before finally completing the same phrase heard at home.
    if (kind === "home") {
      note(2, 1.07, .62, .024, "sine");
      note(1, 1.07, .72, .009, "sine");
    } else if (kind === "restored") {
      note(2, 1.58, .82, .030, "sine");
      note(1, 1.58, .92, .012, "sine");
      note(3 / 2, 1.66, .72, .010, "triangle");
    }
  }

  const baseShowStoryMoment = G.showStoryMoment;
  if (baseShowStoryMoment) {
    G.showStoryMoment = item => {
      // ORIGIN HOLDS is scored by the recurring motif instead of also playing
      // the older generic story chord.
      if (item?.title === "ORIGIN HOLDS") {
        return baseShowStoryMoment({ ...item, chord:null });
      }
      return baseShowStoryMoment(item);
    };
  }

  let wasVisible = story.classList.contains("visible");
  const observer = new MutationObserver(() => {
    const visible = story.classList.contains("visible");
    if (visible && !wasVisible) {
      const t = title.textContent.trim();
      if (t === "ORIGIN") playOriginMotif("home");
      else if (t === "ORIGIN BREAKS") playOriginMotif("break");
      else if (t === "ORIGIN HOLDS") playOriginMotif("restored");
    }
    wasVisible = visible;
  });
  observer.observe(story, { attributes:true, attributeFilter:["class"] });

  G.V14Music = {
    playOriginMotif
  };
})();
