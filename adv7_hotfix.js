(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;

  // Contextual interactions get first claim on Space.
  // v7 normally blocks emitWave until Prime Pulse is acquired, but the
  // prologue uses the same key to answer Origin before Pulse exists.
  const progressionEmitWave = G.emitWave;
  G.emitWave = () => {
    const answeringOrigin = Boolean(G.intro?.active && G.intro.phase === "return");
    const abilities = s.abilities;

    if (answeringOrigin && abilities && !abilities.pulse) {
      abilities.pulse = true;
      try {
        progressionEmitWave();
      } finally {
        abilities.pulse = false;
        G.updateHud?.();
      }
      return;
    }

    progressionEmitWave();
  };
})();
