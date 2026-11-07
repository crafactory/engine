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

Final #79 local browser replay is still running as command 77548; do not edit runtime
source or install dependencies until it completes. Vite command 89044 serves 5173.
Persistent js_repl `engineUiBrowser`, `engineUiPage`, `engineUiErrors` are available.
Baseline screenshots: `/tmp/engine-ui-baseline-*.png`; accepted native files:
`/tmp/engine-bd6425b-native`. Managed browser_start failed; use working js_repl.

## Constraints and next checks

- No upstream plugin implementation inspection/copying or package modification.
- Verify author AND committer before every commit/merge; never inspect credentials.
- Follow CONTRIBUTING: effective initial review, bounded repairs, exact-head gates.
- Node 22: `/tmp/engine-node/node_modules/node/bin`; no overlapping builds/E2E.
- Freeze legacy ceilings; remove/reduce exceptions after extraction.
- Preserve separate Android chrome and desktop layout; no Node/Electron on Android.
- Return private Chinese results with matching accepted APK/evidence; empty final.
- PR/comment attribution:
  Created with [Perplexity](https://www.perplexity.ai/computer/tasks/6cd27721-c736-5d46-b8cf-1f89aa2c3cbe).
