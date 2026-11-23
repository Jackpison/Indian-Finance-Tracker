// Pure helpers for the desktop app (no Electron needed, so tests/desktop.js can check them).
const path = require('path');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
// Maps a URL path inside the app:// scheme to a file under root. Returns null for anything that would leave root.
function resolveFile(root, urlPath) {
  let p; try { p = decodeURIComponent(urlPath || '/'); } catch (e) { return null; }
  if (p.includes('\0')) return null;
  if (p === '/' || p === '') p = '/index.html';
  const base = path.resolve(root), full = path.resolve(base, '.' + p);
  return full.startsWith(base + path.sep) ? full : null;
}
const mimeOf = (f) => MIME[path.extname(f).toLowerCase()] || 'application/octet-stream';
// The server address typed in Settings: https only (plain http only for localhost), no query, no trailing slash.
function normalizeServer(input) {
  const t = String(input || '').trim();
  if (!t) return { ok: true, url: '' };
  let u; try { u = new URL(t); } catch (e) { return { ok: false, error: 'That is not a web address. Example: https://money.example.com' }; }
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname);
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) return { ok: false, error: 'Use an https:// address (http is allowed only for localhost).' };
  if (u.username || u.password) return { ok: false, error: 'Leave the user name and password out of the address.' };
  return { ok: true, url: (u.origin + u.pathname).replace(/\/+$/, '') };
}
// Only the sync helper is reachable from the desktop app.
const CALLABLE = new Set(['sync.php']);
const callUrls = (base, name) => [base + '/server/' + name, base + '/' + name];
module.exports = { resolveFile, mimeOf, normalizeServer, CALLABLE, callUrls };
