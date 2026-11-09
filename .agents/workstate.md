# Standard shadcn appearance

## Current focus

Owner continued UI/plugin parity work, then explicitly rejected the old custom
visual style surviving the shadcn migration. Prioritize actual New York/Neutral
appearance, not just primitive substitution. Properties/Bases functional changes
were only investigated, not implemented; keep them out of this increment.

Branch `refactor/shadcn-standard-appearance`, baseline main `69bc45c`.
No other open PR at start. Baseline desktop captured and inspected at
`/tmp/engine-metadata-baseline-desktop.png`. Existing Vite on port 5173 is healthy.
Use js_repl `metadataBrowser`, `metadataContext`, `metadataPage`, `metadataErrors`.

## Scope and verification

- Adopt official neutral semantic theme/radius tokens; retire old green aliases.
- Remove legacy overrides on migrated controls and restore scoped preflight
  assumptions without resetting plugin/editor DOM.
- Preserve platform-specific layouts and native targets/ownership.
- Record negative controls, rendered screenshots and regressions.
- Early draft PR, effective CodeRabbit review, bounded repairs, exact-head
  checks/native acceptance, then merge before starting another increment.
- Other forms/context menus/navigation and plugin partials remain incomplete.

## Current checkpoint

PR #81 is ready for review. Implementation `4876307` passed full check and 95
browser tests. Follow-up self-review repairs add explicit registry reset ownership,
unowned-slot regression, missing Android spacing and native-hydration readiness.
Their focused replay passed 21 tests. One effective CodeRabbit review then raised
two minor issues; both reproduced and repaired with added regressions. Freeze the
next commit for full check, 98 browser tests, all pinned-corpus Electron tests,
Linux package replay and Android native gate. Subsequent bot review skipped after
the included allowance; no approval claimed and no repeated review requests.
Do not treat initial native failures or the interrupted Electron run as acceptance.

## Constraints

- No agents, issues or upstream plugin implementation inspection/copying.
- Verify author AND committer before every commit/merge; no credential inspection.
- Do not raise source ceilings; Node 22 in `/tmp/engine-node/node_modules/node/bin`.
- No overlapping builds and Electron tests; no file writes during browser replay.
- Desktop native trust is OS-profile-wide; Android has no Node/Electron.
- Final private Chinese email via `send_email(cc=[])`, then empty final.
- PR/comments require:
  Created with [Perplexity](https://www.perplexity.ai/computer/tasks/6cd27721-c736-5d46-b8cf-1f89aa2c3cbe).

## References

- Previous accepted shared-controls increment:
  https://github.com/crafactory/engine/pull/80#issuecomment-6710669356
- Official theme scaffold: https://ui.shadcn.com/docs/theming
- Current behavior/coverage: `FLOWS.md`, `docs/UI.md`, `docs/PARITY.md`.
