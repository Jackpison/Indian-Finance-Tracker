<?php
/**
 * Portfolio encrypted sync. Runs on your own PHP host, next to index.html.
 *
 * The server only ever stores ciphertext: the browser encrypts everything with a key made from your passcode
 * (AES-256-GCM, PBKDF2 600,000 rounds) before it is sent. There is nothing here to read without the passcode,
 * and the passcode never leaves the browser. The only thing the server learns is a second value derived from
 * the passcode, hashed again with SHA-256, which proves a request comes from someone who knows the passcode.
 *
 * Files are kept in server/data/ (older installs: sync-data/; created on first use, closed to the web with .htaccess and index.html).
 * If your host is not Apache, block web access to the sync-data folder in its configuration.
 */
declare(strict_types=1);
const GUARD = "<?php http_response_code(404); exit; ?>\n"; // every data file is a PHP file that answers 404, even where .htaccess is ignored
function gread(string $f) { $raw = is_file($f) ? (string)file_get_contents($f) : ''; $n = strpos($raw, "\n"); return $n === false ? null : json_decode(substr($raw, $n + 1), true); }
function gwrite(string $f, $data): bool { return file_put_contents($f, GUARD . str_replace('<', '\\u003C', json_encode($data))) !== false; }
const MAX_BYTES = 40 * 1024 * 1024;
const KEEP = 6;            // older versions kept so a bad push can be undone by hand
const FAIL_MAX = 8;        // wrong-passcode attempts allowed ...
const FAIL_WINDOW = 600;   // ... per this many seconds, per client address

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');

function out(array $a, int $code = 200): void { http_response_code($code); echo json_encode($a); exit; }

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(['error' => 'POST only'], 405);
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
    || in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
if (!$https) out(['error' => 'Sync needs HTTPS'], 400);

$raw = file_get_contents('php://input', false, null, 0, MAX_BYTES + 1024);
if ($raw === false || strlen($raw) > MAX_BYTES + 1024) out(['error' => 'Too large'], 413);
$req = json_decode($raw, true);
if (!is_array($req)) out(['error' => 'Bad request'], 400);

$legacy = is_file(__DIR__ . '/index.html'); // old layout: next to index.html; new layout: in <site>/server/
$dir = __DIR__ . ($legacy ? '/sync-data' : '/data');
if (!$legacy && !is_dir($dir) && is_dir(dirname(__DIR__) . '/sync-data')) @rename(dirname(__DIR__) . '/sync-data', $dir);
if (!is_dir($dir)) {
    if (!@mkdir($dir, 0700, true) && !is_dir($dir)) out(['error' => 'Cannot create the data folder here. Make this folder writable.'], 500);
}
@file_put_contents($dir . '/.htaccess', "Require all denied\n<IfModule !mod_authz_core.c>\nOrder deny,allow\nDeny from all\n</IfModule>\n");
@file_put_contents($dir . '/index.html', '');
@file_put_contents($dir . '/web.config', '<configuration><system.webServer><authorization><deny users="*"/></authorization></system.webServer></configuration>');

$blobF = $dir . '/blob.php';
$metaF = $dir . '/meta.php';
$lockF = $dir . '/.lock';
$fh = fopen($lockF, 'c');
if (!$fh || !flock($fh, LOCK_EX)) out(['error' => 'Busy'], 503);

$meta = gread($metaF);
if (!is_array($meta)) $meta = null;
$act = (string)($req['a'] ?? '');

if ($act === 'info') { // public: lets a new browser learn the salt for the token, so every device derives the same one from the same passcode
    out($meta ? ['exists' => true, 'rev' => $meta['rev'], 'asalt' => $meta['asalt']] : ['exists' => false]);
}

// everything below needs the passcode-derived token (or is the one-time first upload)
$tok = (string)($req['token'] ?? '');
if (!preg_match('/^[0-9a-f]{64}$/', $tok)) out(['error' => 'Bad token'], 400);
$hash = hash('sha256', $tok);

if ($meta) {
    $failF = $dir . '/fails.php';
    $ip = $_SERVER['REMOTE_ADDR'] ?? '?';
    $fails = gread($failF) ?: [];
    $now = time();
    $mine = array_values(array_filter($fails[$ip] ?? [], fn($t) => $t > $now - FAIL_WINDOW));
    if (count($mine) >= FAIL_MAX) out(['error' => 'Too many wrong attempts. Wait a few minutes.'], 429);
    if (!hash_equals($meta['hash'], $hash)) {
        $mine[] = $now; $fails[$ip] = $mine;
        foreach ($fails as $k => $v) if (!array_filter($v, fn($t) => $t > $now - FAIL_WINDOW)) unset($fails[$k]);
        @gwrite($failF, $fails);
        usleep(400000);
        out(['error' => 'Wrong passcode'], 403);
    }
}

if ($act === 'pull') {
    if (!$meta) out(['error' => 'Nothing stored yet'], 404);
    out(['rev' => $meta['rev'], 'at' => $meta['at'], 'blob' => gread($blobF)]);
}

if ($act === 'push') {
    $blob = $req['blob'] ?? null;
    if (!is_array($blob) || empty($blob['ct']) || empty($blob['iv']) || empty($blob['lock']['salt']) || empty($blob['lock']['iter'])) out(['error' => 'Bad data'], 400);
    $base = (int)($req['base'] ?? 0);
    $cur = $meta ? (int)$meta['rev'] : 0;
    if ($base !== $cur && empty($req['force'])) out(['error' => 'Newer data is on the server', 'rev' => $cur, 'conflict' => true], 409);
    if ($meta) { // keep the previous versions
        $h = $dir . '/history';
        if (!is_dir($h)) @mkdir($h, 0700, true);
        @copy($blobF, $h . '/rev-' . $cur . '.php');
        $old = glob($h . '/rev-*.php') ?: [];
        usort($old, fn($a, $b) => filemtime($a) <=> filemtime($b));
        while (count($old) > KEEP) @unlink(array_shift($old));
    }
    $asalt = $meta ? $meta['asalt'] : (string)($req['asalt'] ?? '');
    if (!preg_match('/^[A-Za-z0-9+\/=_-]{16,64}$/', $asalt)) out(['error' => 'Bad data'], 400);
    $newHash = $hash;
    if (!empty($req['newtoken'])) { // passcode changed: the new token replaces the old one
        if (!preg_match('/^[0-9a-f]{64}$/', (string)$req['newtoken'])) out(['error' => 'Bad token'], 400);
        $newHash = hash('sha256', (string)$req['newtoken']);
    }
    $rev = $cur + 1;
    $tmp = $blobF . '.tmp';
    if (!gwrite($tmp, $blob) || !rename($tmp, $blobF)) out(['error' => 'Could not write on the server'], 500);
    gwrite($metaF, ['rev' => $rev, 'at' => time(), 'hash' => $newHash, 'asalt' => $asalt]);
    out(['ok' => true, 'rev' => $rev]);
}

out(['error' => 'Unknown action'], 400);
