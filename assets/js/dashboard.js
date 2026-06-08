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

  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

  function render(list, convos){
    convos = convos || [];
    const totalHigh=list.reduce((a,b)=>a+(b.high||0),0);
    const avg=list.length?Math.round(list.reduce((a,b)=>a+(b.score||0),0)/list.length):0;
    const uname = (window.STATE&&STATE.user&&(STATE.user.name||STATE.user.email))||'';
    const kpis=[
      {n:list.length, l:'已审合同', acc:false},
      {n:totalHigh, l:'高风险条款', acc:false},
      {n:list.length?avg:'—', l:'平均安全评分', acc:true},
      {n:convos.length, l:'云端对话', acc:true},
    ];

    const convSection = convos.length ? `
      <div class="dash-sec-h">我的对话 <span class="ch-n">${convos.length}</span><span class="sec-sub">云端保存 · 点开继续</span></div>
      <div class="conv-list">
        ${convos.map((c,i)=>`
          <div class="conv-card" data-conv="${i}">
            <div class="cc-top"><span class="cc-file">${esc(c.title)}</span>${c.type?`<span class="cc-type">${esc(c.type)}</span>`:''}</div>
            <div class="cc-last">${esc(c.last)||'（暂无消息）'}</div>
            <div class="cc-meta"><span>${c.count} 条消息</span><span class="cc-dot">·</span><span>${esc((c.updatedAt||'').slice(0,16).replace('T',' '))}</span></div>
          </div>`).join('')}
      </div>` : '';

    const tableSection = list.length ? `
      <div class="dash-sec-h">合同库 <span class="ch-n">${list.length}</span></div>
      <div class="dash-table">
        <div class="dt-head"><div>合同文件</div><div>类型</div><div>风险</div><div>安全评分</div><div></div></div>
        ${list.map((h,i)=>`
          <div class="dt-row" data-idx="${i}">
            <div class="dt-file">
              <span class="fi"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></span>
              <div style="min-width:0"><div class="fn">${esc(h.file)}${h.status==='live'?' <span class="dt-badge">当前</span>':''}</div><div class="fd">${esc(h.date)}</div></div>
            </div>
            <div class="dt-type">${esc(h.type)}</div>
            <div class="dt-risk">
              <span class="rd"><span class="dot-high" style="width:7px;height:7px;border-radius:50%;display:inline-block"></span><b>${h.high}</b></span>
              <span class="rd"><span class="dot-mid" style="width:7px;height:7px;border-radius:50%;display:inline-block"></span><b>${h.mid}</b></span>
            </div>
            <div class="dt-score">${scoreRing(h.score)}<span class="sc-n">${h.score}</span></div>
            <div class="dt-go">
              <button class="dt-del" data-del="${i}" title="删除合同"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m1 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg></button>
              <span class="dt-view">查看<svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span>
            </div>
          </div>`).join('')}
      </div>` : `
      <div class="dash-empty">
        <div class="de-t">还没有审核记录</div>
        <div class="de-d">上传一份 PDF/Word 合同，或回首页试用示例合同，开始你的第一次审核。</div>
        <button class="btn" data-scroll-home-upload><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>审核新合同</button>
      </div>`;

    mountEl.innerHTML=`
      <div class="container dash">
        <div class="app-back" data-go="home"><svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>返回首页</div>
        <div class="dash-hero">
          <div>
            <div class="kicker" style="margin-bottom:16px">Dashboard · 合同管理</div>
            <h2>${uname?esc(uname)+' 的':'您的'}合同库</h2>
            <p>你审阅过的合同与对话都已云端保存，可随时回看、继续追问、跨设备同步。</p>
          </div>
          <button class="btn" data-scroll-home-upload><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>审核新合同</button>
        </div>
        <div class="dash-kpis">
          ${kpis.map(k=>`<div class="kpi"><div class="k-num ${k.acc?'acc':''}">${k.n}</div><div class="k-lbl">${k.l}</div></div>`).join('')}
        </div>
        ${convSection}
        ${tableSection}
      </div>`;

    mountEl.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>APP.go(b.dataset.go)));
    mountEl.querySelectorAll('.dt-row').forEach(r=>r.addEventListener('click',(e)=>{ if(e.target.closest('.dt-del')) return; openRow(list[+r.dataset.idx]); }));
    mountEl.querySelectorAll('.dt-del').forEach(b=>b.addEventListener('click',(e)=>{ e.stopPropagation(); removeRow(list[+b.dataset.del], b); }));
    mountEl.querySelectorAll('.conv-card').forEach(r=>r.addEventListener('click',()=>openConversation(convos[+r.dataset.conv])));
    mountEl.querySelectorAll('[data-scroll-home-upload]').forEach(b=>b.addEventListener('click',()=>{
      APP.go('home');
      setTimeout(()=>{const t=document.querySelector('#view-home .upload-section');if(t)window.scrollTo({top:t.offsetTop-40,behavior:'smooth'});},120);
    }));
  }

  /* 删除合同(连带对话/记忆) */
  async function removeRow(h, btn){
    if(!h || !h.id) return;
    if(!confirm(`确定删除「${h.file}」吗？\n该合同的审核结果、对话与记忆都会一并删除，且不可恢复。`)) return;
    if(btn){ btn.disabled=true; btn.classList.add('busy'); }
    try{
      await API.deleteContract(h.id);
      // 若当前打开的就是这份合同, 清掉状态
      if(window.STATE && STATE.contract && STATE.contract.id===h.id){ STATE.contract=null; STATE.conversationId=null; }
      load();   // 重新拉取合同库 + 对话
    }catch(e){
      if(btn){ btn.disabled=false; btn.classList.remove('busy'); }
      alert('删除失败：'+(e.message||'请重试'));
    }
  }

  /* 点开历史对话 → 载入合同 + 标记恢复, 进入工作台加载消息 */
  async function openConversation(c){
    if(!c) return;
    try{
      const contract=await API.getContract(c.contractId);
      window.STATE.contract=contract; window.STATE.conversationId=c.id; window.STATE.resume=true;
      APP.go('workspace');
    }catch(e){ console.warn('[dashboard] 恢复对话失败:',e.message); }
  }

  /* 点开合同 → 载入审核结果; 优先复用该合同已有对话(保留历史), 没有才新建 */
  async function openRow(h){
    if(!h || !h.id) return;
    try{
      const c=await API.getContract(h.id);
      window.STATE.contract=c; window.STATE.processing=false; window.STATE.conversationId=null; window.STATE.resume=false;
      let cid=null;
      try{
        const convs=await API.listConversations();
        const mine=(convs||[]).filter(x=>x.contractId===h.id);   // 已按最近排序, 仅含有消息的对话
        if(mine.length){ cid=mine[0].id; window.STATE.resume=true; }   // 复用 → 恢复历史
      }catch{}
      if(!cid){ try{ const conv=await API.createConversation(c.id); cid=conv.conversationId; }catch{} }
      window.STATE.conversationId=cid;
      APP.go('report',{file:c.filename});
    }catch(e){ console.warn('[dashboard] 加载合同失败:',e.message); }
  }

  /* 拉取当前用户的合同库 + 对话 */
  async function load(){
    let list=[], convos=[];
    try{ await API.ready(); }catch{}
    try{ list=await API.listContracts(); }catch(e){ console.warn('[dashboard] 合同列表:',e.message); }
    try{ convos=await API.listConversations(); }catch(e){ console.warn('[dashboard] 对话列表:',e.message); }
    render(list, convos);
  }

  function init(){
    mountEl=document.getElementById('view-dashboard');
    APP.onEnter('dashboard',()=>load());
  }

  return { init };
})();
