/* ====================================================================
   APP  ·  view router · top nav · boot
   Views: home · report · workspace · dashboard  (one visible at a time)
   ==================================================================== */
window.APP = (function(){
  const views = ['home','report','workspace','dashboard'];
  let current = 'home';
  const enterHooks = {};   // view -> fn(opts)
  const leaveHooks = {};

  function onEnter(view, fn){ enterHooks[view]=fn; }
  function onLeave(view, fn){ leaveHooks[view]=fn; }

  function setNav(view){
    document.querySelectorAll('.nav a[data-go]').forEach(a=>{
      a.classList.toggle('active', a.dataset.go===view);
    });
  }

  const authViews = ['report','workspace','dashboard'];   // 需登录才能进
  function go(view, opts={}){
    if(!views.includes(view)) return;
    if(authViews.includes(view) && !(window.STATE&&STATE.user)){ if(window.AUTH) AUTH.require(); return; }
    const prevView = current;
    const prevEl = document.getElementById('view-'+current);
    const nextEl = document.getElementById('view-'+view);
    if(view===current && !opts.force){
      // same view: just run enter hook (e.g. open a specific report)
      if(enterHooks[view]) enterHooks[view](opts);
      return;
    }
    if(leaveHooks[prevView]) leaveHooks[prevView]();

    // background: keep running on body-scrolled views; stop on workspace
    if(window.BG){ if(view==='workspace') BG.stop(); else BG.start(); }

    if(prevEl){ prevEl.classList.remove('active'); }
    nextEl.classList.add('active');
    current = view;
    setNav(view);
    window.scrollTo(0,0);
    // reset hero parallax inline styles when returning home
    if(view==='home'){ const ht=document.getElementById('heroTag'); if(ht){ ht.style.transform=''; ht.style.opacity=''; ht.style.filter=''; } }
    document.querySelector('.topbar').classList.toggle('solid', view!=='home');
    if(enterHooks[view]) enterHooks[view](opts);

    // mode class on stage for ambient tuning
    document.getElementById('stage').className = view==='home' ? 'mode-particles' : 'mode-app';
  }

  /* ---- top nav wiring ---- */
  function wireNav(){
    document.querySelectorAll('[data-go]').forEach(el=>{
      el.addEventListener('click',e=>{ e.preventDefault(); go(el.dataset.go, {}); });
    });
    document.querySelector('.brand').addEventListener('click',()=>go('home'));

    // solidify topbar on scroll (home)
    const bar=document.querySelector('.topbar');
    const onScroll=()=>{
      if(current!=='home'){ bar.classList.add('solid'); return; }
      bar.classList.toggle('solid', (window.scrollY||0) > 40);
    };
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
  }

  /* ---- progress hairline (shared) ---- */
  let progRaf=0;
  function progress(total){
    const prog=document.getElementById('prog');
    cancelAnimationFrame(progRaf);
    const t0=performance.now(); prog.style.opacity='.9';
    const tick=(t)=>{const p=Math.min(1,(t-t0)/total);prog.style.width=(p*100)+'%';
      if(p<1)progRaf=requestAnimationFrame(tick);else setTimeout(()=>prog.style.opacity='0',400);};
    progRaf=requestAnimationFrame(tick);
  }

  function boot(){
    BG.init(); BG.start();
    AUTH.init();
    wireNav();
    HERO.init();
    FLOW.init();
    REPORT.init();
    WORKSPACE.init();
    DASHBOARD.init();
    TWEAKS.init();
  }

  return { go, onEnter, onLeave, progress, boot, get current(){return current;} };
})();

document.addEventListener('DOMContentLoaded', ()=>APP.boot());
