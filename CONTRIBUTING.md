# Contributing

This is a small, private-use project that is open to read. Fixes and ideas are welcome.

## Ground rules
- **Never share real statements, balances, names or account numbers**, in an issue, a commit, a test or a screenshot.
  Redact first, or describe the layout (which columns, what the header says) instead.
- Vanilla JS and CSS, no build step. Keep the strict CSP (`script-src 'self'`, no inline script, no `eval`,
  `connect-src 'self'`) and make no third-party requests.
- Amounts come from the user's files, never typed in by hand in the app's code. Tests use fictional data
  (`tests/demo-data.js`, `samples/`).
- Status is never shown by colour alone, text must stay readable in both themes, motion respects reduced-motion.

## Set up and check
```bash
python3 -m http.server           # then open http://localhost:8000
npm install && npx playwright install chromium
npm test                         # parser, e2e, features, updater, sync, recovery, install
```

## Releasing
`scripts/bump.sh X.Y.Z`, add a `## [X.Y.Z]` section to `CHANGELOG.md`, run `npm test`, commit, push to `main`, then tag
`vX.Y.Z` in GitHub. The release workflow builds `portfolio-vX.Y.Z.zip` and publishes `update.php` next to it.
See `docs/NOTES.md` for how things are built and why.
