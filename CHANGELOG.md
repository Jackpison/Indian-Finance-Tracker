# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.9.4] - 2026-11-25
### Added
- Two more appearance modes, Total light and Total dark, where the sidebar matches the page. Light and Dark keep the half-and-half look (dark sidebar beside a light page, or the reverse). Pick one under Settings, General, Appearance, or from the search box; the sun and moon button flips within the family you chose.

### Changed
- Side menu order is now Summary, Wealth, then Money. Uploads moved out of the menu into Settings (Backup and imports), and Install app moved from the menu footer into Settings (Sync and install). The sync status line stays in the footer and opens that section.
- Settings redone: icon section titles, a roomier layout, and appearance picked from four small previews.
- The family-member switcher now shows only on pages it filters (it was on every page).
- Phones: each transaction is two tight lines, name and amount, then date and category.
- Investments: the FY deposits card keeps its own height instead of stretching to match the taller cards beside it.

## [0.9.3] - 2026-11-25
### Changed
- Phones: summary cards sit two per row (Overview, Portfolio, Investments, Recurring, Cards) and their amounts fit; Recurring keeps Name, Typical and Next due; the Transactions summary amounts fit their cards, the page title and subtitle sit closer, and the period buttons share one row with the More menu.
- Overview: the Money in and out chart is taller so it fills its card beside the categories card (which lists five categories). Portfolio's page subtitle is shorter so it no longer cuts off. Updates has its own icon, and its setup text uses the full card width.

## [0.9.2] - 2026-11-23
### Changed
- **`update.php` is back in the release ZIP.** Extracting the ZIP on your site now gives you the updater too, so the Updates page works without a separate upload. It is still a separate download as well. (Updaters older than 0.7.3 refuse it; those must upload the new `update.php` by hand once.)

## [0.9.1] - 2026-11-23
### Fixed
- The Linux desktop build now also produces the `.deb` (it stopped for lack of a project homepage, so the Linux files were missing from 0.9.0). Windows and Mac files were already built.

## [0.9.0] - 2026-11-23
### Added
- **Desktop app** for Windows (`.exe` installer and portable), Mac (`.dmg`) and Linux (`.AppImage`, `.deb`), built by the release workflow from the same files. Same encryption, same screens, its own window and no network of its own. Not code signed, so Windows and macOS ask you to confirm once. It keeps its own data (move it with a backup file) and can sync with your own server: type the address in Settings, Sync to your server.
- **Install app** button (Settings, About, and the side menu when your browser offers it) for phones, tablets and computers, with steps for iPhone. The web manifest now has 192, 512 and maskable icons.
### Changed
- **Tidier server folder.** On your host the app now sits next to one `server/` folder holding `sync.php`, `update.php`, the sync data (`data/`) and update backups (`backup/`). The Updates page has a **Tidy up** button for sites set up the old way; installing an update does the same automatically once you have uploaded the new `update.php` from the release page. Older layouts keep working until then, and sync keeps its data.
- The release page explains the desktop and Install app options.

## [0.8.1] - 2026-11-23
### Changed
- **Calmer Overview.** The member and period filters are now segmented controls (a recessed track with the chosen option raised). **Money in and out** is flatter: thinner bars, no shadows, a dashed net line with small hollow dots and dotted grid lines. The stacked **Needs attention** cards are now one card with a row per item. The Income and Spending bars are slim solid bars instead of hatched blocks. The page layout is unchanged.
### Accessibility
- Every screen in light and dark now passes an automated WCAG 2 AA scan (`tests/a11y.js`, part of `npm test`).
- Darker greens, reds, greys and amber so small text has enough contrast; coloured type labels in Investments are readable.
- The side menu is a navigation landmark (`aria-current` marks the open page) instead of a mis-built tab list. Dialogs are named, headings follow a sensible order, unlabelled selects and search boxes have labels, and the filter bar is a landmark.

## [0.8.0] - 2026-11-23
### Added
- **Needs attention** on Overview: one card per thing worth a look. Transactions without a category, **months with no transactions** between two others on an account (usually a missing statement), **deposits maturing within 30 days**, and accounts whose statement is more than 45 days old, each with a button that takes you there.
- **Analytics, People:** spending per month for each family member over the last 6 months, plus income and savings rate (income minus spending, as a share of income; transfers between your own accounts are left out).
- Project notes for working on the repo: `CLAUDE.md`, `docs/NOTES.md`, `CONTRIBUTING.md`, `SECURITY.md` and issue templates for bugs and statements that were read wrongly (they warn against pasting real data).

