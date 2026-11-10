# Live table composition continuity

## Current focus

Owner asked to repair #82 and continue quality/function coverage. #82 is merged
as e594b90, tree identical to accepted head 04cfb4f. Final evidence:
https://github.com/crafactory/engine/pull/82#issuecomment-6759533823.

Branch `fix/live-table-composition`, baseline main e594b90. Draft PR #83 is open.
Interactive candidate Enter prematurely commits 中 and removes the table input.
Five browser negative controls confirm composing-key and blur failures. Ordinary
Escape check had a multiline textContent harness error, now corrected; not a bug.
Corrected baseline: five failures and one pass.

## Scope and verification

- Protect the active table input from composing Enter/Tab/Escape, native
  isComposing and keyCode 229; defer composing blur to final compositionend value.
- Preserve DOM, measured columns, following-block geometry and normal navigation.
- LivePreview is at its frozen 997-line ceiling: move only the existing table
  component to the approved ui/blocks domain; no wider widget refactoring.
- Native gate must hold real InputConnection composition, use native keys,
  keyboard Back/rotation, exact private-file bytes and restart.
- Early PR, bounded CodeRabbit review/fix, exact-head full check/browser/source
  Electron/Linux package/Android gates; merge before another increment.

## Current evidence

Repair implemented, candidate full check 965, focused browser 12 and new desktop
exact-byte/restart case 1 passed. Native held-composition helper implemented but
not yet run. Next: ready PR, bounded review/fixes, exact-head all gates.

Negative-control log `/tmp/engine-table-negative-corrected.log`; interactive baseline image
`/tmp/engine-live-table-composition-before.png`. Corrected tests still need replay.
Existing Vite 5173 remains running. Persistent js_repl `liveQualityBrowser`,
`liveQualityContext`, `liveQualityPage` are owned QA handles.
They now show a fresh Table continuity note, not the Welcome table restored on
preview reload. Final phone draft/desktop Tab screenshots inspected; no page
errors. Local check and desktop command finished, no build/test is running.

Accepted #82 files are shared, but no results email has been sent for the current
request yet. Fold this increment's outcome into a single private Chinese email;
do not send another acknowledgment. Disk has 3.4 GiB free; retain accepted
evidence/corpus and avoid overlapping local builds/Electron runs or watched
source/docs edits during replay.

## Constraints

- No agents, issues or upstream plugin implementation inspection/copying.
- Verify author AND committer before every commit/merge; no credentials inspection.
- Do not raise frozen ceilings; Node 22 `/tmp/engine-node/node_modules/node/bin`.
- Desktop trust is OS-profile-wide; Android has no Node/Electron.
- Use `send_email(cc=[])` for private Chinese results, then empty final.
- PR/comments footer: `<sub>Created with [Perplexity](https://www.perplexity.ai/computer/tasks/6cd27721-c736-5d46-b8cf-1f89aa2c3cbe)</sub>`
