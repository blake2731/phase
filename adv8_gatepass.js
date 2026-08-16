(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G || !G.V8) return;
  const s = G.state;
  const p = G.player;
  const GATE = G.V8.GATE;

  const baseUpdateMovement = G.updateMovement;
  G.updateMovement = dt => {
    const oldX = p.x;
    baseUpdateMovement(dt);
    if (!s.v8?.keyInstalled) return;

    const crossedEast = oldX < GATE.x - 24 && p.x >= GATE.x - 24;
    const crossedWest = oldX > GATE.x + 24 && p.x <= GATE.x + 24;
    const insideOpening = p.y > 825 && p.y < 1175;
    if (insideOpening || (!crossedEast && !crossedWest)) return;

    if (crossedEast) {
      p.x = GATE.x - 42;
      p.vx = Math.min(0, p.vx);
    } else {
      p.x = GATE.x + 42;
      p.vx = Math.max(0, p.vx);
    }
    G.showMessage("THE PASSAGE OPENS AT THE CENTER", 780);
  };
})();