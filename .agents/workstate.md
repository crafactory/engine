# Kanban card and focus increment

## Authorization and baseline

[PR #72](https://github.com/crafactory/engine/pull/72) merged at `a1c79b7` after effective
review/fix rounds, exact-head green checks and a recorded quota exception. Its narrow binary
final-check-to-rename recreation risk remains accepted, not repaired.

Open PRs early and submit frequent reviewable commits. Normally use one or two effective
Review + Fix rounds, fix blocking findings with regressions, then allow the maintainer's
review-service exception only with no known blockers and exact-head green checks.
CONTRIBUTING is authoritative. No agents or issue creation authorized. Original host code
only: unchanged pinned plugin bundles/styles are black-box inputs, never inspected/copied.
Public declarations and runtime DOM/API/exception metadata are allowed.

## Current work and evidence

Branch `compat/kanban-card-workflows`, [PR #73](https://github.com/crafactory/engine/pull/73),
is ready for review. `ab431cc` adds lifecycle-owned own-runtime enabledPlugins admission,
revocation and registry cleanup. `0a84173` adds UIEvent ownership, detached Node fallback and
owned embedded-editor focus admission/routing, selection snapshots and stale/foreign context
handling. No Object.prototype workaround or shared plugin registry was introduced.

Complete Linux source acceptance: inventory/build, 866 units /49 files, 64 browser and 95
desktop tests. All 22 pinned corpus cases executed without skips. Both reports derive only
from `/tmp/engine-pr73-complete-{renderer,worker}`. Kanban now passes unchecked-card exact
save, switch and full restart/re-enable/reopen with no recorded runtime/console errors.
Two ownership/focus regressions plus real Kanban pass against the actual Linux package
`/tmp/engine-pr73-package/linux-unpacked/crafactory-engine` (three cases). The ownership
test fails against unchanged packaged PR #72. Failed implementation/harness candidates and
the initially incorrect executable filename remain distinct evidence in VERIFICATION.

Logs: `/tmp/engine-pr73-complete-{check,browser,desktop}.log`,
`/tmp/engine-pr73-packaged-acceptance.log`, `/tmp/engine-pr73-focus-baseline.log`.
Node 22: `/tmp/engine-node/node_modules/node/bin`; corpus: `/tmp/engine-plugin-corpus`.
No full compatibility claim: completion, later edits, movement, pointer dragging and
cross-plugin integration/focus sharing remain unverified or unsupported.

## Next delivery steps

The [initial effective CodeRabbit review](https://github.com/crafactory/engine/pull/73#issuecomment-6621975902)
completed on implementation head `0a84173`, with no actionable comments and no established
blocking defect; its check run completed successfully. Subsequent changes are reports/docs
only. Automatic later review is skipped because the repository has fewer than ten stars;
do not chase an optional manual repeat. Address any actual blocking findings with original
regressions. Require exact-head cloud Verify, all three package builds and an explicitly
dispatched corpus workflow before merge. Older-head runs do not certify a later head.

Merge only the verified exact head, sync main, then privately email the owner in Chinese
with PR #72/#73 results, accepted risk and remaining boundaries. No final results email
has been sent yet.
