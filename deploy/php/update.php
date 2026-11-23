<?php
/**
 * Portfolio self-updater for PHP hosting (cPanel). OPTIONAL.
 *
 * Installs the newest GitHub release over the files in this folder.
 *
 * Setup (once):
 *   1. It ships in the release ZIP next to index.html. That alone lets the in-app Updates page check for new versions.
 *   2. To install from the app, copy update.config.example.php to update.config.php and set a long random password.
 *   3. Open the app, Updates, Check now, then enter the password and Install.
 *
 * Safety:
 *   - Does nothing without the token (compared in constant time), POST only, HTTPS only.
 *   - Only upgrades; never downgrades.
 *   - Verifies the ZIP against the SHA-256 file published with the release.
 *   - Only extracts known app files; never touches update.php, update.config.php or an existing .htaccess.
 *   - Keeps a backup of the replaced files in .portfolio-backup/ (blocked from the web).
 * Delete this file when you are not using it. Your data lives in browsers and is never touched.
 */
declare(strict_types=1);

const ALLOWED = ['update.php', 'index.html', 'robots.txt', 'sync.php', 'version.json', 'sw.js', 'manifest.webmanifest', 'css/', 'js/', 'assets/', 'vendor/', '.htaccess'];
const LOG_LIMIT = 4;
const DEFAULT_REPO = 'Jackpison/Indian-Finance-Tracker'; // used for checking when no update.config.php exists

header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'");

$root = __DIR__;
$cfgFile = $root . '/update.config.php';
$cfg = is_file($cfgFile) ? (require $cfgFile) : null;

function out(string $body, int $code = 200): never {
    http_response_code($code);
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Portfolio updater</title>'
       . '<style>body{font:15px/1.5 system-ui;max-width:560px;margin:8vh auto;padding:0 16px;color:#111}input,button{font:inherit;padding:8px 12px}code{background:#eee;padding:1px 5px;border-radius:4px}pre{background:#f4f4f4;padding:12px;border-radius:8px;white-space:pre-wrap}</style>'
       . '<h1>Portfolio updater</h1>' . $body;
    exit;
}
function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

// Checking for a new version only reads public release info, so it works with no config. Installing needs the password.
$configured = is_array($cfg) && !empty($cfg['token']) && strlen((string)$cfg['token']) >= 24 && !empty($cfg['repo']);
if (!$configured) $cfg = ['token' => '', 'repo' => (is_array($cfg) && !empty($cfg['repo'])) ? (string)$cfg['repo'] : DEFAULT_REPO];
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
if (!$https) out('<p>Use HTTPS.</p>', 400);
if (!preg_match('~^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$~', (string)$cfg['repo'])) out('<p>Invalid repo in config.</p>', 500);

