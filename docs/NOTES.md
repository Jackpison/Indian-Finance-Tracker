# Working notes: how it is built, why, and how we work

Read `CLAUDE.md` first. User-facing changes go in `CHANGELOG.md`; this file explains the *why*, so later changes build
on facts instead of guesses. Newest findings first in each section. No real personal data in this file.

## How we work

- Vanilla JS/CSS, no build step. Strict CSP, nothing third-party, fonts, pdf.js and SheetJS are vendored.
- The data is the user's family finances, so accuracy matters more than speed. Reproduce a reported problem with
  fictional data first, fix it, add a test, then release.
- Every release: `scripts/bump.sh`, changelog section, `npm test`, push to `main`; the user tags it in the GitHub UI.
- Real statements the user attaches are read locally, never committed, and deleted afterwards.
- Borrowed from the user's other projects (Homebase-Hub, Trading-Bot, Market-Prism): a handoff file per major change,
  this notes file, guarded PHP data files, an install gated by the app's own login, a recovery key, lockout on wrong
  attempts, a CONTRIBUTING file and issue templates, data validation, and accessibility rules (status never by colour
  alone, text contrast, reduced motion). Features and integrations only, not their UI.

## Layout

```
index.html           shell (CSP meta, manifest, skip link, passcode gate and lock overlays)
js/app.js            the whole app, one IIFE
js/statement.js      PDF statement parser (UMD, window.PFStmt): banks, NPS
js/theme.js          sets the theme before first paint
css/app.css          all styles; later blocks override earlier ones
sw.js                offline shell (network first)
vendor/              pdf.js, SheetJS, fonts
deploy/hosting/      .htaccess, nginx, Caddy, Docker, Netlify, Vercel
deploy/php/          sync.php (encrypted sync), update.php (one-click updater), update.config.example.php
scripts/             bump.sh (version everywhere), make-zip.sh (release ZIP)
tests/               Playwright tests, lib.js helpers, demo-data.js (fictional family)
samples/             fictional statements
docs/                this file, README screenshots
handoff/             local only (gitignored): Tracker-Handoff-vN.md for starting a new chat
```

## Architecture

- State `S`: `tx, hold, uploads, vault, members, accts, rules, cur, order`. Stored in IndexedDB (`portfolio-db`,
  store `kv`), always encrypted with the passcode (AES-256-GCM, PBKDF2-SHA256 600k). The passcode is mandatory
  (10+ characters); the first-run `#gate` creates it. Data is per browser profile and per site address.
- **Storage safety** (data loss was a real incident): records carry `ts` and `n`; never overwrite a record newer than
  the one this tab read; the tab freezes with "Changed in another tab". Mirrors: `state.bak`, `state.prev`,
  `state.day`. `navigator.storage.persist()` at boot, a banner when a save fails, a recovery dialog when the main
  record is missing but a copy exists.
- `repairData()` runs on every load: canonical bank names, merges duplicate accounts and holdings (same bank + last 4 +
  owner + type), drops old statement-derived FDs superseded by a newer statement.
- UI pattern: actions in object `A` (`data-act`), change handlers in `C` (`data-change`), `render()` rebuilds `#main`.
- Amounts are stored to the paisa. Transactions and Portfolio show `.00`; Overview keeps whole rupees.

## Statement import

- `PFStmt.parse(pages)` returns `{bank, bankSure, sections, holdings, fdListed, warnings}`, or null for layouts it does
  not know (those fall to the generic table reader). `parseNPS` handles NPS Tier I/II statements: one holding per
  PRAN, no bank account.
- **Bank detection is header-first.** Page 1 head only; the bank's own website and a labelled IFSC code count most;
  a bank named after NEAR/OPP/BESIDE is ignored (branch landmarks); codes inside narrations never count. Real
  ICICI statements were misread as SBI or Union Bank because of a landmark and a counterparty code. If nothing is
  found the import dialog marks the bank as unsure.
- `canonBank` gives one spelling per bank, so "ICICI BANK" and "ICICI" merge.
- The old internet-banking "DETAILED STATEMENT" layout is not parsed yet (needs a redacted sample).
- A newer statement's FD list replaces an older one; an older statement never overwrites newer data.

## Sync, updates and recovery

- **Zero-knowledge sync** (`deploy/php/sync.php`): the browser sends the same encrypted blob a backup holds plus a
  token derived from the passcode (PBKDF2 over `asalt|sync-auth`). The server stores only SHA-256(token), `asalt` and
  a revision. Pull, push with base revision (409 on conflict), 6 versions kept, 8 wrong tokens per 10 minutes per IP.
  Data files are PHP files that answer 404 (`<?php http_response_code(404); exit; ?>` first line), so they are safe
  even where `.htaccess` is ignored. Sync switches on by itself once there is data and the server is empty.
- **Updater** (`deploy/php/update.php`): install is confirmed with the app passcode (token checked against sync's
  stored hash, throttled). It downloads the release ZIP, checks SHA-256, backs up replaced files, skips files it does
  not manage and never touches `update.config.php` or `sync-data/`. **The release ZIP must not contain the updater's
  own files** (an older updater aborted on them); `update.php` ships as a separate release asset.
- **Recovery key:** 25 random characters, shown once on creating or changing the passcode (and from Settings). It
  encrypts a copy of the passcode kept in this browser's lock settings. It works in the browser that holds the data;
  a fresh browser still needs the passcode or a backup file. Unlock lockout: 3 wrong tries start a wait (5 s up to
  15 min) that survives reloads.

## Findings

- A 50 ms auto-focus on the passcode gate could drop typed text into the wrong box and made tests flaky; it now
  only focuses when nothing is focused.
- An updater that rejects files it does not manage turns one stray file in a ZIP into a failed install every time.
  Skip, do not abort, and test the install against a real ZIP (`tests/install.js`).
- Base64 text can contain short words by chance: when checking ciphertext, test decoded bytes, not the text.
- Browsers differ in how storage is scoped: a new browser, a private window, another address or cleared site data
  starts empty. Sync or a backup file brings the data back.

## Not built / ideas

- Broker and mutual-fund statements with XIRR (needs redacted samples), tax helpers, the old "DETAILED STATEMENT"
  layout, recovery from a fresh browser with only the recovery key.
- Untested on real devices: service worker on a phone, FTPS deploy.
