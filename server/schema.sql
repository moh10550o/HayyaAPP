-- Hayya Masjid TV — database schema (Cloudflare D1 / SQLite)
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, phone TEXT UNIQUE, email TEXT, name TEXT, hash TEXT, salt TEXT, created INTEGER, trial_until INTEGER, free_screen TEXT, free_at INTEGER);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, uid TEXT NOT NULL, exp INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_uid ON sessions(uid);
CREATE TABLE IF NOT EXISTS otps (phone TEXT PRIMARY KEY, code_hash TEXT, exp INTEGER, attempts INTEGER DEFAULT 0, sends INTEGER DEFAULT 0, window_start INTEGER, sent_at INTEGER);
CREATE TABLE IF NOT EXISTS screens (
  key TEXT PRIMARY KEY, secret_hash TEXT NOT NULL, owner TEXT, name TEXT,
  settings TEXT, ver INTEGER DEFAULT 0, cmds TEXT, info TEXT,
  last_seen INTEGER, created INTEGER, watch_at INTEGER, plan_until INTEGER, did TEXT
);
CREATE INDEX IF NOT EXISTS screens_owner ON screens(owner);
CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, owner TEXT, type TEXT, size INTEGER, created INTEGER);
CREATE TABLE IF NOT EXISTS backups (id TEXT PRIMARY KEY, owner TEXT NOT NULL, screen_key TEXT, screen_name TEXT, name TEXT, auto INTEGER DEFAULT 0, created INTEGER, size INTEGER, media INTEGER, settings TEXT);
CREATE INDEX IF NOT EXISTS backups_owner ON backups(owner, created);
CREATE TABLE IF NOT EXISTS limits (k TEXT PRIMARY KEY, n INTEGER, win INTEGER);
CREATE TABLE IF NOT EXISTS codes (code TEXT PRIMARY KEY, days INTEGER NOT NULL, note TEXT, created INTEGER, created_by TEXT, used_screen TEXT, used_by TEXT, used_at INTEGER, kind TEXT);
-- devices that already used the free slot (one free screen per account and per device)
CREATE TABLE IF NOT EXISTS free_devices (did TEXT PRIMARY KEY, uid TEXT, key TEXT, at INTEGER);
