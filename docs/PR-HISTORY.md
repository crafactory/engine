# Pull request history — native plugin architecture and bounded editor work

This document consolidates the outcomes of the pull requests that built Crafactory
Engine's native plugin architecture and the bounded Markdown / Canvas / Live Edit
work. It records what each change delivered, the review-driven fixes it required,
and what it explicitly did **not** claim. Authoritative specifications live in the
per-PR documents referenced in each section.

> Timeline: PR #1 and #3 (bounded Markdown + Canvas / Live Edit, v0.5–v0.6
> candidates) preceded the staged native-plugin migration in PR #5 → #6 → #7
> (stages 1–3). Every change followed the same review gate: wait for the completed
> review of the latest commit, repair every retained finding, re-review, and merge
> only with no outstanding findings and green checks. No direct pushes to `main`
> and no later stage started before the previous one merged.

## PR #1 — Bounded Markdown plugin rendering and lifecycle (v0.5 candidate)

**Purpose**
- Original MIT reading-host post/code processors, `MarkdownRenderChild` load/unload,
  and a sanitized static `MarkdownRenderer`.

**Key changes**
- Bounded trusted-renderer support for reading-mode Markdown processors, named
  code-block processors, rendered-child lifecycles, and sanitized static rendering.
- Option to skip plugin processing for embedded Live Preview content.
- Hardened cleanup when plugins are disabled or rendered content is removed,
  including after delayed child startup: late callbacks target detached old roots,
  and an owner stop atomically deactivates processors.
- Version 0.5.0. Three-platform package builds run on PRs; formal Linux publication
  is `main`-only.

**Evidence**
- 532 unit tests + strict TypeScript / production build.
- 36 browser regressions; 38 Linux Electron tests (28 regular + 5 worker negative
  corpus + 5 trusted-renderer corpus).
- 103 stable checklist entries, 29 core, 38 bounded acceptance points.
- Pinned upstream bytes unchanged across the bounded flows.

**Boundaries / not claimed**
- Not full 1:1 parity: whole reading hosts only, section info null, no Live Preview
  processing, no precise embedded contexts or recursive static processors. The
  trusted renderer is **not** a sandbox and cannot forcibly interrupt main-thread
  code. Native Windows/macOS install/run and mobile are unverified. No proprietary
  SDK/application or external plugin implementation is incorporated.
- See `docs/QA-MARKDOWN-PLUGINS.md`, `docs/VERIFICATION.md`.

## PR #3 — Canvas / Live Edit regressions and native all-plugin architecture RFC (v0.6.0 candidate)

**Purpose**
- Implement the four Canvas / Live Edit bug reports and the native-plugin architecture
  planning deliverable. (Tracked against the then-open issues `#2` and `#4` and
  `docs/PR-REQUIREMENTS.md`.)

**Key changes**
- Real read-only Canvas embeds; format-preserving / case-preserving rename; bounded
  Live link navigation.
- Stable measured table widgets and current-coordinate callbacks; table-cell / caret
  viewport regression fixes; normal-flow plugin status.
- Native all-plugin RFC with an editor provider and an optional Obsidian
  compatibility adapter. Version, release/parity notes and the stable checklist were
  part of the traceable delivery.

**Validation**
- Initial local 550 unit tests, build and 45 browser cases passed.
- A native Canvas test checks exact JSON bytes/type, absence of an accidental `.md`,
  and rewritten embeds. A native real-plugin status lifecycle test passed. New resize
  and bottom-cell commit checks were strengthened before the final latest-head run.

**Boundaries / not claimed**
- Original MIT code; no Obsidian code copied. The v0.6.0 candidate is not full parity.
  The RFC is planning, **not** a migrated native kernel. Windows/macOS native
  run/install, signing, mobile and full plugin compatibility remain unverified.

## PR #5 — Native plugin assembly kernel, stage 1

**Purpose**
- Implement the first migration stage from `docs/NATIVE-PLUGIN-ARCHITECTURE.md`: a
  composition-only native plugin kernel. No product feature is migrated and the
  running application does not use the kernel, so this is **not** community-plugin
  compatibility and does not close the native-plugin-kernel gate.

**Key changes** (source lives in `src/kernel/`, which imports none of the editor,
Vault, Markdown, Canvas, Bases or Obsidian-compatibility modules)
- Manifest `engine.plugin/v1` with validation for id, name, semantic version, engine
  range, execution mode (`worker`/`renderer`/`ipc`), scope kinds, contract names and
  permission shapes.
- Scopes (`runtime`/`vault`/`window`/`leaf`/`document`) with parent-chain service
  resolution and cross-vault isolation.
- Versioned service contracts, one provider per scope, with `duplicate-provider` and
  `version-mismatch` diagnostics.
