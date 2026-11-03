# Native drawing, board and Git increment

## Scope and authorization

The user requested appropriate permission broadening and maximum practical Excalidraw, Kanban and Git functionality after [PR #71](https://github.com/crafactory/engine/pull/71) merged at `e1dbd49`. Implementation and evidence are on `compat/native-drawing-board-git` in [PR #72](https://github.com/crafactory/engine/pull/72); use the PR for live review/CI/merge state. No agents were delegated. Third-party bundles/styles remain unchanged, hash-pinned external black-box inputs; their implementation is neither inspected nor incorporated.

Native access is explicit, warned, profile-wide full trust, not per-plugin isolation. Least-capability defaults remain unchanged. Grant/revocation needs restart; development HTTP cannot enable native access. The native test environment excludes service credentials and uses a temporary home, but is not OS filesystem containment.

## Initial candidate verification

The complete candidate run finished successfully: inventory, 838 units across 47 files, production build, 79 desktop cases including all eleven Worker and all eleven renderer inputs, and 64 browser cases. Logs are `/tmp/engine-next-final2-check.log`, `/tmp/engine-next-final2-desktop.log` and `/tmp/engine-next-final2-browser.log`.

Both corpus reports were regenerated only from the complete candidate directories `/tmp/engine-next-final2-renderer` and `/tmp/engine-next-final2-worker`; no earlier probes were combined. Node 22 is at `/tmp/engine-node/node_modules/node/bin`, and immutable corpus inputs are at `/tmp/engine-plugin-corpus`.

Earlier failed candidates exposed a CM5 factory/specification mismatch, null-mode stream non-advancement, missing state copying and a rectangle-tool click/drag race in the harness. Original host repairs and tool-state synchronization are present and passed the complete run. The chronological verification note preserves the failed candidate.

## Workflow boundaries

- Excalidraw acceptance requires actual pointer drawing, file save, document switching and full application restart/re-enable/reopen with identical element identity/dimensions. The private Obsidian core Canvas dependency still rejects; preserve `BOUNDED_WORKFLOWS_WITH_ERRORS`.
- Git acceptance stages the actual index, commits a specific message, pushes to a disposable local bare remote, pulls a peer commit and verifies editor refresh. No credentials or Internet remote; authentication, signing, hooks, diff, backup and conflicts remain unverified.
- Kanban acceptance creates a board/list, persists Markdown and recovers after document switching/restart. Card Enter reproducibly fails on undefined `has`; embedded focus reports undefined `setTimeout`. The negative card test retains the error and checks that no card was saved. Do not claim card editing/completion/move or full support.
- Tasks retains its property-type error despite a passing query/completion workflow. Copilot advances through native module startup to the unsupported secret-storage boundary; authenticated inference remains untested.

The canonical current tracker is [PLUGIN-SUPPORT-MATRIX.md](../docs/PLUGIN-SUPPORT-MATRIX.md). Generated reports must preserve observed errors and grants. Original fixtures additionally cover binary permissions/bytes, retained views/mount leases, CM5 contracts, embedded CM6, newer subclass-owned data during save, and validated host layout restoration. Arbitrary plugin leaf state is not restored.

## Earlier review checkpoints

CodeRabbit completed review of `0a472a4` with sixteen inline findings and two review-body follow-ups. The corrected repair source passed inventory, 841 units across 47 files, build, 64 browser cases and all 83 desktop cases, including all 22 pinned corpus cases without skips. Rename/trash additionally passed three targeted repetitions. Logs use `/tmp/engine-pr72-{repairs-final-check,final-browser,final-desktop,rename-repeat}.log`. Reports were regenerated exclusively from `/tmp/engine-pr72-final-renderer` and `/tmp/engine-pr72-final-worker`.

The earlier repair desktop candidate had 82 passes and one premature rename-fixture assertion, plus a Kanban startup downgrade that a generic diagnostic case incorrectly accepted. Neither that downgrade nor mixed corpus rows is acceptable. The redundant `_loaded` assignment fix and explicit corpus workflow ratchet prevent that regression. Verification preserves the failed candidate.

Review data and thread IDs are in `/tmp/engine-pr72-{reviews,review-comments,review-threads}.json`; prepared inline replies are `/tmp/engine-pr72-review-replies.json`. Use the PR for live reply/resolution/re-review/CI state after this source checkpoint. Follow CONTRIBUTING exactly: completed latest-head CodeRabbit review, all issues addressed, completed re-review after fixes, no unresolved threads, and green latest-head CI before merge. If review is unavailable or blocked, leave the PR open and report the blocker. Do not repeat the quota-limited earlier merge shortcut.

Final strengthened checkpoint: 843 units /48 files, inventory/build, 64 browser cases and
83 desktop cases passed, including all 22 pinned corpus cases; final report directories are
`/tmp/engine-pr72-reviewed-{renderer,worker}`. Host path registration now has direct pure tests
because the same-leaf UI case also passed the pre-repair baseline. Original baseline probes
gave six unit failures /54 passes and three desktop failures /one pass. A later candidate's
Excalidraw restart failed before waiting for plugin enable completion; both restart fixtures
now await the checked control, and three targeted Excalidraw repetitions passed. See the
verification log for separate failed-candidate evidence and exact paths.

All initial sixteen review threads have individual replies and were resolved after fixes;
both review-body follow-ups were answered in the re-review request. The subsequent completed
[review of `64b89c2`](https://github.com/crafactory/engine/pull/72#pullrequestreview-5757536733)
reported seven inline findings and two review-body follow-ups. The previous temporary quota
block is historical, not evidence of the current quota state.

## Current second-review repairs and delivery gate

The repair source bounds stylesheet reads through an open handle; remembers explicit leaf
activation; publishes activation overrides only after a successful host open; prepares and
seals all owners' file views before retiring any; skips host-owned repeat saves after sealing;
flushes plugin drafts before constructing merge content; derives both restart notices from
saved versus startup-active privileges; and marks asynchronously rejected Editor instances
stale while preserving rejected writes until settle observes them.

Six new desktop regressions passed together. Full source checks passed with 850 units across
48 files and the existing build-size warning. Complete validation also passed all 64 browser
and 89 desktop cases, including all 22 pinned corpus cases with none skipped. Reports were
regenerated only from `/tmp/engine-pr72-round2-complete-{renderer,worker}`. The six desktop
regressions on unchanged `64b89c2` produced five expected failures and one already-passing
retention case; the baseline worktree was removed. Use the current logs under
`/tmp/engine-pr72-round2-*`, not the earlier 843-unit reports, for this repair candidate.

Binary finding `4458871645` is NOT resolved. A post-staging file-identity check catches deletion
during staging, but cannot atomically require existence at rename publication. The explicit
probe `/tmp/engine-pr72-binary-final-race.mjs` reproduced target recreation when unlink occurs
after the final stat and immediately before rename. Do not describe that recheck as atomic or
resolve its thread without a real repair or reviewer-accepted contract change. Reverting to
truncate-in-place would reintroduce the earlier data-loss finding.

Do not merge while this finding or any other issue remains unresolved. Request and inspect
review of the latest repair head after pushing, but even a green check does not close the
known race. Latest-head review and CI must be separately verified. No latest-request results
email has been sent at this checkpoint.

Delivery must distinguish PR/review/merge state, native full-trust risk and bounded compatibility gaps. No issue creation is authorized.
