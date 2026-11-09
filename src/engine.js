/* ================= Prayer-time engine (offline) =================
   Astronomical algorithm (Jean Meeus / PrayTimes approach).
   Returns Date objects in absolute time; display uses device clock. */
const PT = (() => {
  const dtr = d => d * Math.PI / 180, rtd = r => r * 180 / Math.PI;
  const sin = d => Math.sin(dtr(d)), cos = d => Math.cos(dtr(d)), tan = d => Math.tan(dtr(d));
  const asin = x => rtd(Math.asin(x)), acos = x => rtd(Math.acos(x)), atan2 = (y, x) => rtd(Math.atan2(y, x));
  const acot = x => rtd(Math.atan(1 / x));
  const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };
  const fixAngle = a => fix(a, 360), fixHour = a => fix(a, 24);

  // fajr/isha: degrees, or {min} = minutes after maghrib. adj: method minute tweaks
  const METHODS = {
    auto:      { ar: 'تلقائي حسب الموقع', en: 'Auto (by location)' },
    umm_alqura:{ ar: 'أم القرى (مكة المكرمة)', en: 'Umm al-Qura, Makkah', fajr: 18.5, isha: { min: 90 }, ramadanIsha: { min: 120 } },
    mwl:       { ar: 'رابطة العالم الإسلامي', en: 'Muslim World League', fajr: 18, isha: 17, adj: { dhuhr: 1 } },
    egypt:     { ar: 'الهيئة المصرية العامة للمساحة', en: 'Egyptian General Authority', fajr: 19.5, isha: 17.5, adj: { dhuhr: 1 } },
    kuwait:    { ar: 'الكويت', en: 'Kuwait', fajr: 18, isha: 17.5 },
    qatar:     { ar: 'قطر', en: 'Qatar', fajr: 18, isha: { min: 90 } },
    gulf:      { ar: 'منطقة الخليج', en: 'Gulf Region', fajr: 19.5, isha: { min: 90 } },
    turkey:    { ar: 'تركيا (ديانت)', en: 'Turkey (Diyanet)', fajr: 18, isha: 17, adj: { sunrise: -7, dhuhr: 5, asr: 4, maghrib: 7 } },
    singapore: { ar: 'سنغافورة', en: 'Singapore (MUIS)', fajr: 20, isha: 18, adj: { dhuhr: 1 } },
    karachi:   { ar: 'جامعة العلوم الإسلامية - كراتشي', en: 'Univ. of Islamic Sciences, Karachi', fajr: 18, isha: 18, adj: { dhuhr: 1 } },
    isna:      { ar: 'أمريكا الشمالية (ISNA)', en: 'North America (ISNA)', fajr: 15, isha: 15, adj: { dhuhr: 1 } },
    france:    { ar: 'فرنسا (UOIF)', en: 'France (UOIF)', fajr: 12, isha: 12 },
    russia:    { ar: 'روسيا', en: 'Russia', fajr: 16, isha: 15 },
  };

  // Picks a method from coordinates when "auto" is selected
  function autoMethod(lat, lng) {
    const box = (a, b, c, d) => lat >= a && lat <= b && lng >= c && lng <= d;
    if (box(16, 32.5, 34.5, 56) && !box(28.5, 30.2, 46.5, 48.6)) {
      if (box(24.4, 26.3, 50.7, 51.7)) return 'qatar';
      if (box(22.5, 26.5, 51.5, 56.5) || box(16, 26.5, 52, 60)) return 'gulf';
      return 'umm_alqura';
    }
    if (box(28.5, 30.2, 46.5, 48.6)) return 'kuwait';
    if (box(16, 27, 52, 60)) return 'gulf';
    if (box(22, 32, 24.5, 37)) return 'egypt';
    if (box(35.8, 42.2, 25.6, 44.9)) return 'turkey';
    if (box(-11, 7.5, 95, 141)) return 'singapore';
    if (box(23.5, 37.2, 60.8, 77.9) || box(20.5, 26.7, 88, 92.7)) return 'karachi';
    if (box(14, 72, -170, -50)) return 'isna';
    if (box(41.3, 51.2, -5.2, 9.7)) return 'france';
    if (box(41, 82, 27, 180)) return 'russia';
    return 'mwl';
  }

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }
  function sunPos(jd) {
    const D = jd - 2451545.0, g = fixAngle(357.529 + 0.98560028 * D), q = fixAngle(280.459 + 0.98564736 * D);
    const L = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g)), e = 23.439 - 0.00000036 * D;
    const RA = atan2(cos(e) * sin(L), cos(L)) / 15;
    return { decl: asin(sin(e) * sin(L)), eqt: q / 15 - fixHour(RA) };
  }

  /* compute(dateLocal{y,m,d}, lat, lng, opts) -> {fajr,sunrise,dhuhr,asr,maghrib,isha,midnight,lastThird} (Date) */
  function compute(y, m, d, lat, lng, o = {}) {
    let key = o.method || 'auto'; if (key === 'auto') key = autoMethod(lat, lng);
    const M = METHODS[key] || METHODS.mwl;
    const elev = o.elevation || 0, riseAngle = 0.833 + 0.0347 * Math.sqrt(elev);
    const jd0 = julian(y, m, d) - lng / (15 * 24);
    const midDay = t => fixHour(12 - sunPos(jd0 + t / 24).eqt);
    const angleTime = (angle, t, ccw) => {
      const s = sunPos(jd0 + t / 24), noon = midDay(t);
      const v = (-sin(angle) - sin(s.decl) * sin(lat)) / (cos(s.decl) * cos(lat));
      const T = acos(v) / 15; return noon + (ccw ? -T : T);
    };
    const asrTime = (f, t) => { const s = sunPos(jd0 + t / 24); return angleTime(-acot(f + tan(Math.abs(lat - s.decl))), t); };

    // initial guesses (hours), 2 iterations for accuracy
    let t = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, isha: 18 };
    for (let i = 0; i < 2; i++) {
      t = {
        fajr: angleTime(M.fajr, t.fajr, true),
        sunrise: angleTime(riseAngle, t.sunrise, true),
        dhuhr: midDay(t.dhuhr),
        asr: asrTime(o.asr === 'hanafi' ? 2 : 1, t.asr),
        sunset: angleTime(riseAngle, t.sunset),
        isha: typeof M.isha === 'number' ? angleTime(M.isha, t.isha) : NaN,
      };
    }
    // high-latitude fallback (angle-based night portion)
    const night = fixHour(t.sunrise - t.sunset);
    const portion = a => o.highLat === 'middle' ? 0.5 : o.highLat === 'seventh' ? 1 / 7 : a / 60;
    if (isNaN(t.fajr) || fixHour(t.sunrise - t.fajr) > portion(M.fajr) * night) t.fajr = t.sunrise - portion(M.fajr) * night;
    let ishaRule = M.isha; if (o.ramadan && M.ramadanIsha && o.ummAlQuraRamadan !== false) ishaRule = M.ramadanIsha;
    if (typeof ishaRule === 'object') t.isha = t.sunset + ishaRule.min / 60;
    else if (isNaN(t.isha) || fixHour(t.isha - t.sunset) > portion(ishaRule) * night) t.isha = t.sunset + portion(ishaRule) * night;
    t.maghrib = t.sunset;

    const base = Date.UTC(y, m - 1, d);
    const adj = M.adj || {};
    const toDate = (h, k) => new Date(base + Math.round(((h - lng / 15) * 60 + (adj[k] || 0)) * 60) * 1000);
    const out = { method: key };
    for (const k of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      const dt = toDate(t[k], k);
      dt.setSeconds(dt.getSeconds() >= 30 ? 60 : 0, 0); // round to nearest minute
      out[k] = dt;
    }
    // midnight & last third: from today's maghrib to tomorrow's fajr
    const nextFajr = toDate(t.fajr + 24, 'fajr');
    const span = nextFajr - out.maghrib;
    out.midnight = new Date(out.maghrib.getTime() + span / 2);
    out.lastThird = new Date(out.maghrib.getTime() + span * 2 / 3);
    return out;
  }
  return { compute, METHODS, autoMethod };
})();
if (typeof module !== 'undefined') module.exports = PT;
