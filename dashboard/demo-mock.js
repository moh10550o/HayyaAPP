/* ================= Demo mode: an in-browser stand-in for the server =================
   Used only by the public preview. Everything is kept in this browser. */
(() => {
  DASH.demo = true; DASH.appUrl = 'app.html';
  const LS = 'hayya_demo_db3';
  const LIFETIME = 4102444800000;
  const now = () => Date.now();
  const seed = () => ({
    user: { id: 'u_demo', phone: '+966500000000', name: 'جامع الروضة (تجريبي)', isAdmin: true },
    codes: [{ code: 'HAYYA-DEMO-2026-0001', days: 0, note: 'كود تجريبي — مدى الحياة', created: now() }, { code: 'HAYYA-DEMO-2026-0002', days: 0, note: 'كود تجريبي — مدى الحياة', created: now() }],
    freeScreen: '73019-26485',
    backups: [],
    pending: { '48213-90576': { name: '' } },
    screens: [
      { key: '73019-26485', name: 'الشاشة الرئيسية — مصلى الرجال', ver: 1, lastSeen: now() - 20000, info: { w: 1920, h: 1080, apk: '1.0.0', city: 'جدة' },
        settings: { name: { l1: 'جامع الروضة', l2: 'حي الروضة — جدة' }, design: { tpl: 'emerald' } } },
      { key: '51870-34962', name: 'شاشة مصلى النساء', ver: 1, lastSeen: now() - 5 * 3600e3, info: { w: 1080, h: 1920, apk: '1.0.0', city: 'جدة' },
        settings: { name: { l1: 'جامع الروضة', l2: 'مصلى النساء' }, design: { tpl: 'night' }, orientation: 'portrait' } },
    ],
  });
  let db; try { db = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { }
  if (!db || !db.backups || !db.codes) db = seed();
  if (!db.backups.length) db.screens.forEach((s, i) => db.backups.push({ id: 'b_demo' + i, screen_key: s.key, screen_name: s.name, name: 'نسخة تلقائية', auto: 1, created: now() - (i + 1) * 3600e3, media: 0, settings: JSON.parse(JSON.stringify(s.settings)) }));
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(db)); } catch (e) { } };
  try { localStorage.setItem('hayya_dash_token', 'demo'); } catch (e) { }
  // same rules as the server: lifetime codes; the first screen of the account is free (once)
  const planOf = s => s.plan_until >= LIFETIME ? { active: true, kind: 'lifetime', until: s.plan_until } : s.plan_until > now() ? { active: true, kind: 'paid', until: s.plan_until } : db.freeScreen === s.key ? { active: true, kind: 'free', until: 0 } : { active: false, kind: 'needCode', until: s.plan_until || 0 };
  const view = s => ({ ...s, online: now() - (s.lastSeen || 0) < 180000, plan: planOf(s) });
  const need = () => fail(402, 'النسخة المجانية تشمل شاشة واحدة لكل حساب — فعّل هذه الشاشة بكود مدى الحياة. في النسخة التجريبية جرّب الكود HAYYA-DEMO-2026-0001');
  const ok = (data, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }));
  const fail = (status, message) => ok({ error: 'x', message }, status);
  const norm = k => { const raw = String(k || '').toUpperCase(), d = raw.replace(/[^0-9]/g, ''), c = raw.replace(/[^0-9A-Z]/g, ''); if (d.length === 10 && d === c) return d.slice(0, 5) + '-' + d.slice(5); return c.length === 8 && /[A-Z]/.test(c) ? c.slice(0, 4) + '-' + c.slice(4) : null; };
  const realFetch = window.fetch.bind(window);
  window.fetch = async (url, opt = {}) => {
    const u = typeof url === 'string' ? url : url.url;
    if (!/^\/api\//.test(u)) return realFetch(url, opt);
    const m = (opt.method || 'GET').toUpperCase(), p = u.replace(/\?.*$/, ''), seg = p.split('/').slice(2);
    let b = {}; try { b = opt.body && typeof opt.body === 'string' ? JSON.parse(opt.body) : {}; } catch (e) { }
    // keep the main screen "online" while the demo is open
    db.screens[0] && (db.screens[0].lastSeen = now() - 15000);
    if (p === '/api/config') return ok({ apkUrl: '', playUrl: '', needsCode: false, priceText: '299 ريال مرة واحدة لكل شاشة (مثال)', salesContact: 'واتساب: 05xxxxxxxx (مثال)', trialDays: 0, freeDays: 0 });
    if (p === '/api/admin/stats') return ok({ screens: db.screens.length, paid: db.screens.filter(s => planOf(s).active).length, users: 1, freeCodes: db.codes.filter(c => !c.used_at).length, online: 1 });
    if (p === '/api/admin/screens') return ok({ screens: db.screens.map(s => ({ ...view(s), owner: { phone: db.user.phone, name: db.user.name } })) });
    if (p === '/api/admin/codes' && m === 'GET') return ok({ codes: db.codes.slice().sort((a, c) => c.created - a.created) });
    if (p === '/api/admin/codes' && m === 'POST') { const n = Math.min(50, +b.count || 1), out = []; for (let i = 0; i < n; i++) { const c = 'HAYYA-' + [0, 1, 2].map(() => Math.random().toString(36).slice(2, 6).toUpperCase()).join('-'); const days = b.lifetime === false ? (+b.days || 365) : 0; db.codes.push({ code: c, days, kind: b.kind || null, note: b.note || '', created: now() }); out.push(c); } save(); return ok({ codes: out, days: b.lifetime === false ? (+b.days || 365) : 0 }); }
    if (seg[0] === 'admin' && seg[1] === 'screens' && seg[3] === 'extend') { const s = db.screens.find(x => x.key === seg[2]); const d = +b.days; s.plan_until = b.lifetime ? LIFETIME : d ? Math.max(now(), s.plan_until || 0) + d * 864e5 : 0; save(); return ok({ until: s.plan_until }); }
    if (seg[0] === 'admin' && seg[1] === 'codes' && m === 'DELETE') { db.codes = db.codes.filter(c => c.code !== seg[2] || c.used_at); save(); return ok({ ok: true }); }
    if (p === '/api/auth/otp') { const d = String(b.phone || '').replace(/\D/g, ''); if (d.length < 9) return fail(400, 'رقم الجوال غير صحيح — اكتبه مثل 05xxxxxxxx'); return ok({ sent: true, phone: '+966' + d.replace(/^0/, '').replace(/^966/, ''), isNew: false, resendIn: 45, devCode: '123456' }); }
    if (p === '/api/auth/verify') { if (String(b.code) !== '123456') return fail(401, 'الرمز غير صحيح — في النسخة التجريبية الرمز هو 123456'); try { localStorage.setItem('hayya_dash_token', 'demo'); } catch (e) { } return ok({ token: 'demo', user: db.user }); }
    if (p === '/api/auth/logout-all') return ok({ ok: true });
    if (p === '/api/backups' && m === 'GET') return ok({ backups: db.backups.map(x => ({ ...x, settings: undefined })).sort((a, c) => c.created - a.created) });
    if (seg[0] === 'backups' && seg[1]) {
      const bk = db.backups.find(x => x.id === seg[1]); if (!bk) return fail(404, 'النسخة غير موجودة');
      if (!seg[2] && m === 'GET') return ok({ backup: bk });
      if (!seg[2] && m === 'DELETE') { db.backups = db.backups.filter(x => x !== bk); save(); return ok({ ok: true }); }
      if (seg[2] === 'restore') { const t = db.screens.find(x => x.key === b.key); if (!t) return fail(404, 'الشاشة غير موجودة'); t.settings = JSON.parse(JSON.stringify(bk.settings)); t.ver++; save(); return ok({ ok: true }); }
    }
    if (p === '/api/me' && m === 'GET') return ok({ user: db.user });
    if (p === '/api/me' && m === 'PUT') { db.user.name = b.name; save(); return ok({ ok: true }); }
    if (p === '/api/auth/logout') { try { localStorage.removeItem(LS); } catch (e) { } db = seed(); return ok({ ok: true }); }
    if (p === '/api/auth/password') return ok({ ok: true });
    if (p === '/api/media' && m === 'POST') {   // keep uploads as data: URLs so the preview can show them
      const blob = opt.body; const id = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
      return ok({ id });
    }
    if (p === '/api/screens' && m === 'GET') return ok({ screens: db.screens.map(view) });
    if (p === '/api/screens/link') {
      const key = norm(b.key); if (!key) return fail(400, 'رقم الشاشة يتكوّن من 10 أرقام مثل 48213-90576');
      if (db.screens.some(s => s.key === key)) return fail(409, 'هذه الشاشة مرتبطة بحسابك مسبقًا');
      if (!db.pending[key]) return fail(404, 'لا توجد شاشة بهذا الرقم — في النسخة التجريبية جرّب الرقم 48213-90576');
      delete db.pending[key];
      const s = { key, name: b.name || 'شاشة جديدة', ver: 0, lastSeen: now(), info: { w: 1920, h: 1080, apk: '1.0.0' }, settings: {} };
      let free = false; if (!db.freeScreen) { db.freeScreen = key; free = true; }
      db.screens.push(s); save(); const v = view(s); return ok({ screen: v, free, needCode: !v.plan.active });
    }
    if (p === '/api/screens/copy') { let n = 0; const from = db.screens.find(s => s.key === b.from); (b.to || []).forEach(k => { const t = db.screens.find(s => s.key === k); if (t && from) { t.settings = JSON.parse(JSON.stringify(from.settings)); t.ver++; n++; } }); save(); return ok({ copied: n }); }
    if (seg[0] === 'screens' && seg[1]) {
      const s = db.screens.find(x => x.key === seg[1]); if (!s) return fail(404, 'الشاشة غير موجودة في حسابك');
      if (!seg[2] && m === 'GET') return ok({ screen: view(s) });
      if (seg[2] === 'redeem') { const code = String(b.code || '').toUpperCase().trim(), c = db.codes.find(x => x.code === code); if (!c) return fail(404, 'كود التفعيل غير صحيح — في النسخة التجريبية جرّب HAYYA-DEMO-2026-0001'); if (c.used_at) return fail(409, 'هذا الكود مستخدم من قبل'); c.used_at = now(); c.used_screen = s.key; s.plan_until = +c.days ? Math.max(now(), s.plan_until || 0) + c.days * 864e5 : LIFETIME; save(); return ok({ ok: true, until: s.plan_until, days: c.days, lifetime: !+c.days }); }
      if (!seg[2] && m === 'PUT') { if (typeof b.name === 'string') s.name = b.name; if (b.settings) { if (!planOf(s).active) return need(); s.settings = b.settings; s.ver++; } save(); return ok({ ok: true, ver: s.ver }); }
      if (!seg[2] && m === 'DELETE') { db.screens = db.screens.filter(x => x !== s); if (!/forever=1/.test(u)) db.pending[s.key] = {}; save(); return ok({ ok: true }); }
      if (seg[2] === 'command') return planOf(s).active || b.cmd === 'identify' ? ok({ ok: true }) : need();
      if (seg[2] === 'backups' && !planOf(s).active) return need();
      if (seg[2] === 'backups') { db.backups.push({ id: 'b_' + now(), screen_key: s.key, screen_name: s.name, name: b.name || 'نسخة يدوية', auto: 0, created: now(), media: (JSON.stringify(s.settings).match(/data:/g) || []).length, settings: JSON.parse(JSON.stringify(s.settings)) }); save(); return ok({ ok: true }); }
    }
    return fail(404, 'not found');
  };
})();
