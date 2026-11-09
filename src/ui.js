/* ================= Settings UI (remote-control friendly) ================= */
let citySearchRes = null, citySearchQ = '';
let settingsOpen = false, curCat = 'loc', forced = null, azkarTab = 'morning', occTab = 'friday';
const Lx = (ar, en) => S.lang === 'ar' ? ar : en;
const opt = (v, ar, en) => [v, Lx(ar, en || ar)];

/* ---------- field builders ---------- */
const val = k => getPath(S, k);
const row = (label, ctl, help = '', cls = '') => `<div class="row ${cls}"><label>${label}${help ? `<small>${help}</small>` : ''}</label><div class="ctl">${ctl}</div></div>`;
const tg = k => `<button class="f tg ${val(k) ? 'on' : ''}" data-k="${k}" data-fid="${k}" data-type="toggle"><i></i><span>${val(k) ? Lx('مفعّل', 'On') : Lx('معطّل', 'Off')}</span></button>`;
const sel = (k, opts, numeric) => `<select class="f" data-k="${k}" data-fid="${k}" ${numeric ? 'data-num="1"' : ''}>${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(val(k)) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
const nm = (k, min, max, step = 1, unit = '') => `<div class="numf"><button class="f st" data-act="step" data-arg="${k}|${-step}|${min}|${max}" data-fid="${k}-">−</button><input class="f" type="number" inputmode="decimal" data-k="${k}" data-fid="${k}" data-num="1" min="${min}" max="${max}" step="${step}" value="${esc(val(k))}"><button class="f st" data-act="step" data-arg="${k}|${step}|${min}|${max}" data-fid="${k}+">+</button>${unit ? `<em>${unit}</em>` : ''}</div>`;
const tx = (k, ph = '', wide) => `<input class="f ${wide ? 'wide' : ''}" type="text" data-k="${k}" data-fid="${k}" value="${esc(val(k))}" placeholder="${esc(ph)}">`;
const tm = k => `<input class="f" type="time" data-k="${k}" data-fid="${k}" value="${esc(val(k))}">`;
const dt = k => `<input class="f" type="date" data-k="${k}" data-fid="${k}" value="${esc(val(k))}">`;
const SW = ['#d8b45a', '#f6c453', '#ffffff', '#111111', '#0f5e4c', '#7fd1b9', '#8fb3ff', '#e74c3c', '#c9a24b', '#a5f3fc'];
const col = k => `<div class="colf">${SW.map(c => `<button class="f sw" style="background:${c}" data-act="color" data-arg="${k}|${c}" data-fid="${k}${c}"></button>`).join('')}<input class="f" type="color" data-k="${k}" data-fid="${k}" value="${esc(val(k) || '#ffffff')}"></div>`;
const btn = (act, label, arg = '', cls = '') => `<button class="f b ${cls}" data-act="${act}" data-arg="${esc(arg)}" data-fid="${esc(act + String(arg).slice(0, 40))}">${label}</button>`;
const media = (k, accept) => `${btn('pick', Lx('اختيار ملف…', 'Choose file…'), `${k}|${accept}`)}${val(k) ? btn('clearMedia', Lx('إزالة', 'Remove'), k, 'ghost') : `<em>${Lx('لا يوجد', 'None')}</em>`}`;
const minU = () => Lx('دقيقة', 'min'), secU = () => Lx('ثانية', 'sec');
const sect = t => `<h3>${t}</h3>`;
const note = t => `<p class="note">${t}</p>`;

/* ---------- categories ---------- */
const IS_DASH = typeof DASH !== 'undefined';
const CATS_ALL = [
  ['cloud', '🔗', 'لوحة التحكم', 'Dashboard link'],
  ['loc', '🧭', 'الموقع والحساب', 'Location & calculation'],
  ['iq', '⏱', 'الإقامة والإعلانات', 'Iqamah & announcements'],
  ['fri', '🕌', 'الجمعة', "Jumu'ah"],
  ['ram', '🌙', 'رمضان', 'Ramadan'],
  ['cd', '⏳', 'شكل عدّاد الإقامة', 'Countdown style'],
  ['tpl', '🎨', 'القوالب والتصميم', 'Templates & design'],
  ['layout', '📐', 'تخطيط الشاشة الرئيسية', 'Main screen layout'],
  ['name', '🔤', 'شعار المسجد النصي', 'Mosque name'],
  ['content', '📖', 'المحتوى الدعوي والإعلانات', 'Content & announcements'],
  ['azkar', '📿', 'الأذكار والأحاديث', 'Adhkar & hadith'],
  ['occ', '🗓', 'التذكيرات والمناسبات', 'Reminders & occasions'],
  ['saver', '🌑', 'نمط العرض (السكون)', 'Screensaver'],
  ['sound', '🔔', 'التنبيهات والأصوات', 'Alerts & sounds'],
  ['device', '🔄', 'المزامنة والجهاز', 'Sync & device'],
  ['gen', '⚙️', 'الإعدادات العامة', 'General'],
  ['preview', '👁', 'معاينة الشاشات', 'Preview screens'],
];
const CATS = CATS_ALL.filter(c => !(IS_DASH && (c[0] === 'cloud' || c[0] === 'preview')));
const methodOpts = () => Object.entries(PT.METHODS).map(([k, m]) => [k, Lx(m.ar, m.en)]);
const pRows = (keys, fields) => {
  const head = fields.map(f => `<th>${f[1]}</th>`).join('');
  return `<table class="pt"><tr><th></th>${head}</tr>${keys.map(k => `<tr><th>${PN(k)}</th>${fields.map(f => `<td>${f[0](k)}</td>`).join('')}</tr>`).join('')}</table>`;
};

function catHTML(c) {
  const sc = schedule(now()), H = [];
  if (c === 'cloud') {
    const st = Cloud.st(), srv = Cloud.server(), ok = Cloud.lastOk();
    if (!srv) H.push(`<p class="warn">${Lx('لم يُضبط عنوان لوحة التحكم بعد. أدخله في الأسفل (مثلاً https://masjid.example.com).', 'No dashboard address yet. Enter it below (e.g. https://masjid.example.com).')}</p>`);
    else {
      const status = !st.key ? Lx('جارٍ التسجيل في الخادم…', 'Registering…') : st.linked ? Lx('✅ مرتبطة بحساب: ', '✅ Linked to: ') + esc(st.owner) + (st.name ? ' — ' + esc(st.name) : '') : Lx('⏳ غير مرتبطة بعد — أدخل المفتاح في لوحة التحكم', '⏳ Not linked yet — enter the key in the dashboard');
      H.push(`<div class="cloudcard"><div class="qr">${st.key ? qrSVG(Cloud.linkUrl()) : ''}</div><div><div class="ck-l">${Lx('رقم الشاشة', 'Screen number')}</div><div class="ck num" dir="ltr">${esc(st.key || '— — — —')}</div><div class="ck-s">${status}</div><div class="ck-u">${Lx('لوحة التحكم: ', 'Dashboard: ')}<b dir="ltr">${esc(srv.replace(/^https?:\/\//, ''))}</b></div></div></div>`);
      H.push(row(Lx('الاشتراك', 'Plan'), `<em>${planText(S.lang === 'ar') || Lx('يظهر بعد أول مزامنة', 'Shown after the first sync')}</em>`));
      const ac = activationCode(), emb = embeddedCode();
      H.push(row(Lx('كود التفعيل', 'Activation code'), `<input class="f" id="acIn" data-fid="acIn" dir="ltr" maxlength="22" placeholder="HAYYA-XXXX-XXXX-XXXX" value="${esc(ac)}"> ${btn('acSet', Lx('تفعيل', 'Activate'))}`, ac ? activationLine(S.lang === 'ar').replace(/<[^>]+>/g, '') : (emb ? '' : Lx('كود يُشترى مرة واحدة مدى الحياة لإدارة أكثر من شاشة من لوحة التحكم. يمكن إدخاله هنا أو من اللوحة', 'Bought once for life to manage more than one screen; enter it here or in the dashboard'))));
      H.push(row(Lx('آخر مزامنة', 'Last sync'), `<em class="num">${ok ? fmtT(new Date(ok)) : Lx('لم تتم بعد', 'not yet')}</em>${Cloud.lastErr() ? `<em style="color:#ffb4a8">${esc(Cloud.lastErr())}</em>` : ''} ${btn('cloudSync', Lx('🔄 مزامنة الآن', '🔄 Sync now'))}`, Lx('تلقائية في الاتجاهين: تعديلات الشاشة تُرسل للوحة فورًا، وتعديلات اللوحة تصل خلال ثوانٍ أثناء فتحها (وكل دقيقة في الأوقات الأخرى). تعمل الشاشة بدون إنترنت بآخر إعدادات.', 'Two-way and automatic. Screen edits are sent at once; dashboard edits arrive within seconds while it is open (otherwise every minute). Works offline with the last settings.')));
      H.push(row(Lx('شاشة الربط', 'Pairing screen'), btn('showPair', Lx('عرض رقم الشاشة', 'Show the key on screen'))));
      H.push(row(Lx('رقم جديد', 'New number'), btn('cloudForget', Lx('فك الارتباط وإنشاء رقم جديد', 'Unlink and create a new key'), '', 'danger'), Lx('استخدمه إذا نُقل الجهاز لمسجد آخر', 'Use it when the device moves to another mosque')));
    }
    H.push(sect(Lx('عنوان الخادم', 'Server address')));
    H.push(row(Lx('رابط لوحة التحكم', 'Dashboard URL'), `<input class="f wide" id="cloudServer" data-fid="cloudServer" dir="ltr" value="${esc(srv)}" placeholder="https://masjid.example.com">${btn('cloudServer', Lx('حفظ', 'Save'))}`));
  }
  if (c === 'loc') {
    H.push(sect(Lx('الموقع', 'Location')));
    H.push(row(Lx('المدينة', 'City'), `<select class="f" data-act-change="city" data-fid="city"><option value="">${Lx('— اختر مدينة —', '— choose —')}</option>${CITIES.map((x, i) => `<option value="${i}" ${S.loc.city === x[0] || S.loc.city === x[1] ? 'selected' : ''}>${Lx(x[0], x[1])}</option>`).join('')}</select>${btn('gps', Lx('📍 تحديد موقعي (GPS / الشبكة)', '📍 Detect location'))}`, Lx('أو أدخل الإحداثيات يدويًا', 'or enter coordinates')));
    H.push(row(Lx('البحث عن مدينة في أي دولة', 'Find a city in any country'), `<input class="f wide" type="text" id="cityQ" data-fid="cityQ" placeholder="${Lx('اكتب اسم المدينة ثم اضغط بحث (مثال: القاهرة، Istanbul، London)', 'Type a city then press Search')}"> ${btn('citySearch', Lx('🔎 بحث', '🔎 Search'))}`, Lx('يتطلب اتصالًا بالإنترنت — يشمل مدن العالم ومناطقها', 'Needs internet — covers cities worldwide')));
    if (citySearchRes && citySearchRes.length) H.push(`<div class="chips cityres">${citySearchRes.map((x, i) => btn('cityPick', `${esc(x.name)}${x.admin ? '، ' + esc(x.admin) : ''} — ${esc(x.country)}`, String(i), 'chip')).join('')}</div>`);
    else if (citySearchRes) H.push(note(Lx('لا توجد نتائج — جرّب كتابة الاسم بطريقة أخرى أو بالإنجليزية', 'No results — try another spelling')));
    H.push(row(Lx('خط العرض / خط الطول', 'Latitude / Longitude'), `${nm('loc.lat', -90, 90, 0.0001)} ${nm('loc.lng', -180, 180, 0.0001)}`));
    H.push(row(Lx('تحديث الموقع تلقائيًا', 'Auto-update location'), tg('loc.gpsAuto'), Lx('عند كل تشغيل (يتطلب إذن الموقع)', 'On every start (needs location permission)')));
    H.push(sect(Lx('طريقة الحساب', 'Calculation')));
    H.push(row(Lx('نظام توقيت الصلاة', 'Calculation method'), sel('loc.method', methodOpts()), S.loc.method === 'auto' ? Lx('المستخدم حاليًا: ', 'Currently: ') + Lx(PT.METHODS[sc.method].ar, PT.METHODS[sc.method].en) : ''));
    H.push(row(Lx('حساب العصر', 'Asr'), sel('loc.asr', [opt('shafi', 'الجمهور (شافعي، مالكي، حنبلي)', 'Standard (Shafi)'), opt('hanafi', 'الحنفي', 'Hanafi')])));
    H.push(row(Lx('خطوط العرض العليا', 'High latitude rule'), sel('loc.highLat', [opt('angle', 'حسب الزاوية', 'Angle-based'), opt('middle', 'منتصف الليل', 'Middle of night'), opt('seventh', 'سُبع الليل', 'One seventh')])));
    H.push(row(Lx('الارتفاع عن سطح البحر', 'Elevation'), nm('loc.elev', 0, 5000, 10, Lx('م', 'm'))));
    H.push(sect(Lx('تقويم مخصص وتعديل وقت الصلاة', 'Custom calendar & adjustments')));
    H.push(note(Lx('عدّل وقت أي صلاة بالدقائق (+/−)، أو ثبّت وقتها يدويًا. اترك الوقت الثابت فارغًا للحساب الفلكي.', 'Shift any prayer by minutes, or set a fixed time. Leave empty for calculated time.')));
    H.push(row(Lx('فرق الضاحية عن المدينة المعتمدة', 'Suburb offset from the main city'), nm('loc.offset', -30, 30, 1, minU()), Lx('يُضاف إلى كل الصلوات (عدا الشروق): موجب = تأخير، سالب = تقديم. مفيد عند اعتماد تقويم مدينة قريبة', 'Added to every prayer: + later, − earlier. Useful with a nearby city calendar')));
    H.push(pRows(PKEYS, [[k => nm(`p.${k}.adj`, -60, 60, 1), Lx('تعديل (د)', 'Adjust (min)')], [k => tm(`p.${k}.fixed`), Lx('وقت ثابت', 'Fixed time')], [k => `<span class="num">${fmtT(sc[k].adhan)}</span>`, Lx('اليوم', 'Today')]]));
    H.push(row(Lx('استيراد تقويم سنوي (CSV)', 'Import yearly calendar (CSV)'), `${btn('pick', Lx('اختيار ملف CSV…', 'Choose CSV…'), 'calendar|.csv,text/csv,text/plain')}${Object.keys(S.calendar).length ? btn('clearCal', Lx(`إزالة (${Object.keys(S.calendar).length} يوم)`, `Remove (${Object.keys(S.calendar).length} days)`), '', 'ghost') : ''}`, Lx('كل سطر: التاريخ,الفجر,الشروق,الظهر,العصر,المغرب,العشاء', 'Each line: date,fajr,sunrise,dhuhr,asr,maghrib,isha')));
    H.push(sect(Lx('التاريخ والساعة', 'Date & clock')));
    H.push(row(Lx('تعديل التاريخ الهجري', 'Hijri adjustment'), nm('hijriAdj', -3, 3, 1, Lx('يوم', 'day')), Lx('لمطابقة التقويم المعتمد. اليوم: ', 'Today: ') + dateLines(now(), sc).hijri));
    H.push(row(Lx('تقديم التاريخ الهجري بعد المغرب', 'Advance Hijri date after Maghrib'), tg('hijriAfterMaghrib')));
    H.push(row(Lx('تصحيح ساعة الجهاز', 'Clock correction'), nm('clockAdjSec', -3600, 3600, 5, secU()), Lx('إذا كانت ساعة الجهاز متقدمة أو متأخرة', 'If the device clock is off')));
  }
  if (c === 'iq') {
    H.push(sect(Lx('توقيت ما بين الأذان والإقامة', 'Time between adhan and iqamah')));
    H.push(pRows(PRAYERS5, [
      [k => sel(`p.${k}.iqMode`, [opt('after', 'بعد الأذان', 'After adhan'), opt('fixed', 'وقت ثابت', 'Fixed time')]), Lx('النوع', 'Type')],
      [k => S.p[k].iqMode === 'fixed' ? tm(`p.${k}.iqFixed`) : nm(`p.${k}.iqAfter`, 0, 90, 1), Lx('الإقامة', 'Iqamah')],
      [k => nm(`p.${k}.dur`, 1, 120, 1), Lx('مدة أداء الصلاة (د)', 'Prayer duration (min)')],
    ]));
    H.push(note(Lx('خلال مدة أداء الصلاة تُقفل الشاشة وتتحول إلى شاشة سوداء من وقت الإقامة حتى الانتهاء.', 'During the prayer the screen turns fully black from iqamah until the prayer ends.')));
    H.push(sect(Lx('الإعلانات', 'Announcements')));
    H.push(row(Lx('مدة إعلان دخول وقت الصلاة', 'Adhan announcement'), nm('adhanAnnounceMin', 0, 15, 1, minU()), Lx('بعد وقت الأذان الفعلي، ثم يبدأ عدّاد الإقامة', 'After the actual adhan, then the iqamah countdown starts')));
    H.push(row(Lx('مدة إعلان الإقامة', 'Iqamah announcement'), nm('iqamaAnnounceSec', 0, 300, 5, secU())));
    H.push(row(Lx('تنبيه وضع الجوال الصامت', 'Silent-phone reminder'), `${tg('silentNotice.on')} ${nm('silentNotice.minBefore', 0, 30, 1, Lx('د قبل الإقامة', 'min before'))}`));
    H.push(sect(Lx('بدء أذكار بعد الصلاة', 'Start of after-prayer adhkar')));
    const AA = S.azkarAfter;
    H.push(row(Lx('طريقة البدء', 'Start'), sel('azkarAfter.mode', [opt('auto', 'تلقائي بعد مدة أداء الصلاة', 'Automatic after the prayer duration'), opt('manual', 'يدوي: زر OK في الريموت أو من لوحة التحكم', 'Manual: remote OK or dashboard'), opt('mic', 'الميكروفون: عند انتهاء صوت الإمام', 'Microphone: when the imam’s voice ends')]), AA.mode === 'auto' ? Lx('تظهر الأذكار بعد انتهاء «مدة أداء الصلاة» المحددة لكل صلاة', 'Adhkar start when the prayer duration ends') : AA.mode === 'manual' ? Lx('أثناء شاشة الصلاة السوداء اضغط OK في الريموت لبدء الأذكار فورًا', 'During the black prayer screen press OK on the remote') : Lx('يستمع الجهاز لصوت المسجد ويبدأ الأذكار بعد فترة هدوء تلي صوت الإمام. لا يُسجَّل شيء ولا يُرسل', 'The device listens and starts the adhkar after silence follows the imam. Nothing is recorded or sent')));
    if (AA.mode !== 'auto') H.push(row(Lx('أقصى انتظار إضافي', 'Longest extra wait'), nm('azkarAfter.wait', 1, 30, 1, minU()), Lx('إذا لم تصل الإشارة تبدأ الأذكار تلقائيًا بعد مدة الصلاة + هذه الدقائق', 'If no signal arrives, adhkar start after the prayer duration + this')));
    if (AA.mode === 'mic') {
      H.push(row(Lx('الصلوات التي تستخدم الميكروفون', 'Prayers using the microphone'), [['fajr'], ['dhuhr'], ['asr'], ['maghrib'], ['isha'], ['jumuah']].map(([k]) => `<span class="inl">${PN(k)} ${tg('azkarAfter.mic.prayers.' + k)}</span>`).join(''), Lx('يُنصح بالصلوات الجهرية (الفجر والمغرب والعشاء والجمعة). في الظهر والعصر تطول فترات الصمت فيُستخدم المؤقت', 'Best for the loud prayers. Dhuhr and Asr are mostly silent, so the timer is used')));
      H.push(row(Lx('حساسية الصوت', 'Sound level'), `<input class="f" type="range" min="2" max="60" step="1" data-k="azkarAfter.mic.level" data-fid="mic.level" data-num="1" value="${AA.mic.level}"><em class="num">${num(AA.mic.level)}</em> <span class="micmeter"><i></i></span> ${btn('micTest', Mic.test ? Lx('■ إيقاف الاختبار', '■ Stop test') : Lx('🎙 اختبار الميكروفون', '🎙 Test microphone'))}`, Lx('اضبطها أعلى قليلًا من مستوى المسجد الهادئ وأقل من صوت الإمام', 'Set slightly above the quiet room and below the imam')));
      H.push(row(Lx('مدة الهدوء قبل البدء', 'Silence before start'), nm('azkarAfter.mic.silence', 5, 180, 5, secU())));
      H.push(row(Lx('أقل مدة للصلاة', 'Shortest prayer'), nm('azkarAfter.mic.minMin', 1, 20, 1, minU()), Lx('لا يبدأ قبلها حتى لو حدث هدوء', 'Never starts earlier, even if quiet')));
      if (Mic.err) H.push(`<p class="warn">${Lx('تعذّر تشغيل الميكروفون: اسمح بصلاحية الميكروفون من «المزامنة والجهاز»', 'Microphone unavailable: allow it in “Sync & device”')} (${esc(Mic.err)})</p>`);
      H.push(note(Lx('يجب أن يسمع الجهاز صوت المسجد: ميكروفون USB قريب من السماعات، أو توصيل خرج المكبّر بمدخل صوت الجهاز.', 'The device must hear the mosque: a USB microphone near the speakers, or the amplifier output into the device audio input.')));
    }
    if (AA.mode !== 'auto') H.push(row(Lx('بدء الأذكار الآن', 'Start adhkar now'), btn('azkarNow', Lx('▶ ابدأ أذكار بعد الصلاة', '▶ Start after-prayer adhkar')), Lx('يعمل أثناء الصلاة وبعدها مباشرة', 'Works during the prayer and right after')));
    H.push(sect(Lx('أثناء الأذان وقبل الإقامة', 'During the adhan and before the iqamah')));
    H.push(row(Lx('عرض ذكر ترديد الأذان', 'Show “repeat the adhan”'), tg('adhanText.repeat'), ADHAN_REPEAT));
    H.push(row(Lx('عرض دعاء ما بعد الأذان', 'Show the dua after the adhan'), tg('adhanText.dua')));
    H.push(row(Lx('الأحاديث والأعمال المستحبة بين الأذان والإقامة', 'Hadith & recommended deeds while waiting'), tg('waitTips.on'), Lx('تظهر في صفحة مستقلة بالتناوب مع عدّاد الإقامة، بخط كبير، ومدة كل نص بحسب طوله وسرعة القراءة في «المحتوى الدعوي»', 'Shown on a page of their own, alternating with the iqamah countdown; each text stays as long as reading it needs')));
    if (S.waitTips.on) {
      H.push(row(Lx('مدة ظهور العدّاد بين كل نص وآخر', 'Countdown shown between texts'), nm('waitTips.cdSec', 3, 60, 1, secU())));
      H.push(row(Lx('العدّاد وحده في آخر', 'Countdown only in the last'), nm('waitTips.lastSec', 0, 300, 10, secU()), Lx('حتى لا تفوت أحدًا الإقامة', 'So nobody misses the iqamah')));
      H.push(row(Lx('معاينة', 'Preview'), btn('preview', Lx('صفحة ما بين الأذان والإقامة', 'Waiting page'), 'waitPage')));
    }
    if (S.waitTips.on) H.push(row(Lx('نصوص خاصة (اختياري)', 'Your own texts (optional)'), `<textarea class="f wide" rows="4" data-k="waitTips.text" data-fid="waitTips.text" placeholder="${esc(WAIT_TIPS.general.join('\n'))}">${esc(S.waitTips.text || '')}</textarea>`, Lx('كل سطر رسالة، والمصدر بعد « — ». اتركه فارغًا لاستخدام النصوص المدمجة', 'One message per line, source after “ — ”. Empty = built-in texts')));
    H.push(sect(Lx('عرض المواقيت', 'Timetable display')));
    H.push(row(Lx('عرض مواقيت الإقامة على الشاشة', 'Show iqamah on the table'), tg('showIqamaOnTable')));
    H.push(row(Lx('طريقة عرض الإقامة', 'Iqamah shown as'), sel('iqamaDisplay', [opt('time', 'وقت الإقامة', 'Time'), opt('minutes', 'مدة الإقامة بالدقائق', 'Minutes after adhan')])));
    H.push(sect(Lx('الشروق والضحى', 'Sunrise & Duha')));
    H.push(row(Lx('العرض في الجدول', 'Shown in table'), sel('duha.display', [opt('sunrise', 'الشروق', 'Sunrise'), opt('duha', 'الضحى', 'Duha'), opt('alternate', 'بالتناوب', 'Alternate')])));
    H.push(row(Lx('الضحى بعد الشروق', 'Duha after sunrise'), nm('duha.afterSunrise', 5, 60, 1, minU())));
    H.push(row(Lx('إعلان صلاة الضحى', 'Duha announcement'), tg('duha.announce')));
    H.push(sect(Lx('الثلث الأخير ومنتصف الليل', 'Last third & midnight')));
    H.push(row(Lx('عرض الثلث الأخير', 'Show last third'), `${tg('night.showLastThird')} <em class="num">${fmtT(sc.lastThird)}</em>`));
    H.push(row(Lx('عرض منتصف الليل', 'Show midnight'), `${tg('night.showMidnight')} <em class="num">${fmtT(sc.midnight)}</em>`));
    H.push(row(Lx('تنبيه بدخول الثلث الأخير', 'Announce last third'), tg('night.announceLastThird')));
    H.push(row(Lx('تنبيه بمنتصف الليل', 'Announce midnight'), tg('night.announceMidnight')));
  }
  if (c === 'fri') {
    H.push(row(Lx('إعدادات الجمعة المستقلة', "Separate Jumu'ah settings"), tg('friday.on'), Lx('ضبط خاص للجمعة منفصل عن الظهر', 'Independent from Dhuhr')));
    H.push(row(Lx('وقت أذان الجمعة', "Jumu'ah adhan"), `${sel('friday.adhanMode', [opt('dhuhr', 'نفس وقت الظهر', 'Same as Dhuhr'), opt('fixed', 'وقت ثابت', 'Fixed')])} ${S.friday.adhanMode === 'fixed' ? tm('friday.fixed') : ''}`));
    H.push(row(Lx('بداية الخطبة بعد الأذان', 'Khutbah starts after adhan'), nm('friday.khutbahAfter', 0, 60, 1, minU())));
    H.push(row(Lx('الوقت المستغرق للخطبة', 'Khutbah duration'), nm('friday.khutbahDur', 5, 90, 1, minU())));
    H.push(sect(Lx('صلاة الجمعة وأذكار ما بعدها', "Jumu'ah prayer & the adhkar after it")));
    H.push(row(Lx('تبدأ أذكار ما بعد الصلاة بعد الإقامة بـ', "Adhkar start after the iqamah by"), nm('friday.dur', 3, 60, 1, minU()), Lx('يوم الجمعة فقط — هذه هي مدة صلاة الجمعة، وبعدها تظهر الأذكار مباشرة', 'Friday only — the Jumu\'ah prayer length; the adhkar follow straight away')));
    H.push(row(Lx('تشغيل الأذكار مباشرة دون انتظار', 'Start the adhkar directly, no waiting'), tg('friday.azkarDirect'), Lx('يُلغي الشاشة السوداء بعد صلاة الجمعة حتى لو كان بدء الأذكار يدويًا أو بالمايكروفون في بقية الصلوات', 'Ends the black screen after Jumu\'ah even when other prayers use manual / microphone start')));
    H.push(row(Lx('مدة أذكار ما بعد الجمعة', "After-Jumu'ah adhkar duration"), nm('friday.azkarMin', 1, 60, 1, minU())));
    if (!S.azkarAfter.on || !S.content.sets.after) H.push(note(Lx('⚠️ أذكار ما بعد الصلاة معطّلة من «الأذكار والأحاديث» — فعّلها لتظهر بعد الجمعة', '⚠️ After-prayer adhkar are off in “Adhkar & hadith”')));
    H.push(row(Lx('عنوان الخطبة', 'Khutbah title'), tx('friday.title', Lx('يكتب ويُعرض على الشاشة', 'Shown on screen'), 1)));
    H.push(row(Lx('الشاشة وقت الخطبة', 'Screen during khutbah'), sel('friday.mode', [opt('title', 'عنوان الخطبة', 'Khutbah title'), opt('gallery', 'معرض الصور', 'Image gallery'), opt('black', 'شاشة سوداء', 'Black screen')])));
    H.push(row(Lx('مدة صلاة الفجر يوم الجمعة', 'Friday Fajr duration'), nm('friday.fajrDur', 3, 60, 1, minU())));
    if (sc.friday) H.push(note(Lx(`اليوم جمعة: الأذان ${fmtT(sc.dhuhr.adhan)} — الخطبة ${fmtT(sc.dhuhr.khutbah)} — الإقامة ${fmtT(sc.dhuhr.iqama)} — الأذكار ${fmtT(sc.dhuhr.prayEnd)}`, `Today: adhan ${fmtT(sc.dhuhr.adhan)}, khutbah ${fmtT(sc.dhuhr.khutbah)}, iqamah ${fmtT(sc.dhuhr.iqama)}, adhkar ${fmtT(sc.dhuhr.prayEnd)}`)));
  }
  if (c === 'ram') {
    H.push(row(Lx('وضع رمضان', 'Ramadan mode'), sel('ramadan.mode', [opt('auto', 'تلقائي حسب التاريخ الهجري', 'Automatic (Hijri date)'), opt('on', 'مفعّل دائمًا', 'Always on'), opt('off', 'معطّل', 'Off')]), sc.ramD || sc.ramN ? Lx('🌙 رمضان مفعّل الآن', '🌙 Ramadan is active now') : ''));
    H.push(row(Lx('العشاء في رمضان', 'Isha in Ramadan'), nm('ramadan.ishaAdd', 0, 90, 5, Lx('د تُضاف', 'min added')), Lx('إضافة نصف ساعة لتوقيت صلاة العشاء، أو تعديله', 'Add 30 minutes to Isha, or change it')));
    H.push(sect(Lx('ضبط كل صلاة في رمضان', 'Per-prayer settings in Ramadan')));
    H.push(pRows(PRAYERS5, [[k => nm(`ramadan.p.${k}.iqAfter`, 0, 90, 1), Lx('الإقامة بعد (د)', 'Iqamah after (min)')], [k => nm(`ramadan.p.${k}.dur`, 1, 120, 1), Lx('مدة الصلاة (د)', 'Duration (min)')]]));
    H.push(row(Lx('الجمعة في رمضان: الخطبة / الصلاة', "Jumu'ah: khutbah / prayer"), `${nm('ramadan.fridayKhutbahDur', 5, 90, 1)} ${nm('ramadan.fridayDur', 3, 60, 1, minU())}`, Lx('في رمضان تبدأ أذكار ما بعد الجمعة بعد مدة الصلاة هذه', 'In Ramadan the Friday adhkar start after this prayer length')));
    H.push(sect(Lx('صلاة التراويح', 'Taraweeh')));
    H.push(row(Lx('إعلان التراويح وإخفاء شاشة المواقيت', 'Announce & hide the timetable'), tg('ramadan.taraweeh.on')));
    H.push(row(Lx('تبدأ بعد أذكار العشاء', 'Starts after Isha adhkar'), nm('ramadan.taraweeh.after', 0, 60, 1, minU())));
    H.push(row(Lx('مدة التراويح', 'Duration'), nm('ramadan.taraweeh.dur', 10, 240, 5, minU())));
    H.push(row(Lx('مدة الإعلان', 'Announcement'), nm('ramadan.taraweeh.announceSec', 10, 600, 10, secU())));
    H.push(sect(Lx('صلاة التهجد (العشر الأواخر)', 'Tahajjud (last ten nights)')));
    H.push(row(Lx('تفعيل إعلان التهجد', 'Enable'), tg('ramadan.tahajjud.on')));
    H.push(row(Lx('وقت التهجد', 'Time'), tm('ramadan.tahajjud.time')));
    H.push(row(Lx('المدة', 'Duration'), nm('ramadan.tahajjud.dur', 10, 240, 5, minU())));
    H.push(row(Lx('مدة الإعلان', 'Announcement'), nm('ramadan.tahajjud.announceSec', 10, 600, 10, secU())));
  }
  if (c === 'cd') {
    H.push(note(Lx('اختر طريقة عرض الوقت المتبقي حتى الإقامة بعد إعلان الأذان. المعاينة مباشرة:', 'Choose how the time left to iqamah is shown. Live preview:')));
    H.push(`<div class="cdgrid">${COUNTDOWN_STYLES.map(([k, ar, en]) => `<button class="f cdopt ${S.countdown.style === k ? 'on' : ''}" data-act="cdStyle" data-arg="${k}" data-fid="cd${k}"><span>${Lx(ar, en)}</span></button>`).join('')}</div>`);
    H.push(`<div class="cdprev" id="cdprev"></div>`);
    H.push(row(Lx('حجم عدّاد الإقامة', 'Countdown size'), `<input class="f" type="range" min="80" max="220" step="5" data-k="countdown.size" data-fid="countdown.size" data-num="1" value="${val('countdown.size')}"><em class="num">${num(val('countdown.size'))}%</em>`, Lx('كبّره ليُقرأ من آخر المسجد. النصوص حوله تُضبط تلقائيًا دون تداخل', 'Enlarge it to read from the back of the mosque. The text around it is fitted automatically')));
    H.push(row(Lx('إظهار الثواني', 'Show seconds'), tg('countdown.showSec')));
    H.push(row(Lx('لون الثواني', 'Seconds colour'), col('countdown.secColor')));
    H.push(row(Lx('إظهار الثواني في الساعة الرئيسية', 'Seconds on main clock'), tg('showSeconds')));
    H.push(sect(Lx('خط التطبيق', 'Fonts')));
    H.push(row(Lx('خط النصوص', 'Text font'), sel('font.text', FONTS.filter(f => f[0] !== 'Orbitron'))));
    H.push(row(Lx('خط الأرقام', 'Numbers font'), sel('font.num', FONTS)));
    H.push(`<div class="fontprev" style="font-family:'${S.font.text}'">${Lx('بسم الله الرحمن الرحيم', 'In the name of Allah')} <span style="font-family:'${S.font.num}'">${num('12:45')}</span></div>`);
  }
  if (c === 'layout') {
    const Lo = S.layout;
    H.push(sect(Lx('محاذاة النصوص', 'Text alignment')));
    const alO = [opt('right', 'يمين', 'Right'), opt('center', 'وسط', 'Centre'), opt('left', 'يسار', 'Left')];
    H.push(row(Lx('ويدجيت الساعة والتاريخ', 'Clock & date widget'), sel('align.clock', alO)));
    H.push(row(Lx('ويدجيت الصلاة القادمة', 'Next-prayer widget'), sel('align.next', alO)));
    H.push(row(Lx('جدول أوقات الصلاة', 'Prayer timetable'), sel('align.table', alO)));
    H.push(row(Lx('سطر الأحاديث والتذكيرات', 'Hadith line'), sel('align.hadith', alO)));
    H.push(sect(Lx('حجم ومكان العناصر', 'Size & position')));
    H.push(row(Lx('حجم الساعة والصلاة القادمة', 'Clock & next-prayer size'), sel('layout.size', [opt('normal', 'عادي', 'Normal'), opt('large', 'كبير', 'Large'), opt('xl', 'كبير جدًا', 'Extra large')]), Lx('يكبر الويدجيت على حساب ارتفاع الجدول والحديث، والنصوص تُضبط تلقائيًا داخل مساحتها', 'Grows at the expense of the table and hadith rows; text always fits its area')));
    H.push(row(Lx('حجم نص الوقت', 'Time text size'), `${nm('layout.timeScale', 40, 200, 5, '%')}${+Lo.timeScale !== 100 ? btn('resetScale', Lx('↺ الافتراضي', '↺ Default'), 'layout.timeScale', 'ghost') : ''}`, Lx('الساعة والثواني وص/م', 'Clock, seconds and AM/PM')));
    H.push(row(Lx('حجم نص التاريخ', 'Date text size'), `${nm('layout.dateScale', 40, 250, 5, '%')}${+Lo.dateScale !== 100 ? btn('resetScale', Lx('↺ الافتراضي', '↺ Default'), 'layout.dateScale', 'ghost') : ''}`, Lx('اليوم والتاريخ الهجري والميلادي', 'Day, Hijri and Gregorian date')));
    H.push(note(Lx('الوقت والتاريخ يتشاركان مساحة ويدجيت الساعة: تكبير أحدهما كثيرًا قد يصغّر الاثنين معًا حتى يبقيا داخل المساحة دون تداخل. لمساحة أكبر اختر حجم «كبير جدًا» أو ترتيب «الساعة فوق».', 'Time and date share the clock widget: enlarging one a lot may shrink both so they stay inside the area. For more room choose “Extra large” or “Clock above”.')));
    H.push(row(Lx('ترتيب الويدجيت', 'Arrangement'), sel('layout.arrange', [opt('side', 'جنبًا إلى جنب', 'Side by side'), opt('stack', 'الساعة فوق والصلاة القادمة تحتها', 'Clock above, next prayer below')])));
    H.push(row(Lx('موضع الساعة', 'Clock position'), sel('layout.clockSide', [opt('start', S.lang === 'ar' ? 'الساعة يمين (أو أعلى)' : 'Clock first (left / top)', 'Clock first'), opt('end', S.lang === 'ar' ? 'الساعة يسار (أو أسفل)' : 'Clock second (right / bottom)', 'Clock second')])));
    if (Lo.arrange !== 'stack' && !stageDim.port) H.push(row(Lx('عرض الساعة مقابل الصلاة القادمة', 'Clock width vs next prayer'), `<input class="f" type="range" min="30" max="75" step="1" data-k="layout.split" data-fid="layout.split" data-num="1" value="${Lo.split}"><em class="num">${num(Lo.split)}% / ${num(100 - Lo.split)}%</em>`));
    H.push(row(Lx('موضع جدول الصلوات', 'Timetable position'), sel('layout.tableTop', [['false', Lx('أسفل الشاشة', 'Bottom')], ['true', Lx('أعلى الشاشة (تحت اسم المسجد)', 'Top (under the mosque name)')]])));
    H.push(row(Lx('إظهار الصلاة القادمة', 'Show next prayer'), tg('layout.showNext')));
    if (S.hadithPage.on) H.push(note(Lx('الأحاديث تظهر الآن في صفحة مستقلة بالتناوب مع شاشة المواقيت (من «المحتوى الدعوي»)، لذلك لا يظهر سطرها هنا', 'Hadith now show on a page of their own (see “Content”), so the line is hidden')));
    else H.push(row(Lx('إظهار سطر الأحاديث والمناسبات', 'Show the hadith line'), tg('layout.showRot')));
    H.push(sect(Lx('بطاقة الصلاة القادمة', 'Next-prayer card')));
    H.push(row(Lx('قوة خلفية البطاقة', 'Card background'), `<input class="f" type="range" min="0" max="100" step="5" data-k="nextCard.bg" data-fid="nextCard.bg" data-num="1" value="${S.nextCard.bg}"><em class="num">${num(S.nextCard.bg)}%</em>`, Lx('0% = شفافة تمامًا فتظهر الخلفية كاملة', '0% = fully transparent so the background shows')));
    H.push(row(Lx('إطار البطاقة', 'Card border'), tg('nextCard.border')));
    H.push(row(Lx('حجم البطاقة داخل مساحتها', 'Card size within its area'), nm('nextCard.scale', 40, 100, 5, '%'), Lx('تصغيرها يكشف جزءًا أكبر من الخلفية، والنص يُضبط داخلها', 'A smaller card shows more background; text is fitted inside')));
    if (+S.nextCard.scale < 100) H.push(row(Lx('محاذاة البطاقة', 'Card alignment'), sel('nextCard.align', [opt('start', S.lang === 'ar' ? 'يمين' : 'Left', 'Start'), opt('center', 'وسط', 'Center'), opt('end', S.lang === 'ar' ? 'يسار' : 'Right', 'End')])));
    H.push(row(Lx('تطبيق نفس الشفافية على بطاقات الصلوات', 'Apply the same to prayer cards'), tg('nextCard.table')));
    H.push(sect(Lx('علم الدولة', 'Country flag')));
    const F = S.flag, ARAB = ['sa', 'ae', 'kw', 'qa', 'bh', 'om', 'ye', 'iq', 'jo', 'sy', 'lb', 'ps', 'eg', 'sd', 'ly', 'tn', 'dz', 'ma', 'mr', 'so', 'dj', 'km'];
    const nm1 = c => FLAG_NAMES[c] ? FLAG_NAMES[c][S.lang === 'ar' ? 0 : 1] : c;
    const all = Object.keys(FLAG_NAMES).sort((a, b) => nm1(a).localeCompare(nm1(b), S.lang));
    const o = c => `<option value="${c}" ${F.code === c ? 'selected' : ''}>${esc(nm1(c))}</option>`;
    H.push(row(Lx('الدولة', 'Country'), `<select class="f" data-k="flag.code" data-fid="flag.code"><option value="">${Lx('— بدون علم —', '— No flag —')}</option><optgroup label="${Lx('الدول العربية', 'Arab countries')}">${ARAB.filter(c => FLAG_NAMES[c]).map(o).join('')}</optgroup><optgroup label="${Lx('كل دول العالم', 'All countries')} (${num(all.length)})">${all.map(o).join('')}</optgroup></select>${F.code && typeof FLAGS !== 'undefined' && flagUrl(F.code) ? `<img class="flagthumb" src="${flagUrl(F.code)}" alt="">` : ''}`, Lx(`${num(all.length)} دولة`, `${all.length} countries`)));
    if (F.code) {
      const ar = S.lang === 'ar';
      H.push(row(Lx('مكان العلم', 'Flag position'), sel('flag.pos', [opt('name-start', 'قبل اسم المسجد', 'Before the mosque name'), opt('name-end', 'بعد اسم المسجد', 'After the mosque name'), opt('clock', 'بجانب التاريخ في ويدجيت الساعة', 'Beside the date in the clock widget'), ['corner-start', ar ? 'الزاوية العليا اليمنى' : 'Top-left corner'], ['corner-end', ar ? 'الزاوية العليا اليسرى' : 'Top-right corner']])));
      H.push(row(Lx('حجم العلم', 'Flag size'), sel('flag.size', [opt('s', 'صغير', 'Small'), opt('m', 'متوسط', 'Medium'), opt('l', 'كبير', 'Large')])));
      H.push(row(Lx('شكل العلم', 'Flag style'), sel('flag.style', [opt('shadow', 'مع ظل', 'With shadow'), opt('round', 'زوايا دائرية مع ظل', 'Rounded with shadow'), opt('plain', 'بدون ظل', 'Plain')])));
    }
    H.push(note(Lx('مهما كان الحجم أو الموضع، كل نص يُضبط تلقائيًا ليبقى داخل مساحته ولا يتداخل مع غيره.', 'Whatever the size or position, every text is fitted to stay inside its own area.')));
  }
  if (c === 'occ') {
    H.push(row(Lx('تفعيل التذكيرات', 'Enable reminders'), tg('occ.on'), Lx('حسب التاريخ الهجري المعروض على الشاشة', 'By the Hijri date shown on the screen') + ' — ' + dateLines(now(), sc).hijri));
    H.push(row(Lx('عرضها في شريط الأخبار أيضًا', 'Also in the news ticker'), tg('occ.ticker')));
    const act = activeOccasions(now()).map(a => a.o.id);
    H.push(note(act.length ? Lx('الظاهر الآن: ', 'Showing now: ') + act.map(id => Lx(...(o => [o.ar, o.en])(OCCASIONS.find(x => x.id === id)))).join('، ') : Lx('لا توجد تذكيرات اليوم', 'No reminders today')));
    H.push(`<div class="chips tabs">${OCCASIONS.map(o => `<button class="f b chip ${occTab === o.id ? 'on' : ''}" data-act="occTab" data-arg="${o.id}" data-fid="occ${o.id}">${act.includes(o.id) ? '🟢 ' : ''}${Lx(o.ar, o.en)}${occConf(o.id).on === false ? ' ⏸' : ''}</button>`).join('')}</div>`);
    const o = OCCASIONS.find(x => x.id === occTab) || OCCASIONS[0], k = 'occ.items.' + o.id;
    H.push(sect(Lx(o.ar, o.en) + (act.includes(o.id) ? Lx(' — ظاهرة الآن', ' — showing now') : '')));
    H.push(note(Lx('وقت الظهور: ', 'When: ') + Lx(o.when[0], o.when[1])));
    H.push(row(Lx('تفعيل هذه المناسبة', 'Enable this occasion'), tg(k + '.on')));
    H.push(row(Lx('إظهارها وحدها في سطر الأحاديث أثناء المناسبة', 'Show alone in the hadith line during the occasion'), tg(k + '.alone'), Lx('مفعّل: لا يظهر في سطر الأحاديث غير نصوص هذه المناسبة ما دامت قائمة. معطّل: تتناوب مع الأحاديث المعتادة', 'On: only this occasion\'s texts while it lasts. Off: they alternate with the usual hadith')));
    H.push(row(Lx('عرضها في شريط الأخبار', 'Show in the news ticker'), tg(k + '.tk')));
    if (occConf(o.id).tk !== false) H.push(row(Lx('إظهارها وحدها في شريط الأخبار أثناء المناسبة', 'Show alone in the ticker during the occasion'), tg(k + '.tAlone'), Lx('تُخفى نصوص الشريط المعتادة حتى تنتهي المناسبة', 'The usual ticker texts are hidden until the occasion ends')));
    H.push(note(Lx('النصوص مراجعة: آيات من القرآن الكريم، وأحاديث صحيحة أو حسنة مع تخريجها، وآثار عن الصحابة مذكورة بأنها آثار — دون تكرار بين المناسبات. أضف ما تريد بـ«إضافة سطر جديد»، وأوقف أي نص بالمفتاح.', 'Checked texts: Quran verses, sahih / hasan hadith with their sources and Companion athar marked as such — none repeated. Add your own with “Add a new line”.')));
    H.push(listEditor(k + '.list', '', (it, i) => `<button class="f tg mini ${it.on !== false ? 'on' : ''}" data-li-toggle="on"><i></i></button><textarea class="f wide" rows="2" data-li="t">${esc(it.t)}</textarea><input class="f" data-li="s" value="${esc(it.s || '')}" placeholder="${Lx('المصدر', 'Source')}">${btn('moveItem', '▲', `${k}.list|${i}|-1`, 'ghost')}${btn('moveItem', '▼', `${k}.list|${i}|1`, 'ghost')}`, { t: '', s: '', on: true }));
    H.push(btn('restoreOcc', Lx('↺ استعادة النصوص الأصلية لهذه المناسبة', '↺ Restore the original texts of this occasion'), o.id, 'ghost'));
  }
  if (c === 'tpl') {
    H.push(sect(Lx('تغيير الثيم تلقائيًا', 'Automatic themes')));
    const TA = S.themeAuto, tOpts = allTpls().map(t => [t.id, Lx(t.ar, t.en)]);
    H.push(row(Lx('تغيير الثيم حسب الوقت', 'Change theme by time'), sel('themeAuto.mode', [opt('off', 'لا — ثيم واحد ثابت', 'No — one fixed theme'), opt('daynight', 'صباحي ومسائي (من الشروق إلى المغرب)', 'Day & night (sunrise to maghrib)'), opt('prayer', 'ثيم لكل صلاة من الصلوات الخمس', 'One theme per prayer')]), Lx('الثيم الظاهر الآن: ', 'Now showing: ') + themeName(activeTplId())));
    if (TA.mode === 'daynight') { H.push(row(Lx('ثيم النهار', 'Day theme'), sel('themeAuto.day', tOpts))); H.push(row(Lx('ثيم الليل', 'Night theme'), sel('themeAuto.night', tOpts))); }
    if (TA.mode === 'prayer') H.push(pRows(PRAYERS5, [[k => sel('themeAuto.per.' + k, tOpts), Lx('الثيم من الأذان حتى الصلاة التالية', 'Theme from its adhan to the next prayer')]]));
    H.push(row(Lx('ثيمات رمضان والعيدين', 'Ramadan & Eid themes'), tg('themeAuto.occ'), Lx('تعمل تلقائيًا طوال رمضان وأيام العيدين، ولها الأولوية', 'Switch on by themselves in Ramadan and the Eid days')));
    if (TA.occ) {
      H.push(row(Lx('ثيم رمضان', 'Ramadan theme'), sel('themeAuto.ramadan', tOpts)));
      H.push(row(Lx('ثيم عيد الفطر (١–٣ شوال)', 'Eid al-Fitr theme'), sel('themeAuto.eidFitr', tOpts)));
      H.push(row(Lx('ثيم عيد الأضحى (١٠–١٣ ذو الحجة)', 'Eid al-Adha theme'), sel('themeAuto.eidAdha', tOpts)));
    }
    if (TA.mode !== 'off' || TA.occ) H.push(note(Lx('القالب الذي تختاره في الأسفل هو الثيم الأساسي، ويُستخدم في غير الأوقات المحددة أعلاه.', 'The template you pick below is the base theme, used outside the times above.')));
    H.push(sect(Lx('لون أو ثيم لكل صلاة في جدول المواقيت', 'A colour or theme for each prayer in the timetable')));
    const TT = S.tableTheme;
    H.push(row(Lx('تلوين خانات الصلوات', 'Colour the prayer cells'), tg('tableTheme.on'), Lx('كل صلاة في الجدول بخلفية مختلفة، والصلاة القادمة تبقى مميزة بإطار', 'Each prayer gets its own background; the next prayer keeps a frame')));
    if (TT.on) {
      H.push(row(Lx('طريقة التلوين', 'Colouring'), sel('tableTheme.mode', [opt('auto', 'تلقائي متناسق مع القالب (سماء كل وقت)', 'Automatic, in harmony with the template'), opt('themes', 'ثيم تختاره لكل صلاة', 'A theme you choose per prayer'), opt('colors', 'لون تختاره لكل صلاة', 'A colour you choose per prayer')])));
      if (TT.mode === 'themes') H.push(pRows(PKEYS, [[k => sel('tableTheme.per.' + k, allTpls().map(t => [t.id, Lx(t.ar, t.en)])), '']]));
      if (TT.mode === 'colors') H.push(pRows(PKEYS, [[k => `<input class="f" type="color" data-k="tableTheme.colors.${k}" data-fid="ttc${k}" value="${esc(TT.colors[k] || '#336699')}">`, '']]));
      H.push(row(Lx('قوة اللون', 'Colour strength'), `<input class="f" type="range" min="0.2" max="1" step="0.05" data-k="tableTheme.strength" data-fid="tableTheme.strength" data-num="1" value="${TT.strength}"><em class="num">${num(Math.round(TT.strength * 100))}%</em>`));
    }
    H.push(sect(Lx('ثيماتك الخاصة', 'Your own themes')));
    H.push(note(Lx('أنشئ ثيمًا بألوانك وزخرفتك، فيظهر مع القوالب ويمكن اختياره لكل صلاة (في «تغيير الثيم تلقائيًا» وفي جدول المواقيت).', 'Create a theme with your colours and pattern; it appears with the templates and can be chosen per prayer.')));
    const artO = [['none', Lx('بدون زخرفة', 'None')], ['star8', Lx('نجمة ثمانية', '8-point star')], ['mashrabiya', Lx('مشربية', 'Mashrabiya')], ['skyline', Lx('مسجد وقباب', 'Mosque skyline')], ['mihrab', Lx('محراب', 'Mihrab')], ['corners', Lx('زخارف الأركان', 'Corners')], ['najdi', Lx('نجدي', 'Najdi')], ['rosette', Lx('وردة هندسية', 'Rosette')], ['crescent', Lx('هلال ونجوم', 'Crescent')], ['lantern', Lx('فوانيس', 'Lanterns')], ['eid', Lx('احتفالي', 'Festive')], ['arch', Lx('قوس', 'Arch')], ['dome', Lx('قبة', 'Dome')], ['lattice', Lx('شبكة', 'Lattice')], ['stars', Lx('نجوم', 'Stars')]];
    const cardO = [['glass', Lx('زجاجي', 'Glass')], ['solid', Lx('مصمت', 'Solid')], ['outline', Lx('إطار فقط', 'Outline')]];
    const col = (it, f, lbl) => `<label class="ucol"><input class="f" type="color" data-li="${f}" value="${esc(it[f] || '#000000')}"><em>${lbl}</em></label>`;
    H.push(listEditor('userTpls', '', (it, i) => `<input class="f" data-li="ar" value="${esc(it.ar || '')}" placeholder="${Lx('اسم الثيم', 'Theme name')}">${col(it, 'bg1', Lx('الخلفية 1', 'Back 1'))}${col(it, 'bg2', Lx('الخلفية 2', 'Back 2'))}${col(it, 'p', Lx('الرئيسي', 'Main'))}${col(it, 's', Lx('الثانوي', 'Second'))}${col(it, 'tx', Lx('النص', 'Text'))}${sel2(it, 'art', artO)}${sel2(it, 'card', cardO)}${btn('tpl', S.design.tpl === it.id ? Lx('✓ مستخدم', '✓ In use') : Lx('استخدامه', 'Use'), it.id, 'ghost')}`, userTplBlank()));
    H.push(sect(Lx('القوالب', 'Templates')));
    H.push(`<div class="tplgrid">${allTpls().map(t => `<button class="f tplopt ${S.design.tpl === t.id ? 'on' : ''}" data-act="tpl" data-arg="${t.id}" data-fid="tpl${t.id}" style="background:radial-gradient(circle at 50% 30%,${t.bg2},${t.bg1});color:${t.tx}"><b style="color:${t.p}">${num('04:35')}</b><span>${Lx(t.ar, t.en)}</span><i style="background:${t.p}"></i><i style="background:${t.s}"></i></button>`).join('')}</div>`);
    H.push(sect(Lx('قالب خاص بكم', 'Your own template')));
    H.push(row(Lx('صورة الخلفية (أفقي)', 'Background (landscape)'), media('design.bgImg', 'image/*'), Lx('المقاس المستحسن 1920 × 1080', 'Recommended 1920×1080')));
    H.push(row(Lx('صورة الخلفية (عمودي)', 'Background (portrait)'), media('design.bgImgPort', 'image/*'), Lx('المقاس المستحسن 1080 × 1920', 'Recommended 1080×1920')));
    H.push(row(Lx('تعتيم الخلفية', 'Background dim'), `<input class="f" type="range" min="0" max="0.9" step="0.05" data-k="design.bgDim" data-fid="design.bgDim" data-num="1" value="${S.design.bgDim}">`));
    H.push(row(Lx('شعار خلف جدول الصلوات', 'Logo behind timetable'), media('design.logoImg', 'image/*')));
    if (S.design.logoImg) {
      H.push(row(Lx('لون الشعار خلف الجدول', 'Timetable logo colour'), sel('design.logoTint', [opt('original', 'ألوان الصورة الأصلية', 'Original colours'), opt('auto', 'تلقائي حسب الخلفية', 'Auto by background'), opt('theme', 'اللون الأساسي للثيم', 'Theme primary'), opt('secondary', 'اللون الثانوي للثيم', 'Theme secondary'), opt('custom', 'لون مخصص', 'Custom colour')]), Lx('يحتاج صورة بخلفية شفافة', 'Needs a transparent background')));
      if (S.design.logoTint === 'custom') H.push(row(Lx('اللون المخصص', 'Custom colour'), col('design.logoColor')));
    }
    H.push(row(Lx('شفافية الشعار', 'Logo opacity'), `<input class="f" type="range" min="0.03" max="1" step="0.01" data-k="design.logoOpacity" data-fid="design.logoOpacity" data-num="1" value="${S.design.logoOpacity}">`));
    H.push(row(Lx('حجم الشعار', 'Logo size'), nm('design.logoSize', 10, 100, 5, '%')));
    H.push(sect(Lx('الألوان', 'Colours')));
    H.push(row(Lx('استخدام ألوان القالب', 'Use template colours'), tg('design.useTplColors')));
    if (!S.design.useTplColors) { H.push(row(Lx('اللون الأساسي', 'Primary colour'), col('design.p'))); H.push(row(Lx('اللون الثانوي', 'Secondary colour'), col('design.s'))); }
  }
  if (c === 'name') {
    const N = S.name, cc = colors(), ratio = contrast(N.color || cc.p, N.bg.on ? N.bg.color : tpl().bg1);
    const tints = [opt('original', 'ألوان الصورة الأصلية', 'Original colours'), opt('auto', 'تلقائي حسب الخلفية (أبيض/داكن)', 'Auto by background'), opt('theme', 'اللون الأساسي للثيم', 'Theme primary'), opt('secondary', 'اللون الثانوي للثيم', 'Theme secondary'), opt('text', 'نفس لون النص', 'Same as text'), opt('custom', 'لون مخصص', 'Custom colour')];
    H.push(sect(Lx('حجم بطاقة اسم المسجد', 'Mosque name card size')));
    H.push(row(Lx('حجم البطاقة كاملة', 'Whole card'), `${nm('name.scale', 40, 200, 5, '%')}${+N.scale !== 100 ? btn('resetScale', Lx('↺ الافتراضي', '↺ Default'), 'name.scale', 'ghost') : ''}`, Lx('يكبّر أو يصغّر الشعار والاسم والعلم معًا', 'Scales logo, name and flag together')));
    if (N.mode !== 'text' && N.img) H.push(row(Lx('حجم صورة الشعار', 'Logo image size'), nm('name.imgH', 40, 400, 10, 'px')));
    if (N.mode !== 'image') H.push(row(Lx('حجم خط الاسم (السطر الأول / الثاني)', 'Name font (line 1 / 2)'), `${nm('name.size', 24, 200, 2)} ${nm('name.size2', 16, 140, 2)}`));
    H.push(note(Lx('البطاقة لا تتجاوز عرض الشاشة، والمحتوى تحتها ينزل تلقائيًا ليبقى بلا تداخل.', 'The card never exceeds the screen width; the content below moves down so nothing overlaps.')));
    H.push(sect(Lx('الشعار', 'Logo')));
    H.push(row(Lx('طريقة العرض', 'Show'), sel('name.mode', [opt('text', 'نص فقط', 'Text only'), opt('image', 'صورة الشعار فقط', 'Logo image only'), opt('both', 'صورة الشعار مع النص', 'Logo image + text')])));
    if (N.mode !== 'text') {
      H.push(row(Lx('صورة الشعار', 'Logo image'), media('name.img', 'image/*'), Lx('يُفضّل PNG أو SVG بخلفية شفافة', 'PNG or SVG with a transparent background works best')));
      if (N.mode === 'both') H.push(row(Lx('مكان الصورة', 'Image placement'), sel('name.imgSide', [opt('above', 'فوق النص', 'Above the text'), opt('start', 'بجانب النص', 'Beside the text')])));
      H.push(row(Lx('لون الشعار', 'Logo colour'), sel('name.imgTint', tints), Lx('التلوين يحوّل الشعار للون واحد — يحتاج صورة بخلفية شفافة', 'Tinting turns the logo into one colour — needs a transparent background')));
      if (N.imgTint === 'custom') H.push(row(Lx('اللون المخصص', 'Custom colour'), col('name.imgColor')));
      H.push(sect(Lx('النص', 'Text')));
    }
    H.push(row(Lx('السطر الأول', 'Line 1'), tx('name.l1', Lx('اسم المسجد', 'Mosque name'), 1)));
    H.push(row(Lx('السطر الثاني (اختياري)', 'Line 2 (optional)'), tx('name.l2', Lx('الحي / المدينة', 'District / city'), 1)));
    const P = [['tc', 'أعلى وسط'], ['ts', 'أعلى بداية'], ['te', 'أعلى نهاية'], ['mc', 'وسط'], ['ms', 'وسط بداية'], ['me', 'وسط نهاية'], ['bc', 'أسفل وسط'], ['bs', 'أسفل بداية'], ['be', 'أسفل نهاية']];
    const ordered = ['ts', 'tc', 'te', 'ms', 'mc', 'me', 'bs', 'bc', 'be'];
    H.push(row(Lx('الموضع', 'Position'), `<div class="posgrid">${ordered.map(p => `<button class="f ${N.pos === p ? 'on' : ''}" data-act="pos" data-arg="${p}" data-fid="pos${p}" title="${P.find(x => x[0] === p)[1]}">●</button>`).join('')}</div>
      <div class="arrows">${btn('nudge', '▲', '0|-10')}${btn('nudge', '▼', '0|10')}${btn('nudge', '◀', '-10|0')}${btn('nudge', '▶', '10|0')}${btn('nudge', Lx('↺ توسيط', '↺ reset'), 'r')}</div>`, Lx('أو حرّكه بالأسهم', 'or move with arrows')));
    H.push(row(Lx('لون النص', 'Text colour'), col('name.color')));
    H.push(sect(Lx('حد الحروف', 'Outline')));
    H.push(row(Lx('نوع الحد', 'Style'), sel('name.stroke', [opt('none', 'بدون', 'None'), opt('solid', 'صلب', 'Solid'), opt('dashed', 'متقطع', 'Dashed'), opt('dotted', 'منقط', 'Dotted'), opt('double', 'مزدوج', 'Double')])));
    if (N.stroke !== 'none') { H.push(row(Lx('السماكة', 'Width'), nm('name.strokeW', 1, 12, 1))); H.push(row(Lx('لون الحد', 'Colour'), col('name.strokeColor'))); }
    H.push(sect(Lx('الظل', 'Shadow')));
    H.push(row(Lx('تفعيل الظل', 'Shadow'), tg('name.shadow.on')));
    if (N.shadow.on) { H.push(row(Lx('الإزاحة (أفقي / عمودي)', 'Offset X / Y'), `${nm('name.shadow.x', -30, 30, 1)} ${nm('name.shadow.y', -30, 30, 1)}`)); H.push(row(Lx('الضبابية', 'Blur'), nm('name.shadow.blur', 0, 40, 1))); H.push(row(Lx('لون الظل', 'Colour'), col('name.shadow.color'))); }
    H.push(sect(Lx('خلفية اختيارية', 'Optional background')));
    H.push(row(Lx('لون خلف النص', 'Background'), tg('name.bg.on')));
    if (N.bg.on) { H.push(row(Lx('اللون', 'Colour'), col('name.bg.color'))); H.push(row(Lx('الشفافية', 'Opacity'), `<input class="f" type="range" min="0.1" max="1" step="0.05" data-k="name.bg.op" data-fid="name.bg.op" data-num="1" value="${N.bg.op}">`)); }
    if (ratio < 3) H.push(`<p class="warn">⚠️ ${Lx('التباين منخفض بين لون النص والخلفية — قد يصعب قراءته من بُعد', 'Low contrast between text and background — may be hard to read from afar')} (${ratio.toFixed(1)}:1)</p>`);
    H.push(sect(Lx('أين يظهر اسم المسجد والحي', 'Where the name shows')));
    H.push(note(Lx('يُخفى افتراضيًا في شاشة ما بين الأذان والإقامة، ويمكنك إظهاره أو إخفاؤه في كل شاشة.', 'Hidden between the adhan and the iqamah by default; choose for each screen.')));
    [['main', 'الشاشة الرئيسية', 'Main screen'], ['hadith', 'صفحة الحديث', 'Hadith page'], ['adhan', 'الأذان', 'Adhan'], ['countdown', 'بين الأذان والإقامة (العدّاد وصفحات الأحاديث)', 'Between adhan and iqamah'], ['iqama', 'الإقامة', 'Iqamah'], ['azkar', 'الأذكار', 'Adhkar'], ['khutbah', 'الخطبة', 'Khutbah'], ['special', 'التراويح والعيد والإعلانات', 'Taraweeh, Eid & notices']].forEach(([k, a, e]) => H.push(row(Lx(a, e), tg('name.on.' + k))));
    H.push(note(Lx('يُحفظ التصميم تلقائيًا.', 'Design is saved automatically.')));
  }
  if (c === 'content') {
    const C = S.content;
    H.push(sect(Lx('أذكار الصباح والمساء', 'Morning & evening adhkar')));
    H.push(row(Lx('أذكار الصباح', 'Morning adhkar'), `${tg('content.morning.on')} ${nm('content.morning.offset', -120, 120, 5, Lx('د من الشروق', 'min from sunrise'))} ${nm('content.morning.dur', 1, 60, 1, minU())}`, Lx('سالب = قبل الشروق', 'negative = before sunrise')));
    H.push(row(Lx('أذكار المساء', 'Evening adhkar'), `${tg('content.evening.on')} ${nm('content.evening.offset', -120, 120, 5, Lx('د من الغروب', 'min from sunset'))} ${nm('content.evening.dur', 1, 60, 1, minU())}`, Lx('سالب = قبل الغروب', 'negative = before sunset')));
    H.push(row(Lx('أذكار بعد الصلاة', 'Adhkar after prayer'), `${tg('azkarAfter.on')} ${nm('azkarAfter.min', 1, 30, 1, minU())}`));
    H.push(row(Lx('قوالب الأذكار المفعّلة', 'Enabled adhkar sets'), `<span class="inl">${Lx('بعد الصلاة', 'After prayer')} ${tg('content.sets.after')}</span><span class="inl">${Lx('الصباح', 'Morning')} ${tg('content.sets.morning')}</span><span class="inl">${Lx('المساء', 'Evening')} ${tg('content.sets.evening')}</span><span class="inl">${Lx('الأذان والمسجد', 'Adhan & masjid')} ${tg('content.sets.masjid')}</span>`));
    H.push(note(Lx('نصوص الأذكار والأحاديث نفسها تُعرض وتُعدّل من قسم «الأذكار والأحاديث».', 'The adhkar and hadith texts are viewed and edited in “Adhkar & hadith”.')));
    H.push(sect(Lx('شكل شاشة الأذكار', 'Adhkar screen look')));
    const AV = S.azkarView;
    H.push(row(Lx('شكل شاشة الأذكار', 'Adhkar screen'), sel('azkarView.mode', [opt('all', 'بطاقات يُعدّها البرنامج (كل الأذكار في شاشة)', 'Cards made by the app (all adhkar)'), opt('one', 'ذكر واحد في كل مرة بخط كبير', 'One at a time, large text'), opt('image', 'صورة / تصميم تختاره أنت', 'Your own picture / design')]), (AV.mode === 'image' ? Lx('تُعرض الصورة التي تختارها لكل نوع من الأذكار على كامل الشاشة', 'Your picture for each adhkar set fills the screen') : AV.mode === 'one' ? Lx('يظهر ذكر واحد بخط كبير ثم الذي يليه', 'One dhikr at a time in large text') : Lx('لكل ذكر بطاقة مستقلة مع عدد التكرار والمصدر، وإذا لم تتسع كلها بخط مقروء تُقسم إلى صفحات تتناوب خلال وقت الأذكار', 'Each dhikr in its own card with its count and source; split into pages if needed'))));
    if (AV.mode === 'all') {
      H.push(row(Lx('عدد البطاقات في الصف', 'Cards per row'), sel('azkarView.cols', [opt('0', 'تلقائي', 'Auto'), opt('1', '1 — بطاقة واحدة في المنتصف', '1 — one centred card'), opt('2', '2 — بطاقتان متجاورتان', '2 — side by side'), opt('3', '3 — الكبرى في المنتصف والصغريان على الطرفين', '3 — largest in the middle')], true), Lx('في الصف الثلاثي يوضع الذكر الأطول في المنتصف، والبطاقتان الجانبيتان بارتفاع واحد', 'In a row of three the longest dhikr is in the middle; the two side cards share one height')));
      H.push(row(Lx('إظهار المصدر والفضل تحت كل ذكر', 'Show source & virtue under each'), tg('azkarView.notes')));
    }
    if (AV.mode === 'image') {
      H.push(note(Lx('اختر صورة جاهزة لكل نوع من الأذكار (تصميمك أو صورة الأذكار التي تفضلها) فتُعرض على كامل الشاشة بدل النصوص. يمكن إضافة أكثر من صورة لكل نوع فتتناوب خلال وقت الأذكار. إذا لم تُضف صورة لنوع ما تُعرض أذكاره بالبطاقات.', 'Pick a ready picture for each adhkar set (your design); it fills the screen instead of the text. Several pictures share the adhkar time. A set without pictures is shown as cards.')));
      const imgs = AV.imgs || {};
      [['morning', 'صور أذكار الصباح', 'Morning adhkar pictures'], ['evening', 'صور أذكار المساء', 'Evening adhkar pictures'], ['after', 'صور أذكار بعد الصلاة', 'After-prayer adhkar pictures']].forEach(([k, a, e]) =>
        H.push(`<div class="gbox"><div class="ghead"><b>${Lx(a, e)}</b>${btn('addAzImgs', Lx('➕ إضافة صور', '➕ Add images'), k)}</div><div class="thumbs">${(imgs[k] || []).map((id, ii) => `<button class="f thumb" data-act="delAzImg" data-arg="${k}|${ii}" data-fid="azi${k}-${ii}" data-media="${id}" title="${Lx('حذف', 'Delete')}"></button>`).join('') || `<em>${Lx('لا توجد صور — ستظهر البطاقات', 'No pictures — cards will be shown')}</em>`}</div></div>`));
      H.push(row(Lx('ملاءمة الصورة للشاشة', 'Picture fit'), sel('azkarView.imgFit', [opt('blur', 'الصورة كاملة مع خلفية ضبابية منها', 'Whole picture on a blurred copy'), opt('contain', 'الصورة كاملة على خلفية سوداء', 'Whole picture on black'), opt('cover', 'ملء الشاشة (قد يُقص الأطراف)', 'Fill the screen (may crop edges)'), opt('stretch', 'تمديد على كامل الشاشة', 'Stretch to the screen')]), Lx('المقاس المستحسن للصورة 1920 × 1080 للشاشة الأفقية و1080 × 1920 للعمودية', 'Best size 1920×1080 (landscape) or 1080×1920 (portrait)')));
    } else {
    H.push(row(Lx('صورة خلفية أذكار الصباح', 'Morning adhkar picture'), media('azkarView.bg.morning', 'image/*')));
    H.push(row(Lx('صورة خلفية أذكار المساء', 'Evening adhkar picture'), media('azkarView.bg.evening', 'image/*')));
    H.push(row(Lx('صورة خلفية أذكار بعد الصلاة', 'After-prayer adhkar picture'), media('azkarView.bg.after', 'image/*')));
    }
    if (AV.mode !== 'image' && (AV.bg.morning || AV.bg.evening || AV.bg.after)) H.push(row(Lx('تعتيم الصورة لوضوح النص', 'Darken picture for readability'), `<input class="f" type="range" min="0" max="0.85" step="0.05" data-k="azkarView.dim" data-fid="azkarView.dim" data-num="1" value="${AV.dim}"><em class="num">${num(Math.round(AV.dim * 100))}%</em>`));
    H.push(row(Lx('معاينة', 'Preview'), `${btn('preview', Lx('أذكار الصباح', 'Morning'), 'morning')} ${btn('preview', Lx('بعد الصلاة', 'After prayer'), 'azkar')}`));
    H.push(sect(Lx('الأحاديث', 'Hadith')));
    H.push(row(Lx('تفعيل عرض الأحاديث', 'Show hadith'), tg('content.hadith.on')));
    const HP = S.hadithPage;
    H.push(row(Lx('طريقة عرض الأحاديث والأذكار والمناسبات', 'How hadith, adhkar & occasions are shown'), sel('hadithPage.on', [[true, Lx('صفحة مستقلة بالتناوب مع شاشة المواقيت', 'A page of their own, alternating with the prayer times')], [false, Lx('سطر داخل شاشة المواقيت', 'A line on the prayer-times screen')]]), Lx('الصفحة المستقلة تعرض الحديث بخط كبير واضح، وتُخفي سطر الأحاديث من شاشة المواقيت', 'The page shows each text large and hides the hadith line')));
    if (HP.on) {
      H.push(row(Lx('مدة شاشة المواقيت بين صفحات الأحاديث', 'Prayer-times screen between pages'), nm('hadithPage.every', 3, 600, 1, secU())));
      H.push(row(Lx('عدد الأحاديث في كل مرة', 'Hadith per turn'), nm('hadithPage.perVisit', 1, 5, 1, '')));
      H.push(row(Lx('سرعة القراءة', 'Reading speed'), sel('hadithPage.speed', [['slow', Lx('بطيئة — لكبار السن والقراءة من بُعد', 'Slow — elderly / far away')], ['normal', Lx('متوسطة', 'Normal')], ['fast', Lx('سريعة', 'Fast')]]), Lx('مدة كل حديث تُحسب من عدد كلماته وسرعة القراءة: الحديث القصير يظهر مدة أقصر، والطويل مدة أطول', 'Each page stays as long as its words need at this speed')));
      H.push(row(Lx('أقل مدة لصفحة الحديث', 'Shortest page'), nm('hadithPage.minSec', 5, 120, 1, secU())));
      H.push(row(Lx('أطول مدة لصفحة الحديث', 'Longest page'), nm('hadithPage.maxSec', 10, 300, 5, secU())));
      H.push(row(Lx('حجم خط الحديث', 'Hadith text size'), nm('hadithPage.scale', 60, 160, 5, '%'), Lx('الخط يتناسب تلقائيًا مع طول الحديث ليملأ الصفحة بوضوح؛ هذا أقصى حجم له', 'The size follows the length of the text; this is its largest size')));
      H.push(row(Lx('إظهار الساعة والصلاة القادمة أعلى الصفحة', 'Clock and next prayer on top'), tg('hadithPage.clock')));
      H.push(row(Lx('شريط الوقت المتبقي للحديث', 'Time-left bar'), tg('hadithPage.progress')));
      const items = rotatorItems(now()), ds = items.map(hpDur);
      if (items.length) H.push(note(Lx(`${num(items.length)} نصًا في الدورة الآن — مدة الصفحة من ${num(Math.min(...ds))} إلى ${num(Math.max(...ds))} ثانية بحسب طول النص`, `${items.length} texts now — ${Math.min(...ds)} to ${Math.max(...ds)} s per page`)));
      H.push(row(Lx('معاينة', 'Preview'), btn('preview', Lx('صفحة الحديث', 'Hadith page'), 'hadithPage')));
    } else H.push(row(Lx('مدة عرض كل حديث', 'Each hadith for'), nm('content.hadith.sec', 8, 120, 1, secU())));

    H.push(sect(Lx('معرض الصور', 'Image galleries')));
    const G = S.gallery;
    H.push(row(Lx('تشغيل المعرض تلقائيًا', 'Start the gallery automatically'), tg('gallery.auto'), Lx('عند التوقف عن تحريك الفأرة أو الريموت أو بعد الخروج من الإعدادات. أي حركة أو زر يغلقه فورًا.', 'When the mouse or remote stops moving, or after leaving settings. Any movement or key closes it at once.')));
    if (G.auto) {
      H.push(row(Lx('يبدأ بعد', 'Starts after'), nm('gallery.idleSec', 2, 600, 1, secU()), Lx('من آخر استخدام', 'since the last use')));
      H.push(row(Lx('مدة العرض في كل مرة', 'Shown for'), nm('gallery.showMin', 0, 240, 1, minU()), Lx('0 = دورة واحدة على كل الصور', '0 = one round of all pictures')));
      H.push(row(Lx('ثم الشاشة الرئيسية لمدة', 'Then the main screen for'), nm('gallery.everyMin', 0, 240, 1, minU()), Lx('ثم يعود المعرض. 0 = يستمر المعرض حتى أي حركة أو وقت الصلاة', 'Then the gallery again. 0 = keep the gallery until input or prayer time')));
      H.push(row(Lx('يتوقف قبل الأذان بـ', 'Stops before the adhan'), nm('gallery.stopBefore', 0, 60, 1, minU()), Lx('ولا يظهر أثناء الأذان والإقامة والصلاة والأذكار', 'Never shown during adhan, iqamah, prayer or adhkar')));
      H.push(row(Lx('إظهار الوقت والصلاة القادمة على الصور', 'Show time & next prayer on pictures'), tg('gallery.info')));
    }
    H.push(row(Lx('مدة ظهور الصورة الواحدة', 'Each image for'), nm('gallery.sec', 3, 120, 1, secU())));
    H.push(row(Lx('تأثير الانتقال', 'Transition'), sel('gallery.fx', [opt('random', 'عشوائي (تأثير مختلف كل مرة)', 'Random (different each time)'), opt('fade', 'تلاشي', 'Fade'), opt('slideL', 'انزلاق أفقي', 'Slide sideways'), opt('slideU', 'انزلاق للأعلى', 'Slide up'), opt('zoomIn', 'تكبير', 'Zoom in'), opt('zoomOut', 'تصغير', 'Zoom out'), opt('circle', 'دائرة', 'Circle'), opt('wipeL', 'مسح', 'Wipe'), opt('diamond', 'معيّن', 'Diamond'), opt('blur', 'ضبابية', 'Blur'), opt('rotate', 'دوران', 'Rotate'), opt('flip', 'قلب', 'Flip')])));
    H.push(row(Lx('مدة الانتقال', 'Transition length'), nm('gallery.fxSec', 0.3, 4, 0.1, secU())));
    H.push(row(Lx('حركة هادئة للصورة أثناء العرض', 'Slow drift while shown (Ken Burns)'), tg('gallery.kenburns')));
    H.push(row(Lx('ملء الشاشة', 'Fit'), sel('gallery.fit', [opt('blur', 'الصورة كاملة مع خلفية ضبابية منها', 'Whole picture on a blurred copy'), opt('contain', 'الصورة كاملة على خلفية سوداء', 'Whole picture on black'), opt('cover', 'ملء الشاشة (قد يُقص الأطراف)', 'Fill the screen (may crop edges)')])));
    H.push(row(Lx('ترتيب عشوائي للصور', 'Shuffle pictures'), tg('gallery.shuffle')));
    H.push(row(Lx('عرض المعرض بين الأذان والإقامة', 'Show between adhan and iqamah'), tg('gallery.between')));
    S.galleries.forEach((g, gi) => H.push(`<div class="gbox"><div class="ghead">${tg(`galleries.${gi}.on`)}<input class="f" data-k="galleries.${gi}.name" data-fid="gname${gi}" value="${esc(g.name)}">${btn('addImgs', Lx('➕ إضافة صور', '➕ Add images'), String(gi))}${S.galleries.length > 1 ? btn('delGallery', '🗑', String(gi), 'ghost') : ''}</div><div class="thumbs" data-gi="${gi}">${g.imgs.map((id, ii) => `<button class="f thumb" data-act="delImg" data-arg="${gi}|${ii}" data-fid="img${gi}-${ii}" data-media="${id}" title="${Lx('حذف', 'Delete')}"></button>`).join('') || `<em>${Lx('لا توجد صور', 'No images')}</em>`}</div></div>`));
    H.push(btn('addGallery', Lx('➕ معرض جديد', '➕ New gallery')));
    H.push(sect(Lx('شريط الأخبار', 'News ticker')));
    H.push(row(Lx('تفعيل الشريط', 'Ticker'), tg('ticker.on')));
    H.push(row(Lx('الحركة', 'Motion'), `${sel('ticker.mode', [opt('scroll', 'متحرك', 'Scrolling'), opt('static', 'ثابت', 'Static')])} ${sel('ticker.speed', [opt('slow', 'بطيئة', 'Slow'), opt('normal', 'طبيعية', 'Normal'), opt('fast', 'أسرع', 'Fast')])}`, Lx('مناسبة للقراءة من بُعد', 'Readable from a distance')));
    H.push(listEditor('ticker.items', Lx('نصوص الشريط', 'Ticker texts'), it => `<button class="f tg mini ${it.on !== false ? 'on' : ''}" data-li-toggle="on"><i></i></button><input class="f wide" data-li="t" value="${esc(it.t)}">`, { t: '', on: true }));
    H.push(row(Lx('نصوص ورسائل جاهزة', 'Ready-made texts'), `<div class="chips">${READY_TEXTS.map((t, i) => btn('ready', esc(t), String(i), 'chip')).join('')}</div>`));
    H.push(sect(Lx('رسائل الجنازة', 'Funeral messages')));
    H.push(note(Lx('اضغط «إضافة سطر جديد» ثم اكتب اسم المتوفى واختر طريقة العرض: إعلان الصلاة عليه بعد صلاة محددة (يظهر حتى انتهاء تلك الصلاة)، أو نعي يظهر طوال اليوم للمدة التي تحددها (مثل 3 أيام).', 'Press “Add a new line”, type the name and choose: an announcement of the funeral prayer after a given prayer, or an obituary shown all day for the days you set (e.g. 3).')));
    H.push(listEditor('funerals', '', it => `<button class="f tg mini ${it.on !== false ? 'on' : ''}" data-li-toggle="on"><i></i></button><input class="f" data-li="name" value="${esc(it.name || '')}" placeholder="${Lx('اسم المتوفى: فلان بن فلان', 'Name of the deceased')}"><select class="f" data-li="g"><option value="m" ${it.g !== 'f' ? 'selected' : ''}>${Lx('ذكر', 'Male')}</option><option value="f" ${it.g === 'f' ? 'selected' : ''}>${Lx('أنثى', 'Female')}</option></select><select class="f" data-li="mode">${[['after', 'بعد صلاة', 'After prayer'], ['days', 'طوال اليوم لعدة أيام', 'All day for days']].map(([v, a, e]) => `<option value="${v}" ${it.mode === v ? 'selected' : ''}>${Lx(a, e)}</option>`).join('')}</select>${it.mode === 'days' ? `<input class="f num" type="number" min="1" max="30" data-li="days" data-num="1" value="${+it.days || 3}" title="${Lx('عدد الأيام', 'Days')}"><em>${Lx('يوم', 'days')}</em>` : `<select class="f" data-li="prayer">${PRAYERS5.map(k => `<option value="${k}" ${it.prayer === k ? 'selected' : ''}>${PN(k)}</option>`).join('')}</select>`}<input class="f wide" data-li="note" value="${esc(it.note || '')}" placeholder="${Lx('نص إضافي (اختياري): مكان العزاء…', 'Extra text (optional)')}"><em class="fstat">${funeralStatus(it)}</em>`, { name: '', mode: 'after', prayer: 'dhuhr', days: 3, note: '', on: true }));
    S.notices.forEach((n, i) => H.push(`<div class="li"><span class="lt">${esc(n.text)}</span>${btn('delNotice', '🗑', String(i), 'ghost')}</div>`));
    H.push(sect(Lx('الأحداث والمناسبات', 'Events & occasions')));
    H.push(listEditor('events', '', it => `<button class="f tg mini ${it.on !== false ? 'on' : ''}" data-li-toggle="on"><i></i></button><input class="f" data-li="title" value="${esc(it.title)}" placeholder="${Lx('العنوان', 'Title')}"><input class="f wide" data-li="text" value="${esc(it.text || '')}" placeholder="${Lx('التفاصيل', 'Details')}"><input class="f" type="date" data-li="from" value="${esc(it.from || '')}"><input class="f" type="date" data-li="to" value="${esc(it.to || '')}">`, { title: '', text: '', from: dayKey(new Date()), to: dayKey(new Date()), on: true }));
  }
  if (c === 'azkar') {
    const tab = azkarTab;
    const tabs = [['morning', 'أذكار الصباح', 'Morning'], ['evening', 'أذكار المساء', 'Evening'], ['after', 'أذكار بعد الصلاة', 'After prayer'], ['masjid', 'أذكار الأذان والمسجد', 'Adhan & masjid'], ['hadith', 'الأحاديث', 'Hadith']];
    H.push(`<div class="chips tabs">${tabs.map(([k, a, e]) => `<button class="f b chip ${tab === k ? 'on' : ''}" data-act="azTab" data-arg="${k}" data-fid="az${k}">${Lx(a, e)}</button>`).join('')}</div>`);
    H.push(`<div class="chips tabs libtabs"><b>${Lx('مكتبة الأذكار (islambook):', 'Adhkar library (islambook):')}</b>${IB_CATS.map(c => `<button class="f b chip ${tab === 'lib:' + c.k ? 'on' : ''}" data-act="azTab" data-arg="lib:${c.k}" data-fid="azlib${c.k}">${Lx(c.ar, c.en)}${S.lib.show[c.k] ? ' 👁' : ''}</button>`).join('')}</div>`);
  }
  if (c === 'azkar' && azkarTab.startsWith('lib:')) {
    const k = azkarTab.slice(4), cat = IB_CATS.find(x => x.k === k);
    if (cat) {
      const on = cat.items.filter((x, i) => libItemOn(k, i)).length, fl = cat.items.filter(x => x.f && x.f !== 'athar').length;
      H.push(note(Lx(`${cat.ar}: ${num(cat.items.length)} ذكرًا كما في islambook بعددها، مع تخريج كل ذكر. المفعّل منها ${num(on)}. ${fl ? `${num(fl)} منها موقوفة افتراضيًا (ضعيف أو مختلف في ثبوته أو دعاء عام غير مأثور بلفظه) والسبب مكتوب تحتها.` : ''}`, `${cat.en}: ${cat.items.length} items as on islambook with counts and sources; ${on} on.`)));
      H.push(row(Lx('عرض هذه الفئة في سطر الأحاديث', 'Show this category in the hadith line'), tg('lib.show.' + k), Lx(`النصوص الأطول من ${num(LIB_MAX_LINE)} حرفًا تبقى في المكتبة ولا تُعرض في السطر`, `Texts longer than ${LIB_MAX_LINE} letters stay in the library only`)));
      H.push(`<div class="list lib">${cat.items.map((x, i) => { const o = libItemOn(k, i); return `<div class="li libi${o ? '' : ' off'}"><button class="f tg mini ${o ? 'on' : ''}" data-act="libTog" data-arg="${k}|${i}" data-fid="lib${k}${i}"><i></i></button><div class="lbody">${x.h ? `<b class="lh">${esc(x.h)}</b>` : ''}<div class="lt">${esc(x.t)}</div><div class="lm">${x.c > 1 ? `<em class="cnt">${esc(countLabel(x.c))}</em>` : ''}${x.v ? `<span>${esc(x.v)}</span>` : ''}<span class="src">📚 ${esc(x.s)}</span>${x.t.length > LIB_MAX_LINE ? `<span class="long">${Lx('نص طويل — لا يُعرض في السطر', 'Long — not in the line')}</span>` : ''}</div>${x.f ? `<div class="${x.f === 'athar' ? 'infob' : 'warnb'}">${x.f === 'athar' ? 'ℹ️' : '⚠️'} ${Lx(IB_FLAG[x.f][0], IB_FLAG[x.f][1])}: ${esc(x.w || '')}</div>` : ''}</div></div>`; }).join('')}</div>`);
      H.push(btn('libReset', Lx('↺ إعادة الاختيار الافتراضي لهذه الفئة', '↺ Default selection for this category'), k, 'ghost'));
    }
  }
  if (c === 'azkar' && !azkarTab.startsWith('lib:')) {
    const tab = azkarTab;
    const lk = tab === 'hadith' ? 'hadiths' : 'azkar.' + tab;
    H.push(note(Lx('النصوص المضمّنة من الأذكار والأحاديث الثابتة (الصحيح والحسن) مع تخريجها وعدد كل ذكر. عدّل النص مباشرة، أو أوقف الذكر بالمفتاح، أو غيّر ترتيبه بالأسهم. «العدد» يظهر بجانب الذكر على الشاشة.', 'Built-in texts are authenticated adhkar and hadith with their sources and counts. Edit, switch off or reorder any item; the count shows next to the text.')));
    {
      const arr = (tab === 'hadith' ? S.hadiths : S.azkar[tab]).filter(x => x.on !== false), own = arr.reduce((a, x) => a + (+x.d || 0), 0), autoN = arr.filter(x => !(+x.d > 0)).length;
      const win = tab === 'after' ? +S.azkarAfter.min * 60 : tab === 'morning' ? +S.content.morning.dur * 60 : tab === 'evening' ? +S.content.evening.dur * 60 : 0;
      H.push(note(win ? Lx(`مدة العرض لكل ذكر: اتركها فارغة لتُقسم المدة تلقائيًا، أو حدّد ثوانيَ لذكر بعينه. وقت هذا القسم ${num(win / 60)} دقيقة — المحدد يدويًا ${num(own)} ثانية، و${num(autoN)} أذكار تتقاسم الباقي.`, `Per-item duration: leave empty to share time automatically, or set seconds for an item. This section runs ${win / 60} min — ${own} s set by hand, ${autoN} items share the rest.`)
        : Lx(`مدة العرض لكل عنصر: فارغ = ${num(S.content.hadith.sec)} ثانية (من «المحتوى الدعوي»)، أو حدّد ثوانيَ لعنصر بعينه.`, `Per-item duration: empty = ${S.content.hadith.sec} s, or set seconds for an item.`)));
      if (win && own > win) H.push(`<p class="warn">${Lx('مجموع المدد المحددة أطول من وقت القسم، فلن تظهر كل الأذكار — زد وقت القسم أو قلّل المدد.', 'The set durations are longer than the section time, so some items will not show.')}</p>`);
    }
    if (tab === 'masjid') H.push(row(Lx('عرضها على الشاشة الرئيسية مع الأحاديث', 'Show on the main screen with the hadith'), tg('content.sets.masjid')));
    H.push(listEditor(lk, '', (it, i, n) => `<button class="f tg mini ${it.on !== false ? 'on' : ''}" data-li-toggle="on"><i></i></button><textarea class="f wide" rows="2" data-li="t">${esc(it.t)}</textarea>${tab !== 'hadith' ? `<em>${Lx('العدد', 'Count')}</em><input class="f cnt" type="number" min="0" max="1000" data-li="c" value="${esc(it.c || '')}" placeholder="${Lx('العدد', 'Count')}">` : ''}<em>${Lx('مدة العرض', 'Shown for')}</em><input class="f cnt" type="number" min="0" max="600" data-li="d" value="${esc(it.d || '')}" placeholder="${Lx('تلقائي', 'auto')}"><em>${Lx('ث', 's')}</em><input class="f" data-li="s" value="${esc(it.s || '')}" placeholder="${Lx('المصدر', 'Source')}">${tab !== 'hadith' ? `<input class="f" data-li="n" value="${esc(it.n || '')}" placeholder="${Lx('ملاحظة (اختياري)', 'Note (optional)')}">` : ''}${it.w ? `<div class="${it.f === 'athar' ? 'infob' : 'warnb'} full">${it.f === 'athar' ? 'ℹ️' : '⚠️'} ${it.f && IB_FLAG[it.f] ? Lx(IB_FLAG[it.f][0], IB_FLAG[it.f][1]) + ': ' : ''}${esc(it.w)}</div>` : ''}${btn('moveItem', '▲', `${lk}|${i}|-1`, 'ghost')}${btn('moveItem', '▼', `${lk}|${i}|1`, 'ghost')}`, { t: '', s: '', c: 0, on: true }));
    H.push(btn('restoreAzkar', Lx('↺ استعادة النصوص الأصلية لهذا القسم', '↺ Restore the original texts of this section'), tab, 'ghost'));
  }
  if (c === 'saver') {
    const V = S.saver;
    H.push(note(Lx('خاصية حفظ الشاشة ووضع السكون تلقائيًا — تحمي الشاشة وتوفّر الكهرباء. تستيقظ الشاشة عند ضغط أي زر.', 'Automatic screensaver / sleep mode. Any key wakes the screen.')));
    H.push(row(Lx('تفعيل وضع السكون', 'Enable'), tg('saver.on')));
    H.push(note(Lx('يعمل تلقائيًا أثناء الصلوات (من الإقامة حتى نهاية الصلاة). يمكنك اختيار وقت آخر من «متى يعمل» أو إيقافه.', 'Runs by itself during the prayers (iqamah to the end of the prayer). Choose another time under “When”, or turn it off.')));
    H.push(row(Lx('شكل الشاشة', 'Look'), sel('saver.look', [opt('black', 'شاشة سوداء', 'Black'), opt('time', 'سوداء مع الوقت', 'Black + time'), opt('timedate', 'سوداء مع الوقت والتاريخ', 'Black + time & date')])));
    H.push(row(Lx('حجم المعلومات', 'Size'), sel('saver.size', [opt('s', 'صغير', 'Small'), opt('m', 'متوسط', 'Medium'), opt('l', 'كبير', 'Large')])));
    H.push(row(Lx('تحريك المعلومات', 'Move the text'), tg('saver.move'), Lx('معطّل: الوقت والتاريخ ثابتان في وسط الشاشة. مفعّل: يتحركان ببطء كل دقيقة لحماية الشاشات القديمة', 'Off: time and date stay still in the middle. On: they drift slowly every minute to protect older panels')));
    H.push(row(Lx('متى يعمل', 'When'), sel('saver.mode', [opt('during', 'أثناء الصلوات', 'During prayers'), opt('between', 'بين الصلوات', 'Between prayers'), opt('interval', 'فترات زمنية (تشغيل/إيقاف)', 'Repeating intervals'), opt('timedInterval', 'تشغيل متكرر محدد بوقت', 'Timed repeating'), opt('window', 'فترة محددة', 'Fixed window')])));
    if (V.mode === 'between') { H.push(row(Lx('يبدأ بعد انتهاء الصلاة', 'Start after prayer ends'), nm('saver.startAfter', 0, 120, 1, minU()))); H.push(row(Lx('يتوقف قبل الأذان التالي', 'Stop before next adhan'), nm('saver.stopBefore', 0, 120, 1, minU()))); }
    if (V.mode === 'interval' || V.mode === 'timedInterval') { H.push(row(Lx('تشغيل لمدة', 'On for'), nm('saver.onMin', 1, 240, 1, minU()))); H.push(row(Lx('ثم إيقاف لمدة', 'Then off for'), nm('saver.offMin', 1, 240, 1, minU()))); }
    if (V.mode === 'timedInterval') H.push(row(Lx('من الساعة / إلى الساعة', 'From / to'), `${tm('saver.at')} ${tm('saver.to')}`));
    if (V.mode === 'window') H.push(row(Lx('من / إلى', 'From / to'), `${tm('saver.from')} ${tm('saver.to')}`, Lx('حتى لو تجاوزت منتصف الليل', 'May cross midnight')));
    H.push(row(Lx('بعد عدم التفاعل', 'After inactivity'), `${tg('saver.idle')} ${nm('saver.idleMin', 1, 600, 1, minU())}`));
  }
  if (c === 'sound') {
    const so = S.sound, kinds = SOUND_PRESETS.map(([v, ar, en]) => [v, Lx(ar, en)]);
    H.push(row(Lx('درجة الصوت', 'Volume'), `<input class="f" type="range" min="0" max="1" step="0.05" data-k="sound.vol" data-fid="sound.vol" data-num="1" value="${so.vol}">`));
    H.push(sect(Lx('تنبيه الأذان', 'Adhan alert')));
    H.push(row(Lx('تفعيل', 'Enable'), tg('sound.adhan.on')));
    H.push(row(Lx('الصوت', 'Sound'), `${sel('sound.adhan.kind', kinds)} ${btn('testSound', Lx('▶ معاينة', '▶ Preview'), 'adhan')}${btn('stopSound', '■', '', 'ghost')}`));
    if (so.adhan.kind === 'custom') {
      H.push(row(Lx('ملف الأذان العام (الظهر والعصر والمغرب والعشاء)', 'General adhan file (Dhuhr, Asr, Maghrib, Isha)'), media('sound.adhan.media', 'audio/*'), Lx('MP3 أو M4A — تسجيل المؤذن بصيغة الأذان المعتادة', 'MP3 or M4A — the regular adhan')));
      H.push(row(Lx('ملف أذان الفجر', 'Fajr adhan file'), media('sound.adhan.mediaFajr', 'audio/*'), Lx('بصيغة الفجر: فيه «الصلاة خير من النوم». لا يُشغَّل الأذان العام في الفجر أبدًا؛ إن لم تضف ملفًا للفجر تُسمع نغمة قصيرة فقط', 'With «as-salatu khayrun min an-nawm». The general adhan never plays at Fajr; without a Fajr file a short tone plays')));
      if (!adhanMediaFor('fajr')) H.push(note(Lx('⚠️ لم يُضف ملف أذان الفجر بعد.', '⚠️ No Fajr adhan file yet.')));
    }
    H.push(sect(Lx('الصوت لكل صلاة', 'Sound for each prayer')));
    H.push(note(Lx('لكل صلاة: تشغيل الأذان أو إيقافه، ودرجة صوت خاصة بها (نسبة من الصوت العام)، وتنبيه الإقامة، وملف أذان خاص اختياري.', 'For each prayer: adhan on/off, its own volume (share of the main volume), the iqamah alert, and an optional own file.')));
    for (const k of SOUND_PRAYERS) {
      const b = 'sound.per.' + k, used = adhanMediaFor(k);
      H.push(`<div class="gbox"><h4>${k === 'jumuah' ? Lx('الجمعة', "Jumu'ah") : PN(k)}</h4>`);
      H.push(row(Lx('الأذان', 'Adhan'), `${tg(b + '.on')} ${btn('testAdhan', Lx('▶ معاينة', '▶ Preview'), k)}${btn('stopSound', '■', '', 'ghost')}`));
      H.push(row(Lx('درجة الصوت', 'Volume'), nm(b + '.vol', 0, 100, 5, '%')));
      H.push(row(Lx('تنبيه الإقامة', 'Iqamah alert'), tg(b + '.iq')));
      if (so.adhan.kind === 'custom') H.push(row(Lx('ملف خاص بهذه الصلاة', 'Own file for this prayer'), media(b + '.media', 'audio/*'), val(b + '.media') ? '' : (used ? Lx(k === 'fajr' ? 'يُستخدم ملف أذان الفجر' : 'يُستخدم الملف العام', k === 'fajr' ? 'Uses the Fajr file' : 'Uses the general file') : Lx('لا يوجد ملف — نغمة قصيرة', 'No file — a short tone'))));
      H.push('</div>');
    }
    H.push(sect(Lx('تنبيه الإقامة', 'Iqamah alert')));
    H.push(row(Lx('تفعيل', 'Enable'), tg('sound.iqama.on')));
    H.push(row(Lx('الصوت', 'Sound'), `${sel('sound.iqama.kind', kinds)} ${btn('testSound', Lx('▶ معاينة', '▶ Preview'), 'iqama')}`));
    if (so.iqama.kind === 'custom') H.push(row(Lx('ملف الإقامة', 'Iqamah file'), media('sound.iqama.media', 'audio/*')));
    H.push(sect(Lx('التحكم في ميكروفون المسجد والمكبّر (وحدة تحكم خارجية)', 'Mosque microphone & amplifier (external controller)')));
    H.push(row(Lx('تفعيل وحدة التحكم', 'Use the controller'), tg('sound.relay.on'), Lx('لرفع الأذان من الجهاز عند عدم وجود مؤذن: يشغّل المكبّر قبل الأذان ويطفئه بعده. يحتاج وحدة تحكم (Relay) على الشبكة تُباع منفصلة', 'To call the adhan from the device: switches the amplifier on before and off after. Needs a network relay sold separately')));
    if (so.relay.on) {
      H.push(row(Lx('رابط التشغيل', 'Switch-on URL'), tx('sound.relay.onUrl', 'http://192.168.1.50/cm?cmnd=Power%20On', 1)));
      H.push(row(Lx('رابط الإيقاف', 'Switch-off URL'), tx('sound.relay.offUrl', 'http://192.168.1.50/cm?cmnd=Power%20Off', 1)));
      H.push(row(Lx('التشغيل قبل الأذان', 'Switch on before'), nm('sound.relay.lead', 0, 60, 1, secU())));
      H.push(row(Lx('الإيقاف بعد الأذان', 'Switch off after'), nm('sound.relay.hold', 30, 900, 10, secU()), Lx('اجعلها أطول من مدة ملف الأذان', 'Longer than the adhan recording')));
      H.push(row(Lx('مع الإقامة أيضًا', 'Also for the iqamah'), tg('sound.relay.iqama')));
      H.push(row(Lx('اختبار', 'Test'), `${btn('relayTest', Lx('تشغيل', 'On'), 'on')}${btn('relayTest', Lx('إيقاف', 'Off'), 'off')}`));
    }
    H.push(note(Lx('على المتصفح العادي يجب الضغط على أي زر مرة واحدة بعد التشغيل حتى يُسمح بالصوت. نسخة APK لا تحتاج ذلك.', 'In a regular browser press any key once after start to allow audio. The APK does not need this.')));
  }
  if (c === 'device' && IS_DASH) {
    H.push(sect(Lx('أوامر عن بُعد', 'Remote actions')));
    H.push(note(Lx('تصل الأوامر للشاشة خلال 30 ثانية تقريبًا.', 'Commands reach the screen within about 30 seconds.')));
    H.push(row(Lx('تعريف الشاشة', 'Identify'), btn('remote', Lx('عرض رقم الشاشة', 'Show the key on the screen'), 'identify')));
    H.push(row(Lx('إعادة التحميل', 'Reload'), `${btn('remote', Lx('↻ إعادة تحميل', '↻ Reload'), 'reload')}${btn('remote', Lx('⏻ إعادة تشغيل التطبيق', '⏻ Restart app'), 'restart')}${btn('remote', Lx('🔎 تحديث التطبيق', '🔎 Update app'), 'update')}`));
    H.push(row(Lx('الدعم عن بعد', 'Remote support'), `${btn('remote', 'TeamViewer QuickSupport', 'openApp:com.teamviewer.quicksupport.market')}${btn('remote', 'AnyDesk', 'openApp:com.anydesk.anydeskandroid')}`, Lx('يفتح التطبيق على الشاشة (نسخة APK)', 'Opens it on the screen (APK)')));
    H.push(sect(Lx('النسخ الاحتياطي', 'Backup')));
    H.push(row(Lx('تصدير الإعدادات', 'Export settings'), btn('export', Lx('⬇ تنزيل ملف الإعدادات', '⬇ Download settings file'), '0')));
    H.push(row(Lx('استعادة من ملف', 'Restore from file'), btn('pick', Lx('⬆ اختيار ملف…', '⬆ Choose file…'), 'backup|.json,application/json')));
  }
  if (c === 'device') {
    H.push(sect(Lx('الطقس ودرجة الحرارة', 'Weather & temperature')));
    const TI = S.temp.inside;
    H.push(row(Lx('عرض الطقس ودرجة الحرارة', 'Show weather & temperature'), `${tg('temp.on')} ${sel('temp.unit', [['C', Lx('مئوية °C', 'Celsius')], ['F', Lx('فهرنهايت °F', 'Fahrenheit')]])}`, Lx('تظهر في بطاقة الصلاة القادمة', 'Shown in the next-prayer card') + (S.temp.on ? ' — ' + (weatherText() || Lx('جارٍ الجلب…', 'loading…')) : '')));
    if (S.temp.on) {
      H.push(row(Lx('حالة الطقس خارج المسجد', 'Weather outside'), tg('temp.weather'), Lx('أيقونة الحالة (مشمس، غائم، ممطر…) من الإنترنت لموقع المسجد', 'Condition icon from the internet for the mosque location')));
      H.push(row(Lx('درجة الحرارة داخل المسجد', 'Temperature inside'), sel('temp.inside.mode', [opt('off', 'لا تُعرض', 'Hidden'), opt('manual', 'إدخال يدوي', 'Typed by hand'), opt('url', 'حساس على الشبكة (رابط)', 'Network sensor (URL)'), opt('sensor', 'حساس موصول بالجهاز (APK)', 'Sensor on the device (APK)')])));
      if (TI.mode === 'manual') H.push(row(Lx('القيمة', 'Value'), nm('temp.inside.value', -10, 60, 1, '°C'), Lx('مثلًا درجة ضبط المكيّف', 'e.g. the air-conditioner setting')));
      if (TI.mode === 'url') {
        H.push(row(Lx('رابط الحساس', 'Sensor URL'), tx('temp.inside.url', 'http://192.168.1.60/temperature', 1), Lx('يعيد رقمًا أو JSON (مثل Home Assistant أو Tasmota أو ESP)', 'Returns a number or JSON (Home Assistant, Tasmota, ESP…)')));
        H.push(row(Lx('مسار القيمة في JSON', 'JSON path'), tx('temp.inside.path', 'StatusSNS.DS18B20.Temperature')));
      }
    }
  }
  if (c === 'device') {
    H.push(sect(Lx('التشغيل والإضاءة', 'Start-up & screen')));
    H.push(row(Lx('التشغيل عند بدء تشغيل الشاشة', 'Start with the device'), tg('device.autoStart'), Lx('يفتح التطبيق تلقائيًا عند تشغيل الشاشة أو جهاز التلفزيون (نسخة APK)', 'Opens by itself when the TV / box powers on (APK)')));
    H.push(row(Lx('إبقاء الشاشة مضاءة', 'Keep the screen on'), tg('device.keepOn'), Lx('لا تنطفئ الشاشة ولا تدخل وضع السكون طالما التطبيق يعمل', 'The screen never sleeps while the app runs')));
    H.push(sect(Lx('الأمان', 'Security')));
    H.push(row(Lx('قفل الإعدادات برمز', 'Lock settings with a PIN'), `<input class="f" type="password" inputmode="numeric" id="pinNew" data-fid="pinNew" maxlength="12" placeholder="${Lx('4 أرقام أو أكثر', '4+ digits')}"> ${btn('setPin', S.lock.hash ? Lx('تغيير الرمز', 'Change PIN') : Lx('حفظ الرمز', 'Save PIN'))}${S.lock.hash ? btn('clearPin', Lx('إزالة القفل', 'Remove lock'), '', 'ghost') : ''}`, S.lock.hash ? Lx('🔒 الإعدادات على الشاشة مقفلة — تُفتح بالرمز، ويمكن إزالته من لوحة التحكم', '🔒 Locked on the screen — open with the PIN; removable from the dashboard') : Lx('يمنع أي شخص من تغيير الإعدادات من الريموت', 'Stops anyone changing settings from the remote')));
    H.push(row(Lx('التعليمات في الإعدادات', 'Instructions in settings'), tg('ui.tips')));
  }
  if (c === 'device' && !IS_DASH) {
    H.push(sect(Lx('صلاحيات التطبيق', 'App permissions')));
    const pm = permState(), ok = Lx('✅ مسموح', '✅ Allowed'), no = Lx('⛔ غير مسموح', '⛔ Not allowed');
    if (Native && Native.getPermissions) {
      H.push(row(Lx('الموقع', 'Location'), `<em>${pm.location ? ok : no}</em> ${pm.location ? '' : btn('perm', Lx('السماح', 'Allow'), 'location')} ${btn('sys', Lx('إعدادات الموقع في الجهاز', 'Device location settings'), 'location', 'ghost')}`, Lx('لتحديد موقع المسجد تلقائيًا وحساب المواقيت', 'To find the mosque location and calculate the times')));
      H.push(row(Lx('الميكروفون', 'Microphone'), `<em>${pm.mic ? ok : no}</em> ${pm.mic ? '' : btn('perm', Lx('السماح', 'Allow'), 'mic')}`, Lx('اختياري: لبدء أذكار بعد الصلاة عند انتهاء صوت الإمام', 'Optional: start the adhkar when the imam finishes')));
      if (pm.overlay !== undefined) H.push(row(Lx('العرض فوق التطبيقات', 'Display over other apps'), `<em>${pm.overlay ? ok : no}</em> ${pm.overlay ? '' : btn('perm', Lx('السماح', 'Allow'), 'overlay')}`, Lx('يلزم في أندرويد 10 فأحدث ليفتح التطبيق وحده عند تشغيل الجهاز', 'Needed on Android 10+ to open by itself at power-on')));
      H.push(row(Lx('الصور والأصوات', 'Pictures & sounds'), `<em>${pm.media ? ok : no}</em> ${pm.media ? '' : btn('perm', Lx('السماح', 'Allow'), 'media')}`, Lx('لاختيار صور المعرض والخلفيات وملفات الأذان من الجهاز أو فلاشة USB', 'To pick gallery pictures, backgrounds and adhan files from the device or a USB stick')));
    }
    const tz = (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || '';
    H.push(row(Lx('التاريخ والوقت', 'Date & time'), `<em class="num" dir="ltr">${esc(new Date().toLocaleString(S.lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB'))} · ${esc(tz)}</em> ${Native && Native.openSystem ? btn('sys', Lx('ضبط تاريخ ووقت الجهاز', 'Set device date & time'), 'datetime') : ''}`, Lx('التطبيق يأخذ الوقت والتاريخ والمنطقة الزمنية من الجهاز. فعّل «التاريخ والوقت التلقائي» في الجهاز ليبقى دقيقًا', 'The app takes the time, date and time zone from the device. Turn on automatic date & time on the device to keep it exact')));
    if (Native && Native.openSystem) H.push(row(Lx('كل الصلاحيات', 'All permissions'), btn('sys', Lx('فتح صفحة التطبيق في إعدادات الجهاز', 'Open the app page in device settings'), 'app', 'ghost')));
    H.push(sect(Lx('النسخ الاحتياطي والاستعادة', 'Backup & restore')));
    H.push(row(Lx('تصدير الإعدادات', 'Export settings'), `${btn('export', Lx('⬇ الإعدادات فقط', '⬇ Settings only'), '0')}${btn('export', Lx('⬇ مع الصور والأصوات', '⬇ With media'), '1')}`));
    H.push(row(Lx('استعادة من ملف', 'Restore from file'), btn('pick', Lx('⬆ اختيار ملف النسخة…', '⬆ Choose backup…'), 'backup|.json,application/json')));
    H.push(sect(Lx('المزامنة', 'Sync')));
    H.push(row(Lx('رابط ملف الإعدادات', 'Settings file URL'), tx('sync.url', 'https://…/hayya-settings.json', 1), Lx('ارفع ملف التصدير إلى موقعك، وستجلب كل الشاشات آخر نسخة تلقائيًا', 'Host the exported file; every screen pulls the newest version')));
    H.push(row(Lx('فحص كل', 'Check every'), `${nm('sync.everyMin', 5, 1440, 5, minU())} ${btn('syncNow', Lx('🔄 مزامنة الآن', '🔄 Sync now'))}`));
    H.push(sect(Lx('أدوات الدعم عن بعد', 'Remote support')));
    H.push(row('TeamViewer / AnyDesk', `${btn('app', 'TeamViewer QuickSupport', 'com.teamviewer.quicksupport.market')}${btn('app', 'AnyDesk', 'com.anydesk.anydeskandroid')}`, Lx('تثبيت أو فتح أداة الدعم بضغطة', 'Install or open with one click')));
    H.push(sect(Lx('الجهاز', 'Device')));

    H.push(row(Lx('التحديث', 'Update'), `${btn('update', Lx('🔎 التحقق من وجود تحديث', '🔎 Check for update'))}<em>${Lx('الإصدار', 'Version')} ${APP_VERSION}${Native && Native.getVersion ? ' / APK ' + Native.getVersion() : ''}</em>`));
    if (Native && Native.setStartUrl) H.push(row(Lx('مصدر التطبيق', 'App source'), `${tx('update.url', Lx('اتركه فارغًا لاستخدام النسخة المضمّنة', 'Empty = bundled copy'), 1)} ${btn('startUrl', Lx('تطبيق', 'Apply'))}`, Lx('رابط موقعك ليعرض الجهاز آخر نسخة دائمًا', 'Your site URL to always load the latest version')));
    H.push(row(Lx('إعادة التشغيل', 'Restart'), btn('restart', Lx('↻ إعادة تشغيل التطبيق', '↻ Restart app'))));
    H.push(row(Lx('إعادة الضبط', 'Reset'), btn('reset', Lx('⚠ إعادة ضبط المصنع', '⚠ Factory reset'), '', 'danger')));
  }
  if (c === 'gen') {
    H.push(row(Lx('لغة عرض التطبيق', 'Display language'), sel('lang', [['ar', 'العربية'], ['en', 'English']])));
    H.push(row(Lx('اتجاه الشاشة', 'Orientation'), sel('orientation', [opt('auto', 'تلقائي', 'Auto'), opt('landscape', 'أفقي', 'Landscape'), opt('portrait', 'عمودي', 'Portrait'), opt('portrait-rev', 'عمودي معكوس', 'Portrait (reversed)')])));
    H.push(row(Lx('تنسيق أرقام الوقت', 'Digits'), sel('digits', [['latn', '0123456789'], ['arab', '٠١٢٣٤٥٦٧٨٩']])));
    H.push(row(Lx('نظام الساعة', 'Clock'), sel('hour12', [['true', Lx('12 ساعة', '12-hour')], ['false', Lx('24 ساعة', '24-hour')]])));
    H.push(row(Lx('تنسيق إشارة الوقت', 'AM/PM label'), sel('ampm', [['ar', 'ص - م'], ['en', 'AM - PM']])));
    H.push(row(Lx('طريقة عرض التاريخ', 'Date'), sel('dateMode', [opt('hijri', 'هجري', 'Hijri'), opt('greg', 'ميلادي', 'Gregorian'), opt('both', 'كلاهما', 'Both')])));
    H.push(sect(Lx('مقاس العرض على الشاشة', 'Screen fit')));
    H.push(row(Lx('ملء الشاشة', 'Fill'), sel('screen.fit', [opt('fit', 'ملاءمة مع الحفاظ على التناسب', 'Fit, keep proportions'), opt('fill', 'ملء الشاشة كاملة (يمدّ العرض قليلًا)', 'Fill the whole screen (stretches a little)')]), Lx('«ملء الشاشة» يناسب الجوالات والشاشات ذات المقاسات غير المعتادة', '“Fill” suits phones and unusual screen sizes')));
    H.push(row(Lx('حجم العرض', 'Display size'), `<input class="f" type="range" min="70" max="120" step="1" data-k="screen.zoom" data-fid="screen.zoom" data-num="1" value="${val('screen.zoom')}"><em class="num">${num(val('screen.zoom'))}%</em> ${btn('resetScreen', Lx('↺ الافتراضي', '↺ Default'))}`, Lx('صغّره إذا كانت أطراف العرض مقصوصة على التلفزيون', 'Shrink it if the TV cuts off the edges')));
    H.push(row(Lx('هامش الحواف', 'Edge margin'), `<input class="f" type="range" min="0" max="10" step="0.5" data-k="screen.margin" data-fid="screen.margin" data-num="1" value="${val('screen.margin')}"><em class="num">${num(val('screen.margin'))}%</em>`, Lx('مسافة فارغة حول العرض لبعض التلفزيونات التي تقص الأطراف', 'Empty space around the display for TVs that crop the edges')));
    H.push(sect(Lx('التاريخ', 'Date')));
    H.push(row(Lx('التاريخ في شاشة الأذكار', 'Date on adhkar screen'), tg('dateOnAzkar')));
    H.push(row(Lx('التاريخ في معرض الصور', 'Date on gallery'), tg('dateOnGallery')));
  }
  if (c === 'preview') {
    H.push(note(Lx('اعرض أي شاشة لمدة 12 ثانية للتأكد من الشكل، ثم يعود العرض تلقائيًا.', 'Show any screen for 12 seconds, then it returns automatically.')));
    const pv = [['adhan', 'إعلان الأذان', 'Adhan'], ['countdown', 'عدّاد الإقامة', 'Iqamah countdown'], ['iqama', 'إعلان الإقامة', 'Iqamah'], ['prayer', 'شاشة الصلاة', 'Prayer (black)'], ['azkar', 'أذكار بعد الصلاة', 'Adhkar'], ['morning', 'أذكار الصباح', 'Morning'], ['khutbah', 'خطبة الجمعة', 'Khutbah'], ['taraweeh', 'التراويح', 'Taraweeh'], ['gallery', 'معرض الصور', 'Gallery'], ['saver', 'وضع السكون', 'Screensaver']];
    H.push(`<div class="chips">${pv.map(([k, a, e]) => btn('preview', Lx(a, e), k, 'chip')).join('')}</div>`);
  }
  return H.join('');
}
const sel2 = (it, f, opts) => `<select class="f" data-li="${f}">${opts.map(([v, l]) => `<option value="${v}" ${it[f] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
function listEditor(k, title, itemHTML, blank) {
  const arr = val(k) || [];
  return `${title ? sect(title) : ''}<div class="list" data-list="${k}">${arr.map((it, i) => `<div class="li" data-i="${i}">${itemHTML(it, i, arr.length)}${btn('delItem', '🗑', `${k}|${i}`, 'ghost')}</div>`).join('')}</div>${btn('addItem', Lx('➕ إضافة سطر جديد', '➕ Add a new line'), `${k}|${JSON.stringify(blank)}`)}`;
}

function permState() { try { return JSON.parse(Native && Native.getPermissions ? Native.getPermissions() : '{}') || {}; } catch (e) { return {}; } }
window.hayyaPermsChanged = () => { if (settingsOpen && curCat === 'device') rerender(); if (PermAsk.open) PermAsk.render(); };

/* ---------- asking for the app permissions: at every start while one is missing (until "don't ask again") ---------- */
const PermAsk = {
  open: false, sel: 0,
  list() {
    const pm = permState(), L = [];
    if (pm.location === false) L.push(['location', Lx('الموقع', 'Location'), Lx('لتحديد موقع المسجد وحساب المواقيت تلقائيًا', 'To find the mosque and calculate the times')]);
    if (pm.media === false) L.push(['media', Lx('الصور والأصوات', 'Pictures & sounds'), Lx('لاختيار صور المعرض والخلفيات وملفات الأذان من الجهاز أو فلاشة USB', 'To pick pictures and adhan files from the device or USB')]);
    if (pm.mic === false) L.push(['mic', Lx('الميكروفون', 'Microphone'), Lx('اختياري: لبدء أذكار بعد الصلاة عند انتهاء صوت الإمام', 'Optional: start the adhkar when the imam finishes')]);
    if (pm.overlay === false) L.push(['overlay', Lx('العرض فوق التطبيقات', 'Display over other apps'), Lx('ليفتح التطبيق وحده عند تشغيل التلفاز (أندرويد 10 فأحدث)', 'So the app opens by itself at power-on (Android 10+)')]);
    return L;
  },
  check() {
    if (typeof Native === 'undefined' || !Native || !Native.getPermissions || PREVIEW) return;
    try { if (localStorage.getItem('hayya_perm_ask') === 'never') return; } catch (e) { }
    if (!this.list().length) return;
    this.open = true; this.sel = 0; this.render();
  },
  render() {
    let el = $('#permAsk');
    const L = this.list();
    if (!L.length) { this.close(); toast(Lx('تم السماح بكل الصلاحيات ✓', 'All permissions allowed ✓')); return; }
    if (!el) { el = document.createElement('div'); el.id = 'permAsk'; $('#stage').appendChild(el); el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) this.act(b.dataset.a); }); }
    const runtime = L.filter(x => x[0] !== 'overlay').length;
    el.innerHTML = `<div class="pabox"><div class="pah">${Lx('تفعيل صلاحيات التطبيق', 'Allow the app permissions')}</div>
      <div class="pas">${Lx('هذه الصلاحيات تجعل الشاشة تعمل كاملة دون تدخّل. يمكنك تغييرها لاحقًا من «المزامنة والجهاز».', 'These let the screen run fully on its own. You can change them later under “Sync & device”.')}</div>
      <div class="pal">${L.map(([k, n, d]) => `<div class="pai"><div><b>${n}</b><span>${d}</span></div><button class="pab" data-a="${k}">${Lx('السماح', 'Allow')}</button></div>`).join('')}</div>
      <div class="paf">${runtime > 1 ? `<button class="pab main" data-a="all">${Lx('السماح بالكل', 'Allow all')}</button>` : ''}<button class="pab ghost" data-a="later">${Lx('لاحقًا', 'Later')}</button><button class="pab ghost" data-a="never">${Lx('لا تسألني مرة أخرى', 'Don’t ask again')}</button></div></div>`;
    el.className = 'on';
    const bs = $$('button', el); this.sel = Math.min(this.sel, bs.length - 1);
    const first = bs.findIndex(b => b.dataset.a === 'all'); if (!this._shown && first >= 0) this.sel = first; this._shown = true;
    bs.forEach((b, i) => b.classList.toggle('sel', i === this.sel)); bs[this.sel] && bs[this.sel].focus();
  },
  act(a) {
    if (a === 'later') return this.close();
    if (a === 'never') { try { localStorage.setItem('hayya_perm_ask', 'never'); } catch (e) { } return this.close(); }
    if (!Native || !Native.requestPermission) return;
    Native.requestPermission(a);
  },
  close() { this.open = false; this._shown = false; const el = $('#permAsk'); if (el) el.remove(); },
  key(e) {
    const bs = $$('#permAsk button'), k = e.key, code = e.keyCode;
    if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowLeft') {
      const fwd = k === 'ArrowDown' || k === (S.lang === 'ar' ? 'ArrowLeft' : 'ArrowRight');
      this.sel = (this.sel + (fwd ? 1 : -1) + bs.length) % bs.length;
      bs.forEach((b, i) => b.classList.toggle('sel', i === this.sel)); bs[this.sel].focus();
    } else if (k === 'Enter' || k === ' ' || code === 23 || code === 66) { bs[this.sel] && this.act(bs[this.sel].dataset.a); }
    else if (k === 'Escape' || k === 'GoBack' || k === 'BrowserBack' || code === 4) this.close();
    e.preventDefault(); e.stopPropagation();
  },
};

