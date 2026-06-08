/* ====================================================================
   REPORT  ·  审核报告 / 风险详情  (renders into #view-report)
   ==================================================================== */
window.REPORT = (function(){
  let D=window.DATA;                 // 渲染时切换为 ACTIVE() (真实审核结果 or 演示数据)
  let mountEl, curFile=null, filter='all', docOpen=false;

  function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function cdata(){ return (window.STATE && STATE.contract) || {}; }   // 真实合同(含 fulltext/fixes)

  function verdict(score){
    if(score>=85) return {t:'整体稳健',n:'多数条款合规，仅需关注少量优化点。'};
    if(score>=70) return {t:'存在风险',n:'发现高风险条款，建议在签署前完成修订。'};
    if(score>=50) return {t:'风险偏高',n:'多处权责失衡，强烈建议逐条审阅并改写。'};
    return {t:'高度警示',n:'条款对您明显不利，谈判前请务必修订。'};
  }

  function gaugeSVG(score){
    const R=78, C=2*Math.PI*R, off=C*(1-score/100);
    return `
      <div class="gauge">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <defs><linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style="stop-color:var(--acc-1)"/><stop offset="1" style="stop-color:var(--acc-2)"/></linearGradient></defs>
          <circle class="g-track" cx="90" cy="90" r="${R}" fill="none" stroke-width="10"/>
          <circle class="g-fill" cx="90" cy="90" r="${R}" fill="none" stroke-width="10"
            stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${off}"/>
        </svg>
        <div class="g-center"><div style="text-align:center">
          <div class="g-num" data-count="${score}">0</div>
          <div class="g-unit">安全评分</div>
        </div></div>
      </div>`;
  }

  function render(){
    D=window.ACTIVE();
    const s=D.SUMMARY;
    const file=curFile||s.file;
    const v=verdict(s.score);
    const total=s.high+s.mid+s.low+s.pass;
    const bd=[
      {k:'high',l:'高风险',n:s.high,dot:'var(--risk-high)'},
      {k:'mid', l:'需关注',n:s.mid, dot:'var(--risk-mid)'},
      {k:'low', l:'建议优化',n:s.low, dot:'var(--risk-low)'},
      {k:'pass',l:'合规通过',n:s.pass,dot:'var(--acc-1)'},
    ];

    mountEl.innerHTML=`
      <div class="container app-view">
        <div class="app-back" data-go="home"><svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>返回首页</div>
        <div class="app-head">
          <div>
            <div class="kicker" style="margin-bottom:16px">Review Complete · 审核完成</div>
            <div class="rep-title">${esc(file.replace(/\.[^.]+$/,''))}</div>
            <div class="rep-file">
              <span>${esc(file)}</span>
              <span>· ${s.pages} 页</span>
              <span>· ${s.words} 字</span>
              <span>· ${s.type}合同</span>
            </div>
          </div>
          <div class="rep-actions">
            <button class="btn ghost sm" id="dlReport"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>下载报告</button>
            <button class="btn sm" data-go="workspace"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>进入 Agent 工作台</button>
          </div>
        </div>

        <div class="rep-top">
          <div class="gauge-card">
            ${gaugeSVG(s.score)}
            <div class="g-verdict">${v.t}</div>
            <div class="g-note">${v.n}</div>
          </div>
          <div class="breakdown">
            ${bd.map(r=>`
              <div class="bd-row">
                <div class="bd-l"><span class="dot" style="background:${r.dot}"></span>${r.l}</div>
                <div class="bd-bar"><i class="${r.k}" data-w="${total?Math.round(r.n/total*100):0}"></i></div>
                <div class="bd-n">${r.n}</div>
              </div>`).join('')}
          </div>
        </div>

        <div class="rep-meta">
          <div class="m-cell"><div class="m-lbl">合同类型</div><div class="m-val">${s.type}服务</div></div>
          <div class="m-cell"><div class="m-lbl">合同金额</div><div class="m-val">${s.value}</div></div>
          <div class="m-cell"><div class="m-lbl">缔约方</div><div class="m-val">${s.counterparty}</div></div>
          <div class="m-cell"><div class="m-lbl">高风险条款</div><div class="m-val" style="color:var(--risk-high)">${s.high} 处</div></div>
        </div>

        <div class="find-head">
          <h3>逐条风险清单</h3>
          <div class="filters">
            <button data-f="all" class="on">全部 ${D.CLAUSES.length}</button>
            <button data-f="high"><span class="dot" style="background:var(--risk-high)"></span>高风险</button>
            <button data-f="mid"><span class="dot" style="background:var(--risk-mid)"></span>需关注</button>
            <button data-f="pass"><span class="dot" style="background:var(--acc-1)"></span>通过</button>
          </div>
        </div>
        <div class="findings" id="findings"></div>

        ${cdata().fulltext ? `
        <div class="rep-doc">
          <div class="rep-doc-head" id="docToggle">
            <h3>合同原文 ${(cdata().fixes||[]).length?`<span class="doc-fixn">已修改 ${(cdata().fixes||[]).length} 处</span>`:''}</h3>
            <button class="btn ghost sm">${docOpen?'收起原文':'展开查看原文'}</button>
          </div>
          <div class="rep-doc-body" id="docBody" ${docOpen?'':'hidden'}></div>
        </div>` : ''}
      </div>`;

    renderFindings();
    if(cdata().fulltext){ renderDoc(); wireDoc(); }
    wire();
  }

  /* 合同原文 + 已应用修改的红线批注 */
  function renderDoc(){
    const body=mountEl.querySelector('#docBody'); if(!body) return;
    let html=esc(cdata().fulltext||'');
    (cdata().fixes||[]).forEach(fx=>{
      if(!fx.found || !fx.replacement) return;
      const rep=esc(fx.replacement);
      if(html.indexOf(rep)<0) return;
      const ann=`<del class="doc-del">${esc(fx.original)}</del><ins class="doc-ins" title="${esc(fx.note||'已修订')}">${rep}</ins>`;
      html=html.replace(rep, ann);
    });
    body.innerHTML=html;
  }
  function wireDoc(){
    const t=mountEl.querySelector('#docToggle'); if(!t) return;
    t.addEventListener('click',()=>{
      docOpen=!docOpen;
      const body=mountEl.querySelector('#docBody'); if(body) body.hidden=!docOpen;
      const btn=t.querySelector('button'); if(btn) btn.textContent=docOpen?'收起原文':'展开查看原文';
    });
  }

  function renderFindings(){
    const host=mountEl.querySelector('#findings');
    const list=D.CLAUSES.filter(c=> filter==='all' ? true : c.sev===filter);
    host.innerHTML=list.map(c=>{
      const sev=c.sev, label=D.sevLabel[sev];
      const dot={high:'var(--risk-high)',mid:'var(--risk-mid)',low:'var(--risk-low)',pass:'var(--acc-1)'}[sev];
      const detail = sev==='pass' ? `
          <div class="f-quote">${c.text}</div>
          <div class="f-block"><div class="bl">AI 判定</div><div class="bt">${c.ai}</div></div>`
        : `
          <div class="f-quote">${c.text}</div>
          <div class="f-block"><div class="bl">风险分析</div><div class="bt">${c.ai}</div></div>
          ${c.fix?`<div class="f-block fix"><div class="bl">修改建议</div><div class="bt">${c.fix}</div></div>`:''}
          ${c.basis?`<div class="f-block"><div class="bl">依据</div><div class="f-basis">${c.basis.map(b=>`<span class="bchip">${b}</span>`).join('')}</div></div>`:''}
          <div class="f-actions">
            ${cdata().fulltext?`<button class="btn sm f-fix" data-fix="${c.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>一键修复</button>`:''}
            <button class="btn ghost sm" data-go="workspace">在原文中查看</button>
          </div>
          <div class="f-proposal"></div>`;
      return `
        <div class="finding" data-sev="${sev}">
          <div class="f-row">
            <div class="f-id">§${c.id}</div>
            <div class="f-main"><div class="f-name">${c.title}</div><div class="f-cat">${c.cat} · 条款</div></div>
            <div class="f-sev ${sev}"><span class="dot" style="background:${dot}"></span>${label}</div>
            <svg class="f-chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
          </div>
          <div class="f-body"><div class="f-inner">${detail}</div></div>
        </div>`;
    }).join('');

    host.querySelectorAll('.finding').forEach(f=>{
      f.querySelector('.f-row').addEventListener('click',()=>f.classList.toggle('open'));
    });
    host.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();APP.go(b.dataset.go);}));
    host.querySelectorAll('.f-fix').forEach(b=>b.addEventListener('click',e=>{ e.stopPropagation(); proposeFix(b.dataset.fix, b); }));
    // auto-open first risk
    const firstRisk=host.querySelector('.finding[data-sev="high"]');
    if(firstRisk) firstRisk.classList.add('open');
  }

  /* 一键修复: 让 AI 出"原文→改为"提议, 显示给用户确认 */
  async function proposeFix(clauseId, btn){
    const id=cdata().id; if(!id) return;
    const finding=btn.closest('.finding'); const host=finding.querySelector('.f-proposal');
    const o=btn.innerHTML; btn.disabled=true; btn.textContent='AI 生成中…';
    try{
      const p=await API.fixClause(id, clauseId);
      btn.disabled=false; btn.innerHTML=o;
      host.innerHTML=`
        <div class="prop-card">
          <div class="prop-h">AI 建议修改${p.found?'':' <span class="prop-warn">(未能在原文精确定位，将作为补充)</span>'}</div>
          <div class="prop-diff">
            <div class="pd-row"><span class="pd-lbl old">原</span><del>${esc(p.original||'(空缺/未约定)')}</del></div>
            <div class="pd-row"><span class="pd-lbl new">改为</span><ins>${esc(p.replacement)}</ins></div>
          </div>
          ${p.note?`<div class="prop-note">${esc(p.note)}</div>`:''}
          <div class="prop-acts"><button class="btn sm prop-ok">确认修改</button><button class="btn ghost sm prop-cancel">取消</button></div>
        </div>`;
      host.querySelector('.prop-cancel').addEventListener('click',e=>{ e.stopPropagation(); host.innerHTML=''; });
      host.querySelector('.prop-ok').addEventListener('click',e=>{ e.stopPropagation(); applyProposal(clauseId, p, e.currentTarget); });
    }catch(err){
      btn.disabled=false; btn.innerHTML=o;
      host.innerHTML=`<div class="prop-card err">生成失败：${esc(err.message||'请重试')}</div>`;
    }
  }

  /* 确认 → 真正应用: 改原文、删条款、提分 */
  async function applyProposal(clauseId, p, okBtn){
    const id=cdata().id; if(!id) return;
    okBtn.disabled=true; okBtn.textContent='应用中…';
    try{
      const updated=await API.applyFix(id, { clauseId, original:p.original, replacement:p.replacement, note:p.note });
      window.STATE.contract=updated;
      docOpen=true;        // 应用后展开原文看批注
      render(); animateIn();
    }catch(err){ okBtn.disabled=false; okBtn.textContent='确认修改'; alert('应用失败：'+(err.message||'请重试')); }
  }

  function wire(){
    mountEl.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>APP.go(b.dataset.go)));
    mountEl.querySelectorAll('.filters button').forEach(b=>{
      b.addEventListener('click',()=>{
        mountEl.querySelectorAll('.filters button').forEach(x=>x.classList.remove('on'));
        b.classList.add('on'); filter=b.dataset.f; renderFindings();
      });
    });
    const dl=mountEl.querySelector('#dlReport');
    if(dl) dl.addEventListener('click',()=>{const o=dl.innerHTML;dl.innerHTML='报告生成中…';setTimeout(()=>dl.innerHTML=o,1400);});
  }

  function animateIn(){
    // gauge fill + count
    const fill=mountEl.querySelector('.g-fill');
    if(fill){ requestAnimationFrame(()=>{ setTimeout(()=>{ fill.style.strokeDashoffset=fill.dataset.off; },120); }); }
    const num=mountEl.querySelector('.g-num');
    if(num){
      const target=+num.dataset.count; const t0=performance.now(), dur=1300;
      const tick=(t)=>{const p=Math.min(1,(t-t0)/dur);const e=1-Math.pow(1-p,3);num.textContent=Math.round(target*e);
        if(p<1)requestAnimationFrame(tick);};
      setTimeout(()=>requestAnimationFrame(tick),200);
    }
    mountEl.querySelectorAll('.bd-bar i').forEach(b=>{ setTimeout(()=>b.style.width=b.dataset.w+'%',300); });
  }

  function open(opts){ curFile = opts && opts.file ? opts.file : curFile; }

  function init(){
    mountEl=document.getElementById('view-report');
    APP.onEnter('report',(opts)=>{
      if(opts && opts.file) curFile=opts.file;
      filter='all';
      render();
      animateIn();
      APP.progress(1400);
    });
  }

  return { init, open };
})();
