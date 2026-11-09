/* ================= Core: settings, storage, time, schedule, phases ================= */
const PKEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PRAYERS5 = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PNAME = {
  ar: { fajr: 'الفجر', sunrise: 'الشروق', duha: 'الضحى', dhuhr: 'الظهر', jumuah: 'الجمعة', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء', taraweeh: 'التراويح', tahajjud: 'التهجد' },
  en: { fajr: 'Fajr', sunrise: 'Sunrise', duha: 'Duha', dhuhr: 'Dhuhr', jumuah: "Jumu'ah", asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', taraweeh: 'Taraweeh', tahajjud: 'Tahajjud' },
};
const pp = (iq, dur) => ({ adj: 0, fixed: '', iqMode: 'after', iqAfter: iq, iqFixed: '', dur });
const DEFAULTS = {
  v: 1, updatedAt: 0,
  lang: 'ar', orientation: 'auto', digits: 'latn', hour12: true, ampm: 'ar', dateMode: 'both',
  dateOnAzkar: true, dateOnGallery: false, hijriAfterMaghrib: false, showSeconds: true,
  loc: { city: 'الطائف', lat: 21.2703, lng: 40.4158, elev: 0, method: 'umm_alqura', asr: 'shafi', highLat: 'angle', gpsAuto: false, offset: 0 },
  hijriAdj: 0, clockAdjSec: 0,
  p: { fajr: pp(25, 12), sunrise: { adj: 0, fixed: '' }, dhuhr: pp(20, 10), asr: pp(20, 10), maghrib: pp(10, 8), isha: pp(20, 10) },
  calendar: {},
  adhanAnnounceMin: 5, iqamaAnnounceSec: 30,
  showIqamaOnTable: true, iqamaDisplay: 'time',
  // after-prayer adhkar start: auto = after the prayer duration · manual = remote OK / dashboard · mic = when the mosque goes quiet
  azkarAfter: { on: true, min: 5, mode: 'auto', wait: 10, mic: { level: 12, silence: 20, minMin: 3, prayers: { fajr: true, dhuhr: false, asr: false, maghrib: true, isha: true, jumuah: true } } },
  duha: { display: 'alternate', announce: true, afterSunrise: 15 },
  night: { showMidnight: false, showLastThird: true, announceMidnight: false, announceLastThird: false },
  silentNotice: { on: true, minBefore: 2 },
  friday: { on: true, adhanMode: 'dhuhr', fixed: '12:00', khutbahAfter: 0, khutbahDur: 25, dur: 10, title: '', mode: 'title', fajrDur: 15, azkarDirect: true, azkarMin: 7 },
  ramadan: {
    mode: 'auto', ishaAdd: 30,
    p: { fajr: { iqAfter: 20, dur: 15 }, dhuhr: { iqAfter: 20, dur: 10 }, asr: { iqAfter: 20, dur: 10 }, maghrib: { iqAfter: 10, dur: 8 }, isha: { iqAfter: 15, dur: 10 } },
    fridayKhutbahDur: 20, fridayDur: 10,
    taraweeh: { on: true, after: 5, dur: 60, announceSec: 60 },
    tahajjud: { on: true, time: '01:30', dur: 75, announceSec: 60 },
  },
  // main screen layout: size of the clock & next-prayer widgets and where they sit
  screen: { fit: 'fit', zoom: 100, margin: 0 },
  layout: { size: 'large', arrange: 'stack', clockSide: 'start', split: 56, tableTop: false, showNext: true, showRot: true, timeScale: 100, dateScale: 100 },
  flag: { code: 'sa', pos: 'clock', size: 'm', style: 'shadow' },
  nextCard: { bg: 100, border: false, scale: 100, align: 'center', table: false },
  countdown: { style: 'rings2', showSec: true, secColor: '', size: 185 },
  font: { text: 'Noto Kufi Arabic', num: 'Amiri' },
  design: { tpl: 'emerald', useTplColors: true, p: '#d8b45a', s: '#7fd1b9', bgImg: '', bgImgPort: '', bgDim: 0.35, logoImg: '', logoOpacity: 0.15, logoSize: 55, logoTint: 'original', logoColor: '#ffffff' },
  name: {
    mode: 'text', scale: 100, img: '', imgH: 150, imgSide: 'above', imgTint: 'original', imgColor: '#ffffff',
    l1: 'جامع الحي', l2: '', size: 74, size2: 42, pos: 'tc', dx: 0, dy: 0, color: '',
    stroke: 'none', strokeW: 3, strokeColor: '#000000',
    shadow: { on: true, x: 0, y: 4, blur: 10, color: '#000000' },
    bg: { on: false, color: '#000000', op: 0.45 }, showOnEvents: true,
    // where the mosque name (and the district / city line) shows; hidden between the adhan and the iqamah
    on: { main: true, hadith: true, adhan: true, countdown: false, iqama: true, azkar: true, khutbah: true, special: true },
  },
  content: {
    morning: { on: true, offset: -40, dur: 10 }, evening: { on: true, offset: -40, dur: 10 },
    sets: { after: true, morning: true, evening: true, masjid: true },
    hadith: { on: true, sec: 25 },
  },
  // hadith on a page of their own, taking turns with the prayer-times screen (off = the old line on the main screen)
  hadithPage: { on: true, every: 8, perVisit: 1, speed: 'normal', minSec: 10, maxSec: 90, scale: 100, clock: true, progress: true },
  // fully editable lists (from the dashboard or the screen); start from the built-in texts
  // adhkar screens: one at a time or all as cards; an optional picture behind each set
  azkarView: { mode: 'all', cols: 0, notes: true, bg: { morning: '', evening: '', after: '' }, dim: 0.55, imgs: { morning: [], evening: [], after: [] }, imgFit: 'blur' },
  azkarLib: 3,
  lib: { show: {}, st: {} },
  azkar: defaultAzkar(),
  hadiths: defaultHadiths(),
  galleries: [{ id: 'g1', name: 'المعرض الرئيسي', on: true, imgs: [] }],
  gallery: { sec: 10, everyMin: 10, between: false, khutbah: false, auto: true, idleSec: 10, showMin: 0, stopBefore: 5, fx: 'random', fxSec: 1.2, kenburns: true, fit: 'blur', shuffle: false, info: true },
  ticker: { on: true, items: [{ t: 'الرجاء إغلاق الجوال أو ضبطه على الوضع الصامت', on: true }, { t: 'نأمل المحافظة على نظافة المسجد', on: true }], mode: 'scroll', speed: 'normal' },
  notices: [],
  // funeral messages: mode 'after' = the funeral prayer after a given prayer · 'days' = obituary all day for `days` days
  funerals: [],
  events: [],
  saver: { on: true, look: 'timedate', move: false, size: 'm', mode: 'during', startAfter: 15, stopBefore: 15, onMin: 10, offMin: 5, at: '22:00', from: '23:30', to: '03:30', idle: false, idleMin: 30 },
  sound: { vol: 0.8, adhan: { on: true, kind: 'beep', media: '', mediaFajr: '' },
    // each prayer: adhan on/off, its own volume and its own file ('' = the general adhan file; Fajr never uses the general one)
    per: { fajr: { on: true, vol: 100, media: '', iq: true }, dhuhr: { on: true, vol: 100, media: '', iq: true }, jumuah: { on: true, vol: 100, media: '', iq: true }, asr: { on: true, vol: 100, media: '', iq: true }, maghrib: { on: true, vol: 100, media: '', iq: true }, isha: { on: true, vol: 100, media: '', iq: true } }, iqama: { on: true, kind: 'beep3', media: '' }, relay: { on: false, onUrl: '', offUrl: '', lead: 5, hold: 240, iqama: false } },
  sync: { url: '', everyMin: 30 },
  temp: { on: false, unit: 'C', weather: true, inside: { mode: 'off', value: 24, url: '', path: '' } },
  device: { autoStart: true, keepOn: true },
  // automatic themes: by the time of day, by prayer, and for Ramadan / the Eids
  themeAuto: { mode: 'daynight', day: 'p_dhuhr', night: 'p_isha', per: { fajr: 'p_fajr', dhuhr: 'p_dhuhr', asr: 'p_asr', maghrib: 'p_maghrib', isha: 'p_isha' }, occ: true, ramadan: 'ramadan', eidFitr: 'eid_fitr', eidAdha: 'eid_adha' },
  occ: { on: true, ticker: true, items: {} },
  waitTips: { on: true, sec: 20, text: '', page: true, cdSec: 5, lastSec: 60 },
  adhanText: { repeat: true, dua: true },
  lock: { hash: '' },
  ui: { tips: true },
  // text alignment of the main widgets: right | center | left
  align: { clock: 'center', next: 'center', table: 'center', hadith: 'center' },
  // a colour / theme for each prayer in the timetable
  tableTheme: { on: true, mode: 'colors', per: { fajr: 'p_fajr', sunrise: 'p_fajr', dhuhr: 'p_dhuhr', asr: 'p_asr', maghrib: 'p_maghrib', isha: 'p_isha' }, colors: { fajr: '#3a3f7a', sunrise: '#6a5a9a', dhuhr: '#2a6f9e', asr: '#9a6a2a', maghrib: '#9e4a3a', isha: '#1f2a5a' }, strength: 0.75 },
  // themes made by the user (same fields as the built-in templates)
  userTpls: [],
  update: { url: '' },
};

function defaultAzkar() { const o = {}; for (const k of AZKAR_SETS) o[k] = AZKAR[k].map((x, i) => { const y = { id: k[0] + i, t: x.t, s: x.s || '', c: x.c || 0, on: x.on !== false }; if (x.n) y.n = x.n; if (x.f) y.f = x.f; if (x.w) y.w = x.w; return y; }); return o; }
/* Arabic count wording: مرة / مرتان / ٣ مرات / ١٠٠ مرة */
function countLabel(n) { n = +n || 0; if (n < 2) return ''; if (S.lang !== 'ar') return num(n) + ' times'; return n === 2 ? 'مرتان' : num(n) + (n <= 10 ? ' مرات' : ' مرة'); }
function defaultHadiths() { return HADITH.map((x, i) => ({ id: 'h' + i, t: x.t, s: x.s || '', on: true })); }

/* ---------- utilities ---------- */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clone = o => JSON.parse(JSON.stringify(o));
const isObj = o => o && typeof o === 'object' && !Array.isArray(o);
function merge(base, over) {
  const out = clone(base);
  if (!isObj(over)) return out;
  for (const k of Object.keys(over)) out[k] = isObj(out[k]) && isObj(over[k]) ? merge(out[k], over[k]) : over[k];
  return out;
}
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function setPath(o, p, v) { const ks = p.split('.'); let c = o; ks.slice(0, -1).forEach(k => { if (!isObj(c[k])) c[k] = {}; c = c[k]; }); c[ks[ks.length - 1]] = v; }
const pad = n => String(n).padStart(2, '0');
const MIN = 60000, DAY = 86400000;
const addMin = (d, m) => new Date(d.getTime() + m * MIN);
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const atTime = (date, hhmm) => { if (!hhmm) return null; const [h, m] = hhmm.split(':').map(Number); if (isNaN(h)) return null; const r = new Date(date); r.setHours(h, m || 0, 0, 0); return r; };
const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------- settings ---------- */
let S;
const LS_KEY = 'hayya_tv_settings_v1';
function loadSettings() {
  let saved = null; try { saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { }
  // gallery v2: in settings saved before the idle gallery, "every 0 minutes" meant "never automatically"
  if (saved && saved.gallery && saved.gallery.auto === undefined && +saved.gallery.everyMin === 0) saved.gallery.auto = false;
  S = migrate(merge(DEFAULTS, saved || {}));
}
/* older settings kept custom adhkar / hadith in separate lists */
function migrate(o) {
  // reminders: one entry per occasion (on + own text)
  o.occ = o.occ || { on: true, ticker: true, items: {} }; o.occ.items = o.occ.items || {};
  // occasions v2 (1.0.6): each occasion has its own page and editable list of texts; the built-in texts were re-checked
  const occV2 = (o.occLib | 0) < 2;
  if (typeof OCCASIONS !== 'undefined') OCCASIONS.forEach(x => {
    const c = isObj(o.occ.items[x.id]) ? o.occ.items[x.id] : (o.occ.items[x.id] = { on: true });
    if (!Array.isArray(c.list) || occV2) {
      const own = String(c.text || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const i = l.lastIndexOf(' — '); return { id: uid(), t: i > 0 ? l.slice(0, i) : l, s: i > 0 ? l.slice(i + 3) : '', on: true }; });
      const keep = (Array.isArray(c.list) ? c.list : []).filter(y => y && !/^o\d+$/.test(y.id || ''));
      c.list = x.items.map((y, i) => ({ id: 'o' + i, t: y.t, s: y.s, on: true })).concat(keep, own);
    }
    delete c.text;
    if (c.alone == null) c.alone = false; if (c.tAlone == null) c.tAlone = false; if (c.tk == null) c.tk = true;
  });
  o.occLib = 2;
  // 1.0.7: the quiet screen runs by itself during the prayers, and the prayer times show 8 s between hadith pages
  if ((o.defV | 0) < 107) {
    if (o.saver) { o.saver.on = true; o.saver.mode = 'during'; }
    if (o.hadithPage && +o.hadithPage.every === 45) o.hadithPage.every = 8;
    o.defV = 107;
  }
  // 1.0.10: the defaults the mosque asked for, applied once to screens set up with an older version
  if ((o.defV | 0) < 110) {
    const set = (path, v) => { const ks = path.split('.'); let x = o; for (const k of ks.slice(0, -1)) { if (!isObj(x[k])) x[k] = {}; x = x[k]; } x[ks[ks.length - 1]] = v; };
    [['loc.city', 'الطائف'], ['loc.lat', 21.2703], ['loc.lng', 40.4158], ['loc.method', 'umm_alqura'], ['loc.gpsAuto', false],
     ['countdown.style', 'rings2'], ['countdown.size', 185], ['font.text', 'Noto Kufi Arabic'], ['font.num', 'Amiri'],
     ['themeAuto.mode', 'daynight'], ['tableTheme.on', true], ['tableTheme.mode', 'colors'],
     ['layout.arrange', 'stack'], ['layout.clockSide', 'start'], ['nextCard.border', false], ['flag.code', 'sa'], ['flag.pos', 'clock']].forEach(([k, v]) => set(k, v));
    o.defV = 110;
  }
  // 1.0.11: the mosque name is hidden between the adhan and the iqamah; earlier "show during events: off" is kept
  if ((o.defV | 0) < 111) {
    if (o.name) {
      o.name.on = Object.assign({ main: true, hadith: true, adhan: true, countdown: false, iqama: true, azkar: true, khutbah: true, special: true }, o.name.on || {});
      if (o.name.showOnEvents === false) ['adhan', 'iqama', 'azkar', 'khutbah', 'special'].forEach(k => o.name.on[k] = false);
      o.name.on.countdown = false;
    }
    if (o.waitTips) { o.waitTips.page = true; o.waitTips.cdSec = 5; }
    o.defV = 111;
  }
  // v2 screensaver: centred and still, with the Hijri and Gregorian date
  if (!o.saverV) { if (o.saver) { if (o.saver.look === 'time') o.saver.look = 'timedate'; o.saver.move = false; } o.saverV = 2; }
  // library v2: replace the old built-in texts with the full authenticated library, keep the user's own items
  // library v3 (1.0.6): the adhkar of islambook.com with counts and takhrij; weak / disputed items kept but off
  if ((o.azkarLib | 0) < 3) {
    const lib = defaultAzkar(), builtin = /^[maeh]\d+$/;
    o.azkar = o.azkar || {};
    for (const k of AZKAR_SETS) o.azkar[k] = lib[k].concat(((o.azkar && o.azkar[k]) || []).filter(x => x && !builtin.test(x.id || '')));
    o.hadiths = defaultHadiths().concat((o.hadiths || []).filter(x => x && !/^h\d+$/.test(x.id || '')));
    o.azkarLib = 3;
  }
  AZKAR_SETS.forEach(k => { if (!Array.isArray(o.azkar[k])) o.azkar[k] = defaultAzkar()[k]; });
  const c = o.content || {};
  if (Array.isArray(c.custom)) { c.custom.forEach(x => { if (x.t && o.azkar[x.set]) o.azkar[x.set].push({ id: uid(), t: x.t, s: x.s || '', c: 0, on: true }); }); delete c.custom; }
  if (c.hadith && Array.isArray(c.hadith.custom)) { c.hadith.custom.forEach(x => x.t && o.hadiths.push({ id: uid(), t: x.t, s: x.s || '', on: true })); delete c.hadith.custom; }
  if (c.hadith && c.hadith.builtin === false) { o.hadiths.forEach(h => { if (/^h\d+$/.test(h.id)) h.on = false; }); delete c.hadith.builtin; }
  return o;
}
let saveTimer;
function saveSettings(touch = true, markDirty = true) {
  if (touch) S.updatedAt = Date.now();
  invalidate();
  Hooks.persist(markDirty);
}
/* Behaviour that differs between the TV screen and the dashboard editor */
const Hooks = {
  persist(markDirty) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { toast(T('saveFail')); } }, 150);
    if (markDirty && typeof Cloud !== 'undefined') Cloud.dirty();
  },
  changed(k) {                         // refresh the live screen after a settings change
    if (k === 'lang' || k === 'orientation' || /^(layout|flag|nextCard|screen|hadithPage\.on)/.test(k)) applyAll();
    else if (/^themeAuto/.test(k)) { themeKey = ''; applyTheme(); refitAll(); }
    else if (/^device/.test(k)) { applyDevice(); }
    else if (/^azkarView/.test(k)) { $('#ov')._pg = null; }
    else if (/^gallery\./.test(k)) { Gal.cur = -1; refreshGallery(true); }
    else if (/^(design|font|countdown\.secColor)/.test(k)) { applyTheme(); $('#nameLayer')._k = ''; refitAll(); }
    else if (/^(galleries)/.test(k)) refreshGallery();
    else refitAll();
    tickKey = ''; ovKey = '';
  },
  async storeMedia(blob, kind) { const id = (kind === 'audio' ? 'aud_' : 'img_') + uid(); await DB.put(id, blob); return id; },
  dropMedia(id) { return DB.del(id).catch(() => { }); },
  mediaBase() { return typeof Cloud !== 'undefined' && Cloud.server() ? Cloud.server() + '/api/media/' : ''; },
  cacheMedia: true,
};

