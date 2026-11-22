# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
