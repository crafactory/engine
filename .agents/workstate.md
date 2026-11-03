# Native drawing, board and Git increment

## Scope and authorization

The user requested appropriate permission broadening and maximum practical Excalidraw, Kanban and Git functionality after [PR #71](https://github.com/crafactory/engine/pull/71) merged at `e1dbd49`. Implementation and evidence are on `compat/native-drawing-board-git` in [PR #72](https://github.com/crafactory/engine/pull/72); use the PR for live review/CI/merge state. No agents were delegated. Third-party bundles/styles remain unchanged, hash-pinned external black-box inputs; their implementation is neither inspected nor incorporated.

Native access is explicit, warned, profile-wide full trust, not per-plugin isolation. Least-capability defaults remain unchanged. Grant/revocation needs restart; development HTTP cannot enable native access. The native test environment excludes service credentials and uses a temporary home, but is not OS filesystem containment.

## Candidate verification

The complete candidate run finished successfully: inventory, 838 units across 47 files, production build, 79 desktop cases including all eleven Worker and all eleven renderer inputs, and 64 browser cases. Logs are `/tmp/engine-next-final2-check.log`, `/tmp/engine-next-final2-desktop.log` and `/tmp/engine-next-final2-browser.log`.

Both corpus reports were regenerated only from the complete candidate directories `/tmp/engine-next-final2-renderer` and `/tmp/engine-next-final2-worker`; no earlier probes were combined. Node 22 is at `/tmp/engine-node/node_modules/node/bin`, and immutable corpus inputs are at `/tmp/engine-plugin-corpus`.

Earlier failed candidates exposed a CM5 factory/specification mismatch, null-mode stream non-advancement, missing state copying and a rectangle-tool click/drag race in the harness. Original host repairs and tool-state synchronization are present and passed the complete run. The chronological verification note preserves the failed candidate.

## Workflow boundaries

- Excalidraw acceptance requires actual pointer drawing, file save, document switching and full application restart/re-enable/reopen with identical element identity/dimensions. The private Obsidian core Canvas dependency still rejects; preserve `BOUNDED_WORKFLOWS_WITH_ERRORS`.
- Git acceptance stages the actual index, commits a specific message, pushes to a disposable local bare remote, pulls a peer commit and verifies editor refresh. No credentials or Internet remote; authentication, signing, hooks, diff, backup and conflicts remain unverified.
- Kanban acceptance creates a board/list, persists Markdown and recovers after document switching/restart. Card Enter reproducibly fails on undefined `has`; embedded focus reports undefined `setTimeout`. The negative card test retains the error and checks that no card was saved. Do not claim card editing/completion/move or full support.
- Tasks retains its property-type error despite a passing query/completion workflow. Copilot advances through native module startup to the unsupported secret-storage boundary; authenticated inference remains untested.

The canonical current tracker is [PLUGIN-SUPPORT-MATRIX.md](../docs/PLUGIN-SUPPORT-MATRIX.md). Generated reports must preserve observed errors and grants. Original fixtures additionally cover binary permissions/bytes, retained views/mount leases, CM5 contracts, embedded CM6, newer subclass-owned data during save, and validated host layout restoration. Arbitrary plugin leaf state is not restored.

## Remaining delivery gate

Reports, verification and current tracker are aligned; inventory, diff and identity checks passed before the implementation commit. Follow CONTRIBUTING exactly: completed latest-head CodeRabbit review, all issues addressed, completed re-review after fixes, no unresolved threads, and green latest-head CI before merge. If review is unavailable or blocked, leave the PR open and report the blocker. Do not repeat the quota-limited earlier merge shortcut.

Delivery must distinguish PR/review/merge state, native full-trust risk and bounded compatibility gaps. No issue creation is authorized.
