#!/usr/bin/env bash
# Sets the version everywhere. Usage: scripts/bump.sh 1.1.0
# Then edit CHANGELOG.md, commit, and tag:  git tag v1.1.0 && git push --tags
set -euo pipefail
cd "$(dirname "$0")/.."
V="${1:?usage: scripts/bump.sh X.Y.Z}"
[[ "$V" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Version must look like 1.2.3"; exit 1; }
printf '{ "version": "%s" }\n' "$V" > version.json
sed -i "s/^\(  \"version\": \)\"[^\"]*\"/\1\"$V\"/" package.json
sed -i "s/^\(  \"version\": \)\"[^\"]*\"/\1\"$V\"/" desktop/package.json
sed -i "s/^const VERSION='[^']*'/const VERSION='$V'/" js/app.js
sed -i -E "s#(css/app\.css|js/theme\.js|js/statement\.js|js/app\.js)\?v=[0-9.]+#\1?v=$V#g" index.html
echo "Version is now $V. Add a '## [$V] - $(date +%F)' section to CHANGELOG.md."
