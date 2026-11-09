/* ================= Built-in adhkar & hadith library =================
   The adhkar of the morning, evening, after the prayer, the adhan and the masjid are taken from
   islambook.com (islambook-lib.js) with their counts; each item carries its takhrij. Items whose authenticity
   is weak or disputed, general duas, and reference-only texts are kept but switched OFF and marked with the reason.
   Each item can be edited, switched off or reordered from the dashboard or the screen. */
const AZKAR_SETS = ['morning', 'evening', 'after', 'masjid'];
const IB_FLAG = { weak: ['ضعيف', 'Weak'], disp: ['مختلف في ثبوته', 'Disputed'], gen: ['دعاء عام', 'General dua'], ref: ['للاطلاع', 'Reference'], athar: ['أثر موقوف', 'Athar'] };
const ibOn = x => !x.f || x.f === 'athar';
const ibSrc = x => (x.v ? x.v + ' — ' : '') + x.s;
const ibItem = x => ({ t: x.t, c: x.c, s: ibSrc(x), n: x.h ? x.h.replace(/[.:،]+$/, '') : '', on: ibOn(x), f: x.f || '', w: x.w || x.x || '' });
const AZKAR = {};
for (const k of AZKAR_SETS) AZKAR[k] = IB_SETS[k].map(ibItem);
/* library categories shown in the hadith line: item i is on unless switched; st[k] holds the user's choices ('1'/'0') */
function libItemOn(k, i) {
  const st = (S.lib && S.lib.st && S.lib.st[k]) || '', c = st[i];
  if (c === '1') return true; if (c === '0') return false;
  const cat = IB_CATS.find(x => x.k === k); return !!(cat && cat.items[i] && ibOn(cat.items[i]));
}
const LIB_MAX_LINE = 700;   // longer texts are too long for the hadith line (they stay in the library)
function libLineItems() {
  const L = [];
  if (!S.lib || !S.lib.show) return L;
  for (const cat of IB_CATS) if (S.lib.show[cat.k]) cat.items.forEach((x, i) => { if (libItemOn(cat.k, i) && x.t.length <= LIB_MAX_LINE) L.push({ t: x.t, c: x.c, s: ibSrc(x), cat: cat.k }); });
  return L;
}

const HADITH = [
  { t: 'إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى', s: 'متفق عليه' },
  { t: 'صلاة الجماعة أفضل من صلاة الفذ بسبع وعشرين درجة', s: 'متفق عليه' },
  { t: 'من غدا إلى المسجد أو راح، أعد الله له في الجنة نزلًا كلما غدا أو راح', s: 'متفق عليه' },
  { t: 'من صلى العشاء في جماعة فكأنما قام نصف الليل، ومن صلى الصبح في جماعة فكأنما صلى الليل كله', s: 'رواه مسلم' },
  { t: 'من صلى البردين دخل الجنة', s: 'متفق عليه' },
  { t: 'أحب البلاد إلى الله مساجدها، وأبغض البلاد إلى الله أسواقها', s: 'رواه مسلم' },
  { t: 'من بنى مسجدًا يبتغي به وجه الله، بنى الله له مثله في الجنة', s: 'متفق عليه' },
  { t: 'لو يعلم الناس ما في النداء والصف الأول، ثم لم يجدوا إلا أن يستهموا عليه لاستهموا', s: 'متفق عليه' },
  { t: 'سووا صفوفكم، فإن تسوية الصفوف من إقامة الصلاة', s: 'رواه البخاري' },
  { t: 'من أكل ثومًا أو بصلًا فليعتزلنا، أو قال: فليعتزل مسجدنا', s: 'متفق عليه' },
  { t: 'الصلوات الخمس، والجمعة إلى الجمعة، ورمضان إلى رمضان، مكفرات ما بينهن إذا اجتنب الكبائر', s: 'رواه مسلم' },
  { t: 'أقرب ما يكون العبد من ربه وهو ساجد، فأكثروا الدعاء', s: 'رواه مسلم' },
  { t: 'من توضأ فأحسن الوضوء خرجت خطاياه من جسده حتى تخرج من تحت أظفاره', s: 'رواه مسلم' },
  { t: 'الطهور شطر الإيمان', s: 'رواه مسلم' },
  { t: 'أفضل الصلاة بعد الفريضة صلاة الليل', s: 'رواه مسلم' },
  { t: 'خيركم من تعلم القرآن وعلمه', s: 'رواه البخاري' },
  { t: 'اقرؤوا القرآن، فإنه يأتي يوم القيامة شفيعًا لأصحابه', s: 'رواه مسلم' },
  { t: 'من سلك طريقًا يلتمس فيه علمًا سهّل الله له به طريقًا إلى الجنة', s: 'رواه مسلم' },
  { t: 'كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن: سبحان الله وبحمده، سبحان الله العظيم', s: 'متفق عليه' },
  { t: 'أحب الأعمال إلى الله أدومها وإن قل', s: 'متفق عليه' },
  { t: 'الكلمة الطيبة صدقة', s: 'متفق عليه' },
  { t: 'ما نقصت صدقة من مال', s: 'رواه مسلم' },
  { t: 'من دل على خير فله مثل أجر فاعله', s: 'رواه مسلم' },
  { t: 'لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه', s: 'متفق عليه' },
  { t: 'المسلم من سلم المسلمون من لسانه ويده', s: 'متفق عليه' },
  { t: 'من كان يؤمن بالله واليوم الآخر فليقل خيرًا أو ليصمت', s: 'متفق عليه' },
  { t: 'الدين النصيحة', s: 'رواه مسلم' },
  { t: 'البر حسن الخلق', s: 'رواه مسلم' },
  { t: 'لا تحقرن من المعروف شيئًا، ولو أن تلقى أخاك بوجه طلق', s: 'رواه مسلم' },
  { t: 'تبسمك في وجه أخيك لك صدقة', s: 'رواه الترمذي، وصححه الألباني' },
  { t: 'اتق الله حيثما كنت، وأتبع السيئة الحسنة تمحها، وخالق الناس بخلق حسن', s: 'رواه الترمذي، وحسّنه' },
  { t: 'إن الله رفيق يحب الرفق في الأمر كله', s: 'متفق عليه' },
  { t: 'يسّروا ولا تعسّروا، وبشّروا ولا تنفّروا', s: 'متفق عليه' },
  { t: 'إن الله لا ينظر إلى صوركم وأموالكم، ولكن ينظر إلى قلوبكم وأعمالكم', s: 'رواه مسلم' },
  { t: 'لا يدخل الجنة من كان في قلبه مثقال ذرة من كبر', s: 'رواه مسلم' },
  { t: 'مثل المؤمنين في توادهم وتراحمهم وتعاطفهم مثل الجسد، إذا اشتكى منه عضو تداعى له سائر الجسد بالسهر والحمى', s: 'متفق عليه' },
];
