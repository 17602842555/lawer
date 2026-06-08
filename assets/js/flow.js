/* ====================================================================
   FLOW  ·  the "审视" scan overlay → routes into the report
   ==================================================================== */
window.FLOW = (function(){
  const overlay=document.getElementById('overlay');
  let timers=[];
  const at=(ms,fn)=>timers.push(setTimeout(fn,ms));
  const clear=()=>{timers.forEach(clearTimeout);timers=[];};

  const CLAUSES=[
    {t:'§2.1 保密条款',s:'ok'},{t:'§4.3 付款与违约金',s:'risk'},
    {t:'§5.2 知识产权',s:'ok'},{t:'§7.4 责任限制',s:'risk'},
    {t:'§9.1 争议解决',s:'risk'},{t:'§11.6 终止续约',s:'risk'},
  ];

  function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function docTitle(name){const b=String(name).replace(/\.[^.]+$/,'').trim();return esc(b.length>14?b.slice(0,14)+'…':(b||'合同'));}
  function stamp(){const d=new Date();const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}${p(d.getDate())}`;}

  function start(fileName, opts={}){
    fileName = fileName||'合同.pdf';
    // 扫描动画期间并行向后端发起 上传 → 审核 → 建会话
    const work = prepareContract(fileName, opts);
    clear();
    overlay.classList.add('on');
    document.documentElement.classList.add('locked');
    overlay.innerHTML='';

    const scene=document.createElement('div');scene.className='scan-scene';scene.dataset.screenLabel='审视 · 扫描合同';
    const hud=document.createElement('div');hud.className='scanhud';
    hud.innerHTML=`合同审核中 · <span class="n" id="scn">00</span> / 23 条款 · <span class="n">AI</span>`;
    scene.appendChild(hud);

    const card=document.createElement('div');card.className='contract';
    const rows=[.9,.7,.96,.55,.82,.66,.92,.6,.74,.5];
    card.innerHTML=`
      <div class="doc-head"><div class="doc-title">${docTitle(fileName)}</div><div class="doc-meta">REVIEW-${stamp()}</div></div>
      <div class="doc-rows">${rows.map(w=>`<div class="doc-row"><span class="bar" style="width:${Math.round(w*100)}%"></span></div>`).join('')}</div>`;
    scene.appendChild(card);
    const band=document.createElement('div');band.className='scanband';card.appendChild(band);
    const bm=document.createElement('div');bm.className='scanbeam';card.appendChild(bm);

    CLAUSES.forEach((cl,idx)=>{
      const m=document.createElement('div');m.className=`marker ${cl.s} ${idx%2?'right':''}`;
      m.style.top=(28+idx*11)+'%';
      if(idx%2)m.style.right='-46%';else m.style.left='-46%';
      m.innerHTML=`<span class="dot"></span><span>${cl.t} · ${cl.s==='ok'?'通过':'风险'}</span>`;
      card.appendChild(m);
    });

    const chip=document.createElement('div');chip.className='scanfile';
    chip.innerHTML=`<span class="fdot"></span>正在审视：${esc(fileName)}`;scene.appendChild(chip);
    overlay.appendChild(scene);
    requestAnimationFrame(()=>requestAnimationFrame(()=>scene.classList.add('in')));

    APP.progress(6800);

    at(80,()=>{scene.classList.add('run');hud.classList.add('show');chip.classList.add('show');});
    [...card.querySelectorAll('.doc-row')].forEach((r,ri)=>at(700+ri*360,()=>r.classList.add('lit')));
    const scn=()=>scene.querySelector('#scn');let counted=0;
    CLAUSES.forEach((cl,idx)=>at(900+idx*560,()=>{
      scene.querySelectorAll('.marker')[idx].classList.add('show');
      counted+=Math.round(23/CLAUSES.length);scn().textContent=String(Math.min(23,counted)).padStart(2,'0');
    }));
    at(5200,()=>{if(scn())scn().textContent='23';});
    at(6000,()=>scene.classList.add('reveal'));
    at(6800,()=>{
      // 审核已改为后台异步: 上传+建会话很快就绪; 动画结束即进工作台(审核中状态), 可立即对话
      Promise.race([ work?work.catch(()=>null):Promise.resolve(), wait(25000) ]).then(()=>{
        if(window.STATE && STATE.flowError){ showError(STATE.flowError); return; }
        finish(fileName);
      });
    });
  }

  function finish(fileName){
    clear();
    overlay.classList.remove('on');
    overlay.innerHTML='';
    document.documentElement.classList.remove('locked');
    // ready_for_chat → land in the 3-column Agent workspace (per product architecture)
    REPORT.open({ file:fileName });
    APP.go('workspace',{ file:fileName });
  }

  /* 解析/分析失败: 明确告知, 不展示假结果 */
  function showError(msg){
    clear();
    overlay.classList.add('on');
    document.documentElement.classList.add('locked');
    overlay.innerHTML=`
      <div class="scan-error">
        <div class="se-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg></div>
        <div class="se-t">无法分析这份合同</div>
        <div class="se-d">${esc(msg||'处理失败，请重试。')}</div>
        <button class="btn" id="seClose">知道了</button>
      </div>`;
    overlay.querySelector('#seClose').addEventListener('click',()=>{
      overlay.classList.remove('on'); overlay.innerHTML='';
      document.documentElement.classList.remove('locked');
      window.STATE.flowError=null;
      APP.go('home');
    });
  }

  /* 后端流程: 上传/示例 → 审核 → 建会话; 失败则记录错误供 showError 展示 */
  async function prepareContract(fileName, opts){
    window.STATE.contract=null; window.STATE.conversationId=null; window.STATE.flowError=null;
    window.STATE.ocrProgress=null; window.STATE.processing=false; window.STATE.scanned=false;
    try{
      await API.ready();
      if(!API.online){ window.STATE.flowError='后端服务未连接。请检查网络或后端地址。'; return null; }

      // 示例合同: 即时出结果
      if(opts.sampleKey){
        const r=await API.sampleContract(opts.sampleKey);
        window.STATE.contract={ id:r.id, filename:r.filename, ...r.review };
        const conv=await API.createConversation(r.id); window.STATE.conversationId=conv.conversationId;
        return window.STATE.contract;
      }
      // 从合同库点开(已审核)
      if(opts.contractId){
        const c=await API.getContract(opts.contractId);
        window.STATE.contract=c;
        const conv=await API.createConversation(c.id); window.STATE.conversationId=conv.conversationId;
        return c;
      }
      // 上传: 立即建会话 → 进工作台; 审核全程后台跑, 完成后自动填充
      if(opts.fileObj){
        const up=await API.uploadFile(opts.fileObj);
        try{ const conv=await API.createConversation(up.id); window.STATE.conversationId=conv.conversationId; }catch{}
        if(up.status==='done'){   // 演示模式直接拿结果
          const c=await API.getContract(up.id); window.STATE.contract=c; return c;
        }
        window.STATE.contract={ id:up.id, filename:up.filename||fileName, processing:true,
          summary:{ file:up.filename||fileName }, clauses:[], missing:[], kb:[] };
        window.STATE.processing=true; window.STATE.scanned=!!up.scanned;
        backgroundReview(up.id);   // 不 await, 后台轮询
        return window.STATE.contract;
      }
      return null;
    }catch(e){
      console.warn('[flow] 准备合同失败:', e.message);
      window.STATE.contract=null; window.STATE.conversationId=null; window.STATE.processing=false;
      window.STATE.flowError=e.message||'处理失败，请重试。';
      return null;
    }
  }
  const wait=(ms)=>new Promise(r=>setTimeout(r,ms));

  /* 后台轮询审核状态, 完成后更新合同并通知工作台刷新 */
  async function backgroundReview(id){
    const deadline=Date.now()+600000;
    while(Date.now()<deadline){
      let st; try{ st=await API.getStatus(id); }catch{ await wait(4000); continue; }
      window.STATE.ocrProgress = st.progress || null;
      if(st.status==='done'){
        try{
          const c=await API.getContract(id);
          window.STATE.contract=c; window.STATE.processing=false; window.STATE.ocrProgress=null;
          window.dispatchEvent(new CustomEvent('contract:updated',{ detail:{ contract:c } }));
        }catch(e){ console.warn('[flow] 取审核结果失败:', e.message); }
        return;
      }
      if(st.status==='error'){
        window.STATE.processing=false; window.STATE.ocrProgress=null;
        window.dispatchEvent(new CustomEvent('contract:error',{ detail:{ error:st.error||'审核失败，请重试。' } }));
        return;
      }
      await wait(3000);
    }
    window.STATE.processing=false;
    window.dispatchEvent(new CustomEvent('contract:error',{ detail:{ error:'处理超时，请重试。' } }));
  }

  /* 重新审核(失败后): 重新触发后台审核并轮询 */
  async function reReview(id){
    if(!id) return;
    window.STATE.processing=true; window.STATE.flowError=null; window.STATE.ocrProgress=null;
    try{ await API.review(id); }
    catch(e){
      window.STATE.processing=false;
      window.dispatchEvent(new CustomEvent('contract:error',{ detail:{ error:e.message||'重试失败' } }));
      return;
    }
    backgroundReview(id);
  }

  function init(){
    // restart / close handled by report's back button
  }

  return { init, start, reReview };
})();
