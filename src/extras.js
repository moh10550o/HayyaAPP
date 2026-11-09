/* ================= Extras: automatic themes, Hijri reminders, weather, microphone, relay, device, PIN ================= */

/* ---------- Hijri date as shown on the screen (follows "advance after Maghrib") ---------- */
function hijriNow(t, sc) {
  sc = sc || schedule(t);
  let hd = t;
  if (S.hijriAfterMaghrib && sc && sc.maghrib && t >= sc.maghrib.adhan) hd = new Date(t.getTime() + DAY);
  return hijri(hd);
}
/* the prayer whose time we are in: from its adhan until the next one (fajr covers sunrise and duha) */
function prayerPeriod(t) {
  const sc = schedule(t);
  let cur = null;
  for (const k of PRAYERS5) if (t >= sc[k].adhan) cur = k;
  return cur || 'isha';
}

/* ---------- automatic theme ---------- */
let themeKey = '', themeCache = { at: 0, id: '' };
function activeTplId() {
  const A = S.themeAuto || {}, base = S.design.tpl;
  if ((!A.mode || A.mode === 'off') && !A.occ) return base;
  const nowMs = Date.now();
  if (nowMs - themeCache.at < 15000 && themeCache.key === JSON.stringify(A) + base + (S.userTpls || []).length) return themeCache.id;
  let id = base;
  try {
    const t = now(), sc = schedule(t), h = hijriNow(t, sc);
    if (A.mode === 'daynight') id = (t >= sc.sunrise.adhan && t < sc.maghrib.adhan) ? A.day : A.night;
    else if (A.mode === 'prayer') id = (A.per || {})[prayerPeriod(t)] || base;
    if (A.occ) {
      if (h.m === 10 && h.d <= 3 && A.eidFitr) id = A.eidFitr;
      else if (h.m === 12 && h.d >= 10 && h.d <= 13 && A.eidAdha) id = A.eidAdha;
      else if ((h.m === 9 || S.ramadan.mode === 'on') && A.ramadan) id = A.ramadan;
    }
  } catch (e) { }
  if (!tplById(id)) id = base;
  themeCache = { at: nowMs, id, key: JSON.stringify(A) + base + (S.userTpls || []).length };
  return id;
}
/* called every frame: switches the colours when the period changes */
function themeTick() {
  const id = activeTplId();
  if (id !== themeKey) { const first = !themeKey; themeKey = id; if (!first) { applyTheme(); refitAll(); } }
}
function themeName(id) { const t = tplById(id); return t ? Lx(t.ar, t.en) : id; }

