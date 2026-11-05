# Mainstream plugin workflow gaps

## Current acceptance checkpoint

PR: https://github.com/crafactory/engine/pull/74 .
Frozen implementation: `e2eddc25eebc44fd107b18aa5266f1f1e021fb05`.
Local inventory/build, 869 units, 64 browser and 102 desktop tests pass; all 22 pinned
cases execute. Only the complete fresh `/tmp/engine-gaps-accept2-{worker,renderer}` pair
was published. Renderer: nine bounded passes, Excalidraw core Canvas refusal, Copilot
startup error. Actual Linux package passes all 11 targeted cases.
Initial effective review 5781526190 at `6fab5fb`; both threads and the event follow-up
were repaired in `e2eddc2`. Both threads are resolved. One incremental request was rate
limited (6653128941); do not repeat optional review requests.
Current matrix/API/popular-gap/report/verification documentation is aligned.
Read live PR state for final documentation-head Verify, three-platform builds, explicit
pinned-corpus eligibility and merge outcome. If already merged, sync main rather than
reopening this increment. Otherwise require those exact-head gates, no unresolved blocker,
record acceptance and use the authorized match-head squash merge, then sync main and email
the owner privately in Chinese with the verified outcome. No issue creation, agents or
upstream implementation inspection is authorized.
All earlier notes below are historical candidate observations, not the current verdict.

## Historical in-progress notes

## Baseline and scope

PR #73 merged at `7d2ea5a`; its card creation/save/switch/restart and owned-runtime focus
evidence is historical baseline, not completion/move/drag acceptance.
The owner now authorizes continuing Kanban and checking other plugins' real workflows,
recording observed gaps and implementing their original host fixes.

Branch: `compat/plugin-workflow-gaps`. Open an early draft PR and push small commits.
Use one or two effective CodeRabbit review/fix rounds; do not chase optional repeats.
No known blocking issue or failing exact-head checks may be bypassed. See CONTRIBUTING.
Do not spawn agents, create issues, inspect/copy upstream plugin implementations or rewrite
their pinned bundles/styles. Runtime DOM/API/exception observations and public docs are allowed.
Native profile is full OS-user trust, not isolation; use disposable vaults and allowlisted env.
The accepted narrow binary rename recreation race remains unchanged.

## Current increment

Expand black-box Kanban coverage to edits, completion, movement and pointer dragging.
Recheck all eleven existing pinned inputs in the full corpus; probe concrete Tasks and
Style Settings workflows instead of treating startup as compatibility. Copilot secret storage,
Excalidraw core Canvas, authenticated Git and cross-plugin context remain known gaps, not
promises of completion in this increment. Implement only observed, testable host contracts.

Draft [PR #74](https://github.com/crafactory/engine/pull/74) is open.
Four targeted Electron cases pass: Tasks query/completion without the old property-type
error, actual search/extra controls, property-type restart persistence and fourteen UIEvent
target/cross-window checks. The live type registry is profile-backed and vault-keyed, not
Obsidian types.json or a property editing UI. Only observed getAllProperties/setType are added.
Seven targeted cases now pass, additionally covering DOM factories, date previews and
large modal reachability after a plugin replaces its root CSS classes. A separate eighth
owned-suggestion-registry test passes against actual registrations, with no synthetic registry.
32 renderer contract units pass. Logs: `/tmp/engine-gaps-target3.log`,
`/tmp/engine-gaps-units3.log`, `/tmp/engine-gaps-suggest-test.log`.
The old PR #73 package fails search/property/UIEvent and DOM/modal regression cases.
The date-format probe initially hung because Playwright assimilated a fluent component's
then method; correcting the harness passed, not evidence of a product deadlock.
Style Settings probe18 falsified the proposed loaded-flag-only explanation; do not ship a
speculative flag refactor. Kanban probe13 edited/completed a card and created a second lane,
but its drag selector was wrong (no item-grip exists); no drag success is established.
Reports must only be regenerated from one accepted complete Worker/renderer pair; preserve
failed candidates and baseline evidence. Kanban settings and Style Settings remain probes.

Style Settings now passes an actual corpus workflow (4.9s): class-toggle, variable-text,
computed CSS, exact plugin JSON, search/clear and application restart/re-enable.
Root cause was host Component child ownership colliding with plugin-owned `children` data.
Symbol-backed ownership preserves guarded/proxy receivers; an initial #private-field
candidate fixed Style but broke guarded Kanban embeds and was replaced, not accepted.
The original isolated lifecycle regression fails on PR #73 and passes in the candidate.
Full units: 869 passed (`/tmp/engine-gaps-units4.log`); seven current UI contracts also pass
(`/tmp/engine-gaps-contract-final.log`). Style: `/tmp/engine-gaps-style-target.log`.
Kanban still fails genuine pointer dragging with a null dataset in dragStart. Runtime
exception/local-variable/DOM metadata only are being observed, never bundle bodies.
Initial CodeRabbit review was requested after marking PR #74 ready at `6fab5fb`; await
effective results. Current reports still intentionally retain the historical PR #73 pair.

08:14 UTC: initial effective review completed at `6fab5fb`, review 5781526190.
Fixed both actionable threads (4477918348 foreign factory chaining, 4477918357 own __proto__
assertion) and the follow-up viewless event construction-realm finding with original tests.
Foreign realms now install their own helpers; UIEvent type checks use the actual prototype
chain. Exposed the three already-implemented public search/extra/date control constructors.
Kanban root drag gap was onNodeInserted being registered after connection without an initial
delivery. Added cancellable initial microtask, once/reinsert coverage and public Node.detach
(cleanup had thrown after successful movement). Do not accept the earlier cleanup-error run.
Clean source acceptance now passes all 11 targeted cases, including real Kanban
edit/checkbox completion/frame-paced pointer movement/section ownership/exact saved bytes/
document switch/restart, plus Tasks, Style and eight host contracts.
Log: `/tmp/engine-gaps-target-final3.log`. Build16 is current runtime.
Frozen-source full verification is running: desktop2 with fresh accept2 Worker/renderer
report directories; units-final3/browser-final3; package `/tmp/engine-gaps-package`.
The preliminary desktop1 run is not final acceptance (runtime was changing); never use its
reports. Current tracked reports still intentionally retain PR #73 until accept2 completes.

## Environment and delivery

Node 22: `/tmp/engine-node/node_modules/node/bin`.
Pinned corpus: `/tmp/engine-plugin-corpus`. Main checkout: `/home/user/workspace/engine`.
Require source inventory/build/unit/browser/desktop, all pinned corpus cases without skips,
targeted packaged Linux behavior, effective review and exact-head cloud Verify/three-platform
packages/explicit corpus before authorized squash merge. Email results privately in Chinese.
The owner has received the starting acknowledgment; no results email has been sent.