function current_version(string $root): string {
    $j = json_decode((string)@file_get_contents($root . '/version.json'), true);
    return is_array($j) && isset($j['version']) ? (string)$j['version'] : '0.0.0';
}
function http_get(string $url, ?string $saveTo = null): string|bool {
    $ch = curl_init($url);
    $fh = $saveTo ? fopen($saveTo, 'wb') : null;
    curl_setopt_array($ch, [
        CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 5, CURLOPT_TIMEOUT => 60,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_USERAGENT => 'portfolio-updater', CURLOPT_HTTPHEADER => ['Accept: application/vnd.github+json'],
        CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
    ] + ($fh ? [CURLOPT_FILE => $fh] : [CURLOPT_RETURNTRANSFER => true]));
    $res = curl_exec($ch);
    $ok = $res !== false && curl_getinfo($ch, CURLINFO_RESPONSE_CODE) === 200;
    curl_close($ch);
    if ($fh) { fclose($fh); return $ok; }
    return $ok ? (string)$res : false;
}
function latest(array $cfg): array {
    $json = http_get('https://api.github.com/repos/' . $cfg['repo'] . '/releases/latest');
    $rel = $json ? json_decode((string)$json, true) : null;
    if (!is_array($rel) || empty($rel['tag_name'])) throw new RuntimeException('Could not read the latest release from GitHub.');
    $ver = ltrim((string)$rel['tag_name'], 'v');
    if (!preg_match('~^\d+\.\d+\.\d+$~', $ver)) throw new RuntimeException('Unexpected release tag.');
    $zip = $sha = null;
    foreach (($rel['assets'] ?? []) as $a) {
        if ($a['name'] === "portfolio-v$ver.zip") $zip = $a['browser_download_url'];
        if ($a['name'] === "portfolio-v$ver.zip.sha256") $sha = $a['browser_download_url'];
    }
    if (!$zip || !$sha) throw new RuntimeException('The release has no ZIP and checksum attached.');
    return ['version' => $ver, 'zip' => $zip, 'sha' => $sha, 'notes' => (string)($rel['body'] ?? '')];
}
function allowed(string $name): bool {
    if ($name === '' || $name[0] === '/' || str_contains($name, '..') || str_contains($name, "\0") || str_contains($name, '\\')) return false;
    foreach (ALLOWED as $a) if ($name === $a || (str_ends_with($a, '/') && str_starts_with($name, $a))) return true;
    return false;
}
function install(string $root, array $rel): void {
    $tmp = tempnam(sys_get_temp_dir(), 'pf');
    if (!http_get($rel['zip'], $tmp)) throw new RuntimeException('Download failed.');
    $want = strtolower(substr(trim((string)http_get($rel['sha'])), 0, 64));
    if (!preg_match('~^[a-f0-9]{64}$~', $want) || !hash_equals($want, hash_file('sha256', $tmp))) { @unlink($tmp); throw new RuntimeException('Checksum mismatch. Nothing was changed.'); }
    $z = new ZipArchive();
    if ($z->open($tmp) !== true) throw new RuntimeException('Could not open the ZIP.');
    $names = [];
    for ($i = 0; $i < $z->numFiles; $i++) {
        $n = $z->getNameIndex($i);
        if ($n === '' || $n[0] === '/' || str_contains($n, '..') || str_contains($n, "\0") || str_contains($n, '\\')) throw new RuntimeException('Unsafe path in release: ' . $n);
        if (!allowed($n)) continue; // anything this updater does not manage (for example update.config.example.php) is skipped, never a reason to stop
        $names[] = $n;
    }
    // backup
    $bk = $root . '/.portfolio-backup';
    if (!is_dir($bk)) { mkdir($bk, 0750); file_put_contents($bk . '/.htaccess', "Require all denied\nDeny from all\n"); }
    $b = new ZipArchive();
    $b->open($bk . '/before-' . current_version($root) . '-' . date('Ymd-His') . '.zip', ZipArchive::CREATE);
    foreach ($names as $n) { if (substr($n, -1) !== '/' && is_file("$root/$n")) $b->addFile("$root/$n", $n); }
    $b->close();
    $old = glob($bk . '/before-*.zip') ?: []; sort($old);
    foreach (array_slice($old, 0, max(0, count($old) - LOG_LIMIT)) as $f) @unlink($f);
    // extract (keep an existing .htaccess: it may hold your own settings)
    usort($names, fn($a, $b) => ($a === 'update.php') <=> ($b === 'update.php')); // this file replaces itself last
    foreach ($names as $n) {
        if ($n === '.htaccess' && is_file("$root/.htaccess")) continue;
        $dest = "$root/$n";
        if (substr($n, -1) === '/') { if (!is_dir($dest)) mkdir($dest, 0755, true); continue; }
        if (!is_dir(dirname($dest))) mkdir(dirname($dest), 0755, true);
        $s = $z->getStream($n);
        if (!$s) throw new RuntimeException('Could not read ' . $n);
        $t = $dest . '.new';
        file_put_contents($t, $s); fclose($s);
        rename($t, $dest);
    }
    $z->close(); @unlink($tmp);
    if (function_exists('opcache_reset')) @opcache_reset();
}

/* Installing is allowed with the app passcode: the browser derives a token from it (the same one sync.php checks) and this
   file compares its SHA-256 with the one stored by sync.php. update.config.php, if present, is still accepted as before. */
