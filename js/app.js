(()=>{
'use strict';
const VERSION='0.7.0'; /* keep in sync with version.json and package.json: run deploy/bump.sh */
const $=(s,r=document)=>r.querySelector(s);
/* Neutralise spreadsheet formulas (=,+,-,@) and tabs/newlines in copied or exported cells. */
const xcell=v=>{v=String(v??'').replace(/[\t\r\n]+/g,' ');return /^[=+\-@]/.test(v)?"'"+v:v};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const dt=s=>new Date(s+'T00:00:00');
const addDays=(s,n)=>{const d=dt(s);d.setDate(d.getDate()+n);return iso(d)};
const daysBetween=(a,b)=>Math.round((dt(b)-dt(a))/864e5);

/* ---------- categories ---------- */
const CATS=[
['Income','#14A870'],['Housing','#6C7BFF'],['Groceries','#2FB67C'],['Dining','#F2994A'],['Transport','#19A7CE'],['Shopping','#E05A9B'],
['Subscriptions','#9B6BFF'],['Utilities','#7E92A8'],['Health','#EF5B5B'],['Insurance','#4C9BE8'],['EMI & Loans','#B5735A'],['Travel','#E8B72E'],
['Entertainment','#C46BD6'],['Education','#5CB85C'],['Tax','#8C6D5B'],['Fees','#C2566B'],['Investments','#2B7DE9'],['Transfers','#A9B3C2'],['Other','#98A2B3']];
const CC=Object.fromEntries(CATS);
const NONSPEND=new Set(['Income','Investments','Transfers']);
const KW=[
['Income',/salary|payroll|dividend|int on (fd|rd)|int\.? ?on\b|credit interest|sb int|interest (credited|paid|cr)|int\.? ?pd|stipend|bonus|sal cr/i],
['Investments',/trf to (fd|rd)|fd clos|clo\w* pro\w*|(fd|rd) (booking|closure|premature)|zerodha|groww|upstox|kuvera|indmoney|smallcase|angel one|\bsip\b|mutual fund|\bmf\b|\bppf\b|\bnps\b|sukanya|\bssy\b|nse clearing|\bbse\b|ccil|icclindia|gold ?bees|\bfd\b|\brd\b|bluechip|nippon|mirae|parag parikh/i],
['Transfers',/credit card payment|cc payment|cred club|\bcred\b|payment received|autopay|self transfer|\/self\b|own account|sweep|bbps.*card|card payment/i],
['Insurance',/\blic\b|insurance|hdfc life|sbi life|max life|star health|icici pru|policybazaar|acko|\bdigit\b|premium/i],
['EMI & Loans',/\bemi\b|loan|bajaj fin|home loan|\bnach\b|\becs\b|hdfc ltd/i],
['Fees',/dcardfee|dcard fee|sms ?chgs?|debit card (fee|annual)/i],
['Tax',/income tax|\bgst\b|\btds\b|advance tax|cbdt|property tax|challan|itns/i],
['Education',/school|college|tuition|byju|unacademy|udemy|coursera|university|exam/i],
['Housing',/\brent\b|maintenance|society|nobroker|magicbricks|landlord|housing/i],
['Utilities',/bescom|electricity|bses|tata power|adani elec|mahanagar|water|\bjio\b|airtel|vodafone|bsnl|fibernet|broadband|piped gas|\bgas\b|recharge|\bdth\b|tata play|\bvi\b/i],
['Subscriptions',/netflix|spotify|hotstar|prime|youtube|apple|google (play|one)|icloud|jiocinema|sonyliv|zee5|chatgpt|openai|notion|adobe|cult\.?fit|\bgym\b|linkedin/i],
['Dining',/swiggy|zomato|restaurant|cafe|coffee|starbucks|mcdonald|domino|pizza|\bkfc\b|burger|haldiram|barbeque|biryani|\bchai\b|bakery|eatsure/i],
['Groceries',/bigbasket|blinkit|zepto|instamart|d-?mart|reliance (fresh|smart)|more retail|jiomart|nature'?s basket|grofers|milk|dairy|vegetable|kirana|supermarket|spencer|fresh/i],
['Transport',/uber|\bola\b|rapido|fastag|petrol|fuel|hpcl|bpcl|iocl|indian oil|\bshell\b|metro|dmrc|bmtc|parking|namma/i],
['Travel',/irctc|makemytrip|goibibo|yatra|cleartrip|indigo|air india|vistara|spicejet|akasa|\boyo\b|airbnb|redbus|hotel|ixigo|abhibus|booking\.com/i],
['Health',/apollo|pharmeasy|\b1mg\b|netmeds|medplus|hospital|clinic|diagnostic|\blab\b|practo|dental|pharmacy|medical/i],
['Entertainment',/bookmyshow|\bpvr\b|\binox\b|cinema|steam|dream11|gaming|concert|insider/i],
['Shopping',/amazon|amzn|flipkart|myntra|ajio|nykaa|meesho|croma|reliance digital|tata cliq|decathlon|lifestyle|pantaloons|westside|ikea|shoppers stop|h&m|zara|\bstore\b/i],
['Fees',/\b(fee|fees|charges|charge|penalty|markup)\b|late payment|forex|\bchgs\b/i]];
const STOP=new Set('UPI NEFT IMPS POS ACH RTGS NACH ECS BIL MB IB TO BY TRANSFER DR CR PAYMENT PURCHASE DEBIT CARD ONLINE REF REFNO TXN P2A P2M ICICI HDFC SBI AXIS YBL OKAXIS OKHDFCBANK OKSBI OKICICI PAYTM IBL APL BANK LTD PVT LIMITED INDIA'.split(' '));
const MK=new Map();function mkey(d){let k=MK.get(d);if(k===undefined){k=mkey0(d);if(MK.size>300000)MK.clear();MK.set(d,k)}return k}
function mkey0(d){const w=String(d).toUpperCase().replace(/[^A-Z& ]+/g,' ').split(/\s+/).filter(x=>x.length>1&&!STOP.has(x));
  const u=w.filter((x,i)=>x!==w[i-1]);return (u[0]&&u[0].length>=5?u[0]:u.slice(0,2).join(' '))||String(d).toUpperCase().slice(0,12)}
const pretty=k=>k.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
function categorize(desc,amt){const k=mkey(desc);if(S.rules[k])return S.rules[k];
  for(const [c,re] of KW)if(re.test(desc)){if(c==='Income'&&amt<0)return 'Other';return c}
  return amt>0?'Income':'Other'}

/* ---------- holdings ---------- */
const HT=[['Stocks','#2B7DE9'],['Mutual Funds','#14A870'],['PPF','#E8B72E'],['EPF','#F2994A'],['NPS','#9B6BFF'],['Sukanya Samriddhi','#E05A9B'],['LIC / Insurance','#19A7CE'],['FD / RD','#7E92A8'],['Gold','#C9A227'],['Other','#98A2B3']];
const HC=Object.fromEntries(HT);
const LIMITS={'PPF':150000,'Sukanya Samriddhi':150000,'NPS':50000};
const MCOL=['#3B5BFF','#E0568F','#12936A','#F2994A','#9B6BFF','#19A7CE'];

/* ---------- state ---------- */
const KEY='pocketbook.v2'; /* storage key kept from the original name so saved data keeps loading */
const S={tx:[],hold:[],uploads:[],vault:[],members:[{id:'me',name:'Me',color:MCOL[0]}],accts:[],rules:{},cur:'INR',order:'',member:'all',range:'3m',view:'overview',
  q:'',fcats:[],faccts:[],ftype:'all',fp:false,xo:null,sort:{k:'d',dir:-1},limit:50,page:0,queue:[],imp:null};
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
/* ---------- storage: IndexedDB, optional AES-256-GCM passcode lock ---------- */
const CAN_CRYPTO=!!(window.crypto&&crypto.subtle);
const b64=buf=>{const u=new Uint8Array(buf);let o='';for(let i=0;i<u.length;i+=0x8000)o+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(o)};
const ub64=t=>Uint8Array.from(atob(t),c=>c.charCodeAt(0));
let _db=null;const getDB=()=>_db||(_db=new Promise((res,rej)=>{const r=indexedDB.open('portfolio-db',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
async function kvGet(k){try{const db=await getDB();return await new Promise((res,rej)=>{const q=db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}catch(e){try{return JSON.parse(localStorage.getItem('ift.'+k)||'null')||undefined}catch(x){return undefined}}}
async function kvSet(k,v){try{const db=await getDB();await new Promise((res,rej)=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error||new Error('aborted'))});return true}catch(e){console.error('IndexedDB write failed',e);try{localStorage.setItem('ift.'+k,JSON.stringify(v));return true}catch(x){return false}}}
async function kvDel(k){try{const db=await getDB();await new Promise((res,rej)=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').delete(k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}catch(e){try{localStorage.removeItem('ift.'+k)}catch(x){}}}
const canonBank=b=>window.PFStmt?PFStmt.canonBank(b):String(b||'').trim().toUpperCase();
const TE=new TextEncoder(),TD=new TextDecoder();
async function deriveKey(pass,salt,iter){const km=await crypto.subtle.importKey('raw',TE.encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:iter,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function encStr(key,str){const iv=crypto.getRandomValues(new Uint8Array(12));return{iv:b64(iv),ct:b64(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,TE.encode(str)))}}
async function decStr(key,r){return TD.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:ub64(r.iv)},key,ub64(r.ct)))}
async function tryKey(pass,lm){try{const key=await deriveKey(pass,ub64(lm.salt),lm.iter);if(await decStr(key,lm.check)==='ift-ok')return key}catch(e){}return null}
let bk={last:0,every:30,snooze:0,since:0},lockMeta=null,lockKey=null,autoLockMin=5,booted=false,saveT=null,savingP=Promise.resolve(),pendingRec=null;
const DATA_KEYS=['tx','hold','uploads','vault','members','accts','rules','cur','order'];
function snapshot(){const o={};DATA_KEYS.forEach(k=>o[k]=S[k]);return JSON.stringify(o)}
function applyState(j){if(!j)return;
  Object.assign(S,{tx:[],hold:[],uploads:[],vault:[],members:[],accts:[],rules:{}},Object.fromEntries(DATA_KEYS.filter(k=>j[k]!==undefined).map(k=>[k,j[k]])));
  if(!S.members.length)S.members=[{id:'me',name:'Me',color:MCOL[0]}];S.cur=S.cur||'INR';for(const t of S.tx)if(!t.cat)t.cat=categorize(t.desc,t.amt);repairData()}
/* Tidy-up that runs whenever data is loaded: merges one account that got split by letter case, drops
   deposits that an older statement listed but a newer one no longer does. Reports what it changed. */
function repairData(){const r={acct:0,tx:0,fd:0};
  for(const a of S.accts)if(a.bank){const nb=canonBank(a.bank);if(nb!==a.bank){const old=a.bank;a.bank=nb;if(a.name.toLowerCase().startsWith(old.toLowerCase()))a.name=nb+a.name.slice(old.length)}}
  for(const h of S.hold)if(h.bank){const nb=canonBank(h.bank);if(nb!==h.bank){const old=h.bank;h.bank=nb;if(h.name&&h.name.toLowerCase().startsWith(old.toLowerCase()))h.name=nb+h.name.slice(old.length)}}
  const seen=new Map();
  for(const a of [...S.accts]){if(!a.no||!a.bank)continue;const k=[a.bank,a.no,a.member,a.type].join('|'),f=seen.get(k);if(!f){seen.set(k,a);continue}
    const cnt=m=>{const o=new Map();for(const t of S.tx)if(t.acct===m.id){const q=t.d+'|'+t.amt+'|'+t.desc.toLowerCase();o.set(q,(o.get(q)||0)+1)}return o},cf=cnt(f);
    for(const t of S.tx.filter(x=>x.acct===a.id)){const q=t.d+'|'+t.amt+'|'+t.desc.toLowerCase(),n=cf.get(q)||0;
      if(n>0){cf.set(q,n-1);if(t.xf)unlinkXf(t);t._del=1;r.tx++}else t.acct=f.id}
    S.tx=S.tx.filter(t=>!t._del);
    if((a.balAsOf||'')>(f.balAsOf||'')){f.bal=a.bal;f.balAsOf=a.balAsOf}if(a.sub&&!f.sub)f.sub=a.sub;if(a.limit&&!f.limit)f.limit=a.limit;
    for(const u of S.uploads){if(u.acct===a.id)u.acct=f.id;if(u.accts)u.accts=[...new Set(u.accts.map(x=>x===a.id?f.id:x))]}
    S.accts=S.accts.filter(x=>x!==a);r.acct++}
  const grp=new Map();for(const h of S.hold)if(isStmHold(h)&&h.type==='FD / RD'&&h.asof){const k=h.m+'|'+(h.bank||'').toLowerCase(),g=grp.get(k);if(!g||h.asof>g)grp.set(k,h.asof)}
  const before=S.hold.length;S.hold=S.hold.filter(h=>!(isStmHold(h)&&h.type==='FD / RD'&&h.asof&&h.asof<grp.get(h.m+'|'+(h.bank||'').toLowerCase())));r.fd=before-S.hold.length;
  if(r.acct||r.tx||r.fd){matchTransfers();S._rep=r}return r}
async function saveMeta(){await kvSet('meta',{lock:lockMeta,autoLock:autoLockMin,bk,sync:(sy.on||sy.never)?{on:sy.on?1:0,never:sy.never?1:0,rev:sy.rev,last:sy.last,asalt:sy.asalt}:null})}
function save(){S._rv=(S._rv||0)+1;if(!booted||frozen)return;clearTimeout(saveT);saveT=setTimeout(flush,250)}
/* Saving is defensive: never overwrite newer data written by another tab, keep rolling automatic copies, and say so when a write fails. */
let stateTs=0,frozen=false,saveFail=false,lastBak=0,persisted=null;
const recN=r=>r&&typeof r.n==='number'?r.n:(r&&!r.enc&&r.json?(()=>{try{return JSON.parse(r.json).tx.length}catch(e){return 0}})():null);
function freeze(){frozen=true;modal(`<h2>Changed in another tab</h2><p class="sub">Portfolio is open in another tab or window and saved newer data there. To protect it, this tab stopped saving. Nothing was overwritten.</p><div class="acts"><button class="btn primary" data-act="reload">Reload to continue</button></div>`)}
async function flush(){clearTimeout(saveT);saveT=null;if(!booted||frozen)return;
  if(lockMeta&&!lockKey)return;const json=snapshot(),n=S.tx.length;
  const rec=lockMeta?{enc:true,...await encStr(lockKey,json)}:{enc:false,json};
  savingP=savingP.then(async()=>{
    const cur=await kvGet('state');
    if(cur&&cur.ts&&cur.ts>stateTs){freeze();return false}
    if(cur&&recN(cur)>0){const now=Date.now(),day=new Date().toISOString().slice(0,10);
      await kvSet('state.prev',cur);lastBak=now;
      const d=await kvGet('state.day');if(!d||d.day!==day)await kvSet('state.day',{...cur,day})}
    const ts=Math.max(Date.now(),stateTs+1);rec.ts=ts;rec.n=n;
    const ok=await kvSet('state',rec);if(ok)await kvSet('state.bak',rec);if(ok){stateTs=ts;syncSoon();if(saveFail){saveFail=false;render()}}else if(!saveFail){saveFail=true;render()}
    return ok}).catch(e=>{console.error(e);if(!saveFail){saveFail=true;render()}});return savingP}
addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});addEventListener('pagehide',()=>{flush()});
async function boot(){
  try{if(navigator.storage&&navigator.storage.persist)persisted=await navigator.storage.persist()}catch(e){}
  const meta=(await kvGet('meta'))||{};lockMeta=meta.lock||null;if(meta.sync)Object.assign(sy,meta.sync);autoLockMin=meta.autoLock??5;bk={...bk,...(meta.bk||{})};
  let rec=await kvGet('state'),alt=null;
  if(!rec||recN(rec)===0){const b=await kvGet('state.bak'),pv=await kvGet('state.prev'),d=await kvGet('state.day');alt=[b,pv,d].filter(x=>x&&recN(x)>0).sort((x,y)=>(y.ts||0)-(x.ts||0))[0]||null}
  if(lockMeta){usedAlt=!!(alt&&!rec);pendingRec=alt&&!rec?alt:rec;stateTs=(rec&&rec.ts)||0;showLock();return}
  stateTs=(rec&&rec.ts)||0;
  if(rec&&!rec.enc){try{applyState(JSON.parse(rec.json))}catch(e){console.error(e);frozen=true;booted=true;render();modal(`<h2>Saved data could not be read</h2><p class="sub">Your saved data is still on this device and was left untouched. Reload to try again, or restore a backup file.</p><div class="acts"><button class="btn primary" data-act="reload">Reload</button></div>`);return}}
  if(rec&&rec.enc){frozen=true;booted=true;modal(`<h2>Passcode settings are missing</h2><p class="sub">Your saved data is encrypted, but the passcode settings that unlock it were not found in this browser. Nothing was changed or deleted. Reload to try again, or restore a backup file.</p><div class="acts"><button class="btn primary" data-act="reload">Reload</button></div>`);return}
  gateAlt=alt&&!alt.enc?alt:null;showGate(rec&&!rec.enc&&recN(rec)>0)}
function reportRepair(rec){const r=S._rep;if(!r)return;delete S._rep;try{if(!lockMeta&&rec&&!rec.enc)kvSet('state.prerepair',rec)}catch(e){}save();
  const bits=[r.acct?`merged ${r.acct} duplicate account${r.acct>1?'s':''}`:'',r.tx?`removed ${r.tx} repeated transaction${r.tx>1?'s':''}`:'',r.fd?`dropped ${r.fd} closed deposit${r.fd>1?'s':''}`:''].filter(Boolean);toast('Tidied your data: '+bits.join(', '))}
function recoverDialog(alt){const n=recN(alt),when=alt.ts?new Date(alt.ts).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'earlier';
  modal(`<h2>Recover your data?</h2><p class="sub">The main copy is empty, but an automatic copy from <b>${esc(when)}</b> with <b>${n.toLocaleString('en-IN')} transactions</b> was found on this device.</p><div class="acts"><button class="btn" data-act="close">Start empty</button><button class="btn primary" id="rcv">Restore it</button></div>`);
  $('#rcv').onclick=()=>{try{applyState(JSON.parse(alt.json));save();closeModal();render();toast('Data restored from the automatic copy')}catch(e){toast('That copy could not be read')}}}
let gateAlt=null,usedAlt=false;
function showGate(hasData){const g=$('#gate');g.hidden=false;const im=$('.brand img');if(im)$('#gateimg').src=im.src;
  $('#gatenote').textContent=hasData?'Your data on this device is not locked yet. Choose a passcode and it will be encrypted straight away.':'Everything you add is encrypted with this passcode, on this device, before it is stored.';setTimeout(()=>$('#gpw1').focus(),50)}
async function gateGo(){const err=m=>{$('#gateerr').textContent=m};if(!CAN_CRYPTO)return err('Encryption needs an HTTPS connection (or localhost).');
  const p1=$('#gpw1').value;syncPass=p1;if(p1.length<10)return err('Use at least 10 characters. A few words in a row work well.');if(p1!==$('#gpw2').value)return err('The two passcodes do not match.');
  const b=$('#gatego');b.disabled=true;b.textContent='Securing…';
  try{await new Promise(r=>setTimeout(r,30));

  const salt=crypto.getRandomValues(new Uint8Array(16)),iter=600000,key=await deriveKey(p1,salt,iter);lockMeta={salt:b64(salt),iter,check:await encStr(key,'ift-ok')};lockKey=key;
  $('#gate').hidden=true;$('#gpw1').value=$('#gpw2').value='';booted=true;await saveMeta();await flush();lastAct=Date.now();render();reportRepair(null);if(gateAlt){recoverDialog(gateAlt);gateAlt=null}
  }catch(e){console.error(e);err('Could not create the passcode: '+(e&&e.message||e));b.disabled=false;b.textContent='Create passcode'}}
async function gateRestore(){const err=m=>{$('#gateerr').textContent=m};const pw=$('#gpw1').value;if(!pw)return err('Type the passcode you use on your other devices in the first box, then press this again.');
  const b=$('#gatefetch');b.disabled=true;const was=b.textContent;b.textContent='Restoring…';
  try{const info=await syncCall({a:'info'});if(!info.exists)throw new Error('Nothing is stored on this server yet.');
    const tok=await syncToken(pw,info.asalt),j=await syncCall({a:'pull',token:tok}),bl=j.blob,key=await tryKey(pw,bl.lock);if(!key)throw new Error('Wrong passcode');
    lockMeta={salt:bl.lock.salt,iter:bl.lock.iter,check:bl.lock.check};lockKey=key;applyState(JSON.parse(await decStr(key,bl)));
    Object.assign(sy,{on:true,rev:j.rev,last:Date.now(),asalt:info.asalt,tok});syncPass=pw;
    $('#gate').hidden=true;$('#gpw1').value=$('#gpw2').value='';booted=true;await saveMeta();sy.noSoon=true;try{await flush()}finally{sy.noSoon=false}lastAct=Date.now();render();toast('Restored from your server')}
  catch(e){err(e.message);b.disabled=false;b.textContent=was}}
function showLock(){const l=$('#lock');l.hidden=false;const im=$('.brand img');if(im)$('#lockimg').src=im.src;setTimeout(()=>$('#lockpw').focus(),50)}
let lockFails=0,lockWait=0;
async function doUnlock(){const pw=$('#lockpw').value;if(!pw||Date.now()<lockWait)return;const btn=$('#lockgo');btn.disabled=true;btn.textContent='Unlocking…';
  const key=await tryKey(pw,lockMeta);btn.disabled=false;btn.textContent='Unlock';
  if(!key){lockFails++;if(lockFails>=3)lockWait=Date.now()+Math.min(60,Math.pow(2,lockFails-2))*1000;const c=$('.lockcard');c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake');$('#lockerr').textContent=lockFails>=3?'Wrong passcode. Please wait a few seconds before trying again.':'Wrong passcode. Try again.';$('#lockpw').select();return}
  try{applyState(pendingRec?JSON.parse(await decStr(key,pendingRec)):{})}catch(e){$('#lockerr').textContent='Could not read the saved data.';return}
  lockKey=key;pendingRec=null;syncPass=pw;if(sy.on)try{sy.tok=await syncToken(pw,sy.asalt)}catch(e){}booted=true;$('#lock').hidden=true;$('#lockpw').value='';lastAct=Date.now();render();if(usedAlt){usedAlt=false;save();toast('Your main copy was missing, so the automatic copy was restored')}syncCheck()}
let lastAct=Date.now();['pointerdown','keydown','wheel','touchstart'].forEach(ev=>addEventListener(ev,()=>{lastAct=Date.now()},{passive:true}));
setInterval(()=>{if(lockMeta&&lockKey&&autoLockMin>0&&Date.now()-lastAct>autoLockMin*60000)lockNow()},15000);
async function lockNow(){await flush();location.reload()}
function strength(p){let n=0;if(p.length>=8)n++;if(p.length>=12)n++;if(/[a-z]/.test(p)&&/[A-Z]/.test(p))n++;if(/\d/.test(p))n++;if(/[^A-Za-z0-9]/.test(p))n++;return Math.min(4,n)}
function secForm(mode){const cur=true,nw=true;
  modal(`<h2>Change passcode</h2><p class="sub">Your data is encrypted with AES-256-GCM. The passcode is never stored and cannot be recovered, so keep a backup and remember it.</p>
  ${CAN_CRYPTO?'':'<p class="out">This page is not on a secure (HTTPS) connection, so the browser blocks encryption. Open it over HTTPS or localhost.</p>'}
  <div class="frm">${cur?'<div class="fld full"><label for="pwc">Current passcode</label><input id="pwc" type="password" autocomplete="current-password"></div>':''}
  ${nw?`<div class="fld full"><label for="pw1">New passcode (10+ characters)</label><input id="pw1" type="password" autocomplete="new-password" data-change="pwmeter"><div class="meter" style="margin-top:8px"><i id="pwm"></i></div></div><div class="fld full"><label for="pw2">Repeat passcode</label><input id="pw2" type="password" autocomplete="new-password"></div>`:''}</div><p id="secerr" class="out" style="min-height:1.4em;margin:8px 0 0"></p>
  <div class="acts"><button class="btn" data-act="close">Cancel</button><button class="btn primary" id="secgo" data-act="secgo" data-mode="${mode}">Save passcode</button></div>`)}
async function secGo(mode){const err=m=>{$('#secerr').textContent=m};if(!CAN_CRYPTO)return err('Encryption needs an HTTPS connection.');
  {const k=await tryKey($('#pwc').value,lockMeta);if(!k)return err('Current passcode is wrong.')}
  const np=$('#pw1').value;if(np.length<10)return err('Use at least 10 characters.');if(np!==$('#pw2').value)return err('The two passcodes do not match.');const oldTok=sy.on?await syncToken($('#pwc').value,sy.asalt):null;
  const b=$('#secgo');b.disabled=true;b.textContent='Securing…';await new Promise(r=>setTimeout(r,30));
  {const salt=crypto.getRandomValues(new Uint8Array(16)),iter=600000,key=await deriveKey(np,salt,iter);lockMeta={salt:b64(salt),iter,check:await encStr(key,'ift-ok')};lockKey=key}
  booted=true;await saveMeta();await flush();let note='Passcode changed';
  if(sy.on){try{const nt=await syncToken(np,sy.asalt);await syncPush({oldTok,newTok:nt});sy.tok=nt}catch(e){note='Passcode changed here. Reconnect sync in Settings: '+e.message}}
  closeModal();render();toast(note)}

/* ---------- encrypted sync to your own server (sync.php) ----------
   The server gets the same encrypted backup object a download would contain, plus a token derived from the passcode.
   It cannot read the data. A push is refused if the server holds something this browser has not seen. */
const sy={on:false,never:false,rev:0,last:0,asalt:'',tok:null,busy:false,err:'',t:null,autoTried:false};
const hex=buf=>[...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function syncToken(pass,asalt){const km=await crypto.subtle.importKey('raw',TE.encode(pass),'PBKDF2',false,['deriveBits']);
  const salt=TE.encode(asalt+'|sync-auth');return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},km,256))}
async function syncCall(body){let r;try{r=await fetch('sync.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'})}catch(e){throw new Error('Could not reach sync.php on your server')}
  let j=null;try{j=await r.json()}catch(e){}
  if(!j)throw new Error(r.status===404?'sync.php is not on your server yet. Re-upload the latest release.':'The server did not answer properly (HTTP '+r.status+')');
  if(!r.ok){const e=new Error(j.error||('HTTP '+r.status));e.status=r.status;e.j=j;throw e}return j}
async function syncPush(o={}){if(!lockKey||!sy.tok&&!o.newTok)return;const empty=!S.tx.length&&!S.hold.length&&!S.vault.length&&!S.accts.length;if(empty&&sy.rev)return;
  const blob=await backupObj();const j=await syncCall({a:'push',token:o.oldTok||sy.tok,newtoken:o.newTok||undefined,asalt:sy.asalt,base:sy.rev,blob,force:o.force?1:undefined});
  sy.rev=j.rev;sy.last=Date.now();sy.err='';await saveMeta()}
function hasData(){return S.tx.length||S.hold.length||S.accts.length||S.vault.length}
/* Turned on by itself when the passcode is known, there is data to protect and sync.php answers on the same site.
   If the server already holds a copy it is left alone: Settings, Sync to your server, lets you choose. */
async function autoSync(){if(sy.on||sy.never||sy.autoTried||!syncPass||!lockKey||!hasData()||!/^https?:/.test(location.protocol))return;sy.autoTried=true;
  try{const info=await syncCall({a:'info'});if(info.exists){sy.err='';return}
    sy.asalt=b64(crypto.getRandomValues(new Uint8Array(18))).replace(/[+\/=]/g,'x');sy.tok=await syncToken(syncPass,sy.asalt);sy.on=true;sy.rev=0;await syncPush();await saveMeta();toast('Your data is also kept, encrypted, on your server');render()}
  catch(e){sy.on=false;sy.tok=null}}
function syncSoon(){if(!sy.on&&!sy.never&&!sy.autoTried){autoSync();return}if(!sy.on||!sy.tok||frozen||sy.noSoon)return;clearTimeout(sy.t);sy.t=setTimeout(syncNow,4000)}
async function syncCheck(){if(!sy.on){autoSync();return}if(!sy.tok)return;try{const j=await syncCall({a:'info'});if(j.exists&&j.rev>sy.rev)syncConflict(j.rev);else syncSoon()}catch(e){sy.err=e.message}}
async function syncNow(manual){if(!sy.on||!sy.tok||sy.busy||!booted||frozen)return;sy.busy=true;
  try{sy.noSoon=true;try{await flush()}finally{sy.noSoon=false}await syncPush();if(manual)toast('Synced to your server')}
  catch(e){if(e.status===409){sy.err='conflict';syncConflict(e.j.rev)}else{sy.err=e.message;if(manual)toast(e.message)}}
  finally{sy.busy=false;if($('#syncst'))$('#syncst').innerHTML=syncStatus()}}
function syncStatus(){if(!sy.on)return'<span class="tg warn">Off</span>';if(sy.err==='conflict')return'<span class="tg warn">Needs your choice</span>';if(sy.err)return`<span class="tg warn" title="${esc(sy.err)}">Problem</span>`;return`<span class="tg ok">On</span>`}
function syncConflict(rev){modal(`<h2>Your server has newer data</h2><p class="sub">Another device saved changes to your server since this browser last synced (revision ${rev}). Nothing has been overwritten. Choose which copy to keep.</p><div class="acts"><button class="btn" data-act="synckeep">Keep this device's data</button><button class="btn primary" data-act="syncpull">Use the server's data</button></div>`)}
async function syncPullApply(){const j=await syncCall({a:'pull',token:sy.tok}),b=j.blob;const k=await tryKey(syncPass,b.lock);if(!k)throw new Error('The server copy was made with a different passcode');
  applyState(JSON.parse(await decStr(k,b)));S.member='all';sy.rev=j.rev;sy.last=Date.now();sy.err='';save();await saveMeta()}
let syncPass='';
async function syncConnect(){sy.never=false;const pw=await askSecret('Connect sync','Enter your passcode to connect this browser to your server.');closeModal();if(pw==null)return;
  const k=await tryKey(pw,lockMeta);if(!k)return toast('Wrong passcode');toast('Connecting…');
  try{const info=await syncCall({a:'info'});syncPass=pw;
    if(!info.exists){sy.asalt=b64(crypto.getRandomValues(new Uint8Array(18))).replace(/[+\/=]/g,'x');sy.tok=await syncToken(pw,sy.asalt);sy.on=true;sy.rev=0;await syncPush();toast('Sync is on. Your encrypted data is now on your server.')}
    else{sy.asalt=info.asalt;sy.tok=await syncToken(pw,sy.asalt);sy.on=true;sy.rev=info.rev;await syncCall({a:'pull',token:sy.tok});
      const has=S.tx.length||S.hold.length||S.accts.length;
      if(!has){await syncPullApply();toast('Sync is on. Your data was restored from the server.')}
      else{await saveMeta();modal(`<h2>Your server already has data</h2><p class="sub">It holds revision ${info.rev}. This browser also has data. Pick which to keep. The other copy is replaced, and your server keeps its last few versions.</p><div class="acts"><button class="btn" data-act="synckeep">Keep this device's data</button><button class="btn primary" data-act="syncpull">Use the server's data</button></div>`);render();return}}
    await saveMeta()}catch(e){sy.on=false;sy.tok=null;toast(e.message)}render()}
async function syncResolve(useServer){try{if(useServer){await syncPullApply();toast('Using the server\'s data')}else{const j=await syncCall({a:'info'});sy.rev=j.rev;await syncPush({force:1});toast('Your data replaced the server copy')}sy.err='';closeModal()}catch(e){toast(e.message)}render()}
async function backupObj(){const data=JSON.parse(snapshot());
  if(lockMeta&&lockKey)return{format:'ift-backup-1',enc:true,lock:{salt:lockMeta.salt,iter:lockMeta.iter,check:lockMeta.check},...await encStr(lockKey,JSON.stringify(data))};
  return{format:'ift-backup-1',enc:false,data}}
function askSecret(title,sub){return new Promise(res=>{modal(`<h2>${esc(title)}</h2><p class="sub">${esc(sub)}</p><div class="fld"><label for="pw">Passcode</label><input id="pw" type="password" autocomplete="off"></div><div class="acts"><button class="btn" data-act="pwcancel">Cancel</button><button class="btn primary" data-act="pwok">Continue</button></div>`);window.__pw=res;setTimeout(()=>$('#pw')&&$('#pw').focus(),30)})}
async function restoreObj(j){let data;
  if(j&&j.format==='ift-backup-1'){
    if(j.enc){const pw=await askSecret('Encrypted backup','Enter the passcode this backup was made with.');closeModal();if(pw==null)return;const k=await tryKey(pw,j.lock);if(!k){toast('Wrong passcode for this backup');return}data=JSON.parse(await decStr(k,j))}else data=j.data}
  else data=j;
  applyState(data);S.member='all';booted=true;save();closeModal();render();toast('Backup restored')}
/* ---------- vault ---------- */
const VK={'Credit card':0,'Debit card':0,'Bank account':0,'Demat account':0,'PAN':0,'Aadhaar':0,'PRAN (NPS)':0,'PPF account':0,'Sukanya account':0,'Insurance policy':0,'Mutual fund folio':0,'UPI ID':1,'IFSC':1,'Other':0};
function maskVal(v,kind){if(VK[kind])return v;const ch=[...String(v)],idx=ch.map((c,i)=>/[A-Za-z0-9]/.test(c)?i:-1).filter(i=>i>=0);const keep=new Set(idx.length>4?idx.slice(-4):[]);return ch.map((c,i)=>/[A-Za-z0-9]/.test(c)&&!keep.has(i)?'•':c).join('')}
const REV={};
function vaultView(){
  const items=S.vault.filter(v=>S.member==='all'||v.m===S.member);
  const head=`<div class="sec" style="margin-top:0"><div><h2>Vault</h2><div class="muted">Last 4 characters stay visible. Click Reveal to see the rest, or Copy to copy the full value. Never store a CVV or PIN here.</div></div><button class="btn sm primary" data-act="vadd">+ Add item</button></div>`;
  if(!items.length)return head+`<div class="card empty"><p style="margin:0 0 12px"><b style="color:var(--fg)">Nothing saved yet.</b><br>Add cards, bank accounts, PAN, Aadhaar, demat, PRAN, policy numbers and UPI IDs for the whole family.</p><button class="btn primary" data-act="vadd">Add the first item</button></div>`;
  const by=S.members.map(m=>[m,items.filter(v=>v.m===m.id)]).filter(x=>x[1].length);
  return head+by.map(([m,list])=>`<div class="card" style="margin-bottom:14px"><h3><span style="display:flex;gap:8px;align-items:center"><span class="dot" style="--c:${m.color}"></span>${esc(m.name)}</span><span class="tag">${list.length} item${list.length>1?'s':''}</span></h3>${list.map(vItem).join('')}</div>`).join('')}
function vItem(v){const on=REV[v.id]>Date.now();
  return`<div class="vi" id="v-${v.id}"><div style="min-width:0;flex:1 1 220px"><div style="font-weight:550;overflow-wrap:anywhere">${esc(v.label)} <span class="tag">${esc(v.kind)}</span></div><div class="vnum ${on?'rev':''}">${esc(on||VK[v.kind]?v.value:maskVal(v.value,v.kind))}</div>${v.note?`<div class="faint" style="font-size:12.5px">${esc(v.note)}</div>`:''}</div>
  <div style="display:flex;gap:6px;flex-wrap:wrap">${VK[v.kind]?'':`<button class="btn sm" data-act="vrev" data-id="${v.id}">${on?'Hide':'Reveal'}</button>`}<button class="btn sm" data-act="vcopy" data-id="${v.id}">Copy</button><button class="btn sm" data-act="vedit" data-id="${v.id}">Edit</button></div></div>`}
function vForm(v){v=v||{kind:'Credit card',label:'',value:'',note:'',m:S.member!=='all'?S.member:S.members[0].id};
  modal(`<h2>${v.id?'Edit':'Add'} item</h2><p class="sub">Stored encrypted on this device. Do not enter CVV numbers or PINs.</p><div class="frm">
  <div class="fld"><label for="vk">Type</label>${sel('vk',Object.keys(VK),v.kind)}</div><div class="fld"><label for="vm">Owner</label>${sel('vm',memberOpts(),v.m)}</div>
  <div class="fld full"><label for="vl">Name</label><input id="vl" value="${esc(v.label)}" placeholder="e.g. HDFC Regalia, SBI Savings"></div>
  <div class="fld full"><label for="vv">Number</label><input id="vv" value="${esc(v.value)}" autocomplete="off" spellcheck="false" placeholder="Card, account or ID number"></div>
  <div class="fld full"><label for="vn">Note (optional)</label><input id="vn" value="${esc(v.note||'')}" placeholder="e.g. Expires 08/29, branch, nominee"></div></div>
  <div class="acts">${v.id?`<button class="btn danger" data-act="vdel" data-id="${v.id}">Delete</button>`:''}<span class="grow"></span><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="vsave" data-id="${v.id||''}">Save</button></div>`)}

/* ---------- formatting ---------- */
const loc=()=>S.cur==='INR'?'en-IN':undefined;const nfs={};
function money(n,dec=0){const k=S.cur+dec;const f=nfs[k]||(nfs[k]=new Intl.NumberFormat(loc(),{style:'currency',currency:S.cur,minimumFractionDigits:S.cur==='JPY'?0:dec,maximumFractionDigits:S.cur==='JPY'?0:dec}));return f.format(n)}
function compact(n){const a=Math.abs(n),s=n<0?'-':'';
  if(S.cur==='INR'){const u=a>=1e7?[a/1e7,'Cr']:a>=1e5?[a/1e5,'L']:a>=1e3?[a/1e3,'K']:[a,''];return s+'₹'+(+u[0].toFixed(u[0]<10&&u[1]?1:0))+u[1]}
  const f=nfs.c||(nfs.c=new Intl.NumberFormat(undefined,{style:'currency',currency:S.cur,notation:'compact',maximumFractionDigits:1}));return f.format(n)}
const fd=(s,y=true)=>dt(s).toLocaleDateString('en-IN',{day:'numeric',month:'short',...(y?{year:'numeric'}:{})});
const pc=(a,b)=>b?Math.round(a/b*100):0;
const memOf=id=>S.members.find(m=>m.id===id)||{name:'—',color:'#98A2B3'};
/* Coloured owner tag, shown wherever a row belongs to a family member. */
const ownTag=id=>{const m=memOf(id);return`<span class="tg own" style="--c:${m.color}"><i class="dot" style="--c:${m.color}"></i>${esc(m.name)}</span>`};
const acctOf=id=>S.accts.find(a=>a.id===id)||{name:'Unknown',type:'bank'};

/* ---------- ranges & metrics ---------- */
const bounds=()=>{let mx='0000',mn='9999';for(const t of S.tx){if(t.d>mx)mx=t.d;if(t.d<mn)mn=t.d}return S.tx.length?{mn,mx}:null};
function fyStart(y,m){return m>=4?y:y-1}
const fyLabel=fy=>`FY ${fy}–${String(fy+1).slice(2)}`;
function getRange(){const b=bounds();if(!b)return null;const [y,m]=b.mx.split('-').map(Number);const k=S.range;
  if(k==='all')return{...b,from:b.mn,to:b.mx,pf:null,pt:null,label:'All time'};
  let from,to,pf,pt,label;const fyr=fy=>{from=`${fy}-04-01`;to=`${fy+1}-03-31`;pf=`${fy-1}-04-01`;pt=`${fy}-03-31`;label=fyLabel(fy)};
  if(k==='fy')fyr(fyStart(y,m));else if(k==='lfy')fyr(fyStart(y,m)-1);else if(k.startsWith('fy:'))fyr(+k.slice(3));
  else{let n=1,off=0;if(k==='m1')off=1;else if(k==='5y')n=60;else if(k==='10y')n=120;else if(k!=='m0')n=parseInt(k);
    from=iso(new Date(y,m-1-off-(n-1),1));to=iso(new Date(y,m-off,0));pf=iso(new Date(y,m-1-off-(n-1)-n,1));pt=iso(new Date(y,m-1-off-n,0));
    label=n===1?dt(from).toLocaleDateString('en-IN',{month:'long',year:'numeric'}):n>12&&n%12===0?`Last ${n/12} years`:`Last ${n} months`}
  return{...b,from,to,pf,pt,label}}
function fyList(){const b=bounds();if(!b)return[];const [y,m]=b.mx.split('-').map(Number),[y0,m0]=b.mn.split('-').map(Number),o=[];for(let f=fyStart(y,m);f>=fyStart(y0,m0);f--)o.push(f);return o}
const RANGES=()=>{const b=bounds();let a='This month',c='Last month';if(b){const [y,m]=b.mx.split('-').map(Number);a=new Date(y,m-1,1).toLocaleDateString('en-IN',{month:'short',year:'numeric'});c=new Date(y,m-2,1).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}
  return[['m0',a],['m1',c],['3m','3 months'],['6m','6 months'],['12m','12 months'],['fy','This FY'],['lfy','Last FY'],['5y','5 years'],['10y','10 years'],['all','All time']]};
const PMAIN=['m0','3m','12m','fy','all'];const rangeName=()=>{const m=/^fy:(\d+)/.exec(S.range);return m?fyLabel(+m[1]):'More…'};
const inMember=t=>S.member==='all'||t.m===S.member;
const base=()=>S.tx.filter(inMember);
const within=(a,f,t)=>a.filter(x=>x.d>=f&&x.d<=t);
function sums(a){let inc=0,sp=0;for(const t of a){if(t.cat==='Income')inc+=t.amt;else if(!NONSPEND.has(t.cat))sp-=t.amt}return{inc,sp,net:inc-sp}}
function byCat(a){const o={};for(const t of a)if(!NONSPEND.has(t.cat))o[t.cat]=(o[t.cat]||0)-t.amt;return Object.entries(o).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1])}
function merchants(a){const o={};for(const t of a)if(!NONSPEND.has(t.cat)&&t.amt<0){const k=mkey(t.desc);const e=o[k]||(o[k]={k,sum:0,n:0,cat:t.cat});e.sum-=t.amt;e.n++}return Object.values(o).sort((a,b)=>b.sum-a.sum)}
function buckets(rg,a){const to=rg.to<rg.mx?rg.to:rg.mx,from=rg.from>rg.mn?rg.from:rg.mn;const months=new Set(a.map(t=>t.d.slice(0,7)));const spanM=(dt(to).getFullYear()-dt(from).getFullYear())*12+dt(to).getMonth()-dt(from).getMonth()+1;const out=[];
  if(spanM>30){const f0=fyStart(dt(from).getFullYear(),dt(from).getMonth()+1),f1=fyStart(dt(to).getFullYear(),dt(to).getMonth()+1);for(let fy=f0;fy<=f1;fy++){const x=a.filter(t=>t.d>=`${fy}-04-01`&&t.d<=`${fy+1}-03-31`);out.push({label:`FY${String(fy).slice(2)}`,full:fyLabel(fy),...sums(x)})}return out}
  if(spanM>=2){let [y,m]=from.split('-').map(Number);for(let i=0;i<spanM;i++){const k=`${y}-${pad(m)}`;const s=a.filter(t=>t.d.startsWith(k));out.push({label:new Date(y,m-1,1).toLocaleDateString('en-IN',{month:'short'})+(m===1||i===0?" '"+String(y).slice(2):''),full:new Date(y,m-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'}),...sums(s)});m++;if(m>12){m=1;y++}}}
  else{for(let s=from;s<=to;s=addDays(s,7)){const e=addDays(s,6);const x=a.filter(t=>t.d>=s&&t.d<=e);out.push({label:fd(s,false),full:fd(s,false)+' – '+fd(e<to?e:to,false),...sums(x)})}}
  return out}

/* ---------- charts ---------- */
function nice(v){if(v<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(v))),f=v/p;return(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p}
function spark(v,col){if(v.length<2)return'<span></span>';const w=110,h=34,mx=Math.max(...v),mn=Math.min(...v),sp=(mx-mn)||1;
  const pts=v.map((x,i)=>[2+i*(w-4)/(v.length-1),h-4-(x-mn)/sp*(h-8)]);const l=pts.map(p=>p.map(n=>n.toFixed(1)).join(',')).join(' ');const e=pts[pts.length-1];
  return`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polygon points="2,${h} ${l} ${w-2},${h}" fill="${col}" fill-opacity=".14"/><polyline points="${l}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${e[0]}" cy="${e[1]}" r="3" fill="${col}"/></svg>`}
function cashChart(el,B){const W=Math.max(300,el.clientWidth),H=W>700?420:270,m={l:50,r:8,t:12,b:28};
  const mx=Math.max(1,...B.map(b=>Math.max(b.inc,b.sp))),mnv=Math.min(0,...B.map(b=>b.net));const ymax=nice(mx),ymin=mnv<0?-nice(-mnv):0;
  const y=v=>m.t+(H-m.t-m.b)*(1-(v-ymin)/(ymax-ymin));const band=(W-m.l-m.r)/B.length,bw=Math.min(26,band*.3);let s=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Income versus spending by period">`;
  for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i/4;s+=`<line class="grid-l" x1="${m.l}" x2="${W-m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l-8}" y="${y(v)+4}" text-anchor="end">${compact(v)}</text>`}
  const step=Math.ceil(B.length/Math.max(1,Math.floor((W-m.l)/58)));let pts=[];
  B.forEach((b,i)=>{const cx=m.l+band*(i+.5);const hi=Math.max(1,y(0)-y(b.inc)),hs=Math.max(1,y(0)-y(b.sp));
    s+=`<rect class="b-in" x="${cx-bw-2}" y="${y(b.inc)}" width="${bw}" height="${hi}" rx="5"/><rect class="b-out" x="${cx+2}" y="${y(b.sp)}" width="${bw}" height="${hs}" rx="5"/>`;
    pts.push([cx,y(b.net)]);if(i%step===0)s+=`<text x="${cx}" y="${H-8}" text-anchor="middle">${esc(b.label)}</text>`});
  s+=`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linejoin="round"/>`;
  pts.forEach(p=>s+=`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>`);
  B.forEach((b,i)=>{const tip=`<b>${esc(b.full)}</b><br>Income ${money(b.inc)}<br>Spending ${money(b.sp)}<br>Net ${money(b.net)}`;s+=`<rect x="${m.l+band*i}" y="${m.t}" width="${band}" height="${H-m.t-m.b}" fill="transparent" data-tip="${esc(tip)}"/>`});
  el.innerHTML=s+'</svg>'}
function donut(el,items,total,center){const R=72,C=2*Math.PI*R;let off=0,s=`<svg width="190" height="190" viewBox="0 0 190 190" role="img" aria-label="Breakdown"><g transform="rotate(-90 95 95)"><circle cx="95" cy="95" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="24"/>`;
  items.forEach(([n,v,c])=>{const len=v/total*C,g=items.length>1?Math.min(3,len*.2):0;s+=`<circle class="seg" data-seg="${esc(n)}" cx="95" cy="95" r="${R}" fill="none" stroke="${c}" stroke-width="24" stroke-dasharray="${Math.max(0,len-g)} ${C-len+g}" stroke-dashoffset="${-off}" data-tip="${esc(`<b>${n}</b><br>${money(v)} · ${pc(v,total)}%`)}"/>`;off+=len});
  el.innerHTML=s+`</g></svg><div class="ctr"><small>${esc(center[0])}</small><b class="num">${esc(center[1])}</b></div>`}

/* ---------- ui helpers ---------- */
let toastT;
function copyText(t,msg){const done=()=>toast(msg||'Copied');const fb=()=>{const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(e){toast('Copy was blocked by the browser')}ta.remove()};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,fb);else fb()}
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2600)}
function modal(html){const m=$('#modal');m.hidden=false;m.innerHTML=`<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;const f=m.querySelector('input:not([type=hidden]),select');}
function closeModal(){$('#modal').hidden=true;$('#modal').innerHTML=''}
const sel=(id,opts,cur,extra='')=>`<select id="${id}" ${extra}>${opts.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];return`<option value="${esc(v)}" ${String(v)===String(cur)?'selected':''}>${esc(l)}</option>`}).join('')}</select>`;
const memberOpts=()=>S.members.map(m=>[m.id,m.name]);

/* ---------- views ---------- */
const ICON={
filter:'<path d="M3 5h18M6 12h12M10 19h4"/>',
overview:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
tx:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
cards:'<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/>',
inv:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
rec:'<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
ana:'<path d="M3 20h18"/><path d="M5 16l4-5 4 3 6-8"/><circle cx="19" cy="6" r="1.3"/>',
gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
bal:'<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8"/><path d="M3 20h18"/>',
up:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
vault:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',plus:'<path d="M12 5v14M5 12h14"/>',dots:'<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'};
const svg=(p,s=18)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const TABS=[['overview','Overview',ICON.overview,'Summary'],['bal','Portfolio',ICON.bal],['tx','Transactions',ICON.tx,'Money'],['cards','Cards',ICON.cards],['rec','Recurring',ICON.rec],['inv','Investments',ICON.inv,'Wealth'],['ana','Analytics',ICON.ana],['vault','Vault',ICON.vault,'Private'],['up','Uploads',ICON.up],['settings','Settings',ICON.gear,'Preferences'],['upd','Updates',ICON.up]];
const HEAD={overview:['Overview','Your money at a glance'],bal:['Portfolio','What you hold today: accounts, cards, deposits and investments, in total and per person'],tx:['Transactions','Every payment, searchable and editable'],cards:['Cards','Spending and limits on your credit cards'],rec:['Recurring','Bills and subscriptions repeating every month'],inv:['Investments','What you own and what it is worth'],ana:['Analytics','Trends over time'],vault:['Vault','Card and ID numbers, kept masked'],up:['Uploads','Every file you have imported'],upd:['Updates','Check GitHub for a new version and install it with your password'],settings:['Settings','Family, security, sync, backup and data tools']};
function moveInd(){const tb=$('#tabs'),b=tb.querySelector('[aria-selected=true]'),i=tb.querySelector('.ind');if(b&&i){i.style.left=b.offsetLeft+'px';i.style.width=b.offsetWidth+'px'}}
function renderChrome(){
  const tb=$('#tabs');
  if(!tb.dataset.ready){tb.innerHTML=TABS.map(([k,l,ic,g])=>(g?`<div class="navh">${g}</div>`:'')+`<button role="tab" data-act="view" data-v="${k}">${svg(ic,17)}<span>${l}</span>${k==='upd'?`<em class="ver">v${VERSION}</em>`:''}</button>`).join('')+'<i class="ind"></i>';tb.dataset.ready='1';const br=document.querySelector('.top .brand');if(br){const c=br.cloneNode(true);c.classList.add('sidebrand');tb.prepend(c)}}
  tb.querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.v===S.view)));moveInd();
  const dk=(k,l)=>`<button class="${S.view===k?'on':''}" data-act="view" data-v="${k}" aria-label="${l}">${svg(ICON[k],20)}<span>${l}</span></button>`;
  $('#dock').innerHTML=dk('overview','Home')+dk('tx','Activity')+`<button class="fab" data-act="fab" aria-label="Add or import">${svg(ICON.plus,24)}</button>`+dk('inv','Invest')+`<button data-act="more" class="${['cards','rec','up','vault','ana'].includes(S.view)?'on':''}" aria-label="More">${svg(ICON.dots,20)}<span>More</span></button>`;
  $('#lockbtn').hidden=!lockMeta;
  const showR=!['inv','up','vault','bal','settings','upd'].includes(S.view),showM=!['up','vault','bal','settings','upd'].includes(S.view);
  {const hd=HEAD[S.view];$('#ptitle').innerHTML=hd&&S.view!=='upd'?`<h1>${hd[0]}</h1><span>${hd[1]}</span>`:''}
  $('#bar').innerHTML=pageHead()+`<div class="mem" role="group" aria-label="Family member"><button class="pill" aria-pressed="${S.member==='all'}" data-act="member" data-v="all">Everyone</button>${S.members.map(m=>`<button class="pill" aria-pressed="${S.member===m.id}" data-act="member" data-v="${m.id}"><span class="dot" style="--c:${m.color}"></span>${esc(m.name)}</button>`).join('')}</div>
  <div class="grow"></div>${showR?`<div class="pills" role="group" aria-label="Period">${RANGES().filter(([k])=>PMAIN.includes(k)).map(([k,l])=>`<button class="pill" aria-pressed="${S.range===k}" data-act="range" data-v="${k}">${esc(l)}</button>`).join('')}</div><select class="fysel" id="fysel" aria-label="More periods"><option value="">${PMAIN.includes(S.range)?'More…':esc((RANGES().find(r=>r[0]===S.range)||[0,rangeName()])[1])}</option>${RANGES().filter(([k])=>!PMAIN.includes(k)).map(([k,l])=>`<option value="${k}" ${S.range===k?'selected':''}>${esc(l)}</option>`).join('')}${fyList().map(f=>`<option value="fy:${f}" ${S.range==='fy:'+f?'selected':''}>${fyLabel(f)}</option>`).join('')}</select>`:''}`}
/* ---------- analytics ---------- */
const CH=[];const cc=n=>CC[n]||'#98A2B3';
function chart(id,fn){CH.push([id,fn])}
function drawCharts(){CH.forEach(([id,fn])=>{const el=document.getElementById(id);if(el){el._W=el.clientWidth;try{fn(el)}catch(e){console.error(e);el.innerHTML='<div class="muted">This chart could not be drawn.</div>'}}})}
function mono(pts){const n=pts.length;if(n<2)return'';const dx=[],m=[],t=[];
  for(let i=0;i<n-1;i++){dx[i]=pts[i+1][0]-pts[i][0];m[i]=dx[i]===0?0:(pts[i+1][1]-pts[i][1])/dx[i]}
  t[0]=m[0];t[n-1]=m[n-2];for(let i=1;i<n-1;i++)t[i]=m[i-1]*m[i]<=0?0:(m[i-1]+m[i])/2;
  for(let i=0;i<n-1;i++){if(m[i]===0){t[i]=t[i+1]=0}else{const a=t[i]/m[i],b=t[i+1]/m[i],h=Math.hypot(a,b);if(h>3){const k=3/h;t[i]=k*a*m[i];t[i+1]=k*b*m[i]}}}
  let d='';for(let i=0;i<n-1;i++){const h=dx[i]/3,x0=pts[i][0],y0=pts[i][1],x1=pts[i+1][0],y1=pts[i+1][1];d+=`C${(x0+h).toFixed(1)},${(y0+t[i]*h).toFixed(1)} ${(x1-h).toFixed(1)},${(y1-t[i+1]*h).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`}return d}
const mLabel=(y,m)=>new Date(y,m-1,1).toLocaleDateString('en-IN',{month:'short',year:'2-digit'});
const mFull=k=>{const [y,m]=k.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'})};
function monthKeys(from,to){const o=[];let [y,m]=from.slice(0,7).split('-').map(Number);const [y2,m2]=to.slice(0,7).split('-').map(Number);while(y<y2||(y===y2&&m<=m2)){o.push(`${y}-${pad(m)}`);m++;if(m>12){m=1;y++}}return o}
function monthStats(a){const g={};for(const t of a){const k=t.d.slice(0,7);const e=g[k]||(g[k]={inc:0,sp:0,inv:0,cats:{}});if(t.cat==='Income')e.inc+=t.amt;else if(t.cat==='Investments')e.inv-=t.amt;else if(t.cat!=='Transfers'){e.sp-=t.amt;e.cats[t.cat]=(e.cats[t.cat]||0)-t.amt}}return g}
let MSc=null,MSk='';function MS(){const k=S.tx.length+'|'+S.member+'|'+S._rv;if(MSk!==k){MSc=monthStats(base());MSk=k}return MSc}
function fyTotals(ms){const o={};for(const k in ms){const [y,m]=k.split('-').map(Number),fy=fyStart(y,m),e=o[fy]||(o[fy]={inc:0,sp:0,inv:0,months:Array(12).fill(null),cats:{}});const i=m>=4?m-4:m+8,x=ms[k];e.inc+=x.inc;e.sp+=x.sp;e.inv+=x.inv;e.months[i]=x;for(const c in x.cats)e.cats[c]=(e.cats[c]||0)+x.cats[c]}return o}
function fyComplete(fy){const b=bounds();return b.mn<=`${fy}-04-05`&&b.mx>=`${fy+1}-03-25`}
const seg=(act,opts,cur)=>`<div class="segc">${opts.map(([v,l])=>`<button class="${v===cur?'on':''}" data-act="${act}" data-v="${v}">${l}</button>`).join('')}</div>`;
const acard=(cls,title,right,body)=>`<div class="card ${cls}"><h3>${title}${right?`<span>${right}</span>`:''}</h3>${body}</div>`;
const tile=(l,v,f)=>`<div class="card kpi s2"><div class="lbl">${l}</div><div class="val num" style="font-size:22px">${v}</div><div class="foot"><span class="faint">${f||''}</span></div></div>`;
const ticksX=(keys,W,m)=>{const N=keys.length,band=(W-m.l-m.r)/Math.max(1,N-1);let s='';
  if(N>36){keys.forEach((k,i)=>{if(k.endsWith('-01'))s+=`<text x="${m.l+i*band}" y="${0}" text-anchor="middle" class="xt">${k.slice(0,4)}</text>`})}
  else{const step=Math.ceil(N/Math.max(2,Math.floor((W-m.l-m.r)/66)));keys.forEach((k,i)=>{if(i%step===0){const [y,mo]=k.split('-').map(Number);s+=`<text x="${m.l+i*band}" y="0" text-anchor="middle" class="xt">${mLabel(y,mo)}</text>`}})}
  return s};

function anaView(){const rg=getRange();if(!rg)return empty('Import transactions to see analytics.');
  const sub=S.ana||'trends',who=S.member==='all'?'the whole family':memOf(S.member).name;
  const head=`<div class="sec" style="margin-top:0"><div><div class="muted" style="font-size:13.5px">${sub==='years'?'All years on record':esc(rg.label)} · ${esc(who)}</div></div>${seg('anasub',[['trends','Trends'],['cats','Categories'],['patterns','Patterns'],['years','Years']],sub)}</div>`;
  const cur=within(base(),rg.from,rg.to);
  return head+{trends:anaTrends,cats:anaCats,patterns:anaPatterns,years:anaYears}[sub](rg,cur)}

/* ===== Trends ===== */
function forecast(){const ms=MS(),b=bounds();let keys=Object.keys(ms).sort();if(keys.length<4)return null;
  const [ly,lm]=keys[keys.length-1].split('-').map(Number);if(Number(b.mx.slice(8))<new Date(ly,lm,0).getDate()-2)keys.pop();if(keys.length<4)return null;
  const get=(k,f)=>ms[k]?ms[k][f]:0,avg=(a,f)=>a.length?a.reduce((x,k)=>x+get(k,f),0)/a.length:0,l3=keys.slice(-3),p3=keys.slice(-6,-3),out=[];
  let [y,m]=keys[keys.length-1].split('-').map(Number);
  for(let i=1;i<=3;i++){m++;if(m>12){m=1;y++}const o={label:mLabel(y,m)},prev=`${y-1}-${pad(m)}`;
    for(const f of['inc','sp']){const bs=.6*avg(l3,f)+.4*(p3.length?avg(p3,f):avg(l3,f));o[f]=ms[prev]?.7*bs+.3*get(prev,f):bs}o.net=o.inc-o.sp;out.push(o)}
  return out}
function anaTrends(rg,cur){const ms=MS(),to=rg.to<rg.mx?rg.to:rg.mx;let from=rg.from>rg.mn?rg.from:rg.mn;/* trend charts need some history: show at least 6 months */{const [y,m]=to.split('-').map(Number),six=iso(new Date(y,m-6,1));if(from>six)from=six>rg.mn?six:rg.mn}const keys=monthKeys(from,to),N=keys.length;
  let inc=0,sp=0,inv=0;const spv=[],nets=[];keys.forEach(k=>{const e=ms[k]||{inc:0,sp:0,inv:0};inc+=e.inc;sp+=e.sp;inv+=e.inv;spv.push(e.sp);nets.push(e.inc-e.sp)});
  const avgI=inc/N,avgS=sp/N,sd=Math.sqrt(spv.reduce((a,x)=>a+(x-avgS)**2,0)/N),cv=avgS?sd/avgS*100:0,rate=inc>0?(inc-sp)/inc*100:0,bi=nets.indexOf(Math.max(...nets));
  const liquid=S.hold.filter(inMember).filter(h=>['Stocks','Mutual Funds','FD / RD','Gold'].includes(h.type)).reduce((a,h)=>a+h.value,0),runway=avgS>0?liquid/avgS:0;
  const ft=fyTotals(MS()),done=Object.keys(ft).map(Number).filter(fyComplete).sort((a,b)=>a-b);let cagr=null;if(done.length>=2){const a=ft[done[0]].sp,z=ft[done[done.length-1]].sp;if(a>0&&z>0)cagr=(Math.pow(z/a,1/(done.length-1))-1)*100}
  const fc=forecast();
  chart('ch-stream',el=>streamChart(el,keys,ms,S.stream||'stream'));chart('ch-cum',el=>cumChart(el,keys,ms));chart('ch-rate',el=>rateChart(el,keys,ms));
  return`<div class="grid" style="margin-bottom:14px">${tile('Avg income',tick(avgI),`over ${N} month${N>1?'s':''}`)}${tile('Avg spend',tick(avgS),cagr==null?'':`${cagr>=0?'+':''}${cagr.toFixed(1)}% a year`)}${tile('Savings rate',tick(rate,'p'),rate>=20?'Healthy':rate>=5?'Could be higher':'Low')}
  ${tile('Best month',bi>=0&&N?mLabel(...keys[bi].split('-').map(Number)):'—',bi>=0&&N?`${money(nets[bi])} saved`:'')}${tile('Volatility',`${cv.toFixed(0)}%`,cv<20?'Very steady':cv<40?'Fairly steady':'Lumpy')}${tile('Runway',runway?`${runway.toFixed(1)} mo`:'—',liquid?`${compact(liquid)} liquid assets`:'Add investments')}</div>
  <div class="grid">${acard('s12','Spending flow',seg('streammode',[['stream','Flow'],['stack','Stacked'],['pct','Share']],S.stream||'stream'),'<div id="ch-stream" class="chart"></div><div id="ch-stream-l" class="legend" style="margin-top:10px"></div>')}
  ${acard('s6','Cumulative savings and investing','<span class="legend"><span><i style="background:var(--accent)"></i>Saved</span><span><i style="background:var(--in)"></i>Invested</span></span>','<div id="ch-cum" class="chart"></div>')}
  ${acard('s6','Savings rate by month','<span class="legend"><span><i style="background:var(--in)"></i>Month</span><span><i style="background:var(--accent)"></i>6-mo average</span></span>','<div id="ch-rate" class="chart"></div>')}
  ${fc?acard('s12','Outlook for the next 3 months','<span class="faint">Based on recent months and last year</span>',`<div class="outlook">${fc.map(o=>`<div class="ol"><div class="muted" style="font-weight:600">${o.label}</div><div class="num" style="font-size:22px;margin:4px 0 6px;color:var(--${o.net>=0?'in':'out'})">${o.net>=0?'+':'−'}${money(Math.abs(o.net))}</div><div class="faint" style="font-size:12.5px">Income ${compact(o.inc)} · Spend ${compact(o.sp)}</div></div>`).join('')}</div>`):''}</div>`}
function streamChart(el,keys,ms,mode){const W=Math.max(320,el.clientWidth),H=370,m={l:mode==='stream'?14:54,r:14,t:14,b:30},N=keys.length;
  if(N<2){el.innerHTML='<div class="muted" style="padding:30px 0">Pick a range of at least two months to see the flow.</div>';return}
  const tot={};keys.forEach(k=>{const e=ms[k];if(e)for(const c in e.cats)tot[c]=(tot[c]||0)+Math.max(0,e.cats[c])});
  const all=Object.entries(tot).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).map(x=>x[0]),top=all.slice(0,8),rest=all.slice(8),names=[...top];if(rest.length)names.push('Other categories');
  let vals=names.map(n=>keys.map(k=>{const e=ms[k];if(!e)return 0;return n==='Other categories'?rest.reduce((a,c)=>a+Math.max(0,e.cats[c]||0),0):Math.max(0,e.cats[n]||0)}));
  const sumAt=i=>vals.reduce((a,v)=>a+v[i],0),totals=keys.map((_,i)=>sumAt(i));
  if(mode==='pct')vals=vals.map(v=>v.map((x,i)=>totals[i]?x/totals[i]*100:0));
  const baseL=keys.map((_,i)=>mode==='stream'?-sumAt(i)/2:0),lo=[],up=[];let cum=baseL.slice();
  vals.forEach(v=>{lo.push(cum.slice());cum=cum.map((c,i)=>c+v[i]);up.push(cum.slice())});
  const maxTop=Math.max(...cum,1),minBase=Math.min(...baseL,0);let ymin,ymax;
  if(mode==='pct'){ymin=0;ymax=100}else if(mode==='stream'){ymax=maxTop*1.06;ymin=minBase*1.06}else{ymin=0;ymax=nice(maxTop)}
  const x=i=>m.l+i*(W-m.l-m.r)/(N-1),y=v=>m.t+(H-m.t-m.b)*(1-(v-ymin)/(ymax-ymin)),id='sg'+uid();
  let s=`<svg class="reveal" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Spending by category over time"><defs>${names.map((n,j)=>{const c=n==='Other categories'?'#98A2B3':cc(n);return`<linearGradient id="${id}${j}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".88"/><stop offset="1" stop-color="${c}" stop-opacity=".78"/></linearGradient>`}).join('')}</defs>`;
  if(mode!=='stream'){for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i/4;s+=`<line class="grid-l" x1="${m.l}" x2="${W-m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l-8}" y="${y(v)+4}" text-anchor="end">${mode==='pct'?Math.round(v)+'%':compact(v)}</text>`}}
  for(let j=names.length-1;j>=0;j--){const U=keys.map((_,i)=>[x(i),y(up[j][i])]),L=keys.map((_,i)=>[x(i),y(lo[j][i])]);
    s+=`<path d="M${U[0][0]},${U[0][1]}${mono(U)}L${L[N-1][0]},${L[N-1][1]}${mono(L.slice().reverse())}Z" fill="url(#${id}${j})" stroke="var(--surface)" stroke-width=".8" stroke-linejoin="round"/>`}
  s+=`<g transform="translate(0,${H-9})">${ticksX(keys,W,m)}</g><line class="guide" x1="0" x2="0" y1="${m.t}" y2="${H-m.b}"/>`;
  const band=(W-m.l-m.r)/(N-1);keys.forEach((k,i)=>{const rows=names.map((n,j)=>[n,vals[j][i],j]).filter(r=>r[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,7);
    const tip=`<b>${mFull(k)}</b><br>`+rows.map(r=>`<span style="color:${r[0]==='Other categories'?'#98A2B3':cc(r[0])}">●</span> ${esc(r[0])} ${mode==='pct'?r[1].toFixed(0)+'%':compact(r[1])}`).join('<br>')+`<br><b>Total ${money(totals[i])}</b>`;
    s+=`<rect class="hit" data-x="${x(i)}" x="${x(i)-band/2}" y="${m.t}" width="${band}" height="${H-m.t-m.b}" fill="transparent" data-tip="${esc(tip)}"/>`});
  el.innerHTML=s+'</svg>';
  const lg=document.getElementById('ch-stream-l');if(lg)lg.innerHTML=names.map(n=>`<span><i style="background:${n==='Other categories'?'#98A2B3':cc(n)}"></i>${esc(n)}</span>`).join('')}
function cumChart(el,keys,ms){const W=Math.max(300,el.clientWidth),H=280,m={l:54,r:12,t:12,b:30},N=keys.length;if(N<2){el.innerHTML='<div class="muted" style="padding:30px 0">Needs two or more months.</div>';return}
  let a=0,b=0;const A=[],B=[];keys.forEach(k=>{const e=ms[k]||{inc:0,sp:0,inv:0};a+=e.inc-e.sp-e.inv;b+=e.inv;A.push(a);B.push(b)});
  const hi=Math.max(...A,...B,1),lo=Math.min(0,...A,...B),ymax=nice(hi),ymin=lo<0?-nice(-lo):0,x=i=>m.l+i*(W-m.l-m.r)/(N-1),y=v=>m.t+(H-m.t-m.b)*(1-(v-ymin)/(ymax-ymin)),id='cg'+uid();
  let s=`<svg class="reveal" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".38"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>`;
  for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i/4;s+=`<line class="grid-l" x1="${m.l}" x2="${W-m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l-8}" y="${y(v)+4}" text-anchor="end">${compact(v)}</text>`}
  const PA=A.map((v,i)=>[x(i),y(v)]),PB=B.map((v,i)=>[x(i),y(v)]);
  s+=`<path d="M${PA[0][0]},${y(0)}L${PA[0][0]},${PA[0][1]}${mono(PA)}L${PA[N-1][0]},${y(0)}Z" fill="url(#${id})"/><path d="M${PA[0][0]},${PA[0][1]}${mono(PA)}" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/><path d="M${PB[0][0]},${PB[0][1]}${mono(PB)}" fill="none" stroke="var(--in)" stroke-width="2.4" stroke-linecap="round"/>`;
  s+=`<g transform="translate(0,${H-9})">${ticksX(keys,W,m)}</g><line class="guide" x1="0" x2="0" y1="${m.t}" y2="${H-m.b}"/>`;
  const band=(W-m.l-m.r)/(N-1);keys.forEach((k,i)=>{s+=`<rect class="hit" data-x="${x(i)}" x="${x(i)-band/2}" y="${m.t}" width="${band}" height="${H-m.t-m.b}" fill="transparent" data-tip="${esc(`<b>${mFull(k)}</b><br>Saved to date ${money(A[i])}<br>Invested to date ${money(B[i])}`)}"/>`});
  el.innerHTML=s+'</svg>'}
