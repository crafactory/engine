# Replication Runbook

Operational companion to [REPLICATION-PLAYBOOK.md](REPLICATION-PLAYBOOK.md). The playbook explains
why the moves work; this runbook gives the concrete sequence, commands, templates and checks.

Commands are written for this repository. Replace paths and commands when applying the runbook to
another project; keep the evidence structure.

## 0. Start clean

```sh
git checkout main
git fetch origin
git reset --hard origin/main
git status -sb
```

Create one branch per vertical slice:

```sh
git checkout -b <type>/<short-scope>
```

Before changing code, write down:

- user-visible workflow being changed;
- current first blocker;
- evidence layer that will prove it;
- what is explicitly **not** being claimed.

## 1. Increment runbook

Use this for a normal feature or compatibility advance.

1. **Reproduce or observe.**  
   Run the smallest real input. Capture the failure, screenshot, console error, file result or
   missing state.
2. **Classify the change.**  
   Host primitive, adapter semantic, policy/security, product behavior or documentation.
3. **Choose the smallest move.**  
   Probe, wrapper, contract change, adapter fix, security opt-in or UI fix.
4. **Implement one slice.**  
   Avoid unrelated refactors in the same PR.
5. **Add the nearest regression test.**  
   Prefer a real workflow over a mock. Add an exact-byte/state assertion when data is involved.
6. **Run the evidence layer.**  
   Unit for local semantics, browser for interaction, desktop for host behavior, corpus for
   external compatibility.
7. **Record the state.**  
   Update the tracker/worklog and state the new first blocker.
8. **Merge and resync.**  
   Only after CI is green on the latest head; then reset main before the next slice.

## 2. New external-plugin compatibility runbook

This is the concrete Dataview/Templater loop.

1. **Pin the artifact.**  
   Add release tag, manifest version, repository, license metadata and SHA-256 for `main.js` and
   `manifest.json` to `docs/compatibility/community-corpus.json`.
2. **Download and verify.**
   ```sh
   ENGINE_PLUGIN_CORPUS=/tmp/engine-plugin-corpus node scripts/corpus.mjs
   ```
3. **Write the smallest workflow.**  
   Add a conditional case to `e2e-desktop/renderer-corpus.spec.ts` and fixtures in a disposable
   vault. Assert a user-visible result, not just “the enable switch is checked.”
4. **Run it.**
   ```sh
   ENGINE_PLUGIN_CORPUS=/tmp/engine-plugin-corpus \
   ENGINE_RENDERER_CORPUS_REPORT=/tmp/engine-renderer-corpus-results \
   npx playwright test -c playwright.desktop.config.ts e2e-desktop/renderer-corpus.spec.ts
   ```
5. **Record the outcome.**  
   `UNSUPPORTED_STARTUP`, `LOAD_ERROR`, `STARTUP_ONLY`, `BOUNDED_WORKFLOWS_PASS` or a new explicit
   state; include the first blocker and executed workflows.
6. **Fix one first blocker.**  
   Prefer adapter code over host changes. If a host primitive is missing, add a typed contract
   capability, not an Obsidian-shaped operation name.
7. **Rerun the same workflow.**  
   Do not expand the workflow until the current one passes.
8. **Refresh evidence.**  
   Run the manual corpus workflow, download the artifact, update
   `renderer-community-results.json`, the support matrix and the compatibility docs.

Rules:

- A skipped corpus is not a pass.
- A startup-only result is not a workflow pass.
- A negative rejection is valid evidence.
- Do not claim broader compatibility from one passing query/template.

## 3. Contract extraction runbook

Use when a capability is currently hardcoded in the app or shared by multiple consumers.

1. **List call sites and concrete dependencies.**  
   Note every import of the implementation and every behavior the consumer relies on.
2. **Define the narrow contract.**  
   Host primitives, lifecycle, capabilities and typed callbacks. Do not expose reference-API
   classes or concrete implementation types.
3. **Implement a provider/adapter.**  
   Preserve current behavior first; no feature changes in the extraction PR.
4. **Add contract tests.**  
   Cover registration/replacement/disposal, missing dependency, provider parity and failure paths.
5. **Switch one consumer.**  
   Keep the old path until the new path is green.
6. **Delete the old path.**  
   Remove fallbacks and imports; add a static test that the kernel doesn't import product code.
7. **Document the boundary.**  
   Update the service spec and architecture checklist.

Stop if the contract changes every time an adapter detail changes. That is a leak.

## 4. Lifecycle bug runbook

Use for startup, unload, late async callbacks, editor/view remounts, subscriptions or plugin
sessions.

1. **Capture the original error.**  
   Check whether cleanup/unload is masking the startup error. Preserve the first failure.
2. **Reproduce on clean main.**  
   If it fails there too, it is pre-existing; do not blame the branch.
