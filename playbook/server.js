// Playbook — private job-search command center for manwellclark.com
// Zero-dependency Node server: static files + password login + JSON storage.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || '/data';
const DATA_FILE = path.join(DATA_DIR, 'playbook.json');
const PASSWORD = process.env.PLAYBOOK_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SESSION_DAYS = 30;
const MAX_BODY = 2 * 1024 * 1024;

fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- owner password: env var, or set once in the browser ----------
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
function readAuth() { try { return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')); } catch { return null; } }
function hashPw(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
function checkPassword(pw) {
  if (typeof pw !== 'string' || !pw) return false;
  if (PASSWORD) return pw.length === PASSWORD.length && crypto.timingSafeEqual(Buffer.from(pw), Buffer.from(PASSWORD));
  const a = readAuth(); if (!a) return false;
  const h = Buffer.from(hashPw(pw, a.salt), 'hex'), want = Buffer.from(a.hash, 'hex');
  return h.length === want.length && crypto.timingSafeEqual(h, want);
}
function needsSetup() { return !PASSWORD && !readAuth(); }
const SETUP_CODE = crypto.randomBytes(4).toString('hex').toUpperCase();
if (needsSetup()) console.log(`[playbook] FIRST-RUN SETUP CODE: ${SETUP_CODE}  (enter it at the site to choose your password)`);

// ---------- automation key for n8n (env, or generated once and stored) ----------
const KEY_FILE = path.join(DATA_DIR, 'automation-key.txt');
let AUTOMATION_KEY = process.env.AUTOMATION_KEY || '';
if (!AUTOMATION_KEY) {
  try { AUTOMATION_KEY = fs.readFileSync(KEY_FILE, 'utf8').trim(); } catch {
    AUTOMATION_KEY = crypto.randomBytes(24).toString('base64url');
    fs.writeFileSync(KEY_FILE, AUTOMATION_KEY, { mode: 0o600 });
  }
}
console.log('[playbook] automation key is stored in ' + KEY_FILE + ' (view it from the Coolify terminal; not printed here)');
function keyOk(req) {
  const k = req.headers['x-playbook-key'] || '';
  return k.length === AUTOMATION_KEY.length && crypto.timingSafeEqual(Buffer.from(k), Buffer.from(AUTOMATION_KEY));
}

// ---------- USA remote only ----------
const NON_US = /\b(canada|uk|united kingdom|europe|emea|apac|latam|india|mexico|brazil|germany|france|spain|poland|philippines|australia|singapore|japan|ireland|netherlands|israel|south africa|nigeria|pakistan|argentina|colombia)\b/i;
function usRemote(l) {
  const loc = String(l.location || ''), where = loc + ' ' + String(l.title || '');
  if (/\b(on-?site|hybrid|in[- ]office)\b/i.test(where)) return false;
  if (!loc) return false; // automation must say where the job can be done
  if (NON_US.test(loc) && !/\b(us|usa|united states)\b/i.test(loc)) return false;
  return /\b(us|usa|u\.s\.|united states|remote)\b/i.test(loc);
}

// ---------- storage ----------
function readState() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return null; }
}
function writeState(state) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, DATA_FILE);
  // keep a rolling daily backup
  const day = new Date().toISOString().slice(0, 10);
  const bak = path.join(DATA_DIR, `backup-${day}.json`);
  if (!fs.existsSync(bak)) fs.copyFileSync(DATA_FILE, bak);
}

// ---------- sessions (signed cookie) ----------
function sign(v) { return crypto.createHmac('sha256', SECRET).update(v).digest('base64url'); }
function makeToken() {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const v = `u.${exp}`;
  return `${v}.${sign(v)}`;
}
function validToken(t) {
  if (!t) return false;
  const i = t.lastIndexOf('.');
  if (i < 0) return false;
  const v = t.slice(0, i), sig = t.slice(i + 1);
  const good = sign(v);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return false;
  return Number(v.split('.')[1]) > Date.now();
}
function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function authed(req) { return validToken(cookies(req).pb_session); }

// simple login throttle
const attempts = new Map();
function throttled(ip) {
  const a = attempts.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - a.t > 15 * 60e3) { a.n = 0; a.t = Date.now(); }
  attempts.set(ip, a);
  return a.n >= 10;
}

