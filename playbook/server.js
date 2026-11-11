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

if (!PASSWORD) console.warn('[playbook] PLAYBOOK_PASSWORD is not set — logins will be refused.');
fs.mkdirSync(DATA_DIR, { recursive: true });

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
      const ok = PASSWORD && typeof password === 'string' && password.length === PASSWORD.length &&
        crypto.timingSafeEqual(Buffer.from(password), Buffer.from(PASSWORD));
      if (!ok) { attempts.get(ip).n++; return json(res, 401, { error: 'Wrong password.' }); }
      attempts.delete(ip);
      return json(res, 200, { ok: true }, { 'Set-Cookie': `pb_session=${makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}` });
    }
    if (p === '/api/logout' && req.method === 'POST') {
      return json(res, 200, { ok: true }, { 'Set-Cookie': 'pb_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
    }
    if (p === '/api/session') return json(res, 200, { authed: authed(req) });

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
