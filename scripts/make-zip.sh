#!/usr/bin/env bash
# Builds a release ZIP for cPanel / any static host (includes .htaccess).
# Usage: scripts/make-zip.sh [output.zip]     default: portfolio-v<version>.zip
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' version.json)
OUT="${1:-portfolio-v${VERSION}.zip}"
case "$OUT" in /*) ABS="$OUT";; *) ABS="$PWD/$OUT";; esac
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
cp -r index.html robots.txt version.json sw.js manifest.webmanifest css js assets vendor "$STAGE/"
# update.php is in the ZIP so that extracting it by hand gives a site that can update itself. Updaters from 0.7.3 on accept it
# (the current one ignores it and copies itself into server/); the example config stays out. update.php is also a separate release asset.
# sync.php stays at the ZIP root on purpose (older updaters accept it); the newer updater files it under server/.
cp deploy/php/sync.php deploy/php/update.php "$STAGE/"
cp deploy/hosting/htaccess.txt "$STAGE/.htaccess"
( cd "$STAGE" && zip -qr "$ABS" . )
sha256sum "$OUT" | tee "$OUT.sha256"
echo "Created $OUT ($(du -h "$OUT" | cut -f1))"
