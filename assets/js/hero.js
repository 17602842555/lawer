/* ====================================================================
   HERO + HOME behavior  ·  reveals · hero parallax · upload entry
   ==================================================================== */
window.HERO = (function(){

  let introDone=false;
  /* cinematic opening: char-by-char headline + seam + flash (gated on motion) */
  function heroIntro(){
    if(introDone) return; introDone=true;
    const hero=document.querySelector('#view-home .hero');
    const head=hero && hero.querySelector('.h-head');
    if(!hero||!head) return;

    // wrap headline text nodes into per-char spans (keep .en and <br>)
    let idx=0;
    [...head.childNodes].forEach(n=>{
      if(n.nodeType===3){
        const frag=document.createDocumentFragment();
        [...n.textContent].forEach(ch=>{
          if(ch.trim()===''){ frag.appendChild(document.createTextNode(ch)); return; }
          const s=document.createElement('span'); s.className='hc'; s.textContent=ch;
          s.style.setProperty('--i', idx++); frag.appendChild(s);
        });
        head.replaceChild(frag,n);
      } else if(n.classList && n.classList.contains('en')){
        n.style.setProperty('--en-i', idx); idx+=5;
      }
    });

    const motionOff = document.documentElement.getAttribute('data-motion')==='off'
      || matchMedia('(prefers-reduced-motion:reduce)').matches;
    if(motionOff) return; // leave fully visible, no sequence

    // seam + flash
    const seam=document.createElement('div'); seam.className='seam';
    const flash=document.createElement('div'); flash.className='flash';
    hero.appendChild(seam); hero.appendChild(flash);

    hero.classList.add('intro');               // hide elements, armed
    setTimeout(()=>seam.classList.add('go'), 500);
    setTimeout(()=>flash.classList.add('go'), 1500);
    setTimeout(()=>hero.classList.add('play'), 1750);   // headline rises
    setTimeout(()=>{ seam.remove(); flash.remove(); }, 3200);
  }

  function reveals(){
    const els=[...document.querySelectorAll('.reveal')];
    document.querySelectorAll('.cards .card').forEach((c,i)=>c.style.transitionDelay=(i*.08)+'s');
    document.querySelectorAll('.cases .case').forEach((c,i)=>c.style.transitionDelay=(i*.1)+'s');
    document.querySelectorAll('.plans .plan').forEach((c,i)=>c.style.transitionDelay=(i*.1)+'s');
    const io=new IntersectionObserver((ents)=>{
      ents.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    },{threshold:.16, rootMargin:'0px 0px -8% 0px'});
    els.forEach(el=>io.observe(el));
  }

  /* hero zoom-through on scroll (cinematic exit) */
  function heroParallax(){
    const heroTag=document.getElementById('heroTag');
    const cue=document.querySelector('.scroll-cue');
    if(!heroTag) return;
    let ticking=false;
    const apply=()=>{
      ticking=false;
      if(APP.current!=='home'){ return; }
      const h=innerHeight, sy=window.scrollY||0;
      const hp=Math.min(1, sy/(h*0.85));
      heroTag.style.transform=`translateY(${hp*-44}px) scale(${1+hp*0.12})`;
      heroTag.style.opacity=String(Math.max(0,1-hp*1.15));
      heroTag.style.filter=hp>0.002?`blur(${hp*8}px)`:'none';
      if(cue) cue.style.opacity=String(Math.max(0,1-hp*3));
    };
    window.addEventListener('scroll',()=>{ if(!ticking){ ticking=true; requestAnimationFrame(apply);} },{passive:true});
  }

  function upload(){
    const dz=document.getElementById('dz');
    const pick=document.getElementById('pick');
    const fileInput=document.getElementById('file');
    const guard=()=>!(window.AUTH) || AUTH.require();   // 未登录 → 弹登录门, 返回 false
    const open=()=>{ if(!guard()) return; fileInput.click(); };
    dz.addEventListener('click',open);
    if(pick) pick.addEventListener('click',open);
    fileInput.onchange=(e)=>{const f=e.target.files[0];if(f){if(!guard())return;FLOW.start(f.name,{fileObj:f});fileInput.value='';}};
    ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag');}));
    ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag');}));
    dz.addEventListener('drop',e=>{if(!guard())return;const f=e.dataTransfer.files[0];FLOW.start(f?f.name:'未命名合同.pdf',{fileObj:f});});

    // sample chips → 后端内置范本
    document.querySelectorAll('.sample-chip').forEach(ch=>{
      ch.addEventListener('click',()=>{
        if(!guard()) return;
        const name=ch.dataset.file||'示例合同.pdf';
        const sampleKey=/股权|代持/.test(name)?'equity':'technical';
        FLOW.start(name,{sampleKey});
      });
    });
  }

  function cue(){
    const c=document.getElementById('cue');
    if(c) c.addEventListener('click',()=>{
      const t=document.querySelector('#view-home .features');
      if(t) window.scrollTo({top:t.offsetTop-60,behavior:'smooth'});
    });
  }

  /* nav / CTA buttons that scroll within home (routing home first if needed) */
  function ctas(){
    const scrollTo=(sel)=>{
      const doScroll=()=>{const t=document.querySelector(sel);if(t)window.scrollTo({top:Math.max(0,t.offsetTop-56),behavior:'smooth'});};
      if(APP.current!=='home'){ APP.go('home'); setTimeout(doScroll,160); }
      else doScroll();
    };
    document.querySelectorAll('[data-scroll]').forEach(b=>{
      b.addEventListener('click',e=>{ e.preventDefault(); scrollTo(b.dataset.scroll); });
    });
  }

  function init(){
    heroIntro(); reveals(); heroParallax(); upload(); cue(); ctas();
  }

  return { init };
})();
