// Builds dist/index.html — one self-contained file (fonts embedded, works offline)
const fs = require('fs'), path = require('path');
const esbuild = require('esbuild');
const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const fsrc = path.join(__dirname, 'node_modules/@fontsource');
const fonts = [['cairo', 'Cairo', [400, 700, 800]], ['tajawal', 'Tajawal', [400, 700, 800]], ['noto-kufi-arabic', 'Noto Kufi Arabic', [400, 700, 800]], ['reem-kufi', 'Reem Kufi', [400, 700]], ['amiri', 'Amiri', [400, 700]], ['orbitron', 'Orbitron', [700]], ['marhey', 'Marhey', [300, 400, 500, 600, 700]]];
let fcss = '';
for (const [dir, fam, ws] of fonts) for (const w of ws) for (const sub of ['arabic', 'latin']) {
  const f = path.join(fsrc, dir, 'files', `${dir}-${sub}-${w}-normal.woff2`);
  if (!fs.existsSync(f)) continue;
  const range = sub === 'arabic' ? 'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC' : 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
  fcss += `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${fs.readFileSync(f).toString('base64')}) format('woff2');unicode-range:${range}}\n`;
  // Marhey: also one family per weight ("Marhey 300" …) so the user can pick a weight for the whole screen
  if (dir === 'marhey') fcss += `@font-face{font-family:'${fam} ${w}';font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,${fs.readFileSync(f).toString('base64')}) format('woff2');unicode-range:${range}}\n`;
}
const qr = fs.readFileSync(path.join(__dirname, 'node_modules/qrcode-generator/dist/qrcode.js'), 'utf8').replace(/\(function \(factory\)[\s\S]*$/, '');
const SERVER = (process.env.HAYYA_SERVER || '').replace(/\/+$/, '');
const js = [qr, ...['engine.js', 'islambook-lib.js', 'azkar-lib.js', 'data.js', 'flag-names.js', 'flags.js', 'core.js', 'view.js', 'extras.js', 'ui.js', 'cloud.js', 'app.js'].map(src)].join('\n;\n')
  .replace("if (typeof module !== 'undefined') module.exports = PT;", '').replace('@@HAYYA_SERVER@@', SERVER || '@@HAYYA_SERVER@@');
const out = esbuild.transformSync(js, { target: 'chrome61', minify: process.argv.includes('--min'), legalComments: 'none', charset: 'utf8' }).code;
const css = esbuild.transformSync(src('style.css') + src('settings.css'), { loader: 'css', target: 'chrome61', minify: true }).code;
let html = src('index.tpl.html').replace('/*FONTS*/', () => fcss).replace('/*CSS*/', () => css).replace('/*JS*/', () => out.replace(/<\/script/gi, '<\\/script'));
const write = (rel, text) => { const f = path.join(__dirname, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); console.log(rel, (text.length / 1024).toFixed(0) + ' KB'); };
write('dist/index.html', html);
// the same screen app, served by the server at /app/ (finds the server from its own address)
write('server/public/app/index.html', html.split(SERVER || '@@nothing@@').join('@@HAYYA_SERVER@@'));

/* ---- dashboard ---- */
const dsrc = f => fs.readFileSync(path.join(__dirname, 'dashboard', f), 'utf8');
const djs = [qr, ...['engine.js', 'islambook-lib.js', 'azkar-lib.js', 'data.js', 'flag-names.js', 'core.js', 'view.js', 'extras.js', 'ui.js'].map(src), dsrc('stamp.js'), dsrc('dash.js')].join('\n;\n').replace("if (typeof module !== 'undefined') module.exports = PT;", '');
const dout = esbuild.transformSync(djs, { target: 'chrome90', minify: process.argv.includes('--min'), legalComments: 'none', charset: 'utf8' }).code;
const cdCss = src('style.css').split('/* countdown widgets */')[1].split('/* gallery */')[0];
const dcss = esbuild.transformSync(dsrc('dash.css') + cdCss, { loader: 'css', minify: true }).code;
write('server/public/index.html', dsrc('index.tpl.html').replace('/*CSS*/', () => dcss).replace('/*JS*/', () => dout.replace(/<\/script/gi, '<\\/script')));

/* ---- public preview (dashboard with an in-browser demo backend) ---- */
const demoJs = esbuild.transformSync([qr, ...['engine.js', 'islambook-lib.js', 'azkar-lib.js', 'data.js', 'flag-names.js', 'core.js', 'view.js', 'extras.js', 'ui.js'].map(src), dsrc('demo-mock.js'), dsrc('stamp.js'), dsrc('dash.js')].join('\n;\n').replace("if (typeof module !== 'undefined') module.exports = PT;", ''), { target: 'chrome90', minify: true, legalComments: 'none', charset: 'utf8' }).code;
write('demo/dashboard-demo.html', dsrc('index.tpl.html').replace('/*CSS*/', () => dcss).replace('/*JS*/', () => demoJs.replace(/<\/script/gi, '<\\/script')).replace('<div id="app">', '<div class="demobar">نسخة تجريبية للمعاينة — التعديلات تُحفظ في متصفحك فقط. لتجربة ربط شاشة استخدم المفتاح <b dir="ltr">48213-90576</b></div><div id="app">'));
write('demo/app.html', html);
