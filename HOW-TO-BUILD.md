# دليل البناء والتطوير — حَيَّ (شاشة المسجد)

هذا المجلد هو الكود البرمجي الكامل للمشروع بأجزائه الثلاثة: تطبيق الشاشة، ولوحة التحكم، والخادم.
كل البرامج المطلوبة مجانية، وتعمل على Windows وmacOS وLinux.

---

## 1) ما الذي في المجلد

| المجلد / الملف | ما هو | اللغة |
|---|---|---|
| `src/` | **تطبيق الشاشة**: المواقيت، العرض، الإعدادات، الأذكار، المزامنة | JavaScript + CSS + HTML |
| `src/engine.js` | حساب مواقيت الصلاة (أم القرى وغيرها) | JavaScript |
| `src/core.js` | الإعدادات الافتراضية `DEFAULTS` والجدول اليومي والمراحل | JavaScript |
| `src/view.js` | رسم الشاشة الرئيسية وصفحة الحديث والأذان والإقامة | JavaScript |
| `src/ui.js` | صفحات الإعدادات (هي نفسها في الشاشة ولوحة التحكم) | JavaScript |
| `src/data.js` | القوالب، الخطوط، نصوص المناسبات، نصائح الانتظار | JavaScript |
| `src/islambook-lib.js` | مكتبة الأذكار (مولَّدة من `tools/islambook/`) | JavaScript |
| `dashboard/` | **لوحة التحكم** من الجوال أو الكمبيوتر | JavaScript + CSS |
| `server/` | **الخادم**: `worker.js` لـ Cloudflare، و`node-server.cjs` لسيرفر خاص، و`schema.sql` لقاعدة البيانات | JavaScript + SQL |
| `android/` | **تطبيق Android TV** (غلاف WebView يعرض الشاشة) | Java + Gradle |
| `build.js` | يبني ملف HTML واحدًا ويضع داخله كل الخطوط والصور | JavaScript (Node.js) |
| `dist/index.html` | **ملف الشاشة الجاهز** (ناتج البناء) | — |
| `demo/` | نسخة تجريبية من لوحة التحكم تعمل دون خادم | — |
| `tools/` | أدوات: توليد مكتبة الأذكار، النسخ المفعّلة، العرض التقديمي | Python + JavaScript |
| `.github/workflows/deploy.yml` | بناء التطبيق ونشر الخادم تلقائيًا على GitHub | YAML |
| `README.md` · `DEPLOY.md` | شرح المزايا، وخطوات نشر الخادم ولوحة التحكم | — |

---

## 2) البرامج التي تحتاجها

| البرنامج | لماذا | من أين |
|---|---|---|
| **Visual Studio Code** | لفتح الكود وتعديله (يدعم العربية) | code.visualstudio.com |
| **Node.js** الإصدار 20 أو أحدث | لبناء ملف الشاشة `dist/index.html` | nodejs.org |
| **Android Studio** (2025.1 أو أحدث) | لبناء ملف APK وملف AAB لـ Google Play | developer.android.com/studio |
| حساب **GitHub** (اختياري) | يبني APK وينشر الخادم دون تثبيت أي برنامج | github.com |
| حساب **Cloudflare** (للوحة التحكم) | استضافة الخادم وقاعدة البيانات مجانًا | cloudflare.com |

> إذا كنت تريد فقط تعديل ملف الشاشة (HTML) فيكفيك **VS Code + Node.js**.
> وإذا كنت تريد ملف APK دون Android Studio فاستخدم **GitHub Actions** (الطريقة ب في القسم 4).

---

## 3) بناء ملف الشاشة (HTML)

افتح المجلد في VS Code، ثم من القائمة **Terminal ← New Terminal** اكتب:

```bash
npm install          # مرة واحدة فقط: ينزّل أدوات البناء والخطوط
npm run build:min    # يبني dist/index.html (ونسخة لوحة التحكم ونسخة الخادم)
```

- النتيجة: `dist/index.html` — افتحه بمتصفح Chrome لتجربته، أو انسخه إلى فلاشة وافتحه في التلفاز.
- `npm run build` يبني نسخة غير مضغوطة أسهل في تتبّع الأخطاء.
- لوحة التحكم التجريبية: افتح `demo/dashboard-demo.html` في المتصفح.

---

## 4) بناء ملف APK للتلفاز

### الطريقة أ — Android Studio
1. ابنِ ملف الشاشة أولًا (القسم 3)، لأن التطبيق يحمل `dist/index.html` داخله.
   (مهمة `copyWeb` في Gradle تنسخه إلى `android/app/src/main/assets/www/` تلقائيًا قبل كل بناء.)