- Declared event strategies: `sync-broadcast`, `async-concurrent`, `async-serial`,
  `abortable`.
- Effect ownership: reverse-order cleanup, late-registration revocation, and an abort
  signal for cooperative cancellation.
- Assembly: missing/duplicate/cycle/engine diagnostics, provider-before-consumer
  ordering, startup rollback with recorded cleanup failures, scope reload and a
  diagnostic observer.
- Bounded semver subset (exact/caret/tilde/comparator/wildcard/alternative).

**Review findings resolved**
1. *Scope start/stop race* — `Scope` records in-flight `starting`/`stopping` promises;
   `startScope` waits for an in-flight stop, transitions are assigned synchronously,
   and instances are removed only when the map still holds the instance being torn
   down.
2. *Child scopes outliving a provider scope* — `stopScope` stops active descendants
   first and `reload` restarts the descendants it stopped.
3. *Partial `>`/`<=` bounds* — partial bounds round to the last specified field
   (`>1` → `>=2.0.0`, `<=1.2` → `<1.3.0`).
4. *Prerelease gating* — a prerelease version matches an alternative only if some
   comparator carries a prerelease on the same core tuple; comparator bodies may
   include a prerelease suffix (`>=1.0.0-beta`).
5. *Service version binding* — `bindService` rejects a `context.provide` version that
   differs from the manifest declaration.

**Evidence**
- `npm run inventory:check`: 118 entries unchanged, no drift.
- `npm run test`: 595 passed (14 files) at stage-1 review; kernel suite reached 37
  cases after the follow-up fixes.
- `npm run build`: strict TypeScript and production bundle passed.
- `tests/kernel.test.ts` covers version ranges, ordering and versioned resolution,
  provider diagnostics, manifest validation, startup rollback, effect ordering /
  revocation / abort signals, cross-vault isolation, reload, all four event
  strategies, and the diagnostic observer.

**Boundaries / not claimed**
- No product feature migrated; the kernel is not wired into the app.
- Not a sandbox; it cannot forcibly stop trusted JavaScript.
- Hot per-instance reload, package/integrity loading, permission enforcement and real
  window/leaf/document integration are later stages.
- The native-plugin-kernel gate stays open.

## PR #6 — Native storage / documents / commands providers, stage 2

**Purpose**
- Implement the second migration stage from `docs/NATIVE-PLUGIN-ARCHITECTURE.md`. The
  running application keeps its existing `src/bridge.ts` entry; these providers are
  additive and not yet wired into the UI.

**Key changes**
- `engine.storage/v1` with two providers:
  - `MemoryStorage` — in-memory preview/tests.
  - `LocalStorage` — delegates to a `VaultLike` store (`core/vault.mjs`) without
    importing Node modules into the browser bundle.
  - Semantics: create-only writes, opaque fingerprint conflict detection, serialized
    appends, snapshot/restore (no-op detection), recoverable trash, plugin-data
    isolation and size bounds, attachment storage with collision handling, and
    vault-path validation.
- `engine.commands/v1` — command registry with availability checks, reserved hotkeys
  and disposers, shared by UI/compat/headless callers.
- `engine.documents/v1` — case-insensitive format registry, rename and history on top
  of storage.
- `registerDefaultServices(kernel, {storage, vault?})` composes them as native
  provider plugins. `engine.documents` declares a storage dependency, so the kernel
  activates storage first and rejects a missing provider.

**Review findings resolved**
1. *CommandRegistry disposers* now track a per-id ownership token and only remove
   their own registration after an id is unregistered/re-registered.
2. *DocumentStore.registerFormat disposers* act only while their normalized
   registration is still current.
3. *MemoryStorage.trash* accepts an existing empty folder via `exists()`, matching the
   local provider; an empty-folder case was added to the shared contract suite.

**Evidence**
- `npm run inventory:check`: 118 entries unchanged, no drift.
- `npm run test`: 642 passed (15 files); 39 new service cases, 646 overall after the
  review fixes.
- `npm run build`: strict TypeScript and production bundle passed.
- `tests/services.test.ts` runs **one shared storage contract suite against both the
  memory and local providers**, plus a local-only symlink-escape case, the commands
  contract, the documents contract, and kernel composition (activation order,
  resolved contracts, missing-vault error, empty diagnostics).

**Boundaries / not claimed**
- The UI is not switched to these providers; `src/bridge.ts` remains the running path.
- No Electron/worker IPC adapter over the contracts.
- `engine.index/editor/render/workspace` and later migration stages stay unchecked.
- Cross-process atomicity, crash durability and a permission model remain open.

## PR #7 — Native render / workspace view slots and format plugins, stage 3

