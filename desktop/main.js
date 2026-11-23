// Portfolio desktop: the same web app in its own window. Files are served from app:// (a secure scheme, so encryption and
// storage work as in a browser). The window has no network of its own; the only outside calls are to the server address
// you set in Settings (your own site), made here and limited to sync.php.
const { app, BrowserWindow, protocol, ipcMain, shell, Menu, session } = require('electron');
const fs = require('fs'), path = require('path');
const { resolveFile, mimeOf, normalizeServer, CALLABLE, callUrls } = require('./serve');

const ROOT = path.join(__dirname, 'app');
const RELEASES = 'https://github.com/Jackpison/Indian-Finance-Tracker/releases/latest';
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

const cfgFile = () => path.join(app.getPath('userData'), 'server.json');
let server = '';
const loadCfg = () => { try { server = normalizeServer(JSON.parse(fs.readFileSync(cfgFile(), 'utf8')).server).url || ''; } catch (e) { server = ''; } };
const fromApp = (e) => { try { return new URL(e.senderFrame.url).protocol === 'app:'; } catch (x) { return false; } };

if (!app.requestSingleInstanceLock()) app.quit();
let win;
function create() {
  win = new BrowserWindow({ width: 1320, height: 880, minWidth: 380, minHeight: 600, backgroundColor: '#0a0c0d', autoHideMenuBar: true, title: 'Portfolio', icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false, webSecurity: true } });
  win.loadURL('app://portfolio/index.html');
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\/github\.com\/Jackpison\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://portfolio/')) e.preventDefault(); });
}
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  loadCfg();
  if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'clipboard-sanitized-write'));
  protocol.handle('app', async (req) => {
    const f = resolveFile(ROOT, new URL(req.url).pathname);
    if (!f) return new Response('Not found', { status: 404 });
    try { return new Response(await fs.promises.readFile(f), { headers: { 'content-type': mimeOf(f) } }); } catch (e) { return new Response('Not found', { status: 404 }); }
  });
  ipcMain.on('srv:get', (e) => { e.returnValue = fromApp(e) ? server : ''; });
  ipcMain.on('srv:set', (e, u) => {
    if (!fromApp(e)) { e.returnValue = { ok: false, error: 'Not allowed' }; return; }
    const r = normalizeServer(u);
    if (r.ok) { try { fs.writeFileSync(cfgFile(), JSON.stringify({ server: r.url })); server = r.url; } catch (x) { e.returnValue = { ok: false, error: 'Could not save the address' }; return; } }
    e.returnValue = r;
  });
  ipcMain.handle('srv:call', async (e, name, o) => {
    if (!fromApp(e) || !server || !CALLABLE.has(name)) return { status: 0, text: '{"error":"Not available"}' };
    const init = () => { const h = {}; let body; if (o.form) { body = new URLSearchParams(o.form).toString(); h['Content-Type'] = 'application/x-www-form-urlencoded'; } else if (o.body != null) { body = o.body; if (o.contentType) h['Content-Type'] = o.contentType; }
      return { method: o.method === 'POST' ? 'POST' : 'GET', headers: h, body, redirect: 'error', signal: AbortSignal.timeout(60000), cache: 'no-store' }; };
    let last = { status: 0, text: '{"error":"Could not reach your server"}' };
    for (const url of callUrls(server, name)) {
      try { const r = await fetch(url, init()), text = await r.text(); last = { status: r.status, text };
        if (r.status !== 404 || /json/.test(r.headers.get('content-type') || '')) return last; } catch (x) { last = { status: 0, text: '{"error":"Could not reach your server"}' }; }
    }
    return last;
  });
  ipcMain.on('open:releases', (e) => { if (fromApp(e)) shell.openExternal(RELEASES); });
  create();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) create(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
