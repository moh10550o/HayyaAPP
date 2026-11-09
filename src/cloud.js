/* ================= Cloud: link the screen to the dashboard and keep settings in sync =================
   Each screen registers once and gets a unique 10-digit screen number (e.g. 48213-90576) plus a private secret.
   The key is typed into the dashboard to link the screen to an account. Every 30 s the screen
   sends its status, pushes local edits, and receives dashboard edits and remote commands. */
const HAYYA_SERVER = '@@HAYYA_SERVER@@'.replace(/^@@.*@@$/, '');   // build.js or the dashboard download fills this in
const PREVIEW = /[?&]preview=1/.test(location.search);
const Cloud = (() => {
  const LS = 'hayya_tv_cloud';
  let st = {}; try { st = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { }
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (e) { } };
  let busy = false, timer = null, lastOk = 0, lastErr = '', dirtyTimer = null, nextIn = 30;

  function server() {
    let s = (st.server || HAYYA_SERVER || '').trim();
    if (!s && /^https?:$/.test(location.protocol) && /\/app(\/|\/index\.html)?$/.test(location.pathname)) s = location.origin;
    return s.replace(/\/+$/, '');
  }
  function info() {
    return {
      app: APP_VERSION, apk: Native && Native.getVersion ? Native.getVersion() : '', w: innerWidth, h: innerHeight,
      orient: stageDim.port ? 'port' : 'land', mosque: S.name.l1, city: S.loc.city, clock: Date.now(),
      tz: (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || '', ua: navigator.userAgent.slice(0, 160), did: deviceId(),
    };
  }
  async function call(path, body) {
    const h = { 'Content-Type': 'application/json' };
    if (st.key) { h['X-Screen-Key'] = st.key; h['X-Screen-Secret'] = st.secret; }
    const r = await fetch(server() + path, { method: 'POST', headers: h, body: JSON.stringify(body || {}), cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.message || ('HTTP ' + r.status)); e.code = j.error; throw e; }
    return j;
  }
  async function register() {
    const j = await call('/api/device/register', { info: info(), settings: S });
    st = { server: st.server, key: j.key, secret: j.secret, ver: j.ver || 0, linked: false };
    save();
  }
  /* images/sounds added on the screen itself are uploaded so the dashboard can show them */
  async function uploadLocalMedia() {
    const ids = new Set();
    (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') Object.keys(o).forEach(k => walk(o[k])); else if (typeof o === 'string' && /^(img|aud)_[a-z0-9]+$/.test(o)) ids.add(o); })(S);
    if (!ids.size) return;
    const map = {};
    for (const id of ids) {
      const b = await DB.get(id).catch(() => null); if (!b) continue;
      try {
        const r = await fetch(server() + '/api/media', { method: 'POST', headers: { 'Content-Type': b.type || (id.startsWith('aud_') ? 'audio/mpeg' : 'image/jpeg'), 'X-Screen-Key': st.key, 'X-Screen-Secret': st.secret }, body: b });
        if (!r.ok) continue;
        const j = await r.json(); await DB.put(j.id, b); map[id] = j.id;
      } catch (e) { }
    }
    if (!Object.keys(map).length) return;
    (function walk(o) { Object.keys(o).forEach(k => { const v = o[k]; if (typeof v === 'string' && map[v]) o[k] = map[v]; else if (v && typeof v === 'object') walk(v); }); })(S);
    Object.keys(map).forEach(id => DB.del(id).catch(() => { }));
    saveSettings(true, false);
  }
  async function sync(manual) {
    if (busy || PREVIEW || !server()) return;
    busy = true;
    try {
      if (!st.key) await register();
      if (st.codeBad && st.codeBad === activationCode()) { /* the same wrong code is not sent again */ }
      if (st.dirty) await uploadLocalMedia();
      const body = { ver: st.ver || 0, info: info() };
      // activation code: built into this APK / HTML copy, or typed on the screen — sent until the server confirms it
      const ac = activationCode();
      if (ac && !(st.codeOk && st.codeOk === ac) && st.codeBad !== ac) body.code = ac;
      const pushing = !!st.dirty; if (pushing) body.push = S;
      const j = await call('/api/device/sync', body);
      if (j.settings) {
        S = migrate(merge(DEFAULTS, j.settings)); saveSettings(false, false); applyAll();
        if (j.conflict) toast(S.lang === 'ar' ? 'تم تطبيق الإعدادات الأحدث من لوحة التحكم' : 'Newer settings from the dashboard were applied');
      }
      st.ver = j.ver;
      if (j.accepted || j.settings || !pushing) st.dirty = false;
      const was = st.linked; st.linked = !!j.linked; st.owner = j.owner || ''; st.name = j.name || ''; st.plan = j.plan || null;
      if (j.codeResult) {
        if (j.codeResult.ok) { if (st.codeOk !== body.code) toast(S.lang === 'ar' ? 'تم تفعيل الشاشة مدى الحياة ✓' : 'Screen activated for life ✓', 7000); st.codeOk = body.code; st.codeErr = ''; }
        else { st.codeErr = j.codeResult.message || 'error'; st.codeBad = body.code; }
      }
      save();
      if (st.linked && !was) { toast((S.lang === 'ar' ? 'تم ربط الشاشة بحساب: ' : 'Linked to: ') + st.owner, 6000); hidePair(true); }
      (j.cmds || []).forEach(runCmd);
      lastOk = Date.now(); lastErr = ''; nextIn = Math.max(5, Math.min(120, +j.next || 30));
      if (manual) toast(S.lang === 'ar' ? 'تمت المزامنة' : 'Synced');
    } catch (e) {
      lastErr = e.message || String(e);
      if (e.code === 'reset') {   // the screen was deleted from the dashboard: start over with a new key
        st = { server: st.server }; save();
        try { localStorage.removeItem('hayya_pair_done'); } catch (er) { }
        setTimeout(async () => { await sync(); if (!PREVIEW) showPair(false, 0); }, 1500);
      }
      if (manual) toast((S.lang === 'ar' ? 'تعذّر الاتصال: ' : 'Connection failed: ') + lastErr, 5000);
    } finally {
      busy = false;
      if (typeof settingsOpen !== 'undefined' && settingsOpen && curCat === 'cloud') rerender();
    }
  }
  function runCmd(c) {
    const cmd = (c && c.cmd) || '';
    if (cmd === 'reload') setTimeout(() => location.reload(), 400);
    else if (cmd === 'restart') setTimeout(() => (Native && Native.restart ? Native.restart() : location.reload()), 400);
    else if (cmd === 'identify') showPair(true, 25000);
    else if (cmd === 'azkarNow') { if (startAzkarNow('dashboard')) { ovKey = ''; toast(S.lang === 'ar' ? 'بدأت أذكار بعد الصلاة' : 'After-prayer adhkar started'); } }
    else if (cmd === 'update') { if (Native && Native.checkUpdate) Native.checkUpdate(); else location.reload(); }
    else if (cmd.indexOf('preview:') === 0) { forced = { k: cmd.slice(8), until: Date.now() + 15000 }; lastInput = 0; }
    else if (cmd.indexOf('openApp:') === 0 && Native && Native.openApp) Native.openApp(cmd.slice(8));
  }
  return {
    st: () => st, server, sync, lastOk: () => lastOk, lastErr: () => lastErr,
    start() {
      if (PREVIEW) return;
      // the server says how soon to come back: every few seconds while the dashboard is open on this screen, else every minute
      const loop = async () => { await sync(); clearTimeout(timer); timer = setTimeout(loop, (lastErr ? 30 : nextIn) * 1000); };
      setTimeout(loop, 1500);
    },
    dirty() { if (PREVIEW) return; st.dirty = true; save(); clearTimeout(dirtyTimer); dirtyTimer = setTimeout(sync, 2000); },
    setServer(u) { st = { server: (u || '').trim() }; save(); sync(true); },
    async forget() { try { if (st.key) await call('/api/device/forget'); } catch (e) { } st = { server: st.server }; save(); await sync(true); },
    setCode(c) { try { localStorage.setItem('hayya_code', String(c || '').trim().toUpperCase()); } catch (e) { } st.codeBad = ''; st.codeErr = ''; save(); sync(true); },
    linkUrl() { const s = server(); return s && st.key ? `${s}/#/link/${st.key}` : s; },
  };
})();

/* ---------- pairing screen (first run, or "identify" from the dashboard) ---------- */
function qrSVG(text) {
  try { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); } catch (e) { return ''; }
}
let pairTimer = null;
function showPair(force, ms) {
  const st = Cloud.st(), srv = Cloud.server();
  if (!srv || !st.key) { if (force) toast(S.lang === 'ar' ? 'لم يتم الاتصال بالخادم بعد' : 'Not connected to the server yet'); return; }
  let el = $('#pair'); if (!el) { el = document.createElement('div'); el.id = 'pair'; el.className = 'layer'; $('#stage').appendChild(el); }
  const ar = S.lang === 'ar', host = srv.replace(/^https?:\/\//, '');
  el.innerHTML = `<div class="pr-card fitbox"><div class="pr-in">
    <div class="pr-qr">${qrSVG(Cloud.linkUrl())}</div>
    <div class="pr-tx">
      <div class="pr-h ln">${st.linked ? (ar ? 'هذه الشاشة' : 'This screen') : (ar ? 'اربط الشاشة بلوحة التحكم' : 'Link this screen to the dashboard')}</div>
      ${st.linked ? `<div class="pr-s ln">${esc(st.name)} — ${esc(st.owner)}</div>` : `<ol>
        <li class="ln">${ar ? 'افتح من الكمبيوتر:' : 'On a computer open:'} <b dir="ltr">${esc(host)}</b></li>
        <li class="ln">${ar ? 'سجّل الدخول ثم اضغط «ربط شاشة»' : 'Sign in, then choose “Link a screen”'}</li>
        <li class="ln">${ar ? 'أدخل رقم الشاشة:' : 'Enter the screen number:'}</li></ol>`}
      <div class="pr-key num ln" dir="ltr">${esc(st.key)}</div>
      ${activationLine(ar)}
      <div class="pr-f ln">${ar ? 'أو امسح الرمز بالجوال' : 'or scan the code with a phone'} · ${ar ? 'اضغط OK للمتابعة' : 'press OK to continue'}</div>
    </div></div></div>`;
  el.classList.add('on');
  requestAnimationFrame(() => fitBox($('.pr-card', el), 100, 30));
  clearTimeout(pairTimer); if (ms) pairTimer = setTimeout(() => hidePair(false), ms);
}
function hidePair(done) { const el = $('#pair'); if (el) el.classList.remove('on'); if (done) try { localStorage.setItem('hayya_pair_done', '1'); } catch (e) { } }
const pairVisible = () => { const el = $('#pair'); return !!(el && el.classList.contains('on')); };

/* ---------- activation code built into the copy (APK signing block / HTML meta) or typed on the screen ---------- */
function embeddedCode() {
  try { if (Native && Native.getEmbeddedCode) { const c = Native.getEmbeddedCode(); if (c) return String(c).trim().toUpperCase(); } } catch (e) { }
  const m = document.querySelector('meta[name="hayya-code"]');
  return m && m.content ? m.content.trim().toUpperCase() : '';
}
function activationCode() {
  let typed = ''; try { typed = localStorage.getItem('hayya_code') || ''; } catch (e) { }
  return typed || embeddedCode();
}
function deviceId() {
  try { if (Native && Native.getDeviceId) { const d = Native.getDeviceId(); if (d) return 'a:' + d; } } catch (e) { }
  try { let d = localStorage.getItem('hayya_did'); if (!d) { d = 'w:' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('hayya_did', d); } return d; } catch (e) { return ''; }
}
function planText(ar) {
  const st = Cloud.st(), pl = st.plan;
  if (!pl) return '';
  const L = (a, e) => ar ? a : e;
  if (pl.kind === 'lifetime') return L('✓ مفعّلة مدى الحياة', '✓ Activated for life');
  if (pl.kind === 'paid') return L('✓ مفعّلة حتى ', '✓ Active until ') + new Date(pl.until).toLocaleDateString(ar ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB');
  if (pl.kind === 'free') return L('النسخة المجانية (شاشة واحدة لكل حساب)', 'Free version (one screen per account)');
  return L('تحتاج كود تفعيل لإدارتها من لوحة التحكم', 'Needs an activation code for the dashboard');
}
function activationLine(ar) {
  const st = Cloud.st(), c = activationCode(), L = (a, e) => ar ? a : e;
  if (c) {
    const state = st.codeOk === c ? L('✓ تم التفعيل مدى الحياة', '✓ Activated for life') : st.codeBad === c ? '✗ ' + (st.codeErr || L('غير صالح', 'invalid')) : L('⏳ يُفعَّل تلقائيًا عند الاتصال بالإنترنت', '⏳ Activates by itself when online');
    return `<div class="pr-code ln">${L('كود التفعيل', 'Activation code')}: <b dir="ltr">${esc(c)}</b> — ${state}</div>`;
  }
  const t = planText(ar); return t ? `<div class="pr-code ln">${t}</div>` : '';
}
