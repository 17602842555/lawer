/* ====================================================================
   DASHBOARD  ·  合同管理 (history + KPIs)
   ==================================================================== */
window.DASHBOARD = (function(){
  const D=window.DATA;
  let mountEl;

  function scoreRing(score){
    const R=14,C=2*Math.PI*R,off=C*(1-score/100);
    const col = score>=85?'var(--risk-low)':score>=65?'var(--acc-1)':'var(--risk-mid)';
    return `<svg class="sc-ring" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="${R}" fill="none" style="stroke:var(--faint)" stroke-width="3"/>
      <circle cx="17" cy="17" r="${R}" fill="none" style="stroke:${col}" stroke-width="3" stroke-linecap="round"
        stroke-dasharray="${C}" stroke-dashoffset="${off}" transform="rotate(-90 17 17)"/>
    </svg>`;
  }

  function render(list){
    const totalHigh=list.reduce((a,b)=>a+(b.high||0),0);
    const avg=list.length?Math.round(list.reduce((a,b)=>a+(b.score||0),0)/list.length):0;
    const kpis=[
      {n:list.length, l:'已审合同', acc:false},
      {n:totalHigh, l:'高风险条款', acc:false},
      {n:avg, l:'平均安全评分', acc:true},
      {n:'¥86万', l:'规避潜在损失', acc:true},
    ];
    mountEl.innerHTML=`
      <div class="container dash">
        <div class="app-back" data-go="home"><svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>返回首页</div>
        <div class="dash-hero">
          <div>
            <div class="kicker" style="margin-bottom:16px">Dashboard · 合同管理</div>
            <h2>您的合同库</h2>
            <p>所有经 AGENT 审阅的合同，风险一目了然，可随时回看与对比。</p>
          </div>
          <button class="btn" data-scroll-home-upload><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>审核新合同</button>
        </div>

        <div class="dash-kpis">
          ${kpis.map(k=>`<div class="kpi"><div class="k-num ${k.acc?'acc':''}">${k.n}</div><div class="k-lbl">${k.l}</div></div>`).join('')}
        </div>

        <div class="dash-table">
          <div class="dt-head">
            <div>合同文件</div><div>类型</div><div>风险</div><div>安全评分</div><div></div>
          </div>
          ${list.map((h,i)=>`
            <div class="dt-row" data-idx="${i}">
              <div class="dt-file">
                <span class="fi"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></span>
                <div style="min-width:0">
                  <div class="fn">${h.file}${h.status==='live'?' <span class="dt-badge">当前</span>':''}</div>
                  <div class="fd">${h.date}</div>
                </div>
              </div>
              <div class="dt-type">${h.type}</div>
              <div class="dt-risk">
                <span class="rd"><span class="dot-high" style="width:7px;height:7px;border-radius:50%;display:inline-block"></span><b>${h.high}</b></span>
                <span class="rd"><span class="dot-mid" style="width:7px;height:7px;border-radius:50%;display:inline-block"></span><b>${h.mid}</b></span>
              </div>
              <div class="dt-score">${scoreRing(h.score)}<span class="sc-n">${h.score}</span></div>
              <div class="dt-go">查看<svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></div>
            </div>`).join('')}
        </div>
      </div>`;

    mountEl.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>APP.go(b.dataset.go)));
    mountEl.querySelectorAll('.dt-row').forEach(r=>{
      r.addEventListener('click',()=>openRow(list[+r.dataset.idx]));
    });
    const newBtn=mountEl.querySelector('[data-scroll-home-upload]');
    if(newBtn) newBtn.addEventListener('click',()=>{
      APP.go('home');
      setTimeout(()=>{const t=document.querySelector('#view-home .upload-section');if(t)window.scrollTo({top:t.offsetTop-40,behavior:'smooth'});},120);
    });
  }

  /* 点开历史 → 载入真实审核结果 (失败/演示则回退 mock) */
  async function openRow(h){
    if(h && h.id && API.online){
      try{
        const c=await API.getContract(h.id);
        window.STATE.contract=c; window.STATE.conversationId=null;
        try{ const conv=await API.createConversation(c.id); window.STATE.conversationId=conv.conversationId; }catch{}
        APP.go('report',{file:c.filename});
        return;
      }catch(e){ console.warn('[dashboard] 加载合同失败:',e.message); }
    }
    window.STATE.contract=null; window.STATE.conversationId=null;
    APP.go('report',{file:(h&&h.file)||'示例合同.pdf'});
  }

  /* 拉取真实合同库; 离线/空则回退内置历史 */
  async function load(){
    let list=null;
    if(window.API){ await API.ready(); if(API.online){ try{ list=await API.listContracts(); }catch{} } }
    if(!list||!list.length) list=window.DATA.HISTORY;
    render(list);
  }

  function init(){
    mountEl=document.getElementById('view-dashboard');
    APP.onEnter('dashboard',()=>load());
  }

  return { init };
})();
