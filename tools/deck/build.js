// Builds the Hayya decision deck in Arabic or English: node build.js ar|en
const pptxgen = require('pptxgenjs');
const React = require('react');
const RDS = require('react-dom/server');
const sharp = require('sharp');
const fa = require('react-icons/fa');
const path = require('path');
const { applyTheme } = require('/root/.claude/skills/synced/d0389ce4-be2d-4ca1-bf8f-719ebfa5784a_3308be24-b664-44e4-bedb-08e0fe49730c/pptx/scripts/apply_theme.js');

const LANG = process.argv[2] || 'ar', AR = LANG === 'ar';
const SH = f => path.join('/home/claude/deck/shots', f + '.jpg');
const S = n => SH(`${LANG}_${n}`);          // a TV screenshot in this language
const D = n => SH(n);                       // a dashboard screenshot (the dashboard is in Arabic)
const L = (a, e) => (AR ? a : e);

const THEME = {
  name: 'Hayya Emerald', headFontFace: 'Arial', bodyFontFace: 'Arial',
  colors: { dk1: '15241F', lt1: 'FFFFFF', dk2: '0B3B32', lt2: 'EEF4F1', accent1: 'C9A24B', accent2: '0F5E4C', accent3: '7FD1B9', accent4: '8C6B1F', accent5: '3E6B60', accent6: 'B3433A', hlink: '0F5E4C', folHlink: '3E6B60' },
};
const HEX = { dk: '0B3B32', dk2: '072A24', gold: 'C9A24B', green: '0F5E4C', mint: '7FD1B9', ink: '15241F', muted: '56675F', tint: 'EEF4F1', white: 'FFFFFF', bezel: '0E1513', red: 'B3433A' };

const pres = new pptxgen();
const _add = pres.addSlide.bind(pres), _secs = new Set();
pres.addSlide = o => { if (o && o.sectionTitle && !_secs.has(o.sectionTitle)) { pres.addSection({ title: o.sectionTitle }); _secs.add(o.sectionTitle); } return _add(o); };
pres.layout = 'LAYOUT_WIDE';            // 13.333 x 7.5 in
pres.rtlMode = AR;
pres.title = L('حَيَّ — شاشة المسجد: عرض لأصحاب القرار', 'Hayya — Masjid Screen: decision deck');
pres.author = 'Hayya';
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;
const W = 13.333, H = 7.5, M = 0.6;

// x mirrored for Arabic, so every layout reads from the right in the Arabic deck
const mx = (x, w) => (AR ? W - x - w : x);
const ALIGN = AR ? 'right' : 'left';
const T = extra => Object.assign({ isTextBox: true, rtlMode: AR, align: ALIGN, fontFace: 'Arial', margin: 0 }, extra);

// layouts
pres.defineSlideMaster({
  title: 'CONTENT', background: { color: HEX.white },
  objects: [{ placeholder: { options: { name: 'title', type: 'title', x: M, y: 0.42, w: W - 2 * M, h: 0.8, fontFace: 'Arial', fontSize: 30, bold: true, color: HEX.dk, align: ALIGN, valign: 'middle', margin: 0, rtlMode: AR }, text: '' } }],
  slideNumber: { x: AR ? 0.35 : W - 0.75, y: H - 0.45, w: 0.4, h: 0.3, fontFace: 'Arial', fontSize: 10, color: HEX.muted, align: 'center' },
});
pres.defineSlideMaster({ title: 'DARK', background: { color: HEX.dk } });

const icon = async (Comp, color, size = 256) => {
  const svg = RDS.renderToStaticMarkup(React.createElement(Comp, { color: '#' + color, size: String(size) }));
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  return 'image/png;base64,' + buf.toString('base64');
};

// a screenshot inside a dark TV bezel (the visual motif of the deck)
function screen(s, img, x, y, w, ratio, opt = {}) {
  const pad = opt.pad != null ? opt.pad : Math.max(0.05, w * 0.012);
  const h = w / ratio;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x - pad, y: y - pad, w: w + 2 * pad, h: h + 2 * pad, rectRadius: Math.min(0.12, pad * 2), fill: { color: HEX.bezel }, line: { color: opt.line || HEX.bezel, width: 0.75 }, shadow: { type: 'outer', color: '000000', blur: 8, offset: 3, angle: 90, opacity: 0.25 }, objectName: 'bezel' });
  s.addImage({ path: img, x, y, w, h, objectName: 'screenshot', altText: opt.alt || '' });
  return h + 2 * pad;
}
const cap = (s, text, x, y, w, extra = {}) => s.addText(text, T(Object.assign({ x, y, w, h: 0.32, fontSize: 11.5, color: HEX.muted, align: 'center' }, extra)));
function title(s, text) { s.addText(text, { placeholder: 'title' }); }
// numbered point: gold disc with the number, bold head, one line of explanation
function point(s, n, head, body, x, y, w, extra = {}) {
  const d = 0.42;
  s.addShape(pres.shapes.OVAL, { x: mx(x, d) + (AR ? 0 : 0), y: y + 0.02, w: d, h: d, fill: { color: extra.disc || HEX.gold }, line: { color: extra.disc || HEX.gold }, objectName: 'disc' });
  s.addText(String(n), T({ x: AR ? W - x - d : x, y: y + 0.02, w: d, h: d, fontSize: 14, bold: true, color: extra.discText || HEX.dk, align: 'center', valign: 'middle' }));
  const tx = x + d + 0.18, tw = w - d - 0.18;
  s.addText([
    { text: head, options: { bold: true, fontSize: extra.hs || 15, color: extra.hc || HEX.ink, breakLine: true, rtlMode: AR, align: ALIGN } },
    { text: body, options: { fontSize: extra.bs || 13, color: extra.bc || HEX.muted, rtlMode: AR, align: ALIGN } },
  ], T({ x: mx(tx, tw), y, w: tw, h: extra.h || 0.78, valign: 'top', paraSpaceAfter: 2 }));
}
function bullets(s, items, x, y, w, h, extra = {}) {
  s.addText(items.map((t, i) => ({ text: t, options: { bullet: { indent: 16 }, breakLine: i < items.length - 1, rtlMode: AR, align: ALIGN } })),
    T(Object.assign({ x: mx(x, w), y, w, h, fontSize: 14, color: HEX.ink, paraSpaceAfter: 8, valign: 'top' }, extra)));
}
function divider(title, sub, img, sect) {
  const s = pres.addSlide({ masterName: 'DARK', sectionTitle: sect });
  if (img) { s.addImage({ path: img, x: 0, y: 0, w: W, h: H, transparency: 82, objectName: 'backdrop' }); }
  s.addText(title, T({ x: M + 0.2, y: 2.7, w: W - 2 * M - 0.4, h: 1.0, fontSize: 40, bold: true, color: HEX.white }));
  s.addText(sub, T({ x: M + 0.2, y: 3.75, w: W - 2 * M - 0.4, h: 0.7, fontSize: 18, color: HEX.mint }));
  return s;
}