/* ---------- media store (IndexedDB) ---------- */
const DB = (() => {
  let dbp; const urls = {};
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('hayya_tv_media', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('m');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction('m', mode); const st = t.objectStore('m'); const q = fn(st); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  return {
    put: (id, blob) => { delete urls[id]; return tx('readwrite', s => s.put(blob, id)); },
    get: id => tx('readonly', s => s.get(id)),
    del: id => { if (urls[id]) URL.revokeObjectURL(urls[id]); delete urls[id]; return tx('readwrite', s => s.delete(id)); },
    keys: () => tx('readonly', s => s.getAllKeys()),
    async url(id) {
      if (!id) return '';
      if (/^(https?:|data:|blob:)/.test(id)) return id;
      if (urls[id]) return urls[id];
      let b = await this.get(id).catch(() => null);
      if (!b && /^m_/.test(id)) {             // media from the dashboard: download once, keep for offline use
        const base = Hooks.mediaBase(); if (!base) return '';
        if (!Hooks.cacheMedia) return base + id;
        try { const r = await fetch(base + id); if (r.ok) { b = await r.blob(); this.put(id, b).catch(() => { }); } } catch (e) { }
      }
      return b ? (urls[id] = URL.createObjectURL(b)) : '';
    },
  };
})();

/* ---------- i18n ---------- */
const STR = {
  ar: {
    next: 'الصلاة القادمة', remain: 'متبقي', adhan: 'الأذان', iqama: 'الإقامة', iqamaAfter: 'الإقامة بعد', minShort: 'د',
    adhanNow: 'حان الآن موعد أذان صلاة', iqamaNow: 'أقيمت الصلاة', straighten: 'استووا واعتدلوا، وسدّوا الفُرَج',
    silent: 'الرجاء ضبط الهاتف على وضع الصامت', azkarAfter: 'أذكار بعد الصلاة', morning: 'أذكار الصباح', evening: 'أذكار المساء',
    khutbah: 'خطبة الجمعة', khutbahSub: '«إذا قلت لصاحبك يوم الجمعة: أنصت، والإمام يخطب، فقد لغوت» — متفق عليه', khutbahIn: 'الخطبة بعد', taraweehNow: 'حان موعد صلاة التراويح',
    tahajjudNow: 'حان موعد صلاة التهجد', duhaNow: 'دخل وقت صلاة الضحى', lastThirdNow: 'دخل الثلث الأخير من الليل', midnightNow: 'منتصف الليل',
    lastThird: 'الثلث الأخير', midnight: 'منتصف الليل', toAdhan: 'على الأذان', toIqama: 'على الإقامة', openSettings: 'اضغط OK لفتح الإعدادات',
    saveFail: 'تعذّر الحفظ — مساحة التخزين ممتلئة', days: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    hm: ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'],
    gm: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    am: 'ص', pm: 'م', hijriSuffix: 'هـ', gregSuffix: 'م', prayerTime: 'وقت الصلاة', funeral: 'صلاة الجنازة', event: 'مناسبة',
  },
  en: {
    next: 'Next prayer', remain: 'Remaining', adhan: 'Adhan', iqama: 'Iqamah', iqamaAfter: 'Iqamah in', minShort: 'min',
    adhanNow: 'It is now time for', iqamaNow: 'Prayer is starting', straighten: 'Straighten the rows and close the gaps',
    silent: 'Please switch your phone to silent', azkarAfter: 'Adhkar after prayer', morning: 'Morning adhkar', evening: 'Evening adhkar',
    khutbah: "Jumu'ah Khutbah", khutbahSub: 'Please listen attentively to the khutbah', khutbahIn: 'Khutbah in', taraweehNow: 'Taraweeh prayer',
    tahajjudNow: 'Tahajjud prayer', duhaNow: 'Duha time has begun', lastThirdNow: 'The last third of the night has begun', midnightNow: 'Midnight',
    lastThird: 'Last third', midnight: 'Midnight', toAdhan: 'to adhan', toIqama: 'to iqamah', openSettings: 'Press OK to open settings',
    saveFail: 'Could not save — storage is full', days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    hm: ['Muharram', 'Safar', "Rabi' I", "Rabi' II", 'Jumada I', 'Jumada II', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah'],
    gm: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    am: 'AM', pm: 'PM', hijriSuffix: 'AH', gregSuffix: '', prayerTime: 'Prayer time', funeral: 'Funeral prayer', event: 'Event',
  },
};
const T = k => (STR[S.lang] || STR.ar)[k] ?? k;
const PN = k => PNAME[S.lang][k] || k;

/* ---------- formatting ---------- */
const AR_DIG = '٠١٢٣٤٥٦٧٨٩';
const num = x => S.digits === 'arab' ? String(x).replace(/\d/g, d => AR_DIG[d]) : String(x);
function fmtTime(d, { sec = false, ampm = true } = {}) {
  if (!d) return { t: '--:--', suf: '' };
  let h = d.getHours(); const m = d.getMinutes();
  let suf = '';
  if (S.hour12) { suf = h < 12 ? (S.ampm === 'ar' ? 'ص' : 'AM') : (S.ampm === 'ar' ? 'م' : 'PM'); h = h % 12 || 12; }
  const s = `${S.hour12 ? h : pad(h)}:${pad(m)}${sec ? ':' + pad(d.getSeconds()) : ''}`;
  return { t: num(s), suf: ampm ? suf : '' };
}
const fmtT = d => { const r = fmtTime(d); return r.t + (r.suf ? ' ' + r.suf : ''); };
function fmtDur(sec, forceH = false) {
  sec = Math.max(0, Math.ceil(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return num(h || forceH ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`);
}
let hijriFmt;
function hijri(date) {
  const d = new Date(date.getTime() + (S.hijriAdj || 0) * DAY);
  try {
    hijriFmt = hijriFmt || new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' });
    const p = Object.fromEntries(hijriFmt.formatToParts(d).map(x => [x.type, x.value]));
    return { d: +p.day, m: +p.month, y: parseInt(p.year) };
  } catch (e) { return kuwaitiHijri(d); }
}
function kuwaitiHijri(date) { // arithmetic fallback for very old WebViews
  const jd = Math.floor(date.getTime() / DAY + 2440587.5) + 0.5;
  const l0 = Math.floor(jd) - 1948440 + 10632, n = Math.floor((l0 - 1) / 10631), l1 = l0 - 10631 * n + 354;
  const j = Math.floor((10985 - l1) / 5316) * Math.floor(50 * l1 / 17719) + Math.floor(l1 / 5670) * Math.floor(43 * l1 / 15238);
  const l2 = l1 - Math.floor((30 - j) / 15) * Math.floor(17719 * j / 50) - Math.floor(j / 16) * Math.floor(15238 * j / 43) + 29;
  const m = Math.floor(24 * l2 / 709); return { d: l2 - Math.floor(709 * m / 24), m, y: 30 * n + j - 30 };
}
function dateLines(now, sched, both) {
  let hd = now;
  if (S.hijriAfterMaghrib && sched && sched.maghrib && now >= sched.maghrib.adhan) hd = new Date(now.getTime() + DAY);
  const h = hijri(hd);
  const H = `${num(h.d)} ${T('hm')[h.m - 1]} ${num(h.y)} ${T('hijriSuffix')}`;
  const G = `${num(now.getDate())} ${T('gm')[now.getMonth()]} ${num(now.getFullYear())} ${T('gregSuffix')}`.trim();
  return { day: T('days')[now.getDay()], hijri: both || S.dateMode !== 'greg' ? H : '', greg: both || S.dateMode !== 'hijri' ? G : '' };
}

/* ---------- Ramadan & schedule ---------- */
const ramadanDay = d => S.ramadan.mode === 'on' || (S.ramadan.mode === 'auto' && hijri(d).m === 9);
const ramadanNight = d => S.ramadan.mode === 'on' || (S.ramadan.mode === 'auto' && hijri(new Date(d.getTime() + DAY)).m === 9);

const schedCache = new Map();
function invalidate() { schedCache.clear(); intervalsCache.clear(); }
function schedule(date) {
  const key = dayKey(date);
  if (schedCache.has(key)) return schedCache.get(key);
  const L = S.loc, y = date.getFullYear(), mo = date.getMonth() + 1, d = date.getDate();
  const r = PT.compute(y, mo, d, +L.lat, +L.lng, { method: L.method, asr: L.asr, highLat: L.highLat, elevation: +L.elev || 0 });
  const cal = S.calendar[key];
  const ramD = ramadanDay(date), ramN = ramadanNight(date);
  const friday = date.getDay() === 5 && S.friday.on;
  const out = { key, date, ramD, ramN, friday, method: r.method, midnight: r.midnight, lastThird: r.lastThird };
  PKEYS.forEach((k, i) => {
    const conf = S.p[k];
    let t = cal && cal[i] ? atTime(date, cal[i]) : r[k];
    // suburbs: one offset for all prayers on top of each prayer's own adjustment
    if (conf.fixed) t = atTime(date, conf.fixed) || t; else t = addMin(t, (+conf.adj || 0) + (k === 'sunrise' ? 0 : +S.loc.offset || 0));
    if (k === 'isha' && ramN && S.ramadan.ishaAdd) t = addMin(t, +S.ramadan.ishaAdd);
    out[k] = { k, adhan: t };
  });
  out.sunrise.iqama = null; out.duha = addMin(out.sunrise.adhan, +S.duha.afterSunrise || 15);
  for (const k of PRAYERS5) {
    const P = out[k];
    const ram = (k === 'fajr' || k === 'dhuhr' || k === 'asr') ? ramD : ramN;
    const base = S.p[k], rc = ram ? S.ramadan.p[k] : null;
    const iqAfter = rc ? +rc.iqAfter : +base.iqAfter;
    P.iqama = base.iqMode === 'fixed' && base.iqFixed && !rc ? (atTime(date, base.iqFixed) || addMin(P.adhan, iqAfter)) : addMin(P.adhan, iqAfter);
    if (P.iqama < P.adhan) P.iqama = new Date(P.adhan);
    P.dur = rc ? +rc.dur : +base.dur;
    P.name = k;
    if (k === 'fajr' && friday) P.dur = +S.friday.fajrDur;
    if (k === 'dhuhr' && friday) {
      const F = S.friday; P.name = 'jumuah'; P.jumuah = true;
      if (F.adhanMode === 'fixed' && F.fixed) P.adhan = atTime(date, F.fixed);
      const kDur = ramD ? +S.ramadan.fridayKhutbahDur : +F.khutbahDur;
      P.khutbah = addMin(P.adhan, +F.khutbahAfter || 0);
      P.iqama = addMin(P.khutbah, kDur);
      P.dur = ramD ? +S.ramadan.fridayDur : +F.dur;   // = the minutes after the iqamah when the Friday adhkar begin
      P.azMin = +F.azkarMin || 0;
    }
    P.iqAnnEnd = new Date(P.iqama.getTime() + (+S.iqamaAnnounceSec || 0) * 1000);
    P.prayEnd = addMin(P.iqAnnEnd, P.dur);
    // manual / microphone start: the black prayer screen waits for the signal, up to `wait` extra minutes
    if (azWaitsSignal(P)) P.prayEnd = addMin(P.iqAnnEnd, P.dur + (+S.azkarAfter.wait || 10));
    P.azkarEnd = S.azkarAfter.on && S.content.sets.after ? addMin(P.prayEnd, P.azMin || +S.azkarAfter.min) : P.prayEnd;
  }
  if (ramN && S.ramadan.taraweeh.on) {
    const st = addMin(out.isha.azkarEnd, +S.ramadan.taraweeh.after || 0);
    out.taraweeh = { start: st, end: addMin(st, +S.ramadan.taraweeh.dur), ann: S.ramadan.taraweeh.announceSec };
  }
  const h = hijri(date);
  if (S.ramadan.tahajjud.on && (S.ramadan.mode === 'on' || (S.ramadan.mode === 'auto' && h.m === 9 && h.d >= 21))) {
    const st = atTime(date, S.ramadan.tahajjud.time);
    if (st) out.tahajjud = { start: st, end: addMin(st, +S.ramadan.tahajjud.dur), ann: S.ramadan.tahajjud.announceSec };
  }
  schedCache.set(key, out);
  if (schedCache.size > 6) schedCache.delete(schedCache.keys().next().value);
  return out;
}

/* intervals: {ph, from, to, prio, P, extra} */
const intervalsCache = new Map();
function intervals(date) {
  const key = dayKey(date);
  if (intervalsCache.has(key)) return intervalsCache.get(key);
  const sc = schedule(date), L = [];
  const add = (ph, from, to, prio, P, extra) => { if (from && to && to > from) L.push({ ph, from, to, prio, P, ...extra }); };
  for (const k of PRAYERS5) {
    const P = sc[k];
    const annEnd = new Date(Math.min(addMin(P.adhan, +S.adhanAnnounceMin), P.jumuah ? P.khutbah : P.iqama));
    add('adhan', P.adhan, P.jumuah ? new Date(Math.max(annEnd, P.adhan)) : annEnd, 100, P);
    if (P.jumuah) {
      add('countdown', annEnd, P.khutbah, 100, P, { target: P.khutbah });
      add('khutbah', P.khutbah, P.iqama, 101, P);
    } else add('countdown', annEnd, P.iqama, 100, P, { target: P.iqama });
    add('iqama', P.iqama, P.iqAnnEnd, 102, P);
    add('prayer', P.iqAnnEnd, P.prayEnd, 102, P);
    add('azkar', P.prayEnd, P.azkarEnd, 90, P, { set: 'after' });
  }
  if (sc.taraweeh) { const t = sc.taraweeh; add('special', t.start, t.end, 85, null, { kind: 'taraweeh', ann: t.ann }); }
  if (sc.tahajjud) { const t = sc.tahajjud; add('special', t.start, t.end, 85, null, { kind: 'tahajjud', ann: t.ann }); }
  if (S.duha.announce) add('notice', sc.duha, addMin(sc.duha, 1), 70, null, { kind: 'duha' });
  if (S.night.announceLastThird) add('notice', sc.lastThird, addMin(sc.lastThird, 1), 70, null, { kind: 'lastThird' });
  if (S.night.announceMidnight) add('notice', sc.midnight, addMin(sc.midnight, 1), 70, null, { kind: 'midnight' });
  const C = S.content;
  if (C.morning.on && C.sets.morning) { const st = addMin(sc.sunrise.adhan, +C.morning.offset); add('azkar', st, addMin(st, +C.morning.dur), 60, null, { set: 'morning' }); }
  if (C.evening.on && C.sets.evening) { const st = addMin(sc.maghrib.adhan, +C.evening.offset); add('azkar', st, addMin(st, +C.evening.dur), 60, null, { set: 'evening' }); }
  intervalsCache.set(key, L);
  if (intervalsCache.size > 6) intervalsCache.delete(intervalsCache.keys().next().value);
  return L;
}
function azWaitsSignal(P) {
  const A = S.azkarAfter, m = A.mode;
  // Friday: the adhkar start right at the time set in the Friday settings — no waiting black screen
  if (P.jumuah && S.friday.azkarDirect !== false) return false;
  if (m === 'manual') return true;
  if (m === 'mic') { const pr = A.mic.prayers || {}; return !!pr[P.jumuah ? 'jumuah' : P.k]; }
  return false;
}
/* the after-prayer adhkar started by hand (remote / dashboard) or by the microphone */
let azTrig = null;   // { id, at }
const prayerId = P => P && (dayKey(P.adhan) + P.k);
function phaseAt(now) {
  const today = new Date(now); today.setHours(12, 0, 0, 0);
  const yest = new Date(today.getTime() - DAY);
  let best = null;
  for (const d of [yest, today]) for (const iv of intervals(d)) {
    if (!(now >= iv.from && now < iv.to)) continue;
    // once the adhkar were started by signal, that prayer's own black screen / timed adhkar are over
    if (azTrig && iv.P && prayerId(iv.P) === azTrig.id && now >= azTrig.at && (iv.ph === 'prayer' || iv.ph === 'azkar')) continue;
    if (!best || iv.prio > best.prio) best = iv;
  }
  const azm = ((azTrig && azTrig.P && azTrig.P.azMin) || +S.azkarAfter.min || 5) * MIN;
  if (azTrig && now >= azTrig.at && now < azTrig.at + azm && (!best || best.prio < 100))
    return { ph: 'azkar', set: 'after', from: new Date(azTrig.at), to: new Date(azTrig.at + azm), prio: 95, P: azTrig.P };
  return best || { ph: 'normal', prio: 0 };
}
/* start the after-prayer adhkar now (only while a prayer is being prayed, or just after) */
function startAzkarNow(src) {
  const t = now(), ph = phaseAt(t);
  if (!(ph.ph === 'prayer' || ph.ph === 'iqama' || (ph.ph === 'azkar' && ph.set === 'after'))) return false;
  if (!S.azkarAfter.on || !S.content.sets.after) return false;
  azTrig = { id: prayerId(ph.P), at: t.getTime(), P: ph.P, src };
  return true;
}
function nextPrayer(now) {
  const today = new Date(now); today.setHours(12, 0, 0, 0);
  for (const d of [today, new Date(today.getTime() + DAY)]) {
    const sc = schedule(d);
    for (const k of PRAYERS5) if (sc[k].adhan > now) return sc[k];
  }
  return null;
}
/* the prayer whose adhan passed but iqama/prayer still pending -> for the table highlight */
function currentPrayerKey(now) {
  const sc = schedule(now); let cur = null;
  for (const k of PRAYERS5) if (sc[k].adhan <= now) cur = k;
  return cur;
}

/* ---------- clock ---------- */
const now = () => new Date(Date.now() + (+S.clockAdjSec || 0) * 1000);

/* ---------- sound ---------- */
const Sound = (() => {
  let ctx, audio;
  const ac = () => ctx || (ctx = new (window.AudioContext || window.webkitAudioContext)());
  function tone(freq, start, dur, vol) {
    const c = ac(), o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = freq; o.connect(g); g.connect(c.destination);
    const t = c.currentTime + start; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.start(t); o.stop(t + dur + 0.05);
  }
  function preset(kind, vol) {
    try { if (ac().state === 'suspended') ctx.resume(); } catch (e) { return; }
    if (kind === 'beep') tone(880, 0, 0.6, vol);
    else if (kind === 'beep3') [0, 0.7, 1.4].forEach(s => tone(988, s, 0.45, vol));
    else if (kind === 'chime') [[660, 0], [880, 0.35], [1320, 0.7]].forEach(([f, s]) => tone(f, s, 1.4, vol * 0.8));
  }
  async function play(cfg, mediaId, volK) {
    stop();
    const vol = Math.max(0, Math.min(1, +S.sound.vol * (volK == null ? 1 : volK)));
    if (!cfg || cfg.kind === 'none') return;
    if (cfg.kind === 'custom') {
      const src = await DB.url(mediaId || cfg.media);
      if (!src) return preset('beep', vol);
      audio = new Audio(src); audio.volume = vol; audio.play().catch(() => preset('beep', vol));
    } else preset(cfg.kind, vol);
  }
  function stop() { if (audio) { audio.pause(); audio = null; } }
  return { play, stop, preset, unlock: () => { try { ac().resume(); } catch (e) { } } };
})();

/* ---------- toast ---------- */
function toast(msg, ms = 3000) {
  let el = $('#toast'); if (!el) return;
  el.textContent = msg; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), ms);
}

/* ---------- native bridge (Android wrapper) ---------- */
const Native = window.HayyaNative || null;

/* ---------- sync / backup ---------- */
async function syncFromUrl(manual) {
  const u = (S.sync.url || '').trim(); if (!u) { if (manual) toast(S.lang === 'ar' ? 'لا يوجد رابط مزامنة' : 'No sync URL'); return; }
  try {
    const r = await fetch(u + (u.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
    const j = await r.json(); const remote = j.settings || j;
    if (manual || (remote.updatedAt || 0) > (S.updatedAt || 0)) {
      const keep = { orientation: S.orientation, sync: S.sync };
      S = migrate(merge(DEFAULTS, { ...remote, ...keep })); saveSettings(false); applyAll(); toast(S.lang === 'ar' ? 'تمت المزامنة' : 'Synced');
    } else if (manual) toast(S.lang === 'ar' ? 'الإعدادات محدّثة' : 'Already up to date');
  } catch (e) { if (manual) toast((S.lang === 'ar' ? 'تعذّرت المزامنة: ' : 'Sync failed: ') + e.message); }
}
async function exportBackup(withMedia) {
  const data = { app: 'hayya-tv', v: 1, exportedAt: new Date().toISOString(), settings: S, media: {} };
  if (withMedia) {
    for (const id of await DB.keys()) {
      const b = await DB.get(id);
      data.media[id] = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
    }
  }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const name = `hayya-tv-backup-${dayKey(new Date())}.json`;
  if (Native && Native.saveFile) { const fr = new FileReader(); fr.onload = () => Native.saveFile(name, fr.result); fr.readAsDataURL(blob); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
}
async function importBackup(file) {
  const j = JSON.parse(await file.text());
  for (const [id, dataUrl] of Object.entries(j.media || {})) { const b = await (await fetch(dataUrl)).blob(); await DB.put(id, b); }
  S = migrate(merge(DEFAULTS, j.settings || j)); saveSettings(false); applyAll();
}
function importCalendarCSV(text) {
  // lines: date,fajr,sunrise,dhuhr,asr,maghrib,isha  (date: YYYY-MM-DD or DD/MM/YYYY)
  let n = 0; const cal = {};
  for (const line of text.split(/\r?\n/)) {
    const c = line.split(/[,;\t]/).map(x => x.trim()); if (c.length < 7) continue;
    let dk = c[0]; const m = dk.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/); if (m) dk = `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dk)) continue;
    const times = c.slice(1, 7).map(t => /^\d{1,2}:\d{2}/.test(t) ? t.slice(0, 5).padStart(5, '0') : '');
    cal[dk] = times; n++;
  }
  S.calendar = cal; saveSettings(); return n;
}
