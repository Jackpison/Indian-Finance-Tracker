/* End-to-end checks. Run: npm test */
const fs=require('fs'),os=require('os'),path=require('path');
const {launch,URL,ROOT,ok,done,csv}=require('./lib');
(async()=>{
const h=await launch(),p=h.page;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'pf-'));
await p.goto(URL);await p.waitForTimeout(1200);

console.log('Import + dedupe');
await p.setInputFiles('#file',ROOT+'/samples/hdfc-style-statement.csv');
await p.waitForSelector('.sheet');await p.click('[data-act=impgo]');await p.waitForTimeout(800);
await p.click('#tabs [data-v=tx]');await p.waitForTimeout(500);
const n1=(await p.$$('.tx:not(.hd)')).length;ok(n1===10,'CSV imports 10 rows ('+n1+')');
await p.setInputFiles('#file',ROOT+'/samples/hdfc-style-statement.csv');await p.waitForTimeout(800);
await p.waitForSelector('.sheet');
ok(/already imported this exact file/i.test(await p.textContent('.sheet')),'same file is flagged as duplicate');
await p.click('[data-act=impcancel]');await p.waitForTimeout(300);

console.log('PDF import');
await p.setInputFiles('#file',ROOT+'/samples/hdfc-style-statement.pdf');
await p.waitForSelector('.sheet',{timeout:30000}).catch(()=>{});
ok(!!(await p.$('.sheet'))&&/Salary|SWIGGY|Income/i.test(await p.textContent('.sheet')),'PDF statement is parsed');
await p.click('[data-act=impcancel]');await p.waitForTimeout(300);

console.log('Multi-account statement import');
await p.setInputFiles('#file',ROOT+'/samples/icici-style-statement.pdf');
await p.waitForSelector('[data-act=stmtgo]',{timeout:30000});
ok(/Savings|PPF/.test(await p.textContent('.sheet')),'multi-account PDF opens the statement dialog');
await p.click('[data-act=stmtgo]');await p.waitForTimeout(1200);
await p.click('#tabs [data-v=inv]');await p.waitForTimeout(500);
const invTxt=await p.textContent('#main');
ok(/FD ••0222/.test(invTxt)&&/PPF ••2333/.test(invTxt),'FDs and PPF added to investments');
await p.setInputFiles('#file',ROOT+'/samples/icici-style-statement.pdf');
await p.waitForSelector('[data-act=stmtgo]',{timeout:30000});
ok(/already/i.test(await p.textContent('.sheet')),'re-importing the statement is flagged');
await p.click('[data-act=stmtgo]');await p.waitForTimeout(800);
const toast=await p.textContent('#toast');
ok(/\b0\b|nothing|skipped|duplicate/i.test(toast),'second import adds nothing ('+toast+')');
await p.click('#tabs [data-v=tx]');

console.log('Newer statement replaces old deposits');
const invText=async()=>{await p.click('#tabs [data-v=inv]');await p.waitForTimeout(400);return p.textContent('#main')};
ok(/FD ••0222/.test(await invText()),'before: the FD that will mature is listed');
await p.setInputFiles('#file',ROOT+'/samples/icici-style-statement-next.pdf');
await p.waitForSelector('[data-act=stmtgo]',{timeout:30000});await p.click('[data-act=stmtgo]');await p.waitForTimeout(1200);
ok(/removed 1 closed deposit/.test(await p.textContent('#toast')),'toast reports the closed FD ('+(await p.textContent('#toast'))+')');
const t2=await invText();
ok(!/FD ••0222/.test(t2)&&/FD ••0333/.test(t2)&&/FD ••0444/.test(t2),'closed FD removed, continuing FD kept, new FD added');
await p.click('#tabs [data-v=bal]');await p.waitForTimeout(500);
const accTxt=await p.textContent('#main');
ok(/2,14,318/.test(accTxt),'Accounts shows the closing balance of the newest statement');
await p.setInputFiles('#file',ROOT+'/samples/icici-style-statement.pdf');
await p.waitForSelector('[data-act=stmtgo]',{timeout:30000});await p.click('[data-act=stmtgo]');await p.waitForTimeout(1000);
ok(/FD ••0444/.test(await invText())&&!/FD ••0222/.test(await invText()),'re-importing the older statement does not bring old deposits back');
await p.click('#tabs [data-v=bal]');await p.waitForTimeout(400);
ok(/2,14,318/.test(await p.textContent('#main')),'older statement does not overwrite the newer balance');

