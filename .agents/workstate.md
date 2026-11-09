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
ceiling raised. Real APK property workflow remains unaccepted. Next: push,
bounded review, then freeze and run full exact-head gates.

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