**Purpose**
- Implement the third migration stage: the workspace becomes a view-slot /
  format-registration surface, and Markdown, Canvas and Bases register their own
  format views. This is the first change that touches the running UI.

**Key changes**
- `engine.render/v1` — case-insensitive extension → view-type registry with
  ownership-specific disposers.
- `engine.workspace/v1` — view slots (`main`/`left`/`right`/`auxiliary`), ordered view
  listing, and `resolveView(path)` through the render contract. Declares a dependency
  on `engine.render/v1`, so it is activated after render and rejected when render is
  missing.
- Format view plugins `engine.format.markdown`, `engine.format.canvas`,
  `engine.format.bases` — each registers its own formats and view slot and owns the
  registrations via `context.effect`. No format plugin imports a UI component; the
  view-type → component mapping stays in the application shell.
- `createWorkspaceRuntime()` composes the render, workspace and three format plugins
  on a kernel.
- `src/App.tsx` resolves a note's format view through the workspace service instead of
  hardcoded `.canvas`/`.base` regex checks.

**Review findings resolved**
1. *Revoked format registrations* — `FormatRegistry` marks a disposed registration
   revoked and, when the current one is removed, restores the nearest non-revoked
   predecessor.
2. *Revoked view registrations* — `WorkspaceViews` uses the same nearest-active-
   predecessor rule.
3. *Workspace / render binding* — `workspacePlugin()` builds `WorkspaceViews` from the
   `engine.render/v1` provider resolved at activation time;
   `createWorkspaceRuntime()` starts the kernel and returns the resolved workspace
   service.
4. *Async startup / unmount race* — `App` tracks unmount, stops a workspace runtime
   that resolves after cleanup, and discards a duplicate runtime when another
   initialization already retained one.

**Evidence**
- `npm run inventory:check`: 118 entries unchanged, no drift.
- `npm run test`: 658 passed (16 files); 660 overall after the review fixes.
- `npm run build`: strict TypeScript and production bundle passed.
- `npm run test:e2e` (macOS): 43 passed / 7 failed — identical to the pre-change
  baseline (the known `Control+…` vs `Cmd` keybinding cases; green on Linux CI).
- `npm run test:desktop` (macOS): 35 passed / 1 failed / 10 skipped.
- 12–14 new cases cover format resolution/disposers, view-slot ordering and
  resolution, activation order, missing-provider rejection, scope-stop revocation,
  additive composition with the storage/commands/documents providers, and a static
  check that every `src/kernel/` import is a sibling relative module.

**Boundaries / not claimed**
- Storage/documents/commands providers are not yet consumed by the app; persistence
  still uses `src/bridge.ts`.
- No `engine.index/v1` / `engine.editor/v1`; the editor remains the next stage.
- No Electron/worker IPC adapter, cross-process atomicity or permission model.

## Consolidated invariants established by review

These rules were driven by review findings across the staged migration and should be
preserved in future work:

- **Registration ownership.** A disposer acts only while its own registration is
  still current. Disposed registrations are marked revoked and are never restored;
  removing the current registration restores the *nearest active predecessor* (or
  removes the entry when none remains). This applies to both the render format
  registry and the workspace view registry.
- **Provider binding.** A consumer resolves its provider at activation time (e.g.
  workspace reads `engine.render/v1`) rather than binding a preconstructed instance,
  so all registrations share one registry.
- **Lifecycle serialization.** Concurrent start/stop is serialized via in-flight
  promises; descendant scopes stop before their parents and are restarted when a
  provider scope is reloaded.
- **Async startup cleanup.** An async runtime that resolves after unmount is stopped,
  and a duplicate runtime is discarded rather than retained.
- **Version semantics.** Partial comparator bounds round to the last specified field;
  prereleases are gated behind a comparator carrying a prerelease on the same core
  tuple; a provided service version must equal the manifest declaration.
- **Provider parity.** One shared storage contract suite must pass identically for the
  memory and local providers (for example, trashing an existing empty folder).

## Documented specifications and verification

| Topic | Document |
|---|---|
| Native plugin architecture RFC | `docs/NATIVE-PLUGIN-ARCHITECTURE.md` |
| Kernel contract and lifecycle | `docs/KERNEL-SPEC.md` |
| Storage / commands / documents contracts | `docs/SERVICES-SPEC.md` |
| Parity ledger | `docs/PARITY.md` |
| Verification records | `docs/VERIFICATION.md` |
| Markdown plugin QA | `docs/QA-MARKDOWN-PLUGINS.md` |
| Canvas / Live Edit QA | `docs/QA-CANVAS-LIVE-EDIT.md` |
| Delivery requirements | `docs/PR-REQUIREMENTS.md` |
