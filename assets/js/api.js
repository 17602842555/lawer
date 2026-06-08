/* ====================================================================
   API · 前端 ↔ 后端客户端
   - 运行时状态 window.STATE: { contract, conversationId, live, online }
   - window.ACTIVE(): 当前数据源 (真实合同 → STATE.contract; 否则回退 DATA mock)
   - 后端不可用 / 未配置模型时, 前端自动降级为本地 mock, 页面始终可用
   ==================================================================== */
window.STATE = { contract: null, conversationId: null, live: false, online: false, user: null };

/* 当前生效的数据集: 真实审核结果 or 内置演示数据 (DATA) */
window.ACTIVE = function () {
  const c = window.STATE && window.STATE.contract;
  // 真实合同(含"审核中"占位, clauses 可能暂为空)都用它; 仅当无合同时回退演示数据
  if (c && c.id) {
    return {
      SUMMARY: c.summary || { file: c.filename },
      CLAUSES: Array.isArray(c.clauses) ? c.clauses : [],
      MISSING: Array.isArray(c.missing) ? c.missing : [],
      KB: Array.isArray(c.kb) ? c.kb : [],
      QUICK: window.DATA.QUICK,
      sevLabel: window.DATA.sevLabel,
      sevDot: window.DATA.sevDot,
    };
  }
  return window.DATA;
};

window.API = (function () {
  /* API 基地址解析(优先级): ?api=<url> (访问一次即记住) → localStorage → <meta name="api-base"> → 同源
     用于「前端 GitHub Pages + 后端 NAS/隧道」的分离部署; 临时隧道 URL 会变, 用 ?api= 切换即可 */
  function resolveBase() {
    // 1) ?api= 显式覆盖(并记住, 供调试)
    let q = null;
    try { q = new URL(location.href).searchParams.get('api'); } catch {}
    if (q !== null) {
      const v = q.replace(/\/+$/, '');
      try { v ? localStorage.setItem('apiBase', v) : localStorage.removeItem('apiBase'); } catch {}
      if (v) return v;
    }
    // 2) 烘焙进页面的后端地址(部署默认, 已知可用, 优先于旧的 localStorage)
    const m = document.querySelector('meta[name="api-base"]');
    if (m && m.content && m.content.trim()) return m.content.trim().replace(/\/+$/, '');
    // 3) 上次 ?api 记住的
    try { const b = localStorage.getItem('apiBase'); if (b) return b.replace(/\/+$/, ''); } catch {}
    return '';
  }
  const base = resolveBase();
  let healthDone = false;

  /* ---- 令牌 ---- */
  const TOKEN_KEY = 'authToken';
  const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
  const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} };
  function authHeaders(extra) {
    const h = Object.assign({}, extra || {});
    const t = getToken();
    if (t) h.Authorization = 'Bearer ' + t;
    return h;
  }
  function onUnauthorized() {
    setToken(''); STATE.user = null;
    window.dispatchEvent(new CustomEvent('auth:required'));
  }

  async function jsonFetch(url, opts = {}) {
    opts.headers = authHeaders(opts.headers);
    const res = await fetch(base + url, opts);
    if (res.status === 401) { onUnauthorized(); throw new Error('未登录'); }
    if (!res.ok) {
      let msg = res.status + '';
      try { msg = (await res.json()).error || msg; } catch {}
      throw new Error(msg);
    }
    return res.json();
  }

  /* ---- 鉴权 ---- */
  async function register(email, password, name) {
    const r = await jsonFetch('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    setToken(r.token); STATE.user = r.user; return r.user;
  }
  async function login(email, password) {
    const r = await jsonFetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setToken(r.token); STATE.user = r.user; return r.user;
  }
  async function logout() {
    try { await fetch(base + '/api/auth/logout', { method: 'POST', headers: authHeaders() }); } catch {}
    setToken(''); STATE.user = null;
  }
  async function me() {
    if (!getToken()) { STATE.user = null; return null; }
    try {
      const res = await fetch(base + '/api/auth/me', { headers: authHeaders() });
      if (!res.ok) { if (res.status === 401) setToken(''); STATE.user = null; return null; }
      const d = await res.json(); STATE.user = d.user; return d.user;
    } catch { STATE.user = null; return null; }
  }
  const listConversations = () => jsonFetch('/api/conversations');
  const getMessages = (cid) => jsonFetch('/api/conversations/' + cid + '/messages');

  /* ---- 健康检查: 后端是否在线 / 是否接入真实模型 ---- */
  async function health() {
    try {
      const h = await jsonFetch('/api/health');
      STATE.online = true; STATE.live = !!h.live; healthDone = true;
      return h;
    } catch {
      STATE.online = false; STATE.live = false; healthDone = true;
      return { ok: false, live: false };
    }
  }
  const ready = () => healthDone ? Promise.resolve() : health();

  /* ---- 合同: 上传 / 文本 / 示例 / 审核 / 读取 / 历史 ---- */
  function uploadFile(file) {
    const fd = new FormData();
    fd.append('file', file);
    return jsonFetch('/api/contracts', { method: 'POST', body: fd });
  }
  function uploadText(filename, text) {
    return jsonFetch('/api/contracts/text', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, text }),
    });
  }
  function sampleContract(key) {
    return jsonFetch('/api/contracts/sample', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
  }
  function review(id) {
    return jsonFetch('/api/contracts/' + id + '/review', { method: 'POST' });
  }
  const getContract = (id) => jsonFetch('/api/contracts/' + id);
  const getStatus = (id) => jsonFetch('/api/contracts/' + id + '/status');
  const deleteContract = (id) => jsonFetch('/api/contracts/' + id, { method: 'DELETE' });
  const listContracts = () => jsonFetch('/api/contracts');
  function createConversation(contractId, title) {
    return jsonFetch('/api/contracts/' + contractId + '/conversations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
  }

  /* ---- 流式对话 (SSE over fetch) ---- */
  async function streamChat(conversationId, text, { onToken, onDone, onError } = {}) {
    try {
      const res = await fetch(base + '/api/conversations/' + conversationId + '/messages', {
        method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ text }),
      });
      if (res.status === 401) { onUnauthorized(); throw new Error('未登录'); }
      if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
      const reader = res.body.getReader();
      const dec = new TextDecoder('utf-8');
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
          const line = chunk.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          let ev; try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }
          if (ev.type === 'token') onToken && onToken(ev.v);
          else if (ev.type === 'done') onDone && onDone(ev);
          else if (ev.type === 'error') onError && onError(new Error(ev.message));
        }
      }
    } catch (e) {
      onError && onError(e);
    }
  }

  return {
    health, ready,
    register, login, logout, me,
    uploadFile, uploadText, sampleContract, review,
    getContract, getStatus, deleteContract, listContracts, createConversation, streamChat,
    listConversations, getMessages,
    get online() { return STATE.online; },
    get live() { return STATE.live; },
    get user() { return STATE.user; },
    get token() { return getToken(); },
    get base() { return base; },
  };
})();

/* 启动即探测后端 (不阻塞渲染) */
window.API.health();