/* ---------- panel ---------- */
function buildSettings() {
  const el = document.createElement('div'); el.id = 'set'; el.className = 'hide';
  el.innerHTML = `<div class="sp"><aside><div class="brandx">حَيَّ <small>${Lx('شاشة المسجد', 'Masjid Display')}</small></div><nav></nav>
    <button class="f b close" data-act="close" data-fid="close">✕ ${Lx('إغلاق', 'Close')}</button></aside><main><h2></h2><div class="fields"></div></main></div><input type="file" id="filePick" hidden>`;
  document.body.appendChild(el);
  el.addEventListener('click', onClick); el.addEventListener('change', onChange); el.addEventListener('input', onInput);
  el.addEventListener('focusin', e => { const b = e.target.closest('nav .f'); if (b && b.dataset.cat !== curCat) showCat(b.dataset.cat, false); });
  $('#filePick').addEventListener('change', onFile);
}
function renderNav() { $('#set nav').innerHTML = CATS.map(([k, ic, ar, en]) => `<button class="f navb ${k === curCat ? 'on' : ''}" data-cat="${k}" data-fid="nav${k}"><span>${ic}</span>${Lx(ar, en)}</button>`).join(''); }
function showCat(c, focusContent) {
  curCat = c;
  $$('#set nav .navb').forEach(b => b.classList.toggle('on', b.dataset.cat === c));
  const cat = CATS.find(x => x[0] === c); $('#set main h2').textContent = Lx(cat[2], cat[3]);
  const f = $('#set .fields'); f.innerHTML = tipsHTML(c) + catHTML(c); f.scrollTop = 0;
  afterRender();
  if (focusContent) { const first = $('#set .fields .f'); if (first) first.focus(); }
}
function rerender() {
  const a = document.activeElement, fid = a && a.dataset ? a.dataset.fid : null, li = a && a.closest('.li'), sc = $('#set .fields').scrollTop;
  const liKey = li ? [li.parentElement.dataset.list, li.dataset.i, a.dataset.li || a.dataset.liToggle] : null;
  $('#set .fields').innerHTML = tipsHTML(curCat) + catHTML(curCat); $('#set .fields').scrollTop = sc;
  renderNav(); $('#set main h2').textContent = Lx(...CATS.find(x => x[0] === curCat).slice(2));
  afterRender();
  let t = fid ? $(`#set [data-fid="${CSS.escape(fid)}"]`) : null;
  if (!t && liKey) t = $(`#set [data-list="${liKey[0]}"] .li[data-i="${liKey[1]}"] [data-li="${liKey[2]}"], #set [data-list="${liKey[0]}"] .li[data-i="${liKey[1]}"] [data-li-toggle="${liKey[2]}"]`);
  if (t) t.focus({ preventScroll: true });
}
async function afterRender() {
  for (const th of $$('#set .thumb')) { const u = await DB.url(th.dataset.media); th.style.backgroundImage = u ? `url("${u}")` : ''; }
  const pv = $('#cdprev');
  if (pv) { pv.innerHTML = '<div></div>'; const w = makeCountdown(S.countdown.style, pv.firstChild); let r = 437; w.update(r, 600); clearInterval(pv._i); pv._i = setInterval(() => { if (!document.body.contains(pv)) return clearInterval(pv._i); r = r > 1 ? r - 1 : 600; w.update(r, 600); }, 1000); }
}
function openSettings() {
  if (needPin()) { showPin(); return; }
  settingsOpen = true; renderNav(); showCat(curCat, false);
  $('#set').classList.remove('hide'); $('#hint').classList.remove('show');
  setTimeout(() => { const b = $(`#set nav [data-cat="${curCat}"]`); if (b) b.focus(); }, 30);
}
function closeSettings() { if (editing) endEdit(true); settingsOpen = false; lastInput = Date.now(); $('#set').classList.add('hide'); document.activeElement && document.activeElement.blur(); }

