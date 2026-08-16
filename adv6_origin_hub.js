(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const p = G.player;

  const ECHOES = [
    { id:"path", x:470, y:520, glyph:"ΔP", title:"PATH NOTE", color:190, done:false, step:0,
      steps:[{x:380,y:760},{x:420,y:680},{x:455,y:600},{x:470,y:520}] },
    { id:"pulse", x:860, y:1230, glyph:"2", title:"PULSE NOTE", color:205, done:false, primed:false },
    { id:"tune", x:875, y:650, glyph:"3", title:"TUNING NOTE", color:248, done:false, primed:false }
  ];

  function resetHub(){
    s.originHub = {
      active:false,
      recovered:0,
      echoes:ECHOES.map(e=>JSON.parse(JSON.stringify(e))),
      launched:false,
      completed:false,
      hintAge:0,
      lastHint:"",
      fieldMotes:Array.from({length:9},(_,i)=>({
        x:250+(i%3)*160,
        y:760+Math.floor(i/3)*120,
        phase:i*0.71,
        curious:i%3===0
      }))
    };
  }

  const baseResetWorld = G.resetWorld;
  G.resetWorld = () => { baseResetWorld(); resetHub(); };

  function launchHub(){
    if (!s.originHub) resetHub();
    const hub=s.originHub;
    hub.active=true;hub.launched=true;hub.recovered=0;hub.completed=false;hub.hintAge=0;
    hub.echoes.forEach(e=>{e.done=false;e.primed=false;if(e.id==="path")e.step=0;});
    s.stage="origin_hub";
    s.area="ORIGIN";
    s.signal.visible=true;
    s.signal.x=760;s.signal.y=930;s.signal.targetX=760;s.signal.targetY=930;
    s.signal.broken=true;s.signal.following=false;
    p.speed=292;
    G.el.hud.classList.remove("storyHidden");
    G.el.help.classList.remove("storyHidden");
    G.el.quest.classList.remove("storyHidden");
    G.updateHud();G.updateQuest();
    G.showMessage("3 NOTES SCATTERED",1100);
    if (G.chord) G.chord(110,[1,5/4,3/2]);
  }
  G.launchOriginHub=launchHub;

  function recoverEcho(echo){
    if(echo.done)return;
    echo.done=true;
    const hub=s.originHub;hub.recovered+=1;
    s.bursts.push({x:echo.x,y:echo.y,prime:echo.id==="tune"?3:2,age:0,duration:1.25,kind:"friend"});
    G.tone(330+hub.recovered*55,0.18,0.018,"triangle");
    setTimeout(()=>G.tone(440+hub.recovered*55,0.22,0.013,"sine"),90);
    G.showMessage(echo.title+" RETURNED",950);
    if(hub.recovered===1) G.addKnown("RETURN","A displaced pattern can be restored when P reproduces the condition that shaped it.");
    if(hub.recovered>=3){
      hub.completed=true;
      s.originHub.active=false;
      s.prologueComplete=true;
      s.stage="follow";
      s.signalMet=true;
      s.signal.trust=Math.max(2,s.signal.trust);
      s.signal.targetX=1120;s.signal.targetY=760;
      G.addKnown("RESTORED CHORD","Origin can hold its pattern again, but the fivefold signal is still incomplete.");
      G.showDiscovery("ORIGIN HOLDS","3 notes returned","Home is stable enough to listen again. The broken fivefold signal turns east.",2600);
      setTimeout(()=>{G.showMessage("FOLLOW THE FIVEFOLD SIGNAL",1200);G.updateQuest();},900);
      if(G.refreshJournal)G.refreshJournal();
    }
    G.updateQuest();
  }

  function updatePathEcho(echo){
    const step=echo.steps[echo.step];
    if(!step)return;
    if(Math.hypot(p.x-step.x,p.y-step.y)<48){
      echo.step+=1;
      G.tone(220+echo.step*38,0.11,0.011,"sine");
      if(echo.step>=echo.steps.length) recoverEcho(echo);
    }
  }

  function hubWaveTest(wave){
    if(!s.originHub?.active)return;
    s.originHub.echoes.forEach(echo=>{
      if(echo.done||echo.id==="path")return;
      const key="hub:"+echo.id;
      if(wave.hit?.has(key))return;
      if(Math.abs(Math.hypot(echo.x-wave.x,echo.y-wave.y)-wave.r)>44)return;
      wave.hit?.add(key);
      if(echo.id==="pulse"){
        if(wave.prime===2) recoverEcho(echo);
        else {G.showMessage("THIS NOTE ANSWERS 2",720);G.tone(86,0.1,0.012,"square");}
      }else if(echo.id==="tune"){
        if(wave.prime===3) recoverEcho(echo);
        else {G.showMessage("2 ≠ 3   •   Q / E",850);G.tone(86,0.1,0.012,"square");}
      }
    });
  }

  const baseTestWave=G.testWave;
  G.testWave=wave=>{hubWaveTest(wave);baseTestWave(wave);};

  const baseUpdate=G.update;
  G.update=dt=>{
    baseUpdate(dt);
    const hub=s.originHub;
    if(!hub?.active)return;
    hub.hintAge+=dt;
    const path=hub.echoes.find(e=>e.id==="path");
    if(path&&!path.done)updatePathEcho(path);
    p.x=G.clamp(p.x,120,1010);p.y=G.clamp(p.y,390,1510);
    if(hub.hintAge>9){
      hub.hintAge=0;
      const remaining=hub.echoes.filter(e=>!e.done);
      if(remaining.length){
        const nearest=remaining.slice().sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y))[0];
        const hint=nearest.id==="path"?"FOLLOW THE LIT STEPS":nearest.id==="pulse"?"THE RING COPIES YOUR PULSE":"ITS SHAPE SAYS 3";
        if(hint!==hub.lastHint){hub.lastHint=hint;G.showMessage(hint,900);}
      }
    }
  };

  const baseUpdateQuest=G.updateQuest;
  G.updateQuest=()=>{
    if(s.stage==="origin_hub"&&s.originHub){
      const n=s.originHub.recovered;
      G.el.questTitle.textContent="Bring the lost notes home";
      G.el.questHint.textContent="Three bright disturbances landed around Origin. Recover them in any order.";
      G.el.questProgress.textContent=n+" / 3 NOTES RETURNED";
      return;
    }
    baseUpdateQuest();
  };

  const baseUpdateCollectibles=G.updateCollectibles;
  G.updateCollectibles=()=>{if(s.stage==="origin_hub")return;baseUpdateCollectibles();};

  const baseUpdateSecrets=G.updateSecrets;
  G.updateSecrets=()=>{if(s.stage==="origin_hub")return;baseUpdateSecrets();};

  const baseUpdateArea=G.updateArea;
  G.updateArea=()=>{
    if(s.stage==="origin_hub"){s.area="ORIGIN";G.el.areaName.textContent="ORIGIN";return;}
    baseUpdateArea();
  };
})();