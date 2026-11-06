# Live Editing stability, Android and remaining compatibility gaps

## Current request and baseline

Owner authorizes implementation: continue unverified plugin workflows; compare Obsidian
gaps; fix severe Live Editing geometry/retriggering; evaluate shared-code Android options
and actually build/run the chosen framework. Android only. The private acknowledgment
was already emailed; final results go privately in Chinese.

PR #74 is merged at `afe83d439f7b58b42b3182d456614f039316222c`.
Do not restart it or present its historical test counts as new evidence.
Current branch: `fix/live-preview-stability`.

## Active increment

PR #75 current pushed head `d492918` has effective initial CodeRabbit review `5796123711`.
Both findings are valid: invisible sanitized Mermaid labels and stale frozen columns on
container resize. LOCAL UNCOMMITTED fixes now render native SVG text without relaxing
DOMPurify and track edit-container resize while retaining draft/focus. Original negative
logs also cover initial table column redistribution, per-build image context closure,
unrelated-note diagram replacement, invalid root image paths and stale decoded asset bytes.

Source/test implementation is frozen; latest build includes root-image path fix and
per-asset size/mtime snapshots through App/editor-view props. Fresh full acceptance
PASSED with `/tmp/engine-live-accept-*`: 869/49 units, 70 browser, 104 Electron incl. all
22 pinned corpus cases without skips, plus all 23 vault cases against the actual
`/tmp/engine-live-accept-package`. The actual package screenshot was inspected and saved
to `docs/images/live-stability.png`. Earlier 69/103 runs are superseded, not final evidence.

Local verification and QA docs are aligned. Next: commit (verify identities), push,
reply/resolve both review threads:
`PRRT_kwDOVKvdS860Y8uu` (comment 4489340111 labels),
`PRRT_kwDOVKvdS860Y8u2` (comment 4489340119 resize).
Optional incremental review may be quota-limited (one/hour; initial around 05:31 UTC).
Do not chase it after this effective review/fix round, but require green exact-head checks
and no known blocker before authorized squash merge and clean main sync.

## Next increments

- Android decision: Capacitor preserves the existing React DOM/CodeMirror/plugin UI. Compare
  React Native's component rewrite and Tauri's extra Rust/NDK toolchain. Official Obsidian
  docs confirm WebView and no Node/Electron on mobile, not specifically Capacitor.
- Use current Capacitor v8 requirements, not stale v7. Implement persistent app storage,
  keyboard/IME/back/lifecycle and responsive navigation in a separate early PR; attempt
  an APK and actual emulator/device run. No Android/JDK tools currently on PATH.
- Continue bounded remaining plugin workflows. Keep `docs/PLUGIN-SUPPORT-MATRIX.md` the
  single external-plugin verdict tracker; add an Obsidian host gap/Android decision document.
  Core Canvas, Copilot secrets/inference, authenticated/conflicted Git and many secondary
  workflows remain open; startup or a responsive screenshot is not full compatibility.

Detailed next-increment architecture/CI/native WebView acceptance and bounded Style Settings
mobile workflow ideas: `/tmp/engine-android-working-notes.md`. Not implemented yet. Critical:
`bridge.ts` snapshots window.engine at module initialization; bootstrap must install the
Android bridge BEFORE dynamically importing App, not statically import App first.

## Constraints

No agents or issue creation. Never inspect/copy upstream plugin implementations or change
pinned bundles/styles. Public declarations/docs and runtime black-box observations only.
Use feature branches/early PRs, verified author/committer before every commit, effective
initial CodeRabbit review and no known blocker/failing exact-head checks at merge. After
one or two effective review/fix rounds, optional review quota limits do not block delivery.
The narrow binary check/rename race remains explicitly accepted, not fixed.

## References

Project: `CONTRIBUTING.md`, `docs/REPLICATION-PLAYBOOK.md`; log `.agents/worklog/2026-11-06.md`.
Corpus `/tmp/engine-plugin-corpus`; Node 22 `/tmp/engine-node/node_modules/node/bin`.
Prior request history: read-only `~/.perplexity/sessions/6cd27721-c736-5d46-b8cf-1f89aa2c3cbe/`.
