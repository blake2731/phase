(() => {
  "use strict";
  const G=window.PHASEV2;if(!G)return;const s=G.state;const LATE=997;
  function configure(){(s.collectibles||[]).forEach(item=>{item.requiredFrequency=item.frequency;item.homeX=item.x;item.homeY=item.y;if(item.formula==="?"){item.x=5050;item.y=760;item.requiredFrequency=11;}});sync();}
  function rank(){if(s.stage==="complete"||s.stage==="post")return 7;if(s.stage==="threshold")return 6;if(s.stage==="exit")return 5;if(s.stage==="garden")return 4;if(s.stage==="span")return 3;if(s.stage==="basin")return 2;if(s.stage==="follow")return 1;if(s.stage==="origin_hub")return 0;return-1;}
  function visible(item){const r=rank();if(item.formula==="P ≠ origin")return r>=1;if(item.formula==="7")return r>=2;if(item.formula==="∑"||item.formula==="Δt")return r>=3;if(item.formula==="φ")return r>=4;if(item.formula==="?")return Boolean(s.thresholdCrossed);return r>=1;}
  function sync(){(s.collectibles||[]).forEach(item=>{if(item.collected)return;item.frequency=visible(item)?item.requiredFrequency:LATE;});}
  const baseReset=G.resetWorld;G.resetWorld=()=>{baseReset();configure();};
  const baseUpdateCollectibles=G.updateCollectibles;G.updateCollectibles=()=>{sync();baseUpdateCollectibles();};
  const baseExit=G.drawExitGlyph;G.drawExitGlyph=()=>{if(!s.phiRepaired)return;baseExit();};
})();