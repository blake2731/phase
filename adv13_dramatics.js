(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;

  function showWhenClear(item) {
    const tryShow = () => {
      if (s.acquisitionActive || G.storyMomentActive?.()) {
        window.setTimeout(tryShow, 120);
        return;
      }
      G.showStoryMoment?.(item);
    };
    window.setTimeout(tryShow, 180);
  }

  const baseMessage = G.showMessage;
  G.showMessage = (text, duration) => {
    if (G.V13Attention?.isFocused?.()) {
      return;
    }
    baseMessage(text, duration);
  };

  const baseDiscovery = G.showDiscovery;
  G.showDiscovery = (title, formula, meaning, duration, observation) => {
    if (title === "ORIGIN HOLDS") {
      showWhenClear({
        kind:"origin",
        kicker:"THE CHORD RETURNS",
        title:"ORIGIN HOLDS",
        body:"All three notes are home.",
        mark:"HOME RESTORED",
        minMs:2500,
        chord:[1, 5/4, 3/2, 15/8, 2]
      });
      return;
    }

    if (title === "PATH OPEN" || title === "GATE OPEN") {
      showWhenClear({
        kind:"gate",
        kicker:"THE FIELD CHANGES",
        title:"A PATH EXISTS",
        body:"Phi completes what P could not reach alone.",
        mark:"PASSAGE STABLE",
        minMs:2600,
        chord:[1, 5/4, 3/2, 15/8, 2]
      });
      return;
    }

    baseDiscovery(title, formula, meaning, duration, observation);
  };

  const baseQuest = G.updateQuest;
  G.updateQuest = () => {
    baseQuest();
    if (G.V13Attention?.isFocused?.()) {
      G.releaseMovement?.();
    }
  };

  s.v13 = s.v13 || {};
})();