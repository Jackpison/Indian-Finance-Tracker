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
  // Real statements carry other banks' IFSC codes and names inside NEFT/IMPS narrations, which must never outvote the header.
  const noisy = pages.map((pg, i) => i >= 1 ? [...pg, ...[1, 2, 3, 4, 5, 6].map(k => ({ x: 120, y: 60 + k * 9, w: 300, s: 'NEFT-HDFC0001234-ACME PAYMENTS HDFC BANK LTD ' + k }))] : pg);
  assert.strictEqual(S.parse(noisy).bank, 'ICICI', 'counterparty IFSC codes and bank names in narrations do not decide the bank');
  // The layout that fooled earlier versions (fictional text): the issuer's name is not printed as text, its website is;
  // the branch address names another bank as a landmark; the top of page 2 starts with another bank's code.
  const strip = (s) => s.replace(/ICICI Bank Limited/gi, 'Limited').replace(/ICICI/gi, '');
  const trap = pages.map((pg, i) => i === 0
    ? [...pg.map(t => ({ ...t, s: strip(t.s) })), { x: 27, y: 745, w: 300, s: 'TESTVILLE ROAD NEAR SBI BANK SAMPLE MARKET  Visit www.icicibank.com' }, { x: 27, y: 738, w: 200, s: 'Your Base Branch: SAMPLE TOWN' }]
    : i === 1 ? [{ x: 27, y: 800, w: 200, s: '000000000000-UBIN0000000' }, { x: 27, y: 795, w: 200, s: '000000000001-HDFC0000000' }, { x: 27, y: 790, w: 200, s: '000000000002-ESFB0000000' }, ...pg] : pg);
  const tr = S.parse(trap);
  assert.strictEqual(tr.bank, 'ICICI', 'website beats a landmark bank in the address and codes in narrations (got ' + tr.bank + ')');
  assert.strictEqual(tr.bankSure, true, 'website evidence counts as sure');
  const justLandmark = pages.map((pg, i) => i === 0 ? [...pg.map(t => ({ ...t, s: strip(t.s) })), { x: 27, y: 745, w: 300, s: 'SAMPLE ROAD NEAR SBI BANK MARKET' }] : pg);
  assert.notStrictEqual(S.parse(justLandmark).bankSure, true, 'a bank named only as an address landmark is not accepted as the issuer');
  assert.strictEqual(S.canonBank('ICICI Bank Ltd'), 'ICICI', 'ICICI Bank Ltd');
  assert.strictEqual(S.canonBank('hdfc bank'), 'HDFC', 'hdfc bank');
  assert.strictEqual(S.canonBank('State Bank of India'), 'SBI', 'State Bank of India');
  assert.strictEqual(S.canonBank('Bank of Baroda'), 'BANK OF BARODA', 'Bank of Baroda stays');
  assert.strictEqual(S.canonBank('Union Bank of India'), 'UNION BANK', 'Union Bank of India');
  console.log('bank detection OK');
  { // NPS statement, fictional person and numbers
    const L = ['NPS TRANSACTION STATEMENT', 'April 01, 2026 to November 23, 2026', 'NPS Transaction Statement for', 'Tier I Account',
      'PRAN  100000000042  Registration Date  11-Aug-20', 'Subscriber Name  ASHA TESTER  Tier I Status  Active',
      'Investment Summary', '₹ 3,00,000.50  12  ₹ 2,50,000.00  ₹ 0.00  ₹ 50,000.50  ₹ 100.00',
      'ICICI PENSION FUND SCHEME E - TIER I POP  1,50,000.25  1,000.0000  150.0000',
      'ICICI PENSION FUND SCHEME C - TIER I POP  90,000.15  2,000.0000  45.0000',
      'ICICI PENSION FUND SCHEME G - TIER I POP  60,000.10  1,500.0000  40.0000',
      '01-Apr-2026  Opening balance  1,000.0000', '23-Nov-2026  Closing Balance  1,200.0000'];
    const pg = [L.map((s, i) => ({ x: 10, y: 800 - i * 14, w: 400, s }))];
    const n = S.parse(pg);
    assert(n && n.nps && n.sections.length === 0, 'an NPS statement is recognised and has no bank sections');
    const hd = n.holdings[0];
    assert.strictEqual(hd.number, '100000000042'); assert.strictEqual(hd.value, 300000.5); assert.strictEqual(hd.invested, 250000);
    assert.strictEqual(hd.asof, '2026-11-23'); assert.strictEqual(hd.schemes.length, 3); assert.strictEqual(n.who, 'ASHA TESTER'); assert.strictEqual(n.tier, 'I');
    assert.strictEqual(n.warnings.length, 0, 'scheme values add up to the total');
    console.log('nps statement OK');
  }
})().catch(e => { console.error(e); process.exit(1); });
