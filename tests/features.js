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
console.log('Bots and scrapers');
const robots=fs.readFileSync(path.join(ROOT,'robots.txt'),'utf8');
ok(/User-agent: \*\s+Disallow: \//.test(robots)&&/GPTBot/.test(robots)&&/ClaudeBot/.test(robots),'robots.txt bans all crawlers, AI ones by name');
for(const f of ['deploy/htaccess.txt','deploy/nginx.conf','deploy/Caddyfile'])ok(/gptbot/i.test(fs.readFileSync(path.join(ROOT,f),'utf8')),f+' refuses known bots');
ok(/'robots\.txt'/.test(fs.readFileSync(path.join(ROOT,'deploy/update.php'),'utf8')),'update.php may install robots.txt');
console.log('Cache busting');
{const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),ver=JSON.parse(fs.readFileSync(path.join(ROOT,'version.json'))).version;
 for(const f of ['css/app.css','js/theme.js','js/statement.js','js/app.js'])ok(html.includes(f+'?v='+ver+'"'),f+' is loaded with ?v='+ver);
 ok(/FilesMatch "\\.\(html\|json\|js\|css\|webmanifest\)\$"/.test(fs.readFileSync(path.join(ROOT,'deploy/htaccess.txt'),'utf8')),'.htaccess revalidates JS and CSS on each load')}
console.log('Wrong bank and owner after importing old statements (fictional family)');
const mixAccts=[{id:'a1',name:'SBI Savings ••0872',type:'bank',member:'m1',bank:'SBI',no:'0872',bal:192367,balAsOf:'2024-03-30'},
 {id:'a2',name:'ICICI Savings ••0872',type:'bank',member:'m2',bank:'ICICI',no:'0872',bal:86030,balAsOf:'2026-11-16'}];
const mix=extra=>({format:'ift-backup-1',enc:false,data:{tx:[{id:'t1',d:'2024-03-01',desc:'OLD SHOP',amt:-100,acct:'a1',m:'m1'},{id:'t2',d:'2026-11-10',desc:'NEW SHOP',amt:-200,acct:'a2',m:'m2'}],
 hold:[{id:'h1',name:'SBI FD ••4582',type:'FD / RD',m:'m1',invested:250000,value:252828,maturity:'2022-06-07',stm:true,bank:'SBI',asof:'2024-03-30'},
  {id:'h2',name:'ICICI FD ••8605',type:'FD / RD',m:'m1',invested:110000,value:110000,maturity:'2026-12-05',stm:true,bank:'ICICI',asof:'2026-11-19'}],
 uploads:[],vault:[],members:[{id:'m1',name:'Asha',color:'#3B5BFF'},{id:'m2',name:'Ravi',color:'#E0457B'}],accts:[...mixAccts,...extra],rules:{},cur:'INR',order:''}});
const restoreBk=async o=>{await p.click('[data-act=settings]');await p.waitForSelector('.setp');await p.click('[data-act=bkshow]');await p.fill('#bktxt',JSON.stringify(o));await p.click('[data-act=bkgo]');await p.waitForTimeout(1000)};
const sampleStmt=path.join(ROOT,'samples/icici-style-statement.pdf');
await restoreBk(mix([]));
await p.click('.mem .pill:has-text("Everyone")');
await p.setInputFiles('#file',sampleStmt);await p.waitForSelector('#imem',{timeout:30000});
ok((await p.$eval('#imem',e=>e.value))==='','with Everyone selected the import asks who owns it instead of guessing the first person');
await p.click('[data-act=stmtgo]');await p.waitForTimeout(400);
ok(/Choose who/.test(await p.textContent('#toast'))&&!!(await p.$('#imem')),'import is refused until a person is chosen');
await p.click('[data-act=impcancel]');await p.waitForTimeout(400);
await p.click('[data-act=settings]');await p.waitForSelector('.setp');
await p.fill('#bkfrom','sbi');await p.fill('#bkto','icici');await p.click('[data-act=bkfix]');await p.waitForTimeout(500);
await p.click('#tabs [data-v=bal]');await p.waitForSelector('.lr');
ok(!(await p.textContent('#main')).includes('SBI'),'renaming the bank removes every SBI label, and the old SBI deposit is dropped as stale');
await p.click('.lr:has(.tg.own:has-text("Ravi")) [data-act=setbal]');await p.waitForSelector('#sbm');await p.selectOption('#sbm','m1');await p.click('[data-act=sbsave]');await p.waitForTimeout(500);
const accRows=await p.$$eval('.lr .ln',e=>e.map(x=>x.textContent).filter(t=>/Savings/.test(t)));
ok(accRows.length===1,'same bank, number and owner merge into one account ('+accRows.join(' | ')+')');
ok((await p.$$eval('.lr .tg.own',e=>e.map(x=>x.textContent.trim()))).every(n=>n==='Asha'),'the account moved to the chosen owner');
await p.click('#tabs [data-v=tx]');await p.click('.bar .pill:has-text("All time")');await p.waitForTimeout(300);if(await p.$('[data-act=fclear]'))await p.click('[data-act=fclear]');await p.waitForTimeout(500);
const owners=await p.$$eval('.txr .tg.own',e=>e.map(x=>x.textContent.trim()));
ok((await p.$$('.txr')).length===2&&owners.every(n=>n==='Asha'),'both transactions are kept and owned by the chosen person after the merge');
await restoreBk(mix([{id:'a3',name:'ICICI Savings ••2444',type:'bank',member:'m1',bank:'ICICI',no:'2444'}]));
await p.click('.mem .pill:has-text("Everyone")');
await p.setInputFiles('#file',sampleStmt);await p.waitForSelector('#imem',{timeout:30000});
ok((await p.$eval('#imem',e=>e.options[e.selectedIndex].text))==='Asha','the owner of the account already on file is preselected');
await p.selectOption('#imem','m2');await p.click('[data-act=stmtgo]');await p.waitForTimeout(500);
ok(/already recorded under Asha/.test(await p.textContent('#toast')),'importing an existing account under someone else is refused with a clear message');
await p.click('[data-act=impcancel]');await p.waitForTimeout(300);
console.log('Offline shell');
for(const n of ['sw.js','manifest.webmanifest']){ok(fs.existsSync(path.join(ROOT,n)),n+' exists')}
JSON.parse(fs.readFileSync(path.join(ROOT,'manifest.webmanifest')));ok(true,'manifest is valid JSON');
await done(h);
})().catch(e=>{console.error(e);process.exit(1)});
