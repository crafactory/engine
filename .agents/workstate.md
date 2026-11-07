# Android content-first shell and remaining partial workflows

## Active request

Owner asks to continue partial capabilities and give Android a minimal, editor-first
shell based on their attached mobile screenshot. Keep desktop styles/behavior separate.
Private acknowledgment was queued; delivery is not confirmed. No agents or issues.

## Current increment

Main baseline `36ce630` includes merged Footnotes PR #77. New branch
`feat/android-minimal-shell` implements separate Android chrome/styles, top entry points,
six-button bottom pill, real tab management and a Tools sheet. Desktop ribbon/tabs/status
are not mounted on Android. Preserve desktop layout while saving separate mobile layout;
mobile startup/workspace loads do not restore desktop splits/drawers.

Implementation is in progress, not accepted. Update browser/native selectors to the real
new entry points without weakening existing filesystem/IME/plugin/export assertions.
Add focused mobile interaction/layout regressions; run check, browser, desktop/package
and exact-head native acceptance. Inspect screenshots and console. Open PR early, require
an effective CodeRabbit review and bounded repairs, resolve known blockers, then merge
only passing exact-head gates. Verify author AND committer before every commit/merge.

## Next increment

Owner additionally requests oxlint/oxfmt, file-length/structure enforcement, and shadcn/ui
instead of bespoke UI widgets. A private acknowledgment was queued for that request.
Adapt this still-in-development shell PR to registry-generated shadcn Button/Sheet before
review/merge; preserve plugin host lifetimes and native Back/focus behavior.
After this PR's complete review/repair/merge cycle, establish oxlint/oxfmt plus CI and
bounded file/structure policy in its own PR; then migrate remaining shared UI in small,
verified increments. Continue concrete partial capabilities such as bookmark groups
without building a second bespoke widget system.
Other incomplete items remain in the parity/plugin ledgers; don't claim full certification.
Deliver private Chinese results by send_email(cc=[]), including actual merged changes,
matching APK/evidence if available and remaining limitations, then empty final.

## Constraints and references

- Never inspect/copy upstream plugin bodies or modify pinned bundles/styles.
- No main development pushes, no issue creation. Keep accepted narrow rename risk.
- `CONTRIBUTING.md`, `docs/REPLICATION-PLAYBOOK.md`, `docs/ANDROID.md`, `FLOWS.md`.
- Node 22: `/tmp/engine-node/node_modules/node/bin`; checkout `/home/user/workspace/engine`.
- Do not overlap dist rebuilds/E2E or Playwright output directories.
- `bridge.ts` captures window.engine at import: bootstrap must precede dynamic App import.
- Canonical attribution: Created with [Perplexity](https://www.perplexity.ai/computer/tasks/6cd27721-c736-5d46-b8cf-1f89aa2c3cbe).
