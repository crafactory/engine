# Kanban card and focus workflows

## Baseline and authorization

[PR #72](https://github.com/crafactory/engine/pull/72) merged at `a1c79b7`.
Its repaired head `d82d9bc` passed inventory/build, 860 units, 64 browser and 93 desktop
cases, including all 22 pinned corpus cases; exact-head cloud verification, three-platform
packaging and pinned corpus passed. Completed effective reviews and regression fixes preceded
merge. Latest-head CodeRabbit review was quota-skipped; merge used the maintainer's explicit
exception, recorded in the PR. The binary recreation window remains accepted, not repaired.

The current branch `compat/kanban-card-workflows` starts the next increment with an early PR.
Open early, submit frequent reviewable commits, normally use one or two effective Review + Fix
rounds, and do not let review-service limits alone block green, reviewed-and-fixed work without
known blocking issues. CONTRIBUTING is authoritative. No issue creation or agents authorized.

## First blockers and acceptance

Unchanged pinned Kanban 2.0.51 currently creates/persists boards and lists and recovers them
after switching/restart. Card Enter fails with undefined `has`; embedded focus reports
undefined `setTimeout`. Do not claim card creation/completion/moves work yet.

Observe runtime DOM/API behavior and exception scopes without reading, copying or rewriting
plugin bundles/styles. Public declarations/docs and original host/fixture source are allowed.
Native tests keep explicit full trust and an allowlisted environment/temporary home;
this is not OS filesystem containment.

Find the smallest original host contract fixes, then verify actual card save, no focus
error, document switch and full restart/reopen. Add completion/list movement and pointer drag
only when their real workflows can be observed and verified. Preserve exact persisted content
and current unrelated plugin workflows; never hardcode behavior for one plugin.

## Work and evidence

The early [PR #73](https://github.com/crafactory/engine/pull/73) records scope and receives
incremental repairs. Runtime metadata identified a missing plugin-manager enabled Set,
not a missing keyboard modifier Set (that injected alternative failed). The original
manager now has stable own-runtime `enabledPlugins` admission/revocation, cleanup on failed
constructor/load/user-enable, and no stale getPlugin result after failure/stop.
It remains an own-runtime view, not cross-plugin discovery/API support.

29 targeted contract units and production build pass. The pinned real Kanban desktop case
now creates and persists an unchecked card, switches documents and restarts/re-enables/reopens
with the saved card visible. The targeted run passed; focus still logs missing setTimeout.
Log: `/tmp/engine-pr73-enabled-{units,build,kanban}.log`. No generated report pair has been
upgraded from this partial run. Full acceptance/review is still pending.

Public SDK declarations confirm Node and UIEvent doc/win helpers; only HTMLElement helpers
are currently installed. This is the next focus hypothesis, not a verified production fix.
Node 22 is `/tmp/engine-node/node_modules/node/bin`; unchanged corpus is
`/tmp/engine-plugin-corpus`. Previous accepted logs are `/tmp/engine-pr72-round3-*`.
Capture new probes separately and do not mix corpus report rows from different runs.
Keep generated support claims bounded and record failed candidates honestly.

Next: identify receiver/API contracts from runtime observations, commit focused regressions
and fixes frequently, run complete acceptance, request effective review and handle blocking
findings without optional review loops. The owner has received progress acknowledgments;
final results for PR #72 and this next-increment startup have not yet been emailed.
