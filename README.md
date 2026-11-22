# Pocketbook

A private, single-page money dashboard for Indian families. Upload bank and credit card statements
(PDF, Excel, CSV, OFX) and get spending, income, budgets, recurring bills and an investments tracker
(stocks, mutual funds, PPF, EPF, NPS, Sukanya Samriddhi, LIC, FDs, gold).

**No server, no build step, no tracking.** Everything runs in the browser. Your data is stored in that
browser's `localStorage` and is never sent anywhere, so this repo contains code only.

## Features

- Import PDF (including password-protected bank PDFs), `.xlsx`/`.xls`, CSV/TSV, OFX/QFX
- Broker or mutual fund holdings exports are recognised and update the Investments tab
- Duplicate protection: whole-file hash check plus row-level matching (account, date, amount, description)
- Upload log: every file, what it added, what was skipped; any import can be removed again
- Family members, bank accounts and credit cards (limits, utilisation, per-card spend)
- ₹ with lakh/crore formatting, Indian financial year (Apr–Mar) range
- Auto-categorisation tuned for UPI/NEFT/IMPS narrations; fix a category once and it is remembered
- Budgets, recurring payment detection, PPF/Sukanya/NPS annual limit trackers
- Light, dark and system themes with an animated switch
- Backup and restore as a JSON file

## Run locally

Open `index.html` in a browser. Try `samples/hdfc-style-statement.csv`.

## Deploy on cPanel

1. File Manager → `public_html/pocketbook/` (or a subdomain folder) → upload `index.html`.
2. Put the hostname behind Cloudflare Access (Zero Trust → Access → Applications → Self-hosted),
   with an allow policy for your email addresses. A tunnel is optional for a static site; a proxied DNS record works.
3. Because data lives in each browser, Access protects the page, and each device keeps its own copy.
   Use **Settings → Download backup** to move data between devices.

### Optional: fully self-contained

`index.html` loads Google Fonts, pdf.js and SheetJS from public CDNs (only when needed). To avoid any third-party
request, download `pdf.min.js`, `pdf.worker.min.js` (pdf.js 3.11.174) and `xlsx.full.min.js` (SheetJS 0.18.5) into
`vendor/`, and point the three URLs near the top of the `pdfRows`/`ingest` functions to them.

## Notes

PDF statements differ a lot between banks. Always check the preview before importing. Scanned (image-only)
PDFs cannot be read; use the Excel or CSV export from net banking instead.
