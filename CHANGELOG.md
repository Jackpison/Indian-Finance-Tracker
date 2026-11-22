# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
