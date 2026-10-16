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

### `engine.render/v1`

A format maps a file extension to a view type. `registerFormat` returns a disposer that
acts only while its registration is current; `resolve` matches the path's lowercase
extension and returns the format or `undefined`; `list` returns formats in registration
order. A disposed registration is marked revoked, so removing a later registration
restores the nearest non-revoked predecessor instead of resurrecting a stopped scope.

### `engine.workspace/v1`

View slots (`main`/`left`/`right`/`auxiliary`). `registerView` adds a view type to a slot;
`viewsForSlot` orders by `order`; `resolveView(path)` maps a path through
`engine.render/v1` to its view. Revocation follows the same nearest-active-predecessor
rule as formats. The workspace provider declares a dependency on the render contract,
constructs its service from the render provider resolved at activation time, and is
rejected when render is missing. Binding to the consumed provider avoids a mismatch when
a kernel supplies separate render and workspace instances.

### `engine.editor/v1`

A DOM-free document editing model over UTF-16 offsets: `text`, `version`, `isDirty`,
`setText` (with an optional expected base that refuses on conflict), `track` (a passive
sync for a document a view already changed, preserving selection and shifting the
viewport without touching undo history), `insert`, `selection`, `viewport`, `undo`/`redo`,
`markSaved`, `draft` and `restore`. A draft
carries text, selection, viewport, version and dirty state, so a session can be recovered
or moved to another provider without losing the caret, scroll anchor or unsaved state.
The viewport shifts with edits so it keeps pointing at the same text.

Two independent providers satisfy the contract:

| Provider | Module | Capabilities |
|---|---|---|
| `CodeMirrorEditorProvider` | `src/services/editor.ts` | backed by `@codemirror/state`; advertises `engine.editor.codemirror/v1` |
| `PlainEditorProvider` | `src/services/editor.ts` | plain text; deliberately no CodeMirror capability |

The application opens one session per active note from the default CodeMirror provider and
uses it to restore and report selection and viewport for the editing surface, so caret and
scroll survive tab switches, mode changes and editor remounts. When live mode hides
frontmatter, the view/session boundary translates selection and viewport offsets by the
hidden prefix (`toDocumentOffset`/`toViewOffset`) and `track` receives the full note
content, so offsets never land inside frontmatter. Body-text drafts and write
conflicts still use the application's existing mechanism; the provider's text, draft and
expected-base conflict APIs are covered by the contract suite.

### `engine.editor.codemirror/v1`

An optional capability contract provided only by the CodeMirror editor. It exposes
`{providerId, capabilities}`. A plugin or consumer that requires CodeMirror-specific
extensions is rejected with a missing-provider diagnostic when only the plain editor is
active, so a provider swap reports the compatibility difference instead of pretending the
extension still applies. This is the optional editor capability described in
[NATIVE-PLUGIN-ARCHITECTURE.md](NATIVE-PLUGIN-ARCHITECTURE.md), not a sandbox or a claim
that third-party CodeMirror extensions remain compatible.

### Format view plugins

`engine.format.markdown`, `engine.format.canvas` and `engine.format.bases` each consume
the render and workspace contracts and register their own extension → view type mappings
and their view slot. Each plugin owns its registrations through `context.effect`, so
stopping the scope revokes them. A format plugin never imports the corresponding
user-interface component; the mapping from view type to component stays in the
application shell.

### `engine.bookmarks/v1`

A first core-feature migration: an ordered bookmark set with `list`, `has`, `add`,
`remove`, `toggle`, `replace` (used for loading persisted state and path remaps) and
`subscribe`. Duplicates and empty paths are discarded. The application consumes the
service and mirrors it into its render state; persistence stays with the application
until the storage providers are wired into the UI.

### `engine.templates/v1`

Token interpolation: `apply(content, {title, date?})` replaces `{{title}}`, `{{date}}`,
`{{date:YYYY-MM-DD}}` and `{{time}}`; the clock is injectable for tests. A default provider
exposes the contract.