console.log('Transfers + backup reminder');
const catOf=async needle=>p.evaluate(n=>{const r=[...document.querySelectorAll('.tx:not(.hd)')].find(x=>x.textContent.includes(n));return r?r.querySelector('select').value:null},needle);
const fa=path.join(tmp,'acc-a.csv'),fb=path.join(tmp,'acc-b.csv');
fs.writeFileSync(fa,csv([['10/02/2025','"WIDGETCO ZZQ REF"','7777.00','','1000.00']]));
fs.writeFileSync(fb,csv([['11/02/2025','"INWARD ZZQ CREDIT"','','7777.00','8777.00']]));
await p.setInputFiles('#file',fa);await p.waitForSelector('.sheet');await p.click('[data-act=impgo]');await p.waitForTimeout(600);
await p.setInputFiles('#file',fb);await p.waitForSelector('.sheet');
const sel=await p.$('#iacct');if(sel){await sel.selectOption('new');await p.waitForTimeout(400)}
await p.click('[data-act=impgo]');await p.waitForTimeout(600);
ok(/matched 1 transfer/.test(await p.textContent('#toast')),'equal opposite amounts in two accounts are matched ('+(await p.textContent('#toast'))+')');
await p.click('#tabs [data-v=tx]');await p.click('.bar .pill:has-text("All time")');await p.fill('#q','ZZQ');await p.waitForTimeout(500);
ok((await catOf('WIDGETCO'))==='Transfers'&&(await catOf('INWARD'))==='Transfers','both sides are categorised as Transfers');
await p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('portfolio-db',1);q.onsuccess=()=>{const tx=q.result.transaction('kv','readwrite');tx.objectStore('kv').put({lock:null,autoLock:5,bk:{last:0,every:30,snooze:0,since:Date.now()-10*864e5}},'meta');tx.oncomplete=r}}));
await p.reload();await p.waitForTimeout(1500);await p.click('#tabs [data-v=overview]');await p.waitForTimeout(500);
ok(!!(await p.$('#bkbn')),'backup reminder appears when no backup was made for a week');
await p.click('#bkbn [data-act=bkdl]').catch(()=>{});await p.waitForTimeout(800);
ok(!(await p.$('#bkbn')),'reminder goes away after downloading a backup');

console.log('XSS hardening');
const evil='<img src=x onerror="window.__xss=1">';
const f=path.join(tmp,'evil.csv');fs.writeFileSync(f,csv([['01/02/2025',`"${evil} <script>window.__xss=1</script>"`,'100.00','','900.00']]));
await p.setInputFiles('#file',f);await p.waitForSelector('.sheet');await p.click('[data-act=impgo]');await p.waitForTimeout(800);
await p.click('#tabs [data-v=tx]');await p.waitForTimeout(500);
ok(!(await p.evaluate(()=>window.__xss)),'hostile narration does not execute');
ok(!(await p.$('.tx img[src="x"]')),'hostile narration is escaped, not parsed');

console.log('Large history (10 years)');
const rows=[];let bal=1e6;
for(let y=2016;y<=2026;y++)for(let m=1;m<=12;m++){if(y===2026&&m>10)break;const mm=String(m).padStart(2,'0');
  rows.push([`01/${mm}/${y}`,'NEFT-ACME SALARY','',90000+(y-2016)*5000,bal]);
  for(let k=0;k<160;k++){const d=String(1+((k*5+m)%28)).padStart(2,'0');rows.push([`${d}/${mm}/${y}`,`UPI-${['SWIGGY','BIGBASKET','AMAZON','UBER','IRCTC','APOLLO'][k%6]}-${k}`,(300+((k*977+m*131+y*7)%9000)).toFixed(2),'',bal])}}
