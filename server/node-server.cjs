/* Self-hosted server: same code as the Cloudflare Worker, running on Node 22+.
   node server/node-server.cjs            → http://localhost:8787
   PORT=80 DATA_DIR=/var/hayya node server/node-server.cjs
   Env: APK_URL, PLAY_URL, SIGNUP_CODE (optional) */
const http = require('http'), fs = require('fs'), path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
const PUBLIC = path.join(__dirname, 'public');
fs.mkdirSync(path.join(DATA, 'media'), { recursive: true });

/* D1-compatible wrapper over node:sqlite */
const sqlite = new DatabaseSync(path.join(DATA, 'hayya.db'));
sqlite.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
const clean = a => a.map(v => (v === undefined ? null : v));
const stmt = (sql, args = []) => ({
  bind: (...a) => stmt(sql, a),
  first: async () => { const r = sqlite.prepare(sql).get(...clean(args)); return r ? { ...r } : null; },
  all: async () => ({ results: sqlite.prepare(sql).all(...clean(args)).map(r => ({ ...r })) }),
  run: async () => { const r = sqlite.prepare(sql).run(...clean(args)); return { meta: { changes: r.changes } }; },
});
const DB = { prepare: sql => stmt(sql) };

/* KV-compatible media store on disk */
const safe = id => id.replace(/[^a-z0-9_]/gi, '');
const MEDIA = {
  async put(id, buf, opt = {}) { fs.writeFileSync(path.join(DATA, 'media', safe(id)), Buffer.from(buf)); fs.writeFileSync(path.join(DATA, 'media', safe(id) + '.json'), JSON.stringify(opt.metadata || {})); },
  async getWithMetadata(id) {
    const f = path.join(DATA, 'media', safe(id)); if (!fs.existsSync(f)) return null;
    const b = fs.readFileSync(f); return { value: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), metadata: JSON.parse(fs.readFileSync(f + '.json', 'utf8')) };
  },
};

/* static files with SPA fallback */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.apk': 'application/vnd.android.package-archive', '.ico': 'image/x-icon' };
const ASSETS = {
  async fetch(req) {
    const u = new URL(req.url); let f = path.normalize(path.join(PUBLIC, decodeURIComponent(u.pathname)));
    if (!f.startsWith(PUBLIC)) return new Response('Forbidden', { status: 403 });
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) f = path.join(PUBLIC, 'index.html');
    return new Response(fs.readFileSync(f), { headers: { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' } });
  },
};

const pick = ['APK_URL', 'PLAY_URL', 'SIGNUP_CODE', 'SMS_PROVIDER', 'TAQNYAT_TOKEN', 'TAQNYAT_SENDER', 'TWILIO_SID', 'TWILIO_TOKEN', 'TWILIO_FROM', 'SMS_WEBHOOK_URL', 'SMS_WEBHOOK_TOKEN', 'OTP_SECRET', 'DEFAULT_COUNTRY_CODE', 'ALLOWED_PHONES', 'DEV_SHOW_CODE', 'ADMIN_PHONES', 'PRICE_TEXT', 'SALES_CONTACT', 'TRIAL_DAYS'];
const env = { DB, MEDIA, ASSETS };
for (const k of pick) env[k] = process.env[k] || '';
// without an SMS provider (local testing) the login code is printed here in the console
if (!env.SMS_PROVIDER && !env.DEV_SHOW_CODE) { env.DEV_SHOW_CODE = '1'; console.log('SMS_PROVIDER not set: login codes will be printed here (testing mode).'); }

(async () => {
  const worker = (await import('./worker.js')).default;
  http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const host = req.headers.host || 'localhost';
    const request = new Request(`http://${host}${req.url}`, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
    try {
      const r = await worker.fetch(request, env);
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  }).listen(+process.env.PORT || 8787, () => console.log('Hayya server on http://localhost:' + (process.env.PORT || 8787)));
})();
