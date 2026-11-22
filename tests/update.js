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
  const h=await launch(),p=h.page;
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
  srv.close();await done(h);
})().catch(e=>{console.error(e);process.exit(1)});
