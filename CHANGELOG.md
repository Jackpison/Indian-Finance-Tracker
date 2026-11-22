# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
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
