# Notes for working on this repo

- Read `docs/NOTES.md` first (how the app is built, why decisions were made, how we work).
- **Privacy:** never put real statements, balances, names or account numbers in commits, tests, fixtures, docs or
  outside requests. Fictional data only (`tests/demo-data.js`, `samples/`). If the user attaches a real file to debug,
  read it locally, reproduce the problem with fictional data, then delete the file.
- **Stack rules:** vanilla JS and CSS, no build step. Do not convert to React, Tailwind, TypeScript or shadcn.
  Strict CSP (`script-src 'self'`, no inline script or eval, `connect-src 'self'`), no third-party requests,
  everything vendored. Take features and integrations from the user's other projects, not their UI.
- **Every release:** `scripts/bump.sh X.Y.Z`, add a `## [X.Y.Z]` section to `CHANGELOG.md`, run `npm test`, commit,
  push to `main`. No pull requests unless asked. The user creates the tag and release in the GitHub UI (tag pushes are
  blocked here). The release workflow builds the ZIP and takes its notes from the changelog.
- **Versions:** PATCH for fixes, polish, text and docs; MINOR only for a real new feature. When unsure, patch.
- **Commit messages** end with the two trailer lines `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and
  `Claude-Session: <session url>`.
- **Push:** `git -c push.negotiate=true push origin HEAD:main`.
- **Tests:** `npm test` runs everything (parser, e2e, features, updater, sync, recovery, install). Keep it green.
  Run it before every commit.
- **Desktop:** `desktop/` is an Electron wrapper (`npm run dist` there). It serves the same files from `app://`, has no network of its
  own and only calls `server/sync.php` on the address typed in Settings. Release builds run in `release.yml`.
- **Layout:** do not change the global page layout unless asked. Say what changed on screen.
- **Handoff file:** after a major change (new feature area, rule change, release that changes how things work), write
  the next `handoff/Tracker-Handoff-vN.md` (local only, gitignored, N+1 of the newest) and send it to the user.
- Shell tip: very long heredocs and inline Python with odd characters can be blocked by a safety check. Write helper
  scripts with the Write tool or use Edit.
