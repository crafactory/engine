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

PR #75 is ready and initial CodeRabbit review has been requested. Implementation `7ae3db5`
fixes three reproduced causes: intrinsic table-input column sizing; per-build inline-image
context closures (with mapped ownership retained); and unchanged source-only block previews
being destroyed by external-note refresh. Negative logs are `/tmp/engine-live-negative.log`,
`/tmp/engine-live-image-negative.log`, `/tmp/engine-live-diagram-negative.log`.
All 869 units and production build passed; full-browser acceptance needs a rerun after
correcting a Mermaid-label test synchronization mistake (matching `C` in stylesheet text).
The full 102-case Electron/corpus run and Linux package build are running. Obtain effective
initial CodeRabbit review, repair findings and require green exact-head gates before merge.

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
