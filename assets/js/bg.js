/* ====================================================================
   BACKGROUND ENGINE  ·  performance-first galaxy
   Key optimizations vs. original:
   - glow is pre-rendered ONCE into sprite canvases; per-frame we only
     drawImage (no per-particle ctx.shadowBlur — the old hot path)
   - particle count scales with area but capped hard
   - rAF pauses on tab hide AND when the home view is not active
   - DPR capped at 1.75; honors [data-motion="off"] (static field)
   ==================================================================== */
window.BG = (function(){
  const canvas = document.getElementById('fx');
  const ctx    = canvas.getContext('2d', { alpha:true });
  const beam   = document.getElementById('beam');
  const ambient= document.getElementById('ambient');

  let DPR = Math.min(window.devicePixelRatio||1, 1.75);
  let W=0,H=0, raf=0, running=false, paused=false;
  let P=[], sprites={}, t0=0;
  // cursor interaction
  let mx=-9999, my=-9999, mActive=false;
  const accent = ()=>getComputedStyle(document.documentElement);

  /* ---- pre-render a soft round glow sprite for a given color ---- */
  function makeSprite(rgb, radius){
    const s = document.createElement('canvas');
    const r = Math.ceil(radius);
    s.width = s.height = r*2;
    const g = s.getContext('2d');
    const grd = g.createRadialGradient(r,r,0, r,r,r);
    grd.addColorStop(0,   `rgba(${rgb},1)`);
    grd.addColorStop(.25, `rgba(${rgb},.55)`);
    grd.addColorStop(.55, `rgba(${rgb},.16)`);
    grd.addColorStop(1,   `rgba(${rgb},0)`);
    g.fillStyle = grd;
    g.beginPath(); g.arc(r,r,r,0,Math.PI*2); g.fill();
    return s;
  }

  function buildSprites(){
    // white / blue / violet, each at small & bokeh radii
    sprites = {
      white: makeSprite('236,240,252', 26),
      blue:  makeSprite('120,150,255', 30),
      violet:makeSprite('168,140,255', 30),
    };
  }

  function resize(){
    DPR = Math.min(window.devicePixelRatio||1, 1.75);
    W = innerWidth; H = innerHeight;
    canvas.width = W*DPR; canvas.height = H*DPR;
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }

  function build(){
    const area = W*H;
    // capped & lower-density than original (was up to 900 w/ shadowBlur)
    const N = Math.min(420, Math.floor(area/3400));
    P = [];
    for(let k=0;k<N;k++){
      const big = Math.random()<0.14;
      const size = big ? (Math.random()*7+5) : (Math.random()*1.6+.7);
      const z = big ? (Math.random()*.16+.06) : (Math.random()*.7+.2);
      const roll = Math.random();
      const kind = roll<.52 ? 'white' : (roll<.78 ? 'blue' : 'violet');
      const ambA = big ? (Math.random()*.10+.05) : (Math.random()*.5+.25);
      P.push({
        hx:Math.random()*W, hy:Math.random()*H,
        size, z, kind, ambA,
        a: ambA, tw: Math.random()*Math.PI*2,
        big,
        ox:0, oy:0,                          // cursor-follow offset (eased)
        pull: big ? (Math.random()*.5+.4) : (Math.random()*.7+.5),
        // intro convergence start
        ix:(Math.random()-.5)*W*1.4 + W/2,
        iy:(Math.random()-.5)*H*1.4 + H/2,
      });
    }
  }

  function liveScroll(){ return window.scrollY||document.documentElement.scrollTop||0; }
  let lastSy=0, velo=0;

  function frame(now){
    if(!running){ return; }
    raf = requestAnimationFrame(frame);
    if(paused) return;

    const t = now - t0;
    const sy = liveScroll();
    const dv = sy-lastSy; lastSy = sy; velo += (dv-velo)*0.2;
    const av = Math.min(48, Math.abs(velo));

    // drive background layers from scroll (home only)
    const max = Math.max(1, document.documentElement.scrollHeight - H);
    const pr = Math.min(1, sy/max);
    if(beam){
      beam.style.transform = `translate(-50%,${pr*H*0.5}px)`;
      beam.style.opacity = String(Math.min(.7, sy/(H*0.5)));
    }
    if(ambient) ambient.style.transform = `translateY(${-sy*0.05}px)`;

    // intro: 0..1 over 2.6s — converge from scattered to home
    const intro = Math.min(1, t/2600);
    const e = intro<1 ? (intro*intro*(3-2*intro)) : 1;
    const span = H+40;

    // cursor attraction only on the home view (where the field is the hero)
    const interactive = mActive && (!window.APP || APP.current==='home');
    const R = 230, R2 = R*R;

    ctx.clearRect(0,0,W,H);
    ctx.globalCompositeOperation = 'lighter';

    for(const p of P){
      // position: lerp from scattered intro pos to home, then parallax scroll
      let baseX = p.hx, baseY = p.hy;
      if(intro<1){ baseX = p.ix+(p.hx-p.ix)*e; baseY = p.iy+(p.hy-p.iy)*e; }
      let dy = baseY - sy*p.z;
      dy = ((dy+20)%span+span)%span-20;

      // ---- cursor follow: ease an offset toward the pointer when near ----
      let tox=0, toy=0;
      if(interactive){
        const ddx=mx-baseX, ddy=my-dy, d2=ddx*ddx+ddy*ddy;
        if(d2 < R2){
          const d=Math.sqrt(d2)||1, f=(1-d/R);
          const force = f*f*46*p.pull;        // soft falloff, depth-weighted
          tox = ddx/d*force; toy = ddy/d*force;
        }
      }
      p.ox += (tox-p.ox)*0.10;
      p.oy += (toy-p.oy)*0.10;
      const px = baseX + p.ox, pdy = dy + p.oy;

      const tw = p.big ? 1 : (.72+Math.sin(now/520+p.tw)*.28);
      const alpha = Math.max(0, Math.min(1, p.a*tw*(1+Math.min(.4,av*0.01))*e));
      if(alpha<=0.01) continue;

      const spr = sprites[p.kind];
      const drawR = (p.big ? p.size*1.5 : p.size*1.7);
      const w = drawR*2, h = drawR*2;
      ctx.globalAlpha = alpha;
      ctx.drawImage(spr, px-drawR, pdy-drawR, w, h);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /* static render (motion off / reduced) */
  function renderStatic(){
    ctx.clearRect(0,0,W,H);
    ctx.globalCompositeOperation='lighter';
    for(const p of P){
      const spr=sprites[p.kind];
      const drawR=(p.big?p.size*1.5:p.size*1.7);
      ctx.globalAlpha=Math.min(1,p.ambA*1.4);
      ctx.drawImage(spr,p.hx-drawR,p.hy-drawR,drawR*2,drawR*2);
    }
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  }

  function motionOff(){ return document.documentElement.getAttribute('data-motion')==='off'
      || matchMedia('(prefers-reduced-motion:reduce)').matches; }

  function start(){
    if(running) return;
    running = true; t0 = performance.now();
    if(motionOff()){ running=false; renderStatic(); return; }
    raf = requestAnimationFrame(frame);
  }
  function stop(){
    running=false; cancelAnimationFrame(raf);
  }

  /* pause loop when tab hidden — saves battery & stops jank on return */
  document.addEventListener('visibilitychange',()=>{ paused = document.hidden; });

  let rsz;
  window.addEventListener('resize',()=>{
    clearTimeout(rsz);
    rsz=setTimeout(()=>{ resize(); build(); if(motionOff()) renderStatic(); },150);
  });

  function init(){
    resize(); buildSprites(); build();
    // cursor tracking (particles follow on home)
    window.addEventListener('pointermove', e=>{ mx=e.clientX; my=e.clientY; mActive=true; }, {passive:true});
    window.addEventListener('pointerdown', e=>{ mx=e.clientX; my=e.clientY; mActive=true; }, {passive:true});
    window.addEventListener('pointerleave', ()=>{ mActive=false; });
    window.addEventListener('blur', ()=>{ mActive=false; });
  }

  return {
    init, start, stop,
    // re-render static field after theme/motion change
    refresh(){ if(motionOff()){ stop(); renderStatic(); } else { stop(); start(); } }
  };
})();