function rateChart(el,keys,ms){const W=Math.max(300,el.clientWidth),H=280,m={l:44,r:12,t:12,b:30},N=keys.length;if(N<2){el.innerHTML='<div class="muted" style="padding:30px 0">Needs two or more months.</div>';return}
  const R=keys.map(k=>{const e=ms[k];return e&&e.inc>0?clamp((e.inc-e.sp)/e.inc*100)*1-(((e.inc-e.sp)/e.inc*100)<0?clamp(-(e.inc-e.sp)/e.inc*100)*2:0):null}),MA=R.map((_,i)=>{const w=R.slice(Math.max(0,i-5),i+1).filter(v=>v!=null);return w.length?w.reduce((a,v)=>a+v,0)/w.length:null});
  const x=i=>m.l+(i+.5)*(W-m.l-m.r)/N,y=v=>m.t+(H-m.t-m.b)*(1-(v+100)/200),band=(W-m.l-m.r)/N,bw=Math.max(2,Math.min(22,band*.62));
  let s=`<svg class="reveal" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  [-100,-50,0,50,100].forEach(v=>{s+=`<line class="grid-l" x1="${m.l}" x2="${W-m.r}" y1="${y(v)}" y2="${y(v)}" ${v===0?'style="stroke:var(--faint)"':''}/><text x="${m.l-8}" y="${y(v)+4}" text-anchor="end">${v}%</text>`});
  R.forEach((v,i)=>{if(v==null)return;const h=Math.max(1.5,Math.abs(y(v)-y(0)));s+=`<rect class="${v>=0?'b-in':'b-out'}" x="${x(i)-bw/2}" y="${v>=0?y(v):y(0)}" width="${bw}" height="${h}" rx="3" style="animation-delay:${i*8}ms"/>`});
  const pts=MA.map((v,i)=>v==null?null:[x(i),y(v)]).filter(Boolean);if(pts.length>1)s+=`<path d="M${pts[0][0]},${pts[0][1]}${mono(pts)}" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/>`;
  const keys2=keys.map(k=>k);s+=`<g transform="translate(0,${H-9})">${ticksX(keys2,W,{l:m.l+band/2,r:m.r+band/2})}</g><line class="guide" x1="0" x2="0" y1="${m.t}" y2="${H-m.b}"/>`;
  keys.forEach((k,i)=>{const e=ms[k]||{inc:0,sp:0};const r=e.inc>0?(e.inc-e.sp)/e.inc*100:null;s+=`<rect class="hit" data-x="${x(i)}" x="${x(i)-band/2}" y="${m.t}" width="${band}" height="${H-m.t-m.b}" fill="transparent" data-tip="${esc(`<b>${mFull(k)}</b><br>${r==null?'No income':'Savings rate '+r.toFixed(0)+'%'}<br>Income ${money(e.inc)}<br>Spend ${money(e.sp)}`)}"/>`});
  el.innerHTML=s+'</svg>'}

/* ===== Categories ===== */
function anaCats(rg,cur){chart('ch-sank',el=>sankey(el,cur));chart('ch-tree',el=>treemap(el,cur));
  const prv=rg.pf?within(base(),rg.pf,rg.pt):[],pm=Object.fromEntries(byCat(prv)),cm=Object.fromEntries(byCat(cur));
  const mv=[...new Set([...Object.keys(cm),...Object.keys(pm)])].map(n=>({n,d:(cm[n]||0)-(pm[n]||0),c:cm[n]||0,p:pm[n]||0})).filter(x=>x.c||x.p).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d)).slice(0,8),mx=Math.max(...mv.map(x=>Math.abs(x.d)),1);
  const ft=fyTotals(MS()),fys=Object.keys(ft).map(Number).sort((a,b)=>a-b),done=fys.filter(fyComplete),latest=fys[fys.length-1];
  const cats=[...new Set(fys.flatMap(f=>Object.keys(ft[f].cats)))].filter(c=>!NONSPEND.has(c)).sort((a,b)=>(ft[latest].cats[b]||0)-(ft[latest].cats[a]||0));
  const rows=cats.map(c=>{const ser=fys.map(f=>Math.max(0,ft[f].cats[c]||0)),last=ser[ser.length-1],prev=ser[ser.length-2];let cg=null;if(done.length>=2){const a=ft[done[0]].cats[c]||0,z=ft[done[done.length-1]].cats[c]||0;if(a>0&&z>0)cg=(Math.pow(z/a,1/(done.length-1))-1)*100}
    return`<tr><td style="font-weight:500"><span class="dot" style="--c:${cc(c)}"></span> ${esc(c)}</td><td>${spark(ser,cc(c))}</td><td class="r num">${money(last)}</td><td class="r num">${prev&&fyComplete(latest)?dChip(last,prev,true):'—'}</td><td class="r num ${cg==null?'faint':cg>8?'out':cg<0?'in':''}">${cg==null?'—':(cg>=0?'+':'')+cg.toFixed(1)+'%'}</td></tr>`}).join('');
  return`<div class="grid">${acard('s12','Where your income goes','<span class="faint">Hover a band for the exact amount</span>','<div id="ch-sank" class="chart"></div>')}
  ${acard('s7','Biggest merchants','<span class="faint">Tile size is spend</span>','<div id="ch-tree" class="chart" style="height:380px"></div>')}
  ${acard('s5','Movers vs previous period',rg.pf?'':'<span class="faint">No earlier period</span>',`<div class="rows">${!rg.pf?'<div class="muted">Pick a bounded range (like 3 or 12 months) to compare with the period before it.</div>':mv.map(x=>`<div class="lrow" style="grid-template-columns:auto minmax(0,1fr) 90px auto"><span class="dot" style="--c:${cc(x.n)}"></span><span class="nm">${esc(x.n)}</span><div class="prog" style="--c:${x.d>0?'var(--out)':'var(--in)'}"><i style="width:${Math.abs(x.d)/mx*100}%"></i></div><span class="num ${x.d>0?'out':'in'}">${x.d>0?'+':'−'}${compact(Math.abs(x.d))}</span></div>`).join('')||'<div class="muted">Not enough data.</div>'}</div>`)}
  ${acard('s12','Category growth by financial year',done.length<2?'<span class="faint">Growth rate needs two full years</span>':`<span class="faint">Growth is the yearly rate across ${done.length} full years</span>`,`<div class="scroll"><table class="tbl hold"><thead><tr><th>Category</th><th>Trend</th><th class="r">${fyLabel(latest)}${fyComplete(latest)?'':' so far'}</th><th class="r">vs last year</th><th class="r">Growth a year</th></tr></thead><tbody>${rows}</tbody></table></div>`)}</div>`}
function sankey(el,cur){const c=sums(cur),spend=Object.entries(Object.fromEntries(byCat(cur))).sort((a,b)=>b[1]-a[1]),inv=-cur.filter(t=>t.cat==='Investments').reduce((a,t)=>a+t.amt,0);
  const R=spend.slice(0,8).map(([n,v])=>({n,v,c:cc(n)})),rest=spend.slice(8).reduce((a,x)=>a+x[1],0);if(rest>0)R.push({n:'Other categories',v:rest,c:'#98A2B3'});if(inv>0)R.push({n:'Investments',v:inv,c:CC.Investments});
  const saved=c.inc-c.sp-Math.max(0,inv);if(saved>0)R.push({n:'Saved',v:saved,c:'#14A870'});
  const total=R.reduce((a,x)=>a+x.v,0);if(!total){el.innerHTML='<div class="muted" style="padding:30px 0">No spending in this period.</div>';return}
  const L=[];if(c.inc>0)L.push({n:'Income',v:Math.min(c.inc,total),c:'var(--accent)'});const def=total-L.reduce((a,x)=>a+x.v,0);if(def>0.5)L.push({n:'From savings',v:def,c:'#E8B72E'});
  const W=Math.max(340,el.clientWidth),narrow=W<560,ml=narrow?64:120,mr=narrow?112:200,nw=14,pad=10,gap=8,H=Math.max(300,R.length*38+pad*2),scale=(H-pad*2-gap*(R.length-1))/total,xl=ml,xr=W-mr,xm=(xl+xr)/2;
  let ry=pad;const rpos=R.map(r=>{const o={...r,y:ry,h:r.v*scale};ry+=o.h+gap;return o});
  const lh=L.reduce((a,x)=>a+x.v*scale,0)+gap*(L.length-1);let ly=pad+((ry-gap-pad)-lh)/2;const lpos=L.map(l=>{const o={...l,y:ly,h:l.v*scale,cur:ly};ly+=o.h+gap;return o});
  const id='sk'+uid();let s=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Income flow to spending categories"><defs>`;
  rpos.forEach((r,i)=>{lpos.forEach((l,j)=>{s+=`<linearGradient id="${id}${i}_${j}" x1="0" x2="1"><stop offset="0" style="stop-color:${l.c}"/><stop offset="1" stop-color="${r.c}"/></linearGradient>`})});s+='</defs>';
  let band='',li=0,rc=0;rpos.forEach((r,i)=>{let remain=r.v,ry0=r.y;while(remain>1e-6&&li<lpos.length){const l=lpos[li],avail=(l.y+l.h)-l.cur,take=Math.min(remain*scale,avail),h=take;const y0=l.cur,y1=ry0;
      band+=`<path class="band" style="animation-delay:${i*70}ms" fill="url(#${id}${i}_${li})" d="M${xl+nw},${y0}C${xm},${y0} ${xm},${y1} ${xr},${y1}L${xr},${y1+h}C${xm},${y1+h} ${xm},${y0+h} ${xl+nw},${y0+h}Z" data-tip="${esc(`<b>${l.n} → ${r.n}</b><br>${money(take/scale)}<br>${pc(take/scale,total)}% of the flow`)}"/>`;
      l.cur+=take;ry0+=take;remain-=take/scale;if(l.cur>=l.y+l.h-1e-6)li++}});
  s+=band;lpos.forEach(l=>{s+=`<rect x="${xl}" y="${l.y}" width="${nw}" height="${l.h}" rx="4" style="fill:${l.c}"/><text x="${xl-8}" y="${l.y+l.h/2-2}" text-anchor="end" style="fill:var(--fg);font-weight:600;font-size:12.5px">${l.n}</text><text x="${xl-8}" y="${l.y+l.h/2+13}" text-anchor="end">${compact(l.v)}</text>`});
  rpos.forEach(r=>{s+=`<rect x="${xr}" y="${r.y}" width="${nw}" height="${Math.max(2,r.h)}" rx="4" fill="${r.c}"/><text x="${xr+nw+8}" y="${r.y+Math.max(2,r.h)/2+(r.h>26?-2:4)}" style="fill:var(--fg);font-weight:600;font-size:12.5px">${esc(r.n)}</text>${r.h>26?`<text x="${xr+nw+8}" y="${r.y+r.h/2+13}">${compact(r.v)} · ${pc(r.v,total)}%</text>`:''}`});
  el.innerHTML=s+'</svg>'}
