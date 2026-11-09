/* ================= Hayya dashboard (runs in a normal desktop browser) =================
   Reuses the screen's own settings editor (ui.js) and prayer engine, with a live preview
   of the real screen in an iframe. Talks to the server API with a bearer token. */
(() => {
  const TK = 'hayya_dash_token';
  let token = ''; try { token = localStorage.getItem(TK) || ''; } catch (e) { }
  let me = null, cfg = {}, screens = [], cur = null;      // cur = { key, name, ver, info, online, lastSeen }
  let saveT = null, saving = false, pendingSave = false, pollT = null, frameReady = false;
  const app = $('#app');
  const SS = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { } }, del: k => { try { sessionStorage.removeItem(k); } catch (e) { } } };
  const APP_URL = DASH.appUrl || '/app/';

  /* ---------- API ---------- */
  async function api(path, opt = {}) {
    const h = { 'Content-Type': 'application/json' }; if (token) h.Authorization = 'Bearer ' + token;
    const r = await fetch(path, { method: opt.method || 'GET', headers: Object.assign(h, opt.headers || {}), body: opt.raw || (opt.body ? JSON.stringify(opt.body) : undefined) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && path.indexOf('/api/auth/') !== 0) { setToken(''); go('#/login'); throw new Error(j.message || 'سجّل الدخول'); }
    if (!r.ok) { const e = new Error(j.message || ('HTTP ' + r.status)); e.status = r.status; e.data = j; if (r.status === 402 && cur && cur.plan) { cur.plan.active = false; renderPlanBar(); } throw e; }
    return j;
  }
  function setToken(t) { token = t; try { t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK); } catch (e) { } }
  const go = h => { if (location.hash !== h) location.hash = h; else route(); };

  /* ---------- hooks: the shared editor saves to the server instead of this browser ---------- */
  Hooks.persist = () => {
    if (cur && cur.plan && !cur.plan.active) { setSaveState('locked'); return; }   // free plan: dashboard editing is off
    pendingSave = true; setSaveState('pending'); clearTimeout(saveT); saveT = setTimeout(saveNow, 700);
  };
  Hooks.changed = () => pushPreview();
  Hooks.storeMedia = async (blob) => {
    const r = await fetch('/api/media', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': blob.type || 'image/jpeg' }, body: blob });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.message || 'تعذّر رفع الملف');
    return j.id;
  };
  Hooks.dropMedia = () => Promise.resolve();
  Hooks.mediaBase = () => location.origin + '/api/media/';
  Hooks.cacheMedia = false;
  window.applyAll = () => { pushPreview(); if (cur) rerender(); };
  window.importBackup = async file => {
    const j = JSON.parse(await file.text());
    const map = {};
    for (const [id, dataUrl] of Object.entries(j.media || {})) { const b = await (await fetch(dataUrl)).blob(); map[id] = await Hooks.storeMedia(b); }
    let txt = JSON.stringify(j.settings || j); Object.keys(map).forEach(id => { txt = txt.split('"' + id + '"').join('"' + map[id] + '"'); });
    S = migrate(merge(DEFAULTS, JSON.parse(txt))); saveSettings(); pushPreview();
  };
  window.exportBackup = async () => {
    const txt = JSON.stringify(S), media = {};
    for (const mid of new Set(txt.match(/m_[a-z0-9]{10,}/g) || [])) {
      try { const r = await fetch('/api/media/' + mid); if (!r.ok) continue; const b = await r.blob(); media[mid] = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); }); } catch (e) { }
    }
    const blob = new Blob([JSON.stringify({ app: 'hayya-tv', v: 2, exportedAt: new Date().toISOString(), settings: S, media })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `hayya-${(cur && cur.name) || 'screen'}.json`; a.click();
  };

  async function saveNow() {
    if (!cur) return;
    if (saving) { clearTimeout(saveT); saveT = setTimeout(saveNow, 400); return; }
    saving = true; pendingSave = false; setSaveState('saving');
    try {
      const r = await api('/api/screens/' + cur.key, { method: 'PUT', body: { settings: S, baseVer: cur.ver } });
      cur.ver = r.ver; setSaveState(pendingSave ? 'pending' : 'saved');
    } catch (e) {
      if (e.status === 409) {
        // the screen saved its own change in the meantime: keep what the user just did here (the dashboard wins)
        try { const r2 = await api('/api/screens/' + cur.key, { method: 'PUT', body: { settings: S } }); cur.ver = r2.ver; setSaveState(pendingSave ? 'pending' : 'saved'); }
        catch (e2) { setSaveState('error', e2.message); pendingSave = true; }
      }
      else { setSaveState('error', e.message); pendingSave = true; }
    } finally { saving = false; }
  }
  function setSaveState(s, msg) {
    const el = $('#saveState'); if (!el) return;
    const T = { pending: ['•', 'تغييرات غير محفوظة'], saving: ['⟳', 'جارٍ الحفظ…'], saved: ['✓', 'محفوظ — يصل للشاشة خلال ثوانٍ'], error: ['!', 'تعذّر الحفظ: ' + (msg || '')], locked: ['🔒', 'التعديل من اللوحة ضمن الاشتراك — لم يُحفظ'] }[s];
    el.className = 'save ' + s; el.innerHTML = `<i>${T[0]}</i>${esc(T[1])}`;
  }
  addEventListener('beforeunload', e => { if (pendingSave || saving) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- live preview of the real screen ---------- */
  function previewSettings() { const o = clone(S); o.orientation = 'auto'; return o; }
  function pushPreview() {
    const f = $('#pv'); if (!f || !frameReady) return;
    f.contentWindow.postMessage({ type: 'settings', settings: previewSettings() }, location.protocol === 'file:' ? '*' : location.origin);
  }
  function sizePreview() {
    const box = $('#pvbox'), f = $('#pv'); if (!box || !f) return;
    const port = /^portrait/.test(S.orientation);
    const W = port ? 1080 : 1920, H = port ? 1920 : 1080;
    f.style.width = W + 'px'; f.style.height = H + 'px';
    const pane = $('.pvpane'), avail = pane ? pane.clientWidth - 34 : 500, sc = Math.min(avail / W, (port ? 640 : 420) / H);
    f.style.transform = `scale(${sc})`; box.style.height = (H * sc) + 'px';
    $('#pvwrap').style.width = (W * sc) + 'px';
  }
  addEventListener('message', e => { if ((e.origin === location.origin || location.protocol === 'file:') && e.data && e.data.type === 'ready') { frameReady = true; pushPreview(); } });
  addEventListener('resize', () => sizePreview());
  DASH.preview = k => { const f = $('#pv'); if (f && frameReady) f.contentWindow.postMessage({ type: 'preview', k }, location.protocol === 'file:' ? '*' : location.origin); };
  DASH.command = async cmd => {
    try { await api('/api/screens/' + cur.key + '/command', { method: 'POST', body: { cmd } }); toast('تم إرسال الأمر — يصل للشاشة خلال ثوانٍ'); }
    catch (e) { toast(e.message, 5000); }
  };

  /* ---------- helpers ---------- */
  function ago(ms) {
    if (!ms) return 'لم تتصل بعد';
    const s = Math.round((Date.now() - ms) / 1000);
    if (s < 60) return 'الآن'; const m = Math.round(s / 60); if (m < 60) return `منذ ${m} دقيقة`;
    const h = Math.round(m / 60); if (h < 48) return `منذ ${h} ساعة`; return `منذ ${Math.round(h / 24)} يوم`;
  }
  const pill = sc => `<span class="pill ${sc.online ? 'on' : 'off'}"><i></i>${sc.online ? 'متصلة' : 'غير متصلة'}</span>`;
  const dshort = ms => new Date(ms).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric' });
  const daysLeft = ms => Math.max(0, Math.ceil((ms - Date.now()) / 864e5));
  function planPill(pl) {
    if (!pl) return '';
    if (pl.kind === 'lifetime') return `<span class="pill plan paid">★ مفعّلة مدى الحياة</span>`;
    if (pl.kind === 'paid') return `<span class="pill plan paid" title="حتى ${dshort(pl.until)}">★ مفعّلة ${daysLeft(pl.until) <= 30 ? `— باقٍ ${daysLeft(pl.until)} يوم` : ''}</span>`;
    if (pl.kind === 'free') return `<span class="pill plan trial">مجانية${pl.until ? ` — باقٍ ${daysLeft(pl.until)} يوم` : ''}</span>`;
    if (pl.kind === 'trial') return `<span class="pill plan trial">تجربة — باقٍ ${daysLeft(pl.until)} يوم</span>`;
    if (pl.kind === 'expired' || pl.kind === 'freeEnded') return `<span class="pill plan off">انتهت المدة</span>`;
    return `<span class="pill plan off">تحتاج كود تفعيل</span>`;
  }
  const planActive = () => !!(cur && cur.plan && cur.plan.active);
  function withSettings(settings, fn) { const keep = S; try { S = migrate(merge(DEFAULTS, settings || {})); invalidate(); return fn(); } finally { S = keep; invalidate(); } }
  function nextPrayerOf(sc) {
    return withSettings(sc.settings, () => { const n = nextPrayer(now()); return n ? `${PN(n.name)} ${fmtT(n.adhan)}` : ''; });
  }
  // screen number: 10 digits shown as 12345-67890 (older 8-character keys still work)
  const fmtKey = v => {
    const c = String(v || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (/[A-Z]/.test(c)) { const x = c.slice(0, 8); return x.length > 4 ? x.slice(0, 4) + '-' + x.slice(4) : x; }
    const d = c.slice(0, 10); return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
  };
  function shell(main, active) {
    app.innerHTML = `<header class="top"><a class="brand" href="#/screens"><b>حَيَّ</b><span>لوحة تحكم شاشات المساجد</span></a>
      <nav><a href="#/screens" class="${active === 'screens' ? 'on' : ''}">الشاشات</a><a href="#/backups" class="${active === 'backups' ? 'on' : ''}">النسخ الاحتياطية</a><a href="#/download" class="${active === 'download' ? 'on' : ''}">تحميل التطبيق</a><a href="#/plans" class="${active === 'plans' ? 'on' : ''}">الخطط والتفعيل</a><a href="#/account" class="${active === 'account' ? 'on' : ''}">الحساب</a>${me && me.isAdmin ? `<a href="#/admin" class="${active === 'admin' ? 'on' : ''}">الإدارة</a>` : ''}</nav>
      <div class="who">${esc(me ? (me.name || me.email) : '')}</div></header><main class="page">${main}</main>`;
  }

  /* ---------- auth pages ---------- */
  function authPage() {
    let phone = '', timer = null;
    app.innerHTML = `<div class="auth"><div class="authcard">
      <div class="authbrand"><b>حَيَّ</b><span>لوحة تحكم شاشات المساجد</span></div>
      <h1>تسجيل الدخول</h1><p class="sub">نرسل رمز تحقق إلى جوالك في كل مرة تدخل فيها.</p>
      <form id="pf1" novalidate>
        <label>رقم الجوال<div class="phonein"><span dir="ltr">+${esc(cfg.country || '966')}</span><input id="a_phone" type="tel" inputmode="tel" dir="ltr" autocomplete="tel" placeholder="05xxxxxxxx" required></div></label>
        <p class="formerr" id="a_err" hidden></p>
        <button class="btn primary wide" type="submit">أرسل رمز التحقق</button>
      </form>
      <form id="pf2" novalidate hidden>
        <p class="sub" id="a_sentto"></p>
        <label>رمز التحقق<input id="a_code" class="codein" inputmode="numeric" autocomplete="one-time-code" dir="ltr" maxlength="6" placeholder="••••••" required></label>
        <div id="a_new" hidden><label>اسم المسجد أو الجهة<input id="a_name" autocomplete="organization" placeholder="جامع الحي"></label>
          <label id="a_codewrap" hidden>رمز التسجيل<input id="a_signup" dir="ltr" autocomplete="off"></label></div>
        <p class="formerr" id="a_err2" hidden></p>
        <button class="btn primary wide" type="submit">دخول</button>
        <div class="resend"><button class="linkbtn" type="button" id="a_back">تغيير الرقم</button><button class="linkbtn" type="button" id="a_resend" disabled>إعادة الإرسال</button></div>
      </form>
    </div><div class="authside"><h2>شاشة واحدة أو عشرات الشاشات — من مكان واحد</h2>
      <ul><li>اربط كل شاشة برقمها الفريد (10 أرقام) الظاهر على التلفزيون</li><li>عدّل المواقيت والإقامة والأذكار والإعلانات من الكمبيوتر</li><li>نسخ احتياطية تلقائية تنقلها لأي شاشة أخرى</li><li>الدخول برقم الجوال ورمز تحقق في كل مرة</li></ul></div></div>`;
    const send = async () => {
      const er = $('#a_err'); er.hidden = true; const btn = $('#pf1 button'); btn.disabled = true;
      try {
        const r = await api('/api/auth/otp', { method: 'POST', body: { phone: $('#a_phone').value } });
        phone = $('#a_phone').value;
        $('#pf1').hidden = true; $('#pf2').hidden = false; $('#a_code').value = ''; $('#a_code').focus();
        $('#a_sentto').innerHTML = `أرسلنا رمزًا من 6 أرقام إلى <b dir="ltr">${esc(r.phone)}</b>`;
        $('#a_new').hidden = !r.isNew; $('#a_codewrap').hidden = !r.needsCode;
        if (r.devCode) toast('وضع التجربة — الرمز: ' + r.devCode, 10000);
        let left = r.resendIn || 45; const rb = $('#a_resend'); rb.disabled = true; clearInterval(timer);
        timer = setInterval(() => { left--; rb.textContent = left > 0 ? `إعادة الإرسال (${left})` : 'إعادة الإرسال'; if (left <= 0) { rb.disabled = false; clearInterval(timer); } }, 1000);
      } catch (err) { const e2 = $('#pf2').hidden ? er : $('#a_err2'); e2.textContent = err.message; e2.hidden = false; }
      finally { btn.disabled = false; }
    };
    $('#pf1').addEventListener('submit', e => { e.preventDefault(); send(); });
    $('#a_resend').onclick = () => { $('#a_phone').value = phone; send(); };
    $('#a_back').onclick = () => { $('#pf2').hidden = true; $('#pf1').hidden = false; $('#a_phone').focus(); };
    $('#a_code').addEventListener('input', e => { e.target.value = e.target.value.replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\D/g, '').slice(0, 6); });
    $('#pf2').addEventListener('submit', async e => {
      e.preventDefault(); const er = $('#a_err2'); er.hidden = true; const btn = $('#pf2 button[type=submit]'); btn.disabled = true;
      try {
        const r = await api('/api/auth/verify', { method: 'POST', body: { phone, code: $('#a_code').value, name: $('#a_name').value, signupCode: $('#a_signup').value } });
        setToken(r.token); me = null; clearInterval(timer);   // /api/me is loaded next (includes plan & admin info)
        const pend = SS.get('hayya_link'); go(pend ? '#/link/' + pend : '#/screens');
      } catch (err) { er.textContent = err.message; er.hidden = false; }
      finally { btn.disabled = false; }
    });
    $('#a_phone').focus();
  }

  /* ---------- screens list ---------- */
  async function screensPage(linkKey) {
    shell(`<div class="loading">جارٍ التحميل…</div>`, 'screens');
    try { screens = (await api('/api/screens')).screens; } catch (e) { $('.page').innerHTML = `<p class="formerr">${esc(e.message)}</p>`; return; }
    const cards = screens.map(sc => {
      const s = sc.settings || {}, nm = (s.name && s.name.l1) || '', info = sc.info || {};
      return `<article class="scard">
        <div class="sc-top"><div><h3>${esc(sc.name)}</h3><div class="sc-key" dir="ltr">${esc(sc.key)}</div></div><div class="pills">${pill(sc)}${planPill(sc.plan)}</div></div>
        <dl><div><dt>المسجد</dt><dd>${esc(nm) || '—'}</dd></div><div><dt>المدينة</dt><dd>${esc((s.loc && s.loc.city) || info.city || '—')}</dd></div>
          <div><dt>الصلاة القادمة</dt><dd class="num">${esc(nextPrayerOf(sc)) || '—'}</dd></div><div><dt>آخر اتصال</dt><dd>${ago(sc.lastSeen)}</dd></div>
          <div><dt>الشاشة</dt><dd class="num" dir="ltr">${info.w ? `${info.w}×${info.h}` : '—'}</dd></div><div><dt>الإصدار</dt><dd class="num" dir="ltr">${esc(info.apk || info.app || '—')}</dd></div></dl>
        <div class="sc-act"><a class="btn primary" href="#/screen/${sc.key}">إدارة الشاشة</a><button class="btn ghost" data-copy="${sc.key}" ${screens.length < 2 ? 'disabled title="تحتاج شاشتين على الأقل"' : ''}>نسخ الإعدادات</button><button class="btn ghost danger" data-del="${sc.key}" title="حذف الشاشة">حذف</button></div>
      </article>`;
    }).join('');
    $('.page').innerHTML = `<div class="phead"><div><h1>الشاشات</h1><p class="sub">${screens.length ? `${screens.length} شاشة مرتبطة بحسابك` : 'لا توجد شاشات مرتبطة بعد'}</p></div><button class="btn primary" id="linkBtn">＋ ربط شاشة</button></div>
      ${screens.length ? `<div class="sgrid">${cards}</div>` : `<div class="empty"><h2>ابدأ بربط أول شاشة</h2><ol>
        <li>ثبّت التطبيق على جهاز التلفزيون — <a href="#/download">روابط التحميل</a></li>
        <li>شغّل التطبيق؛ سيظهر على الشاشة <b>رقم الشاشة من 10 أرقام</b> مثل <code dir="ltr">48213-90576</code></li>
        <li>اضغط «ربط شاشة» هنا وأدخل رقم الشاشة</li></ol><button class="btn primary" id="linkBtn2">＋ ربط شاشة</button></div>`}`;
    $('#linkBtn').onclick = () => linkDialog();
    const l2 = $('#linkBtn2'); if (l2) l2.onclick = () => linkDialog();
    $$('[data-copy]').forEach(b => b.onclick = () => copyDialog(b.dataset.copy));
    $$('[data-del]').forEach(b => b.onclick = () => { const s = screens.find(x => x.key === b.dataset.del); deleteDialog(s.key, s.name, () => screensPage()); });
    if (linkKey) linkDialog(linkKey);
  }
  function modal(html, onReady) {
    const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="mbox" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', function esc1(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc1); } });
    onReady && onReady(m, close); return close;
  }
  function linkDialog(pre) {
    modal(`<h2>ربط شاشة جديدة</h2><p class="sub">رقم الشاشة ظاهر على شاشة التلفزيون عند أول تشغيل، أو من: الإعدادات ← لوحة التحكم.</p>
      <form id="lf"><label>رقم الشاشة<input id="l_key" class="keyin" dir="ltr" autocomplete="off" inputmode="numeric" placeholder="12345-67890" maxlength="11" value="${esc(fmtKey(pre || ''))}"></label>
      <label>اسم الشاشة (اختياري)<input id="l_name" placeholder="مثلاً: شاشة مصلى الرجال"></label>
      <label>إعدادات الشاشة<select id="l_bk"><option value="">إبقاء إعدادات الجهاز الحالية</option></select></label>
      <p class="formerr" id="l_err" hidden></p>
      <div class="mact"><button class="btn primary" type="submit">ربط</button><button class="btn ghost" type="button" data-close>إلغاء</button></div></form>`, (m, close) => {
      const k = $('#l_key', m); k.focus();
      api('/api/backups').then(r => { const sel = $('#l_bk', m); if (!sel) return; r.backups.slice(0, 40).forEach(b => sel.insertAdjacentHTML('beforeend', `<option value="${b.id}">استعادة: ${esc(b.screen_name || b.screen_key)} — ${esc(b.name)} — ${fmtDate(b.created)}</option>`)); }).catch(() => { });
      k.addEventListener('input', () => { const p = k.selectionStart; k.value = fmtKey(k.value); k.setSelectionRange(p + 1, p + 1); });
      $('#lf', m).addEventListener('submit', async e => {
        e.preventDefault(); const er = $('#l_err', m); er.hidden = true;
        try {
          const r = await api('/api/screens/link', { method: 'POST', body: { key: k.value, name: $('#l_name', m).value } });
          const bk = $('#l_bk', m).value;
          if (bk) await api(`/api/backups/${bk}/restore`, { method: 'POST', body: { key: r.screen.key } });
          SS.del('hayya_link'); close();
          toast(r.needCode ? 'تم ربط الشاشة ✓ — النسخة المجانية تشمل شاشة واحدة لكل حساب، فهذه الشاشة تحتاج كود تفعيل لإدارتها من اللوحة' : r.free ? 'تم ربط الشاشة ✓ — هذه شاشتك المجانية' : (bk ? 'تم ربط الشاشة واستعادة النسخة ✓' : 'تم ربط الشاشة ✓'), 8000);
          go('#/screen/' + r.screen.key);
        }
        catch (err) { er.textContent = err.message; er.hidden = false; }
      });
    });
  }
  function deleteDialog(key, name, done) {
    modal(`<h2>حذف «${esc(name)}» نهائيًا؟</h2>
      <p class="sub">تُحذف الشاشة من حسابك مع إعداداتها المحفوظة في اللوحة. إذا كان الجهاز ما زال يعمل فسيحصل على مفتاح جديد ويظهر عليه طلب الربط من جديد.</p>
      <form id="df"><label>للتأكيد اكتب رقم الشاشة <code dir="ltr">${esc(key)}</code><input id="d_key" dir="ltr" autocomplete="off" placeholder="${esc(key)}"></label>
      <p class="formerr" id="d_err" hidden></p>
      <div class="mact"><button class="btn primary danger" type="submit">حذف نهائي</button><button class="btn ghost" type="button" data-close>إلغاء</button></div></form>`, (m, close) => {
      $('#d_key', m).focus();
      $('#df', m).addEventListener('submit', async e => {
        e.preventDefault(); const er = $('#d_err', m);
        if (fmtKey($('#d_key', m).value) !== key) { er.textContent = 'الرقم غير مطابق'; er.hidden = false; return; }
        try { await api('/api/screens/' + key + '?forever=1', { method: 'DELETE' }); close(); toast('تم حذف الشاشة'); done(); }
        catch (err) { er.textContent = err.message; er.hidden = false; }
      });
    });
  }
  function copyDialog(from) {
    const others = screens.filter(s => s.key !== from), src = screens.find(s => s.key === from);
    modal(`<h2>نسخ إعدادات «${esc(src.name)}»</h2><p class="sub">ستُستبدل كل إعدادات الشاشات المختارة بإعدادات هذه الشاشة (المواقيت، التصميم، الأذكار، الإعلانات…).</p>
      <form id="cf"><div class="checks">${others.map(s => `<label class="chk"><input type="checkbox" value="${s.key}"> ${esc(s.name)} <code dir="ltr">${s.key}</code></label>`).join('')}</div>
      <div class="mact"><button class="btn primary" type="submit">نسخ</button><button class="btn ghost" type="button" data-close>إلغاء</button></div></form>`, (m, close) => {
      $('#cf', m).addEventListener('submit', async e => {
        e.preventDefault(); const to = $$('input:checked', m).map(i => i.value); if (!to.length) return toast('اختر شاشة واحدة على الأقل');
        try { const r = await api('/api/screens/copy', { method: 'POST', body: { from, to } }); close(); toast(`تم النسخ إلى ${r.copied} شاشة`); screensPage(); } catch (err) { toast(err.message, 5000); }
      });
    });
  }

  /* ---------- screen editor ---------- */
  function loadScreenSettings(sc) {
    cur = { key: sc.key, name: sc.name, ver: sc.ver, info: sc.info, online: sc.online, lastSeen: sc.lastSeen, plan: sc.plan };
    if ($('#planBar')) renderPlanBar();
    S = migrate(merge(DEFAULTS, sc.settings || {})); invalidate();
    if ($('#set .fields')) { rerender(); pushPreview(); sizePreview(); }
  }
  async function editorPage(key, cat) {
    clearInterval(pollT);
    if (!cur || cur.key !== key) {
      shell(`<div class="loading">جارٍ تحميل الشاشة…</div>`, 'screens');
      let r; try { r = await api('/api/screens/' + key + '?watch=1'); } catch (e) { $('.page').innerHTML = `<p class="formerr">${esc(e.message)}</p>`; return; }
      loadScreenSettings(r.screen); frameReady = false;
    }
    if (cat && CATS.some(c => c[0] === cat)) curCat = cat; else if (!CATS.some(c => c[0] === curCat)) curCat = 'loc';
    if (!$('#set')) {
      shell(`<div class="ehead"><a class="back" href="#/screens">→ الشاشات</a>
          <input id="scName" class="scname" value="${esc(cur.name)}" aria-label="اسم الشاشة">
          <span id="scStatus"></span><span class="spacer"></span><span id="saveState" class="save saved"><i>✓</i>محفوظ</span>
          <button class="btn ghost" id="redeemBtn">تفعيل بكود</button><button class="btn ghost" id="backupBtn">نسخة احتياطية الآن</button><button class="btn ghost" id="unlinkBtn">فك الربط</button><button class="btn ghost danger" id="deleteBtn">حذف الشاشة</button></div>
        <div id="planBar"></div>
        <div class="editor"><div id="set"><nav></nav><main><h2></h2><div class="fields"></div></main></div>
          <aside class="pvpane"><div class="pvhead"><b>معاينة مباشرة</b><span class="sub">ما يظهر على الشاشة الآن</span></div>
            <div id="pvwrap"><div id="pvbox"><iframe id="pv" title="معاينة الشاشة" src="${APP_URL}?preview=1"></iframe></div></div>
            <div class="pvbtns">${[['main', 'الرئيسية'], ['adhan', 'الأذان'], ['countdown', 'عدّاد الإقامة'], ['iqama', 'الإقامة'], ['azkar', 'أذكار بعد الصلاة'], ['morning', 'أذكار الصباح'], ['khutbah', 'الخطبة'], ['taraweeh', 'التراويح'], ['gallery', 'معرض الصور'], ['saver', 'السكون']].map(([k, l]) => `<button class="chip" data-pv="${k}">${l}</button>`).join('')}</div>
            <p class="sub pvnote">المعاينة تعمل بساعة هذا الكمبيوتر. التعديلات تصل للشاشة خلال ثوانٍ، وتعديلات الشاشة تظهر هنا تلقائيًا.</p>
          </aside></div><input type="file" id="filePick" hidden>`, 'screens');
      const set = $('#set');
      set.addEventListener('click', onClick); set.addEventListener('change', onChange); set.addEventListener('input', onInput);
      $('#filePick').addEventListener('change', onFile);
      set.addEventListener('click', e => { const nb = e.target.closest('.navb'); if (nb) history.replaceState(null, '', `#/screen/${cur.key}/${nb.dataset.cat}`); }, true);
      $$('[data-pv]').forEach(b => b.onclick = () => { $$('[data-pv]').forEach(x => x.classList.toggle('on', x === b)); DASH.preview(b.dataset.pv); });
      $('#scName').addEventListener('change', async e => { try { await api('/api/screens/' + cur.key, { method: 'PUT', body: { name: e.target.value } }); cur.name = e.target.value; toast('تم تغيير الاسم'); } catch (err) { toast(err.message); } });
      $('#unlinkBtn').onclick = () => modal(`<h2>فك ربط الشاشة؟</h2><p class="sub">ستتوقف الشاشة عن استقبال التعديلات من هذا الحساب، وتكمل العمل بآخر إعدادات وصلتها. يمكن ربطها مرة أخرى بنفس المفتاح.</p>
        <div class="mact"><button class="btn primary danger" id="doUnlink">فك الربط</button><button class="btn ghost" data-close>إلغاء</button></div>`, (m, close) => {
          $('#doUnlink', m).onclick = async () => { try { await api('/api/screens/' + cur.key, { method: 'DELETE' }); close(); cur = null; toast('تم فك الربط'); go('#/screens'); } catch (err) { toast(err.message); } };
        });
    }
    $('#backupBtn').onclick = async () => {
      if (pendingSave || saving) await saveNow();
      try { await api('/api/screens/' + cur.key + '/backups', { method: 'POST', body: { name: 'نسخة يدوية — ' + new Date().toLocaleDateString('ar-SA-u-nu-latn') } }); toast('تم حفظ نسخة احتياطية في اللوحة ✓ — تجدها في «النسخ الاحتياطية»'); }
      catch (e) { toast(e.message, 5000); }
    };
    $('#redeemBtn').onclick = () => redeemDialog(cur.key);
    renderPlanBar();
    $('#deleteBtn').onclick = () => deleteDialog(cur.key, cur.name, () => { cur = null; go('#/screens'); });
    renderNav(); showCat(curCat, false); updateStatus(); sizePreview();
    // poll: status, and pick up edits made on the screen itself
    pollT = setInterval(async () => {
      if (!cur || location.hash.indexOf('#/screen/' + cur.key) !== 0) return clearInterval(pollT);
      try {
        const r = (await api('/api/screens/' + cur.key + '?watch=1')).screen;
        const was = cur.plan && cur.plan.active;
        Object.assign(cur, { online: r.online, lastSeen: r.lastSeen, info: r.info, plan: r.plan }); updateStatus();
        if (!!(r.plan && r.plan.active) !== !!was) renderPlanBar();
        if (r.ver !== cur.ver && !pendingSave && !saving) { loadScreenSettings(r); toast('وصلت تعديلات جديدة من الشاشة'); }
      } catch (e) { }
    }, 8000);
  }
  function renderPlanBar() {
    const el = $('#planBar'); if (!el || !cur) return;
    const pl = cur.plan || {}, set = $('#set');
    if (set) set.classList.toggle('locked', !pl.active);
    if (pl.active && !(pl.kind === 'paid' && daysLeft(pl.until) <= 30) && !(pl.kind === 'free' && pl.until)) { el.innerHTML = ''; return; }
    const msg = pl.kind === 'free' ? `هذه شاشتك المجانية — باقٍ ${daysLeft(pl.until)} يوم على إدارتها من اللوحة. فعّلها بكود مدى الحياة لتستمر.`
      : pl.active ? `ينتهي تفعيل هذه الشاشة بعد ${daysLeft(pl.until)} يوم (${dshort(pl.until)}).`
      : 'النسخة المجانية تشمل إدارة شاشة واحدة فقط لكل حساب (مرة واحدة). لإدارة هذه الشاشة من اللوحة فعّلها بكود تفعيل يُشترى مرة واحدة مدى الحياة. الشاشة نفسها تعمل كاملة بآخر إعداداتها، ويمكن تعديلها بالريموت.';
    el.innerHTML = `<div class="planbar ${pl.active ? 'soon' : 'free'}"><span>${msg}</span><span class="pb-act"><button class="btn primary" id="pbRedeem">تفعيل بكود</button><a class="btn ghost" href="#/plans">الخطط والأسعار</a></span></div>`;
    $('#pbRedeem').onclick = () => redeemDialog(cur.key);
  }
  function redeemDialog(key) {
    const opts = key ? '' : screens.map(s => `<option value="${s.key}">${esc(s.name)} — ${s.key}</option>`).join('');
    modal(`<h2>تفعيل الشاشة بكود</h2><p class="sub">كل كود يفعّل شاشة واحدة مدى الحياة (يُشترى مرة واحدة). يمكن أيضًا إدخال الكود من الشاشة نفسها: الإعدادات ← لوحة التحكم ← كود التفعيل.</p>
      <form id="rdf">${key ? '' : `<label>الشاشة<select id="rd_key">${opts}</select></label>`}
      <label>كود التفعيل<input id="rd_code" class="keyin" dir="ltr" autocomplete="off" placeholder="HAYYA-XXXX-XXXX-XXXX" style="font-size:1.2rem;letter-spacing:.08em"></label>
      <p class="formerr" id="rd_err" hidden></p>
      <div class="mact"><button class="btn primary" type="submit">تفعيل</button><button class="btn ghost" type="button" data-close>إلغاء</button></div></form>`, (m, close) => {
      $('#rd_code', m).focus();
      $('#rdf', m).addEventListener('submit', async e => {
        e.preventDefault(); const er = $('#rd_err', m); er.hidden = true;
        const k = key || $('#rd_key', m).value;
        try {
          const r = await api(`/api/screens/${k}/redeem`, { method: 'POST', body: { code: $('#rd_code', m).value } });
          close(); toast(r.lifetime ? 'تم التفعيل مدى الحياة ✓' : `تم التفعيل ✓ — حتى ${dshort(r.until)}`, 6000);
          if (cur && cur.key === k) { cur.plan = { active: true, kind: r.lifetime ? 'lifetime' : 'paid', until: r.until }; renderPlanBar(); updateStatus(); } else route();
        } catch (err) { er.textContent = err.message; er.hidden = false; }
      });
    });
  }
  function updateStatus() {
    const el = $('#scStatus'); if (!el || !cur) return;
    el.innerHTML = `${pill(cur)}${planPill(cur.plan)}<code dir="ltr">${esc(cur.key)}</code><span class="sub">آخر اتصال: ${ago(cur.lastSeen)}</span>`;
  }

  /* ---------- download & account ---------- */
  function downloadPage() {
    const web = DASH.demo ? 'https://masjid.example.com/app/' : location.origin + '/app/';
    shell(`<div class="phead"><div><h1>تحميل التطبيق</h1><p class="sub">ثبّت التطبيق على جهاز التلفزيون، ثم اربطه بحسابك بالمفتاح الظاهر على الشاشة.</p></div></div>
      <div class="dgrid">
        <article class="dcard"><h3>Android TV — ملف APK</h3><p>لأجهزة TV Box وشاشات أندرويد. يعمل تلقائيًا عند تشغيل الجهاز ويشغّل الأذان بدون ضغط زر.</p>
          ${cfg.apkUrl ? `<a class="btn primary" href="${esc(cfg.apkUrl)}">⬇ تحميل APK</a><div class="url" dir="ltr">${esc(cfg.apkUrl)}</div>` : `<p class="warnbox">لم يُضف رابط ملف APK بعد. أضِفه في إعداد الخادم (APK_URL).</p>`}</article>
        <article class="dcard"><h3>Google Play</h3><p>ابحث عن التطبيق في متجر Google Play على التلفزيون، أو استخدم الرابط.</p>
          ${cfg.playUrl ? `<a class="btn primary" href="${esc(cfg.playUrl)}" target="_blank" rel="noopener">فتح صفحة المتجر</a>` : `<p class="warnbox">لم يُنشر في المتجر بعد (PLAY_URL).</p>`}</article>
        <article class="dcard"><h3>رابط للتلفزيون الذكي</h3><p>افتح هذا الرابط في متصفح التلفزيون (Samsung / LG / أي متصفح). يرتبط بهذه اللوحة تلقائيًا.</p>
          <div class="url big" dir="ltr">${esc(web)}</div><button class="btn ghost" id="cpWeb">نسخ الرابط</button></article>
        <article class="dcard"><h3>ملف HTML على الجهاز</h3><p>ملف واحد يعمل من ذاكرة الجهاز أو فلاشة، مرتبط بهذه اللوحة عند توفر الإنترنت ويعمل بدونه.</p>
          <button class="btn primary" id="dlHtml">⬇ تحميل ملف HTML</button></article>
      </div>`, 'download');
    $('#cpWeb').onclick = async () => { try { await navigator.clipboard.writeText(web); toast('تم نسخ الرابط'); } catch (e) { toast(web, 6000); } };
    $('#dlHtml').onclick = async () => {
      if (DASH.demo) return toast('التحميل متاح في لوحة التحكم الفعلية بعد تشغيل الخادم');
      try {
        const txt = (await (await fetch('/app/index.html', { cache: 'no-store' })).text()).replace('@@HAYYA_SERVER@@', location.protocol === 'file:' ? '*' : location.origin);
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/html' })); a.download = 'hayya-masjid.html'; a.click();
      } catch (e) { toast('تعذّر التحميل: ' + e.message); }
    };
  }
  function accountPage() {
    shell(`<div class="phead"><div><h1>الحساب</h1><p class="sub" dir="ltr">${esc(me.phone || '')}</p></div><div class="sc-act"><button class="btn ghost" id="logout">تسجيل الخروج</button><button class="btn ghost danger" id="logoutAll">الخروج من كل الأجهزة</button></div></div>
      <div class="dgrid"><article class="dcard"><h3>اسم المسجد أو الجهة</h3><form id="nf"><input id="acName" value="${esc(me.name || '')}"><button class="btn primary">حفظ</button></form></article>
      <article class="dcard"><h3>أمان الدخول</h3><p>الدخول برقم الجوال فقط، ويُرسل رمز تحقق جديد في كل مرة. الرمز صالح 5 دقائق، وبعد 5 محاولات خاطئة يُلغى.</p></article></div>`, 'account');
    $('#logout').onclick = async () => { try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) { } setToken(''); me = null; go('#/login'); };
    $('#logoutAll').onclick = async () => { try { await api('/api/auth/logout-all', { method: 'POST' }); } catch (e) { } setToken(''); me = null; go('#/login'); };
    $('#nf').onsubmit = async e => { e.preventDefault(); try { await api('/api/me', { method: 'PUT', body: { name: $('#acName').value } }); me.name = $('#acName').value; toast('تم الحفظ'); } catch (err) { toast(err.message); } };
  }

  /* ---------- backups: kept on the server, restorable to any screen ---------- */
  const fmtDate = ms => new Date(ms).toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' });
  async function backupsPage() {
    shell(`<div class="loading">جارٍ التحميل…</div>`, 'backups');
    let list = [], scs = [];
    try { [list, scs] = await Promise.all([api('/api/backups').then(r => r.backups), api('/api/screens').then(r => r.screens)]); screens = scs; } catch (e) { $('.page').innerHTML = `<p class="formerr">${esc(e.message)}</p>`; return; }
    const rows = list.map(b => `<tr><td><b>${esc(b.name)}</b> ${b.auto ? '<span class="pill off">تلقائية</span>' : '<span class="pill on">يدوية</span>'}</td>
      <td>${esc(b.screen_name || '—')} <code dir="ltr">${esc(b.screen_key || '')}</code></td><td class="num">${fmtDate(b.created)}</td><td class="num">${b.media || 0}</td>
      <td class="acts"><button class="btn ghost" data-restore="${b.id}">استعادة إلى شاشة…</button><button class="btn ghost" data-dl="${b.id}">تنزيل</button><button class="btn ghost danger" data-delb="${b.id}">حذف</button></td></tr>`).join('');
    $('.page').innerHTML = `<div class="phead"><div><h1>النسخ الاحتياطية</h1><p class="sub">تُحفظ في اللوحة مع الصور والأصوات. إذا تعطّلت شاشة: اربط الجهاز الجديد ثم استعد آخر نسخة إليه.</p></div></div>
      ${list.length ? `<div class="tablewrap"><table class="btable"><thead><tr><th>النسخة</th><th>الشاشة</th><th>التاريخ</th><th>الصور والأصوات</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
        : `<div class="empty"><h2>لا توجد نسخ بعد</h2><p class="sub">تُنشأ نسخة تلقائية يوميًا عند تعديل أي شاشة، ويمكنك إنشاء نسخة يدوية من صفحة الشاشة (زر «نسخة احتياطية الآن»).</p></div>`}`;
    $$('[data-restore]').forEach(b => b.onclick = () => restoreDialog(list.find(x => x.id === b.dataset.restore)));
    $$('[data-dl]').forEach(b => b.onclick = () => downloadBackup(b.dataset.dl));
    $$('[data-delb]').forEach(b => b.onclick = () => modal(`<h2>حذف هذه النسخة؟</h2><div class="mact"><button class="btn primary danger" id="okDel">حذف</button><button class="btn ghost" data-close>إلغاء</button></div>`, (m, close) => {
      $('#okDel', m).onclick = async () => { try { await api('/api/backups/' + b.dataset.delb, { method: 'DELETE' }); close(); toast('تم الحذف'); backupsPage(); } catch (e) { toast(e.message); } };
    }));
  }
  function restoreDialog(bk, preKey) {
    if (!screens.length) return toast('اربط شاشة أولًا ثم استعد النسخة إليها');
    modal(`<h2>استعادة «${esc(bk.name)}»</h2><p class="sub">من ${esc(bk.screen_name || bk.screen_key)} — ${fmtDate(bk.created)}. ستُستبدل إعدادات الشاشة المختارة كلها بإعدادات هذه النسخة، وتصلها خلال ثوانٍ.</p>
      <form id="rf"><label>إلى الشاشة<select id="r_key">${screens.map(s => `<option value="${s.key}" ${s.key === (preKey || bk.screen_key) ? 'selected' : ''}>${esc(s.name)} — ${s.key}</option>`).join('')}</select></label>
      <div class="mact"><button class="btn primary" type="submit">استعادة</button><button class="btn ghost" type="button" data-close>إلغاء</button></div></form>`, (m, close) => {
      $('#rf', m).addEventListener('submit', async e => {
        e.preventDefault(); const key = $('#r_key', m).value;
        try { await api(`/api/backups/${bk.id}/restore`, { method: 'POST', body: { key } }); close(); toast('تمت الاستعادة ✓'); if (cur && cur.key === key) { cur = null; } go('#/screen/' + key); }
        catch (err) { toast(err.message, 5000); }
      });
    });
  }
  /* a self-contained file: settings + every image and sound embedded */
  async function downloadBackup(id) {
    try {
      toast('جارٍ تجهيز الملف مع الصور…', 8000);
      const bk = (await api('/api/backups/' + id)).backup, txt = JSON.stringify(bk.settings || {});
      const media = {};
      for (const mid of new Set(txt.match(/m_[a-z0-9]{10,}/g) || [])) {
        const r = await fetch('/api/media/' + mid); if (!r.ok) continue;
        const b = await r.blob(); media[mid] = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
      }
      const blob = new Blob([JSON.stringify({ app: 'hayya-tv', v: 2, name: bk.name, screen: bk.screen_name, exportedAt: new Date(bk.created).toISOString(), settings: bk.settings, media })], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `hayya-backup-${(bk.screen_name || bk.screen_key || 'screen').replace(/\s+/g, '-')}-${new Date(bk.created).toISOString().slice(0, 10)}.json`; a.click();
    } catch (e) { toast(e.message, 5000); }
  }

  /* ---------- plans ---------- */
  const FEATURES = [
    ['مواقيت الصلاة والإقامة بكل طرق الحساب', 1, 1], ['الجمعة ورمضان والتراويح والتهجد', 1, 1], ['الأذكار والأحاديث مع العدد والمدة', 1, 1],
    ['كل القوالب والتصميم والشعار والأعلام', 1, 1], ['معرض الصور وشريط الأخبار والإعلانات', 1, 1], ['التنبيهات والأصوات ووضع السكون', 1, 1],
    ['التعديل من الشاشة بالريموت', 1, 1], ['يعمل بدون إنترنت', 1, 1], ['بدون أي إعلانات على الشاشة', 1, 1],
    ['ربط الشاشة باللوحة ومتابعة حالتها', 1, 1],
    ['التعديل من الكمبيوتر مع المعاينة الحيّة', 0, 1], ['مزامنة في الاتجاهين بين الشاشة واللوحة', 0, 1], ['نسخ احتياطية يومية ونقلها لجهاز آخر', 0, 1],
    ['نسخ الإعدادات بين عدة شاشات', 0, 1], ['أوامر عن بُعد (إعادة تشغيل، تحديث، دعم فني)', 0, 1],
  ];
  async function plansPage() {
    shell(`<div class="loading">جارٍ التحميل…</div>`, 'plans');
    try { screens = (await api('/api/screens')).screens; } catch (e) { }
    const yes = '<span class="yes" aria-label="متاح">✓</span>', no = '<span class="no" aria-label="غير متاح">—</span>';
    const rows = FEATURES.map(([t, f, p]) => `<tr><td>${t}</td><td>${f ? yes : no}</td><td>${p ? yes : no}</td></tr>`).join('');
    const mine = screens.map(sc => `<tr><td><b>${esc(sc.name)}</b> <code dir="ltr">${sc.key}</code></td><td>${planPill(sc.plan)}</td><td class="num">${sc.plan && sc.plan.until ? dshort(sc.plan.until) : '—'}</td><td><button class="btn ghost" data-rd="${sc.key}">تفعيل بكود</button></td></tr>`).join('');
    $('.page').innerHTML = `<div class="phead"><div><h1>الخطط</h1><p class="sub">كل شاشة تعمل كاملة بدون إنترنت وبدون أي إعلانات. الخطة تحدد إدارتها من الكمبيوتر أو الجوال.</p></div></div>
      <div class="plangrid">
        <section class="plancard"><h2>مجانية</h2><div class="price">0</div><p class="sub">شاشة واحدة لكل حساب — مرة واحدة فقط${cfg.freeDays ? ` · لمدة ${cfg.freeDays} يومًا` : ''}. تُحسب أول شاشة تربطها، ولا تنتقل لشاشة أخرى عند فك الربط.</p></section>
        <section class="plancard pro"><h2>مدى الحياة</h2><div class="price">${esc(cfg.priceText || 'السعر يحدده مزوّد الخدمة')}</div><p class="sub">لكل شاشة إضافية · كود تفعيل يُشترى مرة واحدة، بدون تجديد</p></section>
      </div>
      <div class="tablewrap"><table class="btable cmp"><thead><tr><th>الميزة</th><th>بدون لوحة</th><th>مع اللوحة</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="dgrid" style="margin-top:1rem">
        <article class="dcard"><h3>طريقة الاشتراك</h3><p>${cfg.salesContact ? 'تواصل معنا لشراء كود التفعيل، ثم أدخله على الشاشة التي تريدها:' : 'اطلب كود التفعيل من مزوّد الخدمة، ثم أدخله على الشاشة التي تريدها.'}</p>${cfg.salesContact ? `<div class="url big" dir="auto">${esc(cfg.salesContact)}</div><button class="btn ghost" id="cpSales">نسخ</button>` : ''}</article>
        <article class="dcard"><h3>بدون إنترنت أو دفع إلكتروني؟</h3><p>اطلب «نسخة مفعّلة» من التطبيق (APK أو HTML): كود التفعيل مضمَّن بداخلها، فتتفعّل الشاشة وحدها مدى الحياة عند أول اتصال بالإنترنت، بدون كتابة أي كود.</p></article>
      </div>
      ${screens.length ? `<h2 style="margin:1.6rem 0 .6rem">شاشاتك</h2><div class="tablewrap"><table class="btable"><thead><tr><th>الشاشة</th><th>الحالة</th><th>حتى</th><th></th></tr></thead><tbody>${mine}</tbody></table></div>` : ''}`;
    $$('[data-rd]').forEach(b => b.onclick = () => redeemDialog(b.dataset.rd));
    const cp = $('#cpSales'); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(cfg.salesContact); toast('تم النسخ'); } catch (e) { toast(cfg.salesContact, 6000); } };
  }

  /* ---------- admin (ADMIN_PHONES only) ---------- */
  function showGenerated(codes, days) {
    const out = $('#genOut'); if (!out) return;
    const txt = codes.join('\n');
    out.innerHTML = `<div class="dcard" style="margin-bottom:1rem"><h3>تم توليد ${codes.length} كود (${+days ? days + ' يوم' : 'مدى الحياة'})</h3><textarea readonly rows="${Math.min(10, codes.length)}" dir="ltr" style="font-family:ui-monospace,monospace;width:100%">${txt}</textarea><div class="sc-act"><button class="btn ghost" id="cpCodes">نسخ الكل</button><button class="btn ghost" id="csvCodes">تنزيل CSV</button></div></div>`;
    $('#cpCodes').onclick = async () => { try { await navigator.clipboard.writeText(txt); toast('تم النسخ'); } catch (er) { $('#genOut textarea').select(); } };
    $('#csvCodes').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeffcode,days\n' + codes.map(c => `${c},${+days ? days : 'lifetime'}`).join('\n')], { type: 'text/csv' })); a.download = `hayya-codes-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); };
  }
  async function adminPage(tab) {
    tab = tab || 'screens';
    shell(`<div class="loading">جارٍ التحميل…</div>`, 'admin');
    let st = {}, list = [];
    try { st = await api('/api/admin/stats'); list = tab === 'codes' ? (await api('/api/admin/codes')).codes : (await api('/api/admin/screens')).screens; }
    catch (e) { $('.page').innerHTML = `<p class="formerr">${esc(e.message)}</p>`; return; }
    const tiles = [['الشاشات', st.screens], ['مشتركة', st.paid], ['متصلة الآن', st.online], ['الحسابات', st.users], ['أكواد غير مستخدمة', st.freeCodes]]
      .map(([l, v]) => `<div class="tile"><b class="num">${v || 0}</b><span>${l}</span></div>`).join('');
    let body = '';
    if (tab === 'codes') {
      body = `<form id="genf" class="genf"><label>العدد<input id="g_n" type="number" min="1" max="200" value="10" dir="ltr"></label><label class="chk"><input id="g_life" type="checkbox" checked> مدى الحياة</label><label>أو المدة (يوم)<input id="g_d" type="number" min="1" max="3650" value="365" dir="ltr" disabled></label><label>ملاحظة<input id="g_note" placeholder="مثلاً: دفعة نوفمبر — موزّع جدة"></label><button class="btn primary">توليد الأكواد</button></form>
        <div id="genOut"></div>
        <article class="dcard" style="margin:1rem 0"><h3>نسخ مفعّلة (APK أو HTML) — كود مختلف داخل كل نسخة</h3>
          <p class="sub">للعميل الذي لا يستطيع الشراء من الإنترنت: اختر ملف التطبيق الرسمي (hayya-tv.apk الموقّع أو ملف HTML)، وحدد عدد النسخ، فيُولَّد لكل نسخة كود مدى الحياة ويُضمَّن بداخلها. تنزل النسخ في ملف ZIP واحد مع قائمة الأكواد. عند تثبيت النسخة وتشغيلها تتفعّل الشاشة وحدها عند أول اتصال بالإنترنت. توقيع ملف APK لا يتغير.</p>
          <form id="cpf" class="genf"><label>ملف التطبيق<input id="c_file" type="file" accept=".apk,.html,.htm"></label><label>عدد النسخ<input id="c_n" type="number" min="1" max="50" value="1" dir="ltr"></label><label>اسم العميل / ملاحظة<input id="c_note" placeholder="مثلاً: جامع النور — الرياض"></label><button class="btn primary">توليد النسخ</button></form>
          <p class="sub" id="c_stat"></p></article>
        <div class="tablewrap"><table class="btable"><thead><tr><th>الكود</th><th>المدة</th><th>ملاحظة</th><th>أُنشئ</th><th>الحالة</th><th></th></tr></thead><tbody>${list.map(c => `<tr><td><code dir="ltr">${c.code}</code></td><td class="num">${+c.days ? c.days + ' يوم' : 'مدى الحياة'}${c.kind === 'apk' ? ' · نسخة مفعّلة' : ''}</td><td>${esc(c.note || '')}</td><td class="num">${dshort(c.created)}</td><td>${c.used_at ? `مستخدم — <code dir="ltr">${esc(c.used_screen || '')}</code> ${dshort(c.used_at)}` : '<span class="pill on">متاح</span>'}</td><td>${c.used_at ? '' : `<button class="btn ghost danger" data-delc="${c.code}">حذف</button>`}</td></tr>`).join('')}</tbody></table></div>`;
    } else {
      body = `<div class="tablewrap"><table class="btable"><thead><tr><th>الشاشة</th><th>المالك</th><th>الحالة</th><th>حتى</th><th>آخر اتصال</th><th></th></tr></thead><tbody>${list.map(sc => `<tr><td><b>${esc(sc.name || '—')}</b> <code dir="ltr">${sc.key}</code></td><td>${sc.owner ? `${esc(sc.owner.name || '')} <span dir="ltr" class="sub">${esc(sc.owner.phone)}</span>` : '<span class="sub">غير مرتبطة</span>'}</td><td>${planPill(sc.plan)}</td><td class="num">${sc.plan && sc.plan.until ? dshort(sc.plan.until) : '—'}</td><td>${ago(sc.lastSeen)}</td><td class="acts"><button class="btn ghost" data-ext="${sc.key}" data-life="1">مدى الحياة</button><button class="btn ghost" data-ext="${sc.key}" data-days="365">+ سنة</button><button class="btn ghost" data-ext="${sc.key}" data-days="30">+ شهر</button><button class="btn ghost danger" data-ext="${sc.key}" data-days="0">إيقاف</button></td></tr>`).join('')}</tbody></table></div>`;
    }
    $('.page').innerHTML = `<div class="phead"><div><h1>الإدارة</h1><p class="sub">تفعيل الشاشات يدويًا، وتوليد أكواد التفعيل لبيعها، وتوليد نسخ APK / HTML مفعّلة.</p></div></div>
      <div class="tiles">${tiles}</div>
      <div class="chips tabsbar"><a class="chip ${tab === 'screens' ? 'on' : ''}" href="#/admin/screens">كل الشاشات</a><a class="chip ${tab === 'codes' ? 'on' : ''}" href="#/admin/codes">أكواد التفعيل</a></div>${body}`;
    $$('[data-ext]').forEach(b => b.onclick = async () => {
      const d = +b.dataset.days;
      try { const r = await api(`/api/admin/screens/${b.dataset.ext}/extend`, { method: 'POST', body: { days: d, lifetime: !!b.dataset.life } }); toast(b.dataset.life ? 'تم التفعيل مدى الحياة' : d ? `تم — مفعّلة حتى ${dshort(r.until)}` : 'تم إيقاف التفعيل'); adminPage('screens'); } catch (e) { toast(e.message); }
    });
    $$('[data-delc]').forEach(b => b.onclick = async () => { try { await api('/api/admin/codes/' + b.dataset.delc, { method: 'DELETE' }); adminPage('codes'); } catch (e) { toast(e.message); } });
    const gf = $('#genf');
    if (gf) gf.onsubmit = async e => {
      e.preventDefault();
      try {
        const r = await api('/api/admin/codes', { method: 'POST', body: { count: $('#g_n').value, lifetime: $('#g_life').checked, days: $('#g_d').value, note: $('#g_note').value } });
        await adminPage('codes');
        showGenerated(r.codes, r.days);
      } catch (err) { toast(err.message, 5000); }
    };
    const gl = $('#g_life'); if (gl) gl.onchange = () => { $('#g_d').disabled = gl.checked; };
    const cf = $('#cpf');
    if (cf) cf.onsubmit = async e => {
      e.preventDefault();
      const f = $('#c_file').files[0], st = $('#c_stat'); if (!f) { toast('اختر ملف التطبيق أولًا'); return; }
      const isHtml = /\.html?$/i.test(f.name), n = Math.max(1, Math.min(50, +$('#c_n').value || 1));
      try {
        st.textContent = 'جارٍ القراءة…';
        const buf = new Uint8Array(await f.arrayBuffer()), text = isHtml ? new TextDecoder().decode(buf) : '';
        if (!isHtml) HayyaStamp.readApkCode(buf);            // checks it is a signed APK before creating codes
        st.textContent = 'جارٍ توليد الأكواد…';
        const r = await api('/api/admin/codes', { method: 'POST', body: { count: n, lifetime: true, kind: 'apk', note: $('#c_note').value || ('نسخة مفعّلة: ' + f.name) } });
        const stem = f.name.replace(/\.[^.]+$/, ''), ext = isHtml ? '.html' : '.apk', files = [];
        for (const c of r.codes) files.push({ name: `${stem}-${c}${ext}`, data: isHtml ? new TextEncoder().encode(HayyaStamp.stampHtml(text, c)) : HayyaStamp.stampApk(buf, c) });
        files.push({ name: 'codes.csv', data: new TextEncoder().encode('\ufeffcode,file,note\n' + r.codes.map((c, i) => `${c},${files[i].name},${($('#c_note').value || '').replace(/,/g, ' ')}`).join('\n')) });
        const a = document.createElement('a'); a.href = URL.createObjectURL(files.length === 2 ? new Blob([files[0].data]) : HayyaStamp.zip(files));
        a.download = files.length === 2 ? files[0].name : `hayya-copies-${new Date().toISOString().slice(0, 10)}.zip`; a.click();
        st.textContent = `تم ✓ — ${r.codes.length} نسخة: ${r.codes.join('، ')}`;
        toast('تم توليد النسخ المفعّلة ✓', 6000);
      } catch (err) { st.textContent = ''; toast(err.message, 6000); }
    };
  }

  /* ---------- router ---------- */
  async function route() {
    const h = location.hash || '#/screens', parts = h.replace(/^#\/?/, '').split('/');
    if (parts[0] === 'link' && parts[1]) SS.set('hayya_link', fmtKey(parts[1]));
    if (!token) return authPage();
    if (!me) { try { me = (await api('/api/me')).user; } catch (e) { return; } }
    if (parts[0] !== 'screen') { cur = null; clearInterval(pollT); }
    if (parts[0] === 'screen' && parts[1]) return editorPage(parts[1], parts[2]);
    if (parts[0] === 'download') return downloadPage();
    if (parts[0] === 'account') return accountPage();
    if (parts[0] === 'backups') return backupsPage();
    if (parts[0] === 'plans') return plansPage();
    if (parts[0] === 'admin' && me.isAdmin) return adminPage(parts[1]);
    if (parts[0] === 'link') return screensPage(SS.get('hayya_link'));
    if (parts[0] === 'login' || parts[0] === 'register') return go('#/screens');
    return screensPage();
  }
  addEventListener('hashchange', route);
  (async () => { try { cfg = await (await fetch('/api/config')).json(); } catch (e) { } route(); })();
})();
