/* Card due dates, review queue, offline shell files. Run: NODE_PATH=$(npm root -g) node tests/features.js */
const fs=require('fs'),os=require('os'),path=require('path');
const {launch,URL,ROOT,ok,done,csv,loadDemo}=require('./lib');
(async()=>{
const h=await launch(),p=h.page;const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'pf-'));
await p.goto(URL);await p.waitForTimeout(1000);await loadDemo(p);
console.log('Card due day');
await p.click('[data-act=settings]');await p.waitForSelector('.setp');
const due=p.locator('input[data-change=adue]').first();await due.fill('15');await due.dispatchEvent('change');await p.waitForTimeout(400);
await p.click('#tabs [data-v=cards]');await p.waitForSelector('.duerow .tg');
ok(/Payment due/.test(await p.textContent('.duerow')),'Cards page shows the next payment due date');
ok((await p.$$('#main .tg.own')).length>0,'owner tag shown on cards');
console.log('Review queue');
const f=path.join(tmp,'odd.csv');fs.writeFileSync(f,csv([['10/11/2026','"QQXZ MYSTERY VENDOR"','500.00','','1000.00']]));
await p.setInputFiles('#file',f);await p.waitForSelector('.sheet');await p.click('[data-act=impgo]');await p.waitForTimeout(800);
await p.click('#tabs [data-v=overview]');await p.waitForSelector('.reviewq');
ok(/without a category/.test(await p.textContent('.reviewq')),'overview offers to review uncategorised payments');
await p.click('.reviewq [data-act=cat]');await p.waitForSelector('.txr');
ok((await p.textContent('#txrows')).includes('QQXZ'),'review opens Transactions filtered to Other');
console.log('Split');
await p.click('.txr .tx');await p.click('.txr.open [data-act=txsplit]');await p.waitForSelector('#spa');
await p.fill('#spa','1');await p.click('[data-act=spgo]');await p.waitForTimeout(500);
await p.click('[data-act=fclear]');await p.fill('#q','QQXZ');await p.waitForTimeout(400);
ok((await p.$$('.txr')).length===2,'splitting leaves two rows for the payment');
console.log('Repair after importing old statements');
const bad={format:'ift-backup-1',enc:false,data:{tx:[{id:'t1',d:'2026-01-05',desc:'COFFEE SHOP',amt:-100,acct:'a1',m:'m1'},{id:'t2',d:'2026-01-05',desc:'COFFEE SHOP',amt:-100,acct:'a2',m:'m1'},{id:'t3',d:'2023-02-01',desc:'OLD ONE',amt:-50,acct:'a2',m:'m1'}],
 hold:[{id:'h1',name:'icici FD ••8487',type:'FD / RD',m:'m1',invested:100000,value:101317,maturity:'2023-06-24',stm:true,bank:'icici',asof:'2023-03-30'},{id:'h2',name:'ICICI FD ••3892',type:'FD / RD',m:'m1',invested:200000,value:200000,maturity:'2027-01-05',stm:true,bank:'ICICI',asof:'2026-11-19'}],
 uploads:[],vault:[],members:[{id:'m1',name:'Sagar',color:'#3B5BFF'}],accts:[{id:'a1',name:'ICICI Savings ••5535',type:'bank',member:'m1',bank:'ICICI',no:'5535',bal:109022,balAsOf:'2026-11-19'},{id:'a2',name:'icici Savings ••5535',type:'bank',member:'m1',bank:'icici',no:'5535',bal:97326,balAsOf:'2023-03-30'}],rules:{},cur:'INR',order:''}};
await p.click('[data-act=settings]');await p.waitForSelector('.setp');await p.click('[data-act=bkshow]');await p.fill('#bktxt',JSON.stringify(bad));await p.click('[data-act=bkgo]');await p.waitForTimeout(1000);
await p.click('#tabs [data-v=bal]');await p.waitForSelector('.lr');
const names=await p.$$eval('.lr .ln',e=>e.map(x=>x.textContent));
ok(names.filter(n=>/Savings/.test(n)).length===1,'duplicate account merged ('+names.join(' | ')+')');
ok(!names.some(n=>/8487/.test(n))&&names.some(n=>/3892/.test(n)),'deposit from the older statement removed, current one kept');
await p.click('#tabs [data-v=tx]');await p.fill('#q','COFFEE');await p.waitForTimeout(400);
ok((await p.$$('.txr')).length===1,'transaction present in both copies is kept once');
console.log('Theme switch');
ok((await p.$$('#themebtn')).length===1&&!(await p.$('[data-theme-set]')),'one sun/moon button, no follow-device option');
const th=()=>p.evaluate(()=>document.documentElement.getAttribute('data-theme'));
await p.click('#themebtn');await p.waitForTimeout(500);const t1=await th();await p.click('#themebtn');await p.waitForTimeout(500);const t2=await th();
ok(['light','dark'].includes(t1)&&['light','dark'].includes(t2)&&t1!==t2,'button flips between light and dark ('+t1+' then '+t2+')');
console.log('Owner tags');
for(const [v,sel] of [['tx','.txr .tg.own'],['bal','.lr .tg.own'],['inv','.tbl .tg.own']]){await p.click('#tabs [data-v='+v+']');await p.waitForTimeout(500);ok((await p.$$(sel)).length>0,'owner tag shown on '+v)}
console.log('Offline shell');
for(const n of ['sw.js','manifest.webmanifest']){ok(fs.existsSync(path.join(ROOT,n)),n+' exists')}
JSON.parse(fs.readFileSync(path.join(ROOT,'manifest.webmanifest')));ok(true,'manifest is valid JSON');
await done(h);
})().catch(e=>{console.error(e);process.exit(1)});
