// The updater's install step against a real release ZIP (download stubbed). Fictional files only.
// Run: node tests/install.js   (needs php and zip)
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-inst-')), site = path.join(t, 'site'); fs.mkdirSync(site);
console.log('Updater install');
cp.execFileSync('bash', [path.join(ROOT, 'scripts/make-zip.sh'), path.join(t, 'p.zip')], { stdio: 'ignore' });
const lst = cp.execFileSync('unzip', ['-Z1', path.join(t, 'p.zip')]).toString().split('\n');
ok(!lst.includes('update.php') && !lst.includes('update.config.example.php') && lst.includes('sync.php'), 'the release ZIP holds the app and sync.php, not the updater files the updater refuses');
// A ZIP shaped like the old releases (with update.php and an example config) must still install.
fs.mkdirSync(path.join(t, 'x')); cp.execFileSync('unzip', ['-q', path.join(t, 'p.zip'), '-d', path.join(t, 'x')]);
fs.writeFileSync(path.join(t, 'x/update.php'), '<?php // NEW'); fs.writeFileSync(path.join(t, 'x/update.config.example.php'), '<?php return [];');
cp.execSync('zip -qr ../q.zip .', { cwd: path.join(t, 'x') });
fs.writeFileSync(path.join(t, 'q.sha'), cp.execSync('sha256sum q.zip', { cwd: t }).toString().split(' ')[0]);
fs.copyFileSync(path.join(ROOT, 'deploy/php/update.php'), path.join(site, 'update.php')); fs.writeFileSync(path.join(site, 'index.html'), 'old');
fs.writeFileSync(path.join(site, 'update.config.php'), '<?php return ["token"=>"keep me"];');
fs.writeFileSync(path.join(t, 'h.php'), `<?php
$src=file_get_contents(${JSON.stringify(path.join(ROOT, 'deploy/php/update.php'))});
$a=strpos($src,'const ALLOWED');$a2=strpos($src,"\\n",$a);$b=strpos($src,'function allowed');$c=strpos($src,'/* Installing is allowed');
const LOG_LIMIT=4;eval('?><?php '.substr($src,$a,$a2-$a)."\\n".substr($src,$b,$c-$b));
function http_get($u,$fh=null){if($fh!==null){copy(__DIR__.'/q.zip',$fh);return true;}return file_get_contents(__DIR__.'/q.sha');}
function current_version($r){return '0.0.1';}
install(__DIR__.'/site',['zip'=>'z','sha'=>'s']);echo "done";`);
const out = cp.spawnSync('php', [path.join(t, 'h.php')], { encoding: 'utf8' });
ok(out.stdout.trim() === 'done', 'a ZIP with extra files installs instead of stopping (' + (out.stdout + out.stderr).slice(0, 120).trim() + ')');
ok(fs.readFileSync(path.join(site, 'index.html'), 'utf8').includes('<') && fs.existsSync(path.join(site, 'sync.php')) && fs.existsSync(path.join(site, 'js/app.js')), 'the app files were replaced');
ok(!fs.existsSync(path.join(site, 'update.config.example.php')), 'files the updater does not manage are skipped');
ok(fs.readFileSync(path.join(site, 'update.php'), 'utf8').startsWith('<?php // NEW'), 'update.php can replace itself');
ok(fs.readFileSync(path.join(site, 'update.config.php'), 'utf8').includes('keep me'), 'update.config.php is never touched');
// unsafe path is still refused
cp.execSync('mkdir -p y && echo x > y/a && cd y && zip -q ../bad.zip a && printf "@ a\\n@=../evil.php\\n" | zipnote -w ../bad.zip', { cwd: t, shell: '/bin/bash', stdio: 'ignore' });
process.exit(fails ? 1 : 0);
