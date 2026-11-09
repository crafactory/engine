# Standard property editing

## Current focus

Owner accepted the standard appearance and asked to continue. PR #81 merged as
`26717a1`, with the same tree as accepted head `01e3450`. Next bounded increment:
registry property values/actions/type menu, composition confirmation and safe
empty/invalid numeric editing. Preserve vault-wide explicit type persistence.
Full Bases/query work and broad plugin partials stay outside this PR.

Branch `refactor/shadcn-properties`, baseline main `26717a1`. Draft PR #82 is open.
Baseline menu captured at `/tmp/engine-properties-before-menu.png`.
Existing Vite 5173 is healthy; js_repl `metadataBrowser`/`metadataPage` persist.

## Scope and verification

- Standard registry Input/Checkbox/Button/DropdownMenu with owned scoped resets.
- Remove property control appearance overrides; retain domain/platform layout.
- Preserve YAML types, explicit type state, plugin DOM and mobile shell.
- Add negative controls, draft/composition/empty-value and viewport tests.
- Early PR, bounded review/repairs, exact-head full check/browser/Electron/package/
  Android native gates, then merge before another increment.
- Previous CodeRabbit allowance was exhausted. Never treat skipped review as
  approval, repeatedly request review or inherit the old APK's acceptance.

## Current checkpoint

Registry properties and safe drafts implemented. Six corrected baseline negatives
failed as intended (one earlier list locator was invalid and is excluded).
Preliminary full check passed: 956 unit tests and build/style/structure/inventory.
All seven property cases and native menu Back have passed across focused runs;
new desktop exact-file restart passes. Two new browser fixture mistakes were
corrected: collapsed desktop sidebars before narrow layout, and explicitly opening
the native Note properties panel. No product relaxation/assertion weakening.
Existing native IME driver and browser bridge fixture extracted intact; no frozen
ceiling raised. At 118fcdd, 106 browser and 108 Electron tests passed. Packaged
suite was interrupted after 12 passes; it is not accepted. Android's first eleven
groups passed, but property IME readiness failed: native taps omitted the WebView
origin beneath system bars. Correcting against absolute UIAutomator WebView bounds
and adding pure touch geometry regressions; actual rerun is still required.

CodeRabbit completed one effective review of 118fcdd, three minor findings and a
blur-test nit. All three reproduced with corrected negatives (the first search
test used the wrong search signature and is excluded). Fixed null numeric search,
same-type re-selection and commit-time live native validity. Added both blur tests.
Included review allowance is now exhausted; do not request another review or
count an automatic skip as approval. Repair-focused replay passed all 15 selected
browser cases, including the three review findings and empty-native-state Escape.
The three parser/search/touch unit files passed 19 tests before the final Escape
addition. Native acceptance is 1046/1068 lines and App 3836/3846.
Three review threads resolved. At 307dc95, browser/Electron replays passed 114/108
and desktop packaging passed on all three platforms. Native acceptance failed:
UIAutomator reports both the physical WebView and a nested virtual accessibility
WebView. Fixed ancestry selection while still rejecting independent containers;
eight touch tests and the real failed XML pass. Freeze this follow-up for full
new-head acceptance. The final PR #82 acceptance comment is authoritative for
post-commit gates; this checkpoint deliberately records pre-acceptance evidence.
At 10c2d28, local check/browser/source Electron passed 965/114/108 and three-platform
packages passed. One Verify passed, another captured a rapid menu-exit fixture
timing timeout (not reproduced in 25 local repeats). Require closed menu and
restored trigger focus before fixture editing. Android then hit upstream 504 and
two Gradle download timeouts before native execution; bounded curl retries and a
60-second Gradle network timeout added without changing hashes/test assertions.
The 10c2 packaged replay was intentionally interrupted at 56 passes, not accepted.
No product or native completion claimed until the new-head gates pass.

## Constraints

- No agents, issues or upstream plugin implementation inspection/copying.
- Verify author AND committer before every commit/merge; no credentials inspection.
- Do not raise frozen source ceilings; Node 22 in `/tmp/engine-node/node_modules/node/bin`.
- No overlapping builds and Electron tests or watched source writes during replay.
- Desktop native trust is profile-wide; Android has no Node/Electron.
- Private Chinese results email through `send_email(cc=[])`, then empty final.
- PR/comments require:
  Created with [Perplexity](https://www.perplexity.ai/computer/tasks/6cd27721-c736-5d46-b8cf-1f89aa2c3cbe)

## References

- Prior acceptance: https://github.com/crafactory/engine/pull/81#issuecomment-6732058925
- Public property behavior: https://help.obsidian.md/properties
- `docs/UI.md`, `docs/PARITY.md`, `docs/REPLICATION-PLAYBOOK.md`.
