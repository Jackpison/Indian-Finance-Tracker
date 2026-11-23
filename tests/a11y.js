// Accessibility scan (axe-core, WCAG 2 A/AA + best practice) of every screen in both themes. Fictional data only.
// Run: NODE_PATH=$(npm root -g) node tests/a11y.js   (add --list to print every finding)
const fs = require('fs'), path = require('path');
const { launch, URL, ok, done, loadDemo } = require('./lib');
const axeSrc = fs.readFileSync(path.join(__dirname, '../node_modules/axe-core/axe.min.js'), 'utf8');
const LIST = process.argv.includes('--list'), SEEN = new Map();
(async () => {
  const h = await launch({ bypassCSP: true }), p = h.page; // CSP is bypassed only so the scanner can be injected
  await p.emulateMedia({ reducedMotion: 'reduce' }); // so fade-in animations do not skew colour checks
  await p.goto(URL); await p.waitForTimeout(800); await loadDemo(p);
  const scan = async (label) => {
    await p.addScriptTag({ content: axeSrc }).catch(() => {});
    const r = await p.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }, resultTypes: ['violations'] }));
    const bad = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical' || v.impact === 'moderate');
    if (LIST) for (const v of bad) for (const n of v.nodes) { const k = v.id + ' | ' + n.target.join(' '); if (!SEEN.has(k)) SEEN.set(k, label + ' ' + ((n.failureSummary || '').split('\n')[1] || '').trim().slice(0, 150)); }
    ok(bad.length === 0, label + ' has no serious accessibility problems' + (bad.length ? ' (' + bad.map(v => v.id + ' x' + v.nodes.length).join(', ') + ')' : ''));
  };
  for (const theme of ['light', 'dark']) {
    await p.evaluate(t => { document.documentElement.setAttribute('data-theme', t); }, theme);
    console.log('Theme: ' + theme);
    for (const v of ['overview', 'bal', 'tx', 'cards', 'rec', 'inv', 'ana', 'vault', 'up', 'upd']) {
      await p.click('#tabs [data-v=' + v + ']'); await p.waitForTimeout(500);
      if (v === 'tx') await p.click('.bar .pill:has-text("All time")').catch(() => {});
      await scan(v);
    }
    await p.click('[data-act=settings]'); await p.waitForSelector('.setp'); await scan('settings');
    await p.click('[data-act=chglock]'); await p.waitForSelector('#secgo'); await scan('dialog'); await p.click('[data-act=close]');
  }
  if (LIST) for (const [k, v] of SEEN) console.log('   ', k, '=>', v);
  h.errors = h.errors.filter(e => !/XMLHttpRequest|preload assets|ERR_FAILED/.test(String(e))); // the scanner reads stylesheets from file:// and trips CORS
  await done(h);
})().catch(e => { console.error(e); process.exit(1); });
