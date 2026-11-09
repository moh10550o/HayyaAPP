/* =====================================================================
   Hayya Masjid TV — dashboard & sync server
   Runs on Cloudflare Workers (D1 database + KV for media + static assets),
   or on any machine with Node 22 through node-server.js (same code).
   ===================================================================== */

const KEY_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I
const SESSION_DAYS = 30;
const MAX_MEDIA = 20 * 1024 * 1024;
const ONLINE_MS = 3 * 60 * 1000;

/* ---------------- helpers ---------------- */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Screen-Key,X-Screen-Secret',
  'Access-Control-Max-Age': '86400',
};
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS, ...extra } });
const err = (status, code, message) => json({ error: code, message }, status);
const now = () => Date.now();
const b64 = buf => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); };
const randBytes = n => crypto.getRandomValues(new Uint8Array(n));
const randToken = (n = 32) => b64(randBytes(n)).replace(/[+/=]/g, c => ({ '+': '-', '/': '_', '=': '' }[c]));
const randId = (prefix, n = 14) => prefix + Array.from(randBytes(n), b => KEY_ALPHABET[b % 32]).join('').toLowerCase();
/* screen number: 10 digits, never starting with 0, unique (checked on registration), shown as 12345-67890.
   Unbiased random digits from the system CSPRNG. Older 8-character keys (7K3Q-X29M) are still accepted. */
function newScreenKey() {
  let s = '';
  while (s.length < 10) { const b = randBytes(16); for (const x of b) { if (x < 250 && s.length < 10) { const d = x % 10; if (!(s.length === 0 && d === 0)) s += d; } } }
  return s.slice(0, 5) + '-' + s.slice(5);
}
const normKey = k => {
  const raw = String(k || '').toUpperCase(), d = raw.replace(/[^0-9]/g, ''), c = raw.replace(/[^0-9A-Z]/g, '');
  if (d.length === 10 && d === c) return d.slice(0, 5) + '-' + d.slice(5);
  return c.length === 8 && /[A-Z]/.test(c) ? c.slice(0, 4) + '-' + c.slice(4) : null;
};
/* simple fixed-window rate limit stored in the database: true = allowed */
async function hit(env, k, max, winMs) {
  const t = now(), row = await env.DB.prepare('SELECT n, win FROM limits WHERE k = ?').bind(k).first();
  if (!row || t - row.win > winMs) { await env.DB.prepare('INSERT OR REPLACE INTO limits (k, n, win) VALUES (?, 1, ?)').bind(k, t).run(); return true; }
  if (row.n >= max) return false;
  await env.DB.prepare('UPDATE limits SET n = n + 1 WHERE k = ?').bind(k).run(); return true;
}
/* failed attempts only: limited() checks, failed() counts one more */
async function limited(env, k, max, winMs) { const row = await env.DB.prepare('SELECT n, win FROM limits WHERE k = ?').bind(k).first(); return !!row && now() - row.win <= winMs && row.n >= max; }
async function failed(env, k, winMs) { const t = now(), row = await env.DB.prepare('SELECT n, win FROM limits WHERE k = ?').bind(k).first(); if (!row || t - row.win > winMs) await env.DB.prepare('INSERT OR REPLACE INTO limits (k, n, win) VALUES (?, 1, ?)').bind(k, t).run(); else await env.DB.prepare('UPDATE limits SET n = n + 1 WHERE k = ?').bind(k).run(); }
const clientIp = req => req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'local';
/* security headers for every response */
const SEC = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'SAMEORIGIN',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains', 'Permissions-Policy': 'camera=(), geolocation=(self), microphone=(self)',
};
function secure(res) { const h = new Headers(res.headers); for (const [k, v] of Object.entries(SEC)) if (!h.has(k)) h.set(k, v); return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h }); }
async function sha256(text) { return b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))); }
async function pbkdf2(password, saltB64) {
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  return b64(bits);
}
function safeEqual(a, b) { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
async function body(req) { try { return await req.json(); } catch (e) { return {}; } }
const parse = s => { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } };
const isEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