/* ---------- reminders of the Hijri calendar ---------- */
function occWhen(o, t, sc, h) {
  const m = h.m, d = h.d, fri = t.getDay() === 5;
  switch (o.id) {
    case 'white': return m !== 9 && m !== 12 && d >= 12 && d <= 15;
    case 'ashura': return m === 1 && d >= 7 && d <= 10;
    case 'friday': return fri;
    case 'fridayHour': return fri && t >= sc.asr.adhan && t < sc.maghrib.adhan;
    case 'ramadan': return m === 9;
    case 'ram1': return m === 9 && d <= 10;
    case 'ram2': return m === 9 && d >= 11 && d <= 20;
    case 'ram3': return m === 9 && d >= 21;
    case 'fitrEve': return m === 9 && d >= 27;
    case 'fitr': return m === 10 && d <= 3;
    case 'shawwal': return (m === 9 && d >= 25) || (m === 10 && d >= 2);
    case 'dhul10': return m === 12 && d <= 9;
    case 'arafah': return m === 12 && d >= 6 && d <= 9;
    case 'adha': return m === 12 && d === 10;
    case 'tashreeq': return m === 12 && d >= 11 && d <= 13;
  }
  return false;
}
const occConf = id => (S.occ.items || {})[id] || {};
/* the texts of an occasion: its own editable list (built-in texts + the user's), only the ones switched on */
function occLines(o) {
  const c = occConf(o.id), L = Array.isArray(c.list) ? c.list : o.items;
  return L.filter(x => x && x.on !== false && x.t);
}
const splitSrc = line => { const i = line.lastIndexOf(' — '); return i > 0 ? { t: line.slice(0, i), s: line.slice(i + 3) } : { t: line, s: '' }; };
let occCache = { k: '', v: [] };
function activeOccasions(t) {
  if (!S.occ || !S.occ.on) return [];
  const k = Math.floor(t.getTime() / 30000) + JSON.stringify(S.occ.items) + S.hijriAdj + S.hijriAfterMaghrib;
  if (occCache.k === k) return occCache.v;
  const sc = schedule(t), h = hijriNow(t, sc), v = [];
  for (const o of OCCASIONS) if (occConf(o.id).on !== false && occWhen(o, t, sc, h)) { const lines = occLines(o); if (lines.length) v.push({ o, lines, c: occConf(o.id) }); }
  // the last hour of Friday comes first
  v.sort((a, b) => (b.o.id === 'fridayHour') - (a.o.id === 'fridayHour'));
  occCache = { k, v };
  return v;
}
/* hadith line: reminders take every other turn — or, when an occasion is set to show alone, only its texts are shown */
function withOccasions(L, t) {
  const act = activeOccasions(t), alone = act.filter(a => a.c.alone);
  const pick = alone.length ? alone : act, occ = [];
  for (const a of pick) for (const x of a.lines) occ.push({ t: x.t, s: x.s || '', tag: Lx(a.o.ar, a.o.en) });
  if (alone.length) return occ;
  if (!occ.length) return L;
  if (!L.length) return occ;
  const out = []; let i = 0;
  for (const x of L) { out.push(occ[i++ % occ.length]); out.push(x); }
  while (i < occ.length) out.push(occ[i++]);
  return out;
}
/* ticker: the texts of the active occasions; { items, alone } — alone = only these are shown in the ticker */
function occTicker(t) {
  if (!S.occ || !S.occ.on || !S.occ.ticker) return { items: [], alone: false };
  const act = activeOccasions(t).filter(a => a.c.tk !== false), al = act.filter(a => a.c.tAlone);
  const pick = al.length ? al : act, items = [];
  for (const a of pick) for (const x of a.lines) items.push({ t: Lx(a.o.ar, a.o.en) + ': ' + x.t + (x.s ? ' — ' + x.s : ''), on: true });
  return { items, alone: al.length > 0 };
}
const occTickerItems = t => occTicker(t).items;

/* ---------- between adhan and iqamah ---------- */
function waitTips(P) {
  if (!S.waitTips || !S.waitTips.on || !P) return [];
  const own = String(S.waitTips.text || '').split('\n').map(x => x.trim()).filter(Boolean);
  return [...(WAIT_TIPS[P.jumuah ? 'jumuah' : P.k] || []), ...(own.length ? own : WAIT_TIPS.general)];
}