function squarify(items,x,y,w,h){const total=items.reduce((a,i)=>a+i.v,0),k=w*h/total;let rest=items.map(i=>({...i,a:i.v*k})),X=x,Y=y,W=w,H=h;const out=[];
  const worst=(row,side)=>{const s=row.reduce((a,r)=>a+r.a,0),mx=Math.max(...row.map(r=>r.a)),mn=Math.min(...row.map(r=>r.a));return Math.max(side*side*mx/(s*s),s*s/(side*side*mn))};
  while(rest.length){const side=Math.min(W,H);let row=[rest[0]],i=1;while(i<rest.length&&worst(row.concat(rest[i]),side)<=worst(row,side)){row.push(rest[i]);i++}
    const s=row.reduce((a,r)=>a+r.a,0);
    if(W>=H){const cw=s/H;let yy=Y;for(const r of row){const rh=r.a/cw;out.push({...r,x:X,y:yy,w:cw,h:rh});yy+=rh}X+=cw;W-=cw}
    else{const ch=s/W;let xx=X;for(const r of row){const rw=r.a/ch;out.push({...r,x:xx,y:Y,w:rw,h:ch});xx+=rw}Y+=ch;H-=ch}
    rest=rest.slice(row.length)}
  return out}
function treemap(el,cur){const ms=merchants(cur).slice(0,36);if(!ms.length){el.innerHTML='<div class="muted" style="padding:30px 0">No spending in this period.</div>';return}
  const W=el.clientWidth,H=el.clientHeight||380,tiles=squarify(ms.map(m=>({v:m.sum,k:m.k,cat:m.cat,n:m.n})),0,0,W,H),tot=ms.reduce((a,m)=>a+m.sum,0);
  el.style.position='relative';el.innerHTML=tiles.map((t,i)=>`<div class="tm" style="left:${t.x+2}px;top:${t.y+2}px;width:${Math.max(0,t.w-4)}px;height:${Math.max(0,t.h-4)}px;--c:${cc(t.cat)||'#98A2B3'};animation-delay:${i*22}ms" data-tip="${esc(`<b>${pretty(t.k)}</b><br>${esc(t.cat)}<br>${money(t.v)} · ${t.n} payment${t.n>1?'s':''}<br>${pc(t.v,tot)}% of this view`)}">${t.w>74&&t.h>40?`<b>${esc(pretty(t.k))}</b><span class="num">${compact(t.v)}</span>`:''}</div>`).join('')}

/* ===== Patterns ===== */
function anaPatterns(rg,cur){const all=base(),years=[...new Set(all.map(t=>t.d.slice(0,4)))].sort(),yr=years.includes(S.calYear)?S.calYear:years[years.length-1];
  chart('ch-cal',el=>calendar(el,yr));chart('ch-dom',el=>domChart(el,cur,rg));
  const sp=cur.filter(t=>!NONSPEND.has(t.cat)&&t.amt<0),totSp=sp.reduce((a,t)=>a-t.amt,0),th=S.cur==='INR'?[0,100,500,1000,5000,25000,100000,Infinity]:[0,5,20,50,200,1000,5000,Infinity];
  const hb=th.slice(0,-1).map((lo,i)=>{const a=sp.filter(t=>-t.amt>=lo&&-t.amt<th[i+1]);return{label:i===0?`Under ${compact(th[1])}`:th[i+1]===Infinity?`${compact(lo)}+`:`${compact(lo)}–${compact(th[i+1])}`,n:a.length,v:a.reduce((x,t)=>x-t.amt,0)}}),hmx=Math.max(...hb.map(b=>b.n),1);
  const small=hb.slice(0,2),sn=small.reduce((a,b)=>a+b.n,0),sv=small.reduce((a,b)=>a+b.v,0);
  const stat={};for(const t of all)if(!NONSPEND.has(t.cat)&&t.amt<0){const e=stat[t.cat]||(stat[t.cat]={n:0,s:0,q:0});const v=-t.amt;e.n++;e.s+=v;e.q+=v*v}
  const an=sp.map(t=>{const e=stat[t.cat];if(!e||e.n<8)return null;const mean=e.s/e.n,sd=Math.sqrt(Math.max(0,e.q/e.n-mean*mean)),v=-t.amt,z=sd?(v-mean)/sd:0;return z>=3&&v>=mean*2.5?{t,z,x:v/mean}:null}).filter(Boolean).sort((a,b)=>b.z-a.z).slice(0,8);
  return`<div class="grid">${acard('s12','Daily spending calendar',`<span style="display:flex;gap:6px;flex-wrap:wrap">${years.slice(-12).map(y=>`<button class="pill" aria-pressed="${y===yr}" data-act="calyear" data-v="${y}">${y}</button>`).join('')}</span>`,'<div class="scroll"><div id="ch-cal" class="chart"></div></div>')}
  ${acard('s6','Spend by day of month','<span class="faint">Average per month</span>','<div id="ch-dom" class="chart"></div>')}
  ${acard('s6','Spend by weekday','',weekday(cur))}
  ${acard('s6','Payment sizes',`<span class="faint">${sn} small payments, ${compact(sv)} (${pc(sv,totSp)}% of spend)</span>`,`<div class="rows">${hb.map(b=>`<div class="lrow" style="grid-template-columns:110px minmax(0,1fr) 48px 72px"><span class="muted">${b.label}</span><div class="prog" style="--c:var(--accent)"><i style="width:${b.n/hmx*100}%"></i></div><span class="num">${b.n}</span><span class="num muted" style="text-align:right">${compact(b.v)}</span></div>`).join('')}</div>`)}
  ${acard('s6','Unusual payments','<span class="faint">Far above normal for their category</span>',`<div class="rows">${an.map(a=>`<div class="lrow" style="grid-template-columns:auto minmax(0,1fr) auto"><span class="dot" style="--c:${cc(a.t.cat)}"></span><span class="nm" title="${esc(a.t.desc)}">${esc(pretty(mkey(a.t.desc)))} <span class="faint">· ${fd(a.t.d,false)}</span></span><span style="text-align:right"><span class="num">${money(-a.t.amt)}</span> <span class="chip bad">${a.x.toFixed(1)}×</span></span></div>`).join('')||'<div class="muted">Nothing unusual in this period.</div>'}</div>`)}</div>`}
