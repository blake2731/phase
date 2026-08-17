(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;

  const baseMessage = G.showMessage;
  G.showMessage = (text, duration) => {
    if (G.V13Attention?.isFocused?.()) {
      // Major moments already own the player's attention. Do not stack
      // disposable chatter behind them.
      return;
    }
    baseMessage(text, duration);
  };

  const baseDiscovery = G.showDiscovery;
  G.showDiscovery = (title, formula, meaning, duration, observation) => {
    if (title === "ORIGIN HOLDS") {
      G.showStoryMoment?.({
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
      G.showStoryMoment?.({
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

  // If a delayed hint from an older layer fires while a major moment has
  // control, the persistent Current Thread is enough after control returns.
  const baseQuest = G.updateQuest;
  G.updateQuest = () => {
    baseQuest();
    if (G.V13Attention?.isFocused?.()) {
      G.releaseMovement?.();
    }
  };

  s.v13 = s.v13 || {};
})();