const big=path.join(tmp,'big.csv');fs.writeFileSync(big,csv(rows));
let t0=Date.now();await p.setInputFiles('#file',big);await p.waitForSelector('.sheet',{timeout:30000});await p.click('[data-act=impgo]');
await p.waitForFunction(()=>!document.querySelector('.sheet'),null,{timeout:30000});
const dt0=Date.now()-t0;console.log('  import took',dt0,'ms for',rows.length,'rows');ok(dt0<15000,'big import under 15 s');
for(const v of ['overview','bal','tx','rec']){t0=Date.now();await p.click(`#tabs [data-v=${v}]`);await p.waitForSelector('#main *');const dt=Date.now()-t0;ok(dt<1500,`${v} renders in ${dt} ms`)}
await p.click('#tabs [data-v=ana]');await p.click('[data-act=range][data-v=all]');
for(const sub of ['trends','cats','patterns','years']){await p.click('#tabs [data-v=ana]');t0=Date.now();await p.click(`[data-act=anasub][data-v=${sub}]`);await p.waitForSelector('#main svg, #main .hm');const dt=Date.now()-t0;ok(dt<2500,`analytics/${sub} (all time) in ${dt} ms`)}

console.log('Data survives reloads and other tabs');
const readState=pg=>pg.evaluate(()=>new Promise(r=>{const q=indexedDB.open('portfolio-db',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('state');g.onsuccess=()=>r(g.result?{n:g.result.n,ts:g.result.ts}:null)}}));
await p.waitForTimeout(800);const before=await readState(p);
ok(before&&before.n>1000,'state is saved with a transaction count ('+(before&&before.n)+')');
await p.reload();await p.waitForTimeout(1500);
const after=await readState(p);ok(after&&after.n===before.n,'all transactions are still there after a reload');
const ctx=p.context(),p2=await ctx.newPage();await p2.goto(URL);await p2.waitForTimeout(1200);
await p.click('[data-act=add]');await p.fill('#tdesc','TABTEST ONE').catch(()=>{});
await p.evaluate(()=>{});await p.click('[data-act=close]').catch(()=>{});
await p2.bringToFront();await p2.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
const s2=await readState(p);ok(s2&&s2.n===before.n,'a second tab does not alter saved data when idle');
await p2.close();
await p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('portfolio-db',1);q.onsuccess=()=>{const t=q.result.transaction('kv','readwrite');t.objectStore('kv').delete('state');t.oncomplete=r}}));
await p.reload();await p.waitForTimeout(1500);
ok(/Recover your data/.test(await p.textContent('#modal')),'losing the main copy offers the automatic copy');
await p.click('#rcv');await p.waitForTimeout(1200);
const rec=await readState(p);ok(rec&&rec.n===before.n,'recovery restores every transaction ('+(rec&&rec.n)+')');

console.log('Passcode + encryption');
await p.click('[data-act=settings]');await p.waitForSelector('.setp');await p.click('[data-act=setlock]');
await p.fill('#pw1','Correct-Horse-9!');await p.fill('#pw2','Correct-Horse-9!');await p.click('#secgo');
await p.waitForSelector('#lockbtn:not([hidden])',{timeout:30000});
const readRaw=()=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('portfolio-db',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('state');g.onsuccess=()=>r(JSON.stringify(g.result))}}));
await p.waitForFunction(()=>true);let raw='';for(let i=0;i<40;i++){raw=await readRaw();if(raw.includes('"enc":true'))break;await p.waitForTimeout(500)}  /* encrypting a large state takes a moment */
ok(raw.includes('"enc":true')&&!/SWIGGY|SALARY|GREENVIEW/i.test(raw),'stored state is encrypted, no plaintext');
await p.reload();await p.waitForTimeout(1000);ok(await p.isVisible('#lock'),'locked after reload');
await p.fill('#lockpw','nope');await p.click('#lockgo');await p.waitForTimeout(1800);ok(await p.isVisible('#lock'),'wrong passcode rejected');
await p.fill('#lockpw','Correct-Horse-9!');await p.click('#lockgo');await p.waitForTimeout(3000);ok(!(await p.isVisible('#lock')),'correct passcode unlocks');
await p.click('#tabs [data-v=vault]');await p.waitForTimeout(400);
await p.click('[data-act=vadd]');await p.fill('#vl',evil);await p.fill('#vv','1234');await p.click('[data-act=vsave]');await p.waitForTimeout(500);
ok(!(await p.evaluate(()=>window.__xss))&&!(await p.$('img[src="x"]')),'hostile vault label is inert');
ok((await p.$$eval('.vnum',e=>e.map(x=>x.textContent).join('|'))).includes('•'),'vault numbers masked');
await done(h);
})().catch(e=>{console.error(e);process.exit(1)});