function calendar(el,yr){const all=base().filter(t=>t.d.startsWith(yr)&&!NONSPEND.has(t.cat)&&t.amt<0),day={};all.forEach(t=>{const e=day[t.d]||(day[t.d]={v:0,n:0,top:{}});e.v-=t.amt;e.n++;const k=mkey(t.desc);e.top[k]=(e.top[k]||0)-t.amt});
  const vs=Object.values(day).map(d=>d.v).sort((a,b)=>a-b),q=p=>vs.length?vs[Math.min(vs.length-1,Math.floor(vs.length*p))]:0,th=[q(.4),q(.7),q(.9),q(.98)],g=3,cs=Math.max(11,Math.min(22,Math.floor((el.clientWidth-30)/54)-g)),ox=30,oy=22,jan=new Date(+yr,0,1),off=(jan.getDay()+6)%7;
  const W=ox+54*(cs+g),H=oy+7*(cs+g)+4;let s=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily spending in ${yr}">`;
  ['Mon','Wed','Fri'].forEach((d,i)=>{s+=`<text x="0" y="${oy+i*2*(cs+g)+cs-2+(cs+g)*0}" style="font-size:10px">${d}</text>`});
  let lastM=-1;for(let n=0;n<366;n++){const d=new Date(+yr,0,1+n);if(d.getFullYear()!==+yr)break;const idx=n+off,col=Math.floor(idx/7),row=idx%7,k=iso(d),e=day[k],lvl=!e?0:e.v<=th[0]?1:e.v<=th[1]?2:e.v<=th[2]?3:e.v<=th[3]?4:5;
    if(d.getMonth()!==lastM&&row<=3){lastM=d.getMonth();s+=`<text x="${ox+col*(cs+g)}" y="12" style="font-size:10px">${d.toLocaleDateString('en-IN',{month:'short'})}</text>`}
    const top=e?Object.entries(e.top).sort((a,b)=>b[1]-a[1])[0]:null,tip=`<b>${fd(k)}</b><br>${e?money(e.v)+' · '+e.n+' payment'+(e.n>1?'s':'')+(top?'<br>Top: '+esc(pretty(top[0])):''):'No spending'}`;
    s+=`<rect class="cell" x="${ox+col*(cs+g)}" y="${oy+row*(cs+g)}" width="${cs}" height="${cs}" rx="3.5" style="fill:${lvl?`color-mix(in srgb,var(--out) ${[0,22,38,58,78,100][lvl]}%,var(--surface-2))`:'var(--surface-2)'};animation-delay:${col*14}ms" data-tip="${esc(tip)}"/>`}
  const tot=Object.values(day).reduce((a,d)=>a+d.v,0),busy=Object.entries(day).sort((a,b)=>b[1].v-a[1].v)[0];
  s+='</svg>';el.innerHTML=s+`<div class="legend" style="margin-top:8px"><span>${money(tot)} in ${yr}</span>${busy?`<span>Busiest day ${fd(busy[0],false)}, ${money(busy[1].v)}</span>`:''}<span style="margin-left:auto;display:flex;gap:4px;align-items:center">Less ${[0,22,38,58,78,100].map(p=>`<i style="width:12px;height:12px;border-radius:3px;margin:0;background:${p?`color-mix(in srgb,var(--out) ${p}%,var(--surface-2))`:'var(--surface-2)'}"></i>`).join('')} More</span></div>`}
function domChart(el,cur,rg){const W=Math.max(300,el.clientWidth),H=240,m={l:44,r:8,t:12,b:26},a=Array(31).fill(0),from=rg.from>rg.mn?rg.from:rg.mn,to=rg.to<rg.mx?rg.to:rg.mx,months=Math.max(1,monthKeys(from,to).length);
  cur.forEach(t=>{if(!NONSPEND.has(t.cat)&&t.amt<0)a[+t.d.slice(8)-1]-=t.amt});const v=a.map(x=>x/months),mx=nice(Math.max(...v,1)),band=(W-m.l-m.r)/31,y=n=>m.t+(H-m.t-m.b)*(1-n/mx),top=v.indexOf(Math.max(...v));
  let s=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;for(let i=0;i<=3;i++){const n=mx*i/3;s+=`<line class="grid-l" x1="${m.l}" x2="${W-m.r}" y1="${y(n)}" y2="${y(n)}"/><text x="${m.l-8}" y="${y(n)+4}" text-anchor="end">${compact(n)}</text>`}
  v.forEach((n,i)=>{const bw=Math.max(2,band*.66);s+=`<rect x="${m.l+i*band+(band-bw)/2}" y="${y(n)}" width="${bw}" height="${Math.max(1,y(0)-y(n))}" rx="3" style="fill:var(--accent);opacity:${i===top?1:.4};transform-box:fill-box;transform-origin:50% 100%;animation:grow .7s cubic-bezier(.2,.8,.2,1) backwards;animation-delay:${i*14}ms" data-tip="${esc(`<b>Day ${i+1}</b><br>${money(n)} on average`)}"/>`;if((i+1)%5===0||i===0)s+=`<text x="${m.l+i*band+band/2}" y="${H-8}" text-anchor="middle">${i+1}</text>`});
  el.innerHTML=s+'</svg>'}

