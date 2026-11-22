# Portfolio: handoff notes

Private single-page money dashboard for an Indian family. Repo `Jackpison/Indian-Finance-Tracker` (checked out here as `finance-tracker`). Vanilla JS and CSS, static files, no build step.

## Hard rules

- **Do not convert to React, Tailwind, TypeScript or shadcn.** Port design ideas to vanilla JS/CSS instead.
- **Strict CSP**: `script-src 'self'`, no inline script, no `eval`, `connect-src 'self'`. No CDN or third-party requests; fonts, pdf.js and SheetJS are vendored.
- **Privacy**: the user's real statements and data never go into commits, tests, fixtures or outside requests. Tests use fictional data only (`tests/demo-data.js`, `samples/`).
- Commit messages end with:
  ```
  Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
  Claude-Session: <session url>
  ```
- Do not open pull requests unless asked. Push with `git -c push.negotiate=true push origin main` (`git pull --rebase origin main` first if rejected).
- Tag pushes are blocked in the cloud sandbox. The user creates releases and tags in the GitHub UI. Existing tags: v0.0.1, v0.1.0, v0.2.0, v0.3.0. **v0.4.0 is the current version and is not tagged yet.**
- Release flow: `deploy/bump.sh X.Y.Z`, then add a matching `## [X.Y.Z]` section to `CHANGELOG.md`, commit, push. The release workflow builds the ZIP and takes the notes from the changelog.
- Shell tip: very long heredocs and inline python with odd characters are sometimes blocked by a safety check. Write helper scripts with the Write tool or use Edit instead.
- Cloudflare is optional only.

## Layout

```
index.html          shell (CSP meta, manifest link, skip link)
js/app.js           the whole app, one IIFE (~190KB)
js/statement.js     PDF statement parser (UMD, window.PFStmt)
js/theme.js         sets theme before first paint
css/app.css         all styles; later blocks override earlier ones
sw.js               offline shell (network first)
manifest.webmanifest
vendor/             pdf.js, SheetJS, Inter + Geist Mono fonts
deploy/             htaccess, nginx, Caddy, Docker, zip builder, bump.sh, update.php
tests/              Playwright tests, lib.js helpers, demo-data.js, screenshots.js
samples/            fictional ICICI-style PDFs + CSV
docs/screenshots    README images (regenerate with tests/screenshots.js)
```

## Tests

```bash
npm run check                                   # syntax
NODE_PATH=$(npm root -g) node tests/statement.js  # parser on fictional PDF
NODE_PATH=$(npm root -g) node tests/e2e.js        # import, dedupe, PDF, FD reconciliation, transfers, XSS, 10-year load, reloads/tabs/recovery, passcode
NODE_PATH=$(npm root -g) node tests/features.js   # due dates, review queue, split, repair, shell files
NODE_PATH=$(npm root -g) node tests/update.js     # update banner + Updates page (mocked update.php)
NODE_PATH=$(npm root -g) node tests/screenshots.js  # regenerate docs/screenshots
```

`tests/lib.js` exports `launch, URL, ROOT, ok, done, csv, loadDemo(page)`. `loadDemo` restores a fictional family backup through Settings, Restore. Do not destructure `URL` in `node -e` scripts (it shadows the global).

## Architecture notes

- State object `S` holds `tx, hold, uploads, vault, members, accts, rules, cur, order`. Saved to IndexedDB (`portfolio-db`, store `kv`), optionally AES-GCM encrypted with a passcode (PBKDF2 600k).
- **Storage safety** (data loss was a real incident, so keep these invariants):
  - Records carry `ts` and `n`. Never overwrite a record newer than the one this tab last read or wrote; the tab freezes and shows "Changed in another tab".
  - Mirror copies: `state.bak` (latest), `state.prev` (previous), `state.day` (daily), plus `state.prerepair` (before an automatic tidy-up, unencrypted setups only).
  - `navigator.storage.persist()` at boot; a banner on save failure; recovery dialog when the main record is missing or empty but a copy exists.
- `repairData()` runs after every load or restore: uppercases bank names, merges duplicate accounts (same bank+last4+member+type), keeps a transaction present in both copies once, drops statement-derived FDs whose `asof` is older than the newest for the same member and bank.
- Statement import: per-account sections, reconciled against running balance. `reconcileHolds` replaces the FD list when a newer statement lists deposits; an older statement never overwrites newer data. Balances: `a.bal`, `a.balAsOf`, `curBal(a)` adds later transactions; `a.sub='PPF'`; `a.closed` excludes an account from net worth.
- Matching: `findAcct` and holdings matching are case-insensitive. The parser upper-cases the bank name.
- Transfers between own accounts are matched (`xf`, `xo`, `xn`), backup reminder state is `bk`.
- UI patterns: actions in object `A` (click, `data-act`), change handlers in `C` (`data-change`), `render()` rebuilds `#main`. Views: overview, tx, cards, rec, bal, inv, ana, vault, up, settings, upd. Design system v2 is appended to the end of `css/app.css` (stat cards, `.ph` page head, `.tbl` tables, `.tg` tags, `.fchip` filter chips, `.txr` expandable rows, `.nwhero`, `.hatch`, dark sidebar that is the opposite of the page theme).
- Updates page talks to `update.php` on the user's own server (JSON mode, token in the request body, kept in sessionStorage). It downloads the latest GitHub release, verifies SHA-256, backs up replaced files. `update.php` ALLOWED list must include any new top-level file.

## Done

0.1.0: ICICI multi-account PDF parser, FD/PPF holdings, transfer matching, backup reminder, KPI redesign.
0.2.0: data-safety hardening, Balance tab (total and per member), dedicated Settings page, demo data and Goals/Budgets removed.
0.3.0: Updates page, expandable Transactions with filter panel, dark/light opposite sidebar, net-worth hero, motion pass, screenshots from fictional data.
0.4.0 (current, untagged): card due day, review queue for uncategorised, split payment, installable offline shell, skip link, repair of duplicate accounts and stale deposits after importing several years of statements, closed accounts.

## Open work

- The user reported "it got rekt again" after importing several older years of statements. The visible causes (case-split ICICI account counted twice, old matured FDs shown as running, a 2014 account counted) are fixed, but **ask what else looked wrong** and verify with their numbers.
- UI rework still to do: Finstack-style pagination footer on Transactions, dark-theme review of every screen, better mobile layout for period pills and tables, cash-flow chart height vs the donut card, a distinct icon for Updates, a draggable widget layout for Overview (optional).
- Not built: broker and mutual-fund statement imports with XIRR (needs sample files with personal details removed), tax helpers beyond the existing annual limit trackers, printable recovery key (the app has no recovery key; an encrypted backup is the safe copy).
- Untested: other banks' PDF layouts, the real cPanel `update.php` flow, FTPS deploy, service worker on a real phone, light-theme and mobile visuals beyond screenshots.
- The user must deploy the new build: v0.4.0 tag and release in the GitHub UI, then extract the ZIP over the site (or use the Updates page once `update.php` and `update.config.php` are on the server).
