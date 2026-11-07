# Shared shadcn controls

Owner requests oxlint/oxfmt, file/structure limits and shadcn application controls,
continuing Android and bounded plugin parity. No agents or issue creation.

## Completed increment

PR #79 merged as `c62ab02`, accepted head `bd6425b`. All formatting/lint/structure,
inventory, 944 unit tests and build pass; both Verify runs and three OS packages pass.
Independent unchanged corpus: 11 Worker + 11 renderer scenarios pass. Native run
42388655598 passes all 11 groups; downloaded artifact 13580657712 and inspected
portrait/landscape. APK SHA256:
`8cf4232975333af572a43e095ecaa050860365c3b33f1a8d05b100bc01232e93`.
Report retains expected missing-file/share-cancel/injected-save-failure diagnostics.

Effective CodeRabbit review 5813357111 on `5def3cb`: all four findings repaired in
`0af1727`, replied to and resolved. Final mechanical adoption `bd6425b` uses current
files, not snapshot restoration. Original 216 and remaining 137 executable JS/TS
files have matching normalized compiled ASTs; CSS is outside that bounded comparison.
Final bot check skipped after included-review limit; documented owner-authorized
post-effective-review exception, not bot approval. Three large diffs unavailable to
bot were manually inspected. No temporary source-format exclusions remain.

## Current increment

Branch `refactor/shadcn-shared-controls`, baseline `c62ab02`. Open a draft early,
then migrate registry Dialog/Command/Input/Textarea/Switch and application Button use.
Extract settings into focused modules below 500 lines rather than raising ceilings.
Preserve fuzzy ranking/create behavior, keyboard/focus return and imperative plugin
DOM. Validate settings-plugin modal coexistence, native Back and portrait/landscape
navigation. Do not imply every application surface or plugin is already certified.

PR #80 now implements the shared-control scope. Full local check/944 units, four new
browser regressions and real Electron nested-modal/DOM-identity regression pass.
Settings is below 500 lines, CommunitySettings 266; no raised legacy ceilings.
Before review-ready, publish this implementation; then effective CodeRabbit review,
bounded repairs and exact-head full browser/desktop/package/corpus/native gates.
Non-modal settings/pointer scrim is documented: no background keyboard-trap claim.
`c00ff6f` passes fresh local 87/87 browser and 105/105 desktop/corpus. Subsequent
Dialog/Sheet React 18 portal ref repair and fifth console regression need a new head
and fresh gates. Preserve actual menu Escape/selection and modal/container assertions.

Final #79 local replay ended 81 passed/2 failed during accidental Vite full reloads
caused by checkout/docs writes. Both failures passed an isolated stable diagnostic
replay; do not claim a fresh final-head 83/83. Vite command 89044 serves 5173.
Persistent js_repl `engineUiBrowser`, `engineUiPage`, `engineUiErrors` are available.
Baseline screenshots: `/tmp/engine-ui-baseline-*.png`; accepted native files:
`/tmp/engine-bd6425b-native`. Managed browser_start failed; use working js_repl.

## Constraints and next checks

Effective CodeRabbit review 5813746556 covered `ef8a3fa`: three actionable findings.
All three reproduced in new browser negative controls (prompt replacement, whitespace
IDs, layered native-select padding). Repairs preserve the mounted focus scope, encode
cmdk values reversibly and move the padding override into the existing base layer.
The optional selected-result IME case is also covered. Fresh repaired-head gates pending.

`ef8a3fa` local full browser 88/88 and desktop/corpus 105/105 passed. Both Verify,
three packages and native acceptance passed. Independent corpus run 42392098113
failed only Dataview's existing inline assertion. Diagnostic black-box replays
(four ordinary, eight CPU-throttled and three delayed-static-render cases) passed;
they do not establish the CI failure's cause. Original controlled fixture independently
reproduced premature retirement of an async child admitted before DOM insertion.
Track first attachment before removal-based retirement, retaining unconditional
session/registration cleanup; add attachment and never-attached cleanup regressions.
Do not claim this proves the Dataview failure's root cause. Keep its assertion unchanged,
attach actual DOM/screens on failure, and require fresh independent corpus acceptance.

Repaired source full check passes (944 units/build), fresh-server focused browser
15/15 and focused Electron/real-Dataview 3/3 pass. Preserve these as pre-commit evidence,
not final exact-head acceptance. Vite 6 cached an empty Dialog transform after formatting;
curl confirmed it, fresh-server replay fixed the environment and passed all cases.
Current Vite command 86869, log `/tmp/engine-ui-review-dev.log`. No more source/docs
writes during final browser replay; no overlapping build and desktop replay.

- No upstream plugin implementation inspection/copying or package modification.
- Verify author AND committer before every commit/merge; never inspect credentials.
- Follow CONTRIBUTING: effective initial review, bounded repairs, exact-head gates.
- Node 22: `/tmp/engine-node/node_modules/node/bin`; no overlapping builds/E2E.
- Freeze legacy ceilings; remove/reduce exceptions after extraction.
- Preserve separate Android chrome and desktop layout; no Node/Electron on Android.
- Return private Chinese results with matching accepted APK/evidence; empty final.
- PR/comment attribution:
  Created with [Perplexity](https://www.perplexity.ai/computer/tasks/6cd27721-c736-5d46-b8cf-1f89aa2c3cbe).
