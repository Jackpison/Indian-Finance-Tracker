/* Update check: served over http, version.json reports a newer release. */
const http=require('http'),fs=require('fs'),path=require('path');
const {launch,ROOT,ok,done}=require('./lib');
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ttf':'font/ttf'};
(async()=>{
  const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
    const f=path.join(ROOT,u);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}
    r.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+srv.address().port;
  const h=await launch({serviceWorkers:'block'}),p=h.page; // the offline shell's service worker would bypass page.route
  const local=JSON.parse(fs.readFileSync(path.join(ROOT,'version.json'))).version;let remote=local;
  await p.route('**/version.json*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({version:remote})}));
  console.log('Update check');
  await p.goto(base+'/');await p.waitForTimeout(800);
  ok(local===remote,'version.json matches the running version ('+local+')');
  remote='9.9.9';
  await p.click('[data-act=settings]');await p.waitForSelector('.setp');
  ok(/v\d+\.\d+\.\d+/.test(await p.textContent('.setp')),'settings shows the app version');
  await p.click('[data-act=chkupd]');await p.waitForSelector('#upd',{timeout:5000});
  ok(/9\.9\.9/.test(await p.textContent('#upd')),'banner offers the newer version');
  await p.click('[data-act=updx]');ok(!(await p.$('#upd')),'banner can be dismissed');
  let installBody='',auth='passcode';
  await p.route('**/update.php',route=>{const b=route.request().postData()||'',inst=/do"\r\n\r\ninstall/.test(b);
    if(inst){installBody=b;const m=/name="token"\r\n\r\n([^\r]*)/.exec(b);if(!m||!/^[0-9a-f]{64}$/.test(m[1]))return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:'Wrong passcode.'})});return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,version:'9.9.9'})})}
    return route.fulfill({contentType:'application/json',body:JSON.stringify({installed:local,latest:'9.9.9',newer:true,notes:'- Test note',auth,asalt:'dGVzdHNhbHR0ZXN0c2FsdA'})})});
  await p.click('[data-act=updpage]');await p.waitForSelector('[data-act=updcheck]');
  ok(!(await p.$('[data-act=updinstall]')),'no install button before a new version is found');
  await p.click('[data-act=updcheck]');await p.waitForSelector('[data-act=updinstall]');
  ok(/9\.9\.9/.test(await p.textContent('.setp'))&&/Portfolio passcode/.test(await p.textContent('.setp')),'Check now finds the release and says installing uses the passcode');
  ok(!(await p.$('#utok')),'there is no separate update password field');
  await p.click('[data-act=updinstall]');await p.waitForSelector('#pw');await p.fill('#pw',require('./lib').PASS);await p.click('[data-act=pwok]');
  await p.waitForSelector('text=Updated to v9.9.9',{timeout:30000});ok(/name="token"/.test(installBody),'install sends a passcode-derived token and reports success');
  ok(!installBody.includes(require('./lib').PASS),'the passcode itself is never sent');
  await p.click('[data-act=updtab][data-v=log]');ok(/Test note/.test(await p.textContent('.setp')),'release notes shown');
  srv.close();h.errors=h.errors.filter(e=>!/Service Worker registration blocked|status of 403/.test(e));await done(h);
})().catch(e=>{console.error(e);process.exit(1)});
