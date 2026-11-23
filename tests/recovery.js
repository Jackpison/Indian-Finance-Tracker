// Recovery key and persistent unlock lockout. Fictional data only. Run: NODE_PATH=$(npm root -g) node tests/recovery.js
const { launch, URL, ok, done, PASS } = require('./lib');
(async () => {
  const h = await launch({ noGate: true }), p = h.page;
  await p.goto(URL); await p.waitForSelector('#gate:not([hidden])');
  await p.fill('#gpw1', PASS); await p.fill('#gpw2', PASS); await p.click('#gatego');
  await p.waitForSelector('#reckey', { timeout: 45000 });
  console.log('Recovery key');
  const key = (await p.textContent('#reckey')).trim();
  ok(/^([A-Z2-9]{5}-){4}[A-Z2-9]{5}$/.test(key), 'a recovery key is shown once the passcode is created (' + key.length + ' characters)');
  ok(!(await p.content()).includes(PASS), 'the passcode is not on the page');
  await p.click('[data-act=recdone]'); await p.waitForTimeout(800);
  await p.click('[data-act=settings]'); await p.waitForSelector('.setp');
  ok(/A recovery key exists/.test(await p.textContent('.setp')), 'Settings says a recovery key exists');
  const meta = await p.evaluate(() => new Promise(r => { const q = indexedDB.open('portfolio-db', 1); q.onsuccess = () => { const g = q.result.transaction('kv').objectStore('kv').get('meta'); g.onsuccess = () => r(JSON.stringify(g.result)); }; }));
  ok(!meta.includes(PASS) && !meta.includes(key) && /"rec":\{/.test(meta), 'only an encrypted copy is stored, never the passcode or the key');
  await p.reload(); await p.waitForSelector('#lock:not([hidden])');
  await p.click('#lockrec'); await p.fill('#lockpw', 'AAAAA-AAAAA-AAAAA-AAAAA-AAAAA'); await p.click('#lockgo'); await p.waitForTimeout(1500);
  ok(/recovery key is not right/.test(await p.textContent('#lockerr')) && await p.isVisible('#lock'), 'a wrong recovery key does not unlock');
  await p.fill('#lockpw', key.toLowerCase().replace(/-/g, ' ')); await p.click('#lockgo');
  await p.waitForSelector('#lock', { state: 'hidden', timeout: 30000 });
  await p.waitForSelector('#secgo', { timeout: 10000 });
  ok(true, 'the right recovery key unlocks (any case or spacing) and asks for a new passcode');
  await p.click('[data-act=close]');
  console.log('Lockout survives a reload');
  await p.reload(); await p.waitForSelector('#lock:not([hidden])');
  for (let i = 0; i < 3; i++) { await p.fill('#lockpw', 'wrong passcode ' + i); await p.click('#lockgo'); await p.waitForTimeout(1200); }
  ok(/wait \d+ s/.test(await p.textContent('#lockerr')), 'three wrong passcodes start a waiting period');
  await p.reload(); await p.waitForSelector('#lock:not([hidden])');
  await p.fill('#lockpw', PASS); await p.click('#lockgo'); await p.waitForTimeout(800);
  ok(/Try again in \d+ s/.test(await p.textContent('#lockerr')) && await p.isVisible('#lock'), 'reloading the page does not reset the waiting period, even the right passcode waits');
  await p.waitForTimeout(5500); await p.click('#lockgo');
  await p.waitForSelector('#lock', { state: 'hidden', timeout: 30000 });
  ok(true, 'after the wait the right passcode unlocks');
  await done(h);
})().catch(e => { console.error(e); process.exit(1); });