/* ===== Years ===== */
function anaYears(){const ms=MS(),ft=fyTotals(ms),fys=Object.keys(ft).map(Number).sort((a,b)=>b-a),metric=S.hm||'sp';
  if(!fys.length)return empty('No data yet.');
  const val=(e,x)=>!x?null:metric==='sp'?x.sp:metric==='inc'?x.inc:metric==='net'?x.inc-x.sp:(x.inc>0?(x.inc-x.sp)/x.inc*100:null);
  const allv=fys.flatMap(f=>ft[f].months.map(x=>val(null,x))).filter(v=>v!=null),mxv=Math.max(...allv.map(Math.abs),1);
  const cell=(v,i,r)=>{if(v==null)return`<div class="c" style="opacity:.35">·</div>`;const sgn=metric==='sp'?'out':metric==='inc'?'in':(v>=0?'in':'out'),p=Math.round(Math.min(100,Math.abs(v)/mxv*100)*.85+8);
    return`<div class="c cell" style="background:color-mix(in srgb,var(--${sgn}) ${p}%,var(--surface-2));animation-delay:${(r+i)*14}ms" data-tip="${esc(metric==='rate'?v.toFixed(0)+'%':money(v))}">${metric==='rate'?Math.round(v)+'%':compact(v)}</div>`};
  const MN=['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
  const matrix=`<div class="scroll"><div class="hm" style="grid-template-columns:78px repeat(12,minmax(54px,1fr)) 84px"><div></div>${MN.map(m=>`<div class="rl" style="justify-content:center">${m}</div>`).join('')}<div class="rl" style="justify-content:center">Year</div>
  ${fys.map((f,r)=>{const e=ft[f],tv=val(null,metric==='rate'?{inc:e.inc,sp:e.sp}:{inc:e.inc,sp:e.sp});return`<div class="rl">${fyLabel(f).replace('FY ','')}</div>${e.months.map((x,i)=>cell(val(null,x),i,r)).join('')}${cell(tv,12,r)}`}).join('')}</div></div>`;
  const rows=fys.map((f,i)=>{const e=ft[f],prev=ft[f-1],net=e.inc-e.sp-e.inv;return`<tr><td style="font-weight:500">${fyLabel(f)}${fyComplete(f)?'':' <span class="tag">so far</span>'}</td><td class="r num">${compact(e.inc)}</td><td class="r num">${compact(e.sp)}</td><td class="r num">${compact(e.inv)}</td><td class="r num ${net>=0?'in':'out'}">${net>=0?'+':'−'}${compact(Math.abs(net))}</td><td class="r num">${e.inc>0?Math.round((e.inc-e.sp)/e.inc*100)+'%':'—'}</td><td class="r">${prev&&prev.sp&&fyComplete(f)&&fyComplete(f-1)?dChip(e.sp,prev.sp,true):'—'}</td></tr>`}).join('');
  chart('ch-yoy',el=>yoyChart(el,ft,fys));
  return`<div class="grid">${acard('s12','Year by month',seg('hmetric',[['sp','Spending'],['inc','Income'],['net','Net'],['rate','Savings rate']],metric),matrix)}
  ${acard('s12','Year over year spending','<span class="faint">Financial years, April to March. Click a year to hide it</span>','<div id="ch-yoy" class="chart"></div><div id="ch-yoy-l" class="legend" style="margin-top:10px"></div>')}
  ${acard('s12','Year summary','',`<div class="scroll"><table class="tbl hold" style="min-width:520px"><thead><tr><th>Year</th><th class="r">Income</th><th class="r">Spend</th><th class="r">Invested</th><th class="r">Net</th><th class="r">Rate</th><th class="r">Spend</th></tr></thead><tbody>${rows}</tbody></table></div>`)}</div>`}
function yoyChart(el,ft,fys){const W=Math.max(320,el.clientWidth),H=330,m={l:54,r:14,t:12,b:30},hide=S._yoy||(S._yoy={}),list=fys.slice().sort((a,b)=>a-b),col=i=>`hsl(${210-Math.round(i*(190/Math.max(1,list.length-1)))} 72% ${i===list.length-1?52:58}%)`;
  const shown=list.filter(f=>!hide[f]);let mxv=1;shown.forEach(f=>ft[f].months.forEach(x=>{if(x&&x.sp>mxv)mxv=x.sp}));const ymax=nice(mxv),x=i=>m.l+i*(W-m.l-m.r)/11,y=v=>m.t+(H-m.t-m.b)*(1-v/ymax),MN=['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
  let s=`<svg class="reveal" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;for(let i=0;i<=4;i++){const v=ymax*i/4;s+=`<line class="grid-l" x1="${m.l}" x2="${W-m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l-8}" y="${y(v)+4}" text-anchor="end">${compact(v)}</text>`}
  MN.forEach((n,i)=>{s+=`<text x="${x(i)}" y="${H-9}" text-anchor="middle">${n}</text>`});
  list.forEach((f,i)=>{if(hide[f])return;const pts=ft[f].months.map((mm,j)=>mm?[x(j),y(mm.sp)]:null),latest=i===list.length-1;let run=[];const flush=()=>{if(run.length>1)s+=`<path d="M${run[0][0]},${run[0][1]}${mono(run)}" fill="none" stroke="${col(i)}" stroke-width="${latest?3.2:1.8}" stroke-linecap="round" opacity="${latest?1:.8}"/>`;else if(run.length===1)s+=`<circle cx="${run[0][0]}" cy="${run[0][1]}" r="3" fill="${col(i)}"/>`;run=[]};pts.forEach(p=>{if(p)run.push(p);else flush()});flush()});
  s+=`<line class="guide" x1="0" x2="0" y1="${m.t}" y2="${H-m.b}"/>`;const band=(W-m.l-m.r)/11;
  MN.forEach((n,j)=>{const rows=shown.map(f=>[f,ft[f].months[j]]).filter(r=>r[1]).sort((a,b)=>b[1].sp-a[1].sp).slice(0,8);s+=`<rect class="hit" data-x="${x(j)}" x="${x(j)-band/2}" y="${m.t}" width="${band}" height="${H-m.t-m.b}" fill="transparent" data-tip="${esc(`<b>${n}</b><br>`+rows.map(r=>`<span style="color:${col(list.indexOf(r[0]))}">●</span> ${fyLabel(r[0]).replace('FY ','')} ${compact(r[1].sp)}`).join('<br>'))}"/>`});
  el.innerHTML=s+'</svg>';const lg=document.getElementById('ch-yoy-l');if(lg)lg.innerHTML=list.slice().reverse().map(f=>`<button class="ychip ${hide[f]?'off':''}" data-act="yoytog" data-v="${f}"><i style="background:${col(list.indexOf(f))}"></i>${fyLabel(f).replace('FY ','')}</button>`).join('')}

function render(){CH.length=0;renderChrome();const v={ana:anaView,overview,bal:balView,tx:txView,cards,inv,rec,up:uploadsView,vault:vaultView,settings:settingsView,upd:updView}[S.view];$('#main').innerHTML=(S.view==='overview'||S.view==='tx'||S.view==='bal'?bkBanner():'')+v();after()}
let lastSig='';
function after(){
  const sig=S.view+'|'+S.range+'|'+S.member,fresh=sig!==lastSig;lastSig=sig;const m=$('#main');m.classList.toggle('noanim',!fresh);
  const ov=$('#cash');if(ov&&ov._B)cashChart(ov,ov._B);
  document.querySelectorAll('[data-donut]').forEach(el=>{if(el._d)donut(el,el._d.items,el._d.total,el._d.center)});
  document.querySelectorAll('.ring-fg').forEach(el=>requestAnimationFrame(()=>requestAnimationFrame(()=>{el.style.strokeDashoffset=el.dataset.off})));
  if(fresh&&!matchMedia('(prefers-reduced-motion:reduce)').matches)runTickers(m);
  drawCharts();
  if(S.view==='tx')renderTxRows()}
const TICK={m:v=>money(v),c:v=>compact(v),p:v=>Math.round(v)+'%',n:v=>String(Math.round(v))};
const tick=(v,f='m')=>`<span data-n="${v}" data-f="${f}">${TICK[f](v)}</span>`;
function runTickers(root){root.querySelectorAll('[data-n]').forEach(el=>{const to=+el.dataset.n,f=TICK[el.dataset.f],t0=performance.now(),d=1100;const step=t=>{const k=Math.min(1,(t-t0)/d),e=k===1?1:1-Math.pow(2,-10*k);el.textContent=f(to*e);if(k<1)requestAnimationFrame(step)};el.textContent=f(0);requestAnimationFrame(step)})}
function ring(p,size,sw,col){const r=(size-sw)/2,C=2*Math.PI*r,c=size/2;return`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)" aria-hidden="true"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="${sw}"/><circle class="ring-fg" cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C*(1-Math.max(0,Math.min(100,p))/100)}"/></svg>`}
const clamp=v=>Math.max(0,Math.min(100,v));
function nextDue(day,from=new Date()){const y=from.getFullYear(),m=from.getMonth(),mk=(yy,mm)=>new Date(yy,mm,Math.min(day,new Date(yy,mm+1,0).getDate()));let d=mk(y,m);const t0=new Date(y,m,from.getDate());if(d<t0)d=mk(y,m+1);return{date:d,days:Math.round((d-t0)/864e5)}}
function upcoming(){const b=bounds();if(!b)return[];return recurring().filter(x=>x.sign<0&&x.next>=addDays(b.mx,-1)&&x.next<=addDays(b.mx,30)).sort((a,c)=>a.next<c.next?-1:1)}
function marquee(up){if(!up.length)return'';const mx=bounds().mx,total=up.reduce((a,x)=>a+x.amt,0);
  const chip=x=>{const d=daysBetween(mx,x.next);return`<span class="bill"><i class="dot" style="--c:${CC[x.cat]}"></i>${esc(pretty(x.k))}<b class="num">${compact(x.amt)}</b><em>${d<=0?'due now':d===1?'tomorrow':'in '+d+' days'}</em></span>`};
  const it=up.map(chip).join(''),run=up.length>=4;
  return`<div class="coming"><div class="clabel"><span>Coming up</span><b class="num">${compact(total)}</b><small>next 30 days</small></div><div class="marq ${run?'run':''}"><div class="mt">${it}${run?it:''}</div></div></div>`}
function onboard(){const real=true;let dis=false;try{dis=localStorage.getItem('pocketbook.onb')==='1'}catch(e){}
  const steps=[['Import a bank or card statement',real&&S.uploads.some(u=>u.kind==='tx'),'import'],['Add your family members',real&&S.members.length>1,'settings'],['Track your investments',real&&S.hold.length>0,'addhold']];
  const n=steps.filter(x=>x[1]).length;if(real&&(n===3||dis||S.tx.length))return'';
  return`<div class="card onb"><div class="onbh"><div><b>Get started</b><div class="muted">Import a statement and your balances, spending and investments fill in here. Files are read in your browser and never uploaded.</div></div><div class="onbr"><span class="num muted">${n} of 3</span><button class="btn sm" data-act="onbx">Dismiss</button></div></div><div class="prog"><i style="width:${n*33.3}%"></i></div>
  <div class="steps">${steps.map(([t,d,a],i)=>`<button class="step ${d?'done':''}" data-act="${a}"><span class="chk">${d?'✓':i+1}</span><span class="t">${t}</span></button>`).join('')}</div></div>`}
function dChip(cur,prev,invert){if(!prev||prev===0)return'';const p=(cur-prev)/Math.abs(prev)*100;if(!isFinite(p))return'';const up=p>=0,good=invert?!up:up;
  return`<span class="chip ${Math.abs(p)<.5?'':good?'good':'bad'}">${up?'▲':'▼'} ${Math.abs(p).toFixed(0)}%</span>`}
function empty(msg){return`<div class="card empty"><p style="margin:0 0 12px"><b style="color:var(--fg)">${msg}</b></p><button class="btn primary" data-act="import">Import a file</button></div>`}
function overview(){
  const rg=getRange();if(!rg)return onboard()+empty('No transactions yet. Drop a statement anywhere on this page.');
  const all=base(),cur=within(all,rg.from,rg.to),prv=rg.pf?within(all,rg.pf,rg.pt):[];const hasPrev=prv.length>0;
  const c=sums(cur),p=sums(prv),B=buckets(rg,cur);
  const days=Math.max(1,daysBetween(rg.from>rg.mn?rg.from:rg.mn,rg.to<rg.mx?rg.to:rg.mx)+1);
  const rate=c.inc>0?c.net/c.inc*100:0;const cats=byCat(cur),catTot=cats.reduce((a,x)=>a+x[1],0);
  const hv=S.hold.filter(inMember),worth=hv.reduce((a,h)=>a+h.value,0),invd=hv.reduce((a,h)=>a+h.invested,0);
  const nw=netWorth(),chipv=(cur_,prev_,inv)=>hasPrev?dChip(cur_,prev_,inv)+' <span>vs previous period</span>':`<span>${rg.label}</span>`;
  const stat=(l,v,sub,cls='')=>`<div class="card stat s3"><div class="sl">${l}</div><div class="sv num ${cls}">${v}</div><div class="ss">${sub}</div></div>`;
  const mems=S.members.map(m=>{const mt=cur.filter(t=>t.m===m.id),big=mt.filter(t=>t.amt<0&&!NONSPEND.has(t.cat)).sort((x,y)=>x.amt-y.amt)[0];return[m.name,sums(mt).sp,m.color,{cat:byCat(mt)[0],mer:merchants(mt)[0],big,n:mt.length}]}).filter(x=>x[1]>0);const mt=mems.reduce((a,x)=>a+x[1],0);
  const multi=S.member==='all'&&mems.length>1,accRows=nw.accs.filter(a=>a.sub!=='PPF'&&!a.closed).map(a=>[a,curBal(a)]).filter(x=>x[1]!=null).sort((x,y)=>y[1]-x[1]).slice(0,5);
  const nOther=S.tx.filter(t=>t.cat==='Other'&&inMember(t)).length;const h=onboard()+(nOther?`<div class="card reviewq"><div><b>${nOther.toLocaleString('en-IN')} transaction${nOther>1?'s':''} without a category</b><span>Sorting them makes spending charts accurate. The app remembers your choice for similar payments.</span></div><button class="btn sm primary" data-act="cat" data-v="Other">Review</button></div>`:'')+`<div class="grid">
    ${(()=>{const mm={};for(const t of base())mm[t.d.slice(0,7)]=(mm[t.d.slice(0,7)]||0)+t.amt;let run=0;const ser=Object.keys(mm).sort().map(k=>run+=mm[k]).slice(-12);const [wi,wd]=money(nw.total,2).split('.');
      const line=ser.length>1?(()=>{const mx=Math.max(...ser),mn=Math.min(...ser),sp=mx-mn||1,pts=ser.map((v,i)=>[i/(ser.length-1)*300,56-(v-mn)/sp*48]);const d='M'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join('L');return`<svg class="hspark" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="hsg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7BA7FF" stop-opacity=".35"/><stop offset="1" stop-color="#7BA7FF" stop-opacity="0"/></linearGradient></defs><path d="${d}L300,60L0,60Z" fill="url(#hsg)"/><path d="${d}" fill="none" stroke="#7BA7FF" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`})():'';
      return`<div class="card nwhero s6"><div class="sl">Net worth</div><div class="sv num">${wi}<span class="dim">.${wd||'00'}</span></div><div class="ss">${nw.known||nw.inv?`Bank ${compact(nw.cash)} · Investments ${compact(nw.inv)}`:'Import a statement to see your balances'}</div><div class="nwf"><span class="chip ${c.net>=0?'good':'bad'}">${c.net>=0?'Saved':'Overspent'} ${money(Math.abs(c.net))}</span><span>${rate.toFixed(0)}% of income · ${esc(rg.label)}</span></div>${line}</div>`})()}
    ${stat('Income',money(c.inc),chipv(c.inc,p.inc,false)+'<div class="hatch in" style="--w:100%"></div>')}
    ${stat('Spending',money(c.sp),(hasPrev?chipv(c.sp,p.sp,true):`≈ ${money(c.sp/days)} a day`)+`<div class="hatch out" style="--w:${c.inc>0?Math.min(100,c.sp/c.inc*100).toFixed(0):100}%"></div>`)}
    <div class="card s8"><div class="ch"><div><h3>Money in and out</h3><div class="cs">${esc(rg.label)}</div></div><span class="legend"><span><i style="background:var(--in)"></i>Income</span><span><i style="background:var(--out)"></i>Spending</span><span><i style="background:var(--accent)"></i>Net</span></span></div><div id="cash"></div></div>
    <div class="card s4"><div class="ch"><div><h3>Where it went</h3><div class="cs">Top categories</div></div></div><div class="split" style="grid-template-columns:1fr"><div class="donut" data-donut></div></div>
      <div class="rows" style="margin-top:10px">${cats.slice(0,6).map(([n,v])=>`<button class="lrow" data-act="cat" data-v="${esc(n)}" data-seg="${esc(n)}"><span class="dot" style="--c:${CC[n]}"></span><span class="nm">${esc(n)}</span><span class="num">${money(v)}</span><span class="pc">${pc(v,catTot)}%</span></button>`).join('')||'<div class="muted">No spending in this period.</div>'}</div></div>
    <div class="card s4"><div class="ch"><div><h3>In plain words</h3><div class="cs">What stands out</div></div></div><ul class="ins">${insights(cur,prv,c,p,rate,days,cats).map(i=>`<li style="--c:${i[0]}"><span>${i[1]}</span></li>`).join('')}</ul></div>
    <div class="card s4"><div class="ch"><div><h3>Top merchants</h3><div class="cs">Where most of your money goes</div></div></div>${merchants(cur).slice(0,6).map(m=>`<div class="lr"><div class="lm"><div class="ln">${esc(pretty(m.k))}</div><div class="lsub">${m.n} payment${m.n>1?'s':''}</div></div><div class="lv"><span class="num">${money(m.sum)}</span></div></div>`).join('')||'<div class="muted">Nothing yet.</div>'}</div>
    <div class="card s4"><div class="ch"><div><h3>${multi?'Family spending':'Accounts'}</h3><div class="cs">${multi?'Who spent what':'Latest balances'}</div></div><button class="btn sm link" data-act="view" data-v="${multi?'ana':'bal'}">Open →</button></div>${multi?mems.map(([n,v,col,d])=>`<div class="lr"><div class="lm"><div class="ln"><span class="dot" style="--c:${col}"></span> ${esc(n)}</div><div class="lsub">${d.cat?`Most on ${esc(d.cat[0])} ${money(d.cat[1])}`:''}${d.mer?` · top merchant ${esc(pretty(d.mer.k))}`:''}${d.big?` · biggest ${money(-d.big.amt)}`:''}</div></div><div class="lv"><span class="num">${money(v)}</span><span class="muted">${pc(v,mt)}%</span></div></div>`).join(''):accRows.length?accRows.map(([a,b])=>`<div class="lr"><div class="lm"><div class="ln">${esc(a.name)}</div><div class="lsub">${a.balAsOf?'as of '+fd(a.balAsOf):'manual'}</div></div><div class="lv"><span class="num ${b<0?'out':''}">${money(b)}</span></div></div>`).join(''):'<div class="muted" style="padding:14px 0">No balances yet. Import a statement that lists a closing balance, or set one on the Accounts page.</div>'}</div>
  </div>`;
  setTimeout(()=>{const e=$('#cash');if(e){e._B=B;e._W=e.clientWidth;cashChart(e,B)}const d=$('[data-donut]');if(d){const items=cats.slice(0,9).map(([n,v])=>[n,v,CC[n]]);const rest=cats.slice(9).reduce((a,x)=>a+x[1],0);if(rest>0)items.push(['Other categories',rest,'#B8C0CC']);d._d={items,total:catTot||1,center:['Total spent',compact(catTot)]};donut(d,d._d.items,d._d.total,d._d.center)}});
  return h}
function invSnap(w,i){const g=w-i;return`<div class="num" style="font-size:24px;font-weight:550">${money(w)}</div><div class="muted" style="margin:2px 0 10px">invested ${money(i)}</div><span class="chip ${g>=0?'good':'bad'}">${g>=0?'▲':'▼'} ${money(Math.abs(g))} (${i?Math.abs(g/i*100).toFixed(1):0}%)</span>`}
function weekday(a){const t=Array(7).fill(0);for(const x of a)if(!NONSPEND.has(x.cat))t[(dt(x.d).getDay()+6)%7]-=x.amt;const mx=Math.max(...t,1);const L='MTWTFSS';
  return`<div class="wk">${t.map((v,i)=>`<div class="${v===mx?'mx':''}" data-tip="${esc(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i]+'<br>'+money(v))}"><i style="height:${Math.max(3,v/mx*84)}px"></i>${L[i]}</div>`).join('')}</div>`}
function insights(cur,prv,c,p,rate,days,cats){const o=[],G='var(--in)',R='var(--out)',W='var(--warn)',A='var(--accent)';
  o.push([rate>=20?G:rate>=5?W:R,rate>=0?`You kept <b>${rate.toFixed(0)}%</b> of your income (${money(c.net)}).`:`Spending is <b>${money(-c.net)}</b> more than income in this period.`]);
  if(cats[0])o.push([CC[cats[0][0]],`<b>${esc(cats[0][0])}</b> is the biggest cost: ${money(cats[0][1])}, ${pc(cats[0][1],c.sp)}% of spending.`]);
  if(prv.length){const pm=Object.fromEntries(byCat(prv));let best=null;for(const [n,v] of cats){const d=v-(pm[n]||0);if(pm[n]>0&&(!best||Math.abs(d)>Math.abs(best.d)))best={n,d,pct:d/pm[n]*100}}
    if(best&&Math.abs(best.pct)>=10)o.push([best.d>0?R:G,`<b>${esc(best.n)}</b> is ${best.d>0?'up':'down'} ${Math.abs(best.pct).toFixed(0)}% vs the previous period (${best.d>0?'+':'−'}${money(Math.abs(best.d))}).`])}
  const big=cur.filter(t=>!NONSPEND.has(t.cat)&&t.amt<0).sort((a,b)=>a.amt-b.amt)[0];if(big)o.push([A,`Largest expense: <b>${esc(pretty(mkey(big.desc)))}</b>, ${money(-big.amt)} on ${fd(big.d,false)}.`]);
  const inv=-cur.filter(t=>t.cat==='Investments').reduce((a,t)=>a+t.amt,0);if(inv>0)o.push([A,`You put <b>${money(inv)}</b> into investments (${c.inc?pc(inv,c.inc):0}% of income).`]);
  const r=recurring().filter(x=>x.sign<0);if(r.length)o.push([W,`Recurring bills and subscriptions cost about <b>${money(r.reduce((a,x)=>a+x.monthly,0))}</b> a month.`]);return o.slice(0,6)}

/* transactions */
function txFilterN(){return S.fcats.length+S.faccts.length+(S.ftype!=='all'?1:0)}
function txFilterUI(){const accts=S.accts.filter(a=>S.tx.some(t=>t.acct===a.id)),n=txFilterN();
  return`<div class="tools"><input class="in-t" id="q" type="search" placeholder="Search description, category or amount" value="${esc(S.q)}" aria-label="Search">
  <div class="seg" role="group" aria-label="Type">${[['all','All'],['out','Money out'],['in','Money in']].map(([v,l])=>`<button class="pill" aria-pressed="${S.ftype===v}" data-act="ftype" data-v="${v}">${l}</button>`).join('')}</div>
  <button class="btn sm fbtn" data-act="fpanel" aria-expanded="${S.fp}">${svg(ICON.filter,15)}Filters${S.fcats.length+S.faccts.length?`<span class="cnt">${S.fcats.length+S.faccts.length}</span>`:''}</button>
  <button class="btn sm" data-act="copytsv">Copy for Excel</button><button class="btn sm" data-act="copycsv">Copy CSV</button></div>
  <div class="fpan ${S.fp?'open':''}" id="fpan"><div><div class="fin"><div class="fg"><h4>Category</h4><div class="chips">${CATS.map(([c,col])=>`<button class="fchip" style="--c:${col}" aria-pressed="${S.fcats.includes(c)}" data-act="fchip" data-k="c" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
  <div class="fg"><h4>Account</h4><div class="chips">${accts.map(a=>`<button class="fchip" aria-pressed="${S.faccts.includes(a.id)}" data-act="fchip" data-k="a" data-v="${a.id}">${esc(a.name)}</button>`).join('')}</div></div>
  ${n?`<button class="btn sm ghost" data-act="fclear">Clear all filters</button>`:''}</div></div></div>`}
function txView(){if(!S.tx.length)return empty('No transactions yet.');
  return`<div class="txsum" id="txsum"></div><div id="txf">${txFilterUI()}</div><div class="card" style="padding:6px 16px 14px"><div id="txrows"></div></div>`}
function txFiltered(){const rg=getRange();const q=S.q.trim().toLowerCase();let a=within(base(),rg.from,rg.to);
  if(S.fcats.length)a=a.filter(t=>S.fcats.includes(t.cat));if(S.faccts.length)a=a.filter(t=>S.faccts.includes(t.acct));
  if(S.ftype==='out')a=a.filter(t=>t.amt<0);if(S.ftype==='in')a=a.filter(t=>t.amt>0);
  if(q)a=a.filter(t=>t.desc.toLowerCase().includes(q)||t.cat.toLowerCase().includes(q)||String(Math.abs(t.amt)).includes(q));
  const {k,dir}=S.sort;a.sort((x,y)=>k==='d'?(x.d<y.d?-1:x.d>y.d?1:0)*dir:(x.amt-y.amt)*dir);return a}
function renderTxRows(){const el=$('#txrows');if(!el)return;const a=txFiltered();const pages=Math.max(1,Math.ceil(a.length/S.limit));if(S.page>=pages)S.page=pages-1;if(S.page<0)S.page=0;const off=S.page*S.limit;{const om=a.filter(t=>t.amt<0).reduce((x,t)=>x-t.amt,0),sm=$('#txsum');if(sm)sm.innerHTML=[['Transactions',a.length.toLocaleString('en-IN'),''],['Money in',money(a.filter(t=>t.amt>0).reduce((x,t)=>x+t.amt,0)),'in'],['Money out',money(om),'out'],['Net',(a.reduce((x,t)=>x+t.amt,0)<0?'−':'')+money(Math.abs(a.reduce((x,t)=>x+t.amt,0))),'']].map(([l,v,c])=>`<div class="card"><div class="sl">${l}</div><div class="sv ${c}">${v}</div></div>`).join('')}const arrow=k=>S.sort.k===k?(S.sort.dir<0?' ↓':' ↑'):'';
  el.innerHTML=`<div class="tx hd"><button data-act="sort" data-v="d">Date${arrow('d')}</button><span>Description</span><span>Category</span><button data-act="sort" data-v="a" style="text-align:right">Amount${arrow('a')}</button></div>`+
  (a.slice(off,off+S.limit).map((t,i)=>{const ac=acctOf(t.acct),mm=memOf(t.m),op=S.xo===t.id;return`<div class="txr${op?' open':''}" style="--i:${Math.min(i,14)}"><div class="tx" data-act="xrow" data-id="${t.id}" role="button" tabindex="0" aria-expanded="${op}"><span class="d">${fd(t.d)}</span><span class="ds"><b title="${esc(t.desc)}">${esc(t.desc)}</b><small>${esc(ac.name)} ${ownTag(t.m)}</small></span>
    <span class="c"><span class="tg" style="--c:${CC[t.cat]||'#999'}">${esc(t.cat)}</span></span><span class="a num ${t.amt>0?'in':''}">${t.amt>0?'+':'−'}${money(Math.abs(t.amt),2)}</span></div>
    <div class="txd"><div><div class="txg"><div><small>Description</small><p>${esc(t.desc)}</p></div><div><small>Account</small><p>${esc(ac.name)}</p></div><div><small>Owner</small><p>${ownTag(t.m)}</p></div><div><small>Date</small><p>${fd(t.d)}</p></div>
    <div><small>Category</small><select class="csel" style="--c:${CC[t.cat]||'#999'}" data-change="cat" data-id="${t.id}" aria-label="Category">${CATS.map(([n])=>`<option ${n===t.cat?'selected':''}>${esc(n)}</option>`).join('')}</select></div>
    <div class="txa"><button class="btn sm" data-act="cpy" data-id="${t.id}">Copy</button><button class="btn sm" data-act="txsplit" data-id="${t.id}">Split</button></div></div></div></div></div>`}).join('')||`<div class="empty">No transactions match.${txFilterN()||S.q?' <button class="btn sm" data-act="fclear">Clear filters</button>':''}</div>`)+
  (a.length>S.limit?`<div class="pager"><span class="muted">${(off+1).toLocaleString('en-IN')}–${Math.min(off+S.limit,a.length).toLocaleString('en-IN')} of ${a.length.toLocaleString('en-IN')}</span><div class="pg"><button class="btn sm" data-act="pgprev" ${S.page<=0?'disabled':''} aria-label="Previous page">‹ Prev</button><span>Page ${S.page+1} of ${pages}</span><button class="btn sm" data-act="pgnext" ${S.page>=pages-1?'disabled':''} aria-label="Next page">Next ›</button></div><label class="muted">Per page <select class="csel" data-change="perpage" aria-label="Rows per page">${[25,50,100,200].map(n=>`<option ${n===S.limit?'selected':''}>${n}</option>`).join('')}</select></label></div>`:'')+
  `<div class="muted" style="padding-top:12px;border-top:1px solid var(--line);margin-top:8px;font-size:13px">${a.length} transactions · in <b class="in num">${money(a.filter(t=>t.amt>0).reduce((x,t)=>x+t.amt,0))}</b> · out <b class="out num">${money(-a.filter(t=>t.amt<0).reduce((x,t)=>x+t.amt,0))}</b></div>`}
function txRefresh(){S.page=0;const f=$('#txf');if(f){const q=$('#q'),pos=q&&q.selectionStart,had=q&&document.activeElement===q;f.innerHTML=txFilterUI();const n=$('#q');if(had&&n){n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}}}renderTxRows()}

/* cards */
function cards(){const cs=S.accts.filter(a=>a.type==='card'&&(S.member==='all'||a.member===S.member));const rg=getRange();
  if(!cs.length)return`<div class="card empty"><p style="margin:0 0 12px"><b style="color:var(--fg)">No credit cards yet.</b><br>Import a credit card statement and choose “Credit card” as the account type.</p><button class="btn primary" data-act="import">Import card statement</button></div>`;
  if(!rg)return empty('No data.');
  const tot=cs.map(c=>{const a=S.tx.filter(t=>t.acct===c.id);return{c,cur:within(a,rg.from,rg.to),prv:rg.pf?within(a,rg.pf,rg.pt):[]}});
  const T=tot.reduce((a,x)=>a+sums(x.cur).sp,0),Tp=tot.reduce((a,x)=>a+sums(x.prv).sp,0);
  return`<div class="grid" style="margin-bottom:14px"><div class="card stat s3"><div class="sl">Card spending · ${esc(rg.label)}</div><div class="sv num">${tick(T)}</div><div class="ss">${rg.pf&&Tp?dChip(T,Tp,true)+' <span>vs previous period</span>':''}</div></div>
   <div class="card stat s3"><div class="sl">Cards</div><div class="sv num">${cs.length}</div><div class="ss">${cs.map(c=>esc(c.name)).join(', ')}</div></div></div>
   <div class="cards">${tot.map(({c,cur,prv})=>{const sp=sums(cur).sp,spp=sums(prv).sp,cats=byCat(cur).slice(0,5),mx=cats[0]?cats[0][1]:1,mm=memOf(c.member);
     const lastM=bounds()&&S.tx.filter(t=>t.acct===c.id&&t.d.slice(0,7)===bounds().mx.slice(0,7));const used=lastM?sums(lastM).sp:0;
     return`<div class="card"><h3><span style="display:flex;gap:8px;align-items:center"><span class="dot" style="--c:${mm.color}"></span>${esc(c.name)}</span>${ownTag(c.member)}</h3>
     <div class="num" style="font-size:26px;font-weight:550">${money(sp)}</div><div style="margin:4px 0 0">${spp?dChip(sp,spp,true)+' <span class="faint">vs prev.</span>':''}</div>
     ${c.limit?`<div style="margin-top:12px"><div class="prog" style="--c:${used/c.limit>.7?'var(--out)':'var(--accent)'}"><i style="width:${Math.min(100,pc(used,c.limit))}%"></i></div><div class="faint" style="font-size:12px;margin-top:5px">${money(used)} this month of ${money(c.limit)} limit · ${pc(used,c.limit)}% used</div></div>`:''}
     ${c.due?(()=>{const nd=nextDue(c.due);return`<div class="duerow"><span>Payment due ${nd.date.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span><span class="tg ${nd.days<=5?'warn':''}">${nd.days===0?'Today':nd.days===1?'Tomorrow':'in '+nd.days+' days'}</span></div>`})():'<div class="duerow muted"><span>Set a due day in Settings to get a reminder here</span></div>'}
     <div class="mini">${cats.map(([n,v])=>`<div class="r"><span>${esc(n)}</span><div class="prog" style="--c:${CC[n]}"><i style="width:${v/mx*100}%"></i></div><span class="num" style="color:var(--fg)">${compact(v)}</span></div>`).join('')||'<span class="muted">No spending in this period.</span>'}</div>
     <div class="muted" style="margin-top:12px;font-size:12.5px">Top: ${merchants(cur).slice(0,3).map(m=>esc(pretty(m.k))).join(', ')||'—'}</div></div>`}).join('')}</div>`}

/* investments */
function inv(){const hs=S.hold.filter(inMember);
  if(!hs.length)return`<div class="card empty"><p style="margin:0 0 12px"><b style="color:var(--fg)">No investments tracked yet.</b><br>Import a broker or mutual fund holdings file, or add PPF, NPS, Sukanya, LIC and others by hand.</p><button class="btn primary" data-act="addhold">Add investment</button> <button class="btn" data-act="import">Import holdings</button></div>`;
  const W=hs.reduce((a,h)=>a+h.value,0),I=hs.reduce((a,h)=>a+h.invested,0),G=W-I;
  const byT=HT.map(([n,c])=>[n,hs.filter(h=>h.type===n).reduce((a,h)=>a+h.value,0),c]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
  const byM=S.members.map(m=>[m.name,hs.filter(h=>h.m===m.id).reduce((a,h)=>a+h.value,0),m.color]).filter(x=>x[1]>0);
  const fy=fyStart(...(()=>{const b=bounds();const d=b?dt(b.mx):new Date();return[d.getFullYear(),d.getMonth()+1]})());
  const lim=hs.filter(h=>LIMITS[h.type]&&h.fy!=null);
  const up=hs.filter(h=>h.maturity).sort((a,b)=>a.maturity<b.maturity?-1:1).slice(0,5);
  setTimeout(()=>{const d=$('[data-donut]');if(d){d._d={items:byT,total:W||1,center:['Net worth',compact(W)]};donut(d,byT,W||1,d._d.center)}});
  return`<div class="grid">
   <div class="card kpi s3"><div class="lbl">Current value</div><div class="val num">${tick(W)}</div><div class="foot"><span class="faint">${hs.length} holdings</span></div></div>
   <div class="card kpi s3"><div class="lbl">Invested</div><div class="val num">${tick(I)}</div><div class="foot"><span class="faint">across ${byT.length} asset types</span></div></div>
   <div class="card kpi s3"><div class="lbl">Gain / loss</div><div class="val num ${G>=0?'in':'out'}">${G>=0?'+':'−'}${money(Math.abs(G))}</div><div class="foot"><span class="chip ${G>=0?'good':'bad'}">${I?(G/I*100).toFixed(1):0}% overall</span></div></div>
   <div class="card kpi s3"><div class="lbl">Largest asset</div><div class="val" style="font-size:21px;font-weight:600">${byT[0]?esc(byT[0][0]):'—'}</div><div class="foot"><span class="faint">${byT[0]?pc(byT[0][1],W)+'% of portfolio':''}</span></div></div>
   <div class="card s5"><h3>Allocation</h3><div class="split"><div class="donut" data-donut></div><div class="rows">${byT.map(([n,v,c])=>`<div class="lrow" data-seg="${esc(n)}" style="grid-template-columns:auto minmax(0,1fr) auto auto"><span class="dot" style="--c:${c}"></span><span class="nm">${esc(n)}</span><span class="num">${compact(v)}</span><span class="pc">${pc(v,W)}%</span></div>`).join('')}</div></div></div>
   <div class="card s4"><h3>By family member</h3><div class="rows">${byM.map(([n,v,c])=>`<div class="lrow" style="grid-template-columns:auto 70px minmax(0,1fr) auto"><span class="dot" style="--c:${c}"></span><span class="nm">${esc(n)}</span><div class="prog" style="--c:${c}"><i style="width:${pc(v,W)}%"></i></div><span class="num">${compact(v)}</span></div>`).join('')}</div>
     ${up.length?`<h3 style="margin-top:18px">Upcoming maturities</h3><div class="rows">${up.map(h=>`<div class="lrow" style="grid-template-columns:minmax(0,1fr) auto"><span class="nm">${esc(h.name)}</span><span class="muted">${fd(h.maturity)}</span></div>`).join('')}</div>`:''}</div>
   <div class="card s3"><h3>FY ${fy}–${String(fy+1).slice(2)} deposits</h3>${lim.length?lim.map(h=>{const l=LIMITS[h.type],p=Math.min(100,pc(h.fy,l));return`<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;gap:8px"><span style="font-weight:500">${esc(h.type==='Sukanya Samriddhi'?'Sukanya':h.type)} · ${esc(memOf(h.m).name)}</span><span class="num muted">${compact(h.fy)} / ${compact(l)}</span></div><div class="prog" style="--c:${p>=100?'var(--in)':'var(--accent)'};margin-top:6px"><i style="width:${p}%"></i></div></div>`}).join(''):'<div class="muted">Add “deposited this FY” on a PPF, NPS or Sukanya account to track the annual limit (₹1.5L for PPF and Sukanya, ₹50K extra for NPS).</div>'}</div>
   <div class="card s12"><h3>Holdings <span><button class="btn sm" data-act="addhold">+ Add investment</button></span></h3><div class="scroll"><table class="tbl hold"><thead><tr><th>Name</th><th>Type</th><th>Owner</th><th class="r">Invested</th><th class="r">Value</th><th class="r">Gain</th><th></th></tr></thead><tbody>
   ${hs.slice().sort((a,b)=>b.value-a.value).map(h=>{const g=h.value-h.invested;return`<tr><td style="font-weight:500">${esc(h.name)}</td><td><span class="tag" style="color:${HC[h.type]||'inherit'}">${esc(h.type)}</span></td><td>${ownTag(h.m)}</td><td class="r num">${money(h.invested)}</td><td class="r num">${money(h.value)}</td><td class="r num ${g>=0?'in':'out'}">${g>=0?'+':'−'}${h.invested?Math.abs(g/h.invested*100).toFixed(1):0}%</td><td class="r"><button class="btn sm" data-act="edithold" data-id="${h.id}">Edit</button></td></tr>`}).join('')}
   </tbody></table></div></div></div>`}

/* recurring */
let RC=null,RCk='';function recurring(){const k=S.tx.length+'|'+S.member+'|'+S._rv;if(RCk!==k){RC=recurring0();RCk=k}return RC}
function recurring0(){const g={};for(const t of base()){if(t.cat==='Transfers')continue;const k=mkey(t.desc)+(t.amt<0?'-':'+');(g[k]||(g[k]=[])).push(t)}
  const mx=(bounds()||{}).mx||'';const out=[];
  for(const [k,a] of Object.entries(g)){if(a.length<3)continue;a.sort((x,y)=>x.d<y.d?-1:1);const am=a.map(t=>Math.abs(t.amt)).sort((x,y)=>x-y),md=am[Math.floor(am.length/2)];
    if(a.filter(t=>Math.abs(Math.abs(t.amt)-md)<=md*.25).length<a.length*.7)continue;
    const iv=[];for(let i=1;i<a.length;i++)iv.push(daysBetween(a[i-1].d,a[i].d));const si=iv.slice().sort((x,y)=>x-y),mi=si[Math.floor(si.length/2)];
    const cad=mi<=9?['Weekly',4.35]:mi<=17?['Every 2 weeks',2.17]:mi<=35?['Monthly',1]:mi<=100?['Quarterly',1/3]:mi>=330?['Yearly',1/12]:null;if(!cad)continue;
    const tol=Math.max(4,mi*.15);if(iv.filter(x=>Math.abs(x-mi)<=tol).length<iv.length*.6)continue;
    const last=a[a.length-1];if(daysBetween(last.d,mx)>mi*1.7)continue;
    out.push({k:k.slice(0,-1),sign:a[0].amt<0?-1:1,amt:md,cad:cad[0],monthly:md*cad[1],last:last.d,next:addDays(last.d,mi),cat:last.cat,n:a.length})}
  return out.sort((a,b)=>b.monthly-a.monthly)}
function rec(){const r=recurring();if(!r.length)return empty('No repeating payments found yet. They show up after three or more matching entries.');
  const o=r.filter(x=>x.sign<0),i=r.filter(x=>x.sign>0),ot=o.reduce((a,x)=>a+x.monthly,0);
  const list=(a)=>a.map(x=>`<tr><td style="font-weight:500"><span class="dot" style="--c:${CC[x.cat]}"></span> ${esc(pretty(x.k))}</td><td>${x.cad}</td><td class="r num">${money(x.amt)}</td><td class="r num muted">${fd(x.last,false)}</td><td class="r num">${fd(x.next,false)}</td></tr>`).join('');
  const head='<thead><tr><th>Name</th><th>Cadence</th><th class="r">Typical</th><th class="r">Last</th><th class="r">Next due</th></tr></thead>';
  return`<div class="grid" style="margin-bottom:14px"><div class="card kpi s4"><div class="lbl">Fixed outgoings</div><div class="val num">${money(ot)}<span class="muted" style="font-size:14px"> /mo</span></div><div class="foot"><span class="faint">${money(ot*12)} a year</span></div></div>
  <div class="card kpi s4"><div class="lbl">Regular income</div><div class="val num in">${money(i.reduce((a,x)=>a+x.monthly,0))}<span class="muted" style="font-size:14px"> /mo</span></div><div class="foot"><span class="faint">${i.length} sources</span></div></div></div>
  <div class="card"><h3>Bills, EMIs, SIPs and subscriptions</h3><div class="scroll"><table class="tbl hold">${head}<tbody>${list(o)}</tbody></table></div></div>
  ${i.length?`<div class="card" style="margin-top:14px"><h3>Regular income</h3><div class="scroll"><table class="tbl hold">${head}<tbody>${list(i)}</tbody></table></div></div>`:''}`}



/* command palette */
let cmdSel=0,cmdList=[],cmdGroups=null;
const GI={'Actions':'<path d="M13 2L3 14h8l-1 8 10-12h-8z"/>','Family':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>','Period':'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>','Transactions':'<path d="M4 4h16v16l-3-2-3 2-3-2-3 2-4-2z"/><path d="M8 9h8M8 13h5"/>'};
function cmdItems(q){
  const nav=TABS.map(([k,l,ic])=>({g:'Go to',t:l,i:ic,run:()=>{S.view=k;render();scrollTo(0,0)}}));
  const act=[['Import statement or holdings',()=>A.import()],['Add a transaction',addTxDialog],['Add an investment',()=>holdForm()],['Open settings',settings],['Install & hosting guide',guideDlg],['Theme: light',()=>setTheme('light',$('#themebtn'))],['Theme: dark',()=>setTheme('dark',$('#themebtn'))],['Download backup',()=>A.bkdl()]].map(([t,run])=>({g:'Actions',t,run}));
  const mem=[{g:'Family',t:'Show everyone',run:()=>{S.member='all';render()}},...S.members.map(m=>({g:'Family',t:'Show '+m.name,run:()=>{S.member=m.id;render()}}))];
  const per=RANGES().map(([k,l])=>({g:'Period',t:'Period: '+l,run:()=>{S.range=k;render()}}));
  let items=[...nav,...act,...mem,...per];const qq=q.trim().toLowerCase();
  if(qq){const w=qq.split(/\s+/);items=items.filter(x=>w.every(a=>x.t.toLowerCase().includes(a)));
    if(qq.length>=2){const tm=S.tx.filter(t=>w.every(a=>(t.desc+' '+t.cat).toLowerCase().includes(a))).sort((a,b)=>a.d<b.d?1:-1).slice(0,6).map(t=>({g:'Transactions',t:t.desc,sub:`${fd(t.d,false)} · ${money(t.amt)}`,run:()=>{S.q=qq;S.fcat='all';S.facct='all';S.ftype='all';S.range='all';S.view='tx';render()}}));items=items.concat(tm)}}
  return items}
function drawCmd(){cmdList=cmdItems($('#cmdq').value);if(cmdGroups)cmdList=cmdList.filter(x=>cmdGroups.includes(x.g));cmdSel=Math.min(cmdSel,Math.max(0,cmdList.length-1));let last='';
  $('#cmdl').innerHTML=cmdList.length?cmdList.map((x,i)=>{const h=x.g!==last?`<div class="cg">${esc(x.g)}</div>`:'';last=x.g;return h+`<button class="ci" role="option" data-i="${i}" aria-selected="${i===cmdSel}">${svg(x.i||GI[x.g]||'',18)}<span class="ct">${esc(x.t)}</span>${x.sub?`<small>${esc(x.sub)}</small>`:''}</button>`}).join(''):'<div class="empty">No matches</div>';
  const s=$('#cmdl .ci[aria-selected=true]');if(s)s.scrollIntoView({block:'nearest'})}
function openCmd(q='',groups=null){cmdGroups=groups;cmdSel=0;$('#cmd').hidden=false;$('#cmdq').value=q;drawCmd();setTimeout(()=>$('#cmdq').focus(),20)}
function closeCmd(){$('#cmd').hidden=true}
function runCmd(i){const x=cmdList[i];if(!x)return;closeCmd();x.run()}

/* uploads */
function uploadsView(){const u=S.uploads,dups=u.reduce((a,x)=>a+(x.dup||0),0);
  const k=(l,v,s)=>`<div class="card kpi s4"><div class="lbl">${l}</div><div class="val num">${v}</div><div class="foot"><span class="faint">${s}</span></div></div>`;
  const head=`<div class="grid" style="margin-bottom:14px">${k('Files imported',u.length,'statements and holdings')}${k('Transactions in your database',S.tx.length.toLocaleString('en-IN'),'saved in this browser')}${k('Duplicates skipped',dups.toLocaleString('en-IN'),'overlapping rows ignored')}</div>`;
  if(!u.length)return head+`<div class="card empty"><p style="margin:0 0 12px"><b style="color:var(--fg)">Nothing imported yet.</b><br>Every file you import is logged here, and its transactions are stored as records in your own database.</p><button class="btn primary" data-act="import">Import a file</button></div>`;
  return head+`<div class="card"><h3>Import history <button class="btn sm" data-act="import">Import another file</button></h3><div class="scroll"><table class="tbl hold"><thead><tr><th>File</th><th>Account</th><th>Period</th><th>When</th><th class="r">New</th><th class="r">Duplicates</th><th></th></tr></thead><tbody>
  ${u.map(x=>`<tr><td style="font-weight:500;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(x.name)}">${esc(x.name)} <span class="tag">${x.kind==='hold'?'holdings':'transactions'}</span>${x.holds?` <span class="tag">+${x.holds} investments</span>`:''}</td><td>${x.kind==='tx'?(x.accts&&x.accts.length>1?x.accts.length+' accounts':esc(acctOf(x.acct).name))+' '+ownTag(acctOf(x.acct).member):'—'}</td><td class="muted">${x.from?fd(x.from,false)+' – '+fd(x.to):'—'}</td><td class="muted">${new Date(x.at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</td>
  <td class="r num in">${x.added}${x.kind==='hold'?' / '+x.updated+' upd.':''}</td><td class="r num ${x.dup?'warn':'faint'}">${x.dup||0}</td><td class="r">${x.kind==='tx'?`<button class="btn sm danger" data-act="updel" data-id="${x.id}">Remove</button>`:''}</td></tr>`).join('')}</tbody></table></div>
  <p class="muted" style="margin:12px 0 0;font-size:12.5px">Removing an import deletes only the transactions it added. Re-importing the same file later is safe: matching rows are skipped.</p></div>`}

/* ---------- parsing ---------- */
function parseCSV(text,delim){const rows=[];let r=[],f='',q=false;text=text.replace(/^﻿/,'');
  for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'){if(text[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;else if(c===delim){r.push(f);f=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;r.push(f);f='';rows.push(r);r=[]}else f+=c}
  if(f!==''||r.length){r.push(f);rows.push(r)}return rows}
const MON='jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');
function parseDate(s,order,defY){s=String(s??'').trim().replace(/\s+\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?$/i,'').replace(/T.*$/,'');if(!s)return null;let m,y,mo,d;const ok=()=>mo>=1&&mo<=12&&d>=1&&d<=31?`${y}-${pad(mo)}-${pad(d)}`:null;
  if(m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/)){y=+m[1];mo=+m[2];d=+m[3];return ok()}
  if(m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/)){y=+m[3];if(y<100)y+=2000;if(order==='mdy'){mo=+m[1];d=+m[2]}else{d=+m[1];mo=+m[2]}return ok()}
  if(m=s.match(/^(\d{1,2})[ \-\/.]([A-Za-z]{3,9})\.?[ ,\-\/.]*(\d{2,4})?$/)){mo=MON.indexOf(m[2].slice(0,3).toLowerCase())+1;if(!mo)return null;d=+m[1];y=m[3]?+m[3]:defY;if(y<100)y+=2000;return ok()}
  if(m=s.match(/^([A-Za-z]{3,9})\.? (\d{1,2})(?:st|nd|rd|th)?,?(?: (\d{2,4}))?$/)){mo=MON.indexOf(m[1].slice(0,3).toLowerCase())+1;if(!mo)return null;d=+m[2];y=m[3]?+m[3]:defY;if(y<100)y+=2000;return ok()}
  if(defY&&(m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})$/))){y=defY;if(order==='mdy'){mo=+m[1];d=+m[2]}else{d=+m[1];mo=+m[2]}return ok()}
  return null}
function num(s){if(typeof s==='number')return s;if(s==null)return NaN;s=String(s).trim();if(!s||/^[-–—]+$/.test(s))return NaN;let neg=false;
  if(/^\(.*\)$/.test(s))neg=true;if(/\bDR\b|\bD$/i.test(s))neg=true;if(s.includes('-')||s.includes('−'))neg=true;
  s=s.replace(/[^0-9.,]/g,'');if(!s)return NaN;const lc=s.lastIndexOf(','),ld=s.lastIndexOf('.');
  if(lc>-1&&ld>-1){s=lc>ld?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'')}else if(lc>-1){s=/,\d{1,2}$/.test(s)&&(s.match(/,/g)||[]).length===1?s.replace(',','.'):s.replace(/,/g,'')}
  const v=parseFloat(s);return isNaN(v)?NaN:neg?-v:v}
function guessOrder(vals){let dm=0,md=0;for(const v of vals){const m=String(v).match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-]\d{2,4}/);if(!m)continue;if(+m[1]>12)dm++;else if(+m[2]>12)md++}
  return dm>md?'dmy':md>dm?'mdy':(S.order||'dmy')}
function prepTable(rows){rows=rows.map(r=>r.map(c=>c==null?'':String(c).trim())).filter(r=>r.some(c=>c));
  let hi=-1;for(let i=0;i<Math.min(rows.length,40);i++){const r=rows[i],j=r.join('|').toLowerCase();if(r.filter(Boolean).length>=3&&/date|txn/.test(j)&&/amount|debit|credit|withdraw|deposit|narration|description|particular|dr|cr/.test(j)){hi=i;break}}
  if(hi<0)for(let i=0;i<Math.min(rows.length,40);i++){const j=rows[i].join('|').toLowerCase();if(rows[i].filter(Boolean).length>=3&&/qty|quantity|units|isin|instrument|symbol|scheme/.test(j)&&/ltp|avg|invested|current|nav|value|price/.test(j)){hi=i;break}}
  if(hi<0){const w=Math.max(...rows.slice(0,20).map(r=>r.length),1);return{header:Array.from({length:w},(_,i)=>`Column ${i+1}`),rows:rows.filter(r=>r.filter(Boolean).length>=2)}}
  const header=rows[hi];return{header,rows:rows.slice(hi+1).filter(r=>r.filter(Boolean).length>=2)}}
function detectKind(t){const j=t.header.join('|').toLowerCase();if(/qty|quantity|units|isin|instrument|scheme/.test(j)&&/ltp|avg|invested|current|nav|market value|cur\.? val/.test(j)&&!/\bdate\b|narration|debit|credit|withdraw/.test(j))return'hold';return'tx'}
function detectMap(t){const h=t.header.map(x=>x.toLowerCase()),f=re=>h.findIndex(x=>re.test(x));
  const m={date:f(/txn date|transaction date|value date|^date|date/),desc:f(/narration|description|particular|detail|payee|merchant|memo|remarks|transaction remarks/),debit:f(/withdraw|debit|paid out|money out|\bdr\b/),credit:f(/deposit|credit|paid in|money in|\bcr\b/),amt:-1};
  m.amt=h.findIndex((x,i)=>/amount|amt|value/.test(x)&&!/balance|closing|date|\bdt\b/.test(x)&&i!==m.debit&&i!==m.credit&&i!==m.date);
  if((m.debit>=0||m.credit>=0)&&m.amt>=0&&!/^amount$/.test(h[m.amt]))m.amt=-1;
  if(m.debit>=0&&m.credit>=0&&m.debit===m.credit){m.credit=-1}
  const rows=t.rows.slice(0,60),w=t.header.length;
  if(m.date<0){let b=0;for(let c=0;c<w;c++){const n=rows.filter(r=>parseDate(r[c],'dmy',2026)).length;if(n>b){b=n;m.date=c}}}
  if(m.amt<0&&m.debit<0&&m.credit<0){let b=0;for(let c=0;c<w;c++){if(c===m.date)continue;const n=rows.filter(r=>!isNaN(num(r[c]))&&/\d/.test(r[c])).length;if(n>b){b=n;m.amt=c}}}
  if(m.desc<0){let b=0;for(let c=0;c<w;c++){if([m.date,m.amt,m.debit,m.credit].includes(c))continue;const l=rows.reduce((a,r)=>a+(r[c]||'').length,0);if(l>b){b=l;m.desc=c}}}
  return m}
function buildTx(imp){const {table:t,map:m}=imp;const order=imp.order;const out=[];let bad=0;
  for(const r of t.rows){const d=parseDate(r[m.date],order,imp.defY);if(!d){if(r.filter(Boolean).length>2)bad++;continue}
    let a=NaN;if(m.debit>=0||m.credit>=0){const dv=m.debit>=0?Math.abs(num(r[m.debit])||0):0,cv=m.credit>=0?Math.abs(num(r[m.credit])||0):0;if(dv||cv)a=cv-dv}
    if(isNaN(a)&&m.amt>=0)a=num(r[m.amt]);if(isNaN(a)||a===0){bad++;continue}
    if(imp.flip)a=-a;let desc=(m.desc>=0?r[m.desc]:'')||r.filter((c,i)=>i!==m.date&&isNaN(num(c))).join(' ');desc=desc.replace(/\s+/g,' ').trim()||'Transaction';
    out.push({d,desc,amt:Math.round(a*100)/100})}
  return{txs:out,bad}}
function buildHold(imp){const t=imp.table,h=t.header.map(x=>x.toLowerCase()),f=re=>h.findIndex(x=>re.test(x));
  const c={name:f(/instrument|symbol|scheme|company|name|security/),qty:f(/qty|quantity|units/),avg:f(/avg|average|buy|cost price|purchase/),ltp:f(/ltp|nav|price|cmp|close/),inv:f(/invested|investment|cost value|buy value|amount invested/),val:f(/current value|cur\.? val|market value|present value|current amount|value/)};
  const o=[];for(const r of t.rows){const name=r[c.name];if(!name||/^total/i.test(name))continue;const q=c.qty>=0?num(r[c.qty]):NaN;let inv=c.inv>=0?Math.abs(num(r[c.inv])):NaN,val=c.val>=0?Math.abs(num(r[c.val])):NaN;
    if(isNaN(inv)&&!isNaN(q)&&c.avg>=0)inv=q*Math.abs(num(r[c.avg]));if(isNaN(val)&&!isNaN(q)&&c.ltp>=0)val=q*Math.abs(num(r[c.ltp]));
    if(isNaN(val)&&!isNaN(inv))val=inv;if(isNaN(inv)&&!isNaN(val))inv=val;if(isNaN(val)||!val)continue;
    const fund=/fund|growth|direct|plan|inf\w{9}|index|etf|scheme|elss|sip/i.test(name+' '+r.join(' '));
    o.push({name:name.replace(/\s+/g,' '),type:/gold|sgb/i.test(name)?'Gold':fund?'Mutual Funds':'Stocks',invested:Math.round(inv),value:Math.round(val)})}
  return o}
const loaded={};
/* Libraries are vendored in /vendor (no third-party requests, strict CSP). */
function loadScript(file){return loaded[file]||(loaded[file]=new Promise((res,rej)=>{const el=document.createElement('script');el.src='vendor/'+file;el.onload=res;el.onerror=()=>{el.remove();delete loaded[file];rej(new Error('Could not load vendor/'+file+'. Make sure the vendor folder was uploaded.'))};document.head.appendChild(el)}))}
function askPassword(file,wrong){return new Promise(res=>{modal(`<h2>This PDF is password protected</h2><p class="sub">${esc(file)}. Banks usually set the password to a mix of your name, date of birth or card digits. It stays in your browser.</p>${wrong?'<p class="out">That password did not work. Try again.</p>':''}
  <div class="fld"><label for="pw">Password</label><input id="pw" type="password" autocomplete="off"></div><div class="acts"><button class="btn" data-act="pwcancel">Skip file</button><button class="btn primary" data-act="pwok">Unlock</button></div>`);
  window.__pw=res;setTimeout(()=>$('#pw')&&$('#pw').focus(),30)})}
async function pdfRows(file,buf){await loadScript('pdf.min.js');await loadScript('pdf.worker.min.js');
  if(!window.pdfjsWorker&&window['pdfjs-dist/build/pdf.worker'])window.pdfjsWorker=window['pdfjs-dist/build/pdf.worker'];
  pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';
  const task=pdfjsLib.getDocument({data:new Uint8Array(buf),isEvalSupported:false});
  task.onPassword=async(update,reason)=>{const pw=await askPassword(file.name,reason===2);if(pw==null){task.destroy();return}update(pw)};
  const doc=await task.promise;closeModal();const lines=[],pages=[];
  for(let p=1;p<=doc.numPages;p++){const pg=await doc.getPage(p),tc=await pg.getTextContent();const items=tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({x:i.transform[4],y:i.transform[5],w:i.width,s:i.str}));pages.push(items);
    items.sort((a,b)=>b.y-a.y||a.x-b.x);const rows=[];for(const it of items){const r=rows.find(r=>Math.abs(r.y-it.y)<3);if(r)r.it.push(it);else rows.push({y:it.y,it:[it]})}
    rows.sort((a,b)=>b.y-a.y);for(const r of rows){r.it.sort((a,b)=>a.x-b.x);let s='',px=null;for(const it of r.it){if(px!==null)s+=it.x-px>6?'  ':(it.x-px>1?' ':'');s+=it.s;px=it.x+it.w}lines.push({t:s.trim(),y:r.y,p})}}
  let stmt=null;try{stmt=window.PFStmt?PFStmt.parse(pages):null}catch(e){console.error(e)}
  const text=lines.map(l=>l.t).join('\n'),ym=text.match(/\b(20\d{2})\b/g),defY=ym?+ym.sort((a,b)=>ym.filter(v=>v===b).length-ym.filter(v=>v===a).length)[0]:new Date().getFullYear();
  const dre=/^\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[ \-][A-Za-z]{3,9}[ \-,]*\d{0,4}|[A-Za-z]{3,9}\.? \d{1,2},? ?\d{0,4}|\d{1,2}[\/.]\d{1,2})(?=\s|$)/;
  const are=/(\(?-?[₹$]?\s?\d[\d,]*\.\d{2}\)?-?\s?(?:CR|DR|Cr|Dr|cr|dr)?)/g,hasAmt=/\d[\d,]*\.\d{2}/;
  const recs=[],others=[];
  for(const l of lines){const dm=l.t.match(dre);let rest='',am=[];if(dm){rest=l.t.slice(dm[0].length).replace(/^\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{1,2}[\/.]\d{1,2})\s+/,'');am=[...rest.matchAll(are)]}
    if(dm&&am.length)recs.push({l,dm,rest,am,pre:[],post:[]});else others.push(l)}
  /* narrations often wrap onto lines above or below the row that holds the date and amounts */
  for(const o of others){if(hasAmt.test(o.t)||dre.test(o.t))continue;let best=null,bd=13;
    for(const r of recs)if(r.l.p===o.p){const d=Math.abs(r.l.y-o.y);if(d<bd){bd=d;best=r}}
    if(best)(o.y>best.l.y?best.pre:best.post).push(o)}
  const out=[];let prevBal=null;
  for(const r of recs){const first=r.am[0];const inline=r.rest.slice(0,first.index);
    const desc=[...r.pre.sort((a,b)=>b.y-a.y).map(x=>x.t),inline,...r.post.sort((a,b)=>b.y-a.y).map(x=>x.t)].join(' ').replace(/\s+/g,' ').trim();if(desc.length<2)continue;
    const raw=first[0].trim(),v=Math.abs(num(raw));if(!v)continue;let sign;
    if(/CR\b/i.test(raw))sign=1;else if(/DR\b/i.test(raw)||/^\(|-/.test(raw))sign=-1;
    if(r.am.length>=2){const bal=Math.abs(num(r.am[r.am.length-1][0]));if(sign==null&&prevBal!=null)sign=bal<prevBal?-1:bal>prevBal?1:null;prevBal=bal}
    if(sign==null)sign=/deposit|salary|credit|refund|interest|received|reversal|cashback|payment (thank|received)/i.test(desc)?1:-1;
    out.push([r.dm[1].trim(),desc,String(sign*v)])}
  return{header:['Date','Description','Amount'],rows:out,defY,stmt}}
async function fileHash(f){try{const h=await crypto.subtle.digest('SHA-256',await f.arrayBuffer());return[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){return f.name+'|'+f.size}}
async function ingest(file){const ext=(file.name.split('.').pop()||'').toLowerCase();let table;let defY=new Date().getFullYear();
  try{if(ext==='pdf'){const r=await pdfRows(file,await file.arrayBuffer());if(r.stmt)return{name:file.name,kind:'stmt',stmt:r.stmt,hash:await fileHash(file),size:file.size};if(!r.rows.length)throw new Error('No transaction lines found in this PDF. It may be a scanned image. Try the Excel or CSV export from your bank.');table={header:r.header,rows:r.rows};defY=r.defY}
    else if(ext==='xlsx'||ext==='xls'){await loadScript('xlsx.full.min.js');const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});let best=[];for(const n of wb.SheetNames){const r=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:false,defval:''});if(r.length>best.length)best=r}table=prepTable(best)}
    else if(ext==='ofx'||ext==='qfx'){const tx=await file.text();const rows=[...tx.matchAll(/<STMTTRN>([\s\S]*?)(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>)/gi)].map(m=>{const g=t=>(m[1].match(new RegExp('<'+t+'>([^<\\r\\n]*)','i'))||[])[1]||'';const d=g('DTPOSTED');return[`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`,g('NAME')+' '+g('MEMO'),g('TRNAMT')]});table={header:['Date','Description','Amount'],rows:rows}}
    else{const tx=await file.text();const l=tx.split(/\r?\n/).slice(0,6).join('\n');const dl=[['\t',(l.match(/\t/g)||[]).length],[';',(l.match(/;/g)||[]).length],[',',(l.match(/,/g)||[]).length]].sort((a,b)=>b[1]-a[1])[0][0];table=prepTable(parseCSV(tx,dl))}
    if(!table.rows.length)throw new Error('No rows found in this file.');
  }catch(e){toast(e.message||'Could not read the file');console.error(e);return null}
  const kind=detectKind(table);const imp={name:file.name,table,kind,defY,hash:await fileHash(file),size:file.size};
  if(kind==='tx'){imp.map=detectMap(table);const dates=table.rows.map(r=>r[imp.map.date]);imp.order=guessOrder(dates);imp.flip=false;
    imp.acctType=/card|credit/i.test(file.name)?'card':'bank';
    const probe=buildTx({...imp});const pos=probe.txs.filter(t=>t.amt>0).length;if(imp.map.debit<0&&imp.map.credit<0&&probe.txs.length>=8&&pos/probe.txs.length>.95&&imp.acctType==='card')imp.flip=true}
  else imp.holds=buildHold(imp);return imp}
async function takeFiles(files){for(const f of files){toast('Reading '+f.name+'…');const i=await ingest(f);if(i)S.queue.push(i)}if(S.queue.length&&$('#modal').hidden)nextImport()}
function adoptBank(i){if(i.kind!=='stmt')return;const st=i.stmt;st.bank=canonBank(st.bank);
  const seen=new Set();for(const s of st.sections){const l4=String(s.number||'').slice(-4);if(!l4)continue;for(const a of S.accts)if(a.no===l4&&a.bank)seen.add(canonBank(a.bank))}
  const has=st.sections.some(s=>findAcct(s.number,st.bank)&&findAcct(s.number,st.bank).bank);
  if(seen.size===1&&!has){const b=[...seen][0];if(b!==st.bank){i.bankHint=`The statement read as ${st.bank||'no bank'}, but you already have this account number under ${b}, so ${b} is used. Change it below if that is wrong.`;st.bank=b;st.bankSure=true}}
  else if(!st.bankSure&&!has)i.bankHint='This statement does not clearly name its bank. Please check it below before importing.'}
function nextImport(){const i=S.queue.shift();if(!i){closeModal();return}S.imp=i;adoptBank(i);i.kind==='hold'?holdDialog():i.kind==='stmt'?stmtDialog():txDialog()}
function colSel(id,t,cur){return`<select id="${id}" data-change="impmap"><option value="-1">— none —</option>${t.header.map((h,i)=>`<option value="${i}" ${i===cur?'selected':''}>${esc(h||'Column '+(i+1))}</option>`).join('')}</select>`}
function txDialog(){const i=S.imp,{txs,bad}=buildTx(i);i.txs=txs;const prior=S.uploads.find(u=>u.hash===i.hash);const ex=new Map();for(const t of S.tx){const k=t.acct+'|'+t.d+'|'+t.amt+'|'+t.desc.toLowerCase();ex.set(k,(ex.get(k)||0)+1)}
  const seen=new Map();let dup=0;for(const t of txs){const k=(i.acct||'new')+'|'+t.d+'|'+t.amt+'|'+t.desc.toLowerCase();seen.set(k,(seen.get(k)||0)+1)}
  const mn=txs.reduce((a,t)=>t.d<a?t.d:a,'9999'),mx=txs.reduce((a,t)=>t.d>a?t.d:a,'0000');const inn=txs.filter(t=>t.amt>0),out=txs.filter(t=>t.amt<0);
  const accs=S.accts;const cur=i.acct||(accs[0]&&accs[0].id)||'new';
  modal(`<h2>Import ${esc(i.name)}</h2><p class="sub">Read in your browser. Nothing is uploaded anywhere.</p>
  <div class="frm"><div class="fld"><label for="iacct">Account</label><select id="iacct" data-change="iacct">${accs.map(a=>`<option value="${a.id}" ${cur===a.id?'selected':''}>${esc(a.name)} · ${a.type==='card'?'card':'bank'}</option>`).join('')}<option value="new" ${cur==='new'?'selected':''}>New account…</option></select></div>
   <div class="fld"><label for="imem">Belongs to</label>${sel('imem',memberOpts(),i.mem||S.member!=='all'&&S.member||S.members[0].id)}</div>
   ${cur==='new'?`<div class="fld"><label for="inm">Account name</label><input id="inm" value="${esc(i.nm||'')}" placeholder="e.g. HDFC Regalia card"></div><div class="fld"><label for="ity">Type</label>${sel('ity',[['bank','Bank account'],['card','Credit card']],i.acctType)}</div>`:''}
   <div class="fld"><label>Date column</label>${colSel('mdate',i.table,i.map.date)}</div><div class="fld"><label>Description column</label>${colSel('mdesc',i.table,i.map.desc)}</div>
   <div class="fld"><label>Amount column</label>${colSel('mamt',i.table,i.map.amt)}</div><div class="fld"><label>Date order</label>${sel('iorder',[['dmy','Day / Month / Year'],['mdy','Month / Day / Year']],i.order,'data-change="impmap"')}</div>
   <div class="fld"><label>Debit column (optional)</label>${colSel('mdeb',i.table,i.map.debit)}</div><div class="fld"><label>Credit column (optional)</label>${colSel('mcre',i.table,i.map.credit)}</div>
   <label class="full" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="iflip" data-change="impmap" ${i.flip?'checked':''} style="width:auto"> Reverse signs (tick when purchases show as positive numbers, usual for credit cards)</label></div>
  <div class="note" style="margin-top:12px"><b>${txs.length}</b> transactions${txs.length?` from ${fd(mn)} to ${fd(mx)}`:''} · <span class="in">${inn.length} in (${money(inn.reduce((a,t)=>a+t.amt,0))})</span> · <span class="out">${out.length} out (${money(-out.reduce((a,t)=>a+t.amt,0))})</span>${bad?` · ${bad} rows skipped`:''}<br>${prior?`<b class="out">You already imported this exact file on ${new Date(prior.at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}.</b> Importing again will add nothing.`:'Entries that match earlier imports (same account, date, amount and description) are skipped automatically.'}</div>
  <div class="scroll" style="margin-top:12px"><table class="tbl hold"><tbody>${txs.slice(0,5).map(t=>`<tr><td>${fd(t.d)}</td><td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.desc)}</td><td><span class="tag">${esc(categorize(t.desc,t.amt))}</span></td><td class="r num ${t.amt>0?'in':''}">${money(t.amt,2)}</td></tr>`).join('')}</tbody></table></div>
  <div class="acts"><button class="btn" data-act="impcancel">Skip</button><button class="btn primary" data-act="impgo" ${txs.length?'':'disabled'}>Import ${txs.length} transactions</button></div>`)}
function holdDialog(){const i=S.imp;modal(`<h2>Update investments from ${esc(i.name)}</h2><p class="sub">Looks like a holdings file. Existing entries with the same name and owner are updated, new ones are added.</p>
  <div class="frm"><div class="fld"><label for="imem">Owner</label>${sel('imem',memberOpts(),S.member!=='all'&&S.member||S.members[0].id)}</div></div>
  <div class="note" style="margin:12px 0"><b>${i.holds.length}</b> holdings · value ${money(i.holds.reduce((a,h)=>a+h.value,0))}${i.holds.length?'':' — columns were not recognised.'}</div>
  <div class="scroll"><table class="tbl hold"><thead><tr><th>Name</th><th>Type</th><th class="r">Invested</th><th class="r">Value</th></tr></thead><tbody>${i.holds.slice(0,8).map(h=>`<tr><td>${esc(h.name)}</td><td><span class="tag">${h.type}</span></td><td class="r num">${money(h.invested)}</td><td class="r num">${money(h.value)}</td></tr>`).join('')}</tbody></table></div>
  <div class="acts"><button class="btn" data-act="impcancel">Skip</button><button class="btn primary" data-act="holdgo" ${i.holds.length?'':'disabled'}>Update investments</button></div>`)}
/* ---- transfers between your own accounts ---- */
function unlinkXf(t){if(!t.xf)return;const p=S.tx.find(x=>x!==t&&x.xf===t.xf);for(const x of p?[t,p]:[t]){x.cat=x.xo||categorize(x.desc,x.amt);delete x.xf;delete x.xo}}
function fixXf(){const ids=new Set(S.tx.filter(t=>t.xf).map(t=>t.xf));for(const id of ids){const l=S.tx.filter(t=>t.xf===id);if(l.length!==2)for(const t of l)unlinkXf(t)}}
function matchTransfers(){const pool=S.tx.filter(t=>!t.xf&&!t.xn&&Math.abs(t.amt)>=500&&t.cat!=='Investments');
  const ins=new Map();for(const t of pool)if(t.amt>0){const k=t.amt.toFixed(2);(ins.get(k)||ins.set(k,[]).get(k)).push(t)}
  const out=pool.filter(t=>t.amt<0).sort((a,b)=>a.d<b.d?-1:1),used=new Set();let n=0;
  for(const o of out){const l=ins.get((-o.amt).toFixed(2));if(!l)continue;
    const c=l.filter(i=>!used.has(i.id)&&i.acct!==o.acct&&Math.abs(daysBetween(o.d,i.d))<=3).map(i=>[Math.abs(daysBetween(o.d,i.d)),i]).sort((a,b)=>a[0]-b[0]);
    if(!c.length||(c.length>1&&c[0][0]===c[1][0]))continue;
    const i=c[0][1],id=uid();used.add(i.id);for(const t of [o,i]){t.xo=t.cat;t.cat='Transfers';t.xf=id}n++}
  return n}
function xfCount(){return S.tx.filter(t=>t.xf).length/2}
/* ---- backup reminder ---- */
function bkDays(){return bk.last?Math.floor((Date.now()-bk.last)/864e5):null}
function bkDue(){if(!S.tx.length||!bk.every)return false;if(Date.now()<bk.snooze)return false;
  if(!bk.last){if(!bk.since){bk.since=Date.now();saveMeta();return false}return Date.now()-bk.since>7*864e5}
  return Date.now()-bk.last>bk.every*864e5}
function bkBanner(){if(saveFail)return`<div class="banner" style="border-color:var(--out)"><div><b>Could not save to this browser.</b> Storage may be full or blocked. Download a backup now so nothing is lost.</div><button class="btn primary sm" data-act="bkdl">Download backup</button></div>`;if(!bkDue())return'';const d=bkDays();
  return`<div class="banner" id="bkbn"><div><b>Back up your data.</b> ${d==null?'You have not made a backup yet.':`Your last backup was ${d} day${d===1?'':'s'} ago.`} Everything lives only in this browser, so a cleared cache or a lost device would take it with it.</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary sm" data-act="bkdl">Download backup</button><button class="btn sm" data-act="bksnooze">Remind me in a week</button></div></div>`}
function bkDone(){bk.last=Date.now();bk.snooze=0;saveMeta()}
function doImport(){const i=S.imp;
  let acctId=($('#iacct')?$('#iacct').value:'new');const mem=$('#imem').value;
  if(acctId==='new'){const a={id:uid(),name:($('#inm')?.value||'').trim()||(i.acctType==='card'?'Credit card':'Bank account'),type:$('#ity')?.value||i.acctType,member:mem};S.accts.push(a);acctId=a.id}
  const ac=acctOf(acctId);const ex=new Map();for(const t of S.tx){const k=t.acct+'|'+t.d+'|'+t.amt+'|'+t.desc.toLowerCase();ex.set(k,(ex.get(k)||0)+1)}
  const src=uid(),run=new Map();let added=0,dup=0;for(const t of i.txs){const k=acctId+'|'+t.d+'|'+t.amt+'|'+t.desc.toLowerCase();const n=(run.get(k)||0)+1;run.set(k,n);if(n<=(ex.get(k)||0)){dup++;continue}
    S.tx.push({id:uid(),d:t.d,desc:t.desc,amt:t.amt,acct:acctId,m:ac.member||mem,cat:categorize(t.desc,t.amt),src});added++}
  const ds=i.txs.map(t=>t.d).sort();S.uploads.unshift({id:src,name:i.name,kind:'tx',at:Date.now(),hash:i.hash,acct:acctId,added,dup,total:i.txs.length,from:ds[0],to:ds[ds.length-1]});
  const xm=matchTransfers();save();toast(`Added ${added} transactions${dup?`, skipped ${dup} duplicates`:''}${xm?`, matched ${xm} transfer${xm>1?'s':''} between your accounts`:''}`);S.range=S.range;S.view=S.view==='bud'||S.view==='inv'?'overview':S.view;nextImportOrRender()}

/* ---------- bank statements read by column position (see js/statement.js) ---------- */
const sLabel=(st,s)=>`${st.bank||'Bank'} ${s.type} ••${String(s.number||'').slice(-4)||'----'}`.replace(' ••----','');
const findAcct=(no,bank)=>no&&S.accts.find(a=>a.no===String(no).slice(-4)&&(!a.bank||!bank||a.bank.toLowerCase()===bank.toLowerCase()));
function stmtCat(sec,t){if(sec.type==='PPF')return t.amt>0&&/int/i.test(t.desc)?'Income':'Transfers';return categorize(t.desc,t.amt)}
function stmtHolds(st){return st.holdings.map(h=>{const l4=String(h.number).slice(-4),b=st.bank||'Bank';
  if(h.kind==='FD')return{name:`${b} FD ••${l4}`,type:'FD / RD',invested:Math.round(h.invested),value:Math.round(h.value),maturity:h.maturity||undefined,rate:h.rate};
  const sec=st.sections.find(x=>x.number===h.number),last=sec&&sec.rows.length?sec.rows[sec.rows.length-1].d:null,fy=last?fyStart(+last.slice(0,4),+last.slice(5,7)):null;
  const dep=sec&&fy!=null?sec.rows.filter(r=>r.amt>0&&!/int/i.test(r.desc)&&fyStart(+r.d.slice(0,4),+r.d.slice(5,7))===fy).reduce((a,r)=>a+r.amt,0):undefined;
  return{name:`${b} PPF ••${l4}`,type:'PPF',invested:h.invested,value:h.value,fy:dep}})}
/* Who a statement belongs to: the person selected on screen, else the owner of an account we already know, else ask. */
function stmtOwner(st){if(S.member!=='all')return S.member;for(const s of st.sections){const a=findAcct(s.number,st.bank);if(a&&a.member)return a.member}return S.members.length===1?S.members[0].id:''}
const stmtOwnerOpts=()=>S.members.length>1?[['','Choose a person…'],...memberOpts()]:memberOpts();
function stmtDialog(){const i=S.imp,st=i.stmt;i.pick=i.pick||st.sections.map(()=>true);if(i.hold==null)i.hold=true;const holds=stmtHolds(st);
  const prior=S.uploads.find(u=>u.hash===i.hash),ex=new Map();for(const t of S.tx){const k=t.acct+'|'+t.d+'|'+t.amt+'|'+t.desc.toLowerCase();ex.set(k,(ex.get(k)||0)+1)}
  const card=(s,n)=>{const a=findAcct(s.number,st.bank),inn=s.rows.filter(r=>r.amt>0),out=s.rows.filter(r=>r.amt<0),c=s.check,good=c.mismatched===0&&c.closingMatch!==false&&c.totalsMatch!==false;
    let dup=0;if(a){const run=new Map();for(const t of s.rows){const k=a.id+'|'+t.d+'|'+t.amt+'|'+t.desc.toLowerCase(),q=(run.get(k)||0)+1;run.set(k,q);if(q<=(ex.get(k)||0))dup++}}
    return`<label class="card" style="padding:14px 16px;display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin-bottom:10px;cursor:pointer"><input type="checkbox" data-change="stpick" data-n="${n}" ${i.pick[n]?'checked':''} style="width:auto;margin-top:3px"><div>
     <div style="font-weight:600">${esc(sLabel(st,s))} ${a?`<span class="tag">matches ${esc(a.name)}</span>`:'<span class="tag">new account</span>'}</div>
     <div class="muted" style="font-size:13px">${s.rows.length} transactions · ${fd(s.rows[0].d)} to ${fd(s.rows[s.rows.length-1].d)} · <span class="in">${money(inn.reduce((x,r)=>x+r.amt,0))} in</span> · <span class="out">${money(Math.abs(out.reduce((x,r)=>x+r.amt,0)))} out</span>${dup?` · <b class="out">${dup} already imported</b>`:''}</div>
     <div style="font-size:12.5px;margin-top:4px" class="${good?'in':'out'}">${good?'✓ Every row matches the running balance'+(c.totalsMatch?' and the statement totals':''):`⚠ ${c.mismatched} row(s) do not match the running balance. Check the preview.`}</div>
     ${s.type==='PPF'?'<div class="faint" style="font-size:12.5px;margin-top:2px">Investment account: deposits count as transfers and interest as income, so nothing is counted twice.</div>':''}</div></label>`};
  modal(`<h2>Import ${esc(i.name)}</h2><p class="sub">${esc(st.bank||'Bank')} statement with ${st.sections.length} account${st.sections.length>1?'s':''}, read by column position in your browser. Nothing is uploaded.</p>
  <div class="frm"><div class="fld"><label for="imem">Belongs to</label>${sel('imem',stmtOwnerOpts(),i.mem||stmtOwner(st))}</div><div class="fld"><label for="ibank">Bank <span class="faint">(read from the statement, change it if wrong)</span></label><input class="in-t" id="ibank" value="${esc(st.bank||'')}" data-change="stbank" placeholder="e.g. ICICI" autocomplete="off">${i.bankHint?`<small class="${st.bankSure?'faint':'out'}" style="display:block;margin-top:6px;line-height:1.4">${esc(i.bankHint)}</small>`:''}</div></div>
  <div style="margin-top:12px">${st.sections.map(card).join('')}</div>
  ${holds.length?`<label class="card" style="padding:14px 16px;display:grid;grid-template-columns:auto 1fr;gap:4px 12px;cursor:pointer"><input type="checkbox" data-change="sthold" ${i.hold?'checked':''} style="width:auto;margin-top:3px"><div><div style="font-weight:600">Update Investments</div><div class="muted" style="font-size:13px">${holds.filter(h=>h.type==='FD / RD').length} fixed deposits and ${holds.filter(h=>h.type==='PPF').length} PPF, worth ${money(holds.reduce((a,h)=>a+h.value,0))}. Existing entries with the same name are updated.</div></div></label>`:''}
  ${prior?`<div class="note" style="margin-top:12px"><b class="out">You already imported this exact file on ${new Date(prior.at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}.</b> Importing again will add nothing.</div>`:''}
  <div class="acts"><button class="btn" data-act="impcancel">Skip</button><button class="btn primary" data-act="stmtgo">Import</button></div>`)}
/* ---- statement holdings: a newer statement replaces older FD/PPF lists ---- */
const isStmHold=h=>h.stm||/ (FD|PPF) ••\d{4}$/.test(h.name);
function reconcileHolds(st,mem,asof){const bank=st.bank||'Bank',nh=stmtHolds(st),res={n:0,removed:0,kept:0};
  const mine=S.hold.filter(h=>h.m===mem&&isStmHold(h)&&h.name.toLowerCase().startsWith(bank.toLowerCase()+' '));
  if(mine.some(h=>h.asof&&h.asof>asof)){res.kept=1;return res}
  const keep=new Set(nh.map(h=>h.name.toLowerCase()));
  if(st.fdListed||nh.some(h=>h.type==='FD / RD')){const gone=mine.filter(h=>h.type==='FD / RD'&&!keep.has(h.name.toLowerCase()));if(gone.length){const ids=new Set(gone.map(h=>h.id));S.hold=S.hold.filter(h=>!ids.has(h.id));res.removed=gone.length}}
  for(const h of nh){const e=S.hold.find(x=>x.name.toLowerCase()===h.name.toLowerCase()&&x.m===mem);const rec={...h,stm:true,bank,asof};if(e)Object.assign(e,rec);else S.hold.push({id:uid(),m:mem,...rec});res.n++}
  return res}
/* ---- balances ---- */
function curBal(a){if(a.bal==null)return null;let b=a.bal;if(a.balAsOf)for(const t of S.tx)if(t.acct===a.id&&t.d>a.balAsOf)b+=t.amt;return b}
function netWorth(){const accs=S.accts.filter(a=>S.member==='all'||a.member===S.member);let cash=0,due=0,known=0,unknown=0;
  for(const a of accs){if(a.sub==='PPF'||a.closed)continue;const b=curBal(a);if(b==null){unknown++;continue}known++;if(a.type==='card')due+=Math.min(0,b);else cash+=b}
  const hs=S.hold.filter(inMember),inv=hs.reduce((x,h)=>x+h.value,0);return{cash,due,inv,total:cash+due+inv,known,unknown,accs}}

function pageHead(){const h=HEAD[S.view];if(S.view==='upd'){const u=S._u||{},pill=u.done?'<span class="tg ok">Updated</span>':u.latest?(u.newer?'<span class="tg warn">Update available</span>':'<span class="tg ok">Up to date</span>'):'';return`<div class="ph phu"><i class="tile">${svg('<path d="M7 18a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17 8.5a4.5 4.5 0 0 1 .5 9"/><path d="M12 21v-8M9 16l3-3 3 3"/>',24)}</i><div><h1>${h[0]}</h1><span>${h[1]}</span></div><div class="grow"></div>${pill}</div>`}return h?`<div class="ph"><h1>${h[0]}</h1><span>${h[1]}</span></div>`:''}
function balView(){const nw=netWorth();
  if(!S.accts.length&&!S.hold.length)return empty('Import a bank statement to see your balances.');
  const accs=nw.accs.filter(a=>a.sub!=='PPF'),fds=S.hold.filter(h=>inMember(h)&&h.type==='FD / RD').sort((a,b)=>(a.maturity||'9')<(b.maturity||'9')?-1:1),
    other=HT.map(([n,c])=>[n,S.hold.filter(h=>inMember(h)&&h.type===n&&h.type!=='FD / RD').reduce((x,h)=>x+h.value,0),c]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]),
    today=iso(new Date()),stale=a=>a.balAsOf&&daysBetween(a.balAsOf,today)>45;
  const stat=(l,v,sub,cls='')=>`<div class="card stat"><div class="sl">${l}</div><div class="sv num ${cls}">${v}</div><div class="ss">${sub}</div></div>`;
  const fdTot=fds.reduce((x,h)=>x+h.value,0);
  const row=a=>{const b=curBal(a),own=memOf(a.member);return`<div class="lr"><div class="lm"><div class="ln">${esc(a.name)} <span class="tg">${a.type==='card'?'Card':'Bank'}</span>${a.closed?'<span class="tg">Closed</span>':stale(a)?'<span class="tg warn">Statement is old</span>':''}</div><div class="lsub">${a.bank?esc(a.bank)+' · ':''}${a.no?'••'+esc(a.no)+' · ':''}${ownTag(a.member)}${a.balAsOf?` · as of ${fd(a.balAsOf)}`:''}</div></div><div class="lv">${b==null?'<span class="tg">No balance yet</span>':`<span class="num ${b<0?'out':''}">${money(b)}</span>`}<button class="btn sm" data-act="setbal" data-id="${a.id}">${b==null?'Set balance':'Edit'}</button></div></div>`};
  return`<div class="grid">
   <div class="s3">${stat('Net worth',money(nw.total),`${nw.known} account${nw.known===1?'':'s'} with a balance`)}</div>
   <div class="s3">${stat('Bank balance',money(nw.cash),nw.unknown?`${nw.unknown} account${nw.unknown>1?'s':''} without a balance`:'across your accounts')}</div>
   <div class="s3">${stat('Investments',money(nw.inv),`${S.hold.filter(inMember).length} holdings`)}</div>
   <div class="s3">${stat('Card dues',money(Math.abs(nw.due)),nw.due?'amount you owe':'none recorded',nw.due?'out':'')}</div>
   <div class="card s12">${balMatrix()}</div>
   <div class="card s12"><div class="ch"><div><h3>Bank and card accounts</h3><div class="cs">Balance is the closing balance on your latest statement, plus anything imported after it.</div></div></div>${accs.length?accs.map(row).join(''):'<div class="muted" style="padding:14px 0">Import a statement to add accounts.</div>'}</div>
   ${manageAccts()}
   <div class="card s12"><div class="ch"><div><h3>Fixed deposits</h3><div class="cs">${fds.length?`${fds.length} running · ${money(fdTot)} in total`:'None found in your statements'}</div></div><button class="btn sm link" data-act="view" data-v="inv">Open investments →</button></div>
    ${fds.map(h=>{const dl=h.maturity?daysBetween(today,h.maturity):null;return`<div class="lr"><div class="lm"><div class="ln">${esc(h.name)} ${h.rate?`<span class="tg ok">${h.rate}%</span>`:''}</div><div class="lsub">${h.maturity?`Matures ${fd(h.maturity)}${dl!=null?(dl<0?' · past maturity':` · in ${dl} days`):''}`:'No maturity date'}</div></div><div class="lv"><span class="num">${money(h.value)}</span></div></div>`}).join('')}</div>
  </div>`}
function manageAccts(){const row=(t,d)=>`<div class="srow"><div class="st"><b>${t}</b>${d?`<span>${d}</span>`:''}</div></div>`;
  return`<details class="card s12 mng"><summary><div><h3>Manage accounts and cards</h3><div class="cs">Rename, change owner or type, set a card limit and payment due day.</div></div></summary><div class="scard" style="margin-top:12px">${S.accts.length?S.accts.map(a=>`<div class="srow wide"><div class="st"><input class="in-t plain" value="${esc(a.name)}" data-change="aname" data-id="${a.id}" aria-label="Account name"><span>${a.bank?esc(a.bank)+' · ':''}${a.no?'••'+esc(a.no):''}</span></div><div class="sc">${sel('at'+a.id,[['bank','Bank'],['card','Card']],a.type,`data-change="atype" data-id="${a.id}"`)}${sel('am'+a.id,memberOpts(),a.member,`data-change="amem" data-id="${a.id}"`)}${a.type==='card'?`<input class="in-t lim" type="number" placeholder="Limit" value="${a.limit||''}" data-change="alim" data-id="${a.id}" aria-label="Card limit"><input class="in-t lim" type="number" min="1" max="31" placeholder="Due day" value="${a.due||''}" data-change="adue" data-id="${a.id}" aria-label="Payment due day of month" title="Payment due day of month">`:''}</div></div>`).join(''):row('No accounts yet','They appear after you import your first file.')}</div></details>`}
function balMatrix(){const ms=S.members,all=a=>a;
  const bankOf=m=>S.accts.filter(a=>a.member===m&&a.type!=='card'&&a.sub!=='PPF'&&!a.closed).reduce((x,a)=>x+(curBal(a)||0),0),dueOf=m=>S.accts.filter(a=>a.member===m&&a.type==='card'&&!a.closed).reduce((x,a)=>x+Math.min(0,curBal(a)||0),0),
    hOf=(m,t)=>S.hold.filter(h=>h.m===m&&h.type===t).reduce((x,h)=>x+h.value,0);
  const rows=[['Bank balance',m=>bankOf(m.id)]];for(const [t] of HT)if(S.hold.some(h=>h.type===t))rows.push([t==='FD / RD'?'Fixed deposits':t,m=>hOf(m.id,t)]);
  if(S.accts.some(a=>a.type==='card'&&a.bal!=null))rows.push(['Card dues',m=>dueOf(m.id)]);
  const tot=m=>rows.reduce((x,r)=>x+r[1](m),0),cols=ms.length>1;
  const cell=v=>`<td class="num ${v<0?'out':''}">${v?money(v):'<span class="faint">—</span>'}</td>`;
  return`<div class="ch"><div><h3>Total and by person</h3><div class="cs">Bank balances are the latest known; investments use their latest value.</div></div></div><div class="tbl"><table><thead><tr><th></th>${cols?ms.map(m=>`<th><span class="dot" style="--c:${m.color}"></span> ${esc(m.name)}</th>`).join(''):''}<th>Total</th></tr></thead><tbody>${rows.map(([l,f])=>`<tr><td>${esc(l)}</td>${cols?ms.map(m=>cell(f(m))).join(''):''}${cell(ms.reduce((x,m)=>x+f(m),0))}</tr>`).join('')}<tr class="tot"><td>Net worth</td>${cols?ms.map(m=>cell(tot(m))).join(''):''}${cell(ms.reduce((x,m)=>x+tot(m),0))}</tr></tbody></table></div>`}
/* A statement can be read with the wrong bank; rename it on accounts and on deposits/PPF read from statements. */
function renameBank(from,to,mem){to=canonBank(to);let n=0;const f=String(from||'').toLowerCase();if(!f||!to)return 0;const fix=(o,k)=>{if((o.bank||'').toLowerCase()!==f)return;o.bank=to;if(o[k].toLowerCase().startsWith(f))o[k]=to+o[k].slice(f.length);n++};
  for(const x of S.accts)if(!mem||x.member===mem)fix(x,'name');for(const h of S.hold)if(!mem||h.m===mem)fix(h,'name');return n}
function balDialog(a){const b=curBal(a);modal(`<h2>${esc(a.name)}</h2><p class="sub">${a.type==='card'?'Enter what you owe on this card right now.':'Enter the balance in this account right now.'} Later imports update it automatically.</p><div class="frm"><div class="fld"><label for="sbv">${a.type==='card'?'Amount owed':'Balance'}</label><input id="sbv" inputmode="decimal" value="${b==null?'':Math.abs(b)}"></div><div class="fld"><label for="sbd">As of</label><input id="sbd" type="date" value="${iso(new Date())}"></div><div class="fld"><label for="sbm">Owner</label>${sel('sbm',memberOpts(),a.member)}</div><div class="fld"><label for="sbb">Bank</label><input id="sbb" value="${esc(a.bank||'')}" placeholder="e.g. ICICI"></div><div class="fld full"><label class="chk"><input type="checkbox" id="sbc" ${a.closed?'checked':''}> This account is closed. Keep its history but leave it out of net worth.</label></div></div><div class="acts"><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="sbsave" data-id="${a.id}">Save</button></div>`)}
function doStmt(){const i=S.imp,st=i.stmt,mem=$('#imem').value;
  if(!mem)return toast('Choose who this statement belongs to');
  for(const [n,s] of st.sections.entries()){if(!i.pick[n])continue;const ex=findAcct(s.number,st.bank);if(ex&&ex.member&&ex.member!==mem)return toast(`Account ••${String(s.number).slice(-4)} is already recorded under ${memOf(ex.member).name}. Choose ${memOf(ex.member).name}, or change its owner on the Balance page first.`)}const src=uid(),ids=[];let added=0,dup=0,total=0,from='9999',to='0000';
  st.sections.forEach((s,n)=>{if(!i.pick[n])return;let a=findAcct(s.number,st.bank);
    if(!a){a={id:uid(),name:sLabel(st,s),type:'bank',member:mem,no:String(s.number||'').slice(-4)||undefined,bank:st.bank||undefined};S.accts.push(a)}ids.push(a.id);if(s.type==='PPF')a.sub='PPF';
    const ex=new Map();for(const t of S.tx){const k=t.acct+'|'+t.d+'|'+t.amt+'|'+t.desc.toLowerCase();ex.set(k,(ex.get(k)||0)+1)}const run=new Map();
    {const ld=s.rows.length?s.rows.reduce((m,r)=>r.d>m?r.d:m,''):'';if(s.closing!=null&&ld&&(!a.balAsOf||ld>=a.balAsOf)){a.bal=s.closing;a.balAsOf=ld}}
    for(const t of s.rows){total++;if(t.d<from)from=t.d;if(t.d>to)to=t.d;const k=a.id+'|'+t.d+'|'+t.amt+'|'+t.desc.toLowerCase(),q=(run.get(k)||0)+1;run.set(k,q);if(q<=(ex.get(k)||0)){dup++;continue}
      S.tx.push({id:uid(),d:t.d,desc:t.desc,amt:t.amt,acct:a.id,m:a.member||mem,cat:stmtCat(s,t),src});added++}});
  const hr=i.hold?reconcileHolds(st,mem,to!=='0000'?to:iso(new Date())):{n:0,removed:0,kept:0};const hn=hr.n;
  S.uploads.unshift({id:src,name:i.name,kind:'tx',at:Date.now(),hash:i.hash,acct:ids[0],accts:ids,added,dup,total,from:total?from:undefined,to:total?to:undefined,holds:hn||undefined});
  const xm=matchTransfers();save();toast(`Added ${added} transactions${dup?`, skipped ${dup} duplicates`:''}${hn?`, updated ${hn} investments`:''}${hr.removed?`, removed ${hr.removed} closed deposit${hr.removed>1?'s':''}`:''}${hr.kept?`, kept newer investment data`:''}${xm?`, matched ${xm} transfer${xm>1?'s':''}`:''}`);S.view=S.view==='bud'?'overview':S.view;nextImportOrRender()}
function doHold(){const i=S.imp,mem=$('#imem').value;let a=0,u=0;for(const h of i.holds){const e=S.hold.find(x=>x.name.toLowerCase()===h.name.toLowerCase()&&x.m===mem);if(e){e.invested=h.invested;e.value=h.value;u++}else{S.hold.push({id:uid(),m:mem,...h});a++}}
  S.uploads.unshift({id:uid(),name:i.name,kind:'hold',at:Date.now(),hash:i.hash,added:a,updated:u,total:i.holds.length});save();toast(`${a} added, ${u} updated`);S.view='inv';nextImportOrRender()}
function nextImportOrRender(){if(S.queue.length){render();nextImport()}else{closeModal();render()}}

/* forms */
function addTxDialog(){const d=(bounds()||{mx:iso(new Date())}).mx;const accs=S.accts;
  modal(`<h2>Add a transaction</h2><p class="sub">For cash spends or anything missing from your statements.</p><div class="frm">
  <div class="fld"><label for="ttype">Type</label>${sel('ttype',[['out','Money out'],['in','Money in']],'out')}</div><div class="fld"><label for="tdate">Date</label><input id="tdate" type="date" value="${iso(new Date())>d?iso(new Date()):d}"></div>
  <div class="fld full"><label for="tdesc">Description</label><input id="tdesc" placeholder="e.g. Swiggy dinner"></div>
  <div class="fld"><label for="tamt">Amount</label><input id="tamt" type="number" step="0.01" min="0" inputmode="decimal"></div><div class="fld"><label for="tcat">Category</label><select id="tcat"><option value="">Auto</option>${CATS.map(([n])=>`<option>${esc(n)}</option>`).join('')}</select></div>
  <div class="fld"><label for="tacct">Account</label><select id="tacct">${accs.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}<option value="cash">Cash (new account)</option></select></div></div>
  <div class="acts"><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="txsave">Save</button></div>`)}
function holdForm(h){h=h||{type:'Stocks',m:S.member!=='all'?S.member:S.members[0].id,name:'',invested:'',value:''};const lim=LIMITS[h.type];
  modal(`<h2>${h.id?'Edit':'Add'} investment</h2><p class="sub">Stocks, mutual funds, PPF, NPS, Sukanya, LIC, EPF, FDs, gold and anything else.</p><div class="frm">
  <div class="fld full"><label for="hname">Name</label><input id="hname" value="${esc(h.name)}" placeholder="e.g. PPF · SBI"></div>
  <div class="fld"><label for="htype">Type</label>${sel('htype',HT.map(x=>x[0]),h.type,'data-change="htype"')}</div><div class="fld"><label for="hm">Owner</label>${sel('hm',memberOpts(),h.m)}</div>
  <div class="fld"><label for="hinv">Amount invested</label><input id="hinv" type="number" min="0" inputmode="decimal" value="${h.invested}"></div><div class="fld"><label for="hval">Current value</label><input id="hval" type="number" min="0" inputmode="decimal" value="${h.value}"></div>
  <div class="fld"><label for="hfy">Deposited this financial year</label><input id="hfy" type="number" min="0" value="${h.fy??''}" placeholder="PPF, NPS, Sukanya"></div><div class="fld"><label for="hmat">Maturity date</label><input id="hmat" type="date" value="${h.maturity||''}"></div></div>
  <div class="acts">${h.id?`<button class="btn danger" data-act="holddel" data-id="${h.id}">Delete</button>`:''}<span class="grow"></span><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="holdsave" data-id="${h.id||''}">Save</button></div>`)}
function guideDlg(){modal(`<h2>Install &amp; hosting guide</h2><p class="sub">Portfolio is one page. It needs no database and no server code, so any web host works.</p>
<div class="sec"><h2>cPanel (shared hosting)</h2></div>
<ol class="steps"><li>On a computer, download the repository ZIP from GitHub, or run <code>deploy/make-zip.sh</code> to build <code>portfolio.zip</code>.</li>
<li>In cPanel open <b>File Manager</b>, go to <code>public_html</code>, and create a folder such as <code>finance</code>.</li>
<li>Open the folder, click <b>Upload</b>, add the ZIP, then right-click it and choose <b>Extract</b>.</li>
<li>Make sure <code>index.html</code>, <code>assets/</code> and <code>vendor/</code> sit directly in that folder. Turn on <b>Show Hidden Files</b> in File Manager settings to see <code>.htaccess</code>.</li>
<li>In cPanel open <b>SSL/TLS Status</b> and run AutoSSL for the domain. The passcode lock needs HTTPS.</li>
<li>Visit <code>yourdomain.com/finance/</code>.</li>
<li>Optional: use <b>Directory Privacy</b> to add a username and password to the folder.</li></ol>
<div class="sec"><h2>Updating</h2></div><p class="muted" style="margin:0">Download the new ZIP from the GitHub Releases page and extract it over the old files, or set up automatic FTPS deploys or the one-click <code>update.php</code> (see the README, Releases and updates). Your data is never touched. Settings, Check for updates tells you when the site has a new version.</p>
<div class="sec"><h2>Cloudflare Access (optional)</h2></div>
<p class="muted" style="margin:0">Put the site behind Zero Trust: <b>Zero Trust, Access, Applications, Add, Self-hosted</b>, enter the domain and path, then add a policy that allows only your email addresses. You can skip this and use a passcode instead. They work well together.</p>
<div class="sec"><h2>Other options</h2></div>
<p class="muted" style="margin:0">GitHub Pages, Netlify, Vercel, Cloudflare Pages, Docker with nginx, Caddy, or simply open <code>index.html</code> from your computer. Ready-made files are in the <code>deploy/</code> folder. A public GitHub Pages site is public to everyone, so use a passcode and import your own data only on a site you control.</p>
<div class="note" style="margin-top:12px"><b>Your data never leaves the browser.</b> It lives on the device you import it on. Use Settings, Backup to move it to another device.</div>
<div class="acts"><button class="btn primary" data-act="close">Done</button></div>`)}

/* updates page: talks to update.php on your own server (same origin), which fetches releases from GitHub */
const sget=k=>{try{return sessionStorage.getItem(k)||''}catch(e){return ''}},sput=(k,v)=>{try{sessionStorage.setItem(k,v)}catch(e){}};
function updView(){const u=S._u||{},tab=S._ut||'update',web=location.protocol.startsWith('http');
  const tabs=`<div class="segc" role="group" aria-label="Updates">${[['update','Update'],['log','Changelog']].map(([k,l])=>`<button class="${tab===k?'on':''}" data-act="updtab" data-v="${k}">${l}</button>`).join('')}</div>`;
  const status=u.busy?'Working…':u.err?`<span class="out">${esc(u.err)}</span>`:u.done?`<b class="in">Updated to v${esc(u.done)}.</b> Reload to start using it.`:u.latest?(u.newer?`Version <b>v${esc(u.latest)}</b> is available.`:`You have the newest version (v${esc(u.installed)}).`):'Press Check now to ask GitHub for the latest release.';
  const setup=u.nophp||!web?`<div class="scard" style="margin-top:14px"><div class="srow"><div class="st"><b>One-time setup on your site</b><span>${web?'This site has no updater yet: <code>update.php</code> is missing.':'Updates only work on a site served over http(s).'} <code>update.php</code> comes in the release ZIP, so extract the ZIP over your site (or upload that one file next to <code>index.html</code>) and press Check now again. Checking needs nothing else. Installing is confirmed with your Portfolio passcode.</span></div></div></div>`:'';
  const pill=u.done?'<span class="tg ok">Updated</span>':u.latest?(u.newer?'<span class="tg warn">Update available</span>':'<span class="tg ok">Up to date</span>'):'';
  const body=tab==='log'?`<div class="scard"><div class="srow"><div class="st"><b>Release notes</b><span style="white-space:pre-wrap;display:block;margin-top:6px">${u.notes?esc(u.notes):'Press Check now on the Update tab to load the latest release notes from GitHub.'}</span></div></div></div>`:
  `<div class="scard"><div class="srow"><div class="st"><b>Update from GitHub</b><span>${status}</span></div><div class="sc"><span class="faint" style="font-size:13px">Installed v${VERSION}</span>${pill}<button class="btn sm" data-act="updcheck" ${u.busy?'disabled':''}>Check now</button>${u.done?'<button class="btn sm primary" data-act="reload">Reload</button>':''}</div></div>
  ${u.newer&&!u.done?`<div class="srow"><div class="st"><b>Install v${esc(u.latest)}</b><span>${u.auth==='none'?'Installing is switched off: this server has no sync copy yet. Let Sync to your server run once, then come back.':'Installing asks for your Portfolio passcode, the same one that unlocks this app. Nothing else to set up.'}</span></div><div class="sc"><button class="btn sm primary" data-act="updinstall" ${u.busy||u.auth==='none'?'disabled':''}>Install</button></div></div>`:''}</div>${setup}
  <div class="note" style="margin-top:14px">Installing downloads the release from GitHub onto your server, checks its SHA-256, keeps a backup of the replaced files and never touches your data, which lives in this browser.</div>`;
  return`<div class="setp"><div style="margin-bottom:14px">${tabs}</div>${body}</div>`}
async function updCall(act){let tok='';
  if(act==='install'){const u=S._u||{};
    if(u.auth==='none'){S._u={...u,err:'Installing needs Sync to your server to be on first.'};return render()}
    const pw=await askSecret('Install update','Enter your Portfolio passcode to confirm.');closeModal();if(pw==null)return;
    try{tok=u.auth==='config'?pw:await syncToken(pw,u.asalt)}catch(e){S._u={...u,err:'Could not check the passcode.'};return render()}}
  S._u={...S._u,busy:true,err:''};render();
  try{const fd=new FormData();fd.append('api','1');if(tok)fd.append('token',tok);fd.append('do',act==='install'?'install':'check');
    const r=await fetch('update.php',{method:'POST',body:fd,cache:'no-store'});let j=null;try{j=await r.json()}catch(e){}
    if(r.status===404||(!j&&r.status!==200)){S._u={nophp:r.status===404,err:r.status===404?'':'The updater is not set up correctly on your server ('+r.status+').'};return render()}
    if(!j||j.error)S._u={...(act==='install'?S._u:{}),busy:false,err:(j&&j.error)||'Unexpected reply from the updater.'};
    else if(act==='install')S._u={...S._u,busy:false,done:j.version,err:''};
    else S._u={installed:j.installed,latest:j.latest,newer:j.newer,notes:j.notes,auth:j.auth,asalt:j.asalt};
  }catch(e){S._u={err:'Could not reach the updater.'}}
  render()}
function settingsView(){
  const row=(t,d,c,w)=>`<div class="srow${w?' wide':''}"><div class="st"><b>${t}</b>${d?`<span>${d}</span>`:''}</div><div class="sc">${c||''}</div></div>`;
  const sec=(t,rows,d)=>`<section class="ssec" id="s-${t.toLowerCase().replace(/[^a-z]+/g,'')}"><h3>${t}</h3>${d?`<p class="sdesc">${d}</p>`:''}<div class="scard">${rows}</div></section>`;
  const b=(l,act,cls='',id='')=>`<button class="btn sm ${cls}" data-act="${act}"${id?` id="${id}"`:''}>${l}</button>`;
  const mem=S.members.map(m=>`<div class="srow"><div class="st"><b style="display:flex;align-items:center;gap:8px"><span class="dot" style="--c:${m.color}"></span><input class="in-t plain" value="${esc(m.name)}" data-change="mname" data-id="${m.id}" aria-label="Member name"></b></div><div class="sc">${S.members.length>1?b('Remove','mdel','danger'):''}</div></div>`).join('');
  const nav=[['general','General'],['family','Family'],['security','Security'],['backup','Backup'],['data','Data tools'],['about','About'],['danger','Danger zone']];
  return`<div class="setl"><nav class="snav" aria-label="Settings sections">${nav.map(([i,l])=>`<button data-act="sgo" data-v="s-${i==='accounts'?'accountsandcards':i==='data'?'datatools':i==='danger'?'dangerzone':i}">${l}</button>`).join('')}</nav><div class="setp">
  ${sec('General',row('Currency','Used for every amount',sel('scur',['INR','USD','EUR','GBP','AED','SGD','CAD','AUD'],S.cur,'data-change="cur"')))}
  ${sec('Family',mem+`<div class="srow"><div class="st"><input class="in-t plain" id="newm" placeholder="Add a family member"></div><div class="sc">${b('Add','madd')}</div></div>`)}
  ${sec('Security',row('Passcode','Everything is encrypted on this device with AES-256-GCM, with a key made from your passcode (PBKDF2, 600,000 rounds). The passcode is never stored and cannot be recovered, so keep a backup.',b('Change','chglock')+b('Lock now','locknow'),1)+row('Auto-lock','Lock after being idle',sel('alk',[['1','1 min'],['5','5 min'],['15','15 min'],['30','30 min'],['0','Never']],String(autoLockMin),'data-change="autolock"')))}
  ${sec('Sync to your server',row('Encrypted copy on your own hosting','Your data is encrypted in this browser before it is sent, so the server only ever holds unreadable ciphertext. It is readable only here, after you enter your passcode. Needs sync.php next to index.html, which comes in the release ZIP.',`<span id="syncst">${syncStatus()}</span>`+(sy.on?b('Sync now','syncnow','primary')+b('Turn off','syncoff'):b('Connect','syncconnect','primary')),1)+(sy.on?row('Last synced',sy.last?new Date(sy.last).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})+' · revision '+sy.rev:'Not yet','',0):''),'Open the app on another device, create or restore with the same passcode, and the data follows you.')}
  ${sec('Backup',row('Download a backup',bk.last?`Last backup ${bkDays()===0?'today':bkDays()+' days ago'}`:'No backup made yet',b('Download','bkdl','primary')+b('Copy','bkcopy')+b('Restore…','bkshow'))+row('Browser storage',persisted===true?'Protected: your browser will not clear this data automatically.':persisted===false?'Not protected: a browser can clear site data when it needs space. Keep regular backups.':'Status unknown in this browser.',`<span class="tg ${persisted?'ok':'warn'}">${persisted?'Protected':'Backups advised'}</span>`)+row('Backup reminder','How often to nudge you',`<select class="csel" data-change="bkevery" aria-label="Reminder interval">${[[7,'Every week'],[30,'Every month'],[90,'Every 3 months'],[0,'Never']].map(([v,l])=>`<option value="${v}" ${bk.every===v?'selected':''}>${l}</option>`).join('')}</select>`)+'<div id="bkarea"></div>')}
  ${sec('Data tools',row('Fix a bank name','A statement can be read with the wrong bank (for example SBI instead of ICICI). Rename it on every account, deposit and PPF. Duplicates and old deposits are then tidied.',`<input class="in-t" id="bkfrom" placeholder="Wrong, e.g. SBI" style="width:130px" aria-label="Wrong bank name"><input class="in-t" id="bkto" placeholder="Right, e.g. ICICI" style="width:130px" aria-label="Right bank name">${b('Rename','bkfix')}`,1)+row('Transfers between your accounts',`Same amount out of one account and into another within 3 days is treated as a transfer, not spending. ${xfCount()?`${xfCount()} matched so far.`:'None matched yet.'}`,b('Find transfers','xfind')+(xfCount()?b('Remove links','xfundo'):'')))}
  ${sec('About',row('Version',`Portfolio v${VERSION}. Install new releases from the Updates page.`,b('Open Updates','updpage','primary')+' '+b('Check this page','chkupd'))+row('Install and hosting','cPanel, GitHub Pages and other hosts',b('Open guide','guide')))}
  ${sec('Danger zone',row('Delete one person\'s data','Removes the transactions, accounts, investments, vault items and import history of one family member, and leaves everyone else untouched. Use this to start one person over.',b('Delete a person\'s data…','memwipe','danger'),1)+row('Delete all my data','Removes everything from this browser. Download a backup first.',b('Delete everything','clear','danger','clr')))}</div></div>`}
function memCounts(id){const ac=S.accts.filter(a=>a.member===id).length;return{tx:S.tx.filter(t=>t.m===id).length,ac,hold:S.hold.filter(h=>h.m===id).length,vault:S.vault.filter(v=>v.m===id).length}}
function mwDialog(sel0,rm0){const id=sel0||S.members[0].id,c=memCounts(id),m=S.members.find(x=>x.id===id);
  modal(`<h2>Delete one person's data</h2><p class="sub">Removes only what belongs to the person you choose. Everyone else's data stays. Download a backup first if you are unsure. This cannot be undone.</p>
  <div class="frm"><div class="fld full"><label for="mwm">Person</label>${sel('mwm',S.members.map(x=>[x.id,x.name]),id,'data-change="mwsel"')}</div></div>
  <div class="card" style="margin:12px 0"><div class="muted" style="line-height:1.7"><b>${esc(m.name)}</b> has <b>${c.tx.toLocaleString('en-IN')}</b> transactions, <b>${c.ac}</b> accounts and cards, <b>${c.hold}</b> investments and <b>${c.vault}</b> vault items. Their import history is removed too, so the same files can be imported again.</div></div>
  <label class="chk"><input type="checkbox" id="mwr" ${rm0?'checked':''} ${S.members.length<2?'disabled':''}> Also remove ${esc(m.name)} from the family</label>
  <div class="acts"><button class="btn" data-act="close">Cancel</button><button class="btn" data-act="bkdl">Download backup first</button><button class="btn danger" data-act="mwgo">Delete ${esc(m.name)}'s data</button></div>`)}
function wipeMember(id,removePerson){const m=S.members.find(x=>x.id===id);if(!m)return;
  const accIds=new Set(S.accts.filter(a=>a.member===id).map(a=>a.id));
  for(const t of S.tx)if(t.m===id&&t.xf)unlinkXf(t);
  S.tx=S.tx.filter(t=>t.m!==id&&!accIds.has(t.acct));S.accts=S.accts.filter(a=>a.member!==id);S.hold=S.hold.filter(h=>h.m!==id);S.vault=S.vault.filter(v=>v.m!==id);
  S.uploads=S.uploads.filter(u=>!(u.acct&&accIds.has(u.acct))&&!(u.accts&&u.accts.length&&u.accts.every(x=>accIds.has(x))));
  if(removePerson&&S.members.length>1)S.members=S.members.filter(x=>x.id!==id);
  if(S.member===id||!S.members.some(x=>x.id===S.member))S.member='all';
  save();closeModal();settings();render();toast(`Deleted ${m.name}'s data`)}
function settings(){closeModal();S.view='settings';render();window.scrollTo(0,0)}

/* ---------- events ---------- */
const A={
 setbal(e){balDialog(S.accts.find(a=>a.id===e.dataset.id))},
 sbsave(e){const a=S.accts.find(x=>x.id===e.dataset.id),v=parseFloat(String($('#sbv').value).replace(/,/g,''));if(!isFinite(v))return toast('Enter an amount');a.bal=a.type==='card'?-Math.abs(v):v;a.balAsOf=$('#sbd').value||iso(new Date());a.closed=$('#sbc').checked||undefined;
  const nb=canonBank($('#sbb').value),nm=$('#sbm').value;if(nb&&nb!==(a.bank||'')){if(a.bank)renameBank(a.bank,nb,a.member);else{a.bank=nb}}
  if(nm&&nm!==a.member){for(const t of S.tx)if(t.acct===a.id)t.m=nm;a.member=nm}
  repairData();save();closeModal();render();toast('Saved')},
 bkfix(){const f=String($('#bkfrom').value||'').trim(),t=String($('#bkto').value||'').trim().toUpperCase();if(!f||!t)return toast('Type the wrong bank name and the right one');const n=renameBank(f,t,null);if(!n)return toast('No account or deposit uses "'+f+'"');repairData();save();render();toast(`Renamed ${n} item${n>1?'s':''} to ${t}`)},
 bksnooze(){bk.snooze=Date.now()+7*864e5;saveMeta();render()},
 xfind(){const n=matchTransfers();save();render();toast(n?`Matched ${n} transfer${n>1?'s':''}`:'No new transfers found');settings()},
 xfundo(){for(const t of S.tx.filter(t=>t.xf))unlinkXf(t);for(const t of S.tx)if(t.xn)delete t.xn;save();render();toast('Transfer links removed');settings()},
 txsplit(e){const t=S.tx.find(x=>x.id===e.dataset.id);if(!t)return;if(t.xf)return toast('Unlink this transfer first');const o=CATS.filter(([n])=>n!==t.cat);modal(`<h2>Split payment</h2><p class="sub">${esc(t.desc)} · ${money(Math.abs(t.amt),2)}. Move part of it to another category; the rest stays here.</p><div class="frm"><div class="fld"><label for="spa">Amount to move</label><input id="spa" type="number" min="0.01" step="0.01" inputmode="decimal"></div><div class="fld"><label for="spc">Category</label><select id="spc">${o.map(([n])=>`<option>${esc(n)}</option>`).join('')}</select></div></div><div class="acts"><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="spgo" data-id="${t.id}">Split</button></div>`)},
 spgo(e){const t=S.tx.find(x=>x.id===e.dataset.id),v=Math.round(parseFloat($('#spa').value)*100)/100,tot=Math.abs(t.amt);if(!isFinite(v)||v<=0||v>=tot)return toast('Enter an amount smaller than '+money(tot,2));const sg=t.amt<0?-1:1;t.amt=Math.round((tot-v)*100)/100*sg;S.tx.push({...t,id:uid(),amt:v*sg,cat:$('#spc').value,desc:t.desc+' (split)',xf:undefined,xn:undefined});save();closeModal();render();toast('Payment split')},
 updpage(){S.view='upd';render();window.scrollTo(0,0)},updcheck(){updCall('check')},updinstall(){updCall('install')},updtab(e){S._ut=e.dataset.v;render()},guide(){guideDlg()},chkupd(){checkUpdate(true)},reload(){location.reload()},updx(){$("#upd")?.remove()},
 anasub(e){S.ana=e.dataset.v;render()},streammode(e){S.stream=e.dataset.v;render()},calyear(e){S.calYear=e.dataset.v;render()},hmetric(e){S.hm=e.dataset.v;render()},yoytog(e){const f=e.dataset.v;(S._yoy||(S._yoy={}))[f]=!S._yoy[f];render()},
 view(e){S.view=e.dataset.v;if(S.view!=='tx'){}render();window.scrollTo(0,0)},
 member(e){S.member=e.dataset.v;render()},range(e){S.range=e.dataset.v;render()},
 cat(e){S.fcats=[e.dataset.v];S.fp=true;S.view='tx';render()},
 xrow(e){const r=e.closest('.txr');if(!r)return;const o=!r.classList.contains('open');document.querySelectorAll('.txr.open').forEach(x=>{x.classList.remove('open');x.firstElementChild.setAttribute('aria-expanded','false')});if(o){r.classList.add('open');e.setAttribute('aria-expanded','true')}S.xo=o?e.dataset.id:null},
 fpanel(e){S.fp=!S.fp;const p=$('#fpan');if(p)p.classList.toggle('open',S.fp);e.setAttribute('aria-expanded',String(S.fp))},
 fchip(e){const l=e.dataset.k==='c'?S.fcats:S.faccts,v=e.dataset.v,i=l.indexOf(v);i<0?l.push(v):l.splice(i,1);txRefresh()},
 ftype(e){S.ftype=e.dataset.v;txRefresh()},fclear(){S.fcats=[];S.faccts=[];S.ftype='all';S.q='';txRefresh()},sort(e){const k=e.dataset.v;S.sort=S.sort.k===k?{k,dir:-S.sort.dir}:{k,dir:-1};renderTxRows()},memwipe(){mwDialog()},mwgo(){const id=$('#mwm').value,rm=$('#mwr').checked;wipeMember(id,rm)},sgo(e){const s=document.getElementById(e.dataset.v);if(s)s.scrollIntoView({behavior:'smooth',block:'start'})},pgprev(){S.page--;renderTxRows();$('#txrows').scrollIntoView({block:'start'})},pgnext(){S.page++;renderTxRows();$('#txrows').scrollIntoView({block:'start'})},
 import(){$('#file').click()},add(){addTxDialog()},addhold(){holdForm()},settings(){settings()},close(){closeModal()},
 edithold(e){holdForm(S.hold.find(h=>h.id===e.dataset.id))},
 holdsave(e){const n=$('#hname').value.trim();if(!n)return toast('Give it a name');const o={name:n,type:$('#htype').value,m:$('#hm').value,invested:+$('#hinv').value||0,value:+$('#hval').value||+$('#hinv').value||0,fy:$('#hfy').value===''?undefined:+$('#hfy').value,maturity:$('#hmat').value||undefined};
  const id=e.dataset.id;if(id)Object.assign(S.hold.find(h=>h.id===id),o);else S.hold.push({id:uid(),...o});save();closeModal();render();toast('Saved')},
 holddel(e){S.hold=S.hold.filter(h=>h.id!==e.dataset.id);save();closeModal();render()},
 txsave(){const desc=$('#tdesc').value.trim(),amt=+$('#tamt').value;if(!desc||!amt)return toast('Add a description and an amount');let ac=$('#tacct').value;
  if(ac==='cash'||!S.accts.length){let c=S.accts.find(a=>a.name==='Cash');if(!c){c={id:uid(),name:'Cash',type:'bank',member:S.members[0].id};S.accts.push(c)}ac=c.id}
  const a=$('#ttype').value==='in'?amt:-amt;const cat=$('#tcat').value||categorize(desc,a);S.tx.push({id:uid(),d:$('#tdate').value,desc,amt:a,acct:ac,m:acctOf(ac).member,cat});save();closeModal();render();toast('Added')},
 stmtgo(){doStmt()},impcancel(){nextImportOrRender()},impgo(){doImport()},holdgo(){doHold()},
 pwok(){const v=$('#pw').value;window.__pw&&window.__pw(v)},pwcancel(){window.__pw&&window.__pw(null);closeModal()},
 updel(e){if(!e.dataset.sure){e.dataset.sure=1;e.textContent='Confirm';return}const id=e.dataset.id,n=S.tx.filter(t=>t.src===id).length;S.tx=S.tx.filter(t=>t.src!==id);fixXf();S.uploads=S.uploads.filter(u=>u.id!==id);save();render();toast(`Removed ${n} transactions`)},
 cmd(){openCmd()},fab(){openCmd('',['Actions'])},more(){openCmd('',['Go to'])},
 onbx(){try{localStorage.setItem('pocketbook.onb','1')}catch(e){}render()},
 mdel(e){const id=e.dataset.id;if(S.tx.some(t=>t.m===id)||S.hold.some(h=>h.m===id)||S.accts.some(a=>a.member===id))return toast('Reassign this member’s accounts and investments first');S.members=S.members.filter(m=>m.id!==id);if(S.member===id)S.member='all';save();settings();render()},
 madd(){const n=$('#newm').value.trim();if(!n)return;S.members.push({id:uid(),name:n,color:MCOL[S.members.length%MCOL.length]});save();settings();render()},
 cpy(e){const t=S.tx.find(x=>x.id===e.dataset.id);if(t)copyText([t.d,t.desc,t.amt.toFixed(2),t.cat,acctOf(t.acct).name,memOf(t.m).name].join('\t'),'Transaction copied')},
 copytsv(){const a=txFiltered();copyText('Date\tDescription\tCategory\tAccount\tMember\tAmount\n'+a.map(t=>[t.d,xcell(t.desc),xcell(t.cat),xcell(acctOf(t.acct).name),xcell(memOf(t.m).name),t.amt.toFixed(2)].join('\t')).join('\n'),`${a.length} rows copied. Paste into Excel or Sheets`)},
 copycsv(){const a=txFiltered(),q=v=>`"${xcell(v).replace(/"/g,'""')}"`;const csv='Date,Description,Category,Account,Member,Amount\n'+a.map(t=>[t.d,q(t.desc),q(t.cat),q(acctOf(t.acct).name),q(memOf(t.m).name),t.amt.toFixed(2)].join(',')).join('\n');
  (navigator.clipboard?navigator.clipboard.writeText(csv):Promise.reject()).then(()=>toast('CSV copied'),()=>toast('Copy was blocked by the browser'))},
 bkshow(){$('#bkarea').innerHTML='<div class="fld" style="margin-top:10px"><input type="file" id="bkfile" accept=".json" style="margin-bottom:8px"><textarea id="bktxt" rows="5" placeholder="Choose a backup file, or paste it here"></textarea></div><button class="btn sm primary" data-act="bkgo" style="margin-top:8px">Restore</button>'},
 async bkdl(){try{const j=JSON.stringify(await backupObj(),null,1);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([j],{type:'application/json'}));a.download='portfolio-backup-'+iso(new Date())+'.json';a.click();bkDone();toast(lockMeta?'Encrypted backup saved':'Backup file saved');if($('#bkbn'))render()}catch(e){toast('Download was blocked, use Copy backup')}},
 async bkcopy(){const j=JSON.stringify(await backupObj());bkDone();copyText(j,lockMeta?'Encrypted backup copied':'Backup copied')},
 async bkgo(){try{await restoreObj(JSON.parse($('#bktxt').value))}catch(e){toast('That backup could not be read')}},
 unlock(){doUnlock()},locknow(){lockNow()},chglock(){secForm('change')},synckeep(){syncResolve(false)},syncpull(){syncResolve(true)},syncconnect(){syncConnect()},syncnow(){syncNow(true)},syncoff(){sy.on=false;sy.never=true;sy.tok=null;sy.err='';saveMeta();render();toast('Sync turned off. The copy on your server stays there.')},gatego(){gateGo()},gatefetch(){gateRestore()},secgo(e){secGo(e.dataset.mode)},
 lockreset(e){if(!e.dataset.sure){e.dataset.sure=1;e.textContent='Click again to erase everything on this device';return}kvDel('state').then(()=>kvDel('state.bak')).then(()=>kvDel('state.prev')).then(()=>kvDel('state.day')).then(()=>kvDel('meta')).then(()=>{try{localStorage.removeItem(KEY)}catch(x){}location.reload()})},
 vadd(){if(!lockMeta){toast('Set a passcode first');return secForm('set')}vForm()},vedit(e){vForm(S.vault.find(v=>v.id===e.dataset.id))},
 vsave(e){const l=$('#vl').value.trim(),v=$('#vv').value.trim();if(!l||!v)return toast('Add a name and a number');if(!lockMeta){closeModal();toast('Set a passcode before saving private details');return secForm('set')}
  const o={kind:$('#vk').value,m:$('#vm').value,label:l,value:v,note:$('#vn').value.trim()};const id=e.dataset.id;if(id)Object.assign(S.vault.find(x=>x.id===id),o);else S.vault.push({id:uid(),...o});save();closeModal();render();toast('Saved to the Vault')},
 vdel(e){S.vault=S.vault.filter(v=>v.id!==e.dataset.id);save();closeModal();render()},
 vrev(e){const id=e.dataset.id;REV[id]=REV[id]>Date.now()?0:Date.now()+15000;const el=$('#v-'+id),v=S.vault.find(x=>x.id===id);if(el&&v)el.outerHTML=vItem(v);if(REV[id])setTimeout(()=>{const e2=$('#v-'+id);if(e2&&!(REV[id]>Date.now()))e2.outerHTML=vItem(v)},15200)},
 vcopy(e){const v=S.vault.find(x=>x.id===e.dataset.id);if(!v)return;copyText(v.value,'Copied. Clipboard clears in 30 seconds');setTimeout(()=>{try{navigator.clipboard.writeText(' ')}catch(x){}},30000)},
 async wipe(){S.tx=[];S.hold=[];S.uploads=[];S.vault=[];S.accts=[];S.rules={};S.member='all';S.members=[{id:'me',name:'Me',color:MCOL[0]}];sy.on=false;sy.tok=null;booted=true;await saveMeta();await flush();await kvDel('state.bak');await kvDel('state.prev');await kvDel('state.day');closeModal();render();toast('All data deleted')},
 clear(e){if(e.dataset.sure){A.wipe()}else{e.dataset.sure=1;e.textContent='Click again to delete everything'}}
};
document.addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(t&&A[t.dataset.act]){A[t.dataset.act](t,e)}else if(e.target.id==='modal'&&!$('[data-act=pwok]'))closeModal()});
const C={
 mwsel(){mwDialog($('#mwm').value,$('#mwr').checked)},
 stbank(el){const i=S.imp;if(!i||!i.stmt)return;const m=$('#imem');if(m)i.mem=m.value;i.stmt.bank=canonBank(el.value);i.stmt.bankSure=true;i.bankHint='';stmtDialog()},
 perpage(el){S.limit=+el.value;S.page=0;renderTxRows()},
 cat(el){const t=S.tx.find(x=>x.id===el.dataset.id);if(t.xf){const p=S.tx.find(x=>x!==t&&x.xf===t.xf);unlinkXf(t);t.xn=1;if(p)p.xn=1}t.cat=el.value;const k=mkey(t.desc);S.rules[k]=el.value;let n=0;for(const x of S.tx)if(x!==t&&mkey(x.desc)===k&&x.cat!==el.value){x.cat=el.value;n++}save();renderTxRows();toast(n?`Moved ${n+1} “${pretty(k)}” transactions to ${el.value}`:'Category updated')},
 cur(el){S.cur=el.value;for(const k in nfs)delete nfs[k];save();settings();render()},
 mname(el){const m=S.members.find(x=>x.id===el.dataset.id);m.name=el.value.trim()||m.name;save();render()},
 aname(el){const a=S.accts.find(x=>x.id===el.dataset.id);a.name=el.value.trim()||a.name;save();render()},
 atype(el){S.accts.find(x=>x.id===el.dataset.id).type=el.value;save();render()},
 amem(el){const a=S.accts.find(x=>x.id===el.dataset.id);a.member=el.value;S.tx.forEach(t=>{if(t.acct===a.id)t.m=el.value});save();render()},
 adue(el){const v=Math.round(+el.value);S.accts.find(x=>x.id===el.dataset.id).due=v>=1&&v<=31?v:undefined;save()},
 alim(el){S.accts.find(x=>x.id===el.dataset.id).limit=+el.value||undefined;save()},
 pwmeter(el){const n=strength(el.value),m=$(el.id==='gpw1'?'#gpm':'#pwm');m.style.width=(n*25)+'%';m.style.background=n>=3?'var(--in)':n===2?'var(--warn)':'var(--out)'},
 bkevery(el){bk.every=+el.value;saveMeta();toast(bk.every?`Backup reminder every ${bk.every} days`:'Backup reminders are off')},
 autolock(el){autoLockMin=+el.value;saveMeta();toast(autoLockMin?`Auto-lock after ${autoLockMin} min`:'Auto-lock is off')},
 htype(el){const f=$('#hfy');if(!f.value&&LIMITS[el.value])f.placeholder='Up to '+money(LIMITS[el.value])},
 stpick(el){S.imp.pick[+el.dataset.n]=el.checked},sthold(el){S.imp.hold=el.checked},
 iacct(el){S.imp.acct=el.value;if(el.value==='new'&&!S.imp.nm)S.imp.nm='';readImp();txDialog()},
 impmap(){readImp();txDialog()}
};
function readImp(){const i=S.imp;if(!i||i.kind!=='tx')return;const g=id=>$('#'+id)?+$('#'+id).value:null;const v=(id,k)=>{const x=g(id);if(x!==null)i.map[k]=x};
  v('mdate','date');v('mdesc','desc');v('mamt','amt');v('mdeb','debit');v('mcre','credit');if($('#iorder'))i.order=$('#iorder').value;if($('#iflip'))i.flip=$('#iflip').checked;
  if($('#inm'))i.nm=$('#inm').value;if($('#ity'))i.acctType=$('#ity').value;if($('#imem'))i.mem=$('#imem').value;if($('#iacct'))i.acct=$('#iacct').value}
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.change&&C[t.dataset.change]){C[t.dataset.change](t)}
  else if(t.id==='fysel'){if(t.value){S.xo=null;S.range=t.value;render()}}
  else if(t.id==='bkfile'){t.files[0]&&t.files[0].text().then(x=>{$('#bktxt').value=x})}
  else if(t.id==='file'){const f=[...t.files];t.value='';takeFiles(f)}});
