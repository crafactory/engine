# Mainstream plugin workflow gaps

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

## Environment and delivery

Node 22: `/tmp/engine-node/node_modules/node/bin`.
Pinned corpus: `/tmp/engine-plugin-corpus`. Main checkout: `/home/user/workspace/engine`.
Require source inventory/build/unit/browser/desktop, all pinned corpus cases without skips,
targeted packaged Linux behavior, effective review and exact-head cloud Verify/three-platform
packages/explicit corpus before authorized squash merge. Email results privately in Chinese.
The owner has received the starting acknowledgment; no results email has been sent.
