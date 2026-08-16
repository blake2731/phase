(() => {
  "use strict";
  const G=window.PHASEV2;if(!G)return;const s=G.state,p=G.player,ctx=G.ctx;
  const ORIGIN={x:520,y:1000};
  const baseDraw=G.draw;
  G.draw=()=>{baseDraw();drawHub();};

  function polygon(x,y,r,n,rotation=0){ctx.beginPath();for(let i=0;i<=n;i++){const a=rotation+i*G.TAU/n,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();}
  function screenWorld(){ctx.setTransform(G.dpr,0,0,G.dpr,0,0);ctx.translate(-G.camera.x,-G.camera.y);}

  function drawHub(){
    const h=s.originHub;if(!h?.launched||(!h.active&&!h.completed))return;
    ctx.save();screenWorld();
    drawRecoveryNetwork(h);drawEchoes(h);drawMotes(h);drawSignalInterest(h);
    ctx.restore();
  }

  function drawRecoveryNetwork(h){
    const age=G.gameTime-h.launchedAt;
    h.echoes.forEach((e,i)=>{
      const done=e.done;
      const alpha=done?0.17:0.10;
      ctx.save();ctx.globalCompositeOperation="lighter";ctx.strokeStyle=`hsla(${e.color},90%,72%,${alpha})`;ctx.lineWidth=done?1.8:1.15;ctx.setLineDash(done?[9,11]:[3,14]);ctx.lineDashOffset=-G.gameTime*22*(i%2?1:-1);
      ctx.beginPath();ctx.moveTo(ORIGIN.x,ORIGIN.y);ctx.quadraticCurveTo((ORIGIN.x+e.x)/2+(i-1)*60,(ORIGIN.y+e.y)/2-55,e.x,e.y);ctx.stroke();ctx.restore();
      if(age<2.1){const t=G.clamp(age/1.55-i*0.09,0,1),x=ORIGIN.x+(e.x-ORIGIN.x)*t,y=ORIGIN.y+(e.y-ORIGIN.y)*t;ctx.save();ctx.globalCompositeOperation="lighter";ctx.shadowBlur=26;ctx.shadowColor=`hsla(${e.color},100%,72%,0.8)`;ctx.fillStyle=`hsla(${e.color},100%,82%,${1-t*0.25})`;ctx.beginPath();ctx.arc(x,y,5+Math.sin(t*Math.PI)*4,0,G.TAU);ctx.fill();ctx.restore();}
    });
  }

  function drawEchoes(h){
    h.echoes.forEach(e=>{
      if(e.done){drawReturned(e);return;}
      if(e.id==="path")drawPathEcho(e);
      if(e.id==="pulse")drawPulseEcho(e);
      if(e.id==="tune")drawTuneEcho(e);
    });
  }

  function landmarkBeam(e,hue){
    const breathe=0.5+0.5*Math.sin(G.gameTime*1.8+e.x*0.01);
    const g=ctx.createLinearGradient(0,e.y-190,0,e.y+80);g.addColorStop(0,`hsla(${hue},95%,70%,0)`);g.addColorStop(.6,`hsla(${hue},95%,70%,${0.045+breathe*0.035})`);g.addColorStop(1,`hsla(${hue},95%,70%,0)`);ctx.fillStyle=g;ctx.fillRect(e.x-18,e.y-190,36,270);
  }

  function drawPathEcho(e){
    landmarkBeam(e,190);const next=e.steps[e.step];ctx.save();ctx.globalCompositeOperation="lighter";
    ctx.strokeStyle="rgba(108,222,255,0.18)";ctx.lineWidth=2;ctx.setLineDash([4,10]);ctx.beginPath();e.steps.forEach((q,i)=>{if(i===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);});ctx.stroke();ctx.setLineDash([]);
    e.steps.forEach((q,i)=>{const passed=i<e.step,current=i===e.step,pulse=.5+.5*Math.sin(G.gameTime*3+i);ctx.shadowBlur=current?24:10;ctx.shadowColor="rgba(102,225,255,.8)";ctx.fillStyle=passed?"rgba(160,240,255,.28)":current?`rgba(205,250,255,${.7+pulse*.25})`:"rgba(115,205,235,.18)";ctx.beginPath();ctx.arc(q.x,q.y,current?7:4,0,G.TAU);ctx.fill();});
    ctx.strokeStyle="rgba(165,236,255,.52)";ctx.lineWidth=1.5;polygon(e.x,e.y,27,4,Math.PI/4);ctx.stroke();ctx.fillStyle="rgba(220,248,255,.9)";ctx.font="800 12px ui-monospace,monospace";ctx.textAlign="center";ctx.fillText("ΔP",e.x,e.y+4);ctx.restore();
    if(next&&Math.hypot(p.x-next.x,p.y-next.y)<190){ctx.save();ctx.fillStyle="rgba(196,239,255,.58)";ctx.font="700 9px ui-monospace,monospace";ctx.textAlign="center";ctx.fillText("MOVE THROUGH THE LIGHT",next.x,next.y-24);ctx.restore();}
  }

  function drawPulseEcho(e){
    landmarkBeam(e,205);ctx.save();ctx.globalCompositeOperation="lighter";const pulse=(G.gameTime*0.65)%1;
    for(let i=0;i<3;i++){const t=(pulse+i/3)%1;ctx.strokeStyle=`rgba(116,218,255,${(1-t)*.22})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(e.x,e.y,28+t*72,0,G.TAU);ctx.stroke();}
    ctx.shadowBlur=20;ctx.shadowColor="rgba(104,220,255,.7)";ctx.strokeStyle="rgba(175,238,255,.72)";ctx.lineWidth=1.7;ctx.beginPath();ctx.arc(e.x,e.y,31,0,G.TAU);ctx.stroke();ctx.fillStyle="rgba(230,250,255,.94)";ctx.font="900 15px ui-monospace,monospace";ctx.textAlign="center";ctx.fillText("2",e.x,e.y+5);ctx.restore();
    if(Math.hypot(p.x-e.x,p.y-e.y)<190){ctx.save();ctx.fillStyle="rgba(205,242,255,.72)";ctx.font="800 10px ui-monospace,monospace";ctx.textAlign="center";ctx.fillText("SPACE",e.x,e.y-55);ctx.restore();}
  }

  function drawTuneEcho(e){
    landmarkBeam(e,248);const match=G.PRIMES[p.freqIndex]===3;ctx.save();ctx.globalCompositeOperation="lighter";ctx.translate(e.x,e.y);ctx.rotate(G.gameTime*.22);ctx.shadowBlur=match?28:14;ctx.shadowColor="rgba(160,160,255,.72)";ctx.strokeStyle=match?"rgba(215,211,255,.9)":"rgba(157,177,245,.55)";ctx.lineWidth=match?2.2:1.4;polygon(0,0,38,3,-Math.PI/2);ctx.stroke();for(let i=0;i<3;i++){const a=i*G.TAU/3-G.gameTime*.5;ctx.beginPath();ctx.arc(Math.cos(a)*57,Math.sin(a)*57,3.3,0,G.TAU);ctx.fillStyle="rgba(199,207,255,.75)";ctx.fill();}ctx.rotate(-G.gameTime*.22);ctx.fillStyle="rgba(236,239,255,.94)";ctx.font="900 15px ui-monospace,monospace";ctx.textAlign="center";ctx.fillText("3",0,5);ctx.restore();
    if(Math.hypot(p.x-e.x,p.y-e.y)<205){ctx.save();ctx.fillStyle=match?"rgba(218,244,255,.74)":"rgba(218,205,255,.72)";ctx.font="800 10px ui-monospace,monospace";ctx.textAlign="center";ctx.fillText(match?"SPACE":`${G.PRIMES[p.freqIndex]}  ⇄  3   Q / E`,e.x,e.y-72);ctx.restore();}
  }

  function drawReturned(e){
    ctx.save();ctx.globalCompositeOperation="lighter";const a=.18+.08*Math.sin(G.gameTime*2);ctx.strokeStyle=`hsla(${e.color},95%,75%,${a})`;ctx.lineWidth=1.5;ctx.setLineDash([8,12]);ctx.lineDashOffset=-G.gameTime*30;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(ORIGIN.x,ORIGIN.y);ctx.stroke();ctx.fillStyle=`hsla(${e.color},95%,78%,.38)`;ctx.beginPath();ctx.arc(e.x,e.y,5,0,G.TAU);ctx.fill();ctx.restore();
  }

  function drawMotes(h){
    h.fieldMotes.forEach((m,i)=>{const x=m.x+Math.cos(G.gameTime*.7+m.phase)*18,y=m.y+Math.sin(G.gameTime*.9+m.phase)*14;ctx.save();ctx.globalCompositeOperation="lighter";ctx.translate(x,y);if(m.mode){const hue=G.primeHue(m.mode);ctx.strokeStyle=`hsla(${hue},90%,75%,${.35+m.react*.35})`;ctx.shadowBlur=10+m.react*15;ctx.shadowColor=`hsla(${hue},90%,70%,.5)`;ctx.rotate(G.gameTime*.2*(i%2?1:-1));polygon(0,0,7+m.react*4,m.mode,-Math.PI/2);ctx.stroke();}else{ctx.fillStyle="rgba(177,220,240,.28)";ctx.beginPath();ctx.arc(0,0,2.6,0,G.TAU);ctx.fill();}ctx.restore();});
  }

  function drawSignalInterest(h){
    if(!s.signal.visible||h.recovered===0)return;ctx.save();ctx.globalCompositeOperation="lighter";ctx.strokeStyle=`rgba(207,171,255,${.05+h.recovered*.025})`;ctx.setLineDash([3,13]);ctx.lineDashOffset=-G.gameTime*16;ctx.beginPath();ctx.moveTo(s.signal.x,s.signal.y);ctx.lineTo(ORIGIN.x,ORIGIN.y);ctx.stroke();ctx.restore();
  }
})();