### `engine.daily-notes/v1`

Computes today's daily note from `{folder, templateContent, date?}` and returns
`{path, content, date}`. It consumes `engine.templates/v1`, so the two migrate together
with a tested dependency edge; the kernel rejects daily notes when templates is missing.

### `engine.index/v1`

A derived metadata and search index over Markdown notes: `rebuild`/`update`/`remove`,
`note` (title, aliases, tags, headings, links, properties, body), `outgoing`, `backlinks`,
`tags` (counts, optionally restricted to a path set), `headings`, `properties`, `resolve`
(link → path) and `search` (case-sensitive option). It builds from caller-supplied note
content and caches per-note derivations, so it imports no editor or UI module. The
application's tags, backlinks, outgoing-links and outline panels consume this contract;
search, graph and properties migrate next.

## Composition

`registerDefaultServices(kernel, {storage: 'memory' | 'local', vault?})` registers the
storage, commands and documents provider plugins. `createWorkspaceRuntime()` registers the
render and workspace providers plus the three format view plugins on a kernel, starts it,
and returns the kernel, the live render service and the workspace service resolved from
the same kernel. `engine.documents` depends on `engine.storage/v1`, the workspace provider
depends on `engine.render/v1`, and each format plugin depends on both, so the kernel
activates them in dependency order and rejects missing providers. The local profile
requires a vault. `createEditorRuntime(kind)` registers the CodeMirror or plain editor
provider plugin, starts the kernel and returns the resolved editor provider.
`createBookmarksRuntime()` and `createDailyNotesRuntime()` build their kernels and return
the resolved services. The kernel's `disable`/`enable` implement provider-loss rebinding:
disabling a provider deactivates its transitive required consumers with a
`dependency-disabled` diagnostic, and enabling restarts the affected scopes so consumers
re-resolve fresh instances.

## Bounded evidence

`tests/services.test.ts` runs one shared storage contract suite against both the memory
and local providers, plus a local-only symlink test, the commands contract, the documents
contract and provider composition (activation order, resolved contracts, missing-vault
error, empty diagnostics). `tests/workspace.test.ts` covers format registration/resolution,
view slots, the render→workspace dependency, scope-stop revocation and a static check that
every `src/kernel/` import is a sibling relative module, so the kernel cannot import a
Markdown, Canvas or Bases implementation. `tests/editor.test.ts` runs one shared editor
contract suite against the CodeMirror and plain providers, and covers draft recovery,
conflict refusal, viewport migration across an edit and between providers, and the
CodeMirror capability difference. `tests/bookmarks.test.ts` covers the migrated bookmarks
service and its kernel composition; `tests/templates.test.ts` covers template
interpolation, daily-note computation and the templates→daily-notes dependency edge;
`tests/dependency-flow.test.ts` covers provider disable/enable/rebind flow, and
`tests/notes-index.test.ts` covers index derivation, resolution (including singular
aliases), backlinks, tags, search, updates, path deduplication, snapshot isolation and the
index dependency flow.

## Not yet done

- Storage, documents and commands providers are not yet consumed by the application; the
  running path still uses `src/bridge.ts` for persistence. The workspace/render services
  only drive format → view dispatch in `src/App.tsx`.
- Bookmarks and templates/daily notes are consumed by the application; their persistence
  is still application-side, and the migrated core features are a subset of the 29 core
  plugins.
- The tags, backlinks, outgoing-links and outline panels now consume `engine.index/v1`;
  search, graph and properties have not migrated onto it yet and those stages stay
  unchecked.
- The editor has two providers and the app uses the CodeMirror provider for
  selection/viewport; body-text drafts and write conflicts still use the application's
  existing draft and bridge-conflict logic rather than the provider's text APIs.
- No Electron/worker IPC adapter over these contracts is implemented.
- Cross-process atomicity, crash durability and a permission model remain open.
