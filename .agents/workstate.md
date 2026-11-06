# Android shared-code implementation and remaining compatibility gaps

## Current request and baseline

Owner authorizes implementation: continue unverified plugin workflows; compare Obsidian
gaps; fix severe Live Editing geometry/retriggering; evaluate shared-code Android options
and actually build/run the chosen framework. Android only. The private acknowledgment
was already emailed; final results go privately in Chinese.

PR #74 is merged at `afe83d439f7b58b42b3182d456614f039316222c`.
Do not restart it or present its historical test counts as new evidence.
PR #75 is merged at `191e8529c8ba52774eb87c1f3db984bbfa4ee16d`.
Current branch: `feat/android-shared-app`.

## Active increment

PR #75 completed effective review/fixes, both review threads resolved, exact-head Verify
and three-platform packaging green, independent pinned corpus run `42171152821` green.
Optional incremental review was quota-limited and was not chased. Its frozen local
acceptance was 869/49 units, 70 browser, 104 Electron incl. all 22 pinned corpus cases
without skips, and 23 actual Linux-package vault cases. Those are historical #75 results,
not Android acceptance.

Android scaffold now uses pinned Capacitor 8.6.0, generated Android project and
`capacitor.config.ts`. See `docs/ANDROID.md` for the framework decision, primary sources,
pilot scope and acceptance gates. No APK has been built/run yet. Native storage, bootstrap,
mobile UI, lifecycle/back/keyboard, plugin platform flags and native CI are still pending.
Open a small early PR, then implement/test inside it.

`npm audit --omit=dev` also exposed existing DOMPurify, markdown-it and moment advisories.
Assess/update these compatible direct dependencies before shipping the native bridge;
do not run a broad/forced dependency upgrade.

## Next increments

- Android decision: Capacitor preserves the existing React DOM/CodeMirror/plugin UI.
  React Native requires a component rewrite; Tauri adds Rust/NDK tooling. Official Obsidian
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
