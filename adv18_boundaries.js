(() => {
  "use strict";
  const G = window.PHASEV2;
  if (!G) return;
  const s = G.state;
  const p = G.player;
  const ctx = G.ctx;

  const bottomEdge = x => 3070 + Math.sin(x * 0.0028 + 2.1) * 44 - Math.sin(x * 0.0094) * 17;

  function worldTransform() {
    ctx.setTransform(G.dpr,0,0,G.dpr,0,0);
    ctx.translate(-G.camera.x,-G.camera.y);
  }

  function proximityBoost(distance) {
    return G.clamp(1 - distance / 430, 0, 1);
  }

  function strokeFieldPath(drawPath, alpha, width = 1.6, dash = [3,9]) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = 14;
    ctx.shadowColor = `rgba(126,219,250,${alpha*.65})`;
    ctx.strokeStyle = `rgba(135,224,252,${alpha})`;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.lineDashOffset = -G.gameTime*18;
    ctx.beginPath();
    drawPath();
    ctx.stroke();
    ctx.restore();
  }

  function drawBottomEdge() {
    const y = bottomEdge(p.x);
    const boost = proximityBoost(Math.abs(p.y-y));
    const alpha = .30 + boost*.34;

    strokeFieldPath(() => {
      for (let x=Math.max(0,G.camera.x-120); x<=Math.min(G.WORLD.width,G.camera.x+G.screenW+120); x+=24) {
        const by=bottomEdge(x);
        if (x===Math.max(0,G.camera.x-120)) ctx.moveTo(x,by); else ctx.lineTo(x,by);
      }
    }, alpha, 2.0, [4,8]);

    // Short outward ticks make this read as a boundary rather than decorative
    // scenery. They brighten as P approaches the edge.
    ctx.save();
    ctx.strokeStyle = `rgba(168,231,250,${.13+boost*.26})`;
    ctx.lineWidth = 1;
    for (let x=Math.floor((G.camera.x-80)/96)*96; x<G.camera.x+G.screenW+100; x+=96) {
      if (x < 0 || x > G.WORLD.width) continue;
      const by=bottomEdge(x);
      ctx.beginPath();
      ctx.moveTo(x,by+5);
      ctx.lineTo(x+Math.sin(x*.03)*5,by+22+boost*7);
      ctx.stroke();
    }
    ctx.restore();

    const band = ctx.createLinearGradient(0,y-10,0,y+90);
    band.addColorStop(0,"rgba(80,180,220,0)");
    band.addColorStop(.35,`rgba(91,167,210,${.025+boost*.04})`);
    band.addColorStop(1,`rgba(38,73,110,${.065+boost*.07})`);
    ctx.fillStyle = band;
    ctx.fillRect(G.camera.x-40, Math.min(y,bottomEdge(G.camera.x+G.screenW))-8, G.screenW+80, 120);
  }

  function drawSideEdges() {
    const leftFn = G.V8?.leftEdge;
    const rightFn = G.V8?.rightEdge;
    const topFn = G.V8?.topEdge;
    if (leftFn) {
      const d=Math.abs(p.x-leftFn(p.y));
      strokeFieldPath(() => {
        let first=true;
        for(let y=Math.max(0,G.camera.y-100);y<=Math.min(G.WORLD.height,G.camera.y+G.screenH+100);y+=26){
          const x=leftFn(y); if(first){ctx.moveTo(x,y);first=false;}else ctx.lineTo(x,y);
        }
      },.18+proximityBoost(d)*.30,1.5,[3,10]);
    }
    if (rightFn) {
      const d=Math.abs(p.x-rightFn(p.y));
      strokeFieldPath(() => {
        let first=true;
        for(let y=Math.max(0,G.camera.y-100);y<=Math.min(G.WORLD.height,G.camera.y+G.screenH+100);y+=26){
          const x=rightFn(y); if(first){ctx.moveTo(x,y);first=false;}else ctx.lineTo(x,y);
        }
      },.18+proximityBoost(d)*.30,1.5,[3,10]);
    }
    if (topFn) {
      const d=Math.abs(p.y-topFn(p.x));
      strokeFieldPath(() => {
        let first=true;
        for(let x=Math.max(0,G.camera.x-100);x<=Math.min(G.WORLD.width,G.camera.x+G.screenW+100);x+=26){
          const y=topFn(x); if(first){ctx.moveTo(x,y);first=false;}else ctx.lineTo(x,y);
        }
      },.16+proximityBoost(d)*.28,1.4,[3,11]);
    }
  }

  function drawVerticalBarrier(x, topY, bottomY, active = true, hue = "139,211,245") {
    if (x < G.camera.x-80 || x > G.camera.x+G.screenW+80) return;
    if (bottomY < G.camera.y-80 || topY > G.camera.y+G.screenH+80) return;
    const near=proximityBoost(Math.abs(p.x-x));
    ctx.save();
    ctx.globalCompositeOperation="lighter";
    ctx.strokeStyle=`rgba(${hue},${active ? .20+near*.34 : .10+near*.14})`;
    ctx.shadowBlur=active ? 12 : 5;
    ctx.shadowColor=`rgba(${hue},.35)`;
    ctx.lineWidth=active ? 1.8 : 1.1;
    ctx.setLineDash(active ? [2,8] : [2,14]);
    ctx.lineDashOffset=G.gameTime*16;
    ctx.beginPath(); ctx.moveTo(x,topY); ctx.lineTo(x,bottomY); ctx.stroke();
    ctx.setLineDash([]);

    for(let y=Math.ceil(topY/86)*86; y<bottomY; y+=86){
      const wobble=Math.sin(y*.021+G.gameTime*1.7)*5;
      ctx.beginPath();
      ctx.moveTo(x-10-wobble,y);
      ctx.lineTo(x+10+wobble,y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSouthernBarriers() {
    // These collision rules already existed all the way through the Deep Field,
    // but older renderers stopped drawing them near the original map height.
    // Continue their visual language so the player never hits an invisible wall.
    const top=1710;
    if (!s.gateOpen) drawVerticalBarrier(1900,top,bottomEdge(1900)-18,true,"126,213,246");

    drawVerticalBarrier(2760,top,bottomEdge(2760)-18,true,"163,180,244");
    drawVerticalBarrier(2980,top,bottomEdge(2980)-18,true,"163,180,244");

    const gateOpen=Boolean(s.v8?.keyInstalled);
    drawVerticalBarrier(3970,top,bottomEdge(3970)-18,!gateOpen,gateOpen ? "134,204,224" : "203,173,255");
  }

  const baseDraw=G.draw;
  G.draw=()=>{
    baseDraw();
    ctx.save();
    worldTransform();
    drawBottomEdge();
    drawSideEdges();
    drawSouthernBarriers();
    ctx.restore();
  };
})();