### Changed
- **Investments page:** the allocation legend no longer collides with the chart. Upcoming maturities show the owner, the amount and the time left (days, months or years) with a "Soon" tag inside 60 days. Holdings show paise. Gain shows a dash instead of 0.0% for deposits that carry no gain figure, and the top card says "no gain recorded yet".
- **Repository tidied.** `deploy/` is split into `deploy/hosting/` (.htaccess, nginx, Caddy, Docker, Netlify, Vercel) and `deploy/php/` (`sync.php`, `update.php`, example config). `bump.sh` and `make-zip.sh` moved to `scripts/`. The old `docs/HANDOFF.md` was replaced by `docs/NOTES.md`. The release ZIP layout is unchanged.

## [0.7.3] - 2026-11-23
### Fixed
- **Installing an update from the Updates page no longer stops with "Unexpected file in release: update.php".** The release ZIP carried `update.php` and an example config that the updater itself refused. The ZIP now holds only the app and `sync.php`, and the updater skips any file it does not manage instead of aborting. `update.php` is a separate release asset for the one-time upload. A new test installs a real ZIP, including an old-style one.
- The passcode screen could drop the second box's text into the first box when typed quickly (a 50 ms auto-focus). It now only focuses when nothing else is focused. This also explains the occasional "passcode screen stuck" test failures.
- The side-panel footer floated over the menu on short windows. It is now a single compact row at the end of the menu (sync status, lock icon).

### Added
- **Recovery key.** A 25-character key is shown once when you create or change your passcode (and can be made in Settings, Security). If you forget the passcode, "Forgot passcode? Use recovery key" on the lock screen unlocks the data in that browser and asks for a new passcode. Only an encrypted copy of the passcode is stored, protected by the key. It works in the browser that holds your data; a fresh browser still needs the passcode or a backup.
- **Unlock lockout.** Three wrong passcodes start a growing wait (5 s up to 15 min). It survives a page reload.
- **NPS statements are read.** An NPS Tier I/II transaction statement (the PDF from the NPS/CRA portal) used to fall through to the generic table reader and create nothing useful. It is now recognised by its PRAN: you get one NPS holding ("NPS Tier I ••1745") with the total value and total contribution, the owner is pre-selected from the name on the statement, and importing a newer statement updates it. It is an investment, not a bank account, so no account is created. The three scheme values are cross-checked against the total.
- **Paise (.00) on Transactions totals and everywhere on Portfolio** (account balances, totals, fixed deposits, the per-person table).

## [0.7.2] - 2026-11-23
### Changed
- **Side panel (desktop):** a footer now shows whether sync is on and when it last synced (click it to open sync settings) and a Lock now button. The Updates item shows a "new" mark when a newer version is available. The layout of the page itself is unchanged.

## [0.7.1] - 2026-11-23
### Changed
- Fixed deposits on Portfolio now show the owner's tag, like accounts and cards do.

## [0.7.0] - 2026-11-23
### Added
- **Sync turns itself on.** Once the app has data and `sync.php` is on your site, the encrypted copy is uploaded automatically; no Connect step. A browser with no data never claims an empty server, and "Turn off" is remembered.
- **Updates are confirmed with your Portfolio passcode.** No `update.config.php` and no separate password: the install is authorised by a value derived from your passcode (the passcode itself is never sent), checked against the sync copy on your server, with wrong-attempt lockout. `update.config.php` still works if you already have one.

### Changed
- **Server data files are guarded.** Everything in `sync-data/` is now a PHP file that answers 404 if opened in a browser, even on hosts that ignore `.htaccess`. The data is still ciphertext only. Existing `.json` files from 0.6.x are not read; the first push in this version creates the new files.
- The Updates page no longer shows the password field or the generated config box.

## [0.6.4] - 2026-11-23
### Fixed
- **ICICI statements read as SBI or Union Bank.** Found by examining real ICICI statements locally (nothing from them was kept or committed). Two things in their headers fooled the detection: a branch address that names another bank as a landmark ("ROAD NEAR SBI BANK ..."), which tied with the ICICI website line and won, and another bank's code in a transfer narration near the top of page 2. The bank is now taken from the header of page 1 only, with the bank's own website and a labelled IFSC code counting most, a bank named after NEAR/OPP/BESIDE and similar words ignored, and codes inside narrations never counted. If the header names no bank the first lines of the other pages are used, and if still nothing, the import dialog marks the bank as unsure and asks you to check it.
- The passcode screen no longer stays on "Securing…" if something goes wrong: any error is shown on the screen and the button comes back. The CI run for 0.6.3 failed once on this screen without saying why; the test helper now retries and reports the screen's message if it ever sticks again.

