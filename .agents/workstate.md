# Native drawing, board and Git increment

## Scope and current delivery

[PR #72](https://github.com/crafactory/engine/pull/72) is on `compat/native-drawing-board-git`,
after [PR #71](https://github.com/crafactory/engine/pull/71) merged at `e1dbd49`.
No agents were delegated. Upstream plugin bundles/styles remain unchanged, hash-pinned
black-box inputs; do not inspect, copy, modify or distribute their implementations.

Native access is explicit profile-wide full trust, not per-plugin isolation. Defaults remain
least-capability; grant/revocation needs restart and development HTTP cannot grant it.
The temporary native test home/environment is not OS filesystem containment.

## Latest maintainer direction

The maintainer accepted only the binary final-stat-to-rename recreation window:
an external deletion can still be followed by recreation with staged bytes.
Do not complicate storage further or describe this as repaired atomicity.
The accepted-risk thread is resolved; other correctness/security findings are not accepted.

The latest instruction supersedes the earlier mandatory repeated-latest-head-review gate:
open PRs early and push frequent commits; normally one or two effective Review + Fix
rounds are sufficient. If review is unavailable/rate-limited afterward, merge may proceed
with exact-head green required checks and no known blocking issue. Record the effective
reviews, repairs, verification and service limitation. Do not repeatedly request reviews
solely for bot approval. CONTRIBUTING now documents this policy; do not restore the old
quota-blocked-wait rule from historical notes.

## Current third-review repairs

The completed actual review of `ead4e7a` is
[5762696669](https://github.com/crafactory/engine/pull/72#pullrequestreview-5762696669).
Re-query GitHub for live IDs/state; an earlier compacted summary contained incorrect IDs.
Verified open thread data is `/tmp/engine-pr72-round3-live-threads.json`.
Prepared replies are `/tmp/engine-pr72-round3-replies.json`.

- Recreate detached main/left/right/overlay file views after a failed filesystem operation,
  retaining public view state and original IDs. Implicit extension views remain implicit.
  Attempt all owners/leaves and host mappings even if another restoration fails; preserve
  the original failure alongside recovery errors. Private plugin state is not guaranteed.
- Recheck each saved text draft immediately before its own detach. An earlier unload can
  mutate a later draft after the shared seal; abort and retain that later live draft.
- Flush source and destination plugin drafts before obtaining fresh merge content.
- Publish confirmed persisted trust profiles and subscribe only while Community is open;
  ignore stale initial responses and keep both restart notices independent.
- Read stylesheets in an original bounded child whose cwd is anchored to the initialized
  canonical root. Verify entered directories and the opened descriptor before reads;
  reject symlinks/non-regular files and absent inode identities, compare identities
  losslessly, cap allocation/growth, and apply a timeout. This secures this reader only,
  not every vault API. Symlinked config/package/style paths are unsupported.

## Verification and next actions

Current source passes inventory, 860 units /49 files and production build.
Four new Electron regressions all fail on unchanged `ead4e7a`; all four pass after repair,
including the actual packaged Linux executable. Packaged CSS loading/ownership/cleanup
also passes. The browser suite passes 64 cases; all 93 desktop cases passed, including
the 22 pinned corpus cases with no skips. Both reports have been regenerated from that run.
The first repair attempt passed 858 units but failed TypeScript on an optional captured ID;
that failed candidate is not acceptance evidence.

Use `/tmp/engine-pr72-round3-*` logs. Regenerate both reports exclusively from the new complete
pair `/tmp/engine-pr72-round3-complete-{renderer,worker}`, never from mixed runs.
Node 22: `/tmp/engine-node/node_modules/node/bin`; corpus: `/tmp/engine-plugin-corpus`.
The baseline worktree `/tmp/engine-pr72-round3-baseline` is temporary and read-only apart
from copied original test harnesses; remove it after recording the baseline.

Finish evidence/docs, commit/push, reply/resolve verified repaired threads and request one
consolidated latest-head review. Verify exact-head cloud verification, three-platform
packaging and explicitly triggered pinned corpus checks. Follow the latest review-service
exception if genuinely blocked with no known blocking issues; merge using match-head-commit.
Then sync main and start the Kanban card/focus/dragging increment with an early PR.
No new Kanban implementation has begun. No issue creation is authorized.

## Bounded plugin outcomes

- Excalidraw: real rectangle drawing/save/switch/restart preserves element ID/dimensions.
  Obsidian core Canvas still rejects; full Markdown mode is unverified.
- Git: actual stage/commit/local bare-remote push/peer pull/editor refresh pass.
  Internet authentication, signing, hooks, conflicts and backup are unverified.
- Kanban: board/list persistence/switch/restart pass; cards fail on undefined `has`,
  embedded focus reports undefined `setTimeout`; completion/moves remain unsupported.
- Tasks retains its property-type error despite a passing query/completion workflow.
  Copilot stops at unsupported secret storage; inference is untested.

The support matrix is canonical. Worker refusals and startup success are not full
compatibility. Preserve errors/classifications in generated reports. Deliver results
privately in Chinese to the owner; latest-request progress emails have been sent,
but no final results email for these repairs or the new review policy has been sent.
