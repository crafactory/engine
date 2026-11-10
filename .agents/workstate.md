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

Standard properties and safe drafts implemented. One effective CodeRabbit review
produced three findings; all reproduced, repaired and threads resolved. Do not
request another review or count a skip as approval. Corrected negative controls
exclude an invalid list locator and the first wrong-signature search test.

At 5e6baab, local full check/browser/source Electron passed 965/114/108, with all
eleven unchanged pinned inputs explicitly supplied to Electron. Both default
Verify runs passed (86 Electron plus 22 corpus skips, not full-corpus evidence).
Earlier actual APK failures prompted system-bar touch offsets and ancestry-based
physical WebView selection, plus eight geometry regressions. The fixture waits
for closed menus/restored focus. Native acceptance is 1046/1068 lines and App
3836/3846; no ceiling increased.

Owner resumed build repair on November 10 UTC. Download probe now matches pinned
Templater bytes; one retry recovered all three desktop CI packages on 5e6baab.
Android is still running. Local deb packaging exposed missing explicit homepage;
adding canonical repository homepage makes local AppImage/deb succeed without
checkout-specific repository inference. Freeze this follow-up for full new-head
gates. Do not inherit older APK/package acceptance. Interrupted 118fcdd/10c2d28
package runs were never accepted. Latest public checkpoint:
https://github.com/crafactory/engine/pull/82#issuecomment-6733080362

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