3. **Draw ownership.**  
   Who owns the registration, child, timer, view, session or promise?
4. **Add generation/cancellation.**  
   Late work may write only to its old generation/root; never adopt a successor.
5. **Make cleanup idempotent.**  
   A disposer acts only while its own registration is current.
6. **Test shutdown order.**  
   Descendants before parents; reverse-order effects; cleanup errors isolated.
7. **Add a regression that waits for the late callback.**  
   A test that never lets the race occur is not a regression.

## 5. Security opt-in runbook

Use when a real workflow needs a capability forbidden by the default policy.

1. **Prove the strict default.**  
   Test that the capability is refused in the normal entry.
2. **Define the smallest scope.**  
   Separate entry/mode/process; never widen the global default for one consumer.
3. **Authorize at the boundary.**  
   Renderer requests are not approval; confirm in the host/main process.
4. **Make it restart-scoped.**  
   Persist the preference; keep the active entry fixed until restart.
5. **Gate alternate entries.**  
   Resolve and compare the actual path; reject encoded traversal.
6. **Warn explicitly.**  
   Name the capability, the risk, the lack of sandboxing and the restart requirement.
7. **Test both directions.**  
   Strict refusal, opt-in success, invalid path rejection and restart behavior.
8. **Record the decision.**  
   Update security docs and the compatibility report.

## 6. Data-integrity runbook

Use for writes, rename, trash, imports, attachments, editors or provider swaps.

1. Choose the write primitive: create-only, conflict-checked write, append or explicit overwrite.
2. Capture expected version/fingerprint before writing.
3. Serialize mutations that can race.
4. Preserve unsaved drafts; do not clear content on a failed provider switch.
5. Validate paths: absolute, parent, hidden, NUL, symlink escape, case collisions.
6. Preserve exact bytes for opaque formats.
7. Verify recovery/trash/history after the failure path.
8. Add tests for conflict, cancellation, empty files/folders and concurrent operations.

## 7. PR and review runbook

1. **Run the local gate.**
   ```sh
   npm run check
   npm run test:e2e
   npm run test:desktop
   ```
2. **Run the optional corpus** when compatibility changed.
3. **Open one PR per slice.**  
   Include: what/why, evidence table, boundaries, security, review gates.
4. **Wait for CI.**  
   Do not merge on red. Do not treat local success as CI success.
5. **Review the latest head once, completely.**  
   Fix retained findings, add regression tests, reply with the commit and resolve threads.
6. **If CR is rate-limited/skipping**, follow the repository policy; record it.
7. **Merge only when green.**
   ```sh
   gh pr merge <number> --squash --delete-branch
   git checkout main
   git fetch origin
   git reset --hard origin/main
   ```
8. **Update the tracker/worklog** after merge.

### PR body template

```md
## What changed

## Why

## Evidence

| Check | Result | Scope |
|---|---|---|

## Boundaries / not claimed

## Security / migration notes

## Review gates
```

## 8. Release runbook

1. `npm run check` on the release head.
2. Browser and desktop suites on the release head.
3. Pinned corpus with verified inputs.
4. Build/package the artifact.
5. Verify the downloaded artifact, not just the local build:
   - checksum and asset naming;
   - archive contents;
   - install/run on each claimed platform.
6. State platform gaps explicitly: unsigned, untested, build-only, skipped.
7. Update release notes and the current tracker.
8. Do not call a bounded workflow pass “full compatibility.”

## 9. Documentation runbook

1. Update the current tracker with the observed state, not the intended state.
2. Link to per-run evidence; do not copy the whole result into multiple docs.
3. Mark superseded delivery/release/verification documents as historical.
4. Run link checks:
   ```sh
   python3 - <<'PY'
   import re, pathlib
   p = pathlib.Path('docs/REPLICATION-PLAYBOOK.md')
   for target in re.findall(r'\]\(([^)]+)\)', p.read_text()):
       if target.startswith(('http', '#', 'mailto:')): continue
       assert (p.parent / target).resolve().exists(), target
   PY
   ```
5. Run `npm run inventory:check`.
6. Prune duplicated current claims; keep evidence and history.
7. Record the change in `.agents/worklog/YYYY-MM-DD.md` and refresh
   `.agents/workstate.md` when the current focus/status changes.

## 10. Definition of done

An increment is done when:

- the named workflow works at the claimed state;
- the failure/refusal path is explicit;
- the appropriate evidence layer is recorded;
- the tracker and docs are updated;
- security and data-integrity boundaries are documented;
- CI is green on the latest head;
- the next first blocker is named.

It is **not** done because:

- the code compiles;
- the plugin starts;
- an API export exists;
- a local suite passed;
- a skipped corpus was tolerated;
- a bounded test was phrased as parity.
