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
console.log('Offline shell');
for(const n of ['sw.js','manifest.webmanifest']){ok(fs.existsSync(path.join(ROOT,n)),n+' exists')}
JSON.parse(fs.readFileSync(path.join(ROOT,'manifest.webmanifest')));ok(true,'manifest is valid JSON');
await done(h);
})().catch(e=>{console.error(e);process.exit(1)});
