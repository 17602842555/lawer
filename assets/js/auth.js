/* ====================================================================
   AUTH UI · 强制登录门 (邮箱+密码) + 顶栏登录态
   未登录 → 粒子背景上浮一张登录/注册卡, 登录后方可使用
   ==================================================================== */
window.AUTH = (function () {
  let gate, form, errEl, navUser, mode = 'login';

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  /* ---------- 构建登录门 ---------- */
  function buildGate() {
    gate = document.createElement('div');
    gate.id = 'authGate';
    gate.innerHTML = `
      <div class="auth-card">
        <div class="auth-brand"><span class="mark"><i></i><i></i></span><span class="name">顶级律师<b>AGENT</b></span></div>
        <div class="auth-h">登录以使用智能合同审核</div>
        <div class="auth-tabs">
          <button data-t="login" class="on">登录</button>
          <button data-t="register">注册</button>
        </div>
        <form class="auth-form" autocomplete="on">
          <label class="af-row only-register"><span>称呼</span><input name="name" autocomplete="name" placeholder="怎么称呼你（可选）"></label>
          <label class="af-row"><span>邮箱</span><input name="email" type="email" autocomplete="email" placeholder="you@example.com" required></label>
          <label class="af-row"><span>密码</span><input name="password" type="password" autocomplete="current-password" placeholder="至少 6 位" required></label>
          <div class="auth-err" id="authErr"></div>
          <button type="submit" class="btn auth-submit">登录</button>
        </form>
        <div class="auth-foot">登录后，你的合同与对话将云端保存、跨设备可见</div>
      </div>`;
    document.body.appendChild(gate);
    form = gate.querySelector('.auth-form');
    errEl = gate.querySelector('#authErr');
    gate.querySelectorAll('.auth-tabs button').forEach(b =>
      b.addEventListener('click', () => setMode(b.dataset.t)));
    form.addEventListener('submit', submit);
  }

  function setMode(m) {
    mode = m;
    gate.querySelectorAll('.auth-tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === m));
    gate.classList.toggle('is-register', m === 'register');
    gate.querySelector('.auth-submit').textContent = m === 'register' ? '注册并登录' : '登录';
    form.querySelector('[name=password]').setAttribute('autocomplete', m === 'register' ? 'new-password' : 'current-password');
    errEl.textContent = '';
  }

  async function submit(e) {
    e.preventDefault();
    const btn = form.querySelector('.auth-submit');
    const email = form.email.value.trim();
    const password = form.password.value;
    const name = form.name.value.trim();
    errEl.textContent = '';
    if (!email || !password) { errEl.textContent = '请填写邮箱和密码'; return; }
    btn.disabled = true; const old = btn.textContent; btn.textContent = '请稍候…';
    try {
      if (mode === 'register') await API.register(email, password, name);
      else await API.login(email, password);
      close();
      updateNav();
      window.dispatchEvent(new CustomEvent('auth:changed', { detail: { user: STATE.user } }));
    } catch (err) {
      errEl.textContent = err.message || '操作失败';
    } finally {
      btn.disabled = false; btn.textContent = old;
    }
  }

  function open() { if (gate) { gate.classList.add('open'); document.documentElement.classList.add('locked'); } }
  function close() { if (gate) { gate.classList.remove('open'); document.documentElement.classList.remove('locked'); } }

  /* ---------- 顶栏登录态 ---------- */
  function ensureNavSlot() {
    const nav = document.querySelector('.topbar .nav');
    if (!nav) return;
    navUser = document.createElement('div');
    navUser.className = 'nav-user';
    nav.appendChild(navUser);
  }
  function updateNav() {
    if (!navUser) return;
    const u = STATE.user;
    if (u) {
      navUser.innerHTML = `<span class="nu-name" title="${esc(u.email)}">${esc(u.name || u.email)}</span><button class="nu-out">退出</button>`;
      navUser.querySelector('.nu-out').addEventListener('click', doLogout);
    } else {
      navUser.innerHTML = `<a class="nu-login">登录</a>`;
      navUser.querySelector('.nu-login').addEventListener('click', open);
    }
  }
  async function doLogout() {
    await API.logout();
    updateNav();
    if (window.APP) APP.go('home');
    open();
    window.dispatchEvent(new CustomEvent('auth:changed', { detail: { user: null } }));
  }

  /* ---------- 启动 ---------- */
  async function init() {
    buildGate();
    ensureNavSlot();
    setMode('login');
    // 有令牌则乐观放行, 校验失败再弹门; 无令牌直接弹门
    if (!API.token) { open(); updateNav(); }
    const u = await API.me();
    updateNav();
    if (!u) open(); else close();
    // 任意请求 401 → 重新弹门
    window.addEventListener('auth:required', () => { updateNav(); open(); });
  }

  return { init, open, close };
})();