/* two-press confirmation (works in WebView and sandboxed pages, unlike confirm()) */
const pending = {};
function confirmTwice(key, msg) {
  if (pending[key] && Date.now() - pending[key] < 5000) { delete pending[key]; return true; }
  pending[key] = Date.now(); toast(msg + ' — ' + Lx('اضغط مرة أخرى للتأكيد', 'press again to confirm'), 5000); return false;
}

/* ---------- change handling ---------- */
const REBUILD = /^(lang|orientation|design|font|name|ticker|galleries|gallery|countdown\.secColor)/;
function commit(k, v, re = true) {
  setPath(S, k, v); saveSettings();
  Hooks.changed(k);
  if (re) rerender();
}
function readVal(el) {
  if (el.dataset.num) { const n = parseFloat(el.value); return isNaN(n) ? 0 : n; }
  if (el.value === 'true') return true; if (el.value === 'false') return false;
  return el.value;
}
function onInput(e) {
  const el = e.target;
  if (el.type === 'range' && el.dataset.k) commit(el.dataset.k, readVal(el), false);
  if (el.dataset.li) { const li = el.closest('.li'), lk = li.parentElement.dataset.list; const arr = val(lk); arr[+li.dataset.i][el.dataset.li] = el.type === 'number' ? +el.value || 0 : el.value; saveSettings(); tickKey = ''; ovKey = ''; }
  if (el.dataset.k && el.type === 'text' && /^name\./.test(el.dataset.k)) { setPath(S, el.dataset.k, el.value); saveSettings(); Hooks.changed(el.dataset.k); }
}
function onChange(e) {
  const el = e.target;
  if (el.dataset.actChange === 'city') { const c = CITIES[+el.value]; if (c) { S.loc.city = c[0]; S.loc.lat = c[2]; S.loc.lng = c[3]; saveSettings(); rerender(); } return; }
  if (el.dataset.li) { const li = el.closest('.li'), lk = li.parentElement.dataset.list; val(lk)[+li.dataset.i][el.dataset.li] = el.type === 'number' ? +el.value || 0 : el.value; saveSettings(); tickKey = ''; ovKey = ''; if (lk === 'userTpls') { applyTheme(); themeKey = ''; } if (el.dataset.li === 'd' || el.dataset.li === 'mode') rerender(); return; }
  if (el.dataset.k && el.type !== 'range') {
    let v = readVal(el);
    if (el.type === 'number') { const mn = +el.min, mx = +el.max; if (!isNaN(mn)) v = Math.max(mn, v); if (!isNaN(mx)) v = Math.min(mx, v); }
    commit(el.dataset.k, v);
  } else if (el.type === 'range' && el.dataset.k) rerender();
}
const ACTS = {
  close: closeSettings,
  step(a) { const [k, st, mn, mx] = a.split('|'); const dec = (st.split('.')[1] || '').length; let v = +(+(val(k) || 0) + +st).toFixed(dec); v = Math.max(+mn, Math.min(+mx, v)); commit(k, v); },
  color(a) { const [k, c] = a.split('|'); commit(k, c); },
  cdStyle(a) { commit('countdown.style', a); },
  tpl(a) { commit('design.tpl', a); },
  pos(a) { S.name.dx = 0; S.name.dy = 0; commit('name.pos', a); },
  nudge(a) { if (a === 'r') { S.name.dx = 0; S.name.dy = 0; } else { const [x, y] = a.split('|').map(Number); S.name.dx += x; S.name.dy += y; } commit('name.dx', S.name.dx); },
  pick(a) { const [k, acc] = a.split('|'); const fp = $('#filePick'); fp.accept = acc; fp.multiple = false; fp.dataset.k = k; fp.value = ''; fp.click(); },
  acSet() { const v = (($('#acIn') || {}).value || '').trim(); if (v && !/^HAYYA-?[0-9A-Z]{4}-?[0-9A-Z]{4}-?[0-9A-Z]{4}$/i.test(v)) { toast(Lx('صيغة الكود: HAYYA-XXXX-XXXX-XXXX', 'Format: HAYYA-XXXX-XXXX-XXXX')); return; } Cloud.setCode(v); toast(Lx('جارٍ التفعيل…', 'Activating…')); },
  hideTips() { commit('ui.tips', false); },
  async setPin() { const v = ($('#pinNew') || {}).value || ''; if (!/^\d{4,12}$/.test(v)) { toast(Lx('الرمز من 4 إلى 12 رقمًا', 'PIN must be 4–12 digits')); return; } commit('lock.hash', await sha256hex(v)); unlockedUntil = Date.now() + 10 * MIN; toast(Lx('تم حفظ رمز القفل', 'PIN saved')); },
  clearPin() { if (!confirmTwice('pin', Lx('إزالة قفل الإعدادات', 'Remove the lock'))) return; commit('lock.hash', ''); },
  async citySearch() { const q = (($('#cityQ') || {}).value || '').trim(); if (q.length < 2) { toast(Lx('اكتب اسم المدينة', 'Type a city name')); return; } citySearchQ = q; toast(Lx('جارٍ البحث…', 'Searching…'), 1500); try { citySearchRes = await searchCities(q); } catch (e) { citySearchRes = []; toast(Lx('تعذّر البحث — تأكد من الاتصال بالإنترنت', 'Search failed — check the internet')); } rerender(); },
  cityPick(i) { const c = citySearchRes && citySearchRes[+i]; if (!c) return; S.loc.city = c.name; S.loc.lat = c.lat; S.loc.lng = c.lng; S.loc.elev = c.elev; S.loc.method = 'auto'; citySearchRes = null; saveSettings(); invalidate(); Hooks.changed('loc'); toast(Lx('تم اختيار ', 'Selected ') + c.name + (c.tz && c.tz !== (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone ? Lx(' — تنبيه: المنطقة الزمنية للمدينة ', ' — note: city time zone ') + c.tz + Lx(' تختلف عن الجهاز', ' differs from the device') : ''), 6000); rerender(); },
  azkarNow() { if (IS_DASH) { DASH.command && DASH.command('azkarNow'); return; } if (startAzkarNow('settings')) { ovKey = ''; closeSettings(); } else toast(Lx('يعمل فقط أثناء الصلاة أو بعدها مباشرة', 'Only during or right after a prayer')); },
  micTest() { Mic.test = !Mic.test; if (!Mic.test) Mic.stop(); rerender(); },
  relayTest(a) { Relay.call(a === 'on' ? S.sound.relay.onUrl : S.sound.relay.offUrl); toast(Lx('تم الإرسال', 'Sent')); },
  addAzImgs(set) { const fp = $('#filePick'); fp.accept = 'image/*'; fp.multiple = true; fp.dataset.k = 'azimg|' + set; fp.value = ''; fp.click(); },
  async delAzImg(a) { const [set, ii] = a.split('|'); const L = S.azkarView.imgs[set] || []; const id = L[+ii]; L.splice(+ii, 1); if (id) await Hooks.dropMedia(id); commit('azkarView.imgs', S.azkarView.imgs); },
  addImgs(gi) { const fp = $('#filePick'); fp.accept = 'image/*'; fp.multiple = true; fp.dataset.k = 'gallery|' + gi; fp.value = ''; fp.click(); },
  async clearMedia(k) { const id = val(k); if (id) await Hooks.dropMedia(id); commit(k, ''); },
  async delImg(a) { const [gi, ii] = a.split('|').map(Number); const id = S.galleries[gi].imgs[ii]; S.galleries[gi].imgs.splice(ii, 1); await Hooks.dropMedia(id); commit('galleries', S.galleries); },
  addGallery() { S.galleries.push({ id: uid(), name: Lx('معرض ', 'Gallery ') + (S.galleries.length + 1), on: true, imgs: [] }); commit('galleries', S.galleries); },
  delGallery(gi) { if (!confirmTwice('g' + gi, Lx('حذف هذا المعرض', 'Delete this gallery'))) return; const g = S.galleries.splice(+gi, 1)[0]; g.imgs.forEach(id => Hooks.dropMedia(id)); commit('galleries', S.galleries); },
  // adds an empty line at the end of the list, scrolls to it and puts the cursor in its text
  addItem(a) {
    const i = a.indexOf('|'); const k = a.slice(0, i), blank = JSON.parse(a.slice(i + 1));
    if (k === 'funerals') blank.start = new Date().toISOString();
    if (k === 'userTpls') Object.assign(blank, userTplBlank(), { id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) });
    if (!Array.isArray(val(k))) setPath(S, k, []);
    val(k).push(blank); commit(k, val(k));
    const go = () => { const l = $$(`#set [data-list="${k}"] .li`).pop(); const inp = l && ($('textarea[data-li]', l) || $('input[data-li="t"],input[data-li="name"],input[data-li="title"]', l) || $('input,select', l)); if (inp) { inp.focus(); keepVisible(inp); if (!IS_DASH && typeof startEdit === 'function' && Date.now() - lastPointer < 1500) startEdit(inp); } };
    setTimeout(go, 40); setTimeout(go, 250);
  },
  azTab(k) { azkarTab = k; rerender(); },
  occTab(k) { occTab = k; rerender(); },
  restoreOcc(id) { const o = OCCASIONS.find(x => x.id === id); if (!o || !confirmTwice('ro' + id, Lx('ستُستعاد النصوص الأصلية لهذه المناسبة (تبقى نصوصك المضافة)', 'The original texts come back (your own lines stay)'))) return; const L = (occConf(id).list || []).filter(y => y && !/^o\d+$/.test(y.id || '')); commit('occ.items.' + id + '.list', o.items.map((y, i) => ({ id: 'o' + i, t: y.t, s: y.s, on: true })).concat(L)); },
  libTog(a) {
    const [k, i] = a.split('|'), cat = IB_CATS.find(x => x.k === k); if (!cat) return;
    const st = (S.lib.st[k] || '').padEnd(cat.items.length, '-').split('');
    st[+i] = libItemOn(k, +i) ? '0' : '1';
    S.lib.st[k] = st.join(''); commit('lib.st', S.lib.st);
  },
  libReset(k) { delete S.lib.st[k]; commit('lib.st', S.lib.st); },
  resetScale(k) { commit(k, 100); },
  moveItem(a) { const [k, i, d] = a.split('|'); const arr = val(k), j = +i + +d; if (j < 0 || j >= arr.length) return; const x = arr.splice(+i, 1)[0]; arr.splice(j, 0, x); commit(k, arr); },
  restoreAzkar(tab) { if (!confirmTwice('rz' + tab, Lx('ستُستبدل نصوص هذا القسم بالنصوص الأصلية', 'This section will be replaced with the original texts'))) return; if (tab === 'hadith') commit('hadiths', defaultHadiths()); else commit('azkar.' + tab, defaultAzkar()[tab]); },
  delItem(a) { const [k, i] = a.split('|'); val(k).splice(+i, 1); commit(k, val(k)); },
  ready(i) { S.ticker.items.push({ t: READY_TEXTS[+i], on: true }); commit('ticker.items', S.ticker.items); toast(Lx('أضيف إلى شريط الأخبار', 'Added to the ticker')); },
  funeral() {
    const n = $('#fnName').value.trim(), p = $('#fnPrayer').value; if (!n) return toast(Lx('اكتب الاسم أولًا', 'Enter a name first'));
    const text = S.lang === 'ar' ? `سيُقام بإذن الله الصلاة على ${n} بعد صلاة ${PN(p)} مباشرة` : `Funeral prayer for ${n} will be held right after ${PN(p)}`;
    const end = new Date(); end.setHours(23, 59, 0, 0); S.notices.push({ type: 'funeral', text, until: end.toISOString() }); commit('notices', S.notices);
  },
  delNotice(i) { S.notices.splice(+i, 1); commit('notices', S.notices); },
  clearCal() { S.calendar = {}; commit('calendar', {}); },
  gps() {
    if (!navigator.geolocation) return toast(Lx('تحديد الموقع غير مدعوم في هذا الجهاز', 'Geolocation not supported'));
    toast(Lx('جارٍ تحديد الموقع…', 'Locating…'));
    navigator.geolocation.getCurrentPosition(p => { S.loc.lat = +p.coords.latitude.toFixed(4); S.loc.lng = +p.coords.longitude.toFixed(4); S.loc.city = Lx('موقعي', 'My location'); saveSettings(); rerender(); toast(Lx('تم تحديد الموقع', 'Location updated')); },
      err => toast(Lx('تعذّر تحديد الموقع: ', 'Location failed: ') + err.message), { enableHighAccuracy: true, timeout: 20000 });
  },
  testAdhan(k) { Sound.unlock(); playAdhan(null, k); },
  testSound(w) { Sound.unlock(); Sound.play(S.sound[w], w === 'adhan' ? S.sound.adhan.media : S.sound.iqama.media); },
  stopSound() { Sound.stop(); },
  export(m) { exportBackup(m === '1'); },
  syncNow() { syncFromUrl(true); },
  app(pkg) { if (Native && Native.openApp) Native.openApp(pkg); else window.open('https://play.google.com/store/apps/details?id=' + pkg, '_blank'); },
  update() { if (Native && Native.checkUpdate) Native.checkUpdate(); else { toast(Lx('جارٍ تحميل آخر نسخة…', 'Reloading latest version…')); setTimeout(() => location.reload(), 800); } },
  startUrl() { Native.setStartUrl((S.update.url || '').trim()); },
  restart() { if (Native && Native.restart) Native.restart(); else location.reload(); },
  async reset() {
    if (!confirmTwice('reset', Lx('سيتم حذف جميع الإعدادات والصور', 'All settings and media will be deleted'))) return;
    localStorage.removeItem(LS_KEY); for (const k of await DB.keys().catch(() => [])) await DB.del(k).catch(() => { }); location.reload();
  },
  preview(k) { if (IS_DASH) return DASH.preview(k); forced = { k, until: Date.now() + 12000 }; closeSettings(); lastInput = 0; },
  cloudSync() { Cloud.sync(true); },
  perm(k) { if (Native && Native.requestPermission) Native.requestPermission(k); },
  sys(k) { if (Native && Native.openSystem) Native.openSystem(k); },
  resetScreen() { commit('screen', { fit: 'fit', zoom: 100, margin: 0 }); },
  cloudForget() { if (!confirmTwice('forget', Lx('ستُفصل الشاشة عن حسابها ويُنشأ رقم جديد', 'The screen will be unlinked and get a new key'))) return; Cloud.forget(); },
  cloudServer() { Cloud.setServer($('#cloudServer').value); setTimeout(rerender, 300); },
  showPair() { closeSettings(); showPair(true, 60000); },
  remote(cmd) { DASH.command(cmd); },
};
function onClick(e) {
  const nb = e.target.closest('.navb'); if (nb) { showCat(nb.dataset.cat, true); return; }
  const tgb = e.target.closest('[data-type="toggle"]'); if (tgb) { commit(tgb.dataset.k, !val(tgb.dataset.k)); return; }
  const lt = e.target.closest('[data-li-toggle]'); if (lt) { const li = lt.closest('.li'), lk = li.parentElement.dataset.list, it = val(lk)[+li.dataset.i]; it[lt.dataset.liToggle] = it[lt.dataset.liToggle] === false; commit(lk, val(lk)); return; }
  const a = e.target.closest('[data-act]'); if (a && ACTS[a.dataset.act]) ACTS[a.dataset.act](a.dataset.arg);
}
async function onFile(e) {
  const fp = e.target, k = fp.dataset.k, files = [...fp.files]; if (!files.length) return;
  try {
    if (k === 'backup') { await importBackup(files[0]); toast(Lx('تمت الاستعادة', 'Restored')); rerender(); return; }
    if (k === 'calendar') { const n = importCalendarCSV(await files[0].text()); toast(Lx(`تم استيراد ${n} يوم`, `Imported ${n} days`)); rerender(); return; }
    if (k.startsWith('azimg|')) {
      const set = k.split('|')[1], AV = S.azkarView; AV.imgs = AV.imgs || {}; AV.imgs[set] = AV.imgs[set] || [];
      toast(Lx('جارٍ رفع الصور…', 'Uploading images…'));
      for (const f of files) AV.imgs[set].push(await Hooks.storeMedia(await shrinkImage(f), 'image'));
      commit('azkarView.imgs', AV.imgs); return;
    }
    if (k.startsWith('gallery|')) {
      const gi = +k.split('|')[1];
      toast(Lx('جارٍ رفع الصور…', 'Uploading images…'));
      for (const f of files) S.galleries[gi].imgs.push(await Hooks.storeMedia(await shrinkImage(f), 'image'));
      commit('galleries', S.galleries); return;
    }
    const old = val(k), audio = k.startsWith('sound');
    const id = await Hooks.storeMedia(audio ? files[0] : await shrinkImage(files[0]), audio ? 'audio' : 'image');
    if (old) Hooks.dropMedia(old);
    commit(k, id);
  } catch (err) { toast(Lx('تعذّر حفظ الملف: ', 'Could not save: ') + err.message); }
}
/* keep images ≤ 1920 on the long side to save device storage */
function shrinkImage(file) {
  return new Promise(res => {
    if (!/^image\/(jpeg|png|webp)/.test(file.type)) return res(file);
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const mx = 1920, sc = Math.min(1, mx / Math.max(img.width, img.height));
      if (sc === 1 && file.size < 1.5e6) { URL.revokeObjectURL(u); return res(file); }
      const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      c.toBlob(b => res(b || file), 'image/jpeg', 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(u); res(file); }; img.src = u;
  });
}