/* ---------------- phone numbers & SMS ---------------- */
const OTP_TTL = 5 * 60 * 1000, OTP_RESEND = 45 * 1000, OTP_WINDOW = 10 * 60 * 1000, OTP_MAX_SENDS = 3, OTP_MAX_TRIES = 5;
/* digits only, international form without + (Saudi local numbers like 05xxxxxxxx become 9665xxxxxxxx) */
function normPhone(v, cc) {
  cc = String(cc || '966').replace(/\D/g, '');
  let d = String(v || '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = cc + d.slice(1);
  else if (d.length <= 9) d = cc + d;
  return /^\d{10,15}$/.test(d) ? d : null;
}
const otpHash = (env, phone, code) => sha256(`${phone}:${code}:${env.OTP_SECRET || 'hayya'}`);
async function sendSms(env, phone, text) {
  const pr = (env.SMS_PROVIDER || 'console').toLowerCase();
  if (pr === 'taqnyat') {          // https://dev.taqnyat.sa/en/doc/sms
    const r = await fetch('https://api.taqnyat.sa/v1/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + env.TAQNYAT_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ recipients: [phone], body: text, sender: env.TAQNYAT_SENDER }) });
    if (!r.ok) throw new Error('Taqnyat ' + r.status + ' ' + (await r.text()).slice(0, 160));
  } else if (pr === 'twilio') {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_SID}/Messages.json`, { method: 'POST', headers: { Authorization: 'Basic ' + btoa(env.TWILIO_SID + ':' + env.TWILIO_TOKEN), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ To: '+' + phone, From: env.TWILIO_FROM, Body: text }) });
    if (!r.ok) throw new Error('Twilio ' + r.status + ' ' + (await r.text()).slice(0, 160));
  } else if (pr === 'webhook') {    // any other provider: your own endpoint receives {phone, message}
    const r = await fetch(env.SMS_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(env.SMS_WEBHOOK_TOKEN ? { Authorization: 'Bearer ' + env.SMS_WEBHOOK_TOKEN } : {}) }, body: JSON.stringify({ phone: '+' + phone, message: text }) });
    if (!r.ok) throw new Error('webhook ' + r.status);
  } else {
    if (env.DEV_SHOW_CODE !== '1') throw new Error('لم يُضبط مزوّد الرسائل SMS_PROVIDER في الخادم');
    console.log(`[SMS to +${phone}] ${text}`);
  }
}

/* ---------------- backups ---------------- */
const countMedia = txt => new Set((String(txt || '').match(/m_[a-z0-9]{10,}/g) || [])).size;
async function saveBackup(env, owner, screen, name, auto) {
  const id = randId('b_', 12), txt = screen.settings || '{}';
  await env.DB.prepare('INSERT INTO backups (id, owner, screen_key, screen_name, name, auto, created, size, media, settings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, owner, screen.key, screen.name || '', name, auto ? 1 : 0, now(), txt.length, countMedia(txt), txt).run();
  return id;
}
/* one automatic backup per screen per day, the last 14 are kept */
async function autoBackup(env, owner, screen) {
  const last = await env.DB.prepare('SELECT created FROM backups WHERE screen_key = ? AND owner = ? AND auto = 1 ORDER BY created DESC LIMIT 1').bind(screen.key, owner).first();
  if (last && now() - last.created < 864e5) return;
  await saveBackup(env, owner, screen, 'نسخة تلقائية', 1);
  await env.DB.prepare('DELETE FROM backups WHERE id IN (SELECT id FROM backups WHERE screen_key = ? AND owner = ? AND auto = 1 ORDER BY created DESC LIMIT -1 OFFSET 14)').bind(screen.key, owner).run();
}

/* ---------------- auth ---------------- */
async function currentUser(req, env) {
  const h = req.headers.get('Authorization') || '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tok) return null;
  const row = await env.DB.prepare('SELECT s.uid, s.exp, u.phone, u.name, u.trial_until, u.free_screen, u.free_at FROM sessions s JOIN users u ON u.id = s.uid WHERE s.token = ?').bind(await sha256(tok)).first();
  if (!row || row.exp < now()) return null;
  return { id: row.uid, phone: row.phone ? '+' + row.phone : '', phoneRaw: row.phone || '', name: row.name, trial_until: row.trial_until || 0, free_screen: row.free_screen || '', free_at: row.free_at || 0 };
}
async function newSession(env, uid) {
  const tok = randToken();
  await env.DB.prepare('INSERT INTO sessions (token, uid, exp) VALUES (?, ?, ?)').bind(await sha256(tok), uid, now() + SESSION_DAYS * 864e5).run();
  return tok;
}
async function deviceAuth(req, env) {
  const key = normKey(req.headers.get('X-Screen-Key')), secret = req.headers.get('X-Screen-Secret') || '';
  if (!key || !secret) return null;
  const row = await env.DB.prepare('SELECT * FROM screens WHERE key = ?').bind(key).first();
  if (!row || !safeEqual(row.secret_hash, await sha256(secret))) return null;
  return row;
}
/* ---------------- plans ----------------
   Every screen works fully on its own, without the internet and without any code.
   Dashboard management (remote editing, two-way sync, backups, copying, remote commands):
   · Free: ONE screen per account, once only — the first screen the account links. Unlinking it does not
     free the slot for another screen, and a device that already used a free slot cannot get another one
     under a different account. FREE_DAYS limits it (0 / empty = no end).
   · Paid: each further screen needs an activation code, bought once for life (codes can also carry days).
   An activation code can also be built into an APK copy: the screen redeems it by itself when it first connects. */
const DAY_MS = 864e5;
const LIFETIME = 4102444800000;   // 2100-01-01: "for life"
const freeDays = env => (env.FREE_DAYS === undefined || env.FREE_DAYS === '' ? 0 : Math.max(0, +env.FREE_DAYS || 0));
const trialDays = freeDays;
function planOf(screen, owner, env) {
  const until = +screen.plan_until || 0, t = now();
  if (until >= LIFETIME) return { active: true, kind: 'lifetime', until };
  if (until > t) return { active: true, kind: 'paid', until };
  if (owner && owner.free_screen && owner.free_screen === screen.key) {
    const fd = freeDays(env || ENV || {}), end = fd ? (+owner.free_at || 0) + fd * DAY_MS : 0;
    if (!end || end > t) return { active: true, kind: 'free', until: end };
    return { active: false, kind: 'freeEnded', until: end };
  }
  return { active: false, kind: until ? 'expired' : 'needCode', until };
}
/* the free slot: given once per account and once per device */
async function grantFree(env, user, key, did) {
  if (user.free_screen) return false;
  if (did) { const used = await env.DB.prepare('SELECT uid FROM free_devices WHERE did = ?').bind(did).first(); if (used && used.uid !== user.id) return false; }
  const r = await env.DB.prepare("UPDATE users SET free_screen = ?, free_at = ? WHERE id = ? AND (free_screen IS NULL OR free_screen = '')").bind(key, now(), user.id).run();
  if (!(r.meta && r.meta.changes)) return false;
  if (did) await env.DB.prepare('INSERT OR REPLACE INTO free_devices (did, uid, key, at) VALUES (?, ?, ?, ?)').bind(did, user.id, key, now()).run();
  user.free_screen = key; user.free_at = now();
  return true;
}
/* redeem an activation code for a screen (from the dashboard, the screen itself, or built into an APK) */
async function redeemCode(env, key, code, uid) {
  const c = code && await env.DB.prepare('SELECT * FROM codes WHERE code = ?').bind(code).first();
  if (!c) return { error: [404, 'code', 'كود التفعيل غير صحيح — تأكد من كتابته كما هو'] };
  const row = await env.DB.prepare('SELECT plan_until FROM screens WHERE key = ?').bind(key).first();
  if (c.used_at) return c.used_screen === key ? { ok: true, until: +row.plan_until || 0, days: c.days, again: true } : { error: [409, 'code', 'هذا الكود مستخدم على شاشة أخرى'] };
  const until = !(+c.days > 0) ? LIFETIME : Math.max(now(), +row.plan_until || 0) + c.days * DAY_MS;
  const r = await env.DB.prepare('UPDATE codes SET used_screen = ?, used_by = ?, used_at = ? WHERE code = ? AND used_at IS NULL').bind(key, uid || '', now(), code).run();
  if (!(r.meta && r.meta.changes)) return { error: [409, 'code', 'هذا الكود مستخدم من قبل'] };
  await env.DB.prepare('UPDATE screens SET plan_until = ? WHERE key = ?').bind(Math.max(until, +row.plan_until || 0), key).run();
  return { ok: true, until, days: c.days };
}
const needPlan = () => err(402, 'plan', 'إدارة هذه الشاشة من اللوحة تحتاج كود تفعيل (يُشترى مرة واحدة مدى الحياة). النسخة المجانية تشمل شاشة واحدة فقط لكل حساب. الشاشة نفسها تعمل كاملة بآخر إعداداتها.');
const isAdmin = (env, user) => !!user && !!user.phoneRaw && String(env.ADMIN_PHONES || '').split(',').map(x => normPhone(x, env.DEFAULT_COUNTRY_CODE)).filter(Boolean).includes(user.phoneRaw);
const CODE_ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const newCode = () => 'HAYYA-' + [0, 1, 2].map(() => Array.from(randBytes(4), b => CODE_ALPHA[b % 32]).join('')).join('-');
const normCode = c => { const d = String(c || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^HAYYA/, ''); return d.length === 12 ? 'HAYYA-' + d.slice(0, 4) + '-' + d.slice(4, 8) + '-' + d.slice(8) : null; };
let schemaReady = false, ENV = null;
async function ensureSchema(env) {      // adds the plan columns to databases created by older versions
  if (schemaReady) return; schemaReady = true;
  for (const sql of ['ALTER TABLE screens ADD COLUMN plan_until INTEGER', 'ALTER TABLE users ADD COLUMN trial_until INTEGER',
    'CREATE TABLE IF NOT EXISTS codes (code TEXT PRIMARY KEY, days INTEGER NOT NULL, note TEXT, created INTEGER, created_by TEXT, used_screen TEXT, used_by TEXT, used_at INTEGER)',
    'CREATE TABLE IF NOT EXISTS limits (k TEXT PRIMARY KEY, n INTEGER, win INTEGER)',
    'ALTER TABLE users ADD COLUMN free_screen TEXT', 'ALTER TABLE users ADD COLUMN free_at INTEGER', 'ALTER TABLE screens ADD COLUMN did TEXT', 'ALTER TABLE codes ADD COLUMN kind TEXT',
    'CREATE TABLE IF NOT EXISTS free_devices (did TEXT PRIMARY KEY, uid TEXT, key TEXT, at INTEGER)']) {
    try { await env.DB.prepare(sql).run(); } catch (e) { /* already there */ }
  }
}

const screenView = (r, withSettings, owner, env) => ({
  key: r.key, name: r.name || '', ver: r.ver || 0, lastSeen: r.last_seen || 0,
  online: !!r.last_seen && now() - r.last_seen < ONLINE_MS, info: parse(r.info) || {},
  plan: planOf(r, owner, env || ENV),
  ...(withSettings ? { settings: parse(r.settings) } : {}),
});

/* ---------------- routes ---------------- */
async function api(req, env, url) {
  const p = url.pathname.replace(/\/+$/, ''), m = req.method;
  const seg = p.split('/').slice(2); // after /api
  await ensureSchema(env); ENV = env;

  if (p === '/api/health') return json({ ok: true, time: now() });
  if (p === '/api/config') return json({ apkUrl: env.APK_URL || '', playUrl: env.PLAY_URL || '', needsCode: !!env.SIGNUP_CODE, priceText: env.PRICE_TEXT || '', salesContact: env.SALES_CONTACT || '', trialDays: 0, freeDays: freeDays(env), country: env.DEFAULT_COUNTRY_CODE || '966', smsReady: (env.SMS_PROVIDER || 'console') !== 'console' || env.DEV_SHOW_CODE === '1', time: now() });

  /* ---- accounts ---- */
  if (p === '/api/auth/otp' && m === 'POST') {
    const b = await body(req), phone = normPhone(b.phone, env.DEFAULT_COUNTRY_CODE);
    if (!phone) return err(400, 'phone', 'رقم الجوال غير صحيح — اكتبه مثل 05xxxxxxxx');
    const allowed = String(env.ALLOWED_PHONES || '').split(',').map(x => normPhone(x, env.DEFAULT_COUNTRY_CODE)).filter(Boolean);
    if (allowed.length && !allowed.includes(phone)) return err(403, 'phone', 'هذا الرقم غير مصرّح له بالدخول إلى اللوحة');
    const user = await env.DB.prepare('SELECT id FROM users WHERE phone = ?').bind(phone).first();
    const row = await env.DB.prepare('SELECT * FROM otps WHERE phone = ?').bind(phone).first();
    const t = now();
    let sends = row && t - row.window_start < OTP_WINDOW ? row.sends : 0, windowStart = row && t - row.window_start < OTP_WINDOW ? row.window_start : t;
    if (sends >= OTP_MAX_SENDS) return err(429, 'rate', 'طلبت رموزًا كثيرة — حاول بعد 10 دقائق');
    if (row && row.sent_at && t - row.sent_at < OTP_RESEND) return err(429, 'wait', `انتظر ${Math.ceil((OTP_RESEND - (t - row.sent_at)) / 1000)} ثانية قبل طلب رمز جديد`);
    const code = String(100000 + (new Uint32Array(randBytes(4).buffer)[0] % 900000));
    try { await sendSms(env, phone, `رمز الدخول إلى لوحة حَيَّ: ${code}\nصالح لمدة 5 دقائق. لا تشاركه مع أحد.`); }
    catch (e) { return err(502, 'sms', 'تعذّر إرسال الرسالة: ' + e.message); }
    await env.DB.prepare('INSERT OR REPLACE INTO otps (phone, code_hash, exp, attempts, sends, window_start, sent_at) VALUES (?, ?, ?, 0, ?, ?, ?)')
      .bind(phone, await otpHash(env, phone, code), t + OTP_TTL, sends + 1, windowStart, t).run();
    const out = { sent: true, phone: '+' + phone, isNew: !user, needsCode: !user && !!env.SIGNUP_CODE, resendIn: OTP_RESEND / 1000 };
    if ((env.SMS_PROVIDER || 'console') === 'console' && env.DEV_SHOW_CODE === '1') out.devCode = code;   // local testing only
    return json(out);
  }
  if (p === '/api/auth/verify' && m === 'POST') {
    const b = await body(req), phone = normPhone(b.phone, env.DEFAULT_COUNTRY_CODE), code = String(b.code || '').replace(/\D/g, '');
    const row = phone && await env.DB.prepare('SELECT * FROM otps WHERE phone = ?').bind(phone).first();
    if (!row || !row.code_hash || row.exp < now()) return err(400, 'expired', 'انتهت صلاحية الرمز — اطلب رمزًا جديدًا');
    if (row.attempts >= OTP_MAX_TRIES) { await env.DB.prepare('UPDATE otps SET code_hash = NULL WHERE phone = ?').bind(phone).run(); return err(429, 'tries', 'محاولات كثيرة — اطلب رمزًا جديدًا'); }
    if (!safeEqual(row.code_hash, await otpHash(env, phone, code))) {
      await env.DB.prepare('UPDATE otps SET attempts = attempts + 1 WHERE phone = ?').bind(phone).run();
      return err(401, 'code', `الرمز غير صحيح — المتبقي ${OTP_MAX_TRIES - row.attempts - 1} محاولات`);
    }
    let u = await env.DB.prepare('SELECT * FROM users WHERE phone = ?').bind(phone).first();
    if (!u) {
      if (env.SIGNUP_CODE && b.signupCode !== env.SIGNUP_CODE) return err(403, 'signup', 'رمز التسجيل غير صحيح — اطلبه من مسؤول النظام');
      u = { id: randId('u_', 12), phone, name: String(b.name || '').trim().slice(0, 120) };
      await env.DB.prepare('INSERT INTO users (id, phone, name, created, trial_until) VALUES (?, ?, ?, ?, ?)').bind(u.id, phone, u.name, now(), 0).run();
    }
    await env.DB.prepare('UPDATE otps SET code_hash = NULL, attempts = 0 WHERE phone = ?').bind(phone).run();
    await env.DB.prepare('DELETE FROM sessions WHERE uid = ? AND exp < ?').bind(u.id, now()).run();
    return json({ token: await newSession(env, u.id), user: { id: u.id, phone: '+' + phone, name: u.name } });
  }

  /* ---- screens (device side) ---- */
  if (p === '/api/device/register' && m === 'POST') {
    if (!await hit(env, 'reg:' + clientIp(req), 30, 3600e3)) return err(429, 'rate', 'محاولات تسجيل كثيرة من هذا الاتصال — حاول لاحقًا');
    const b = await body(req);
    let key, tries = 0;
    do { key = newScreenKey(); tries++; } while (tries < 5 && await env.DB.prepare('SELECT key FROM screens WHERE key = ?').bind(key).first());
    const secret = randToken();
    const did = String((b.info || {}).did || '').slice(0, 80) || null;
    await env.DB.prepare('INSERT INTO screens (key, secret_hash, owner, name, settings, ver, cmds, info, last_seen, created, did) VALUES (?, ?, NULL, ?, ?, 0, ?, ?, ?, ?, ?)')
      .bind(key, await sha256(secret), '', b.settings ? JSON.stringify(b.settings) : null, '[]', JSON.stringify(b.info || {}), now(), now(), did).run();
    return json({ key, secret, ver: 0 });
  }
  if (p === '/api/device/sync' && m === 'POST') {
    const dev = await deviceAuth(req, env);
    if (!dev) return err(401, 'reset', 'مفتاح الشاشة غير معروف');
    const b = await body(req), sets = [], args = [];
    let ver = dev.ver || 0, out = {}, accepted = false;
    if (b.push && typeof b.push === 'object') {
      if ((b.ver | 0) === ver) { ver++; sets.push('settings = ?', 'ver = ?'); args.push(JSON.stringify(b.push), ver); accepted = true; }
      else out.conflict = true; // the dashboard changed it meanwhile: the dashboard wins
    }
    if (!accepted && ver !== (b.ver | 0)) out.settings = parse(dev.settings);
    const cmds = parse(dev.cmds) || [];
    if (cmds.length) { sets.push('cmds = ?'); args.push('[]'); }
    const info = JSON.stringify(b.info || {});
    if (info !== dev.info || !dev.last_seen || now() - dev.last_seen > 60000 || sets.length) { sets.push('info = ?', 'last_seen = ?'); args.push(info, now()); }
    if (sets.length) await env.DB.prepare(`UPDATE screens SET ${sets.join(', ')} WHERE key = ?`).bind(...args, dev.key).run();
    let owner = null, ownerRow = null;
    if (dev.owner) { ownerRow = await env.DB.prepare('SELECT name, phone, trial_until, free_screen, free_at FROM users WHERE id = ?').bind(dev.owner).first(); owner = ownerRow ? (ownerRow.name || ('+' + ownerRow.phone)) : null; }
    // activation code typed on the screen or built into its APK
    if (b.code) {
      const code = normCode(b.code), ck = 'code:' + clientIp(req);
      // guessing codes is blocked: 20 wrong codes per connection per hour
      const res = await limited(env, ck, 20, 3600e3) ? { error: [429, 'rate', 'محاولات كثيرة بكود خاطئ — حاول بعد ساعة'] } : code ? await redeemCode(env, dev.key, code, dev.owner) : { error: [400, 'code', 'صيغة الكود غير صحيحة'] };
      if (res.error && res.error[0] === 404) await failed(env, ck, 3600e3);
      out.codeResult = res.error ? { ok: false, message: res.error[2] } : { ok: true, until: res.until };
      if (res.ok) dev.plan_until = Math.max(+dev.plan_until || 0, res.until);
    }
    if (!dev.did && b.info && b.info.did) await env.DB.prepare('UPDATE screens SET did = ? WHERE key = ?').bind(String(b.info.did).slice(0, 80), dev.key).run();
    const plan = planOf(dev, ownerRow, env);
    if (accepted && dev.owner && plan.active) await autoBackup(env, dev.owner, { ...dev, settings: JSON.stringify(b.push) });
    // someone is editing this screen in the dashboard right now → check back quickly; otherwise once a minute
    const next = dev.watch_at && now() - dev.watch_at < 120000 ? 6 : 60;
    return json({ ...out, ver, accepted, linked: !!dev.owner, owner, name: dev.name || '', plan, cmds, next: plan.active ? next : 120, time: now() });
  }
  if (p === '/api/device/forget' && m === 'POST') {
    const dev = await deviceAuth(req, env);
    if (dev) await env.DB.prepare('DELETE FROM screens WHERE key = ?').bind(dev.key).run();
    return json({ ok: true });
  }

  /* ---- media ---- */
  if (seg[0] === 'media' && seg[1] && m === 'GET') {
    const id = seg[1];
    if (!/^m_[a-z0-9]{10,}$/.test(id)) return err(404, 'nf', 'not found');
    const obj = await env.MEDIA.getWithMetadata(id, { type: 'arrayBuffer' });
    if (!obj || !obj.value) return err(404, 'nf', 'not found');
    return new Response(obj.value, { headers: { 'Content-Type': (obj.metadata && obj.metadata.type) || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable', ...CORS } });
  }
  if (p === '/api/media' && m === 'POST') {
    const user = await currentUser(req, env), dev = user ? null : await deviceAuth(req, env);
    if (!user && !dev) return err(401, 'auth', 'سجّل الدخول أولًا');
    const type = (req.headers.get('Content-Type') || '').split(';')[0];
    if (!/^(image|audio)\//.test(type)) return err(415, 'type', 'يُسمح بالصور والملفات الصوتية فقط');
    const buf = await req.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > MAX_MEDIA) return err(413, 'size', 'حجم الملف أكبر من 20 ميجابايت');
    const id = randId('m_', 16);
    await env.MEDIA.put(id, buf, { metadata: { type } });
    await env.DB.prepare('INSERT INTO media (id, owner, type, size, created) VALUES (?, ?, ?, ?, ?)').bind(id, user ? user.id : 'screen:' + dev.key, type, buf.byteLength, now()).run();
    return json({ id });
  }

  /* ---- everything below needs a signed-in user ---- */
  const user = await currentUser(req, env);
  if (!user) return err(401, 'auth', 'انتهت الجلسة — سجّل الدخول مرة أخرى');

  if (p === '/api/me' && m === 'GET') return json({ user: { id: user.id, phone: user.phone, name: user.name, trialUntil: user.trial_until, isAdmin: isAdmin(env, user) } });

  /* ---- activation codes & admin ---- */
  if (seg[0] === 'admin') {
    if (!isAdmin(env, user)) return err(403, 'admin', 'هذه الصفحة لمسؤول النظام فقط');
    if (p === '/api/admin/stats') {
      const q = sql => env.DB.prepare(sql).bind(now()).first();
      const [a, b, c, d, e] = await Promise.all([q('SELECT COUNT(*) n FROM screens WHERE ? > 0'), q('SELECT COUNT(*) n FROM screens WHERE plan_until > ?'), q('SELECT COUNT(*) n FROM users WHERE ? > 0'), q('SELECT COUNT(*) n FROM codes WHERE used_at IS NULL AND ? > 0'), q('SELECT COUNT(*) n FROM screens WHERE last_seen > ? - 180000')]);
      return json({ screens: a.n, paid: b.n, users: c.n, freeCodes: d.n, online: e.n });
    }
    if (p === '/api/admin/screens') {
      const r = await env.DB.prepare('SELECT s.*, u.phone AS owner_phone, u.name AS owner_name, u.trial_until, u.free_screen, u.free_at FROM screens s LEFT JOIN users u ON u.id = s.owner ORDER BY s.created DESC LIMIT 500').all();
      return json({ screens: (r.results || []).map(x => ({ ...screenView(x, false, x.owner ? { trial_until: x.trial_until, free_screen: x.free_screen, free_at: x.free_at } : null, env), owner: x.owner ? { phone: '+' + x.owner_phone, name: x.owner_name } : null, created: x.created })) });
    }
    if (seg[1] === 'screens' && seg[2] && seg[3] === 'extend' && m === 'POST') {
      const b = await body(req), key = normKey(seg[2]), days = Math.round(+b.days || 0);
      const row = key && await env.DB.prepare('SELECT plan_until FROM screens WHERE key = ?').bind(key).first();
      if (!row) return err(404, 'nf', 'الشاشة غير موجودة');
      const until = b.lifetime ? LIFETIME : days > 0 ? Math.max(now(), +row.plan_until || 0) + days * DAY_MS : (days === 0 ? 0 : Math.max(0, (+row.plan_until || 0) + days * DAY_MS));
      await env.DB.prepare('UPDATE screens SET plan_until = ? WHERE key = ?').bind(until, key).run();
      return json({ ok: true, until });
    }
    if (p === '/api/admin/codes' && m === 'GET') {
      const r = await env.DB.prepare('SELECT * FROM codes ORDER BY created DESC LIMIT 1000').all();
      return json({ codes: r.results || [] });
    }
    if (p === '/api/admin/codes' && m === 'POST') {
      // days 0 = for life (the default); kind 'apk' = built into an APK / HTML copy
      const b = await body(req), count = Math.max(1, Math.min(200, +b.count || 1)), note = String(b.note || '').slice(0, 120), kind = b.kind === 'apk' ? 'apk' : null;
      const days = b.lifetime === false ? Math.max(1, Math.min(3650, Math.round(+b.days || 365))) : 0;
      const out = [];
      for (let i = 0; i < count; i++) { const code = newCode(); await env.DB.prepare('INSERT INTO codes (code, days, note, created, created_by, kind) VALUES (?, ?, ?, ?, ?, ?)').bind(code, days, note, now(), user.id, kind).run(); out.push(code); }
      return json({ codes: out, days, lifetime: !days });
    }
    if (seg[1] === 'codes' && seg[2] && m === 'DELETE') {
      const r = await env.DB.prepare('DELETE FROM codes WHERE code = ? AND used_at IS NULL').bind(normCode(seg[2])).run();
      return (r.meta && r.meta.changes) ? json({ ok: true }) : err(400, 'used', 'لا يمكن حذف كود مستخدم');
    }
    return err(404, 'nf', 'not found');
  }
  if (p === '/api/auth/logout' && m === 'POST') { const h = req.headers.get('Authorization').slice(7); await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(await sha256(h)).run(); return json({ ok: true }); }
  if (p === '/api/me' && m === 'PUT') { const b = await body(req); await env.DB.prepare('UPDATE users SET name = ? WHERE id = ?').bind(String(b.name || '').slice(0, 120), user.id).run(); return json({ ok: true }); }
  if (p === '/api/auth/logout-all' && m === 'POST') { await env.DB.prepare('DELETE FROM sessions WHERE uid = ?').bind(user.id).run(); return json({ ok: true }); }

  /* ---- backups (kept on the server, can be restored to any screen of the account) ---- */
  if (p === '/api/backups' && m === 'GET') {
    const r = await env.DB.prepare('SELECT id, screen_key, screen_name, name, auto, created, size, media FROM backups WHERE owner = ? ORDER BY created DESC LIMIT 200').bind(user.id).all();
    return json({ backups: r.results || [] });
  }
  if (seg[0] === 'backups' && seg[1]) {
    const bk = await env.DB.prepare('SELECT * FROM backups WHERE id = ? AND owner = ?').bind(seg[1], user.id).first();
    if (!bk) return err(404, 'nf', 'النسخة الاحتياطية غير موجودة');
    if (!seg[2] && m === 'GET') return json({ backup: { ...bk, settings: parse(bk.settings) } });
    if (!seg[2] && m === 'DELETE') { await env.DB.prepare('DELETE FROM backups WHERE id = ?').bind(bk.id).run(); return json({ ok: true }); }
    if (seg[2] === 'restore' && m === 'POST') {
      const b = await body(req), key = normKey(b.key);
      const target = key && await env.DB.prepare('SELECT * FROM screens WHERE key = ? AND owner = ?').bind(key, user.id).first();
      if (target && !planOf(target, user).active) return needPlan();
      const r = key && await env.DB.prepare('UPDATE screens SET settings = ?, ver = ver + 1 WHERE key = ? AND owner = ?').bind(bk.settings, key, user.id).run();
      if (!r || !(r.meta && r.meta.changes)) return err(404, 'nf', 'الشاشة غير موجودة في حسابك');
      return json({ ok: true });
    }
  }

  if (p === '/api/screens' && m === 'GET') {
    const r = await env.DB.prepare('SELECT * FROM screens WHERE owner = ? ORDER BY created').bind(user.id).all();
    return json({ screens: (r.results || []).map(x => screenView(x, true, user)) });
  }
  if (p === '/api/screens/link' && m === 'POST') {
    // guessing screen numbers is blocked: 10 wrong numbers per account (20 per connection) lock linking for an hour
    const lk = 'link:' + user.id, li = 'linkip:' + clientIp(req);
    if (await limited(env, lk, 10, 3600e3) || await limited(env, li, 20, 3600e3)) return err(429, 'rate', 'محاولات ربط خاطئة كثيرة — انتظر ساعة ثم حاول مرة أخرى');
    const b = await body(req), key = normKey(b.key);
    if (!key) return err(400, 'key', 'رقم الشاشة يتكوّن من 10 أرقام مثل 48213-90576');
    const row = await env.DB.prepare('SELECT * FROM screens WHERE key = ?').bind(key).first();
    if (!row) { await failed(env, lk, 3600e3); await failed(env, li, 3600e3); }
    if (!row) return err(404, 'key', 'لا توجد شاشة بهذا الرقم — تأكد من الرقم الظاهر على التلفزيون وأن الشاشة متصلة بالإنترنت');
    // a screen can only be linked while it is switched on and online (it shows its number at that moment)
    if (!row.owner && now() - (row.last_seen || 0) > 15 * 60 * 1000) return err(409, 'offline', 'الشاشة غير متصلة الآن — شغّلها واتصل بالإنترنت ثم أعد المحاولة');
    if (row.owner && row.owner !== user.id) return err(409, 'taken', 'هذه الشاشة مرتبطة بحساب آخر. من الشاشة: الإعدادات ← لوحة التحكم ← مفتاح جديد');
    const name = String(b.name || '').trim().slice(0, 80) || row.name || 'شاشة ' + key.slice(-4);
    await env.DB.prepare('UPDATE screens SET owner = ?, name = ? WHERE key = ?').bind(user.id, name, key).run();
    // the first screen of an account is managed free (once per account and per device); the others need a code
    let free = false;
    if (!(+row.plan_until > now())) free = await grantFree(env, user, key, row.did || (parse(row.info) || {}).did || '');
    const sv = screenView({ ...row, owner: user.id, name }, true, user, env);
    return json({ screen: sv, free, needCode: !sv.plan.active });
  }
  if (p === '/api/screens/copy' && m === 'POST') {
    const b = await body(req), from = await env.DB.prepare('SELECT * FROM screens WHERE key = ? AND owner = ?').bind(normKey(b.from), user.id).first();
    if (!from) return err(404, 'nf', 'الشاشة غير موجودة');
    if (!planOf(from, user).active) return needPlan();
    let n = 0;
    for (const k of (b.to || []).map(normKey).filter(Boolean)) {
      const t = await env.DB.prepare('SELECT key, plan_until FROM screens WHERE key = ? AND owner = ?').bind(k, user.id).first();
      if (!t || !planOf(t, user).active) continue;      // only screens with an active plan receive copies
      const r = await env.DB.prepare('UPDATE screens SET settings = ?, ver = ver + 1 WHERE key = ? AND owner = ?').bind(from.settings, k, user.id).run();
      n += (r.meta && r.meta.changes) || 0;
    }
    return json({ copied: n });
  }
  if (seg[0] === 'screens' && seg[1]) {
    const key = normKey(seg[1]);
    const row = key && await env.DB.prepare('SELECT * FROM screens WHERE key = ? AND owner = ?').bind(key, user.id).first();
    if (!row) return err(404, 'nf', 'الشاشة غير موجودة في حسابك');
    if (!seg[2] && m === 'GET') {
      if (url.searchParams.get('watch') === '1' && (!row.watch_at || now() - row.watch_at > 30000)) await env.DB.prepare('UPDATE screens SET watch_at = ? WHERE key = ?').bind(now(), key).run();
      return json({ screen: screenView(row, true, user) });
    }
    const plan = planOf(row, user);
    if (seg[2] === 'redeem' && m === 'POST') {
      const ck = 'code:' + user.id;
      if (await limited(env, ck, 20, 3600e3)) return err(429, 'rate', 'محاولات كثيرة بكود خاطئ — حاول بعد ساعة');
      const b = await body(req), res = await redeemCode(env, key, normCode(b.code), user.id);
      if (res.error && res.error[0] === 404) await failed(env, ck, 3600e3);
      if (res.error) return err(...res.error);
      return json({ ok: true, until: res.until, days: res.days, lifetime: res.until >= LIFETIME });
    }
    if (!seg[2] && m === 'PUT') {
      const b = await body(req), sets = [], args = [];
      if (typeof b.name === 'string') { sets.push('name = ?'); args.push(b.name.trim().slice(0, 80)); }
      let ver = row.ver || 0;
      if (b.settings && typeof b.settings === 'object') {
        if (!plan.active) return needPlan();
        if (b.baseVer != null && (b.baseVer | 0) !== ver) return json({ error: 'conflict', message: 'تغيّرت إعدادات الشاشة من جهاز آخر — تم تحميل آخر نسخة', screen: screenView(row, true) }, 409);
        ver++; sets.push('settings = ?', 'ver = ?'); args.push(JSON.stringify(b.settings), ver);
      }
      if (sets.length) await env.DB.prepare(`UPDATE screens SET ${sets.join(', ')} WHERE key = ?`).bind(...args, key).run();
      if (b.settings && plan.active) await autoBackup(env, user.id, { ...row, settings: JSON.stringify(b.settings) });
      return json({ ok: true, ver });
    }
    if (!seg[2] && m === 'DELETE') {
      if (url.searchParams.get('forever') === '1') {
        // remove the screen entirely; the device gets a fresh key on its next sync and shows the pairing screen again
        await env.DB.prepare('DELETE FROM screens WHERE key = ?').bind(key).run();
        return json({ ok: true, deleted: true });
      }
      await env.DB.prepare('UPDATE screens SET owner = NULL WHERE key = ?').bind(key).run();
      return json({ ok: true });
    }
    if (seg[2] === 'backups' && m === 'POST') {
      if (!plan.active) return needPlan();
      const b = await body(req);
      const id = await saveBackup(env, user.id, row, String(b.name || '').trim().slice(0, 80) || 'نسخة يدوية', 0);
      return json({ ok: true, id });
    }
    if (seg[2] === 'command' && m === 'POST') {
      const b = await body(req), cmd = String(b.cmd || '');
      if (!plan.active && cmd !== 'identify') return needPlan();
      if (!/^(reload|restart|identify|update|azkarNow|preview:[a-z]+|openApp:[\w.]+)$/.test(cmd)) return err(400, 'cmd', 'أمر غير معروف');
      const cmds = (parse(row.cmds) || []).concat([{ cmd, at: now() }]).slice(-10);
      await env.DB.prepare('UPDATE screens SET cmds = ? WHERE key = ?').bind(JSON.stringify(cmds), key).run();
      return json({ ok: true });
    }
  }
  return err(404, 'nf', 'not found');
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    // only HTTPS outside the local test server
    if (url.protocol === 'http:' && !/^(localhost|127\.|192\.168\.|10\.)/.test(url.hostname)) return Response.redirect(url.href.replace(/^http:/, 'https:'), 301);
    if (url.pathname.startsWith('/api/')) {
      try { return secure(await api(req, env, url)); }
      catch (e) { console.error(e); return secure(err(500, 'server', 'حدث خطأ في الخادم — حاول مرة أخرى')); }
    }
    if (env.ASSETS) return secure(await env.ASSETS.fetch(req));
    return new Response('Not found', { status: 404 });
  },
};