2. افتح Android Studio ← **Open** ← اختر مجلد **`android`** (وليس المجلد الرئيسي).
3. انتظر حتى ينتهي «Gradle Sync». في المرة الأولى ينزّل Gradle وأدوات أندرويد (يحتاج إنترنت)، وقد يطلب تثبيت **Android SDK 36** — وافق.
4. من **Build ← Select Build Variant** اختر:
   - `directDebug` للتجربة على جهازك (فيه التحديث من داخل التطبيق).
   - `playRelease` للنشر على Google Play.
5. **Build ← Build App Bundle(s) / APK(s) ← Build APK(s)**.
   الملف يظهر في `android/app/build/outputs/apk/…`.
6. للتثبيت على التلفاز: انقل الملف بفلاشة، أو فعّل «تصحيح أخطاء USB/الشبكة» في التلفاز وشغّل من Android Studio مباشرة (زر ▶).

### الطريقة ب — GitHub Actions (دون تثبيت أي شيء)
1. أنشئ مستودعًا خاصًا (Private) على GitHub وارفع هذا المجلد كاملًا إليه.
2. من تبويب **Actions** شغّل **Build & deploy**.
3. بعد دقائق تجد ملف APK في صفحة **Releases** بالمستودع.

### التوقيع للنشر على Google Play
- أنشئ مفتاح التوقيع مرة واحدة على جهازك:
  `keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias hayya`
- **احفظ الملف `release.jks` وكلمة المرور في مكان آمن ولا ترسلهما لأحد** — بدونه لا يمكن تحديث التطبيق في المتجر.
- في GitHub ← Settings ← Secrets أضف: `KEYSTORE_BASE64` و`KEYSTORE_PASSWORD` و`KEY_ALIAS` و`KEY_PASSWORD`، فيخرج ملف AAB موقّعًا.
- اسم الحزمة المعتمد: **`com.hayya.masjidtv1`** (في `android/app/build.gradle`) — لا يُغيَّر بعد النشر.

---

## 5) تشغيل لوحة التحكم والخادم

- **على Cloudflare** (الموصى به، مجاني): الخطوات كاملة في `DEPLOY.md`. باختصار: أضف `CLOUDFLARE_API_TOKEN` في أسرار GitHub، وشغّل **Build & deploy**، فيُنشأ الخادم وقاعدة البيانات ولوحة التحكم تلقائيًا.
- **على جهازك للتجربة**:
  ```bash
  npm run build:min
  node server/node-server.cjs        # ثم افتح http://localhost:8787
  ```
- رسائل رمز الدخول (OTP): اختر مزوّد الرسائل في `SMS_PROVIDER` (تقنيات / Twilio / Webhook) — التفاصيل في `DEPLOY.md`.

---

## 6) أين تعدّل الأشياء الشائعة

| تريد تغيير… | الملف |
|---|---|
| القيم الافتراضية (المدينة، أم القرى، الخطوط، العدّاد، العلم، الثيم…) | `src/core.js` ← `DEFAULTS` |
| تطبيق قيم جديدة على الشاشات المثبّتة سابقًا | `src/core.js` ← دالة `migrate` (رقم `defV`) |
| رقم الإصدار | `src/app.js` ← `APP_VERSION`، و`android/app/build.gradle` ← `versionName` |
| نصوص المناسبات | `tools/islambook/occasions.py` ثم `occgen.py` (يتحقق من الآيات) |
| مكتبة الأذكار وتخريجها | `tools/islambook/sources.py` ثم `gen.py` |
| القوالب والألوان والخطوط | `src/data.js` ← `TEMPLATES` و`FONTS` |
| شكل الشاشة (CSS) | `src/style.css`، وصفحات الإعدادات `src/settings.css` |
| صلاحيات التطبيق والتشغيل التلقائي | `android/app/src/main/java/com/hayya/masjidtv/MainActivity.java` و`AndroidManifest.xml` |
| الخطط وأكواد التفعيل | `server/worker.js` ← `planOf` و`redeemCode` |

بعد أي تعديل في `src/`: شغّل `npm run build:min`، ثم ابنِ APK من جديد.

---

## 7) ملاحظات
- لا توجد مكتبات خارجية في تطبيق أندرويد؛ كل الشاشة تعمل داخل WebView، فالمواقيت تُحسب دون إنترنت.
- أسرار الخادم ومفاتيح الرسائل ومفتاح التوقيع لا تُكتب في الكود أبدًا؛ تُوضع في أسرار GitHub أو Cloudflare.
- أصوات الأذان بأصوات المؤذنين غير مضمّنة (حقوقها لأصحابها)؛ تُضاف من الإعدادات كملف MP3.
