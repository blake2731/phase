(() => {
  "use strict";
  const G=window.PHASEV2,s=G.state;

  function frame(now){const dt=Math.min(0.033,Math.max(0,(now-G.lastTime)/1000));G.lastTime=now;if(G.running)G.update(dt);G.draw();requestAnimationFrame(frame);}

  addEventListener("resize",G.resize);
  addEventListener("keydown",event=>{
    if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(event.code))event.preventDefault();
    if(!G.running)return;
    if(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(event.code))G.keys.add(event.code);
    if(event.code==="Space")G.emitWave();
    if(event.code==="KeyQ")G.changeFrequency(-1);
    if(event.code==="KeyE")G.changeFrequency(1);
    if(event.code==="KeyJ")G.toggleJournal();
    if(event.code==="Escape"&&G.el.journal.classList.contains("visible"))G.toggleJournal(false);
  });
  addEventListener("keyup",event=>G.keys.delete(event.code));
  G.el.game.addEventListener("mousedown",()=>G.emitWave());
  G.el.game.addEventListener("touchstart",event=>{event.preventDefault();G.emitWave();},{passive:false});
  G.el.startButton.addEventListener("click",G.startGame);
  G.el.closeJournal.addEventListener("click",()=>G.toggleJournal(false));
  G.el.continueButton.addEventListener("click",()=>{G.el.completePanel.classList.remove("visible");s.postGame=true;s.stage="post";s.complete=false;G.updateQuest();});
  G.el.replayButton.addEventListener("click",()=>{G.el.completePanel.classList.remove("visible");G.startGame();});

  G.resize();G.resetWorld();requestAnimationFrame(frame);
})();