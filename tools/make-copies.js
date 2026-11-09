#!/usr/bin/env node
/* Makes activated copies: one activation code built into each copy of the APK (or HTML).
   Usage:
     node tools/make-copies.js hayya-tv.apk HAYYA-ABCD-EFGH-JKLM HAYYA-...      → copies/hayya-tv-HAYYA-ABCD-EFGH-JKLM.apk …
     node tools/make-copies.js hayya-tv.apk --codes codes.txt                     (one code per line, or the CSV from the dashboard)
     node tools/make-copies.js index.html  --codes codes.txt                      → HTML copies
     node tools/make-copies.js --read some-copy.apk                               → shows the code inside a copy
   The codes are generated in the dashboard: Admin → Activation codes (they must exist on the server). */
const fs = require('fs'), path = require('path');
const S = require('../dashboard/stamp.js');
const args = process.argv.slice(2);
if (!args.length) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 9).join('\n')); process.exit(1); }
if (args[0] === '--read') { console.log(S.readApkCode(new Uint8Array(fs.readFileSync(args[1]))) || '(no code)'); process.exit(0); }
const base = args[0], isHtml = /\.html?$/i.test(base);
let codes = [];
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--codes') { codes.push(...fs.readFileSync(args[++i], 'utf8').split(/\r?\n/).map(l => l.split(',')[0].trim())); }
  else codes.push(args[i]);
}
codes = codes.map(c => c.toUpperCase()).filter(c => /^HAYYA-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(c));
if (!codes.length) { console.error('No valid codes (format HAYYA-XXXX-XXXX-XXXX)'); process.exit(1); }
const out = path.join(process.cwd(), 'copies'); fs.mkdirSync(out, { recursive: true });
const src = fs.readFileSync(base), stem = path.basename(base).replace(/\.[^.]+$/, ''), ext = path.extname(base);
for (const c of codes) {
  const data = isHtml ? Buffer.from(S.stampHtml(src.toString('utf8'), c), 'utf8') : Buffer.from(S.stampApk(new Uint8Array(src), c));
  const f = path.join(out, `${stem}-${c}${ext}`); fs.writeFileSync(f, data); console.log('✓', f);
}
