/* One-time (and repeatable) Cloudflare setup, run by GitHub Actions before `wrangler deploy`.
   Needs env CLOUDFLARE_API_TOKEN with: Workers Scripts · Edit, D1 · Edit, Workers KV Storage · Edit,
   Account Settings · Read. Optional: CLOUDFLARE_ACCOUNT_ID, APK_URL, PLAY_URL, SIGNUP_CODE.
   Creates (or reuses) the D1 database, its tables, the KV namespace and the workers.dev subdomain,
   writes their ids into wrangler.toml and prints the dashboard URL. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!TOKEN) { console.error('CLOUDFLARE_API_TOKEN is missing (add it in GitHub → Settings → Secrets → Actions).'); process.exit(1); }
const API = 'https://api.cloudflare.com/client/v4';
async function cf(p, opt = {}) {
  const r = await fetch(API + p, { ...opt, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(opt.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!j.success) throw new Error(`${opt.method || 'GET'} ${p} → ${JSON.stringify(j.errors || j).slice(0, 400)}`);
  return j.result;
}

const WORKER = 'hayya-masjid', DB_NAME = 'hayya', KV_TITLE = 'hayya-media';
let account = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!account) {
  const list = await cf('/accounts');
  if (!list.length) throw new Error('No Cloudflare account is visible to this token.');
  account = list[0].id;
  console.log('Account:', list[0].name);
}

// D1 database + tables
let db = (await cf(`/accounts/${account}/d1/database?name=${DB_NAME}`)).find(d => d.name === DB_NAME);
if (!db) { db = await cf(`/accounts/${account}/d1/database`, { method: 'POST', body: JSON.stringify({ name: DB_NAME }) }); console.log('Created D1 database'); }
const schema = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8').replace(/--.*$/gm, '');
for (const sql of schema.split(';').map(s => s.trim()).filter(Boolean)) {
  await cf(`/accounts/${account}/d1/database/${db.uuid}/query`, { method: 'POST', body: JSON.stringify({ sql }) });
}
console.log('D1 ready:', db.uuid);

// KV namespace for images and sounds
let kv = (await cf(`/accounts/${account}/storage/kv/namespaces?per_page=100`)).find(n => n.title === KV_TITLE);
if (!kv) { kv = await cf(`/accounts/${account}/storage/kv/namespaces`, { method: 'POST', body: JSON.stringify({ title: KV_TITLE }) }); console.log('Created KV namespace'); }
console.log('KV ready:', kv.id);

// workers.dev subdomain (new accounts have none yet)
let sub = '';
try { sub = (await cf(`/accounts/${account}/workers/subdomain`)).subdomain; } catch (e) { }
if (!sub) {
  sub = 'hayya-' + Math.random().toString(36).slice(2, 8);
  await cf(`/accounts/${account}/workers/subdomain`, { method: 'PUT', body: JSON.stringify({ subdomain: sub }) });
  console.log('Created workers.dev subdomain:', sub);
}

// write ids and settings into wrangler.toml
const tomlPath = path.join(here, 'wrangler.toml');
let toml = fs.readFileSync(tomlPath, 'utf8');
toml = toml.replace(/database_id = ".*"/, `database_id = "${db.uuid}"`)
  .replace(/(\[\[kv_namespaces\]\][\s\S]*?id = )".*"/, `$1"${kv.id}"`);
if (!/^account_id/m.test(toml)) toml = toml.replace(/^main = .*$/m, m => `${m}\naccount_id = "${account}"`);
for (const k of ['APK_URL', 'PLAY_URL', 'SMS_PROVIDER', 'TAQNYAT_SENDER', 'TWILIO_FROM', 'SMS_WEBHOOK_URL', 'DEFAULT_COUNTRY_CODE', 'ALLOWED_PHONES', 'ADMIN_PHONES', 'PRICE_TEXT', 'SALES_CONTACT', 'TRIAL_DAYS'])
  if (process.env[k]) toml = toml.replace(new RegExp(`^${k} = ".*"$`, 'm'), `${k} = ${JSON.stringify(process.env[k])}`);
fs.writeFileSync(tomlPath, toml);

const url = `https://${WORKER}.${sub}.workers.dev`;
console.log('Dashboard URL:', url);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\n`);