/* ---------- weather outside and temperature inside the mosque ---------- */
const Weather = { out: null, code: null, day: 1, inside: null, at: 0, inAt: 0 };
function wIcon(c, day) {
  if (c == null) return '🌡';
  if (c === 0) return day ? '☀️' : '🌙';
  if (c <= 2) return day ? '🌤' : '☁️';
  if (c === 3) return '☁️';
  if (c === 45 || c === 48) return '🌫';
  if (c >= 51 && c <= 67) return '🌧';
  if (c >= 71 && c <= 77) return '❄️';
  if (c >= 80 && c <= 82) return '🌦';
  if (c >= 95) return '⛈';
  return '🌡';
}
const jsonPath = (o, p) => String(p || '').split('.').filter(Boolean).reduce((a, k) => (a == null ? a : a[k]), o);
async function refreshWeather(force) {
  if (!S.temp.on) return;
  const I = S.temp.inside || {};
  // inside: typed by hand, a sensor in the APK, or a local sensor address that returns JSON / a number
  try {
    if (I.mode === 'manual') Weather.inside = +I.value;
    else if (I.mode === 'sensor' && Native && Native.getTemperature) { const v = parseFloat(Native.getTemperature()); Weather.inside = isNaN(v) ? null : v; }
    else if (I.mode === 'url' && I.url && (force || Date.now() - Weather.inAt > 2 * MIN)) {
      Weather.inAt = Date.now();
      const r = await fetch(I.url, { cache: 'no-store' }); const txt = await r.text();
      let v = parseFloat(txt); if (isNaN(v)) { try { v = parseFloat(jsonPath(JSON.parse(txt), I.path || 'temperature')); } catch (e) { } }
      Weather.inside = isNaN(v) ? null : v;
    } else if (I.mode === 'off') Weather.inside = null;
  } catch (e) { }
  if (!force && Date.now() - Weather.at < 20 * MIN) return; Weather.at = Date.now();
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${S.loc.lat}&longitude=${S.loc.lng}&current=temperature_2m,weather_code,is_day`);
    const j = await r.json(); Weather.out = j.current.temperature_2m; Weather.code = j.current.weather_code; Weather.day = j.current.is_day;
    Temp.v = Weather.out;
  } catch (e) { }
}
function weatherText() {
  if (!S.temp.on) return '';
  const u = S.temp.unit, f = v => num(Math.round(u === 'F' ? v * 9 / 5 + 32 : v)) + '°' + (u === 'F' ? 'F' : '');
  const p = [];
  if (Weather.out != null) p.push(`${S.temp.weather !== false ? wIcon(Weather.code, Weather.day) : '🌡'} ${Lx('الخارج', 'Outside')} ${f(Weather.out)}`);
  if (Weather.inside != null && S.temp.inside && S.temp.inside.mode !== 'off') p.push(`🕌 ${Lx('الداخل', 'Inside')} ${f(Weather.inside)}`);
  return p.join('   ');
}

/* ---------- microphone: start the after-prayer adhkar when the mosque goes quiet ---------- */
const Mic = {
  stream: null, ctx: null, an: null, buf: null, level: 0, loudAt: 0, heard: false, pid: '', err: '', test: false, starting: false,
  async start() {
    if (this.stream || this.starting) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { this.err = 'unsupported'; return; }
    this.starting = true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC();
      const src = this.ctx.createMediaStreamSource(this.stream); this.an = this.ctx.createAnalyser(); this.an.fftSize = 2048;
      src.connect(this.an); this.buf = new Float32Array(this.an.fftSize); this.err = '';
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => { });
    } catch (e) { this.err = e.name || 'denied'; this.stream = null; }
    this.starting = false;
  },
  stop() {
    try { this.stream && this.stream.getTracks().forEach(x => x.stop()); } catch (e) { }
    try { this.ctx && this.ctx.close(); } catch (e) { }
    this.stream = this.ctx = this.an = null; this.level = 0;
  },
  read() {
    if (!this.an) return 0;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => { });
    this.an.getFloatTimeDomainData(this.buf);
    let s = 0; for (let i = 0; i < this.buf.length; i++) s += this.buf[i] * this.buf[i];
    const rms = Math.sqrt(s / this.buf.length);
    this.level = Math.min(100, Math.round(rms * 400));
    return this.level;
  },
};
function micTick(t, ph) {
  const A = S.azkarAfter;
  const want = A.mode === 'mic' && A.on && (ph.ph === 'iqama' || ph.ph === 'prayer') && ph.P && azWaitsSignal(ph.P) && !(azTrig && azTrig.id === prayerId(ph.P));
  if (!want && !Mic.test) { if (Mic.stream) Mic.stop(); return; }
  Mic.start(); if (!Mic.an) return;
  const lv = Mic.read();
  if (!want) return;
  const id = prayerId(ph.P);
  if (Mic.pid !== id) { Mic.pid = id; Mic.heard = false; Mic.loudAt = t.getTime(); }
  if (lv >= +A.mic.level) { Mic.heard = true; Mic.loudAt = t.getTime(); }
  const since = t - ph.P.iqAnnEnd;
  if (since >= (A.mic.minMin != null && A.mic.minMin !== "" ? +A.mic.minMin : 3) * MIN && Mic.heard && t.getTime() - Mic.loudAt >= (+A.mic.silence || 20) * 1000) {
    if (startAzkarNow('mic')) { Mic.stop(); ovKey = ''; }
  }
}

/* ---------- relay / controller for the mosque microphone and amplifier ---------- */
const Relay = {
  call(url) { if (!url) return; try { if (Native && Native.httpGet) Native.httpGet(url); else fetch(url, { mode: 'no-cors', cache: 'no-store' }).catch(() => { }); } catch (e) { } },
  fired: new Set(),
};
function relayTick(t, sc) {
  const R = S.sound.relay; if (!R || !R.on) return;
  for (const k of PRAYERS5) {
    const P = sc[k], marks = [[P.adhan, 'a']];
    if (R.iqama) marks.push([P.iqama, 'i']);
    for (const [at, tag] of marks) {
      const on = at.getTime() - (+R.lead || 0) * 1000, off = at.getTime() + (+R.hold || 240) * 1000, id = sc.key + k + tag;
      if (t >= on && t < on + 60000 && !Relay.fired.has(id + 'on')) { Relay.fired.add(id + 'on'); Relay.call(R.onUrl); }
      if (t >= off && t < off + 60000 && !Relay.fired.has(id + 'off')) { Relay.fired.add(id + 'off'); Relay.call(R.offUrl); }
    }
  }
  if (Relay.fired.size > 80) Relay.fired.clear();
}

/* ---------- device: start with the device, keep the screen lit ---------- */
let wakeLockObj = null;
function applyDevice() {
  const D = S.device || {};
  try { if (Native && Native.setAutoStart) Native.setAutoStart(D.autoStart !== false); } catch (e) { }
  try { if (Native && Native.setKeepOn) Native.setKeepOn(D.keepOn !== false); } catch (e) { }
  if (typeof PREVIEW !== 'undefined' && PREVIEW) return;
  try {
    if (!navigator.wakeLock) return;
    if (D.keepOn !== false && !wakeLockObj) navigator.wakeLock.request('screen').then(l => { wakeLockObj = l; l.addEventListener('release', () => { wakeLockObj = null; }); }).catch(() => { });
    if (D.keepOn === false && wakeLockObj) { wakeLockObj.release(); wakeLockObj = null; }
  } catch (e) { }
}

/* ---------- settings PIN (stored as a hash) ---------- */
async function sha256hex(str) {
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('hayya:' + str)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { let h = 0; for (const c of 'hayya:' + str) h = (h * 31 + c.charCodeAt(0)) | 0; return 'x' + (h >>> 0).toString(16); }
}
let unlockedUntil = 0;
const pinVisible = () => !!$('#pinbox') && !$('#pinbox').classList.contains('hide');
function needPin() { return !IS_DASH && !(typeof PREVIEW !== 'undefined' && PREVIEW) && S.lock && S.lock.hash && Date.now() > unlockedUntil; }
function showPin() {
  let b = $('#pinbox');
  if (!b) {
    document.body.insertAdjacentHTML('beforeend', `<div id="pinbox" class="hide"><div class="pinc"><b>${Lx('🔒 الإعدادات مقفلة', '🔒 Settings are locked')}</b><p>${Lx('أدخل رمز القفل ثم اضغط OK', 'Enter the PIN, then press OK')}</p><input id="pinIn" type="password" inputmode="numeric" autocomplete="off" maxlength="12"><em id="pinErr"></em></div></div>`);
    b = $('#pinbox');
  }
  $('#pinErr').textContent = ''; $('#pinIn').value = ''; b.classList.remove('hide');
  setTimeout(() => $('#pinIn').focus(), 30);
}
function hidePin() { const b = $('#pinbox'); if (b) b.classList.add('hide'); document.activeElement && document.activeElement.blur(); }
async function checkPin() {
  const v = $('#pinIn').value;
  if (await sha256hex(v) === S.lock.hash) { unlockedUntil = Date.now() + 10 * MIN; hidePin(); openSettings(); }
  else { $('#pinErr').textContent = Lx('الرمز غير صحيح', 'Wrong PIN'); $('#pinIn').value = ''; }
}

/* ---------- instructions shown at the top of each settings page ---------- */
const HELP_TEXT = {
  cloud: [['اربط الشاشة بلوحة التحكم بإدخال «رقم الشاشة» المكوّن من 10 أرقام في اللوحة، أو امسح رمز QR بالجوال.', 'Link the screen by typing its 10-digit screen number in the dashboard or scanning the QR code.'], ['بعد الربط تصل أي تغييرات من اللوحة إلى الشاشة خلال ثوانٍ، والعكس.', 'Once linked, changes travel both ways within seconds.']],
  loc: [['ابحث عن مدينتك في أي دولة، أو اضغط «تحديد موقعي».', 'Search your city in any country, or use “Detect location”.'], ['للضواحي والأحياء البعيدة استخدم «فرق الضاحية» لتقديم أو تأخير كل الصلوات معًا.', 'For suburbs use “Suburb offset” to shift all prayers together.'], ['يمكن تعديل كل صلاة بالدقائق أو تثبيت وقتها، أو استيراد تقويم سنوي.', 'Adjust each prayer in minutes, fix its time, or import a yearly calendar.']],
  iq: [['حدّد مدة الإقامة بعد الأذان لكل صلاة ومدة أداء الصلاة.', 'Set the iqamah delay and the prayer duration for each prayer.'], ['اختر كيف تبدأ أذكار بعد الصلاة: تلقائيًا بعد المدة، أو يدويًا بزر OK في الريموت، أو بالميكروفون.', 'Choose how the after-prayer adhkar start: automatically, by the remote OK key, or by the microphone.']],
  fri: [['فعّل الجمعة إذا كانت تقام في الجامع، وحدّد موعد الأذان ومدة الخطبة.', 'Turn on Jumu‘ah if it is held here and set the adhan and sermon length.'], ['حدّد بعد كم دقيقة من الإقامة تبدأ أذكار ما بعد الجمعة — تظهر مباشرة دون شاشة سوداء إضافية.', 'Set how many minutes after the iqamah the Friday adhkar start — they follow straight away, with no extra black screen.']],
  ram: [['في رمضان تُستخدم مدد إقامة خاصة، ويُضاف التراويح والتهجد تلقائيًا.', 'Ramadan uses its own iqamah times; Taraweeh and Tahajjud are added automatically.'], ['أحاديث العشر الأوائل والوسطى والأواخر تُعدّل من «التذكيرات والمناسبات».', 'The hadiths of each ten days are edited in “Reminders & occasions”.']],
  tpl: [['اختر قالبًا بالضغط عليه، أو فعّل «تغيير الثيم تلقائيًا» حسب الوقت أو الصلاة.', 'Pick a template, or turn on automatic themes by time or prayer.'], ['ثيمات رمضان والعيدين تعمل تلقائيًا في وقتها إذا فعّلتها.', 'Ramadan and Eid themes switch on by themselves when enabled.']],
  occ: [['تظهر التذكيرات في سطر الأحاديث وشريط الأخبار في وقتها حسب التاريخ الهجري.', 'Reminders appear in the hadith line and the ticker at their Hijri dates.'], ['لكل مناسبة صفحة مستقلة: اخترها من الأزرار، ثم أوقف أو عدّل أي نص، أو أضف سطرًا جديدًا مع مصدره.', 'Each occasion has its own page: pick it, then switch off, edit or add texts with their source.'], ['«إظهارها وحدها» يجعل سطر الأحاديث أو شريط الأخبار لا يعرض غير نصوص المناسبة ما دامت قائمة.', '“Show alone” makes the hadith line or the ticker show only that occasion while it lasts.']],
  content: [['اختر شكل شاشة الأذكار: بطاقات، أو ذكر واحد، أو صورة من تصميمك.', 'Choose the adhkar screen: cards, one at a time, or your own picture.'], ['أضف إعلانات المسجد وعبارات شريط الأخبار من هنا.', 'Add mosque notices and ticker lines here.']],
  azkar: [['عدّل نصوص الأذكار والأحاديث، أو أضف ما تريد، ورتّبها بالأسهم.', 'Edit, add and reorder adhkar and hadiths.'], ['«مكتبة الأذكار»: كل فئة من islambook في صفحة مستقلة بعددها وتخريجها، ويمكن عرض أي فئة في سطر الأحاديث. ما عليه ⚠️ موقوف افتراضيًا مع ذكر السبب.', 'Adhkar library: each islambook category on its own page with counts and sources; any category can be shown in the hadith line. Items marked ⚠️ are off by default, with the reason.']],
  sound: [['اختر صوت الأذان والإقامة أو ارفع ملفًا صوتيًا.', 'Pick the adhan and iqamah sounds or upload a file.'], ['يمكن تشغيل ميكروفون المسجد أو المكبّر قبل الأذان عبر وحدة تحكم (Relay) تدعم أوامر الرابط.', 'A relay controller with URL commands can switch the mosque microphone / amplifier before the adhan.']],
  device: [['فعّل «التشغيل عند بدء تشغيل الشاشة» و«إبقاء الشاشة مضاءة» ليعمل الجهاز وحده دائمًا.', 'Turn on “Start with the device” and “Keep the screen on” so it always runs by itself.'], ['يمكنك قفل الإعدادات برمز لمنع العبث بها.', 'Lock the settings with a PIN to prevent tampering.']],
};
function tipsHTML(c) {
  const L = HELP_TEXT[c]; if (!L || !S.ui || S.ui.tips === false) return '';
  const nav = IS_DASH ? '' : `<li>${Lx('بالريموت: ▲▼ للتنقل · OK للدخول أو الكتابة · ◀▶ لتحريك المؤشر داخل النص · رجوع للعودة للقائمة', 'Remote: ▲▼ move · OK enter / type · ◀▶ move the cursor in text · Back returns to the menu')}</li>`;
  return `<div class="tips"><b>💡 ${Lx('طريقة الاستخدام', 'How to use')}</b><ul>${L.map(x => `<li>${Lx(x[0], x[1])}</li>`).join('')}${nav}</ul>${btn('hideTips', Lx('إخفاء التعليمات', 'Hide tips'), '', 'ghost')}</div>`;
}

/* ---------- world city search (any country) ---------- */
async function searchCities(q) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=${S.lang === 'ar' ? 'ar' : 'en'}&format=json`);
  const j = await r.json();
  return (j.results || []).map(x => ({ name: x.name, country: x.country || '', admin: x.admin1 || '', lat: +x.latitude.toFixed(4), lng: +x.longitude.toFixed(4), elev: Math.round(x.elevation || 0), tz: x.timezone || '' }));
}

