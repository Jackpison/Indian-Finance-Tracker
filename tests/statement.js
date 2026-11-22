// Parser test: runs the vendored pdf.js on the fictional ICICI-style sample, feeds the text items to
// js/statement.js and checks everything reconciles. Run: NODE_PATH=$(npm root -g) node tests/statement.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const { launch, URL } = require('./lib');
const S = require('../js/statement.js');
const root = path.join(__dirname, '..');

(async () => {
  const h = await launch(), p = h.page;
  await p.goto(URL); await p.waitForTimeout(400);
  await p.addScriptTag({ url: 'vendor/pdf.min.js' }); await p.addScriptTag({ url: 'vendor/pdf.worker.min.js' });
  const b64 = fs.readFileSync(path.join(root, 'samples/icici-style-statement.pdf')).toString('base64');
  const pages = await p.evaluate(async b64 => {
    window.pdfjsWorker = window.pdfjsWorker || window['pdfjs-dist/build/pdf.worker'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
    const d = await pdfjsLib.getDocument({ data: Uint8Array.from(atob(b64), c => c.charCodeAt(0)), isEvalSupported: false }).promise, o = [];
    for (let i = 1; i <= d.numPages; i++) { const tc = await (await d.getPage(i)).getTextContent(); o.push(tc.items.filter(t => t.str && t.str.trim()).map(t => ({ x: t.transform[4], y: t.transform[5], w: t.width, s: t.str }))); }
    return o;
  }, b64);
  await h.browser.close();

  const exp = JSON.parse(fs.readFileSync(path.join(root, 'samples/icici-style-statement.expected.json')));
  const r = S.parse(pages);
  assert(r, 'parser returned null');
  const sum = (rows, f) => Math.round(rows.filter(f).reduce((a, x) => a + x.amt, 0) * 100) / 100;
  for (const [key, type] of [['savings', 'Savings'], ['ppf', 'PPF']]) {
    const s = r.sections.find(x => x.type === type); assert(s, 'missing section ' + type);
    const e = exp[key];
    assert.strictEqual(s.rows.length, e.rows, key + ' row count');
    assert.strictEqual(sum(s.rows, x => x.amt > 0), e.in, key + ' deposits');
    assert.strictEqual(Math.abs(sum(s.rows, x => x.amt < 0)), e.out, key + ' withdrawals');
    assert.strictEqual(s.closing, e.closing, key + ' closing');
    assert(s.check.totalsMatch && s.check.closingMatch && !s.check.mismatched, key + ' reconciliation ' + JSON.stringify(s.check));
  }
  const fds = r.holdings.filter(x => x.kind === 'FD'); assert.strictEqual(fds.length, exp.fds, 'FD count');
  assert.strictEqual(fds.reduce((a, x) => a + x.value, 0), exp.fd_total, 'FD total');
  assert(r.holdings.some(x => x.kind === 'PPF'), 'PPF holding');
  const sv = r.sections.find(x => x.type === 'Savings');
  const bad = sv.rows.filter(x => /\d{9,}/.test(x.desc)); assert(!bad.length, 'long ids stripped: ' + bad.map(x => x.desc).join(' | '));
  assert(sv.rows.some(x => /freshmart/i.test(x.desc)), 'wrapped UPI narration attached');
  console.log('statement parser OK:', sv.rows.length, 'savings rows,', fds.length, 'FDs');
  // Another bank's name inside a UPI narration (@sbipay, "SBI PAYMEN") must not decide which bank issued the statement.
  assert.strictEqual(r.bank, 'ICICI', 'sample is detected as ICICI');
  const upiFirst = pages.map((pg, i) => i === 0 ? [{ x: 27, y: 790, w: 220, s: 'UPI/shop@sbipay/Payment/SBI PAYMEN' }, ...pg] : pg);
  assert.strictEqual(S.parse(upiFirst).bank, 'ICICI', 'a UPI narration that mentions SBI must not change the bank');
  const noIcici = pages.map((pg, i) => i < 2 ? pg.map(t => ({ ...t, s: t.s.replace(/ICICI Bank/gi, 'Bank').replace(/ICICI/gi, 'I-C') })) : pg);
  const hdr = noIcici.map((pg, i) => i === 0 ? [{ x: 27, y: 790, w: 220, s: 'UPI/shop@sbipay/Payment/SBI PAYMEN' }, { x: 27, y: 780, w: 120, s: 'IFSC: ICIC0001234' }, ...pg] : pg);
  assert.strictEqual(S.parse(hdr).bank, 'ICICI', 'the IFSC code identifies the bank when the name is not printed');
  console.log('bank detection OK');
})().catch(e => { console.error(e); process.exit(1); });
