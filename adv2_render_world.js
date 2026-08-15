(() => {
  "use strict";
  const G=window.PHASEV2,s=G.state,p=G.player,ctx=G.ctx;

  G.draw = () => {
    ctx.setTransform(G.dpr,0,0,G.dpr,0,0);
    const bg=ctx.createRadialGradient(G.screenW*0.5,G.screenH*0.5,20,G.screenW*0.5,G.screenH*0.5,Math.max(G.screenW,G.screenH));
    bg.addColorStop(0,"#08121f");bg.addColorStop(0.55,"#040912");bg.addColorStop(1,"#02040a");ctx.fillStyle=bg;ctx.fillRect(0,0,G.screenW,G.screenH);
    ctx.save();ctx.translate(-G.camera.x,-G.camera.y);G.drawWorldBase();G.drawFrequencyLens();G.drawCollectibles();G.drawBasin();G.drawSpan();G.drawGarden();G.drawTrail();G.drawWaves();G.drawBursts();G.drawSignal();G.drawPlayer();ctx.restore();
  };

  G.zoneGlow=(x,y,radius,hue,alpha)=>{const g=ctx.createRadialGradient(x,y,20,x,y,radius);g.addColorStop(0,"hsla("+hue+",75%,55%,"+alpha+")");g.addColorStop(1,"hsla("+hue+",75%,30%,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,radius,0,G.TAU);ctx.fill();};

  G.drawWorldBase=()=>{
    const spacing=64;ctx.strokeStyle="rgba(105,160,205,0.045)";ctx.lineWidth=1;ctx.beginPath();
    for(let x=0;x<=G.WORLD.width;x+=spacing){ctx.moveTo(x,0);ctx.lineTo(x,G.WORLD.height);}for(let y=0;y<=G.WORLD.height;y+=spacing){ctx.moveTo(0,y);ctx.lineTo(G.WORLD.width,y);}ctx.stroke();
    G.zoneGlow(520,1000,720,190,0.045);G.zoneGlow(1450,1000,850,205,0.045);G.zoneGlow(2450,1000,850,248,0.045);G.zoneGlow(3500,1000,900,286,0.05);
    G.drawBoundary(1900,s.gateOpen);G.drawRift();G.drawExitGlyph();
  };

  G.drawBoundary=(x,open)=>{ctx.save();ctx.strokeStyle=open?"rgba(110,230,255,0.08)":"rgba(145,210,245,0.32)";ctx.lineWidth=open?1:2;ctx.setLineDash(open?[6,20]:[2,8]);ctx.beginPath();ctx.moveTo(x,300);ctx.lineTo(x,1700);ctx.stroke();if(!open){for(let y=360;y<1680;y+=90){const wobble=Math.sin(G.gameTime*2+y*0.02)*10;ctx.strokeStyle="rgba(100,205,245,0.13)";ctx.beginPath();ctx.moveTo(x-22-wobble,y);ctx.lineTo(x+22+wobble,y);ctx.stroke();}}ctx.restore();};

  G.drawRift=()=>{ctx.save();const left=2760,right=2980;ctx.fillStyle="rgba(0,0,0,0.38)";ctx.fillRect(left,180,right-left,1640);for(let y=220;y<1780;y+=52){const a=0.025+0.02*Math.sin(y*0.03+G.gameTime*1.7);ctx.strokeStyle="rgba(150,190,240,"+a+")";ctx.beginPath();ctx.moveTo(left+12,y);ctx.lineTo(right-12,y+Math.sin(y*0.02)*16);ctx.stroke();}if(s.bridgeOpen){const g=ctx.createLinearGradient(left,0,right,0);g.addColorStop(0,"rgba(110,220,255,0.05)");g.addColorStop(0.5,"rgba(205,190,255,0.18)");g.addColorStop(1,"rgba(110,220,255,0.05)");ctx.fillStyle=g;ctx.fillRect(left,850,right-left,300);ctx.strokeStyle="rgba(190,225,255,0.22)";ctx.setLineDash([8,13]);for(let y=890;y<=1110;y+=55){ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();}}ctx.restore();};

  G.drawExitGlyph=()=>{const x=4140,y=1000,active=s.phiRepaired;ctx.save();ctx.translate(x,y);ctx.rotate(G.gameTime*0.12);ctx.strokeStyle=active?"rgba(205,235,255,0.5)":"rgba(205,235,255,0.08)";ctx.lineWidth=active?2:1;for(let ring=0;ring<3;ring++){ctx.rotate((ring%2?-1:1)*G.gameTime*0.04);ctx.beginPath();for(let i=0;i<=5;i++){const a=i/5*G.TAU,r=36+ring*15,px=Math.cos(a)*r,py=Math.sin(a)*r;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.stroke();}ctx.restore();};

  G.drawFrequencyLens=()=>{const prime=G.PRIMES[p.freqIndex],hue=G.primeHue(prime),alpha=s.worldSense?0.075:0.035;ctx.save();ctx.strokeStyle="hsla("+hue+",85%,65%,"+alpha+")";ctx.lineWidth=1;const gap=112;for(let y=90;y<G.WORLD.height;y+=gap){for(let x=90;x<G.WORLD.width;x+=gap){const r=5+2.4*Math.sin(G.gameTime*0.5+x*0.01+y*0.013);ctx.beginPath();for(let i=0;i<=prime;i++){const a=i/prime*G.TAU,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.stroke();}}ctx.restore();};

  G.drawNode=(node,locked=false)=>{const hue=G.primeHue(node.prime),lensMatch=G.PRIMES[p.freqIndex]===node.prime,senseBoost=s.worldSense&&lensMatch?0.22:0,alpha=node.active?0.78:0.34+senseBoost,radius=node.radius*(1+0.04*Math.sin(node.phase*2));ctx.save();ctx.translate(node.x,node.y);ctx.rotate(node.phase*0.35);ctx.globalCompositeOperation="lighter";ctx.shadowBlur=node.active||lensMatch?18:8;ctx.shadowColor="hsla("+hue+",90%,65%,0.6)";ctx.strokeStyle="hsla("+hue+",90%,72%,"+alpha+")";ctx.lineWidth=node.active?2.2:1.25;ctx.beginPath();for(let i=0;i<=node.prime;i++){const a=i/node.prime*G.TAU,px=Math.cos(a)*radius,py=Math.sin(a)*radius;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.stroke();if(node.active){ctx.strokeStyle="hsla("+hue+",95%,80%,0.25)";ctx.beginPath();ctx.arc(0,0,radius*1.35,0,G.TAU);ctx.stroke();}if(node.reject>0.03){ctx.strokeStyle="rgba(225,235,242,"+node.reject*0.55+")";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,radius*1.55,0,G.TAU);ctx.stroke();}ctx.shadowBlur=0;ctx.rotate(-node.phase*0.35);ctx.fillStyle="rgba(239,247,255,"+(locked?0.82:0.7)+")";ctx.font="700 12px ui-monospace, monospace";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(node.prime),0,0);if(node.type==="lock"&&node.timer>0&&node.timer<900){ctx.font="700 9px ui-monospace, monospace";ctx.fillStyle="rgba(215,235,255,0.55)";ctx.fillText(node.timer.toFixed(1),0,radius+18);}ctx.restore();};

  G.drawBasin=()=>{ctx.save();s.basinNodes.forEach(n=>G.drawNode(n));if(s.basinNodes.every(n=>n.active)){ctx.strokeStyle="rgba(165,230,255,0.14)";ctx.lineWidth=1.4;ctx.beginPath();s.basinNodes.forEach((n,i)=>{if(i===0)ctx.moveTo(n.x,n.y);else ctx.lineTo(n.x,n.y);});ctx.closePath();ctx.stroke();}if(s.sevenBloom){const x=1540,y=380;ctx.strokeStyle="hsla(286,90%,74%,0.42)";ctx.beginPath();for(let i=0;i<=70;i++){const a=i/70*G.TAU,r=70+18*Math.sin(7*a+G.gameTime),px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.stroke();}ctx.restore();};

  G.drawSpan=()=>{s.spanLocks.forEach(n=>G.drawNode(n,true));ctx.save();ctx.strokeStyle="rgba(190,220,255,0.08)";ctx.setLineDash([4,15]);ctx.beginPath();ctx.moveTo(s.spanLocks[0].x,s.spanLocks[0].y);ctx.lineTo(s.spanLocks[1].x,s.spanLocks[1].y);ctx.stroke();ctx.restore();};

  G.drawGarden=()=>{const cx=3450,cy=1000;ctx.save();ctx.strokeStyle="rgba(204,190,255,0.08)";ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<=5;i++){const a=-Math.PI/2+i*G.TAU/5,px=cx+Math.cos(a)*210,py=cy+Math.sin(a)*210;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.stroke();s.gardenAnchors.forEach(n=>G.drawNode(n));ctx.restore();};
})();