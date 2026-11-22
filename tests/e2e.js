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
for(const v of ['overview','tx','rec','bud']){t0=Date.now();await p.click(`#tabs [data-v=${v}]`);await p.waitForSelector('#main *');const dt=Date.now()-t0;ok(dt<1500,`${v} renders in ${dt} ms`)}
await p.click('#tabs [data-v=ana]');await p.click('[data-act=range][data-v=all]');
for(const sub of ['trends','cats','patterns','years']){await p.click('#tabs [data-v=ana]');t0=Date.now();await p.click(`[data-act=anasub][data-v=${sub}]`);await p.waitForSelector('#main svg, #main .hm');const dt=Date.now()-t0;ok(dt<2500,`analytics/${sub} (all time) in ${dt} ms`)}

console.log('Passcode + encryption');
await p.click('[data-act=settings]');await p.waitForSelector('.sheet');await p.click('[data-act=setlock]');
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
