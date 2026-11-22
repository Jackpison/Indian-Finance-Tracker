#!/usr/bin/env bash
# Builds a release ZIP for cPanel / any static host (includes .htaccess).
# Usage: deploy/make-zip.sh [output.zip]     default: portfolio-v<version>.zip
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' version.json)
OUT="${1:-portfolio-v${VERSION}.zip}"
case "$OUT" in /*) ABS="$OUT";; *) ABS="$PWD/$OUT";; esac
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
cp -r index.html robots.txt version.json sw.js manifest.webmanifest css js assets vendor "$STAGE/"
cp deploy/htaccess.txt "$STAGE/.htaccess"
( cd "$STAGE" && zip -qr "$ABS" . )
sha256sum "$OUT" | tee "$OUT.sha256"
echo "Created $OUT ($(du -h "$OUT" | cut -f1))"
