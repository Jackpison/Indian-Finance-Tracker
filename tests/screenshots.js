const {chromium}=require('playwright');
// Regenerates docs/screenshots from the built-in demo data: node tests/screenshots.js
(async()=>{const b=await chromium.launch();const errs=[];
const D=require('path').resolve(__dirname,'../docs/screenshots')+'/';
async function mk(w,h,scheme,mobile){const c=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,colorScheme:scheme,isMobile:!!mobile,hasTouch:!!mobile});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});await p.goto('file:///home/user/finance-tracker/index.html');await p.waitForTimeout(1800);return p}
let p=await mk(1360,900,'light');
await p.screenshot({path:D+'overview-light.png'});
await p.click('#tabs [data-v=ana]');await p.waitForTimeout(2200);await p.screenshot({path:D+'analytics-light.png'});
await p.click('[data-act=anasub][data-v=cats]');await p.waitForTimeout(2000);await p.screenshot({path:D+'analytics-categories.png'});
await p.click('[data-act=anasub][data-v=patterns]');await p.waitForTimeout(1800);await p.screenshot({path:D+'analytics-patterns.png'});
await p.click('#tabs [data-v=vault]');await p.waitForTimeout(800);await p.screenshot({path:D+'vault.png'});
await p.click('#tabs [data-v=inv]');await p.waitForTimeout(1200);await p.screenshot({path:D+'investments.png'});
await p.click('#tabs [data-v=overview]');await p.waitForTimeout(500);
await p.click('[data-act=settings]');await p.waitForSelector('.setp');await p.click('[data-act=guide]');await p.waitForTimeout(500);await p.screenshot({path:D+'guide.png'});
p=await mk(1360,900,'dark');await p.click('[data-theme-set=dark]').catch(()=>{});await p.waitForTimeout(1200);await p.screenshot({path:D+'overview-dark.png'});
await p.click('#tabs [data-v=ana]');await p.waitForTimeout(2200);await p.screenshot({path:D+'analytics-dark.png'});
p=await mk(390,844,'light',true);await p.screenshot({path:D+'mobile-overview.png'});
await p.evaluate(()=>document.querySelector('#tabs [data-v=ana]').click());await p.waitForTimeout(2000);await p.screenshot({path:D+'mobile-analytics.png'});
console.log('ERRS',errs);await b.close()})();
