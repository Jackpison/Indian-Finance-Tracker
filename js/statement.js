/*
 * Bank statement layout parser (pure functions, no DOM).
 *
 * Input: pages of positioned text items, [[{x, y, w, s}, ...], ...] (pdf.js text content).
 * Output: { bank, sections: [{ number, type, opening, closing, totals, rows: [{ d, desc, amt, bal }] }],
 *           holdings: [{ name, type, invested, value, maturity, rate }], warnings: [] }
 * Returns null when no table with separate deposit/withdrawal columns and dates is found, so
 * callers can fall back to the generic line parser.
 *
 * Why positions: statements with Deposit / Withdrawal columns say which side an amount is on only
 * by where it is printed. Reading the column removes the need to guess signs, and the running
 * balance is then used to double-check every row.
 */
(function (root) {
  'use strict';

  const AMT = /^\(?-?[₹$]?\s?\d[\d,]*\.\d{2}\)?-?$/;
  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const BANKS = /(ICICI|HDFC|State Bank of India|SBI|Axis|Kotak|IDFC FIRST|Yes Bank|Bank of Baroda|Punjab National|Canara|Union Bank|IndusInd|Federal Bank|Bank of India|IDBI|Standard Chartered|HSBC|RBL|AU Small Finance)/i;
  const pad = (n) => String(n).padStart(2, '0');

  function toNum(s) {
    const neg = /^\(.*\)$|-$|^-/.test(s.trim());
    const v = parseFloat(s.replace(/[^\d.]/g, ''));
    return neg ? -v : v;
  }

  /** dd-mm-yyyy, dd/mm/yy, dd Mon yyyy, dd-Mon-yy -> ISO date, or null. Day first, as Indian banks print it. */
  function parseDate(s) {
    s = s.trim();
    let m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
    if (m) return iso(+m[3], +m[2], +m[1]);
    m = s.match(/^(\d{1,2})[ \-]([A-Za-z]{3})[A-Za-z]*[ \-,]*(\d{2,4})$/);
    if (m && MONTHS[m[2].toLowerCase()]) return iso(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
    return null;
  }
  function iso(y, mo, d) {
    if (y < 100) y += 2000;
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
    return `${y}-${pad(mo)}-${pad(d)}`;
  }

  function groupLines(items) {
    const rows = [];
    for (const it of items.slice().sort((a, b) => b.y - a.y || a.x - b.x)) {
      const r = rows.find((r) => Math.abs(r.y - it.y) < 3);
      if (r) r.items.push(it); else rows.push({ y: it.y, items: [it] });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x);
      let s = '', px = null;
      for (const it of r.items) {
        if (px !== null) s += it.x - px > 6 ? '  ' : it.x - px > 1 ? ' ' : '';
        s += it.s; px = it.x + it.w;
      }
      r.text = s.trim();
    }
    return rows;
  }

  /** Column positions from a header line, or null if this line is not a transaction table header. */
  function readHeader(line) {
    const its = line.items;
    const find = (re) => its.findIndex((i) => re.test(i.s.trim()));
    const dateI = find(/^(txn\s*)?date$/i), dep = find(/^(deposits?|credits?|cr)\b/i), wd = find(/^(withdrawals?|debits?|dr)\b/i), bal = find(/balance/i);
    if (dateI < 0 || dep < 0 || wd < 0 || bal < 0) return null;
    const span = (i) => {
      let right = its[i].x + its[i].w;
      for (let k = i + 1; k < its.length; k++) {
        const nxt = its[k];
        if (nxt.x - right < 6 && !/^(deposit|credit|withdraw|debit|balance|closing)/i.test(nxt.s.trim()) && !/^(date|mode|narration|particulars)/i.test(nxt.s.trim()) && k !== dep && k !== wd && k !== bal) right = nxt.x + nxt.w; else break;
      }
      return { left: its[i].x, right };
    };
    const partI = find(/narration|particulars|description|details/i);
    const partX = partI >= 0 ? its[partI].x : its[dateI].x + 45;
    // end of the particulars column = the next header item to its right (Chq./Ref. No., Value Dt, Deposits, ...)
    const ends = its.filter((i) => i.x > partX + 5).map((i) => i.x);
    const partEnd = ends.length ? Math.min(...ends) : Infinity;
    return { y: line.y, dateX: its[dateI].x, partX, partEnd, dep: span(dep), wd: span(wd), bal: span(bal) };
  }

  function columnOf(h, it) {
    const r = it.x + it.w;
    let best = null, bd = Infinity;
    for (const k of ['dep', 'wd', 'bal']) {
      const c = h[k], d = r < c.left - 4 ? c.left - r : r > c.right + 6 ? r - c.right : Math.abs(r - c.right) / 100;
      if (d < bd) { bd = d; best = k; }
    }
    return bd < 40 ? best : null;
  }

  // Which bank issued the statement. Other banks' names turn up inside UPI narrations (name@sbipay, "SBI PAYMEN"),
  // so those are ignored; IFSC codes weigh most, then names near the top, then names anywhere else.
  const IFSC = { ICIC: 'ICICI', SBIN: 'SBI', HDFC: 'HDFC', UTIB: 'AXIS', KKBK: 'KOTAK', YESB: 'YES BANK', IDFB: 'IDFC FIRST', BARB: 'BANK OF BARODA',
    PUNB: 'PUNJAB NATIONAL', CNRB: 'CANARA', UBIN: 'UNION BANK', INDB: 'INDUSIND', FDRL: 'FEDERAL BANK', BKID: 'BANK OF INDIA', IBKL: 'IDBI',
    SCBL: 'STANDARD CHARTERED', HSBC: 'HSBC', RATN: 'RBL', AUBL: 'AU SMALL FINANCE' };
  // One spelling per bank, so "ICICI Bank", "ICICI BANK Ltd" and "icici" are the same account holder.
  const ALIAS = { 'ICICI BANK': 'ICICI', 'HDFC BANK': 'HDFC', 'AXIS BANK': 'AXIS', 'KOTAK MAHINDRA BANK': 'KOTAK', 'KOTAK MAHINDRA': 'KOTAK', 'KOTAK BANK': 'KOTAK', 'STATE BANK OF INDIA': 'SBI',
    'UNION BANK OF INDIA': 'UNION BANK', 'INDUSIND BANK': 'INDUSIND', 'IDFC FIRST BANK': 'IDFC FIRST', 'IDFC BANK': 'IDFC FIRST', 'YES': 'YES BANK', 'PNB': 'PUNJAB NATIONAL', 'PUNJAB NATIONAL BANK': 'PUNJAB NATIONAL',
    'CANARA BANK': 'CANARA', 'IDBI BANK': 'IDBI', 'RBL BANK': 'RBL', 'BOB': 'BANK OF BARODA', 'FEDERAL': 'FEDERAL BANK', 'BOI': 'BANK OF INDIA', 'STANDARD CHARTERED BANK': 'STANDARD CHARTERED', 'HSBC BANK': 'HSBC' };
  function canonBank(b) {
    let x = String(b || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/\s+(LTD\.?|LIMITED)$/, '');
    return ALIAS[x] || x;
  }
  // The issuing bank is identified from the header of page 1: its own website, a labelled IFSC code or its name.
  // A bank named as a landmark in an address ("NEAR SBI BANK") is not the issuer, and bank codes inside
  // narrations (NEFT/IMPS counterparties further down the page and on later pages) are never evidence.
  const HOSTS = [[/icicibank\./, 'ICICI'], [/hdfcbank\./, 'HDFC'], [/(?:^|[^a-z])sbi\.co\.in|onlinesbi/, 'SBI'], [/axisbank\./, 'AXIS'], [/kotak\./, 'KOTAK'], [/idfcfirstbank\./, 'IDFC FIRST'],
    [/yesbank\./, 'YES BANK'], [/bankofbaroda\./, 'BANK OF BARODA'], [/pnbindia\./, 'PUNJAB NATIONAL'], [/canarabank\./, 'CANARA'], [/unionbankofindia\./, 'UNION BANK'], [/indusind\./, 'INDUSIND'],
    [/federalbank\./, 'FEDERAL BANK'], [/(?<!union)bankofindia\./, 'BANK OF INDIA'], [/idbibank\./, 'IDBI'], [/(?:^|[^a-z])sc\.com/, 'STANDARD CHARTERED'], [/hsbc\./, 'HSBC'], [/rblbank\./, 'RBL'], [/aubank\./, 'AU SMALL FINANCE']];
  const LANDMARK = /\b(?:NEAR|NR|OPP|OPPOSITE|BESIDE|BEHIND|ADJ|ADJACENT|NEXT TO|ABOVE|BELOW|AT)\.?\s+(?:THE\s+)?$/i;
  function detectBank(pageLines) {
    const re = new RegExp(BANKS.source, 'gi');
    const clean = (arr) => arr.map((t) => t.replace(/\S*@\S*/g, ' ')).filter((t) => !/\bUPI\//i.test(t));
    const score = new Map(), order = [];
    const add = (b, w) => { if (!b) return; if (!score.has(b)) { score.set(b, 0); order.push(b); } score.set(b, score.get(b) + w); };
    const names = (lines, wFirst, wRest) => lines.forEach((line, i) => { for (const m of line.matchAll(re)) {
      if (LANDMARK.test(line.slice(Math.max(0, m.index - 14), m.index))) continue; // an address landmark
      add(canonBank(m[0]), i < 4 ? wFirst : wRest); } });
    const head = clean((pageLines[0] || []).slice(0, 14));
    head.forEach((line) => {
      const low = line.toLowerCase();
      for (const [rx, b] of HOSTS) if (rx.test(low)) add(b, 20);
      for (const m of line.matchAll(/IFS?C(?:\s*Code)?\s*[:\-]?\s*([A-Z]{4})0[A-Z0-9]{6}/gi)) if (IFSC[m[1].toUpperCase()]) add(canonBank(IFSC[m[1].toUpperCase()]), 20);
      for (const m of line.matchAll(/\b([A-Z]{4})0[A-Z0-9]{6}\b/g)) if (IFSC[m[1]]) add(canonBank(IFSC[m[1]]), 4);
    });
    names(head, 6, 3);
    const best = () => { let b = '', top = 0; for (const x of order) if (score.get(x) > top) { b = x; top = score.get(x); } return b; };
    let bank = best();
    if (bank) return { bank, sure: true };
    // nothing in the header of page 1: look at the first lines of the other pages, names only
    pageLines.slice(1).forEach((ls) => names(clean(ls.slice(0, 4)), 2, 2));
    bank = best();
    if (bank) return { bank, sure: true };
    // last resort over the whole text, flagged as unsure so the import dialog asks you to check
    names(clean(pageLines.flat()), 1, 1);
    return { bank: best(), sure: false };
  }

  function parse(pages) {
    const warnings = [];
    const all = pages.map((p, i) => ({ n: i + 1, lines: groupLines(p) }));
    const det = detectBank(all.slice(0, 2).map((p) => p.lines.map((l) => l.text))), bank = det.bank;

    // --- account summary and fixed deposits (usually on the first page) ---
    const typeByNumber = {}, summary = [], holdings = [];
    let fdListed = false;
    for (const p of all) for (const l of p.lines) {
      const t = l.text.replace(/\s+/g, ' ');
      if (/^fixed deposits?\b/i.test(t)) fdListed = true;
      let m = t.match(/^(Savings|PPF|Current|Salary|Recurring Deposit|RD)\s*(?:A\/c|Account)\s+(\d{6,})\s+([\d,]+\.\d{2})/i);
      if (m) { typeByNumber[m[2]] = normType(m[1]); summary.push({ type: normType(m[1]), number: m[2], balance: toNum(m[3]) }); continue; }
      m = t.match(/^(\d{8,})\s+(\d{1,2}-\d{1,2}-\d{4})\s+([\d,]+\.\d{2})\s+([\d.]+)\s+(.+?)\s+([\d,]+\.\d{2})\s+(\d{1,2}-\d{1,2}-\d{4})\s+([\d,]+\.\d{2})(?:\s+[A-Za-z-]+)?$/);
      if (m) holdings.push({ kind: 'FD', number: m[1], opened: parseDate(m[2]), invested: toNum(m[3]), rate: parseFloat(m[4]), period: m[5], maturity: parseDate(m[7]), value: toNum(m[8]), bank });
    }

    // --- transaction tables ---
    const sections = [];
    let cur = null, hdr = null;
    const newSection = (number, type) => { cur = { number, type: type || (number && typeByNumber[number]) || 'Account', opening: null, closing: null, totals: null, rows: [], closed: false }; sections.push(cur); hdr = null; };

    for (const p of all) {
      let seg = null;
      const flush = () => {
        if (seg && seg.rows.length) attachNarration(seg);
        seg = null;
      };
      for (const l of p.lines) {
        const sec = l.text.match(/Statement of Transactions in\s+(?:([A-Za-z][A-Za-z ]*?)\s+)?Account Number:?\s*(\d+)/i);
        if (sec) { flush(); newSection(sec[2], sec[1] ? normType(sec[1]) : null); continue; }
        const h = readHeader(l);
        if (h) { flush(); if (!cur || cur.closed) newSection(null, null); hdr = h; seg = { h, rows: [], text: [] }; continue; }
        if (!cur || !hdr || cur.closed || !seg) continue;
        const first = l.items[0];
        const dateIt = first && first.x < hdr.partX - 3 ? first : null;
        const date = dateIt ? parseDate(dateIt.s) : null;
        const cols = {};
        for (const it of l.items) if (AMT.test(it.s.trim()) && it.x + it.w > hdr.partEnd) { const c = columnOf(hdr, it); if (c && cols[c] === undefined) cols[c] = toNum(it.s); }
        const particulars = l.items.filter((it) => it.x >= hdr.partX - 10 && it.x < hdr.partEnd && !AMT.test(it.s.trim())).map((it) => it.s.trim()).join(' ').replace(/\s+/g, ' ').trim();
        if (/^total\b/i.test(particulars) && !date) {
          cur.totals = { dep: cols.dep ?? null, wd: cols.wd ?? null, bal: cols.bal ?? null }; cur.closed = true; flush(); continue;
        }
        if (date) {
          if (/^(b\/f|brought forward|opening balance|balance b\/f)/i.test(particulars) && cols.bal !== undefined && cols.dep === undefined && cols.wd === undefined) { if (cur.opening === null) cur.opening = cols.bal; continue; }
          if (cols.dep === undefined && cols.wd === undefined) continue; // date with no amount: not a transaction row
          const row = { d: date, y: l.y, desc: [], dep: cols.dep, wd: cols.wd, bal: cols.bal ?? null, own: particulars };
          seg.rows.push(row); cur.rows.push(row);
        } else if (particulars && cols.dep === undefined && cols.wd === undefined && cols.bal === undefined) {
          seg.text.push({ y: l.y, t: particulars });
        }
      }
      flush();
    }
    function attachNarration(s) {
      /*
       * Banks print a wrapped narration as a block of lines that is vertically centred on the line holding the
       * date and amounts. So the lines of one page are split into one contiguous block per row, choosing the
       * split whose block centres sit closest to their rows (dynamic programming over the line order).
       */
      const rows = s.rows;
      const L = s.text.slice();
      for (const r of rows) if (r.own) L.push({ y: r.y, t: r.own, row: r });
      L.sort((a, b) => b.y - a.y);
      const n = L.length, m = rows.length;
      if (!n) return;
      const anchor = rows.map((r) => L.findIndex((x) => x.row === r));
      const INF = 1e18;
      const cost = (i, a, e) => { const c = (L[a].y + L[e].y) / 2 - rows[i].y; return c * c; };
      // f[i][e]: best cost with rows 0..i placed and block i ending at line e
      const f = Array.from({ length: m }, () => new Float64Array(n).fill(INF));
      const from = Array.from({ length: m }, () => new Int32Array(n).fill(-1));
      for (let e = 0; e < n; e++) {
        if (anchor[0] >= 0 && anchor[0] > e) continue;
        f[0][e] = cost(0, 0, e);
      }
      for (let i = 1; i < m; i++) {
        for (let e = i; e < n; e++) {
          for (let b = i - 1; b < e; b++) {
            if (f[i - 1][b] >= INF) continue;
            const a = b + 1;
            if (anchor[i] >= 0 && (anchor[i] < a || anchor[i] > e)) continue;
            const c = f[i - 1][b] + cost(i, a, e);
            if (c < f[i][e]) { f[i][e] = c; from[i][e] = b; }
          }
        }
      }
      let e = n - 1;
      if (f[m - 1][e] >= INF) { // no consistent split: fall back to the nearest row
        for (const r of rows) r.desc = '';
        for (const t of L) { let best = rows[0], bd = Infinity; for (const r of rows) { const d = Math.abs(r.y - t.y); if (d < bd) { bd = d; best = r; } } best.desc += ' ' + t.t; }
        for (const r of rows) r.desc = r.desc.replace(/\s+/g, ' ').trim();
        return;
      }
      for (let i = m - 1; i >= 0; i--) {
        const b = i > 0 ? from[i][e] : -1;
        rows[i].desc = L.slice(b + 1, e + 1).map((x) => x.t).join(' ').replace(/\s+/g, ' ').trim();
        e = b;
      }
    }

    const out = [];
    for (const s of sections) {
      if (!s.rows.length) continue;
      let prev = s.opening, bad = 0, fixed = 0;
      const rows = [];
      for (const r of s.rows) {
        let amt = (r.dep || 0) - (r.wd || 0);
        if (r.dep && r.wd) { warnings.push('A row has both a deposit and a withdrawal.'); }
        if (r.bal !== null && prev !== null) {
          const delta = Math.round((r.bal - prev) * 100) / 100;
          if (Math.abs(Math.abs(delta) - Math.abs(amt)) > 0.015) bad++;
          else if (Math.sign(delta) !== Math.sign(amt)) { amt = delta; fixed++; }
        }
        if (r.bal !== null) prev = r.bal;
        if (!amt) continue;
        rows.push({ d: r.d, desc: tidy(r.desc) || r.desc || 'Transaction', amt: Math.round(amt * 100) / 100, bal: r.bal });
      }
      const last = rows.length ? rows[rows.length - 1].bal : null;
      const sumIn = rows.filter((r) => r.amt > 0).reduce((a, r) => a + r.amt, 0), sumOut = -rows.filter((r) => r.amt < 0).reduce((a, r) => a + r.amt, 0);
      const closing = s.totals && s.totals.bal !== null ? s.totals.bal : last;
      const check = {
        rows: rows.length, mismatched: bad, signFixed: fixed,
        totalsMatch: s.totals ? Math.abs(sumIn - (s.totals.dep || 0)) < 0.5 && Math.abs(sumOut - (s.totals.wd || 0)) < 0.5 : null,
        closingMatch: s.opening !== null && closing !== null ? Math.abs(s.opening + sumIn - sumOut - closing) < 0.5 : null,
      };
      if (bad) warnings.push(`${bad} row(s) in account ${last4(s.number) || ''} do not match the running balance.`.replace('account  ', 'one account '));
      out.push({ number: s.number, type: s.type, opening: s.opening, closing, totals: s.totals, check, rows });
    }
    if (!out.length) return null;

    // balances from the summary become holdings for non-bank-account products (PPF)
    for (const a of summary) {
      if (a.type !== 'PPF') continue;
      const sec = out.find((s) => s.number === a.number);
      const interest = sec ? sec.rows.filter((r) => r.amt > 0 && /int/i.test(r.desc)).reduce((x, r) => x + r.amt, 0) : 0;
      holdings.push({ kind: 'PPF', number: a.number, invested: Math.max(0, Math.round(a.balance - interest)), value: Math.round(a.balance), bank });
    }
    return { bank, bankSure: det.sure, sections: out, holdings, fdListed, warnings };
  }

  /** Drop machine reference numbers from narrations so they read like a merchant, and dedupe stays stable. */
  function tidy(d) {
    return d
      .replace(/\b\d{9,}\b/g, '')
      .replace(/\b[A-Za-z]{1,6}\d{10,}\b/g, '')
      .replace(/\b[A-Za-z]{0,4}[0-9a-f]{16,}\b/gi, '')
      .replace(/\b(?=[0-9a-f]*\d)[0-9a-f]{6,12}(?=[A-Za-z])/g, '')
      .replace(/\s*\/\s*/g, '/').replace(/\/{2,}/g, '/').replace(/^\/|\/$/g, '')
      .replace(/\s+/g, ' ').trim();
  }

  function normType(s) {
    s = s.trim();
    if (/ppf/i.test(s)) return 'PPF';
    if (/sav/i.test(s)) return 'Savings';
    if (/current/i.test(s)) return 'Current';
    if (/salary/i.test(s)) return 'Salary';
    if (/rd|recurring/i.test(s)) return 'RD';
    return s.replace(/\s+/g, ' ');
  }
  const last4 = (n) => (n ? String(n).slice(-4) : '');

  const api = { parse, parseDate, groupLines, readHeader, tidy, canonBank };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PFStmt = api;
})(typeof window !== 'undefined' ? window : globalThis);