document.addEventListener('input',e=>{if(e.target.id==='q'){S.q=e.target.value;S.page=0;renderTxRows()}else if(e.target.dataset&&/^pwmeter/.test(e.target.dataset.change))C.pwmeter(e.target)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').hidden&&!$('[data-act=pwok]'))closeModal();if(e.key==='Enter'&&e.target.id==='pw')A.pwok();if(e.key==='Enter'&&e.target.id==='lockpw')doUnlock();if(e.key==='Enter'&&(e.target.id==='gpw1'||e.target.id==='gpw2'))gateGo()});
/* tooltips + chart highlight */
const tip=$('#tip');
function tipMove(e){const t=e.target.closest&&e.target.closest('[data-tip]');if(!t){tip.style.opacity=0;return}tip.innerHTML=t.getAttribute('data-tip');tip.style.opacity=1;
  const w=tip.offsetWidth,h=tip.offsetHeight;let x=e.clientX+14,y=e.clientY+14;if(x+w>innerWidth-8)x=e.clientX-w-14;if(y+h>innerHeight-8)y=e.clientY-h-14;tip.style.left=Math.max(8,x)+'px';tip.style.top=Math.max(8,y)+'px'}
document.addEventListener('pointermove',e=>{const h=e.target.closest&&e.target.closest('.hit');document.querySelectorAll('.guide').forEach(g=>g.style.opacity=0);if(h){const g=h.closest('svg').querySelector('.guide');if(g){g.setAttribute('x1',h.dataset.x);g.setAttribute('x2',h.dataset.x);g.style.opacity=.8}}});document.addEventListener('pointermove',tipMove);document.addEventListener('pointerdown',tipMove);document.addEventListener('pointerleave',()=>tip.style.opacity=0);
document.addEventListener('pointerover',e=>{const s=e.target.closest&&e.target.closest('[data-seg]');const d=$('[data-donut]');if(!d||!d._d)return;
  d.querySelectorAll('.seg').forEach(c=>c.style.opacity=s&&c.dataset.seg!==s.dataset.seg?.25:1);document.querySelectorAll('.lrow[data-seg]').forEach(r=>r.classList.toggle('hi',!!s&&r.dataset.seg===s.dataset.seg));
  const c=d.querySelector('.ctr');if(c){const it=s&&d._d.items.find(x=>x[0]===s.dataset.seg);c.innerHTML=it?`<small>${esc(it[0])}</small><b class="num">${compact(it[1])}</b>`:`<small>${esc(d._d.center[0])}</small><b class="num">${esc(d._d.center[1])}</b>`}});
/* drag and drop */
let dc=0;const dz=$('#drop');
addEventListener('dragenter',e=>{if(e.dataTransfer&&[...e.dataTransfer.types].includes('Files')){dc++;dz.hidden=false}});
addEventListener('dragleave',()=>{dc=Math.max(0,dc-1);if(!dc)dz.hidden=true});addEventListener('dragover',e=>e.preventDefault());
addEventListener('drop',e=>{e.preventDefault();dc=0;dz.hidden=true;if(e.dataTransfer.files.length)takeFiles([...e.dataTransfer.files])});
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{CH.forEach(([id,fn])=>{const el=document.getElementById(id);if(el&&el._W!==el.clientWidth){el._W=el.clientWidth;fn(el)}});const e=$('#cash');if(e&&e._B&&e._W!==e.clientWidth){e._W=e.clientWidth;cashChart(e,e._B)}moveInd()},120)});
/* spotlight cards */
document.addEventListener('pointermove',e=>{const c=e.target.closest&&e.target.closest('.card');if(c){const r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px')}});
/* command palette events */
$('#cmdq').addEventListener('input',()=>{cmdSel=0;drawCmd()});
$('#cmdq').addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();cmdSel=Math.min(cmdList.length-1,cmdSel+1);drawCmd()}else if(e.key==='ArrowUp'){e.preventDefault();cmdSel=Math.max(0,cmdSel-1);drawCmd()}else if(e.key==='Enter'){e.preventDefault();runCmd(cmdSel)}else if(e.key==='Escape')closeCmd()});
$('#cmdl').addEventListener('click',e=>{const b=e.target.closest('.ci');if(b)runCmd(+b.dataset.i)});
$('#cmd').addEventListener('click',e=>{if(e.target.id==='cmd')closeCmd()});
document.addEventListener('pointermove',e=>{const c=e.target.closest&&e.target.closest('.card');if(c){const r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px')}},{passive:true});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.dataset&&e.target.dataset.act==='xrow'){e.preventDefault();A.xrow(e.target)}});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#cmd').hidden?openCmd():closeCmd()}
  else if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||'')&&$('#cmd').hidden&&$('#modal').hidden){e.preventDefault();openCmd()}});
