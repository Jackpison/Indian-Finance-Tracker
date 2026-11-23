// Copies the web app into desktop/app/ (what the window serves) and syncs this package's version with version.json.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = path.join(__dirname, 'app');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
for (const f of ['index.html', 'manifest.webmanifest', 'version.json']) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const d of ['css', 'js', 'assets', 'vendor']) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
const v = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8')).version, pj = path.join(__dirname, 'package.json'), p = JSON.parse(fs.readFileSync(pj, 'utf8'));
if (p.version !== v) { p.version = v; fs.writeFileSync(pj, JSON.stringify(p, null, 2) + '\n'); }
console.log('Prepared desktop/app for v' + v);
