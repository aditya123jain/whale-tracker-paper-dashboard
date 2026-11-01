const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 10000;
const TOKEN = process.env.PUSH_TOKEN || '';
const DISK = process.env.STATE_FILE || '/tmp/state.json';
const MAX_BODY = 2 * 1024 * 1024;
let latest = null; // {received_at, data}
try { latest = JSON.parse(fs.readFileSync(DISK, 'utf8')); } catch (e) {}
const html = fs.readFileSync(path.join(__dirname, "index.html"));

function tokenOk(req) {
  if (!TOKEN) return false;
  const got = Buffer.from(String(req.headers['x-push-token'] || ''));
  const want = Buffer.from(TOKEN);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
function send(res, code, body, type) {
  res.writeHead(code, { 'content-type': type || 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
  res.end(body);
}

http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (req.method === 'GET' && (url === '/' || url === '/index.html')) return send(res, 200, html, 'text/html; charset=utf-8');
  if (req.method === 'GET' && url === '/healthz') return send(res, 200, '{"ok":true}');
  if (req.method === 'GET' && url === '/api/state') {
    if (!latest) return send(res, 404, JSON.stringify({ error: 'no data pushed yet' }));
    return send(res, 200, JSON.stringify(latest));
  }
  if (req.method === 'POST' && url === '/api/state') {
    if (!tokenOk(req)) return send(res, 401, JSON.stringify({ error: 'unauthorized' }));
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { send(res, 413, '{"error":"too large"}'); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (res.writableEnded) return;
      try {
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!data || typeof data !== 'object' || data.error) return send(res, 400, '{"error":"bad payload"}');
        latest = { received_at: new Date().toISOString(), data };
        try { fs.writeFileSync(DISK, JSON.stringify(latest)); } catch (e) {}
        send(res, 200, '{"ok":true}');
      } catch (e) { send(res, 400, '{"error":"invalid json"}'); }
    });
    return;
  }
  send(res, 404, '{"error":"not found"}');
}).listen(PORT, '0.0.0.0', () => console.log('listening on ' + PORT));
