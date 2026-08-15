(() => {
  "use strict";
  const G=window.PHASEV2,s=G.state,p=G.player,ctx=G.ctx;

  function collectibleGlow(item,pulse){
    ctx.globalCompositeOperation="lighter";
    ctx.shadowBlur=18+pulse*8;
    ctx.shadowColor="rgba(170,220,255,0.62)";
    ctx.strokeStyle="rgba(205,232,255,"+(0.26+pulse*0.34)+")";
    ctx.fillStyle="rgba(226,241,255,"+(0.2+pulse*0.38)+")";
    ctx.lineWidth=1.25;
  }

  function drawCoordinateSecret(item,pulse){
    const r=11+pulse*3;
    ctx.rotate(item.phase+G.gameTime*0.12);
    ctx.beginPath();ctx.arc(0,0,r,0,G.TAU);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-r*1.5,0);ctx.lineTo(r*1.5,0);ctx.moveTo(0,-r*1.5);ctx.lineTo(0,r*1.5);ctx.stroke();
    ctx.beginPath();ctx.arc(r*0.72,-r*0.54,2.7+pulse,0,G.TAU);ctx.fill();
  }

  function drawSevenSecret(item,pulse){
    const r=14+pulse*3.5;
    ctx.rotate(item.phase+G.gameTime*0.16);
    ctx.beginPath();
    for(let i=0;i<=7;i++){const a=-Math.PI/2+i*G.TAU/7,rr=r*(1+0.12*Math.sin(7*a+G.gameTime*1.2)),x=Math.cos(a)*rr,y=Math.sin(a)*rr;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.stroke();
    for(let i=0;i<7;i++){const a=i*G.TAU/7;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.stroke();}
  }

  function drawSumSecret(item,pulse){
    const r=13+pulse*3;
    ctx.rotate(Math.sin(G.gameTime*0.25+item.phase)*0.12);
    ctx.beginPath();ctx.moveTo(r,-r);ctx.lineTo(-r*0.78,-r);ctx.lineTo(r*0.35,0);ctx.lineTo(-r*0.78,r);ctx.lineTo(r,r);ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,r*1.42,Math.PI*0.12,Math.PI*0.88);ctx.stroke();
  }

  function drawTimeSecret(item,pulse){
    const r=14+pulse*3;
    ctx.rotate(item.phase*0.3);
    ctx.beginPath();ctx.arc(0,0,r,0,G.TAU);ctx.stroke();
    ctx.save();ctx.rotate(G.gameTime*0.55);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-r*0.78);ctx.stroke();ctx.restore();
    ctx.save();ctx.rotate(-G.gameTime*0.21);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(r*0.6,0);ctx.stroke();ctx.restore();
    ctx.beginPath();ctx.arc(0,0,2.5+pulse,0,G.TAU);ctx.fill();
  }

  function drawPhiSecret(item,pulse){
    const phi=(1+Math.sqrt(5))/2;
    ctx.rotate(item.phase*0.25-G.gameTime*0.06);
    ctx.beginPath();
    for(let i=0;i<72;i++){
      const a=i*0.17;
      const r=2.2*Math.pow(phi,a/G.TAU*1.55);
      const x=Math.cos(a)*r,y=Math.sin(a)*r;
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,13+pulse*3.2,0,G.TAU);ctx.stroke();
  }

  function drawUnknownSecret(item,pulse){
    const r=13+pulse*3.5;
    ctx.rotate(item.phase+G.gameTime*0.19);
    ctx.beginPath();
    for(let i=0;i<=11;i++){
      const a=i*G.TAU/11;
      const rr=r*(0.68+0.32*Math.sin(i*2.399963229728653+item.phase));
      const x=Math.cos(a)*rr,y=Math.sin(a)*rr;
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.closePath();ctx.stroke();
    ctx.rotate(-G.gameTime*0.38);ctx.beginPath();ctx.arc(0,0,r*1.38,0.15,Math.PI*1.38);ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,2.5+pulse,0,G.TAU);ctx.fill();
  }

  G.drawCollectibles=()=>{
    s.collectibles.forEach(item=>{
      if(item.collected)return;
      if(item.frequency!==null&&G.PRIMES[p.freqIndex]!==item.frequency)return;
      const pulse=0.5+0.5*Math.sin(G.gameTime*2+item.phase);
      ctx.save();ctx.translate(item.x,item.y);collectibleGlow(item,pulse);
      if(item.formula==="P ≠ origin")drawCoordinateSecret(item,pulse);
      else if(item.formula==="7")drawSevenSecret(item,pulse);
      else if(item.formula==="∑")drawSumSecret(item,pulse);
      else if(item.formula==="Δt")drawTimeSecret(item,pulse);
      else if(item.formula==="φ")drawPhiSecret(item,pulse);
      else drawUnknownSecret(item,pulse);
      ctx.restore();
    });
  };

  G.drawTrail=()=>{if(p.trail.length<2)return;ctx.save();ctx.globalCompositeOperation="lighter";for(let i=1;i<p.trail.length;i++){const a=i/p.trail.length;ctx.strokeStyle="rgba(95,220,255,"+a*0.13+")";ctx.lineWidth=0.7+a*1.8;ctx.beginPath();ctx.moveTo(p.trail[i-1].x,p.trail[i-1].y);ctx.lineTo(p.trail[i].x,p.trail[i].y);ctx.stroke();}ctx.restore();};

  G.drawWaves=()=>{ctx.save();ctx.globalCompositeOperation="lighter";s.waves.forEach(w=>{const hue=G.primeHue(w.prime);ctx.strokeStyle="hsla("+hue+",95%,72%,"+w.alpha*0.42+")";ctx.lineWidth=5;ctx.shadowBlur=15;ctx.shadowColor="hsla("+hue+",95%,70%,0.6)";ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,G.TAU);ctx.stroke();});ctx.restore();};

  G.drawBursts=()=>{s.bursts.forEach(b=>{const t=b.age/b.duration,hue=b.kind==="reject"?210:G.primeHue(b.prime);ctx.strokeStyle="hsla("+hue+",90%,76%,"+(1-t)*(b.kind==="friend"?0.2:0.48)+")";ctx.lineWidth=b.kind==="reject"?1.5:2;ctx.beginPath();ctx.arc(b.x,b.y,22+t*(b.kind==="friend"?95:58),0,G.TAU);ctx.stroke();});};

  G.drawSignal=()=>{const sig=s.signal;if(!sig.visible)return;const alpha=s.signalMet?0.76:0.42,hue=286,r=sig.broken?31:36;ctx.save();ctx.translate(sig.x,sig.y);ctx.rotate(sig.phase*0.35);ctx.globalCompositeOperation="lighter";ctx.shadowBlur=s.signalMet?23:14;ctx.shadowColor="hsla("+hue+",92%,68%,0.65)";ctx.strokeStyle="hsla("+hue+",92%,75%,"+alpha+")";ctx.lineWidth=1.85;ctx.beginPath();for(let i=0;i<5;i++){if(sig.broken&&i===4)continue;const a=-Math.PI/2+i*G.TAU/5,px=Math.cos(a)*r,py=Math.sin(a)*r;ctx.moveTo(0,0);ctx.lineTo(px,py);ctx.arc(px,py,2.8,0,G.TAU);}ctx.stroke();if(!sig.broken){ctx.strokeStyle="hsla("+hue+",100%,84%,0.42)";ctx.beginPath();for(let i=0;i<=5;i++){const a=-Math.PI/2+i*G.TAU/5,px=Math.cos(a)*r,py=Math.sin(a)*r;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.stroke();ctx.fillStyle="rgba(240,230,255,0.88)";ctx.font="700 12px ui-monospace, monospace";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("φ",0,0);}ctx.restore();};

  G.drawPlayer=()=>{const prime=G.PRIMES[p.freqIndex],hue=G.primeHue(prime);ctx.save();ctx.translate(p.x,p.y);ctx.globalCompositeOperation="lighter";ctx.shadowBlur=25;ctx.shadowColor="hsla("+hue+",100%,70%,0.9)";ctx.fillStyle="hsla("+hue+",100%,82%,0.96)";ctx.beginPath();ctx.arc(0,0,p.radius,0,G.TAU);ctx.fill();ctx.strokeStyle="hsla("+hue+",100%,75%,0.24)";ctx.lineWidth=1.15;ctx.beginPath();ctx.arc(0,0,21+Math.sin(G.gameTime*prime)*2.4,0,G.TAU);ctx.stroke();ctx.rotate(G.gameTime*0.22);ctx.beginPath();for(let i=0;i<=prime;i++){const a=i/prime*G.TAU,r=29,px=Math.cos(a)*r,py=Math.sin(a)*r;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.stroke();ctx.restore();};
})();