const {chromium}=require('playwright');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
exports.ROOT=ROOT;
exports.URL='file://'+ROOT+'/index.html';
exports.launch=async(opts={})=>{
  const browser=await chromium.launch();
  const ctx=await browser.newContext({viewport:{width:1280,height:900},permissions:['clipboard-read','clipboard-write'],...opts});
  const page=await ctx.newPage();const errors=[];
  page.on('pageerror',e=>errors.push('PAGE '+e.message));
  page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text())});
  page.on('request',r=>{const u=r.url();if(!u.startsWith('file:')&&!u.startsWith('data:')&&!u.startsWith('blob:'))errors.push('EXTERNAL REQUEST '+u)});
  return{browser,ctx,page,errors};
};
let fails=0;
exports.ok=(cond,msg)=>{console.log((cond?'  ok   ':'  FAIL ')+msg);if(!cond)fails++};
exports.done=async(h)=>{await h.browser.close();if(h.errors.length){console.log('  FAIL console/network errors:',h.errors.slice(0,5));fails++}process.exit(fails?1:0)};
exports.csv=rows=>'Date,Narration,Debit,Credit,Balance\n'+rows.map(r=>r.join(',')).join('\n')+'\n';
