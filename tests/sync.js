// Mandatory passcode, encrypted sync to a real sync.php (PHP's built-in server) and Transactions pagination.
// Uses only fictional data. Run: NODE_PATH=$(npm root -g) node tests/sync.js
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const { launch, ok, done, ROOT, PASS, loadDemo } = require('./lib');

const site = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-site-'));
for (const f of ['index.html', 'robots.txt', 'version.json', 'sw.js', 'manifest.webmanifest']) fs.copyFileSync(path.join(ROOT, f), path.join(site, f));
for (const d of ['css', 'js', 'assets', 'vendor']) fs.cpSync(path.join(ROOT, d), path.join(site, d), { recursive: true });
fs.mkdirSync(path.join(site, 'server')); fs.copyFileSync(path.join(ROOT, 'deploy/php/sync.php'), path.join(site, 'server/sync.php'));
const PORT = 8123 + Math.floor(Math.random() * 500), BASE = `http://127.0.0.1:${PORT}/`;
const php = cp.spawn('php', ['-S', `127.0.0.1:${PORT}`, '-t', site], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } });
const post = async (body) => { const r = await fetch(BASE + 'server/sync.php', { method: 'POST', body: JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => null) }; };

(async () => {
  await new Promise(r => setTimeout(r, 1200));
  const A = await launch(), a = A.page;
  console.log('Mandatory passcode');
  await a.goto(BASE + 'index.html', { waitUntil: 'load' }); // lib passes the gate
  // A brand-new browser must see the gate before any data screen, so test it with a second context and no auto-pass.
  const G = await launch({ noGate: true }), g = G.page;
  await g.goto(BASE + 'index.html'); await g.waitForSelector('#gate:not([hidden])');
  ok((await g.textContent('#main')).trim() === '', 'a new browser shows the create-passcode gate and no app');
  await g.fill('#gpw1', 'short'); await g.fill('#gpw2', 'short'); await g.click('#gatego'); await g.waitForFunction(() => document.getElementById('gateerr').textContent.length > 0);
  ok(/at least 10/.test(await g.textContent('#gateerr')), 'a short passcode is refused');
  await g.fill('#gpw1', PASS); await g.fill('#gpw2', 'something else entirely'); await g.click('#gatego'); await g.waitForFunction(() => /match/.test(document.getElementById('gateerr').textContent));
  ok(/do not match/.test(await g.textContent('#gateerr')), 'mismatched passcodes are refused');
  await g.reload(); await g.waitForSelector('#gate:not([hidden])');
  ok(await g.isVisible('#gate'), 'reloading without a passcode shows the gate again');
  await G.browser.close();

  ok((await post({ a: 'info' })).j.exists === false, 'a new browser with no data does not claim the server');
  console.log('Settings');
  await a.click('[data-act=settings]'); await a.waitForSelector('.setp');
  ok(!(await a.$('[data-act=offlock]')), 'no Turn off passcode button');
  ok(!(await a.$('[data-v=s-accountsandcards]')) && !/Accounts and cards/.test(await a.textContent('.setp')), 'accounts and cards are no longer in Settings');
  ok(await a.isVisible('.snav'), 'settings has a section list');

  console.log('Pagination');
  await loadDemo(a);
  await a.click('#tabs [data-v=tx]'); await a.click('.bar .pill:has-text("All time")'); await a.waitForSelector('.pager');
  const first = await a.textContent('#txrows .txr .ds b');
  const rows1 = await a.$$eval('#txrows .txr', e => e.length);
  ok(rows1 === 50, 'first page shows 50 rows (' + rows1 + ')');
  await a.click('[data-act=pgnext]'); await a.waitForTimeout(200);
  ok(/Page 2 of/.test(await a.textContent('.pager')) && (await a.textContent('#txrows .txr .ds b')) !== first, 'Next moves to page 2');
  await a.selectOption('[data-change=perpage]', '100'); await a.waitForTimeout(200);
  ok((await a.$$eval('#txrows .txr', e => e.length)) === 100 && /Page 1 of/.test(await a.textContent('.pager')), 'rows per page can be changed');
  await a.click('[data-act=pgnext]'); await a.fill('#q', 'zzzzqqq'); await a.waitForTimeout(300);
  ok(!(await a.$('.pager')), 'searching returns to the first page');
  await a.fill('#q', '');

  console.log('Portfolio');
  const tabs = await a.$$eval('#tabs [data-v]', e => e.map(x => x.dataset.v));
  ok(tabs[0] === 'overview' && tabs[1] === 'bal', 'Portfolio comes right after Overview');
  await a.click('#tabs [data-v=bal]'); await a.waitForSelector('.lr'); await a.click('.mng summary');
  ok(/Manage accounts and cards/.test(await a.textContent('#main')) && (await a.$('#main input[data-change=aname]')) !== null, 'accounts and cards are managed on Portfolio');

  console.log('Sync to a real sync.php');
  // Sync turns itself on once there is data and the server is empty. Loading the demo data above is that first data.
  for (let k = 0; k < 40 && !(await post({ a: 'info' })).j.exists; k++) await new Promise(r => setTimeout(r, 500));
  await a.click('[data-act=settings]'); await a.waitForSelector('[data-act=syncnow]', { timeout: 30000 });
  ok(/On/.test(await a.textContent('#syncst')), 'sync switched itself on once there was data and the server was empty');
  ok(/Synced/.test(await a.textContent('#sidefoot')) && (await a.$('#sidefoot [data-act=locknow]')) !== null, 'the side panel shows sync status and a Lock button');
  const info = (await post({ a: 'info' })).j;
  ok(info.exists && info.rev >= 1, 'the first push is on the server (revision ' + info.rev + ')');
  for (let k = 0; k < 40 && !(fs.existsSync(path.join(site, 'server/data/blob.php')) && fs.statSync(path.join(site, 'server/data/blob.php')).size > 1000); k++) await new Promise(r => setTimeout(r, 250));
  const stored = fs.readFileSync(path.join(site, 'server/data/blob.php'), 'utf8').split('\n').slice(1).join('\n');
  { // Search the decoded bytes, not the base64 text: a short word can appear in random base64 by chance.
    const bl = JSON.parse(stored), raw = Buffer.from(bl.ct, 'base64'), words = ['SWIGGY', 'SALARY', 'Aarav', 'Meera', 'Anaya', 'HDFC', '"tx"', '"desc"'];
    ok(raw.length > 1000 && !words.some(w => raw.includes(w)) && !words.some(w => Object.keys(bl).concat(Object.keys(bl.lock)).includes(w)), 'the file on the server is ciphertext, none of the data is readable');
    ok(Object.keys(bl).sort().join() === 'ct,enc,format,iv,lock', 'the stored object has only ciphertext, iv and the key parameters');
  }
  const meta = fs.readFileSync(path.join(site, 'server/data/meta.php'), 'utf8');
  ok(meta.startsWith('<?php http_response_code(404)') && !meta.includes(PASS) && /"hash":"[0-9a-f]{64}"/.test(meta), 'the server keeps only a hash of the token, never the passcode');
  ok(fs.existsSync(path.join(site, 'server/data/.htaccess')), 'the data folder is closed to the web');
  for (const f of ['blob.php', 'meta.php']) ok((await fetch(BASE + 'server/data/' + f)).status === 404, 'server/data/' + f + ' answers 404 even without .htaccess');
  ok((await post({ a: 'pull', token: '0'.repeat(64) })).s === 403, 'pulling with a wrong token is refused');
  ok((await post({ a: 'push', token: 'f'.repeat(64), base: 1, blob: { ct: 'x', iv: 'y', lock: { salt: 's', iter: 1 } } })).s === 403, 'pushing with a wrong token is refused');
  ok((await post({ a: 'pull', token: 'zz' })).s === 400, 'a malformed token is rejected');

  console.log('A second device restores from the server');
  const B = await launch({ noGate: true }), b = B.page;
  await b.goto(BASE + 'index.html'); await b.waitForSelector('#gate:not([hidden])');
  await b.fill('#gpw1', 'not the passcode at all'); await b.click('#gatefetch'); await b.waitForTimeout(2500);
  ok(/Wrong passcode/.test(await b.textContent('#gateerr')) && await b.isVisible('#gate'), 'wrong passcode cannot restore from the server');
  await b.fill('#gpw1', PASS); await b.click('#gatefetch'); await b.waitForSelector('#gate', { state: 'hidden', timeout: 30000 });
  await b.waitForTimeout(500);
  await b.click('#tabs [data-v=tx]'); await b.click('.bar .pill:has-text("All time")'); await b.waitForSelector('#txrows .txr');
  ok((await b.textContent('#txsum')).replace(/\D+/g, ' ').trim().length > 0 && (await b.$$eval('#txrows .txr', e => e.length)) > 0, 'device B shows the same transactions after entering the passcode');
  await b.click('[data-act=settings]'); await b.waitForSelector('.setp');
  ok(/On/.test(await b.textContent('#syncst')), 'device B has sync switched on');

  console.log('Conflicts are never overwritten silently');
  // B saves a change and pushes; A (still on revision 1) then changes something and must be asked.
  await b.click('#tabs [data-v=tx]'); await b.waitForSelector('#txrows .txr'); await b.click('#txrows .txr .tx'); await b.waitForSelector('select[data-change=cat]');
  const cur = await b.inputValue('select[data-change=cat]'); await b.selectOption('select[data-change=cat]', cur === 'Dining' ? 'Groceries' : 'Dining');
  await b.waitForTimeout(12000);
  ok((await post({ a: 'info' })).j.rev >= 2, 'device B pushed its change to the server');
  const revBefore = (await post({ a: 'info' })).j.rev;
  await a.click('#tabs [data-v=tx]'); await a.waitForSelector('#txrows .txr'); await a.click('#txrows .txr .tx'); await a.waitForSelector('select[data-change=cat]');
  const curA = await a.inputValue('select[data-change=cat]'); await a.selectOption('select[data-change=cat]', curA === 'Shopping' ? 'Fuel' : 'Shopping');
  await a.waitForSelector('[data-act=syncpull]', { timeout: 15000 });
  ok(/newer data/i.test(await a.textContent('#modal')), 'device A is asked what to do instead of overwriting');
  {const r = (await post({ a: 'info' })).j.rev; ok(r === revBefore, 'the server copy was not overwritten (' + revBefore + ' -> ' + r + ')');}
  await a.click('[data-act=syncpull]'); await a.waitForTimeout(1500);
  ok(!(await a.isVisible('#modal .sheet')), 'using the server copy closes the dialog');

  console.log('Passcode change keeps sync working');
  await a.click('[data-act=settings]'); await a.waitForSelector('[data-act=chglock]'); await a.click('[data-act=chglock]');
  await a.fill('#pwc', PASS); await a.fill('#pw1', 'another long fictional passcode'); await a.fill('#pw2', 'another long fictional passcode'); await a.click('#secgo');
  await a.waitForSelector('#modal', { state: 'hidden', timeout: 40000 }).catch(() => {});
  await a.waitForTimeout(1500);
  const info3 = (await post({ a: 'info' })).j;
  ok(info3.rev >= 3, 'the new passcode was pushed to the server (revision ' + info3.rev + ')');

  A.errors = A.errors.filter(e => !/Service Worker|status of 409/i.test(e));
  // An older install keeps sync.php next to index.html: it must still work and keep its data in sync-data/.
  fs.copyFileSync(path.join(ROOT, 'deploy/php/sync.php'), path.join(site, 'sync.php'));
  const old = await fetch(BASE + 'sync.php', { method: 'POST', body: JSON.stringify({ a: 'pull', tok: 'x' }) });
  ok((old.headers.get('content-type') || '').includes('json') && fs.existsSync(path.join(site, 'sync-data')), 'the old layout (sync.php beside index.html) still answers and uses sync-data/');
  await B.browser.close(); php.kill();
  await done(A);
})().catch(e => { console.error(e); php.kill(); process.exit(1); });