/* ---------- funeral messages ---------- */
function funeralUntil(it) {
  const st = new Date(it.start || Date.now());
  if (it.mode === 'days') { const d0 = new Date(st); d0.setHours(0, 0, 0, 0); return new Date(d0.getTime() + Math.max(1, +it.days || 3) * DAY); }
  const endOf = d => { const P = schedule(d)[it.prayer || 'dhuhr']; return new Date((P.prayEnd || P.iqama).getTime() + 30 * MIN); };
  let end = endOf(st);
  if (end < st) end = endOf(new Date(st.getTime() + DAY));   // added after that prayer: it is tomorrow's
  return end;
}
function funeralActive(it, t) { return it && it.on !== false && String(it.name || '').trim() && t < funeralUntil(it); }
function funeralText(it) {
  const n = String(it.name || '').trim(), x = String(it.note || '').trim();
  const f = it.g === 'f';
  const base = it.mode === 'days'
    ? Lx(`${f ? 'انتقلت' : 'انتقل'} إلى رحمة الله تعالى ${n} — نسأل الله ${f ? 'لها' : 'له'} المغفرة والرحمة، إنا لله وإنا إليه راجعون`, `${n} has passed away — may Allah forgive and have mercy on ${f ? 'her' : 'him'}`)
    : Lx(`سيُقام بإذن الله الصلاة على ${n} بعد صلاة ${PN(it.prayer || 'dhuhr')} مباشرة`, `Funeral prayer for ${n} right after ${PN(it.prayer || 'dhuhr')}`);
  return x ? base + ' — ' + x : base;
}
function funeralStatus(it) {
  if (!String(it.name || '').trim()) return Lx('اكتب الاسم', 'Type the name');
  const t = now(), u = funeralUntil(it);
  if (it.on === false) return Lx('موقوف', 'Off');
  if (t >= u) return Lx('انتهى عرضه', 'Finished');
  return Lx('يظهر حتى ', 'Shown until ') + u.toLocaleString(S.lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

/* ---------- alignment of the main widgets (physical: right / center / left) ---------- */
function applyAlign() {
  const r = document.documentElement.style, A = S.align || {}, rtl = S.lang === 'ar';
  for (const k of ['clock', 'next', 'table', 'hadith']) {
    const v = ['right', 'left'].includes(A[k]) ? A[k] : 'center';
    // flex/grid "start" is the right side in Arabic, the left side in English
    const flex = v === 'center' ? 'center' : ((v === 'right') === rtl ? 'flex-start' : 'flex-end');
    r.setProperty('--al-' + k, v); r.setProperty('--jf-' + k, flex);
  }
}

/* ---------- a theme / colour for each prayer in the timetable ---------- */
const hexRgb = h => { h = String(h || '#000').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgbHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mixHex = (a, b, w) => { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map((v, i) => v * (1 - w) + y[i] * w)); };
const lumHex = h => { const [r, g, b] = hexRgb(h).map(v => v / 255); return .2126 * r + .7152 * g + .0722 * b; };
function prayerCellColors(k, base) {
  const T = S.tableTheme || {}, str = Math.max(.2, Math.min(1, +T.strength || .75));
  if (T.mode === 'colors') {
    const c = (T.colors || {})[k] || base.bg2;
    // the cell is drawn semi-transparent over the page: judge the text colour on the colour actually seen
    const seen = mixHex(c, base.bg2, 1 - str), light = lumHex(seen) > .5;
    return { bg1: mixHex(c, '#000000', .25), bg2: c, p: light ? '#1a1a1a' : (lumHex(base.p) > .4 ? mixHex(base.p, '#ffffff', .1) : '#ffe08a'), tx: light ? '#111111' : '#ffffff', a: str };
  }
  const th = tplById((T.per || {})[k]) || base;
  if (T.mode === 'themes') return { bg1: th.bg1, bg2: th.bg2, p: th.p, tx: th.tx, a: str };
  // auto: each prayer's sky blended with the current template so the colours stay in harmony
  const sky = tplById({ fajr: 'p_fajr', sunrise: 'p_fajr', dhuhr: 'p_dhuhr', asr: 'p_asr', maghrib: 'p_maghrib', isha: 'p_isha' }[k]) || base;
  const bg2 = mixHex(base.bg2, sky.bg2, .55), bg1 = mixHex(base.bg1, sky.bg1, .55);
  return { bg1, bg2, p: mixHex(base.p, sky.p, .35), tx: lumHex(bg2) > .55 ? '#141414' : base.tx === '#ffffff' ? '#ffffff' : (lumHex(base.tx) > .5 ? base.tx : '#ffffff'), a: str };
}
function applyTableTheme(base) {
  const pt = $('#main .ptable'); if (!pt) return;
  const on = !!(S.tableTheme && S.tableTheme.on);
  pt.classList.toggle('themed', on);
  $$('.pc', pt).forEach(el => {
    if (!on) { ['--pc-bg', '--pc-p', '--pc-tx'].forEach(v => el.style.removeProperty(v)); return; }
    const c = prayerCellColors(el.dataset.k, base);
    el.style.setProperty('--pc-bg', `linear-gradient(160deg, ${hexA(c.bg2, c.a)}, ${hexA(c.bg1, c.a)})`);
    el.style.setProperty('--pc-p', c.p); el.style.setProperty('--pc-tx', c.tx);
  });
}

/* a new user theme starts as a copy of the template on screen */
function userTplBlank() {
  const t = tpl();
  return { id: 'u' + Date.now().toString(36), ar: Lx('ثيمي ', 'My theme ') + ((S.userTpls || []).length + 1), bg1: t.bg1, bg2: t.bg2, p: t.p, s: t.s || t.p, tx: t.tx, card: t.card || 'glass', art: t.art || 'star8' };
}


/* ---------- adhan sound per prayer ----------
   Each prayer can be switched off, has its own volume, and can use its own recording. With the "custom" sound
   the Fajr adhan only ever plays a Fajr recording (it has «الصلاة خير من النوم»): without one, a short tone plays. */
const SOUND_PRAYERS = ['fajr', 'dhuhr', 'jumuah', 'asr', 'maghrib', 'isha'];
function prayerSound(P) {
  const k = P ? (P.jumuah ? 'jumuah' : P.k) : 'dhuhr', per = (S.sound.per || {})[k] || {};
  return { k, on: per.on !== false, iq: per.iq !== false, vol: per.vol == null ? 100 : +per.vol, media: per.media || '' };
}
/* the recording used for the adhan of this prayer, or '' when none fits */
function adhanMediaFor(k) {
  const A = S.sound.adhan, per = (S.sound.per || {})[k] || {};
  if (per.media) return per.media;
  if (k === 'fajr') return A.mediaFajr || '';
  if (k === 'jumuah') { const d = (S.sound.per || {}).dhuhr || {}; if (d.media) return d.media; }
  return A.media || '';
}
function playAdhan(P, kOverride) {
  const k = kOverride || prayerSound(P).k, per = (S.sound.per || {})[k] || {}, vk = (per.vol == null ? 100 : +per.vol) / 100, A = S.sound.adhan;
  if (A.kind !== 'custom') return Sound.play(A, '', vk);
  const id = adhanMediaFor(k);
  if (!id) return Sound.preset('beep3', Math.max(0, Math.min(1, +S.sound.vol * vk)));   // never the regular adhan at Fajr
  return Sound.play(A, id, vk);
}