(async () => {
  const ICN = {
    tv: await icon(fa.FaTv, HEX.dk), web: await icon(fa.FaGlobe, HEX.dk), cloud: await icon(fa.FaCloud, HEX.dk), mob: await icon(fa.FaMobileAlt, HEX.dk),
    wifi: await icon(fa.FaWifi, HEX.dk), key: await icon(fa.FaKey, HEX.dk), shield: await icon(fa.FaShieldAlt, HEX.dk), lock: await icon(fa.FaLock, HEX.dk),
    power: await icon(fa.FaPowerOff, HEX.dk), save: await icon(fa.FaDatabase, HEX.dk), check: await icon(fa.FaCheck, HEX.white), clock: await icon(fa.FaRegClock, HEX.dk),
    arrowL: await icon(fa.FaExchangeAlt, HEX.gold), book: await icon(fa.FaBookOpen, HEX.dk),
  };
  const iconDisc = (s, img, x, y, d = 0.7, fill = HEX.tint) => {
    s.addShape(pres.shapes.OVAL, { x: mx(x, d), y, w: d, h: d, fill: { color: fill }, line: { color: fill }, objectName: 'icon disc' });
    s.addImage({ data: img, x: mx(x, d) + d * 0.25, y: y + d * 0.25, w: d * 0.5, h: d * 0.5, objectName: 'icon' });
  };

  /* 1 — title */
  let s = pres.addSlide({ masterName: 'DARK', sectionTitle: L('المقدمة', 'Introduction') });
  s.addText(L('حَيَّ', 'Hayya'), T({ x: mx(M + 0.1, 5.6), y: 1.35, w: 5.6, h: 1.1, fontSize: 60, bold: true, color: HEX.gold }));
  s.addText(L('شاشة المسجد الذكية', 'The smart masjid screen'), T({ x: mx(M + 0.1, 5.6), y: 2.45, w: 5.6, h: 0.7, fontSize: 28, bold: true, color: HEX.white }));
  s.addText(L('مواقيت الصلاة والإقامة والأذكار والمحتوى الدعوي على شاشة المسجد، تُضبط من الشاشة نفسها أو عن بُعد من لوحة تحكم.', 'Prayer times, iqamah, adhkar and da‘wah content on the masjid screen — set up on the TV itself or remotely from a dashboard.'),
    T({ x: mx(M + 0.1, 5.4), y: 3.3, w: 5.4, h: 1.3, fontSize: 16, color: 'D9E6E1', valign: 'top' }));
  s.addText(L('عرض تقديمي لأصحاب القرار · نوفمبر 2026 · النسخة التجريبية 1.0.11', 'Decision deck · November 2026 · test version 1.0.11'), T({ x: mx(M + 0.1, 5.6), y: 6.3, w: 5.6, h: 0.4, fontSize: 12, color: HEX.mint }));
  screen(s, S('main_L'), mx(6.75, 5.95), 1.6, 5.95, 16 / 9, { line: HEX.gold, alt: 'Main screen' });
  s.addNotes(L('هذا العرض يشرح ما يقدمه نظام «حَيَّ» للمسجد، وكيف يُدار، وما المطلوب لاعتماده. الصورة: الشاشة الرئيسية كما تظهر في المسجد.', 'This deck explains what Hayya gives a masjid, how it is managed, and what is needed to approve it. Picture: the main screen as shown in the masjid.'));

  /* 2 — at a glance */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('المقدمة', 'Introduction') });
  title(s, L('النظام في لمحة', 'At a glance'));
  s.addText(L('نظام واحد يعرض كل ما يحتاجه المصلّي في وقته، ويعمل وحده طوال اليوم دون تدخّل.', 'One system shows the congregation what they need at the right moment, and runs all day on its own.'),
    T({ x: M, y: 1.25, w: W - 2 * M, h: 0.5, fontSize: 16, color: HEX.muted }));
  const stats = [
    ['3', L('أجزاء: تطبيق التلفاز، رابط الويب، لوحة التحكم', 'parts: TV app, web link, dashboard')],
    ['34', L('تصميمًا إسلاميًا، منها تصاميم للصلوات ورمضان والعيدين', 'Islamic designs, incl. per-prayer, Ramadan and Eid')],
    ['291', L('ذكرًا ودعاءً بعددها وتخريجها', 'adhkar and duas with counts and sources')],
    ['15', L('مناسبة هجرية بـ 80 نصًا موثّقًا', 'Hijri occasions with 80 sourced texts')],
    ['17', L('قسمًا للإعدادات بالعربية والإنجليزية', 'settings sections, Arabic and English')],
    ['2', L('اتجاهان للشاشة: بالعرض وبالطول', 'orientations: landscape and portrait')],
  ];
  stats.forEach(([n, t], i) => {
    const col = i % 3, row = Math.floor(i / 3), cw = 3.75, gx = 0.3, x = M + col * (cw + gx), y = 2.05 + row * 2.4;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: mx(x, cw), y, w: cw, h: 2.05, rectRadius: 0.12, fill: { color: HEX.tint }, line: { color: HEX.tint }, objectName: 'stat card' });
    s.addText(n, T({ x: mx(x + 0.3, cw - 0.6), y: y + 0.2, w: cw - 0.6, h: 0.95, fontSize: 54, bold: true, color: HEX.green }));
    s.addText(t, T({ x: mx(x + 0.3, cw - 0.6), y: y + 1.15, w: cw - 0.6, h: 0.75, fontSize: 14, color: HEX.ink, valign: 'top' }));
  });
  s.addNotes(L('الأرقام من النسخة الحالية: 34 تصميمًا، و291 ذكرًا من islambook مع تخريج كل منها، و15 مناسبة هجرية بـ80 نصًا من القرآن والأحاديث الصحيحة والحسنة.', 'Figures from the current build: 34 designs, 291 adhkar from islambook with a source for each, and 15 Hijri occasions with 80 texts from the Quran and sahih / hasan hadith.'));

  /* 3 — components */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('المقدمة', 'Introduction') });
  title(s, L('مكوّنات النظام وكيف تترابط', 'How the parts fit together'));
  const boxes = [
    [ICN.tv, L('تطبيق التلفاز', 'TV app'), L('ملف APK لشاشات Android TV، يعمل عند تشغيل الجهاز ويبقي الشاشة مضاءة', 'APK for Android TV; starts with the device and keeps the screen on')],
    [ICN.web, L('رابط الويب', 'Web link'), L('ملف HTML واحد يعمل في أي متصفح أو شاشة ذكية دون تثبيت', 'A single HTML file that runs in any browser or smart TV, no install')],
    [ICN.cloud, L('الخادم', 'Server'), L('Cloudflare Workers وقاعدة D1: الحسابات، الربط، المزامنة، النسخ الاحتياطي', 'Cloudflare Workers + D1: accounts, linking, sync, backups')],
    [ICN.mob, L('لوحة التحكم', 'Dashboard'), L('من الجوال أو الحاسب: إدارة كل شاشات المسجد عن بُعد', 'From a phone or PC: manage every screen remotely')],
  ];
  const bw = 2.6, gap = (W - 2 * M - 4 * bw) / 3;
  boxes.forEach(([ic, h1, b1], i) => {
    const x = M + i * (bw + gap), y = 1.75;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: mx(x, bw), y, w: bw, h: 3.0, rectRadius: 0.14, fill: { color: i === 2 ? HEX.dk : HEX.tint }, line: { color: i === 2 ? HEX.dk : HEX.tint }, objectName: 'component' });
    iconDisc(s, ic, x + (bw - 0.8) / 2, y + 0.3, 0.8, i === 2 ? HEX.gold : HEX.white);
    s.addText(h1, T({ x: mx(x + 0.2, bw - 0.4), y: y + 1.25, w: bw - 0.4, h: 0.45, fontSize: 17, bold: true, color: i === 2 ? HEX.white : HEX.dk, align: 'center' }));
    s.addText(b1, T({ x: mx(x + 0.2, bw - 0.4), y: y + 1.75, w: bw - 0.4, h: 1.1, fontSize: 12.5, color: i === 2 ? 'D9E6E1' : HEX.muted, align: 'center', valign: 'top' }));
    if (i < 3) s.addImage({ data: ICN.arrowL, x: mx(x + bw + gap / 2 - 0.17, 0.34), y: y + 1.33, w: 0.34, h: 0.34, objectName: 'arrow' });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 5.25, w: W - 2 * M, h: 1.3, rectRadius: 0.12, fill: { color: 'FBF6E8' }, line: { color: 'EAD9A6' }, objectName: 'note card' });
  iconDisc(s, ICN.wifi, M + 0.3, 5.55, 0.7, HEX.white);
  s.addText([
    { text: L('تعمل الشاشة دون إنترنت', 'The screen works without internet'), options: { bold: true, fontSize: 15, color: HEX.ink, breakLine: true, rtlMode: AR, align: ALIGN } },
    { text: L('المواقيت تُحسب على الجهاز نفسه، والإنترنت يُستخدم فقط للمزامنة مع لوحة التحكم والطقس والتحديثات.', 'Times are calculated on the device; the internet is only for dashboard sync, weather and updates.'), options: { fontSize: 13, color: HEX.muted, rtlMode: AR, align: ALIGN } },
  ], T({ x: mx(M + 1.25, W - 2 * M - 1.6), y: 5.45, w: W - 2 * M - 1.6, h: 0.9, valign: 'middle' }));
  s.addNotes(L('التطبيق والرابط يعرضان الشاشة نفسها. الخادم يربط الشاشات بحساب المسجد ويزامن الإعدادات في الاتجاهين.', 'The app and the link show the same screen. The server ties screens to the masjid account and syncs settings both ways.'));

  /* section: the screen */
  divider(L('الشاشة وما تعرضه', 'What the screen shows'), L('من الشاشة الرئيسية إلى دورة كل صلاة', 'From the main screen to the cycle of each prayer'), S('tpl_nabawi'), L('الشاشة', 'The screen'));

  /* 4 — main screen */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('الشاشة', 'The screen') });
  title(s, L('الشاشة الرئيسية: كل شيء في نظرة واحدة', 'The main screen: everything at a glance'));
  screen(s, S('main_L'), mx(M, 7.4), 1.5, 7.4, 16 / 9, { alt: 'Main screen' });
  const mp = [
    [L('الساعة والتاريخ', 'Clock & dates'), L('الوقت بخط كبير، والتاريخان الهجري والميلادي', 'Large time with Hijri and Gregorian dates')],
    [L('الصلاة القادمة', 'Next prayer'), L('عدّ تنازلي حتى الأذان، مع وقتي الأذان والإقامة', 'Countdown to the adhan, with adhan and iqamah times')],
    [L('جدول الصلوات', 'Timetable'), L('ست بطاقات تبرز الصلاة القادمة، مع وقت الإقامة', 'Six cards highlighting the next prayer, with iqamah')],
    [L('اسم المسجد وشريط الأخبار', 'Name & ticker'), L('شعار نصي أو صورة، وإعلانات متحركة أسفل الشاشة', 'Text or logo, and scrolling notices at the bottom')],
  ];
  mp.forEach(([h1, b1], i) => point(s, i + 1, h1, b1, M + 7.75, 1.55 + i * 1.12, W - 2 * M - 7.75));
  cap(s, L('كل عنصر في صندوق ثابت يتكيف مع حجم الشاشة، فلا تتداخل النصوص أبدًا', 'Every element sits in a fixed box that adapts to the screen, so texts never overlap'), mx(M, 7.4), 5.85, 7.4);
  s.addNotes(L('هذه الشاشة تظهر بين الصلوات. حجم الوقت والتاريخ وترتيب العناصر قابلة للضبط من «تخطيط الشاشة الرئيسية».', 'This screen shows between prayers. Time and date sizes and the order of elements are set under “Main screen layout”.'));

  /* 5 — orientations */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('الشاشة', 'The screen') });
  title(s, L('بالعرض أو بالطول — التصميم يتكيف تلقائيًا', 'Landscape or portrait — the layout adapts'));
  screen(s, S('main_L'), mx(M, 6.2), 1.65, 6.2, 16 / 9, { alt: 'Landscape' });
  cap(s, L('بالعرض 16:9 — الأنسب للقاعات الواسعة', 'Landscape 16:9 — best for wide halls'), mx(M, 6.2), 5.3, 6.2);
  const pw = 2.35, ph = pw * 16 / 9;
  screen(s, S('main_P'), mx(M + 6.75, pw), 1.4, pw, 9 / 16, { alt: 'Portrait' });
  screen(s, S('hadith_P'), mx(M + 6.75 + pw + 0.45, pw), 1.4, pw, 9 / 16, { alt: 'Portrait hadith page' });
  cap(s, L('بالطول 9:16 — للأعمدة والممرات ومصلى النساء', 'Portrait 9:16 — for pillars, corridors and the women’s hall'), mx(M + 6.6, 5.2), 1.4 + ph + 0.15, 5.2);
  s.addText(L('يُكتشف الاتجاه تلقائيًا من الشاشة، ويمكن تثبيته من «الإعدادات العامة».', 'The orientation is detected from the screen and can be fixed under “General”.'),
    T({ x: mx(M, 6.2), y: 5.75, w: 6.2, h: 0.6, fontSize: 14, color: HEX.ink }));
  s.addNotes(L('الصور من النسخة نفسها: الشاشة الرئيسية بالعرض، ثم الشاشة الرئيسية وصفحة الحديث بالطول.', 'Same build: main screen in landscape, then the main screen and the hadith page in portrait.'));

  /* 6 — hadith page */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('الشاشة', 'The screen') });
  title(s, L('صفحة الحديث: تُقرأ بوضوح وبالوقت الكافي', 'The hadith page: easy to read, given enough time'));
  screen(s, S('hadith_L'), mx(M, 6.3), 1.55, 6.3, 16 / 9, { alt: 'Hadith page' });
  cap(s, L('تتناوب مع شاشة المواقيت: 8 ثوانٍ مواقيت، ثم حديث، وهكذا', 'Takes turns with the prayer times: 8 s of times, then a hadith, and so on'), mx(M, 6.3), 5.25, 6.3);
  const hp = [
    [L('الخط يتناسب مع طول النص', 'Text size follows the length'), L('الحديث القصير بخط كبير جدًا، والطويل يصغر بقدر ما يلزم فقط', 'Short hadith very large; long ones shrink only as needed')],
    [L('مدة تكفي للقراءة', 'Time enough to read'), L('تُحسب من عدد الكلمات وسرعة القراءة المختارة، بين 10 و90 ثانية', 'From the word count and the chosen speed, 10–90 s')],
    [L('لا يفوت المصلي الوقت', 'Time stays visible'), L('الساعة والصلاة القادمة أعلى الصفحة، وشريط للوقت المتبقي', 'Clock and next prayer on top, plus a time-left bar')],
    [L('محتوى متنوع', 'Varied content'), L('أحاديث، وأذكار المسجد، وفئات المكتبة، ونصوص المناسبات', 'Hadith, masjid adhkar, library categories, occasion texts')],
  ];
  hp.forEach(([h1, b1], i) => point(s, i + 1, h1, b1, M + 6.75, 1.55 + i * 1.12, W - 2 * M - 6.75));
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: mx(M, 6.3), y: 5.75, w: 6.3, h: 0.85, rectRadius: 0.1, fill: { color: HEX.tint }, line: { color: HEX.tint }, objectName: 'timing card' });
  s.addText(L('مثال: حديث من 3 كلمات ← 10 ثوانٍ · من 20 كلمة ← 18 ثانية · من 69 كلمة ← 43 ثانية (بالسرعة المتوسطة)', 'Example at normal speed: 3 words → 10 s · 20 words → 18 s · 69 words → 43 s'),
    T({ x: mx(M + 0.25, 5.8), y: 5.8, w: 5.8, h: 0.75, fontSize: 13, color: HEX.ink, valign: 'middle' }));
  s.addNotes(L('بين الأذان والإقامة تعمل الفكرة نفسها: العدّاد 5 ثوانٍ ثم صفحة حديث، والعدّاد وحده في آخر دقيقة. يمكن تغيير مدة شاشة المواقيت، وعدد الأحاديث في كل مرة، وسرعة القراءة، وأقصى حجم للخط من «المحتوى الدعوي».', 'Between the adhan and the iqamah the same idea applies: 5 s of countdown, then a hadith page; countdown only in the last minute. Under “Content” you can change the interval, hadith per turn, reading speed and the largest text size.'));

  /* 7 — prayer cycle */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('الشاشة', 'The screen') });
  title(s, L('دورة كل صلاة تعمل تلقائيًا', 'Each prayer runs by itself'));
  const cyc = [
    ['adhan', L('الأذان', 'Adhan'), L('إعلان الصلاة مع دعاء ما بعد الأذان', 'Announcement with the dua after the adhan')],
    ['countdown', L('عدّاد الإقامة', 'Iqamah countdown'), L('5 ثوانٍ، بالتناوب مع صفحة أحاديث بخط كبير', '5 s, alternating with a large-text hadith page')],
    ['iqama', L('الإقامة', 'Iqamah'), L('تسوية الصفوف وتنبيه إغلاق الجوال', 'Straighten the rows, phones on silent')],
    ['saver', L('وضع السكون', 'Quiet screen'), L('أثناء الصلاة تلقائيًا: ساعة خافتة فقط', 'During the prayer by default: a dim clock only')],
    ['azkar', L('أذكار بعد الصلاة', 'After-prayer adhkar'), L('تبدأ تلقائيًا أو يدويًا أو بالمايكروفون', 'Start automatically, by hand or by microphone')],
  ];
  const tw = (W - 2 * M - 4 * 0.22) / 5;
  cyc.forEach(([img, h1, b1], i) => {
    const x = M + i * (tw + 0.22);
    screen(s, S(img), mx(x, tw), 2.0, tw, 16 / 9, { alt: h1 });
    s.addShape(pres.shapes.OVAL, { x: mx(x + tw / 2 - 0.22, 0.44), y: 1.32, w: 0.44, h: 0.44, fill: { color: HEX.gold }, line: { color: HEX.gold }, objectName: 'step disc' });
    s.addText(String(i + 1), T({ x: mx(x + tw / 2 - 0.22, 0.44), y: 1.32, w: 0.44, h: 0.44, fontSize: 14, bold: true, color: HEX.dk, align: 'center', valign: 'middle' }));
    s.addText(h1, T({ x: mx(x, tw), y: 3.65, w: tw, h: 0.4, fontSize: 15, bold: true, color: HEX.dk, align: 'center' }));
    s.addText(b1, T({ x: mx(x, tw), y: 4.05, w: tw, h: 0.75, fontSize: 12, color: HEX.muted, align: 'center', valign: 'top' }));
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 5.0, w: W - 2 * M, h: 1.6, rectRadius: 0.12, fill: { color: HEX.tint }, line: { color: HEX.tint }, objectName: 'settings card' });
  bullets(s, [
    L('مدة الإقامة لكل صلاة بالدقائق أو بوقت ثابت، ومدة كل صلاة، تُضبط من «الإقامة والإعلانات».', 'Iqamah delay per prayer (minutes or a fixed time) and prayer length are set under “Iqamah & announcements”.'),
    L('وضع السكون مفعّل تلقائيًا أثناء الصلوات، ويمكن تغييره إلى «بين الصلوات» أو «فترات» أو «وقت محدد»، أو إيقافه.', 'The quiet screen is on during prayers by default; switch it to “between prayers”, “intervals” or “set times”, or off.'),
    L('بين الأذان والإقامة: العدّاد 5 ثوانٍ ثم صفحة حديث بخط كبير، والعدّاد وحده في آخر دقيقة، واسم المسجد مخفي في هذه الشاشة.', 'Between adhan and iqamah: 5 s of countdown, then a large hadith page; countdown only in the last minute; the mosque name is hidden here.'),
    L('صوت الأذان لكل صلاة: تشغيل أو إيقاف، ودرجة صوت، وملف MP3 خاص؛ والفجر لا يُشغَّل له إلا ملف أذان الفجر.', 'Adhan per prayer: on/off, volume and an own MP3; Fajr only ever plays a Fajr recording.'),
  ], M + 0.3, 5.12, W - 2 * M - 0.6, 1.8, { fontSize: 12.5, paraSpaceAfter: 4 });
  s.addNotes(L('هذه الصور لصلاة الظهر في الطائف بتقويم أم القرى: الأذان 12:02 والإقامة 12:22.', 'Pictures from Dhuhr in Taif (Umm al-Qura): adhan 12:02, iqamah 12:22.'));

  /* 8 — adhkar */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('الشاشة', 'The screen') });
  title(s, L('الأذكار في أوقاتها', 'Adhkar at their times'));
  screen(s, S('morning'), mx(M, 5.75), 1.6, 5.75, 16 / 9, { alt: 'Morning adhkar' });
  cap(s, L('أذكار الصباح — قبل الشروق تلقائيًا', 'Morning adhkar — automatically before sunrise'), mx(M, 5.75), 4.98, 5.75);
  screen(s, S('azkar'), mx(M + 6.35, 5.75), 1.6, 5.75, 16 / 9, { alt: 'After-prayer adhkar' });
  cap(s, L('أذكار بعد الصلاة — البطاقة الكبرى في الوسط', 'After-prayer adhkar — the main card in the middle'), mx(M + 6.35, 5.75), 4.98, 5.75);
  const az = [
    [L('ثلاثة أشكال للعرض', 'Three display modes'), L('بطاقات متوازنة، أو ذكر واحد في كل مرة، أو صور يرفعها المسجد', 'Balanced cards, one at a time, or the masjid’s own images')],
    [L('العدد والمصدر', 'Count & source'), L('كل ذكر بعدد مراته وتخريجه، وخلفية لكل مجموعة', 'Each with its count and source; a background per set')],
    [L('بدء مرن بعد الصلاة', 'Flexible start'), L('تلقائي، أو بزر الريموت، أو عند سكون المايكروفون', 'Automatic, by remote button, or when the mic falls silent')],
  ];
  az.forEach(([h1, b1], i) => point(s, i + 1, h1, b1, M + i * 4.1, 5.5, 3.9, { h: 1.0, bs: 12 }));
  s.addNotes(L('كل الأذكار قابلة للتعديل والترتيب والإيقاف من «الأذكار والأحاديث».', 'Every dhikr can be edited, reordered or switched off under “Adhkar & hadith”.'));

  /* 9 — library & authenticity */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('الشاشة', 'The screen') });
  title(s, L('مكتبة أذكار موثّقة ونصوص مراجَعة', 'A sourced adhkar library, checked texts'));
  screen(s, S('set_lib'), mx(M, 6.0), 1.55, 6.0, 16 / 9, { alt: 'Adhkar library settings' });
  cap(s, L('كل فئة من islambook في صفحة مستقلة، مع العدد والتخريج وسبب أي إيقاف', 'Each islambook category on its own page, with count, source and any reason it is off'), mx(M, 6.0), 5.12, 6.0);
  const lib = [['291', L('ذكرًا من 20 فئة', 'adhkar from 20 categories')], ['227', L('مفعّلة افتراضيًا', 'on by default')], ['64', L('موقوفة مع ذكر السبب', 'off, with the reason shown')]];
  lib.forEach(([n, t], i) => {
    const x = M + 6.5 + i * 1.95;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: mx(x, 1.8), y: 1.55, w: 1.8, h: 1.45, rectRadius: 0.1, fill: { color: i === 2 ? 'FBF6E8' : HEX.tint }, line: { color: i === 2 ? 'EAD9A6' : HEX.tint }, objectName: 'stat' });
    s.addText(n, T({ x: mx(x, 1.8), y: 1.65, w: 1.8, h: 0.7, fontSize: 30, bold: true, color: i === 2 ? '8C6B1F' : HEX.green, align: 'center' }));
    s.addText(t, T({ x: mx(x + 0.1, 1.6), y: 2.35, w: 1.6, h: 0.6, fontSize: 11.5, color: HEX.ink, align: 'center', valign: 'top' }));
  });
  bullets(s, [
    L('الآيات طوبقت حرفًا حرفًا مع نص المصحف آليًا، ولم يُعثر على أي اختلاف.', 'Quran verses were matched letter by letter against the Mushaf text — no differences found.'),
    L('الضعيف والمختلف في ثبوته والأدعية العامة غير المأثورة بلفظها: باقية لكنها موقوفة، وعليها ⚠️ مع السبب.', 'Weak, disputed and general (non-narrated) items stay in the library but are off, marked ⚠️ with the reason.'),
    L('نصوص المناسبات (80 نصًا) من القرآن والأحاديث الصحيحة والحسنة، دون تكرار بينها.', 'Occasion texts (80) come from the Quran and sahih / hasan hadith, with no repeats.'),
    L('توصية: مراجعة شرعية متخصصة قبل النشر العام.', 'Recommendation: a specialist sharia review before public release.'),
  ], M + 6.5, 3.3, W - 2 * M - 6.5, 3.4, { fontSize: 13.5 });
  s.addNotes(L('الإيقاف لا يعني الحذف: يستطيع المسجد تفعيل أي نص بعد مراجعته. الموقوف: 15 ضعيفًا، و7 مختلفًا فيه، و38 دعاءً عامًا، و3 نصوص للاطلاع، وأثر موقوف واحد مفعّل مع بيان أنه أثر.', 'Off is not deleted: the masjid can turn any text on after review. Off: 15 weak, 7 disputed, 38 general duas, 3 reference texts; one athar stays on, labelled as athar.'));

  /* 10 — Friday */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('الشاشة', 'The screen') });
  title(s, L('يوم الجمعة له إعداداته الخاصة', 'Jumu‘ah has its own settings'));
  screen(s, S('khutbah'), mx(M, 6.0), 1.55, 6.0, 16 / 9, { alt: 'Khutbah screen' });
  cap(s, L('شاشة الخطبة: تنبيه بالإنصات وتهدئة الإضاءة', 'Khutbah screen: a reminder to listen, lighting kept calm'), mx(M, 6.0), 5.12, 6.0);
  const fr = [
    [L('أذان الجمعة', 'Jumu‘ah adhan'), L('في وقت الظهر أو في وقت ثابت يحدده المسجد', 'At Dhuhr time or at a fixed time')],
    [L('الخطبة والصلاة', 'Khutbah & prayer'), L('بداية الخطبة ومدتها ومدة الصلاة بالدقائق', 'Khutbah start, length and prayer length in minutes')],
    [L('الأذكار مباشرة بعد الصلاة', 'Adhkar straight after'), L('يحدد المسجد موعد ظهورها بعد الإقامة، دون شاشة سوداء إضافية', 'The masjid sets when they appear after the iqamah — no extra black screen')],
    [L('فضائل الجمعة وساعتها', 'Friday virtues & its hour'), L('تظهر نصوصها تلقائيًا، ومنها التذكير بآخر ساعة بعد العصر', 'Shown automatically, incl. the last hour after Asr')],
  ];
  fr.forEach(([h1, b1], i) => point(s, i + 1, h1, b1, M + 6.45, 1.55 + i * 1.18, W - 2 * M - 6.45));
  s.addNotes(L('تُضبط كلها من قسم «الجمعة» في الشاشة أو في لوحة التحكم.', 'All set in the “Jumu‘ah” section, on the TV or in the dashboard.'));

  /* 11 — occasions */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('الشاشة', 'The screen') });
  title(s, L('المناسبات الهجرية تظهر في وقتها', 'Hijri occasions appear on their days'));
  screen(s, S('occasion'), mx(M, 6.0), 1.55, 6.0, 16 / 9, { alt: 'Occasion on the hadith page' });
  cap(s, L('مثال: «فضائل يوم الجمعة» معروضة وحدها في صفحة الحديث', 'Example: “Virtues of Friday” shown alone on the hadith page'), mx(M, 6.0), 5.12, 6.0);
  const occ = AR
    ? ['الأيام البيض', 'عاشوراء', 'فضائل الجمعة', 'ساعة الجمعة', 'رمضان', 'العشر الأوائل', 'العشر الوسطى', 'العشر الأواخر', 'ليلة العيد', 'عيد الفطر', 'ست شوال', 'عشر ذي الحجة', 'يوم عرفة', 'عيد الأضحى', 'أيام التشريق']
    : ['White days', 'Ashura', 'Friday virtues', 'Friday hour', 'Ramadan', 'First ten', 'Middle ten', 'Last ten', 'Eid eve', 'Eid al-Fitr', 'Six of Shawwal', 'Dhul-Hijjah ten', 'Arafah', 'Eid al-Adha', 'Tashreeq'];
  const cw2 = 1.95;
  occ.forEach((t, i) => {
    const col = i % 3, row = Math.floor(i / 3), x = M + 6.45 + col * (cw2 + 0.12), y = 1.55 + row * 0.52;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: mx(x, cw2), y, w: cw2, h: 0.42, rectRadius: 0.21, fill: { color: HEX.tint }, line: { color: 'C9DDD5' }, objectName: 'chip' });
    s.addText(t, T({ x: mx(x, cw2), y, w: cw2, h: 0.42, fontSize: 12, color: HEX.dk, bold: true, align: 'center', valign: 'middle' }));
  });
  bullets(s, [
    L('لكل مناسبة صفحة مستقلة: تعديل النصوص أو إيقافها أو إضافة نص مع مصدره.', 'Each occasion has its own page: edit, switch off or add texts with their source.'),
    L('خيار «إظهارها وحدها» في صفحة الحديث أو في شريط الأخبار أثناء المناسبة.', '“Show alone” on the hadith page or in the ticker while it lasts.'),
    L('التقويم الهجري قابل للتعديل يومًا للأمام أو للخلف.', 'The Hijri date can be adjusted a day either way.'),
  ], M + 6.45, 4.35, W - 2 * M - 6.45, 2.3, { fontSize: 13.5 });
  s.addNotes(L('80 نصًا موزعة على 15 مناسبة، من القرآن والأحاديث الصحيحة والحسنة وآثار الصحابة المبيّنة.', '80 texts across 15 occasions, from the Quran, sahih / hasan hadith and Companion athar marked as such.'));

  /* 12 — notices & designs */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('الشاشة', 'The screen') });
  title(s, L('إعلانات المسجد وصلاة الجنازة', 'Masjid notices and funeral prayers'));
  screen(s, S('funeral'), mx(M, 6.6), 1.55, 6.6, 16 / 9, { alt: 'Funeral notice' });
  cap(s, L('شريط الجنازة الأحمر أسفل جدول الصلوات', 'The red funeral strip under the timetable'), mx(M, 6.6), 5.47, 6.6);
  const nt = [
    [L('صلاة الجنازة', 'Funeral prayer'), L('الاسم والجنس، وبعد صلاة محددة أو طوال اليوم لعدة أيام، مع ملاحظة', 'Name and gender, after a chosen prayer or all day for N days, with a note')],
    [L('إعلانات بتاريخ انتهاء', 'Notices that expire'), L('تختفي تلقائيًا في الموعد المحدد', 'They disappear on their own at the set time')],
    [L('شريط الأخبار', 'News ticker'), L('نصوص جاهزة أو خاصة، ويمكن إخفاؤه', 'Ready-made or custom texts; can be hidden')],
    [L('الفعاليات والدروس', 'Events & lessons'), L('تظهر من تاريخ إلى تاريخ', 'Shown between two dates')],
  ];
  nt.forEach(([h1, b1], i) => point(s, i + 1, h1, b1, M + 7.0, 1.55 + i * 1.12, W - 2 * M - 7.0));
  s.addNotes(L('كل ذلك يُضاف من «المحتوى الدعوي والإعلانات»، ومن لوحة التحكم أسهل لكتابة النصوص.', 'All added under “Content & announcements”; typing is easier from the dashboard.'));

  /* 13 — designs */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('الشاشة', 'The screen') });
  title(s, L('34 تصميمًا، وتبديل تلقائي حسب الوقت والمناسبة', '34 designs, switching by time and occasion'));
  const tpls = [['night', L('ليلي', 'Night')], ['royal', L('ملكي', 'Royal')], ['andalus', L('أندلسي', 'Andalus')], ['ivory', L('عاجي', 'Ivory')], ['nabawi', L('القبة الخضراء', 'Green Dome')], ['ramadan', L('رمضان', 'Ramadan')], ['eid_fitr', L('عيد الفطر', 'Eid al-Fitr')], ['p_maghrib', L('المغرب', 'Maghrib')]];
  const gw = (W - 2 * M - 3 * 0.3) / 4;
  tpls.forEach(([id, nm], i) => {
    const col = i % 4, row = Math.floor(i / 4), x = M + col * (gw + 0.3), y = 1.5 + row * 2.2;
    screen(s, S('tpl_' + id), mx(x, gw), y, gw, 16 / 9, { alt: nm });
    cap(s, nm, mx(x, gw), y + gw * 9 / 16 + 0.08, gw, { fontSize: 12, color: HEX.ink, bold: true });
  });
  s.addText(L('تلقائيًا: نهار/ليل أو تصميم لكل صلاة، ورمضان والعيدين في أيامها · 13 خطًا عربيًا · شعار المسجد · تصاميم يصنعها المسجد', 'Automatic: day/night or one per prayer; Ramadan and Eid on their days · 13 Arabic fonts · masjid logo · the masjid’s own designs'),
    T({ x: M, y: 6.0, w: W - 2 * M, h: 0.6, fontSize: 13.5, color: HEX.ink, align: 'center' }));
  s.addNotes(L('التصميم يُختار من «القوالب والتصميم»، ويمكن تلوين جدول الصلوات بلون كل صلاة.', 'Pick the design under “Templates & design”; the timetable can take each prayer’s colours.'));

  /* section: managing */
  divider(L('الضبط والإدارة', 'Setting up and managing'), L('من التلفاز بالريموت، أو عن بُعد من لوحة التحكم', 'On the TV with the remote, or remotely from the dashboard'), S('set_loc'), L('الضبط', 'Setup'));

  /* 14 — on the TV */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('الضبط', 'Setup') });
  title(s, L('الضبط من التلفاز بالريموت', 'Setting up on the TV with the remote'));
  screen(s, S('set_loc'), mx(M, 6.9), 1.55, 6.9, 16 / 9, { alt: 'Settings on the TV' });
  cap(s, L('شاشة الإعدادات على التلفاز: 17 قسمًا مع تعليمات في كل صفحة', 'Settings on the TV: 17 sections with tips on every page'), mx(M, 6.9), 5.5, 6.9);
  const tvp = [
    [L('افتح الإعدادات', 'Open settings'), L('زر OK في الريموت، أو زر «حيَّ» في الزاوية', 'OK on the remote, or the “Hayya” corner button')],
    [L('تنقّل بالأسهم', 'Move with the arrows'), L('بين الأقسام والحقول، وOK للدخول أو الكتابة', 'Between sections and fields; OK to enter or type')],
    [L('اكتب بسهولة', 'Type easily'), L('الحقل يرتفع فوق لوحة المفاتيح، والأسهم تحرك المؤشر داخل النص', 'The field rises above the keyboard; arrows move the cursor')],
    [L('احمِ الإعدادات', 'Protect them'), L('قفل برقم سري يمنع العبث بالإعدادات', 'A PIN lock keeps settings safe')],
  ];
  tvp.forEach(([h1, b1], i) => point(s, i + 1, h1, b1, M + 7.25, 1.55 + i * 1.12, W - 2 * M - 7.25));
  s.addNotes(L('كل التغييرات تُحفظ فورًا على الجهاز، وتصل إلى لوحة التحكم إذا كانت الشاشة مربوطة.', 'Changes save at once on the device and reach the dashboard when the screen is linked.'));

  /* 15 — settings tour */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('الضبط', 'Setup') });
  title(s, L('جولة في أهم صفحات الإعدادات', 'A tour of key settings pages'));
  const tour = [
    ['set_hadith', L('صفحة الحديث', 'Hadith page'), L('المدة، السرعة، حجم الخط', 'Interval, speed, text size')],
    ['set_fri', L('الجمعة', 'Jumu‘ah'), L('الأذان، الخطبة، موعد الأذكار', 'Adhan, khutbah, adhkar time')],
    ['set_saver', L('وضع السكون', 'Quiet screen'), L('متى يعمل وشكله', 'When it runs and its look')],
    ['set_occ', L('المناسبات', 'Occasions'), L('صفحة لكل مناسبة', 'A page per occasion')],
    ['set_tpl', L('التصميم', 'Design'), L('القالب والتبديل التلقائي', 'Template and auto-switching')],
    ['set_azkar', L('الأذكار', 'Adhkar'), L('تعديل وترتيب وإيقاف', 'Edit, reorder, switch off')],
  ];
  const tw2 = (W - 2 * M - 2 * 0.4) / 3;
  tour.forEach(([img, h1, b1], i) => {
    const col = i % 3, row = Math.floor(i / 3), x = M + col * (tw2 + 0.4), y = 1.45 + row * 2.85;
    screen(s, S(img), mx(x, tw2), y, tw2, 16 / 9, { alt: h1 });
    s.addText([{ text: h1 + '  ', options: { bold: true, color: HEX.dk, rtlMode: AR } }, { text: b1, options: { color: HEX.muted, rtlMode: AR } }],
      T({ x: mx(x, tw2), y: y + tw2 * 9 / 16 + 0.1, w: tw2, h: 0.4, fontSize: 13, align: 'center' }));
  });
  s.addNotes(L('هذه الصفحات نفسها تظهر داخل لوحة التحكم، فلا يحتاج المشرف إلى تعلم واجهتين.', 'The same pages appear inside the dashboard, so there is only one interface to learn.'));

  /* 16 — dashboard */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('الضبط', 'Setup') });
  title(s, L('التحكم عن بُعد من لوحة التحكم', 'Remote control from the dashboard'));
  screen(s, D('dash_editor'), mx(M + 5.0, 7.13), 1.5, 7.13, 1.6, { alt: 'Dashboard screen editor' });
  cap(s, L('محرر الشاشة في لوحة التحكم: معاينة حيّة بجانب الإعدادات' + '', 'The screen editor in the dashboard: live preview next to the settings') + (AR ? '' : ' (interface in Arabic)'), mx(M + 5.0, 7.13), 6.15, 7.13);
  const dp = [
    [L('ادخل برقم الجوال', 'Sign in by phone'), L('رمز تحقق يصل برسالة نصية، دون كلمة مرور', 'A one-time SMS code, no password')],
    [L('اربط الشاشة', 'Link the screen'), L('بالرقم المكوّن من 10 أرقام الظاهر على الشاشة', 'With the 10-digit number shown on it')],
    [L('عدّل كما تشاء', 'Edit freely'), L('نفس أقسام الشاشة، مع معاينة حيّة', 'The same sections as the TV, with a live preview')],
    [L('تصل التغييرات وحدها', 'Changes arrive'), L('مزامنة في الاتجاهين خلال ثوانٍ', 'Two-way sync within seconds')],
  ];
  dp.forEach(([h1, b1], i) => point(s, i + 1, h1, b1, M, 1.5 + i * 1.15, 4.6));
  s.addNotes(L('يمكن إدارة عدة شاشات للمسجد نفسه (مصلى الرجال والنساء مثلًا) ونسخ الإعدادات بينها.', 'Several screens of the same masjid (men’s and women’s halls, say) can be managed and settings copied between them.'));

  /* 17 — dashboard tools */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('الضبط', 'Setup') });
  title(s, L('أدوات لوحة التحكم', 'Dashboard tools'));
  const dt = [
    ['dash_screens', L('الشاشات', 'Screens'), L('كل الشاشات وحالتها ونسخ الإعدادات بينها', 'All screens, their status, copy settings')],
    ['dash_backups', L('النسخ الاحتياطية', 'Backups'), L('حفظ واستعادة وتصدير الإعدادات', 'Save, restore and export settings')],
    ['dash_download', L('تحميل التطبيق', 'Download'), L('ملف APK ورابط الويب للشاشات', 'APK and web link for screens')],
    ['dash_codes', L('الإدارة', 'Admin'), L('أكواد التفعيل والنسخ المفعّلة', 'Activation codes and activated copies')],
  ];
  const dw = (W - 2 * M - 0.5) / 2;
  dt.forEach(([img, h1, b1], i) => {
    const col = i % 2, row = Math.floor(i / 2), x = M + col * (dw + 0.5), y = 1.45 + row * 2.85;
    const iw = 3.7;
    screen(s, D(img), mx(x, iw), y, iw, 1.6, { alt: h1 });
    s.addText([{ text: h1, options: { bold: true, fontSize: 16, color: HEX.dk, breakLine: true, rtlMode: AR, align: ALIGN } }, { text: b1, options: { fontSize: 13, color: HEX.muted, rtlMode: AR, align: ALIGN } }],
      T({ x: mx(x + iw + 0.3, dw - iw - 0.3), y: y + 0.3, w: dw - iw - 0.3, h: 1.4, valign: 'top' }));
  });
  s.addNotes(L('واجهة لوحة التحكم حاليًا بالعربية.', 'The dashboard interface is currently in Arabic.'));

  /* 18 — plans */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('الضبط', 'Setup') });
  title(s, L('الخطط وأكواد التفعيل', 'Plans and activation codes'));
  const pl = [
    [L('شاشة مجانية', 'One free screen'), L('لكل حساب مرة واحدة، ولكل جهاز مرة واحدة', 'Once per account and once per device')],
    [L('كود تفعيل مدى الحياة', 'Lifetime code'), L('لكل شاشة إضافية، يُدخل من الشاشة أو لوحة التحكم', 'For each extra screen, entered on the TV or in the dashboard')],
    [L('نسخ مفعّلة مسبقًا', 'Pre-activated copies'), L('كود مدمج في كل نسخة APK أو HTML، يُفعَّل وحده عند أول اتصال', 'A code built into each APK / HTML copy, redeemed on first connection')],
  ];
  pl.forEach(([h1, b1], i) => {
    const x = M + i * 4.1, w = 3.8, y = 1.7;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: mx(x, w), y, w, h: 2.6, rectRadius: 0.14, fill: { color: i === 1 ? HEX.dk : HEX.tint }, line: { color: i === 1 ? HEX.dk : HEX.tint }, objectName: 'plan' });
    iconDisc(s, [ICN.tv, ICN.key, ICN.save][i], x + 0.35, y + 0.35, 0.75, i === 1 ? HEX.gold : HEX.white);
    s.addText(h1, T({ x: mx(x + 0.35, w - 0.7), y: y + 1.25, w: w - 0.7, h: 0.5, fontSize: 18, bold: true, color: i === 1 ? HEX.white : HEX.dk }));
    s.addText(b1, T({ x: mx(x + 0.35, w - 0.7), y: y + 1.75, w: w - 0.7, h: 0.8, fontSize: 13, color: i === 1 ? 'D9E6E1' : HEX.muted, valign: 'top' }));
  });
  screen(s, D('dash_plans'), mx(M, 3.9), 4.65, 3.9, 1.6, { alt: 'Plans page' });
  bullets(s, [
    L('المدير يولّد الأكواد والنسخ المفعّلة من صفحة «الإدارة» أو بأداة سطر الأوامر.', 'The admin generates codes and activated copies from the Admin page or a command-line tool.'),
    L('الكود المدمج لا يغيّر توقيع التطبيق، فتبقى النسخة أصلية وقابلة للتحديث.', 'The built-in code does not change the app signature, so copies stay genuine and updatable.'),
    L('الأسعار في الصفحة تجريبية وتحتاج اعتمادًا.', 'Prices on the page are placeholders awaiting approval.'),
  ], M + 4.5, 4.75, W - 2 * M - 4.5, 2.0, { fontSize: 13.5 });
  s.addNotes(L('نموذج الخطط مطبَّق في الخادم ولوحة التحكم وتطبيق الشاشة، ويحتاج فقط اعتماد الأسعار.', 'The plan model is implemented in the server, dashboard and TV app; only prices need approval.'));

  /* 19 — security & reliability */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('الضبط', 'Setup') });
  title(s, L('الأمان والاعتمادية', 'Security and reliability'));
  const sec = [
    [ICN.wifi, L('يعمل دون إنترنت', 'Works offline'), L('المواقيت تُحسب على الجهاز', 'Times are calculated on the device')],
    [ICN.power, L('يبدأ وحده', 'Starts by itself'), L('عند تشغيل التلفاز، ويبقي الشاشة مضاءة', 'When the TV powers on; keeps the screen awake')],
    [ICN.key, L('ربط آمن', 'Secure linking'), L('رقم من 10 أرقام، والربط فقط والشاشة متصلة', '10-digit number; linking only while the screen is online')],
    [ICN.shield, L('حماية الخادم', 'Server protection'), L('HTTPS وترويسات أمان وحدّ للمحاولات الخاطئة', 'HTTPS, security headers, limits on failed attempts')],
    [ICN.lock, L('قفل الإعدادات', 'Settings lock'), L('رقم سري على الشاشة', 'A PIN on the screen')],
    [ICN.save, L('نسخ احتياطية', 'Backups'), L('استعادة الإعدادات بضغطة', 'Restore settings in one click')],
  ];
  sec.forEach(([ic, h1, b1], i) => {
    const col = i % 3, row = Math.floor(i / 3), w = 3.75, x = M + col * (w + 0.3), y = 1.6 + row * 2.4;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: mx(x, w), y, w, h: 2.05, rectRadius: 0.12, fill: { color: HEX.tint }, line: { color: HEX.tint }, objectName: 'card' });
    iconDisc(s, ic, x + 0.3, y + 0.3, 0.7, HEX.white);
    s.addText(h1, T({ x: mx(x + 0.3, w - 0.6), y: y + 1.1, w: w - 0.6, h: 0.4, fontSize: 16, bold: true, color: HEX.dk }));
    s.addText(b1, T({ x: mx(x + 0.3, w - 0.6), y: y + 1.48, w: w - 0.6, h: 0.5, fontSize: 12.5, color: HEX.muted, valign: 'top' }));
  });
  s.addNotes(L('مفاتيح الخادم والرسائل النصية وتوقيع التطبيق تُحفظ أسرارًا في GitHub ولا تُكتب في الشيفرة.', 'Server, SMS and signing keys are kept as GitHub secrets, never in the code.'));

  /* 20 — readiness */
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: L('القرار', 'Decision') });
  title(s, L('أين نحن الآن', 'Where we are'));
  const done = [
    L('تطبيق التلفاز (نسخة تجريبية 1.0.11) وملف الويب', 'TV app (test build 1.0.11) and the web file'),
    L('لوحة التحكم ونسخة تجريبية تعمل دون خادم', 'Dashboard, plus a demo that runs without a server'),
    L('شيفرة الخادم وقاعدة البيانات والخطط والتفعيل', 'Server code, database, plans and activation'),
    L('مكتبة الأذكار ونصوص المناسبات بتخريجها', 'Adhkar library and occasion texts with sources'),
  ];
  const todo = [
    L('تجربة ميدانية على أجهزة تلفاز حقيقية في المساجد', 'Field trial on real TVs in masjids'),
    L('نشر الخادم على Cloudflare وربط مزوّد الرسائل', 'Deploy the server on Cloudflare and connect an SMS provider'),
    L('توقيع النسخة النهائية والنشر على Google Play', 'Sign the release build and publish on Google Play'),
    L('مراجعة شرعية للمكتبة واعتماد الأسعار', 'Sharia review of the library and approval of prices'),
  ];
  [[L('أُنجز', 'Done'), done, HEX.green], [L('قبل الإطلاق', 'Before launch'), todo, '8C6B1F']].forEach(([h1, list, col], k) => {
    const w = (W - 2 * M - 0.5) / 2, x = M + k * (w + 0.5), y = 1.5;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: mx(x, w), y, w, h: 5.0, rectRadius: 0.14, fill: { color: k ? 'FBF6E8' : HEX.tint }, line: { color: k ? 'EAD9A6' : HEX.tint }, objectName: 'column' });
    s.addText(h1, T({ x: mx(x + 0.4, w - 0.8), y: y + 0.3, w: w - 0.8, h: 0.55, fontSize: 22, bold: true, color: col }));
    list.forEach((t, i) => {
      const yy = y + 1.1 + i * 0.92;
      s.addShape(pres.shapes.OVAL, { x: mx(x + 0.4, 0.36), y: yy + 0.04, w: 0.36, h: 0.36, fill: { color: col }, line: { color: col }, objectName: 'tick' });
      if (!k) s.addImage({ data: ICN.check, x: mx(x + 0.4, 0.36) + 0.09, y: yy + 0.13, w: 0.18, h: 0.18, objectName: 'check' });
      else s.addText(String(i + 1), T({ x: mx(x + 0.4, 0.36), y: yy + 0.04, w: 0.36, h: 0.36, fontSize: 12, bold: true, color: HEX.white, align: 'center', valign: 'middle' }));
      s.addText(t, T({ x: mx(x + 0.95, w - 1.35), y: yy - 0.02, w: w - 1.35, h: 0.75, fontSize: 14.5, color: HEX.ink, valign: 'top' }));
    });
  });
  s.addNotes(L('ما أُنجز جُرّب آليًا في المتصفح على الاتجاهين؛ التجربة على الأجهزة الحقيقية هي الخطوة التالية.', 'What is done was tested automatically in a browser in both orientations; real devices come next.'));

  /* 21 — decision */
  s = pres.addSlide({ masterName: 'DARK', sectionTitle: L('القرار', 'Decision') });
  s.addText(L('المطلوب من أصحاب القرار', 'Decisions requested'), T({ x: M + 0.2, y: 0.7, w: W - 2 * M - 0.4, h: 0.9, fontSize: 36, bold: true, color: HEX.white }));
  const ask = [
    [L('اعتماد التجربة الميدانية', 'Approve the field trial'), L('في عدد من المساجد بشاشات بالعرض وبالطول', 'In a few masjids, with landscape and portrait screens')],
    [L('تكليف المراجعة الشرعية', 'Commission the sharia review'), L('لمكتبة الأذكار ونصوص المناسبات قبل النشر العام', 'Of the adhkar library and occasion texts before release')],
    [L('اعتماد نموذج الخطط والأسعار', 'Approve plans and prices'), L('شاشة مجانية، وأكواد مدى الحياة للشاشات الإضافية', 'One free screen; lifetime codes for extra screens')],
    [L('اعتماد النشر', 'Approve publishing'), L('على Google Play ونشر الخادم ولوحة التحكم', 'On Google Play, plus the server and dashboard')],
  ];
  ask.forEach(([h1, b1], i) => {
    const col = i % 2, row = Math.floor(i / 2), w = (W - 2 * M - 0.5) / 2, x = M + col * (w + 0.5), y = 2.0 + row * 2.2;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: mx(x, w), y, w, h: 1.85, rectRadius: 0.14, fill: { color: '124A40' }, line: { color: '2D6B5E' }, objectName: 'ask' });
    point(s, i + 1, h1, b1, x + 0.35, y + 0.4, w - 0.7, { hc: HEX.white, bc: 'CFE0DA', hs: 18, bs: 14, h: 1.2 });
  });
  s.addText(L('حَيَّ — شاشة المسجد', 'Hayya — Masjid Screen'), T({ x: M + 0.2, y: 6.65, w: W - 2 * M - 0.4, h: 0.4, fontSize: 13, color: HEX.gold }));
  s.addNotes(L('بعد الموافقة: تجربة ميدانية، ثم مراجعة النتائج، ثم النشر.', 'After approval: field trial, review of the results, then publishing.'));

  const out = `/home/claude/deck/hayya-presentation-${LANG}.pptx`;
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log('wrote', out);
})();
