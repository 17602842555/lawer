/* ====================================================================
   WORKSPACE  ·  三栏 Agent 工作台
   左 合同条款 │ 中 Agent 聊天(快捷问题/引用) │ 右 风险·缺失·来源·报告
   ==================================================================== */
window.WORKSPACE = (function(){
  let D=window.DATA;                 // 渲染时切换为 ACTIVE()
  let mountEl, built=false, curId=null, sending=false, lastContractId=null, lastConversationId=null;

  const ic = {
    send:'<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/>',
    high:'<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
    fix:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    miss:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6"/>',
    rep:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    arrow:'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'
  };
  const svg=(p,cls)=>`<svg viewBox="0 0 24 24" class="${cls||''}">${p}</svg>`;
  const dot={high:'var(--risk-high)',mid:'var(--risk-mid)',low:'var(--risk-low)',pass:'var(--acc-1)'};

  /* ---------- render shell ---------- */
  function render(){
    D=window.ACTIVE();
    const s=D.SUMMARY||{};
    const proc=!!(window.STATE && STATE.processing);
    const file=String(s.file||(window.STATE&&STATE.contract&&STATE.contract.filename)||'合同').replace(/\.[^.]+$/,'');
    const type=s.type||''; const tags=Array.isArray(s.tags)?s.tags:[]; const dims=Array.isArray(s.dimensions)?s.dimensions:[];
    const clN=D.CLAUSES.length;
    const statusHtml = proc
      ? `<span class="ws-status proc"><span class="sd"></span><span id="procMeta">审核中 · 正在分析…</span></span>`
      : `<span class="ws-status"><span class="sd"></span>ready · 可对话</span><span>· ${clN} 条款 · ${s.words||'—'} 字</span>`;
    mountEl.innerHTML=`
      <div class="ws">
        <div class="ws-bar">
          <div class="ws-doc">
            <span class="di">${svg(ic.miss)}</span>
            <div style="min-width:0">
              <div class="dn">${esc(file)}</div>
              <div class="dm">${statusHtml}</div>
            </div>
          </div>
          <div class="ws-acts">
            <button class="btn ghost sm" data-go="report">${svg(ic.rep,'')}<span>审核报告</span></button>
            <button class="btn ghost sm" data-go="dashboard">合同库</button>
          </div>
        </div>

        <div class="ws3">
          <!-- LEFT -->
          <div class="ws-col ws-left">
            <div class="ctype">
              <div class="ct-l">合同类型 · 行业</div>
              <div class="ct-v">${type?esc(type)+'合同':(proc?'识别中…':'通用合同')}</div>
              <div class="tags">${tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>
              <div class="tags">${dims.map(t=>`<span class="tag dim">${esc(t)}</span>`).join('')}</div>
            </div>
            <div class="col-head">合同条款 <span class="ch-n">${proc&&!clN?'…':clN}</span></div>
            <div class="col-scroll" id="clList" style="padding-top:0">
              ${clN ? D.CLAUSES.map(c=>`
                <div class="cl-item" data-id="${c.id}" data-sev="${c.sev}">
                  <span class="cf"></span>
                  <div class="cb"><div class="ci">§${c.id}</div><div class="ct">${esc(c.title)}</div></div>
                </div>`).join('')
              : `<div class="proc-hint"><span class="spin"></span>${proc?'正在识别与审核合同，完成后这里会列出每条条款…':'暂无条款'}</div>`}
            </div>
          </div>

          <!-- CENTER -->
          <div class="ws-col ws-center">
            <div class="chat-scroll" id="chat"></div>
            <div class="composer">
              <div class="quick" id="quick">
                ${D.QUICK.map(q=>`<button data-key="${q.key}">${quickIcon(q.key)}${q.q}</button>`).join('')}
              </div>
              <div class="cbox">
                <textarea id="cinput" rows="1" placeholder="向 AGENT 追问这份合同…例如：违约金能不能改？"></textarea>
                <button class="send" id="csend">${svg(ic.send)}</button>
              </div>
            </div>
          </div>

          <!-- RIGHT -->
          <div class="ws-col ws-right">
            <div class="col-head">AGENT 洞察</div>
            <div style="padding:0 16px"><div id="curClause"></div></div>
            <div class="r-tabs" id="rtabs">
              <button data-tab="risk" class="on">风险<span class="cnt">${proc?'…':(s.high||0)+(s.mid||0)}</span></button>
              <button data-tab="miss">缺失<span class="cnt">${D.MISSING.length}</span></button>
              <button data-tab="kb">来源<span class="cnt">${D.KB.length}</span></button>
            </div>
            <div class="r-pane" id="paneRisk"></div>
            <div class="r-pane" id="paneMiss" hidden></div>
            <div class="r-pane" id="paneKb" hidden></div>
            <div class="r-foot"><button class="btn" data-go="report">${svg(ic.rep)}生成审核报告</button></div>
          </div>
        </div>
      </div>`;

    wire();
    fillRight(proc);
    // 恢复历史对话 or 首次问候
    if(window.STATE && STATE.resume && STATE.conversationId){ STATE.resume=false; loadHistory(); }
    else greet(proc);
    const first=D.CLAUSES.find(c=>c.sev==='high');
    if(first) selectClause(first.id,{silent:true});
    if(proc) startProcWatch();
  }

  /* 审核中: 刷新顶部进度文案 (OCR 逐页 / 审核中) */
  let procTimer=null;
  function startProcWatch(){
    clearInterval(procTimer);
    procTimer=setInterval(()=>{
      if(!window.STATE || !STATE.processing){ clearInterval(procTimer); return; }
      const meta=mountEl.querySelector('#procMeta'); if(!meta) return;
      const p=STATE.ocrProgress;
      if(p&&p.phase==='ocr'&&p.total) meta.textContent=`审核中 · 识别扫描件 ${p.done}/${p.total} 页…`;
      else if(p&&p.phase==='review') meta.textContent='审核中 · 正在逐条分析…';
      else meta.textContent='审核中 · 正在分析…';
    },800);
  }

  /* 后台审核完成 → 局部更新条款/风险/状态(保留对话) + 系统提示 */
  function onContractUpdated(){
    clearInterval(procTimer);
    D=window.ACTIVE();
    const s=D.SUMMARY||{};
    const dm=mountEl.querySelector('.ws-doc .dm');
    if(dm) dm.innerHTML=`<span class="ws-status"><span class="sd"></span>ready · 可对话</span><span>· ${D.CLAUSES.length} 条款 · ${s.words||'—'} 字</span>`;
    const ctv=mountEl.querySelector('.ctype .ct-v'); if(ctv) ctv.textContent=(s.type||'通用')+'合同';
    const ctags=mountEl.querySelectorAll('.ctype .tags');
    if(ctags[0]) ctags[0].innerHTML=(s.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('');
    if(ctags[1]) ctags[1].innerHTML=(s.dimensions||[]).map(t=>`<span class="tag dim">${esc(t)}</span>`).join('');
    const chN=mountEl.querySelector('.ws-left .col-head .ch-n'); if(chN) chN.textContent=D.CLAUSES.length;
    const clList=mountEl.querySelector('#clList');
    if(clList) clList.innerHTML=D.CLAUSES.map(c=>`
      <div class="cl-item" data-id="${c.id}" data-sev="${c.sev}">
        <span class="cf"></span><div class="cb"><div class="ci">§${c.id}</div><div class="ct">${esc(c.title)}</div></div>
      </div>`).join('');
    const rc=mountEl.querySelector('#rtabs button[data-tab="risk"] .cnt'); if(rc) rc.textContent=(s.high||0)+(s.mid||0);
    const mc=mountEl.querySelector('#rtabs button[data-tab="miss"] .cnt'); if(mc) mc.textContent=D.MISSING.length;
    const kc=mountEl.querySelector('#rtabs button[data-tab="kb"] .cnt'); if(kc) kc.textContent=D.KB.length;
    fillRight(false);
    bindClauseList();
    const first=D.CLAUSES.find(c=>c.sev==='high'); if(first) selectClause(first.id,{silent:true});
    addMsg('agent', `<p>✓ 审核完成：<strong>${esc(s.type||'')}合同</strong>，安全评分 <strong>${s.score ?? '—'}/100</strong>，<strong style="color:var(--risk-high)">${s.high ?? 0} 处高风险</strong>、${s.mid ?? 0} 处需关注。左侧看条款、右侧看风险清单，继续问我即可。</p>`);
  }
  function onContractError(msg){
    clearInterval(procTimer);
    const meta=mountEl.querySelector('#procMeta'); if(meta) meta.textContent='审核失败';
    const node=addMsg('agent', `<p style="color:var(--risk-high)">审核未完成：${esc(msg||'请重试')}</p>`);
    const wrap=document.createElement('div'); wrap.className='msg-actions';
    wrap.innerHTML=`<button class="btn sm" data-rereview="1">重新审核</button>`;
    node.querySelector('.bubble').appendChild(wrap);
    wrap.querySelector('[data-rereview]').addEventListener('click',(e)=>{
      const id=window.STATE&&STATE.contract&&STATE.contract.id; if(!id) return;
      e.currentTarget.disabled=true;
      if(window.STATE) STATE.processing=true;
      const m=mountEl.querySelector('#procMeta'); if(m) m.textContent='重新审核中…';
      startProcWatch();
      addMsg('agent','<p>正在重新审核，请稍候…</p>');
      if(window.FLOW && FLOW.reReview) FLOW.reReview(id);
    });
  }

  /* 从云端加载该会话历史消息 (恢复对话) */
  async function loadHistory(){
    try{
      const msgs = await API.getMessages(STATE.conversationId);
      if(!msgs || !msgs.length){ greet(); return; }
      msgs.forEach(m=>{
        if(m.role==='user'){ addMsg('user', esc(m.content)); return; }
        const node=addMsg('agent', mdToHtml(m.content));
        const cites=(m.meta && m.meta.cites) || [];
        if(cites.length){
          const wrap=document.createElement('div'); wrap.className='cites';
          wrap.innerHTML=cites.map(serverCite).join('');
          node.querySelector('.bubble').appendChild(wrap); wireCites(wrap);
        }
        const action=m.meta && m.meta.action;
        if(action && action.type==='download-revised') appendDownloadBtn(node.querySelector('.bubble'), action.contractId);
      });
      chatEl().scrollTop=chatEl().scrollHeight;
    }catch(e){ console.warn('[ws] 加载历史失败:', e.message); greet(); }
  }

  function quickIcon(k){
    if(k==='high') return svg(ic.high);
    if(k==='fix'||k==='revise') return svg(ic.fix);
    if(k==='missing') return svg(ic.miss);
    if(k==='report') return svg(ic.rep);
    return '';
  }

  /* ---------- right column ---------- */
  function fillRight(proc){
    const risks=D.CLAUSES.filter(c=>c.sev!=='pass');
    mountEl.querySelector('#paneRisk').innerHTML = (!risks.length && proc)
      ? `<div class="proc-hint"><span class="spin"></span>审核进行中，风险清单稍后出现…</div>`
      : risks.map(c=>`
      <div class="rcard" data-sev="${c.sev}" data-id="${c.id}">
        <div class="rc-h"><span class="rc-id">§${c.id}</span><span class="rc-t">${c.title}</span>
          <span class="rc-sev ${c.sev}"><span class="dot" style="background:${dot[c.sev]}"></span>${D.sevLabel[c.sev]}</span></div>
        <div class="rc-d">${c.ai}</div>
        ${c.fix?`<div class="rc-fix"><b>改写建议</b>${c.fix}</div>`:''}
        <div class="rc-ask" data-ask="${c.id}">${svg(ic.fix)}就此条款追问 AGENT</div>
      </div>`).join('');

    mountEl.querySelector('#paneMiss').innerHTML = D.MISSING.map(m=>`
      <div class="misscard"><span class="mi">${svg(ic.miss)}</span>
        <div><div class="mt">${m.t}</div><div class="md">${m.d}</div></div></div>`).join('');

    mountEl.querySelector('#paneKb').innerHTML = D.KB.map(k=>`
      <div class="kbcard" data-kb="${k.id}"><div class="kb-h"><span class="kb-ic">${svg(ic.book)}</span>
        <span class="kb-src">${k.src}</span><span class="kb-tag">${k.tag}</span></div>
        <div class="kb-snip">${k.snippet}</div></div>`).join('');

    // wire risk asks + cards
    mountEl.querySelectorAll('.rc-ask').forEach(a=>a.addEventListener('click',()=>{ selectClause(a.dataset.ask); ask('解释 §'+a.dataset.ask+' 的风险'); }));
    mountEl.querySelectorAll('.rcard').forEach(c=>c.addEventListener('click',e=>{ if(!e.target.closest('.rc-ask')) selectClause(c.dataset.id,{silent:true}); }));
  }

  function setTab(tab){
    mountEl.querySelectorAll('#rtabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
    mountEl.querySelector('#paneRisk').hidden = tab!=='risk';
    mountEl.querySelector('#paneMiss').hidden = tab!=='miss';
    mountEl.querySelector('#paneKb').hidden = tab!=='kb';
  }

  function selectClause(id,opts={}){
    curId=id;
    const c=D.CLAUSES.find(x=>x.id===id); if(!c) return;
    mountEl.querySelectorAll('.cl-item').forEach(el=>el.classList.toggle('active',el.dataset.id===id));
    mountEl.querySelector('#curClause').innerHTML=`
      <div class="cur-clause">
        <div class="rc-h" style="margin-bottom:9px"><span class="rc-id">§${c.id}</span><span class="rc-t">${c.title}</span>
          <span class="rc-sev ${c.sev==='pass'?'low':c.sev}" style="margin-left:auto"><span class="dot" style="background:${dot[c.sev]}"></span>${D.sevLabel[c.sev]}</span></div>
        <div class="cc-q">${c.text}</div>
      </div>`;
    // ensure the clause is visible in left list
    const el=mountEl.querySelector(`.cl-item[data-id="${id}"]`);
    if(el && !opts.silent) el.scrollIntoView({block:'nearest'});
  }

  /* ---------- chat ---------- */
  function chatEl(){ return mountEl.querySelector('#chat'); }
  function addMsg(role, html){
    const m=document.createElement('div'); m.className='msg '+role;
    const av = role==='agent' ? `<span class="av"><i></i></span>` : `<span class="av">您</span>`;
    m.innerHTML = `${av}<div class="bubble">${html}</div>`;
    chatEl().appendChild(m);
    chatEl().scrollTop = chatEl().scrollHeight;
    return m;
  }
  function typing(){
    const m=document.createElement('div'); m.className='msg agent';
    m.innerHTML=`<span class="av"><i></i></span><div class="bubble"><div class="typing"><i></i><i></i><i></i></div></div>`;
    chatEl().appendChild(m); chatEl().scrollTop=chatEl().scrollHeight; return m;
  }

  function greet(proc){
    const s=D.SUMMARY||{};
    const file=String(s.file||(window.STATE&&STATE.contract&&STATE.contract.filename)||'合同').replace(/\.[^.]+$/,'');
    if(proc){
      addMsg('agent',`<p>已收到 <strong>《${esc(file)}》</strong>，我正在后台逐条识别与审核${window.STATE&&STATE.scanned?'（扫描件需先识别文字，约 1-3 分钟）':''}。</p>
        <p>审核完成后，左侧会列出条款、右侧出风险清单，我也会提示你。<strong>现在就可以先问我问题</strong>，比如「这份合同甲方是谁」「有哪些风险」。</p>`);
      return;
    }
    addMsg('agent',`<p>您好，我已通读 <strong>《${esc(file)}》</strong>，这是一份${esc(s.type||'')}合同。</p>
      <p>整体安全评分 <strong>${s.score ?? '—'} / 100</strong>，识别出 <strong style="color:var(--risk-high)">${s.high ?? 0} 处高风险</strong>、${s.mid ?? 0} 处需关注。</p>
      <p>你可以点下方快捷问题，或直接问我这份合同的任何条款。</p>`);
  }

  function wire(){
    mountEl.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>APP.go(b.dataset.go)));
    mountEl.querySelectorAll('#quick button').forEach(b=>b.addEventListener('click',()=>quickAsk(b.dataset.key)));
    mountEl.querySelectorAll('#rtabs button').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
    bindClauseList();
    const ta=mountEl.querySelector('#cinput'), send=mountEl.querySelector('#csend');
    const grow=()=>{ ta.style.height='auto'; ta.style.height=Math.min(120,ta.scrollHeight)+'px'; };
    ta.addEventListener('input',grow);
    ta.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); doSend(); } });
    send.addEventListener('click',doSend);
    function doSend(){ const v=ta.value.trim(); if(!v) return; ta.value=''; grow(); ask(v); }
  }

  function bindClauseList(){
    mountEl.querySelectorAll('.cl-item').forEach(el=>el.addEventListener('click',()=>{
      const c=D.CLAUSES.find(x=>x.id===el.dataset.id); if(!c) return;
      selectClause(el.dataset.id,{silent:true}); ask('解释一下 §'+el.dataset.id+'「'+c.title+'」');
    }));
  }

  /* citation chips → click to jump */
  function wireCites(node){
    node.querySelectorAll('.cite').forEach(c=>c.addEventListener('click',()=>{
      if(c.dataset.clause){ setTab('risk'); selectClause(c.dataset.clause); }
      else if(c.dataset.kb){ setTab('kb'); const k=mountEl.querySelector(`.kbcard[data-kb="${c.dataset.kb}"]`); if(k){ k.scrollIntoView({block:'center'}); k.animate([{boxShadow:'0 0 0 2px var(--acc-line)'},{boxShadow:'0 0 0 0 transparent'}],{duration:1200}); } }
    }));
  }

  function citeChip(label,attr,val){ return `<span class="cite" data-${attr}="${val}">${svg(ic.book,'')}${label}</span>`; }

  /* ---------- answer builders ---------- */
  function answer(key){
    const hi=D.CLAUSES.filter(c=>c.sev==='high'), mid=D.CLAUSES.filter(c=>c.sev==='mid');
    if(key==='revise'){
      return { html:`<p>修订合同需要接入大模型。接入后，直接在对话里说「<strong>帮我改合同</strong>」，AGENT 会先出修订方案、逐条问你需要的信息，再生成可下载的修订版 Word。</p>` };
    }
    if(key==='high'){
      const list=[...hi,...mid].map(c=>`<div class="bi"><span class="bd" style="background:${dot[c.sev]}"></span>
        <div class="bx"><b>§${c.id} ${c.title}</b><div class="bm">${c.ai.split('。')[0]}。</div></div></div>`).join('');
      return { html:`<p>这份合同里我建议你重点盯 <strong>${hi.length} 条高风险</strong> + ${mid.length} 条需关注：</p><div class="blist">${list}</div>`,
        cites:[citeChip('§4.3','clause','4.3'),citeChip('§7.4','clause','7.4'),citeChip('《民法典》第585条','kb','KB-585')] };
    }
    if(key==='fix'){
      const list=[...hi,...mid].filter(c=>c.fix).map(c=>`<div class="bi"><span class="bd" style="background:${dot[c.sev]}"></span>
        <div class="bx"><b>§${c.id} ${c.title}</b><div class="bm">${c.fix}</div></div></div>`).join('');
      return { html:`<p>以下是可直接拿去谈判的改写建议（已按你方利益优化）：</p><div class="blist">${list}</div>`,
        cites:[citeChip('§4.3','clause','4.3'),citeChip('§7.4','clause','7.4'),citeChip('§9.1','clause','9.1')] };
    }
    if(key==='missing'){
      const list=D.MISSING.map(m=>`<div class="bi"><span class="bd" style="background:var(--risk-mid)"></span>
        <div class="bx"><b>${m.t}</b><div class="bm">${m.d}</div></div></div>`).join('');
      setTab('miss');
      return { html:`<p>结合正文交叉引用，我发现有 <strong>${D.MISSING.length} 份关键材料缺失</strong>，建议向对方索取后再签：</p><div class="blist">${list}</div>`,
        cites:[citeChip('《个人信息保护法》第21条','kb','KB-PIPL')] };
    }
    if(key==='report'){
      return { html:`<p>审核报告已生成，包含安全评分、逐条风险清单、改写建议与法规依据，可导出 PDF 存档或发给对方。</p>`,
        action:{ label:'打开审核报告', go:'report' } };
    }
    return null;
  }

  /* free-text → contextual default */
  function freeAnswer(text){
    // try to find a clause mention
    const m=text.match(/§?\s*(\d+\.\d+)/);
    let c = m ? D.CLAUSES.find(x=>x.id===m[1]) : null;
    if(!c){ // keyword match
      if(/违约金|付款|赔/.test(text)) c=D.CLAUSES.find(x=>x.id==='4.3');
      else if(/责任|赔偿上限|限制/.test(text)) c=D.CLAUSES.find(x=>x.id==='7.4');
      else if(/续约|终止|到期/.test(text)) c=D.CLAUSES.find(x=>x.id==='11.6');
      else if(/争议|仲裁|管辖|诉讼/.test(text)) c=D.CLAUSES.find(x=>x.id==='9.1');
      else if(/保密|秘密/.test(text)) c=D.CLAUSES.find(x=>x.id==='2.1');
    }
    if(c){
      selectClause(c.id);
      const cites=[citeChip('§'+c.id,'clause',c.id)];
      if(c.id==='4.3') cites.push(citeChip('《民法典》第585条','kb','KB-585'));
      if(c.id==='7.4') cites.push(citeChip('《民法典》第497条','kb','KB-497'));
      const body = c.sev==='pass'
        ? `<p><strong>§${c.id} ${c.title}</strong> 我判定为合规。${c.ai}</p>`
        : `<p>关于 <strong>§${c.id} ${c.title}</strong>：</p><p>${c.ai}</p>${c.fix?`<p><strong>我的改写建议：</strong>${c.fix}</p>`:''}`;
      return { html:body, cites };
    }
    return { html:`<p>我可以基于这份合同回答你。比如想了解某条款风险，可以问「违约金能不能改」「责任限制公平吗」，或直接点左侧条款。也可以让我「列出高风险条款」「缺失哪些材料」。</p>` };
  }

  /* 真实模型可用? (后端在线 + 已接入模型 + 已建会话) */
  function useLive(){ return window.STATE && STATE.live && STATE.conversationId; }

  function ask(text){
    if(sending) return;
    addMsg('user', esc(text));
    if(useLive()) liveRespond(text);
    else respond(()=>freeAnswer(text));
  }
  function quickAsk(key){
    if(sending) return;
    const q=D.QUICK.find(x=>x.key===key);
    addMsg('user', esc(q.q));
    if(useLive()) liveRespond(q.q, key);
    else respond(()=>answer(key));
  }

  /* ---------- 流式应答 (真实模型, SSE 逐字渲染) ---------- */
  function liveRespond(text, key){
    sending=true;
    if(key==='missing') setTab('miss'); else if(key==='high'||key==='fix') setTab('risk');
    const t=typing();
    let bubble=null, started=false, acc='';
    const ensure=()=>{ if(!started){ started=true; t.remove(); const node=addMsg('agent',''); bubble=node.querySelector('.bubble'); } return bubble; };
    const scroll=()=>{ chatEl().scrollTop=chatEl().scrollHeight; };
    API.streamChat(STATE.conversationId, text, {
      onToken:(d)=>{ ensure(); acc+=d; bubble.innerHTML=mdToHtml(acc); scroll(); },
      onDone:(ev)=>{
        ensure(); acc=ev.text||acc; bubble.innerHTML=mdToHtml(acc);
        if(ev.cites&&ev.cites.length){
          const wrap=document.createElement('div'); wrap.className='cites';
          wrap.innerHTML=ev.cites.map(serverCite).join('');
          bubble.appendChild(wrap); wireCites(wrap);
          const fc=ev.cites.find(c=>c.kind==='clause');
          if(fc){ setTab('risk'); selectClause(fc.ref,{silent:true}); }
        }
        if(ev.action && ev.action.type==='download-revised') appendDownloadBtn(bubble, ev.action.contractId);
        sending=false; scroll();
      },
      onError:(e)=>{
        ensure();
        const a=freeAnswer(text);               // 模型失败 → 本地兜底
        bubble.innerHTML=(acc?mdToHtml(acc):'')+a.html;
        if(a.cites&&a.cites.length){ const w=document.createElement('div'); w.className='cites'; w.innerHTML=a.cites.join(''); bubble.appendChild(w); wireCites(w); }
        sending=false; scroll();
        console.warn('[chat] 流式失败, 本地兜底:', e.message);
      },
    });
  }

  const serverCite=(c)=>citeChip(c.label, c.kind==='clause'?'clause':'kb', c.ref);

  /* 修订完成 → 在气泡里加"下载修订版 Word"按钮 */
  function appendDownloadBtn(bubble, contractId){
    if(!bubble || !contractId) return;
    const wrap=document.createElement('div'); wrap.className='msg-actions';
    wrap.innerHTML=`<button class="btn sm" data-dl="${contractId}">${svg(ic.rep,'')}下载修订版 Word</button>`;
    bubble.appendChild(wrap);
    wrap.querySelector('[data-dl]').addEventListener('click',(e)=>{
      const b=e.currentTarget, o=b.innerHTML; b.disabled=true; b.textContent='生成中…';
      API.downloadRevised(contractId).then(()=>{ b.disabled=false; b.innerHTML=o; })
        .catch(err=>{ b.disabled=false; b.innerHTML=o; alert('下载失败：'+(err.message||'请重试')); });
    });
  }

  /* 极简 Markdown → HTML (加粗 / 段落 / 换行) */
  function mdToHtml(t){
    let s=esc(t).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
    return s.split(/\n{2,}/).map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
  }

  function respond(build){
    sending=true;
    const t=typing();
    const delay = document.documentElement.getAttribute('data-motion')==='off' ? 150 : 760;
    setTimeout(()=>{
      t.remove();
      const a=build();
      let html=a.html;
      if(a.cites&&a.cites.length) html+=`<div class="cites">${a.cites.join('')}</div>`;
      if(a.action) html+=`<div class="msg-actions"><button class="btn sm" data-act-go="${a.action.go}">${a.action.label}${svg(ic.arrow,'')}</button></div>`;
      const node=addMsg('agent',html);
      wireCites(node);
      node.querySelectorAll('[data-act-go]').forEach(b=>b.addEventListener('click',()=>APP.go(b.dataset.actGo)));
      sending=false;
    }, delay);
  }

  function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

  function init(){
    mountEl=document.getElementById('view-workspace');
    APP.onEnter('workspace',()=>{
      const conKey=(window.STATE&&STATE.contract&&STATE.contract.id)||'demo';
      const cidKey=(window.STATE&&STATE.conversationId)||'';
      if(!built || conKey!==lastContractId || cidKey!==lastConversationId || (window.STATE&&STATE.resume)){
        lastContractId=conKey; lastConversationId=cidKey; render(); built=true;
      }
    });
    // 后台审核完成/失败 → 仅当正看着这份合同的工作台时更新
    window.addEventListener('contract:updated',(e)=>{
      const id=e.detail&&e.detail.contract&&e.detail.contract.id;
      if(APP.current==='workspace' && id && id===lastContractId) onContractUpdated();
    });
    window.addEventListener('contract:error',(e)=>{
      if(APP.current==='workspace') onContractError(e.detail&&e.detail.error);
    });
  }
  return { init };
})();