try{if(/Mac|iPhone|iPad/.test(navigator.platform))$('.search kbd').textContent='⌘K'}catch(e){}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(moveInd);


/* theme */
const TK='pocketbook.theme';let themeMode='system';try{themeMode=localStorage.getItem(TK)||'system'}catch(e){}
function paintTheme(){const r=document.documentElement;themeMode==='system'?r.removeAttribute('data-theme'):r.setAttribute('data-theme',themeMode);const tb=$('#themebtn');if(tb){const d=effTheme()==='dark';tb.classList.toggle('dark',d);tb.setAttribute('aria-label',d?'Switch to light theme':'Switch to dark theme')}}
function effTheme(){return themeMode==='system'?(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):themeMode}
function setTheme(mode,btn){if(mode===themeMode)return;const go=()=>{themeMode=mode;try{localStorage.setItem(TK,mode)}catch(e){}paintTheme()};
  if(document.startViewTransition&&!matchMedia('(prefers-reduced-motion:reduce)').matches){const b=btn.getBoundingClientRect(),st=document.documentElement.style;st.setProperty('--tx',(b.left+b.width/2)+'px');st.setProperty('--ty',(b.top+b.height/2)+'px');document.startViewTransition(go)}else go()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-theme-toggle]');if(b)setTheme(effTheme()==='dark'?'light':'dark',b)});
paintTheme();
/* Same-origin update check: version.json is replaced when a new release is deployed. No third-party requests. */
async function checkUpdate(manual){
  try{const r=await fetch('version.json?'+Date.now(),{cache:'no-store'});if(!r.ok)throw 0;const v=String((await r.json()).version||'');
    if(v&&v!==VERSION){showUpdate(v);if(manual)toast('Version '+v+' is ready')}else if(manual)toast('You are on the latest version (v'+VERSION+')')}
  catch(e){if(manual)toast('Could not check. Updates apply to sites served over http(s).')}}
function showUpdate(v){if($('#upd'))return;const d=document.createElement('div');d.id='upd';d.setAttribute('role','status');d.innerHTML=`<span>Portfolio <b>v${esc(v)}</b> is available.</span><button class="btn sm primary" data-act="reload">Reload</button><button class="btn sm" data-act="updx" aria-label="Dismiss">Later</button>`;document.body.appendChild(d)}
if(location.protocol.startsWith('http')){setTimeout(()=>checkUpdate(false),4000);if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{})}
boot();
})();