### Known
- Older ICICI "Detailed Statement" downloads from internet banking (one account, no summary page) are not read by the statement reader. They still import through the generic table reader, where you pick the account yourself.

## [0.6.3] - 2026-11-22
### Added
- **Delete one person's data** (Settings, Danger zone): removes the transactions, accounts, investments, vault items and import history of one family member and leaves everyone else untouched, with an option to remove the person too. It shows what will be removed and offers a backup first, so you can start one person over without erasing the whole family.

### Fixed
- **One bank, one spelling.** "ICICI BANK", "ICICI Bank Ltd" and "ICICI" were treated as different banks, so one account showed twice (the old one marked "Statement is old") with two balances. Bank names are now stored in one canonical form (ICICI, HDFC, SBI, UNION BANK and so on), and existing split accounts, deposits and PPF merge automatically on load; the newest balance wins. Fix a bank name and the Bank fields use the same spelling.
- **Statements that name the wrong bank.** When the account number on a statement matches an account you already have under another bank, that bank is used and the import dialog says so. When a statement does not clearly name its bank, the dialog now warns you to check the Bank field instead of guessing silently.

## [0.6.2] - 2026-11-22
### Fixed
- The release build for 0.6.1 stopped on a flaw in one of its own tests (it searched the encrypted file's text for names, which random base64 can contain by chance). The test now checks the decoded bytes. There is no change to the app itself, so 0.6.1's changes are included here.

## [0.6.1] - 2026-11-22
### Fixed
- **Install on the Updates page no longer ends in a dead-end error.** When the server has no update password yet, the page now generates a strong one in your browser and shows the exact `update.config.php` to paste on your server (with a Copy button), then Install works. Check now never needed a password. The very first jump from an older version still needs the release ZIP extracted by hand, or `update.config.php` created manually from `update.config.example.php`.

## [0.6.0] - 2026-11-22
### Security
- **The passcode is now mandatory.** A new browser shows a "Create your passcode" screen before anything else; existing unlocked data is encrypted the moment you choose one (10+ characters). "Turn off passcode" is gone. If the saved data is encrypted but its passcode settings are missing, the app stops and changes nothing instead of overwriting.
- **Encrypted sync to your own hosting** (Settings, Sync to your server). The browser encrypts everything (AES-256-GCM, key from your passcode) before it is sent, so `sync.php` on your server only ever holds ciphertext, readable only in the browser after the passcode. The server keeps a hash of a passcode-derived token (never the passcode), refuses wrong tokens and throttles guesses, keeps the last six versions, and closes its data folder to the web. A new browser can **Restore from your server** on the first screen. If another device saved newer data you are asked which copy to keep; nothing is overwritten silently. Changing the passcode re-keys the server copy. `sync.php` ships in the release ZIP and the updater may install it. Needs PHP and HTTPS (nginx/Docker hosts without PHP cannot use it).

### Fixed
- **Statements were read as the wrong bank** (an ICICI statement showing as HDFC): other banks' names and IFSC codes inside NEFT/IMPS narrations outvoted the header. The bank is now taken from the letterhead and the top of each page only. The import dialog also has a **Bank** field, prefilled and editable, so a wrong guess can be corrected before importing.
- If the main saved copy goes missing, unlocking now restores the automatic copy and saves it again.

### Changed
- **Balance is now Portfolio** and sits right after Overview. Account and card management (rename, owner, type, limit, due day) moved there from Settings, under "Manage accounts and cards".
- **Transactions has real pages** (Prev/Next, page count, 25/50/100/200 per page) instead of "Show more".
- **Settings is tidier**: a section list on the left, grouped cards, wide rows laid out in two lines.
- 3D charts are back to a subtler look: soft top-to-bottom gradient bars with a gentle shadow, a flat donut with soft depth and a short entrance.
- Vault no longer asks you to set a passcode first (everything is already protected); it keeps masking numbers until you press Reveal.

## [0.5.3] - 2026-11-22
### Fixed
- **The Updates page can now check for new versions out of the box.** `update.php` and `update.config.example.php` now ship in the release ZIP, so extracting the ZIP is enough for **Check now** to work, with no config file and no password. Installing from the page still needs `update.config.php` with a long random password; without one, `update.php` refuses to install (also for an empty password).
- The Updates page setup box now says this correctly.

## [0.5.2] - 2026-11-22
### Added
- **Fix a bank name** (Settings, Data tools): rename a wrongly read bank (for example SBI to ICICI) on every account, deposit and PPF. Duplicate accounts and old deposits are then tidied automatically.
- Balance, Edit: change an account's **Owner** (its transactions move with it) and its **Bank**.

### Fixed
- **Wrong bank on imported statements.** The bank was taken from the first bank name found in the first two pages, so a UPI narration such as `name@sbipay` or `SBI PAYMEN` could make an ICICI statement read as SBI. That produced "SBI" accounts and deposits, and because the current year read correctly as ICICI, the two never merged and old deposits stayed counted. The bank is now chosen by evidence: IFSC codes first, then names in the page header, and anything inside UPI narrations is ignored.
- **Statement imports no longer guess the owner.** With Everyone selected the dialog used to pick the first person. It now preselects the owner of an account already on file, otherwise asks you to choose. Importing an account that is recorded under someone else is refused with a clear message instead of silently adding it to them.
- Top bar kept wrapping the settings button onto a second line on wide screens.
- The Updates page said `update.php` is in the release ZIP. It is not: get it, and `update.config.example.php`, from the `deploy/` folder of the GitHub repository.

## [0.5.1] - 2026-11-22
### Fixed
- After updating, the browser could keep running old JavaScript and CSS (the page showed an old version number next to "v0.5.0 is available", and Reload did not help). The page now loads its scripts and styles with the version in the address (`app.js?v=0.5.1`), so every release fetches fresh files, and `.htaccess` now makes the browser re-check JS, CSS and the manifest on each load. `deploy/bump.sh` keeps those version marks in step. If an old copy is still showing, press Ctrl+Shift+R once (Cmd+Shift+R on Mac).

## [0.5.0] - 2026-11-22
### Security
- Bots and scrapers are refused: new `robots.txt` bans all crawlers (AI crawlers by name), and the Apache (`.htaccess`), nginx and Caddy configs return 403 to known bots, scripted clients and empty user agents. This stops honest and lazy crawlers. Your data never sits on the server, and with a passcode set it is also encrypted in the browser and nothing is shown until you unlock.
- Docker image now includes `sw.js` and the manifest.

### Changed
- Charts: 3D bars and a tilted 3D donut, staggered rows, moving progress bars, lifting cards. Page title moved into the top bar. App version shown beside Updates.
- Per-person spending detail on Overview (most spent on, top merchant, biggest payment).
- Owner shown as a coloured tag on Transactions (list and details), Balance, Cards, Investments and Uploads.
- Updates page: **Check now** needs no password (it only reads the latest release from GitHub through `update.php`). The password field appears only once a newer version is found, and only **Install** uses it. New page header with status pill and an Update / Changelog switch. Re-upload `deploy/update.php` to your server for this to work.
- Theme: one sun/moon button replaces the three-way switch; the "match device" option is gone.

### Fixed
- The update test no longer fails in CI now that the offline shell's service worker answers `version.json` itself.

## [0.4.0] - 2026-11-22
### Added
- Credit card payment due day (Settings, Accounts): the Cards page shows the next due date and warns within five days.
- Review queue: Overview offers to sort payments without a category.
- Split a payment into two categories (expand a transaction, Split).
- Installable app with an offline shell (manifest and service worker; your data stays in IndexedDB).
- Skip-to-content link and a focusable main region for keyboard and screen-reader users.
- More tests (`tests/features.js`).

### Fixed
- Importing several years of statements: the bank name is now read the same way every time (ICICI vs icici), so one account no longer splits into two with its balance counted twice, and deposits from an older statement no longer reappear as running. On load the app merges such duplicate accounts, keeps a transaction that sits in both copies once, and drops closed deposits that only an older statement listed. A copy of your data from before this tidy-up is kept on the device (`state.prerepair`) when the data is not passcode-encrypted.
- Accounts can be marked closed (Balance, Edit) so an old account no longer counts towards net worth.
- Editing a card limit no longer re-renders the page while the field is focused.

## [0.3.0] - 2026-11-22
### Added
- **Updates** page: check GitHub, read what changed and install a release in one click through `update.php` on your own site (verifies SHA-256, keeps a backup).
- Transactions: expandable rows (details, change category, copy), filter panel with category and account chips and a count badge, summary cards, tinted category tags, staggered fade-in.
- Overview: dark net-worth hero with a 12-month line, striped income and spending bars, cursor spotlight on cards.

### Changed
- Sidebar is the opposite of the page (dark beside a light page, light beside a dark one) and swaps when you switch theme; smoother motion throughout (page transitions, hover and press feedback, reduced-motion respected); shorter period bar with a More menu; styled tables; onboarding card hidden once you have data; Cards page uses the new stat cards.
- README screenshots regenerated from fictional data.

### Removed
- Old unused styles and code (health score, greeting header, animated borders).

## [0.2.0] - 2026-11-22
### Fixed
- **Data safety.** Saved data can no longer be replaced or deleted by a stale tab or a failed start. Every save keeps a mirror copy, the previous version and a daily snapshot; if the main copy is missing the app offers to restore from them. A tab that finds newer data written elsewhere stops saving and asks you to reload. The app asks the browser for persistent storage, and shows a banner if a save fails.
- Second statement import no longer leaves closed fixed deposits behind; a newer statement replaces the deposit list, an older one never overwrites newer data.

### Added
- **Balance** tab under Wealth: bank balances and other holdings, as a total and per family member.
- Dedicated **Settings** page (General, Family, Accounts, Security, Backup, Data tools, About).
- Grouped sidebar with page titles and subtitles, new stat cards, buttons and segmented controls.

### Removed
- Demo data, Goals and Budgets.

## [0.1.0] - 2026-11-22
### Added
- Redesigned KPI cards on Overview: colour key, change versus the previous period, full-width trend line, and a savings-rate meter against a 20% goal.
- Multi-account bank PDFs (checked against a real ICICI annual statement): savings, PPF and other account sections are split by account, narrations that wrap over several lines are re-attached to the right row, and every section is reconciled against the running balance and the statement totals before import.
- Fixed deposits and PPF balances listed in a statement update Investments automatically.
- Statement dialog shows per-account results and flags files that were already imported.
- Fees category (debit card fees, SMS charges); interest on FD/RD counts as income; FD bookings and closures count as investments.
- Transfers between your own accounts: equal and opposite amounts in two accounts within 3 days are matched and marked as Transfers, so they no longer count as spending or income. Runs after every import; Settings has Find transfers and Remove all links; changing a category unlinks the pair.
- Backup reminder: a banner after a week without a backup (then monthly), with a reminder interval and last backup date in Settings.
- Parser tests with a fictional ICICI-style sample PDF (`samples/icici-style-statement.pdf`).

### Fixed
- "New account…" could not be chosen in the import dialog once an account existed.

### Changed
- New look: left sidebar, flat cards, near-black dark theme with blue and green accents, Inter typeface (vendored, no CDN).
- Reference numbers (NEFT/UPI/IMPS ids) are stripped from imported narrations.

## [0.0.1] - 2026-11-22

First release.

### Added
- Import bank and credit card statements from PDF (including password-protected), Excel, CSV/TSV and OFX/QFX; holdings files update Investments.
- Duplicate protection with a file fingerprint and row-level matching; upload log with per-import removal.
- Family members, accounts, credit cards with limits and utilisation.
- Overview, Transactions, Cards, Investments, Goals, Budgets, Recurring and Uploads views.
- Analytics: spending flow, income-to-spend Sankey, merchant treemap, daily calendar, year-by-month heatmap, year-over-year lines, savings rate, 3-month outlook, unusual payments, category growth.
- Vault for card, account, PAN, Aadhaar and policy numbers: masked with the last four visible, reveal and copy on demand.
- Optional passcode: AES-256-GCM encryption at rest with a PBKDF2-SHA-256 key (600,000 rounds), auto-lock, encrypted backups.
- IndexedDB storage and yearly roll-ups for ten years or more of history.
- Copy any transaction, or a filtered list as TSV or CSV.
- Light, dark and system themes with an animated switch.
- In-app install and hosting guide, version display and update check.
- Deploy files for cPanel, GitHub Pages, Netlify, Vercel, Cloudflare Pages, Docker, nginx and Caddy.
- Release workflow that builds a ZIP and can deploy to your host over FTPS; optional PHP self-updater for cPanel.

### Security
- Strict Content Security Policy: same-origin scripts only, no inline scripts, no `eval`.
- No third-party requests: fonts, pdf.js and SheetJS are vendored with checksums.
- SheetJS 0.20.3; pdf.js runs with font `eval` disabled.
- Copied CSV/TSV is neutralised against spreadsheet formula injection.

[Unreleased]: https://github.com/Jackpison/Indian-Finance-Tracker/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/Jackpison/Indian-Finance-Tracker/releases/tag/v0.0.1