/* ---------- remote / D-pad navigation ----------
   Two zones: the side menu (categories) and the fields of the open category.
   Arrows never jump from one zone to the other: OK on a category enters its fields,
   Back from the fields returns to the category, Back on the side menu closes settings. */
function focusables(zone) {
  const sel = zone === 'nav' ? '#set nav .f' : zone === 'fields' ? '#set main .f' : '#set .f';
  return $$(sel).filter(el => el.offsetParent !== null && !el.disabled);
}
const zoneOf = el => !el ? null : el.closest('#set nav') ? 'nav' : el.closest('#set main') ? 'fields' : el.closest('#set aside') ? 'aside' : null;
const navHorizontal = () => { const n = $('#set nav'); return n && getComputedStyle(n).display === 'flex'; };
function smoothInto(el, center) {
  try { el.scrollIntoView({ block: center ? 'center' : 'nearest', inline: 'nearest', behavior: 'smooth' }); } catch (e) { el.scrollIntoView(false); }
}
function moveFocus(dir) {
  const cur = document.activeElement, zone = zoneOf(cur);
  if (!zone) { const b = $(`#set nav [data-cat="${curCat}"]`) || focusables('nav')[0]; if (b) b.focus(); return; }
  if (zone === 'nav' || zone === 'aside') {
    // side menu: a single list — previous / next only, it stops at the first and the last item
    const list = focusables('nav').concat(focusables('aside').filter(x => !x.closest('nav')));
    const horiz = navHorizontal(), rtl = document.documentElement.dir === 'rtl';
    const prevKey = horiz ? (rtl ? 'right' : 'left') : 'up', nextKey = horiz ? (rtl ? 'left' : 'right') : 'down';
    if (dir !== prevKey && dir !== nextKey) return;
    const i = list.indexOf(cur), j = dir === nextKey ? Math.min(list.length - 1, i + 1) : Math.max(0, i - 1);
    if (list[j] && list[j] !== cur) { list[j].focus({ preventScroll: true }); smoothInto(list[j]); }
    return;
  }
  // fields: spatial movement restricted to the fields; up/down never leave the list
  const all = focusables('fields');
  const r = cur.getBoundingClientRect(); let best = null, bs = Infinity;
  for (const el of all) {
    if (el === cur) continue; const q = el.getBoundingClientRect();
    let prim, sec;
    const ox = Math.max(0, Math.max(r.left, q.left) - Math.min(r.right, q.right)), oy = Math.max(0, Math.max(r.top, q.top) - Math.min(r.bottom, q.bottom));
    if (dir === 'down') { if (q.top < r.bottom - 4) continue; prim = q.top - r.bottom; sec = ox; }
    else if (dir === 'up') { if (q.bottom > r.top + 4) continue; prim = r.top - q.bottom; sec = ox; }
    else if (dir === 'right') { if (q.left < r.right - 4 || oy > 6) continue; prim = q.left - r.right; sec = oy * 4; }
    else { if (q.right > r.left + 4 || oy > 6) continue; prim = r.left - q.right; sec = oy * 4; }
    const sc = prim + sec * 2; if (sc < bs) { bs = sc; best = el; }
  }
  if (best) { best.focus({ preventScroll: true }); smoothInto(best, dir === 'up' || dir === 'down'); }
  else if (dir === 'up') { const f = $('#set .fields'); if (f) f.scrollTo({ top: 0, behavior: 'smooth' }); }
}
function enterFields() {
  const first = focusables('fields')[0];
  if (first) { first.focus({ preventScroll: true }); $('#set .fields').scrollTo({ top: 0, behavior: 'smooth' }); }
}
function backToNav() {
  const b = $(`#set nav [data-cat="${curCat}"]`);
  if (b) { b.focus({ preventScroll: true }); smoothInto(b); }
}

