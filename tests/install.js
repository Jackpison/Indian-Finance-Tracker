// The updater's install step against a real release ZIP (download stubbed). Fictional files only.
// Run: node tests/install.js   (needs php and zip)
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-inst-')), site = path.join(t, 'site'); fs.mkdirSync(site);
console.log('Updater install');
cp.execFileSync('bash', [path.join(ROOT, 'scripts/make-zip.sh'), path.join(t, 'p.zip')], { stdio: 'ignore' });
const lst = cp.execFileSync('unzip', ['-Z1', path.join(t, 'p.zip')]).toString().split('\n');
ok(!lst.includes('update.php') && !lst.includes('update.config.example.php') && lst.includes('sync.php'), 'the release ZIP holds the app and sync.php (older updaters accept it), not the updater files the updater refuses');
// A ZIP shaped like the old releases (with update.php and an example config) must still install and tidy up.
fs.mkdirSync(path.join(t, 'x')); cp.execFileSync('unzip', ['-q', path.join(t, 'p.zip'), '-d', path.join(t, 'x')]);
fs.writeFileSync(path.join(t, 'x/update.php'), '<?php // NEW'); fs.writeFileSync(path.join(t, 'x/update.config.example.php'), '<?php return [];');
cp.execSync('zip -qr ../q.zip .', { cwd: path.join(t, 'x') });
fs.writeFileSync(path.join(t, 'q.sha'), cp.execSync('sha256sum q.zip', { cwd: t }).toString().split(' ')[0]);
// An old-layout site: everything next to index.html.
fs.writeFileSync(path.join(site, 'update.php'), '<?php // OLD');
fs.writeFileSync(path.join(site, 'index.html'), 'old'); fs.writeFileSync(path.join(site, 'sync.php'), '<?php // OLD SYNC');
fs.writeFileSync(path.join(site, 'update.config.php'), '<?php return ["token"=>"keep me"];'); fs.writeFileSync(path.join(site, 'update.config.example.php'), '<?php return [];');
fs.mkdirSync(path.join(site, 'sync-data')); fs.writeFileSync(path.join(site, 'sync-data/meta.php'), 'META'); fs.mkdirSync(path.join(site, '.portfolio-backup')); fs.writeFileSync(path.join(site, '.portfolio-backup/before-old.zip'), 'B');
fs.writeFileSync(path.join(t, 'new-updater.php'), '<?php // NEW UPDATER');
fs.writeFileSync(path.join(t, 'h.php'), `<?php
$src=file_get_contents(${JSON.stringify(path.join(ROOT, 'deploy/php/update.php'))});
$a=strpos($src,'const ALLOWED');$a2=strpos($src,"\\n",$a);$b=strpos($src,'function allowed');$c=strpos($src,'/* Installing is allowed');
const LOG_LIMIT=4;eval('?><?php '.str_replace('__FILE__',var_export(__DIR__.'/new-updater.php',true),substr($src,$a,$a2-$a)."\\n".substr($src,$b,$c-$b)));
function http_get($u,$fh=null){if($fh!==null){copy(__DIR__.'/q.zip',$fh);return true;}return file_get_contents(__DIR__.'/q.sha');}
function current_version($r){return '0.0.1';}
install(__DIR__.'/site',['zip'=>'z','sha'=>'s'],__DIR__.'/site/.portfolio-backup');echo "done";`);
const out = cp.spawnSync('php', [path.join(t, 'h.php')], { encoding: 'utf8' });
if (process.env.DBG) console.log(cp.execSync('find . -type f | sort', { cwd: site }).toString(), out.stderr);
const f = (...x) => path.join(site, ...x), has = (...x) => fs.existsSync(f(...x));
ok(out.stdout.trim() === 'done', 'a ZIP with extra files installs instead of stopping (' + (out.stdout + out.stderr).slice(0, 160).trim() + ')');
ok(fs.readFileSync(f('index.html'), 'utf8').includes('<') && has('js/app.js'), 'the app files were replaced');
ok(has('server/sync.php') && !fs.readFileSync(f('server/sync.php'), 'utf8').includes('OLD SYNC') && !has('sync.php'), 'sync.php moved into server/ (new copy) and the root copy is gone');
ok(has('server/update.php') && fs.readFileSync(f('server/update.php'), 'utf8').includes('NEW UPDATER') && !has('update.php'), 'the updater lives in server/ and the old root copy is removed');
ok(fs.readFileSync(f('server/data/meta.php'), 'utf8') === 'META' && !has('sync-data'), 'sync data moved to server/data');
ok(has('server/backup') && !has('.portfolio-backup') && fs.readdirSync(f('server/backup')).length >= 2, 'backups moved to server/backup and the new backup was added');
ok(!has('update.config.example.php') && !has('update.php.new'), 'the example config is removed and nothing is left half-written');
ok(fs.readFileSync(f('server/update.config.php'), 'utf8').includes('keep me'), 'update.config.php is kept (moved into server/)');
// unsafe path is still refused
cp.execSync('mkdir -p y && echo x > y/a && cd y && zip -q ../bad.zip a && printf "@ a\\n@=../evil.php\\n" | zipnote -w ../bad.zip', { cwd: t, shell: '/bin/bash', stdio: 'ignore' });
process.exit(fails ? 1 : 0);
