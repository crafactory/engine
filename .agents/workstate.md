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

Ready PR #76 implements pinned Capacitor 8.6.0, private filesystem/state/history/assets,
pre-App bootstrap, native lifecycle/Back/keyboard/share, touch navigation, Platform and
desktop-only-plugin refusal. Effective CodeRabbit review `5796771964` covered `812b2a7`;
all 11 findings were repaired and threads resolved. The review allowance is exhausted:
do not chase optional review; no known blocker/failing exact-head gate may be bypassed.

Frozen desktop acceptance on runtime `fcd3b9d` passes 70 browser, 104 Electron including
all 22 unchanged corpus scenarios without skips, and 23 actual Linux-package vault cases.
Expanded unchanged Style Settings verifies five controls, exact plugin data/CSS and restart;
the missing SliderComponent.setDynamicTooltip was implemented. That freeze passes
911/56 units; the final visual follow-up raises units to 915/56, with check/build and the
CSS-only mobile regression/old-shrink negative control passing.

Native run `42184825123` on `a448d11` accepts nine complete groups, including real IME,
assets/history, rotation/worker/renderer identity, modal/ribbon Back, unchanged pinned
Style Settings, native save failure/root-Back recovery, isolated background save and
restart data/trust recovery, real chooser/ZIP bytes, permissions and release-IME exclusion.
Visual QA then finds canceled-share error banners and native settings-label overlap.
Both are repaired and now explicit strengthened native assertions, not inherited passes.
Strict original IME parser requires bound input view AND visible window, not request flags,
and retains complete dumps. Final sequential full regression is command 13067; use
its completed finalqa logs and all final-head cloud checks before merge/delivery.

## Next increments

- Android decision: Capacitor preserves the existing React DOM/CodeMirror/plugin UI.
  React Native requires a component rewrite; Tauri adds Rust/NDK tooling. Official Obsidian
  docs confirm WebView and no Node/Electron on mobile, not specifically Capacitor.
- Hosted emulator pipeline works; no local SDK is needed. Debug-only owned IME uses real InputConnection,
  is disabled by default/DUMP-protected, and must be absent from the release manifest.
- Android/parity/verification and single plugin matrix docs are aligned. Require all
  final-head Verify, three-platform packaging, strengthened Android and independent corpus gates.
  Merge #76, sync clean main, remove the scratch `ci/android-native-composition` branch,
  and privately email the accepted matching APK/hash/report and scope limitations.
- Continue bounded remaining plugin workflows. Keep `docs/PLUGIN-SUPPORT-MATRIX.md` the
  single external-plugin verdict tracker; add an Obsidian host gap/Android decision document.
  Core Canvas, Copilot secrets/inference, authenticated/conflicted Git and many secondary
  workflows remain open; startup or a responsive screenshot is not full compatibility.

Never overlap dist rebuilds with E2E or reuse concurrent Playwright output directories.
Native artifacts from failed runs are diagnostic inputs, not final accepted APKs.
Critical: `bridge.ts` snapshots window.engine at module initialization; bootstrap installs
the Android bridge BEFORE dynamically importing App, not statically importing App first.

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