/* ---------- typing: the field is emptied for new text and kept above the on-screen keyboard ---------- */
let editing = null;
const isTextual = el => el && ((el.tagName === 'INPUT' && /^(text|search|url|email|tel|number)$/.test(el.type)) || el.tagName === 'TEXTAREA');
function startEdit(el) {
  if (editing && editing !== el) endEdit(true);
  editing = el; el.classList.add('editing');
  el._orig = el.value; el._typed = false;
  // one-line fields are emptied for the new text (the old text comes back if nothing is typed);
  // long texts (adhkar) are fully selected instead, so typing replaces them but a small fix is still possible
  if (el.tagName === 'INPUT' && el.type !== 'number') el.value = '';
  else { try { el.select(); } catch (e) { } }
  if (document.activeElement !== el) el.focus({ preventScroll: true });
  keepVisible(el);
}
function endEdit(commitIt) {
  const el = editing; if (!el) return;
  editing = null; el.classList.remove('editing');
  if (!el._typed || !commitIt) { el.value = el._orig != null ? el._orig : el.value; }
  else el.dispatchEvent(new Event('change', { bubbles: true }));
}
function keepVisible(el) {
  // scroll the field into the middle of the area left free by the keyboard
  const go = () => smoothInto(el, true);
  go(); setTimeout(go, 350); setTimeout(go, 800);
}
/* the Android app reports the on-screen keyboard height (CSS px) */
window.hayyaKeyboard = (h) => {
  const kb = Math.max(0, +h || 0);
  document.documentElement.style.setProperty('--kb', kb + 'px');
  document.body.classList.toggle('kb-open', kb > 0);
  if (kb > 0 && document.activeElement && isTextual(document.activeElement)) keepVisible(document.activeElement);
};
document.addEventListener('input', e => { if (e.target === editing) editing._typed = true; }, true);
document.addEventListener('focusin', e => {
  const el = e.target;
  // touch screens (phones): tapping a field starts typing straight away
  if (settingsOpen && isTextual(el) && lastPointer && Date.now() - lastPointer < 800 && editing !== el) startEdit(el);
}, true);
document.addEventListener('focusout', e => { if (e.target === editing) setTimeout(() => { if (document.activeElement !== e.target) endEdit(true); }, 50); }, true);
let lastPointer = 0;
document.addEventListener('pointerdown', () => { lastPointer = Date.now(); }, true);

