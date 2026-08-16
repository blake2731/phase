(() => {
  "use strict";
  const G=window.PHASEV2;if(!G)return;
  const s=G.state,p=G.player;
  const ui={wrap:document.getElementById("openingSequence"),kicker:document.getElementById("openingKicker"),title:document.getElementById("openingTitle"),formula:document.getElementById("openingFormula"),prompt:document.getElementById("openingPrompt"),ready:document.getElementById("openingReady"),chapter:document.getElementById("chapterCard"),chapterKicker:document.getElementById("chapterKicker"),chapterTitle:document.getElementById("chapterTitle"),chapterSubtitle:document.getElementById("chapterSubtitle")};
  const ORIGIN={x:520,y:1000},HOME_RADIUS=184,HOME_FREQS=[220,275,330,412.5];

  G.intro={active:false,phase:"idle",phaseTime:0,elapsed:0,lastX:p.x,lastY:p.y,origin:{...ORIGIN,broken:false,pulse:0},homeLights:[],breakAge:99};

  function buildHomeLights(){
    G.intro.homeLights=[];
    for(let i=0;i<4;i++){
      const a=-Math.PI/2+i*G.TAU/4;
      G.intro.homeLights.push({x:ORIGIN.x+Math.cos(a)*HOME_RADIUS,y:ORIGIN.y+Math.sin(a)*HOME_RADIUS,active:false,broken:false,phase:i*Math.PI/2,activatedAt:-999});
    }
  }
  function setNarrative(title,prompt="",ready=""){
    if(!ui.wrap)return;
    ui.kicker.textContent="";ui.title.textContent=title;ui.formula.textContent="";ui.prompt.textContent=prompt;ui.ready.textContent=ready;ui.ready.classList.toggle("visible",Boolean(ready));ui.wrap.classList.add("visible");ui.wrap.dataset.phase=G.intro.phase;
  }
  function setPhase(phase){G.intro.phase=phase;G.intro.phaseTime=0;if(ui.wrap)ui.wrap.dataset.phase=phase;}
  function hideNarrative(){ui.wrap?.classList.remove("visible");}
  function showChapter(){
    if(!ui.chapter)return;
    ui.chapterKicker.textContent="CHAPTER I";ui.chapterTitle.textContent="THE LOST NOTES";ui.chapterSubtitle.textContent="Bring them home.";
    ui.chapter.classList.add("visible");setTimeout(()=>ui.chapter?.classList.remove("visible"),2600);
  }

  function beginPrologue(){
    G.resetWorld();buildHomeLights();G.running=true;G.paused=false;G.lastTime=performance.now();
    s.stage="prologue";s.area="ORIGIN";s.signal.visible=false;s.signalMet=false;s.signalAtBasin=false;s.prologueComplete=false;
    p.x=338;p.y=1000;p.vx=0;p.vy=0;p.speed=238;p.trail.length=0;
    Object.assign(G.intro,{active:true,phase:"wake",phaseTime:0,elapsed:0,lastX:p.x,lastY:p.y,origin:{...ORIGIN,broken:false,pulse:0},breakAge:99});
    G.el.startScreen.classList.remove("visible");G.el.hud.classList.add("storyHidden");G.el.help.classList.add("storyHidden");G.el.quest.classList.add("storyHidden");G.el.discovery.classList.remove("visible");G.el.completePanel.classList.remove("visible");
    if(G.startMusic)G.startMusic();else G.ensureAudio();
    setNarrative("THIS IS P.","This is home.");
  }

  function enterHome(){setPhase("home");G.tone(220,0.18,0.011,"sine");setNarrative("WAKE THE LIGHTS.","Walk to them.","0 / 4");}
  function wakeHomeLight(light,index){
    if(light.active)return;light.active=true;light.activatedAt=G.gameTime;G.intro.origin.pulse=1;G.tone(HOME_FREQS[index],0.28,0.014,index%2?"triangle":"sine");
    const awake=G.intro.homeLights.filter(item=>item.active).length;ui.ready.textContent=awake+" / 4";
    if(awake===4)setTimeout(enterReturn,800);
  }
  function enterReturn(){if(!G.intro.active||G.intro.phase!=="home")return;setPhase("return");G.chord(110,[1,5/4,3/2,15/8]);setNarrative("COME HOME.","","RETURN TO THE CENTER • SPACE");}
  function answerOrigin(){
    if(G.intro.phase!=="return")return;
    if(Math.hypot(p.x-ORIGIN.x,p.y-ORIGIN.y)>150){G.showMessage("COME CLOSER",700);return;}
    setPhase("answer");G.intro.origin.pulse=2.2;G.chord(110,[1,5/4,3/2,15/8]);setNarrative("THE OLD SONG.","Four notes. Always the same.");setTimeout(beginBreak,1650);
  }
  function beginBreak(){
    if(!G.intro.active||G.intro.phase!=="answer")return;
    setPhase("break");G.intro.origin.broken=true;G.intro.breakAge=0;
    [1,2,3].forEach(i=>{G.intro.homeLights[i].broken=true;G.intro.homeLights[i].active=false;});
    document.body.classList.add("phaseBreak");setTimeout(()=>document.body.classList.remove("phaseBreak"),950);
    G.tone(110,0.5,0.018,"sine");G.tone(155.56,0.46,0.015,"triangle",0.03);G.tone(82.41,0.75,0.012,"sine",0.07);
    setNarrative("HOME BROKE.","Three notes were thrown into the field.");
  }
  function beginRecovery(){
    if(!G.intro.active)return;
    G.intro.active=false;G.intro.phase="complete";s.prologueComplete=true;
    if(Array.isArray(s.bonds)&&!s.bonds.some(item=>item.title==="ORIGIN"))s.bonds.push({title:"ORIGIN",glyph:"O",note:"The first stable pattern P remembers. Three notes were torn from it.",effect:"Bring the lost notes home."});
    G.addKnown("POSITION","P has a place to return to. Origin is home.");G.addKnown("MOTION","P can leave home and return. Paths matter because destinations do.");
    hideNarrative();
    if(G.launchOriginHub)G.launchOriginHub();
    else {s.stage="follow";G.el.hud.classList.remove("storyHidden");G.el.help.classList.remove("storyHidden");G.el.quest.classList.remove("storyHidden");}
    G.refreshJournal?.();showChapter();
  }

  G.startGame=()=>beginPrologue();
  const baseEmitWave=G.emitWave;G.emitWave=()=>{if(G.intro.active){if(G.intro.phase==="return")answerOrigin();return;}baseEmitWave();};
  const baseChangeFrequency=G.changeFrequency;G.changeFrequency=dir=>{if(G.intro.active)return;baseChangeFrequency(dir);};
  const baseToggleJournal=G.toggleJournal;G.toggleJournal=force=>{if(G.intro.active){G.showMessage("NOT YET",650);return;}baseToggleJournal(force);};
  const baseUpdateCollectibles=G.updateCollectibles;G.updateCollectibles=()=>{if(G.intro.active)return;baseUpdateCollectibles();};
  const baseUpdateSecrets=G.updateSecrets;G.updateSecrets=()=>{if(G.intro.active)return;baseUpdateSecrets();};
  const baseUpdateMovement=G.updateMovement;G.updateMovement=dt=>{baseUpdateMovement(dt);if(!G.intro.active)return;p.x=G.clamp(p.x,120,940);p.y=G.clamp(p.y,520,1480);};
  const baseUpdate=G.update;G.update=dt=>{
    baseUpdate(dt);if(!G.intro.active)return;
    const intro=G.intro;intro.elapsed+=dt;intro.phaseTime+=dt;intro.origin.pulse*=Math.pow(0.07,dt);intro.breakAge+=dt;s.area="ORIGIN";
    if(intro.phase==="wake"&&intro.phaseTime>=1.7){enterHome();return;}
    if(intro.phase==="home"){intro.homeLights.forEach((light,index)=>{if(!light.active&&Math.hypot(p.x-light.x,p.y-light.y)<58)wakeHomeLight(light,index);});return;}
    if(intro.phase==="break"&&intro.phaseTime>=2.35)beginRecovery();
  };
})();