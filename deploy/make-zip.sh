#!/usr/bin/env bash
# Builds portfolio.zip — upload it in cPanel File Manager and Extract.
set -e
cd "$(dirname "$0")/.."
rm -f portfolio.zip
cp deploy/htaccess.txt /tmp/.htaccess.portfolio
zip -qr portfolio.zip index.html css js assets vendor
( cd /tmp && mv .htaccess.portfolio .htaccess && zip -q "$OLDPWD/portfolio.zip" .htaccess && rm .htaccess )
echo "Created portfolio.zip ($(du -h portfolio.zip | cut -f1))"