// ---------- helpers ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon' };
function send(res, code, body, headers = {}) {
  res.writeHead(code, Object.assign({ 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' }, headers));
  res.end(body);
}
function json(res, code, obj, headers = {}) { send(res, code, JSON.stringify(obj), Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, headers)); }
function body(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
function serveFile(res, rel) {
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    send(res, 200, data, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': rel.endsWith('.html') ? 'no-cache' : 'public, max-age=3600' });
  });
}

// ---------- routes ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const secure = (req.headers['x-forwarded-proto'] || '') === 'https';
  try {
    if (p === '/healthz') return send(res, 200, 'ok');
    if (p === '/robots.txt') return send(res, 200, 'User-agent: *\nDisallow: /\n', { 'Content-Type': 'text/plain' });

    if (p === '/api/login' && req.method === 'POST') {
      if (throttled(ip)) return json(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
      const { password } = JSON.parse(await body(req) || '{}');
      const ok = checkPassword(password);
      if (!ok) { attempts.get(ip).n++; return json(res, 401, { error: 'Wrong password.' }); }
      attempts.delete(ip);
      return json(res, 200, { ok: true }, { 'Set-Cookie': `pb_session=${makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}` });
    }
    if (p === '/api/logout' && req.method === 'POST') {
      return json(res, 200, { ok: true }, { 'Set-Cookie': 'pb_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
    }
    if (p === '/api/session') return json(res, 200, { authed: authed(req), needsSetup: needsSetup() });

    if (p === '/api/setup' && req.method === 'POST') {
      if (!needsSetup()) return json(res, 409, { error: 'Already set up.' });
      if (throttled(ip)) return json(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
      const { code, password } = JSON.parse(await body(req) || '{}');
      if (String(code || '').trim().toUpperCase() !== SETUP_CODE) { attempts.get(ip).n++; return json(res, 401, { error: 'Setup code is wrong. Find it in the Coolify logs for this app.' }); }
      if (typeof password !== 'string' || password.length < 10) return json(res, 400, { error: 'Use at least 10 characters.' });
      const salt = crypto.randomBytes(16).toString('hex');
      fs.writeFileSync(AUTH_FILE, JSON.stringify({ salt, hash: hashPw(password, salt), createdAt: new Date().toISOString() }), { mode: 0o600 });
      return json(res, 200, { ok: true }, { 'Set-Cookie': `pb_session=${makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}` });
    }

    // n8n / automation: push job leads in (header X-Playbook-Key)
    if (p === '/api/leads' && req.method === 'POST') {
      if (!keyOk(req)) return json(res, 401, { error: 'Bad automation key' });
      const incoming = JSON.parse(await body(req) || '{}');
      const list = Array.isArray(incoming.leads) ? incoming.leads : [];
      const state = readState() || { rev: 0 };
      state.leads = state.leads || [];
      const seen = new Set(state.leads.map(l => l.id || l.url));
      let added = 0, rejected = 0;
      list.slice(0, 200).forEach(l => {
        if (!l || !l.title || !l.url) return;
        if (!usRemote(l)) { rejected++; return; }
        const id = String(l.id || l.url).slice(0, 300);
        if (seen.has(id)) return;
        seen.add(id); added++;
        state.leads.push({ id, title: String(l.title).slice(0, 200), company: String(l.company || '').slice(0, 120), family: String(l.family || '').slice(0, 60),
          salary: String(l.salary || '').slice(0, 60), posted: String(l.posted || '').slice(0, 20), source: String(l.source || 'n8n').slice(0, 40),
          url: String(l.url).slice(0, 1000), location: String(l.location || 'Remote (US)').slice(0, 80), fit: Math.max(0, Math.min(100, Number(l.fit) || 0)) || undefined, why: String(l.why || '').slice(0, 600), addedAt: new Date().toISOString() });
      });
      state.rev = (state.rev || 0) + 1; state.savedAt = new Date().toISOString();
      writeState(state);
      return json(res, 200, { added, rejected, total: state.leads.length });
    }
    if (p === '/api/digest' && req.method === 'GET') {
      if (!keyOk(req)) return json(res, 401, { error: 'Bad automation key' });
      const st = readState() || {};
      return json(res, 200, { applications: (st.applications || []).length, outreach: (st.outreach || []).length,
        openLeads: (st.leads || []).filter(l => !l.dismissed && !l.tracked).length, savedAt: st.savedAt || null });
    }

    if (p === '/api/state') {
      if (!authed(req)) return json(res, 401, { error: 'Sign in first.' });
      if (req.method === 'GET') return json(res, 200, { state: readState() });
      if (req.method === 'PUT') {
        const incoming = JSON.parse(await body(req));
        if (!incoming || typeof incoming !== 'object' || !incoming.state) return json(res, 400, { error: 'Bad payload' });
        const current = readState();
        if (current && incoming.baseRev != null && current.rev !== incoming.baseRev) {
          return json(res, 409, { error: 'Changed on another device', state: current });
        }
        const next = incoming.state;
        next.rev = (current && current.rev || 0) + 1;
        next.savedAt = new Date().toISOString();
        writeState(next);
        return json(res, 200, { rev: next.rev, savedAt: next.savedAt });
      }
      return json(res, 405, { error: 'Method not allowed' });
    }

    // static
    if (p === '/' || p === '/index.html') return serveFile(res, 'index.html');
    return serveFile(res, p.slice(1));
  } catch (e) {
    console.error(e);
    json(res, 500, { error: 'Server error' });
  }
});

server.listen(PORT, () => console.log(`[playbook] listening on :${PORT}, data in ${DATA_FILE}`));
