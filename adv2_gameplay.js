(() => {
  "use strict";
  const G = window.PHASEV2, s = G.state, p = G.player;

  G.changeFrequency = dir => {
    if (!G.running || G.paused) return;
    p.freqIndex = (p.freqIndex + dir + G.PRIMES.length) % G.PRIMES.length;
    const prime = G.PRIMES[p.freqIndex]; G.tone(165 + prime * 18, 0.075, 0.018, "triangle"); G.showMessage("MODE " + prime, 500); G.updateHud();
  };

  G.emitWave = () => {
    if (!G.running || G.paused || p.cooldown > 0) return;
    G.ensureAudio(); const prime = G.PRIMES[p.freqIndex];
    s.waves.push({ x:p.x, y:p.y, r:0, speed:480, maxR:540, prime, alpha:1, hit:new Set() });
    p.cooldown = s.worldSense ? 0.32 : 0.38; G.tone(130 + prime * 22, 0.11, 0.024, "sine");
  };

  G.resonateNode = node => {
    node.resonate = 1; s.bursts.push({ x:node.x, y:node.y, prime:node.prime, age:0, duration:0.9, kind:"resonate" }); G.tone(235 + node.prime * 24, 0.13, 0.027, "triangle");
  };

  G.rejectNode = node => {
    node.reject = 1; s.bursts.push({ x:node.x, y:node.y, prime:node.prime, age:0, duration:0.72, kind:"reject" }); G.tone(76,0.09,0.015,"square"); G.showMessage("NO COUPLING • MODE " + node.prime,720);
  };

  G.countPulseOn = key => { const next = (s.pulseCount.get(key) || 0) + 1; s.pulseCount.set(key,next); return next; };

  G.activateBasinNode = (node,index) => {
    const pulses = G.countPulseOn("basin:" + index + ":" + node.prime);
    if (node.active) {
      G.resonateNode(node);
      if (node.prime === 2 && pulses >= 3) G.addSecret("AN OCTAVE HID IN PLAIN SIGHT","2 → 4 → 8","You kept pulsing an already solved structure. Repetition revealed a harmonic ladder instead of wasting the input.");
      return;
    }
    node.active = true; G.resonateNode(node); s.insight += 1;
    if (s.basinNodes.filter(n=>n.active).length === 1) {
      G.addKnown("NATURAL MODES","A structure accepts strong energy transfer when your driving mode matches the mode encoded by its symmetry.");
      G.showDiscovery("IT ANSWERED","f_drive = f_natural","The structure did not need force. It needed the right relationship. The small signal brightens when the resonator wakes.",4700); s.signal.trust += 1;
    }
    if (s.basinNodes.every(n=>n.active)) {
      s.gateOpen = true; s.stage = "span"; s.signal.trust += 1; s.signal.targetX = 2050; s.signal.targetY = 1000;
      G.addKnown("COHERENT NETWORK","Independent modes can coexist and collectively define a stable condition for a larger system."); G.chord(110,[1,5/4,3/2,2]);
      G.showDiscovery("THE BASIN BECOMES COHERENT","R = {2, 3, 5}","Three different modes now agree on enough structure to open the eastern boundary. The signal leaves first, then waits for you again.",5000);
    }
    G.updateHud(); G.updateQuest();
  };

  G.activateSpanLock = node => {
    if (s.spanFirstPrime === null) s.spanFirstPrime = node.prime;
    if (s.spanFirstPrime === 5) s.reversedSpanOrder = true;
    node.timer = 8.5; node.active = true; G.resonateNode(node);
    if (s.spanLocks.every(n=>n.timer>0)) {
      s.bridgeOpen = true; s.stage = "garden"; s.signal.trust += 1; s.spanLocks.forEach(n=>{n.timer=999;n.active=true;}); s.signal.targetX = 3450; s.signal.targetY = 1000;
      G.addKnown("SIMULTANEOUS STATE","Two decaying resonances can overlap long enough to create a stable path neither can create alone."); G.chord(110,[1,4/3,3/2,2]);
      G.showDiscovery("TIMING BECAME GEOMETRY","S(t) = A₃(t) + A₅(t)","The bridge exists only because two oscillations are being remembered at once.",5000);
      if (s.reversedSpanOrder) setTimeout(()=>G.addSecret("THE ORDER WAS NEVER SPECIFIED","5 → 3 = 3 → 5","You solved the span in the opposite order. The system cared about simultaneity, not the path you took to reach it."),2100);
    }
    G.updateQuest();
  };

  G.activateGardenAnchor = node => {
    if (node.active) { G.resonateNode(node); return; }
    if (Math.hypot(p.x-node.x,p.y-node.y)>130) { node.reject=0.65; G.showMessage("TOO FAR • TRANSFER FALLS OFF",720); return; }
    node.active=true; G.resonateNode(node); s.insight += 1;
    if (s.gardenAnchors.filter(n=>n.active).length===1) G.addKnown("ROTATIONAL SYMMETRY","A fivefold object repeats its structure after a rotation of 2π/5 radians.");
    if (s.gardenAnchors.every(n=>n.active)) G.repairPhi();
    G.updateHud(); G.updateQuest();
  };

  G.repairPhi = () => {
    s.phiRepaired=true; s.stage="exit"; s.signal.broken=false; s.signal.following=true; s.signal.name="PHI"; s.signal.trust+=2; s.insight+=2;
    G.addKnown("PHI","A restored pentagonal system contains the golden ratio in the relationship between its diagonals and sides. The unknown signal now has a stable identity: φ.");
    G.chord(110,[1,5/4,3/2,15/8,2]); G.showDiscovery("φ","φ = (1 + √5) / 2","The ratio repeats through its restored fivefold geometry. The signal is no longer stuttering. Phi turns toward you, then follows.",6500); G.updateHud(); G.updateQuest();
  };

  G.testWave = wave => {
    s.basinNodes.forEach((node,index)=>{
      const key="b:"+index; if(wave.hit.has(key))return; if(Math.abs(Math.hypot(node.x-wave.x,node.y-wave.y)-wave.r)>node.radius+12)return; wave.hit.add(key);
      if(s.stage!=="basin"&&!node.active)return; if(wave.prime!==node.prime)G.rejectNode(node);else G.activateBasinNode(node,index);
    });
    s.spanLocks.forEach((node,index)=>{
      const key="s:"+index; if(wave.hit.has(key))return; if(Math.abs(Math.hypot(node.x-wave.x,node.y-wave.y)-wave.r)>node.radius+12)return; wave.hit.add(key);
      if(s.stage!=="span")return; if(wave.prime!==node.prime)G.rejectNode(node);else G.activateSpanLock(node);
    });
    s.gardenAnchors.forEach((node,index)=>{
      const key="g:"+index; if(wave.hit.has(key))return; if(Math.abs(Math.hypot(node.x-wave.x,node.y-wave.y)-wave.r)>node.radius+12)return; wave.hit.add(key);
      if(s.stage!=="garden")return; if(wave.prime!==5)G.rejectNode(node);else G.activateGardenAnchor(node);
    });
  };

  G.update = dt => {
    if(!G.running||G.paused)return; G.gameTime+=dt; p.cooldown=Math.max(0,p.cooldown-dt);
    G.updateMovement(dt); G.updateSignal(dt); G.updateWaves(dt); G.updateNodes(dt); G.updateCollectibles(); G.updateSecrets(); G.updateArea(); G.updateCamera(dt);
  };

  G.updateMovement = dt => {
    let ix=0,iy=0; if(G.keys.has("KeyA")||G.keys.has("ArrowLeft"))ix--; if(G.keys.has("KeyD")||G.keys.has("ArrowRight"))ix++; if(G.keys.has("KeyW")||G.keys.has("ArrowUp"))iy--; if(G.keys.has("KeyS")||G.keys.has("ArrowDown"))iy++;
    if(ix||iy){const mag=Math.hypot(ix,iy);ix/=mag;iy/=mag;} const smoothing=1-Math.exp(-dt*9); p.vx+=(ix*p.speed-p.vx)*smoothing; p.vy+=(iy*p.speed-p.vy)*smoothing;
    const oldX=p.x,oldY=p.y; let nx=G.clamp(p.x+p.vx*dt,70,G.WORLD.width-70),ny=G.clamp(p.y+p.vy*dt,120,G.WORLD.height-120);
    if(!s.gateOpen&&oldX<1900&&nx>=1900&&ny>300&&ny<1700){nx=1878;p.vx=Math.min(0,p.vx);G.showMessage("THE EASTERN BOUNDARY HAS NO STABLE SOLUTION",750);}
    const inRift=nx>2760&&nx<2980,inBridgeLane=ny>820&&ny<1180; if(inRift&&!(s.bridgeOpen&&inBridgeLane)){nx=oldX<2760?2738:3002;p.vx=0;if(!s.bridgeOpen)G.showMessage("NO PATH EXISTS HERE YET",700);}
    p.x=nx;p.y=ny;const moved=Math.hypot(p.x-oldX,p.y-oldY); if(moved>0.35){p.stillTime=0;p.trail.push({x:p.x,y:p.y,t:G.gameTime});while(p.trail.length>110)p.trail.shift();}else p.stillTime+=dt;
    if(s.stage==="signal")G.updateSignalMeeting();
    if(s.stage==="follow"&&p.x>960){s.stage="basin";s.signalAtBasin=true;G.addKnown("RESONANCE","Matching a driving mode to a system's natural mode creates strong coupling.");G.updateQuest();}
    if(s.stage==="exit"&&Math.hypot(p.x-4140,p.y-1000)<86)G.finishDemo();
  };

  G.updateSignalMeeting = () => {
    const sig=s.signal,d=Math.hypot(p.x-sig.x,p.y-sig.y); if(d<155&&!s.signalMet){s.signalMet=true;s.stage="follow";sig.trust++;sig.targetX=1120;sig.targetY=760;G.chord(146.83,[1,5/4]);
      G.showDiscovery("IT NOTICED YOU","response ≠ random","The pattern changes when you approach. Four points hold steady. A fifth keeps failing. Then it moves east and waits.",4700);G.updateHud();G.updateQuest();}
  };

  G.updateSignal = dt => {
    const sig=s.signal;if(!sig.visible)return;sig.phase+=dt*(sig.broken?0.6:0.9);sig.pulseTimer-=dt;
    if(sig.pulseTimer<=0){sig.pulseTimer=sig.broken?2.25:2.85;s.bursts.push({x:sig.x,y:sig.y,prime:5,age:0,duration:1.4,kind:"friend"});if(G.audio){G.tone(220,0.08,0.008,"sine");G.tone(275,0.08,0.007,"sine",0.12);G.tone(330,0.05,0.006,"sine",0.24);if(!sig.broken)G.tone(412.5,0.12,0.005,"sine",0.33);}}
    if(sig.following){const tx=p.x-78+Math.cos(G.gameTime*1.25)*24,ty=p.y+60+Math.sin(G.gameTime*1.65)*22,f=1-Math.exp(-dt*3.3);sig.x+=(tx-sig.x)*f;sig.y+=(ty-sig.y)*f;return;}
    if(["follow","basin","span","garden"].includes(s.stage)){const d=Math.hypot(p.x-sig.x,p.y-sig.y);if(d<520||s.signalAtBasin){const f=1-Math.exp(-dt*1.35);sig.x+=(sig.targetX-sig.x)*f;sig.y+=(sig.targetY-sig.y)*f;}}
  };

  G.updateWaves = dt => {
    for(let i=s.waves.length-1;i>=0;i--){const w=s.waves[i];w.r+=w.speed*dt;w.alpha=Math.max(0,1-w.r/w.maxR);G.testWave(w);if(w.r>=w.maxR)s.waves.splice(i,1);}
    for(let i=s.bursts.length-1;i>=0;i--){s.bursts[i].age+=dt;if(s.bursts[i].age>=s.bursts[i].duration)s.bursts.splice(i,1);}
  };

  G.updateNodes = dt => {
    [...s.basinNodes,...s.spanLocks,...s.gardenAnchors].forEach(n=>{n.phase+=dt*(0.45+n.prime*0.026);n.reject*=Math.pow(0.05,dt);n.resonate*=Math.pow(0.025,dt);});
    if(s.stage==="span"){let changed=false;s.spanLocks.forEach(n=>{if(n.timer>0){n.timer=Math.max(0,n.timer-dt);if(n.timer===0){n.active=false;changed=true;}}});if(changed)G.updateQuest();}
  };

  G.updateCollectibles = () => {
    s.collectibles.forEach(item => {
      if (item.collected) return;
      if (item.frequency !== null && G.PRIMES[p.freqIndex] !== item.frequency) return;
      const playerTouch = Math.hypot(p.x-item.x,p.y-item.y) <= 34;
      const phiTouch = s.phiRepaired && s.signal.following && Math.hypot(s.signal.x-item.x,s.signal.y-item.y) <= 72;
      if (!playerTouch && !phiTouch) return;
      item.collected = true;
      s.insight += 1;
      if (phiTouch && !playerTouch) {
        s.bursts.push({x:item.x,y:item.y,prime:5,age:0,duration:1.3,kind:"friend"});
        G.showMessage("PHI REACHED WHAT YOU COULD NOT",1100);
        G.chord(146.83,[1,5/4,3/2]);
      }
      G.addSecret("FOUND • "+item.formula,item.formula,item.note,0);
      G.updateHud();
    });
  };

  G.updateSecrets = () => {
    const sig=s.signal;
    if(!s.signalMet){const dist=Math.hypot(p.x-sig.x,p.y-sig.y);if(dist>115&&dist<270){const angle=Math.atan2(p.y-sig.y,p.x-sig.x);if(s.introLastAngle!==null){let d=angle-s.introLastAngle;while(d>Math.PI)d-=G.TAU;while(d< -Math.PI)d+=G.TAU;s.introOrbitAngle+=d;if(Math.abs(s.introOrbitAngle)>G.TAU*0.82){G.addSecret("YOU ORBITED BEFORE YOU APPROACHED","θ ≈ 2π","You treated the signal like something to study before something to reach. It pulsed once in reply.");sig.pulseTimer=0;}}s.introLastAngle=angle;}}
    if(!s.sevenBloom&&G.PRIMES[p.freqIndex]===7&&p.x>1350&&p.x<1750&&p.y>250&&p.y<520){s.sevenBloom=true;G.addSecret("A SEVENTH MODE WAS LISTENING","r(θ) = 70 + 18 sin(7θ)","Nothing in the basin required mode 7. The field still had a response prepared for anyone who tried it.");}
    if(!s.bridgeStillSecret&&s.bridgeOpen&&p.x>2810&&p.x<2930&&p.y>900&&p.y<1100&&p.stillTime>3.5){s.bridgeStillSecret=true;G.addSecret("STILLNESS IS A MEASUREMENT","v → 0","You stopped on a structure created by timing. With motion removed, the standing pattern became easier to see.");}
  };

  G.updateArea = () => {
    let area="FIRST CLEARING";if(p.x>=950&&p.x<1900)area="COORDINATE BASIN";else if(p.x>=1900&&p.x<3000)area="RESONANT SPAN";else if(p.x>=3000)area="SYMMETRY GARDEN";
    if(area!==s.area){s.area=area;if(!s.visitedAreas.has(area)){s.visitedAreas.add(area);G.showMessage(area,1100);}G.updateHud();}
  };

  G.updateCamera = dt => {
    const tx=p.x-G.screenW/2,ty=p.y-G.screenH/2,maxX=Math.max(0,G.WORLD.width-G.screenW),maxY=Math.max(0,G.WORLD.height-G.screenH),f=1-Math.exp(-dt*5.3);
    G.camera.x+=(G.clamp(tx,0,maxX)-G.camera.x)*f;G.camera.y+=(G.clamp(ty,0,maxY)-G.camera.y)*f;
  };

  G.finishDemo = () => {
    if(s.complete)return;s.complete=true;s.stage="complete";s.insight+=2;G.addKnown("RELATIONSHIP","Understanding changed the behavior of another system. The result persisted beyond the puzzle that created it.");G.chord(110,[1,9/8,5/4,4/3,3/2,15/8,2]);
    G.el.completeSummary.textContent="You followed an unknown signal, learned enough of the field to help it, and left the garden with Phi beside you.";G.el.completeStats.textContent=s.insight+" insight • "+s.secrets.length+" observations • "+s.known.length+" laws recorded";G.updateQuest();setTimeout(()=>G.el.completePanel.classList.add("visible"),700);
  };

  G.toggleJournal = force => {if(!G.running)return;const open=force!==undefined?force:!G.el.journal.classList.contains("visible");G.el.journal.classList.toggle("visible",open);G.paused=open;};
})();