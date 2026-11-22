// Builds a fictional family backup (format ift-backup-1) for screenshots and manual testing.
// Categories are left empty on purpose: the app categorises on load.   node tests/demo-data.js out.json
const fs = require('fs');
let seed = 11; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 };
const R = (a, b) => a + rnd() * (b - a), P = a => a[Math.floor(rnd() * a.length)], pad = n => String(n).padStart(2, '0');
let n = 0; const id = () => 'd' + (++n).toString(36);

function build(end = '2026-11-22', months = 12) {
  const members = [{ id: 'm1', name: 'Aarav', color: '#3B5BFF' }, { id: 'm2', name: 'Meera', color: '#E0568F' }, { id: 'm3', name: 'Anaya', color: '#12936A' }];
  const accts = [
    { id: 'a1', name: 'HDFC Savings', type: 'bank', member: 'm1', bank: 'HDFC', no: '4821', bal: 412650, balAsOf: end },
    { id: 'a2', name: 'ICICI Amazon Pay', type: 'card', member: 'm1', limit: 200000, bal: -38420, balAsOf: end },
    { id: 'a3', name: 'SBI Savings', type: 'bank', member: 'm2', bank: 'SBI', no: '7730', bal: 186400, balAsOf: end },
    { id: 'a4', name: 'Axis Flipkart', type: 'card', member: 'm2', limit: 120000 }];
  const tx = [], add = (d, desc, amt, a) => { if (d <= end) tx.push({ id: id(), d, desc, amt: Math.round(amt * 100) / 100, acct: a, m: accts.find(x => x.id === a).member }) };
  const e = new Date(end + 'T00:00:00');
  for (let m = months - 1; m >= 0; m--) {
    const b = new Date(e.getFullYear(), e.getMonth() - m, 1), y = b.getFullYear(), mo = b.getMonth() + 1, dim = new Date(y, mo, 0).getDate();
    const D = d => `${y}-${pad(mo)}-${pad(Math.min(d, dim))}`;
    add(D(1), 'NEFT-ACME TECHNOLOGIES-SALARY', 125000, 'a1'); add(D(1), 'NEFT-BRIGHTPATH LLP-SALARY', 65000, 'a3');
    if (m % 2 === 1) add(D(9), 'IMPS-FREELANCE DESIGN INVOICE', R(18000, 42000), 'a1');
    add(D(2), 'UPI-GREENVIEW RESIDENCY RENT', -28000, 'a1'); add(D(3), 'ACH-GROWW SIP MUTUAL FUND', -15000, 'a1'); add(D(3), 'ACH-ZERODHA COIN SIP', -10000, 'a3');
    add(D(5), 'PPF DEPOSIT SBI', -12500, 'a1'); add(D(8), 'BESCOM ELECTRICITY BILL', -R(1400, 2300), 'a1'); add(D(11), 'ACT FIBERNET BROADBAND', -1179, 'a1');
    add(D(14), 'ICICI HOME LOAN EMI', -18500, 'a1'); add(D(15), 'CRED CLUB CC PAYMENT', -R(32000, 52000), 'a1');
    add(D(4), 'NETFLIX.COM', -649, 'a2'); add(D(6), 'SPOTIFY INDIA', -119, 'a2');
    for (let i = 0; i < 9; i++) add(D(1 + Math.floor(rnd() * 28)), P(['BIGBASKET ORDER', 'BLINKIT', 'ZEPTO MARKET', 'DMART AVENUE']), -R(350, 3200), P(['a1', 'a3']));
    for (let i = 0; i < 11; i++) add(D(1 + Math.floor(rnd() * 28)), P(['SWIGGY', 'ZOMATO', 'STARBUCKS COFFEE', 'THIRD WAVE CAFE']), -R(180, 1400), P(['a2', 'a4']));
    for (let i = 0; i < 7; i++) add(D(1 + Math.floor(rnd() * 28)), P(['UBER INDIA', 'RAPIDO', 'HPCL PETROL PUMP', 'FASTAG RECHARGE']), -R(120, 2500), P(['a2', 'a4']));
    for (let i = 0; i < 4; i++) add(D(1 + Math.floor(rnd() * 28)), P(['AMAZON PAY INDIA', 'FLIPKART', 'MYNTRA', 'NYKAA']), -R(499, 6500), P(['a2', 'a4']));
    add(D(17), P(['APOLLO PHARMACY', 'PRACTO CONSULT']), -R(300, 1800), 'a2'); add(D(28), 'INT PD SAVINGS ACCOUNT', R(900, 1400), 'a1');
  }
  const hold = [
    { name: 'Reliance Industries', type: 'Stocks', m: 'm1', invested: 142000, value: 171500 }, { name: 'HDFC Bank', type: 'Stocks', m: 'm1', invested: 96000, value: 104800 },
    { name: 'Parag Parikh Flexi Cap', type: 'Mutual Funds', m: 'm2', invested: 210000, value: 268000 }, { name: 'Nifty 50 Index Fund', type: 'Mutual Funds', m: 'm1', invested: 150000, value: 181000 },
    { name: 'PPF · SBI', type: 'PPF', m: 'm1', invested: 780000, value: 1043000, fy: 75000, maturity: '2033-04-01' },
    { name: 'NPS Tier 1', type: 'NPS', m: 'm1', invested: 420000, value: 588000, fy: 36000 },
    { name: 'Sukanya Samriddhi · Anaya', type: 'Sukanya Samriddhi', m: 'm3', invested: 330000, value: 402000, fy: 30000, maturity: '2041-03-31' },
    { name: 'HDFC FD ••3321', type: 'FD / RD', m: 'm2', invested: 300000, value: 321400, maturity: '2027-02-18', rate: 7.1 },
    { name: 'SBI FD ••9904', type: 'FD / RD', m: 'm1', invested: 200000, value: 207800, maturity: '2027-06-30', rate: 6.8 },
    { name: 'Sovereign Gold Bond', type: 'Gold', m: 'm2', invested: 120000, value: 176000, maturity: '2031-11-02' }].map(h => ({ id: id(), ...h }));
  return { format: 'ift-backup-1', enc: false, data: { tx, hold, uploads: [], vault: [], members, accts, rules: {}, cur: 'INR', order: '' } };
}
module.exports = { build };
if (require.main === module) { fs.writeFileSync(process.argv[2] || 'demo-backup.json', JSON.stringify(build())); console.log('written'); }
