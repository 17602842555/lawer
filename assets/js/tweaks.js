/* ====================================================================
   TWEAKS  ·  vanilla edit-mode panel (theme · density · accent · motion)
   Persists via host protocol: __edit_mode_set_keys rewrites the block below.
   ==================================================================== */
window.TWEAKS = (function(){
  const DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "dark",
    "density": "minimal",
    "accent": "indigo",
    "motion": "cinematic"
  }/*EDITMODE-END*/;

  const ACCENTS = {
    indigo:  { a:'#4a7dff', b:'#8b6cff', label:'靛蓝' },
    emerald: { a:'#1f9d7a', b:'#3aa6c8', label:'墨绿' },
    gold:    { a:'#c9913f', b:'#e0b25a', label:'鎏金' },
    crimson: { a:'#e0556f', b:'#b66cff', label:'绛红' },
  };

  let state = { ...DEFAULTS };

  function apply(){
    const root=document.documentElement;
    root.setAttribute('data-theme', state.theme);
    root.setAttribute('data-density', state.density);
    root.setAttribute('data-motion', state.motion);
    const ac=ACCENTS[state.accent]||ACCENTS.indigo;
    root.style.setProperty('--acc-1', ac.a);
    root.style.setProperty('--acc-2', ac.b);
    if(window.BG) BG.refresh();
  }

  function persist(){
    window.parent.postMessage({ type:'__edit_mode_set_keys', edits:{ ...state } }, '*');
  }
  function set(key,val){ state[key]=val; apply(); persist(); renderControls(); }

  /* ---- panel ---- */
  let panel;
  function build(){
    panel=document.createElement('div');panel.id='tweaks';
    panel.innerHTML=`
      <div class="tw-head">
        <div><div class="tt">Tweaks</div><div class="ts">实时调整 · Live</div></div>
        <button class="tw-x" id="twClose"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      </div>
      <div class="tw-body" id="twBody"></div>
      <div class="tw-foot">顶级律师 AGENT</div>`;
    document.body.appendChild(panel);
    panel.querySelector('#twClose').addEventListener('click',dismiss);
    renderControls();
  }

  function seg(label, key, opts){
    return `<div class="tw-row"><div class="tw-lbl">${label}</div>
      <div class="tw-seg" data-key="${key}">
        ${opts.map(o=>`<button data-v="${o.v}" class="${state[key]===o.v?'on':''}">${o.t}</button>`).join('')}
      </div></div>`;
  }

  function renderControls(){
    const body=panel.querySelector('#twBody');
    body.innerHTML=`
      <div class="tw-sec">外观</div>
      ${seg('主题','theme',[{v:'dark',t:'深色'},{v:'light',t:'浅色'}])}
      <div class="tw-row"><div class="tw-lbl">强调色</div>
        <div class="tw-swatches" data-key="accent">
          ${Object.entries(ACCENTS).map(([k,a])=>`
            <div class="tw-sw ${state.accent===k?'on':''}" data-v="${k}" title="${a.label}"
              style="background:linear-gradient(135deg,${a.a},${a.b})"></div>`).join('')}
        </div>
      </div>
      <div class="tw-sec">内容密度</div>
      ${seg('信息密度','density',[{v:'minimal',t:'精简'},{v:'detailed',t:'详尽'}])}
      <div class="tw-note">精简模式聚焦核心风险；详尽模式展示更多条款元数据。</div>
      <div class="tw-sec">动效</div>
      ${seg('动效强度','motion',[{v:'cinematic',t:'电影感'},{v:'calm',t:'克制'},{v:'off',t:'关闭'}])}
      <div class="tw-note">若页面卡顿，切到「克制」或「关闭」可显著提升流畅度。</div>`;

    body.querySelectorAll('.tw-seg').forEach(s=>{
      s.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>set(s.dataset.key,b.dataset.v)));
    });
    body.querySelectorAll('.tw-swatches .tw-sw').forEach(sw=>{
      sw.addEventListener('click',()=>set('accent',sw.dataset.v));
    });
  }

  /* ---- host protocol ---- */
  function dismiss(){
    panel.classList.remove('open');
    window.parent.postMessage({ type:'__edit_mode_dismissed' }, '*');
  }
  function init(){
    apply();
    build();
    window.addEventListener('message',(e)=>{
      const t=e&&e.data&&e.data.type;
      if(t==='__activate_edit_mode') panel.classList.add('open');
      else if(t==='__deactivate_edit_mode') panel.classList.remove('open');
    });
    window.parent.postMessage({ type:'__edit_mode_available' }, '*');
  }

  return { init };
})();