function sync_meta(string $root): ?array {
    $raw = @file_get_contents($root . '/sync-data/meta.php'); if ($raw === false) return null;
    $n = strpos($raw, "\n"); $j = $n === false ? null : json_decode(substr($raw, $n + 1), true);
    return is_array($j) && !empty($j['hash']) && !empty($j['asalt']) ? $j : null;
}
function install_throttle(string $root, ?bool $failed): bool { // true = this visitor is paused
    $f = $root . '/.update-fails.php'; $ip = $_SERVER['REMOTE_ADDR'] ?? '?'; $now = time();
    $raw = @file_get_contents($f); $n = $raw === false ? false : strpos($raw, "\n");
    $all = $n === false ? [] : (json_decode(substr($raw, $n + 1), true) ?: []);
    $mine = array_values(array_filter($all[$ip] ?? [], fn($t) => $t > $now - 600));
    if ($failed === true) { $mine[] = $now; $all[$ip] = $mine; @file_put_contents($f, "<?php http_response_code(404); exit; ?>\n" . json_encode($all)); }
    return count($mine) >= 8;
}
function jout(array $d, int $c = 200): never { http_response_code($c); header('Content-Type: application/json'); echo json_encode($d); exit; }
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['api'] ?? '') === '1') { // used by the in-app Updates page
    usleep(400000);
    $do = (string)($_POST['do'] ?? 'check');
    if ($do === 'check') { // public release info only, so no password is needed to look
        try { $cur = current_version($root); $rel = latest($cfg);
            $sm = sync_meta($root);
            jout(['installed' => $cur, 'latest' => $rel['version'], 'newer' => version_compare($rel['version'], $cur, '>'), 'notes' => mb_substr($rel['notes'], 0, 6000),
                  'auth' => $sm ? 'passcode' : ($configured ? 'config' : 'none'), 'asalt' => $sm ? $sm['asalt'] : null]);
        } catch (Throwable $e) { jout(['error' => $e->getMessage()], 500); }
    }
    $tok = (string)($_POST['token'] ?? ''); $sm = sync_meta($root);
    if (!$sm && !$configured) jout(['error' => 'Installing is checked against your passcode, which this server learns when sync starts. Sync turns on by itself once the app has data and sync.php is on your site. Open the app, add or import something, then try again.', 'needsync' => true], 403);
    if (install_throttle($root, null)) jout(['error' => 'Too many wrong attempts. Wait a few minutes.'], 429);
    $ok = ($sm && preg_match('/^[0-9a-f]{64}$/', $tok) && hash_equals((string)$sm['hash'], hash('sha256', $tok))) || ($configured && hash_equals((string)$cfg['token'], $tok));
    if (!$ok) { install_throttle($root, true); usleep(400000); jout(['error' => 'Wrong passcode.'], 403); } // nothing changes until the passcode is right
    $lk = fopen($root . '/.update.lock', 'c');
    if (!$lk || !flock($lk, LOCK_EX | LOCK_NB)) jout(['error' => 'An update is already running.'], 409);
    try {
        $cur = current_version($root); $rel = latest($cfg); $newer = version_compare($rel['version'], $cur, '>');
        if ($do === 'install') {
            if (!$newer) jout(['ok' => true, 'version' => $cur, 'note' => 'Already up to date.']);
            install($root, $rel);
            jout(['ok' => true, 'version' => $rel['version']]);
        }
        jout(['error' => 'Unknown action.'], 400);
    } catch (Throwable $e) { jout(['error' => $e->getMessage()], 500); }
}

if (!$configured) out('<p>Not configured. Create <code>update.config.php</code> (see <code>update.config.example.php</code>) with a random password of 24+ characters and the GitHub repo. The Updates page inside the app can still check for new versions without it.</p>', 503);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    out('<p>Current version: <b>' . h(current_version($root)) . '</b></p><form method="post"><p><label>Update token<br><input type="password" name="token" autocomplete="off" required style="width:100%"></label></p><button name="do" value="check">Check for updates</button></form>');
}
usleep(400000); // slow down guessing
if (!hash_equals((string)$cfg['token'], (string)($_POST['token'] ?? ''))) out('<p>Wrong token.</p>', 403);

$lock = fopen($root . '/.update.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) out('<p>An update is already running.</p>', 409);
try {
    $cur = current_version($root);
    $rel = latest($cfg);
    $newer = version_compare($rel['version'], $cur, '>');
    if (($_POST['do'] ?? '') === 'install') {
        if (!$newer) out('<p>Already up to date (' . h($cur) . ').</p>');
        install($root, $rel);
        out('<p><b>Updated to ' . h($rel['version']) . '.</b> Reload the app (Ctrl+Shift+R). Delete <code>update.php</code> if you do not need it.</p>');
    }
    $form = '<form method="post"><input type="hidden" name="token" value="' . h((string)$_POST['token']) . '"><button name="do" value="install">Install ' . h($rel['version']) . '</button></form>';
    out('<p>Installed: <b>' . h($cur) . '</b><br>Latest: <b>' . h($rel['version']) . '</b></p>'
        . ($newer ? '<pre>' . h(mb_substr($rel['notes'], 0, 3000)) . '</pre>' . $form : '<p>You are up to date.</p>'));
} catch (Throwable $e) {
    out('<p>Update failed: ' . h($e->getMessage()) . '</p>', 500);
}
