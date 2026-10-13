# Native services specification (stage 2)

Status: the `engine.storage/v1`, `engine.commands/v1` and `engine.documents/v1` contracts
are extracted, with an in-memory preview provider and a local-filesystem provider for
storage. The running application still uses its original bridge entry; these providers
are additive and not yet wired into the UI. Original MIT code; no reference
implementation is copied.

This is the second migration gate in [NATIVE-PLUGIN-ARCHITECTURE.md](NATIVE-PLUGIN-ARCHITECTURE.md)
and builds on the assembly kernel in [KERNEL-SPEC.md](KERNEL-SPEC.md). Source lives in
`src/services/` and imports no editor, workspace, Markdown, Canvas or Bases code.

## Contracts

### `engine.storage/v1`

Versioned text, metadata and attachment storage. Paths are vault-relative and validated
(rejecting absolute, parent, hidden and NUL paths). Methods:

`list`, `read`, `write`, `create`, `append`, `mkdir`, `rename`, `trash`, `snapshots`,
`restore`, `pluginData`, `loadState`, `saveState`, `asset`, `attach`, `plugins`.

Semantics fixed for every provider:

- `create` refuses to overwrite; competing creates admit exactly one.
- `write` uses an opaque content fingerprint for optimistic conflict detection and
  records the replaced content as a recoverable snapshot.
- `append` serializes against other appends in the same process.
- `list` hides metadata directories and returns folders before files.
- `snapshots`/`restore` retain up to one hundred previous versions per path; unchanged
  content is not snapshotted.
- `pluginData` is isolated by plugin id, capped at 1 MiB and rejects invalid ids.
- `attach` honors the configured attachment folder and avoids filename collisions;
  `asset` returns a data URL.
- `write` rejects formats outside the text allowlist.

Two providers satisfy the contract:

| Provider | Module | Profile |
|---|---|---|
| `MemoryStorage` | `src/services/storage.ts` | browser preview and tests |
| `LocalStorage` | `src/services/storage.ts` | desktop/web over a Vault-like store (`core/vault.mjs`) |

`LocalStorage` delegates to a `VaultLike` object so the browser bundle never imports
Node filesystem modules. Symlink-escape protection is a local-filesystem capability and
is tested separately from the shared contract.

### `engine.commands/v1`

A command registry shared by the UI, the Obsidian compatibility layer and headless
tests. `register` rejects duplicate ids and returns an ownership-specific disposer that
only removes its own registration, even after the id is reused; `run` checks the optional
`check` predicate and awaits asynchronous results; `hotkeys` maps reserved combinations
to command ids. This is not the reference command metadata (icons, repeatable, mobile
flags remain rejected by the compatibility layer).

### `engine.documents/v1`

Format registration and document transactions on top of `engine.storage/v1`:
`listFormats`, `formatOf` (case-insensitive extension match), `registerFormat` (returns a
disposer that restores the prior state only while its registration is current), `rename`,
`read`, `history` and `restore`.
Built-in formats cover `md`, `markdown`, `canvas`, `base`, `txt`, `csv`, `json` and
`css`. A rename does not convert bytes or rewrite history keys, matching the current
Vault behavior; link rewriting and workspace identity remapping stay in the application
until the workspace and editor providers are migrated.

## Composition

`registerDefaultServices(kernel, {storage: 'memory' | 'local', vault?})` registers the
three provider plugins on a kernel. `engine.documents` declares a dependency on
`engine.storage/v1`, so the kernel activates storage first and rejects documents with a
missing-provider diagnostic when storage is absent. The local profile requires a vault.

## Bounded evidence

`tests/services.test.ts` runs one shared storage contract suite against both the memory
and local providers, plus a local-only symlink test, the commands contract, the documents
contract and kernel composition (activation order, resolved contracts, missing-vault
error, empty diagnostics).

## Not yet done

- The application UI is not switched to these providers; `src/bridge.ts` and the existing
  bridge entry remain the running path until workspace/editor providers exist.
- No Electron/worker IPC adapter over these contracts is implemented.
- `engine.index/v1`, `engine.editor/v1`, `engine.render/v1` and `engine.workspace/v1`
  remain unimplemented; the corresponding migration stages stay unchecked.
- Cross-process atomicity, crash durability and a permission model remain open.
