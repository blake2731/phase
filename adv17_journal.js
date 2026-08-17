(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;

  const COPY = {
    "P ≠ origin": {
      title:"DISPLACEMENT",
      note:"P can occupy a position independent of Origin. That distinction turns displacement into a usable property of motion."
    },
    "φ": {
      title:"GOLDEN RATIO",
      note:"A fivefold structure contains the same ratio between its diagonals and sides."
    },
    "Δt": {
      title:"RESONANCE MEMORY",
      note:"A resonant state can persist after the original pulse has passed."
    }
  };

  function polygon(n, r=18, cx=35, cy=27, rot=-Math.PI/2) {
    const pts=[];
    for(let i=0;i<n;i++){
      const a=rot+i*Math.PI*2/n;
      pts.push(`${(cx+Math.cos(a)*r).toFixed(1)},${(cy+Math.sin(a)*r).toFixed(1)}`);
    }
    return pts.join(" ");
  }

  function sketch(formula) {
    const base='viewBox="0 0 90 54" aria-hidden="true"';
    if (formula === "P ≠ origin") return `<svg ${base}><circle cx="18" cy="27" r="4"/><circle cx="70" cy="27" r="4"/><path d="M24 27h38M56 21l8 6-8 6"/><path d="M18 16v22M8 27h20"/></svg>`;
    if (formula === "φ") return `<svg ${base}><polygon points="${polygon(5,20,35,27)}"/><path d="M35 7L47 43L16 20L54 20L23 43Z"/><path d="M62 17h16M62 27h10M62 37h16"/></svg>`;
    if (formula === "Δt") return `<svg ${base}><path d="M14 10v34M74 10v34"/><path d="M20 27c8-18 16-18 24 0s16 18 24 0"/><path d="M23 44h42"/><path d="M59 39l7 5-7 5"/></svg>`;
    if (formula === "f_mote ← f_P") return `<svg ${base}><circle cx="19" cy="27" r="5"/><path d="M27 27h30"/><path d="M34 21l-8 6 8 6"/><circle cx="66" cy="15" r="3"/><circle cx="72" cy="27" r="3"/><circle cx="66" cy="39" r="3"/></svg>`;
    if (formula === "2 → 4 → 8") return `<svg ${base}><circle cx="18" cy="27" r="5"/><circle cx="43" cy="27" r="10"/><circle cx="72" cy="27" r="16"/><path d="M24 27h8M54 27h3"/></svg>`;
    if (formula === "∑") return `<svg ${base}><path d="M12 37c11-27 22-27 33 0"/><path d="M12 17c11 27 22 27 33 0"/><circle cx="65" cy="27" r="12"/><path d="M53 27h24"/></svg>`;
    if (formula === "2 · 3 · 5") return `<svg ${base}><circle cx="28" cy="20" r="12"/><circle cx="43" cy="20" r="12"/><circle cx="35" cy="34" r="12"/><path d="M58 27h20"/></svg>`;
    if (formula === "2 : 3 : 5") return `<svg ${base}><circle cx="18" cy="14" r="4"/><circle cx="18" cy="27" r="4"/><circle cx="18" cy="40" r="4"/><path d="M23 14l29 13M23 27h29M23 40l29-13"/><polygon points="${polygon(5,13,67,27)}"/></svg>`;
    if (formula === "f_out = f_in") return `<svg ${base}><circle cx="22" cy="27" r="5"/><path d="M29 27h38"/><path d="M59 21l9 6-9 6"/><path d="M68 34c-8 13-32 13-40 1"/><path d="M34 39l-7-4 8-3"/></svg>`;
    if (formula === "∮") return `<svg ${base}><ellipse cx="40" cy="27" rx="24" ry="16"/><path d="M57 15l8 5-8 4"/><circle cx="40" cy="11" r="3"/></svg>`;
    if (formula.includes("v = 0") || formula === "v=0") return `<svg ${base}><circle cx="38" cy="27" r="4"/><circle cx="38" cy="27" r="12"/><circle cx="38" cy="27" r="21"/><path d="M70 18v18M61 27h18"/></svg>`;
    if (formula === "7") return `<svg ${base}><polygon points="${polygon(7,20,40,27)}"/><circle cx="40" cy="27" r="3"/></svg>`;
    return "";
  }

  const baseAddSecret = G.addSecret;
  G.addSecret = (title, formula, note, insight=1) => {
    const replacement = COPY[formula];
    if (replacement && /^FOUND\s*[•·]/i.test(title)) {
      title = replacement.title;
      note = replacement.note;
    }
    return baseAddSecret(title, formula, note, insight);
  };

  function decorate() {
    const list = document.getElementById("secretList");
    if (!list) return;
    const section = list.closest("section");
    section?.classList.add("journalSectionWide", "observationsSection");

    list.querySelectorAll(".journalEntry").forEach(entry => {
      if (!entry.querySelector("strong")) return;
      entry.classList.add("v17Observation");
      const glyph = entry.querySelector(".journalGlyph");
      const title = entry.querySelector("strong");
      const note = entry.querySelector("span:not(.journalEffect)");
      const formula = glyph?.textContent?.trim() || "";
      const replacement = COPY[formula];

      if (replacement) {
        if (/^FOUND\s*[•·]/i.test(title?.textContent || "")) title.textContent = replacement.title;
        if (note) note.textContent = replacement.note;
      }

      if (glyph) {
        glyph.classList.add("journalFormulaBadge");
        glyph.title = formula;
      }

      entry.querySelector(".journalSketch")?.remove();
      const markup = sketch(formula);
      if (markup) {
        const visual = document.createElement("div");
        visual.className = "journalSketch v17Sketch";
        visual.innerHTML = markup;
        entry.appendChild(visual);
      }
    });
  }

  const baseRefresh = G.refreshJournal;
  G.refreshJournal = () => {
    baseRefresh();
    decorate();
  };

  decorate();
})();