function onKey(e) {
  lastInput = Date.now(); Sound.unlock();
  if (PermAsk.open) return PermAsk.key(e);
  const k = e.key, code = e.keyCode;
  if (forced && k !== 'Unidentified') { forced = null; }
  const isBack = k === 'Escape' || k === 'GoBack' || k === 'BrowserBack' || code === 4 || code === 10009 || code === 461;
  const isMenu = k === 'ContextMenu' || code === 82 || k === 'F1' || k === 'm';
  // the first key while the automatic gallery is showing only closes it
  if (!settingsOpen && galAutoOn && !isBack) { e.preventDefault(); galAutoOn = false; frame(); return; }
  if (!settingsOpen && pairVisible()) {
    if (k === 'Enter' || isBack || code === 23) { e.preventDefault(); hidePair(true); return; }
    if (isMenu) { e.preventDefault(); hidePair(true); curCat = 'cloud'; openSettings(); return; }
  }
  if (!settingsOpen && pinVisible()) {
    if (k === 'Enter' || code === 23) { e.preventDefault(); checkPin(); return; }
    if (isBack) { e.preventDefault(); hidePin(); return; }
    return;
  }
  if (!settingsOpen) {
    // manual / microphone mode: OK during the prayer starts the after-prayer adhkar
    if ((k === 'Enter' || code === 23) && S.azkarAfter.mode !== 'auto' && !forced) {
      const ph = phaseAt(now());
      if ((ph.ph === 'prayer' || ph.ph === 'iqama') && startAzkarNow('remote')) { e.preventDefault(); ovKey = ''; frame(); return; }
    }
    if (k === 'Enter' || isMenu || code === 23) { e.preventDefault(); openSettings(); return; }
    if (/^Arrow/.test(k)) { const h = $('#hint'); h.textContent = T('openSettings'); h.classList.add('show'); clearTimeout(h._t); h._t = setTimeout(() => h.classList.remove('show'), 2500); }
    return;
  }
  const el = document.activeElement, zone = zoneOf(el);
  if (isMenu) { e.preventDefault(); closeSettings(); return; }
  if (isBack) {
    e.preventDefault();
    if (editing) { endEdit(false); return; }               // cancel typing, keep the old text
    if (zone === 'fields') { backToNav(); return; }          // fields → side menu
    closeSettings(); return;                                 // side menu → close
  }
  const isOk = k === 'Enter' || code === 23;
  if (isOk && zone === 'nav') { e.preventDefault(); showCat(el.dataset.cat, false); setTimeout(enterFields, 30); return; }
  if (isOk && isTextual(el)) {
    e.preventDefault();
    if (editing === el) endEdit(true); else startEdit(el);
    return;
  }
  if (isOk && el && el.tagName === 'SELECT') { try { el.showPicker && el.showPicker(); } catch (er) { } return; }
  const dirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  if (dirs[k]) {
    // while typing, ◀ ▶ move the cursor inside the text; in a long text ▲ ▼ move between lines and leave at its ends
    if (editing === el && (k === 'ArrowLeft' || k === 'ArrowRight')) return;
    if (editing === el && el.tagName === 'TEXTAREA') {
      const atStart = el.selectionStart === 0 && el.selectionEnd === 0, atEnd = el.selectionStart >= el.value.length;
      if (!((k === 'ArrowUp' && atStart) || (k === 'ArrowDown' && atEnd))) return;
    }
    if (el && el.type === 'range' && (k === 'ArrowLeft' || k === 'ArrowRight')) return;
    e.preventDefault(); if (editing) endEdit(true);
    moveFocus(dirs[k]);
  }
}
window.hayyaBack = () => {
  if (pinVisible()) { hidePin(); return true; }
  if (pairVisible()) { hidePair(true); return true; }
  if (settingsOpen) {
    if (editing) endEdit(false);
    else if (zoneOf(document.activeElement) === 'fields') backToNav();
    else closeSettings();
    return true;
  }
  return false;
};
window.hayyaMenu = () => { settingsOpen ? closeSettings() : openSettings(); };
