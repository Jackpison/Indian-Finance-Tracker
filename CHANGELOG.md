# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]
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
