# Native services specification (stage 2)

Status: storage/documents/commands plus the migrated core-feature services are extracted and
wired into the application where noted below. **Migration scope:** these services own
feature state, derived logic and lifecycle; most React views still live in the application
shell and consume the services. UI pluginization is now **partially** implemented:
`engine.views/v1` stores opaque lazy component loaders, and the built-in Markdown, Canvas
and Bases views register as view plugins, so the application host dispatches them
generically instead of hard-coding render branches. Loading UI from external plugin
packages is not wired yet. Original MIT code; no reference implementation is copied.

This builds on [NATIVE-PLUGIN-ARCHITECTURE.md](NATIVE-PLUGIN-ARCHITECTURE.md) and the
assembly kernel in [KERNEL-SPEC.md](KERNEL-SPEC.md). Source lives in
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
| `BridgeStorage` | `src/services/storage-bridge.ts` | the running application, over the preload/memory bridge |

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

### `engine.views/v1`

`register({viewType, load, label?, slot?})` stores a lazy component loader as an opaque
value and returns a disposer; `resolve(viewType)` returns the contribution; `list()` reports
them. `slot` is `main` (default), `left` or `right`.
The service and kernel never import React or a concrete view. Built-in contributions live
in `src/views/` (`engine.view.markdown`, `engine.view.canvas`, `engine.view.bases`, `engine.view.graph`,
`engine.view.editor` for the main slot; `engine.view.files`, `engine.view.search`, `engine.view.bookmarks`, `engine.view.recent`, `engine.view.tags` for the left slot and `engine.view.outline`, `engine.view.backlinks`, `engine.view.outgoing` for the right slot) and load the
React modules on demand. The host interprets a loader as a React component and supplies
different props by slot: main views receive `ReadingViewProps` (note, notes, entries, path,
mode, previews, open/open-link callbacks, change callbacks and `ask`; the graph view receives its own `GraphViewProps`; the editor view receives `EditorViewProps`
and reports its imperative handle to the host), while sidebar panels
(left and right) receive `PanelViewProps` (sideTab, notes, bookmarks, recent, tags, headings, incoming,
mentions, activeTitle, active, outgoing, entries/activePath/fileSort/expanded/loading/childrenFor, query/caseSensitive/searchSort/results, file/search callbacks,
open/open-link/remove-bookmark, select-tag and jump-heading callbacks). A panel lookup rejects a contribution that is not registered for the requested
`left` or `right` slot. Bases built-in `table`/`cards`/`list` renderers are registered in the UI-layer
`builtinBasesViews` registry; `Bases.tsx` is the host and plugin Bases views use the
renderer host. Canvas internals are split into `Card`, `FitEmbed`, `CanvasToolbar` and
`CardEditor` under `src/views/canvas/`. External plugin-package UI loading is not wired yet.

Note properties are not a panel contribution: `src/PropertiesEditor.tsx` renders inline under
the note title in live/reading modes, infers text/number/checkbox/date/date-time/list from the
parsed YAML value, and writes through the same `setProperties` host callback. Explicit types
are stored in `VaultState.propertyTypes`; Automatic removes the entry. Source mode keeps the
raw frontmatter. The former right-slot `engine.view.properties` panel was removed.

### `engine.compat/v1`

`list()` discovers and validates local packages through the support implementation. `start({package:{manifest, code}, mode, callbacks})` loads one package through the Worker or
trusted-renderer runtime and returns the existing `PluginController` (`ready`, `sync`,
`stop`, plus renderer-only view/suggest/protocol/Bases/hover hooks). `mode` is `worker` or
`renderer`; `capabilities()` reports both `{worker: true, renderer: true}`. The contract
deliberately exposes typed host primitives, not Obsidian-shaped App/Vault/Workspace types:

- `snapshot()` returns the current `PluginSnapshot`
- `host` provides `loadData/saveData`, vault text operations, rename/trash/mkdir/asset/open
  and the editor mutation; `src/compat/` maps Obsidian operation names and enforces declared
  permissions before calling it
- `activity` observes in-flight host operations so shutdown can await them
- `commands`, `notice`, `failure` drive the host
- optional `tabs`, `extensions`, `fileExtensions` and `native` are renderer/host hooks

The built-in `engine.compat` native runtime plugin provides this service
(`src/compat/`). The application resolves the contract, gates package loading on the
**Obsidian plugin support** Core plugin switch, and stops enabled packages when it is
disabled. Package discovery/validation and the permission-to-host mapping live in the support
implementation; the Community plugins Settings UI and runtime selection still live in the
application for now. Obsidian API semantics remain inside the support implementation so
adding `MetadataCache` or workspace leaves does not change the contract.

### `engine.ui/v1`

`register({kind, id, label, order?, ...})` accepts four contribution kinds:

- `ribbon`: `run()` is invoked by the host when the ribbon button is clicked; `icon` is an
  optional name (the host currently renders a generic glyph).
- `status`: `text` is rendered in the status bar; re-register the same `id` to update it.
- `settings`: `load()` returns a lazy React component; `tab` selects a Settings tab
  (default `extensions`). Components receive `{value, onChange}` for the current settings
  object. The built-in Editor section is registered this way (`engine.settings.editor`).
- `block`: `language` names a fenced code language and `load()` returns a lazy preview
  component. Live blocks match the fence language and render the preview; clicking the
  block reveals the fenced source. The built-in Mermaid preview is registered as
  `engine.blocks.mermaid`; raw reading processors are not run inside live widgets.

The registry validates ids, labels and kinds, replaces by `(kind, id)` with
nearest-active-predecessor revocation, and `subscribe(listener)` reports changes. The
service and kernel stay UI-free. The host renders ribbon buttons, status items and settings
sections from the service, so an extension can add these surfaces without importing
application React code. External plugin-package UI loading is not wired yet.

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
`tags` (counts, optionally restricted to a path set), `headings`, `properties`,
`propertyKeys` (unique keys, first-seen order), `resolve` (link → path) and `search`
(case-sensitive option). It builds from caller-supplied note
content and caches per-note derivations, so it imports no editor or UI module. The
application's tags, backlinks, outgoing-links, outline, search, graph and properties views
consume this contract.

### `engine.navigation/v1`

Quick-switcher ordering (`quickSwitch({recent})`, recent first, stable for the rest) and
`randomNote()` over Markdown paths. It consumes `engine.index/v1`, so it is activated after
the index and rejected when the index is missing.

### `engine.workspaces/v1`

Named workspace layouts: `save(name, workspace)`, `get(name)`, `list`, `remove`,
`replace(record)` and `subscribe`. Snapshots are deep-cloned per listener so a consumer
cannot mutate the store. The application mirrors the record into render state via
`subscribe`; persistence stays application-side.

### `engine.unique-note/v1`

`create({templateContent?, date?})` builds a UTC timestamp name (`YYYYMMDDHHmmss`) and
either interpolates the template through `engine.templates/v1` or returns a default
`# <name>` heading. It consumes the templates contract and is rejected without it.

### `engine.wordcount/v1`

`count(text)` returns `{words, characters}`: runs of Unicode letters/numbers are words and
characters are UTF-16 code units. The status bar consumes it.

### `engine.slides/v1`

`parse(content)` removes frontmatter and splits on `---` rules into slide Markdown bodies,
always returning at least one slide. The presentation view consumes it.

### `engine.format-converter/v1`

`convert(content)` applies the bounded conversions the workspace supports: `<mark>` to
`==highlight==` and same-vault `.md` links to wikilinks. External URLs and non-Markdown
targets are untouched; this is not a general HTML/Markdown converter.

### `engine.explorer/v1`

File-tree listing and ordering over `engine.storage/v1`: `list({sort})`, `sort(entries,
sort)` and `children(entries, parent, sort)`, all folders-first then by name or modified
time. The application keeps expansion and interaction state; the service owns the derived
ordering. It consumes the storage contract and is rejected without it.

### `engine.note-composer/v1`

`merge(targetContent, sourceContent)` keeps the target and appends the source body without
its frontmatter; `extractLink(targetPath)` builds a wikilink without the `.md` suffix. The
application keeps dialogs, editor selection replacement, vault-wide link rewriting and the
trash write.

### `engine.web-viewer/v1`

`normalize(input)` trims and validates an HTTPS address, rejecting other protocols and
unparsable values; the application keeps the dialog and iframe.

### `engine.slash-commands/v1`

`list()` returns the structural insertions offered when typing `/` in the editor
(`/heading`, `/task`, `/callout`, `/table`, `/code`, `/template`). The template entry is an
`insert-template` action; the editor owns the completion widget and the action callback.

### `engine.page-preview/v1`

`excerpt(content, limit?)` strips frontmatter and truncates the body; `place(anchor, viewport)`
positions the popover below the link and clamps it inside the viewport. The application
keeps the hover event handling and renders the popover.

### `engine.audio-recorder/v1`

`start()` / `stop()` / `isRecording()` wrap the MediaRecorder lifecycle: acquire a stream,
collect chunks, stop the tracks and return `{data, mimeType, extension}` (`.ogg` or `.webm`).
Stream and recorder factories are injectable; the application decides where to attach the
recording.

### Obsidian compatibility facade

`createCompatibilityRuntime` accepts an optional `native` service bundle on its host:

- `resolveLink(link, from)` is used by `MetadataCache.getFirstLinkpathDest` and
  `Workspace.openLinkText`, so link resolution runs through `engine.index/v1` when the
  application provides it (with the snapshot resolver as fallback for standalone tests).
- `editor.{providerId, codeMirrorExtensions}` is reported by `editorCompatibility()`. A
  plugin that registers a CodeMirror extension is rejected with a message naming the active
  provider when it is not the CodeMirror editor, making an editor swap's compatibility
  difference explicit instead of silently applying the extension.

The facade remains opt-in per plugin: no compatibility runtime is created at startup, so the
default product keeps working when the facade is disabled. The application routes the
facade's read/create/modify/append/mkdir, rename, trash and plugin-data operations through
`engine.storage/v1`/`engine.documents/v1` (bridge-backed in the app), keeping the in-memory
note reconciliation; `getResourcePath` returns the storage asset data URL. `Vault.rename` and `Vault.trash`
support `TFile` and `TFolder` subtrees (child identities are retained on rename); delete,
process and binary adapters remain unsupported. Renderer plugins can also register a
custom view and file extensions: `registerExtensions` records the mapping, the host
registers the format/view with `engine.render/v1`/`engine.workspace/v1`, and opening a
mapped file mounts the plugin's DOM view in the main document area through a plugin-view
host. This host is renderer-only and requires an already-registered view type. Renderer
plugins can also register an `EditorSuggest`: `onTrigger` and `getSuggestions` are queried
from the editor's autocomplete source, `selectSuggestion` runs through the editor mutation
host, and the host maps options to CodeMirror completions with filtering delegated to the
plugin. Custom `renderSuggestion` UI is not reproduced; the display-text hook is used for
the label. `registerObsidianProtocolHandler` stores action handlers and dispatches
`obsidian://action?...` URLs from the in-app `engine:protocol` window event; OS-level
`obsidian://` registration is not wired. `registerHoverLinkSource` records and cleans up a
source descriptor; hovering a Markdown link emits `hover-link` for each registered source
with a minimal `hoverParent` (no hover popover rendering). `registerBasesView`
registers a custom `.base` view id; the Bases surface mounts it with a minimal
`QueryController` (`type`, `config`, `app`) and calls `render(container)`. Query data,
grouping, sorting and full `BasesConfig` semantics are not implemented.

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
`createStorageRuntime({bridge})` exposes the bridge-backed storage, documents and explorer
providers; the application uses it for file-recovery history/restore and the file-tree
ordering while its own note writes still go through the bridge until the persistence path is
migrated.
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
index dependency flow. `tests/storage-bridge.test.ts` covers the bridge-backed storage
adapter and the storage/documents runtime, `tests/navigation.test.ts` covers quick-switch
ordering, random-note selection and the navigation dependency flow, and
`tests/workspaces.test.ts` covers the named workspace store and its dependency flow, and
`tests/unique-note.test.ts` / `tests/wordcount.test.ts` cover the timestamp note, the
templates dependency edge and word/character counting. `tests/slides.test.ts` and
`tests/format-converter.test.ts` cover slide splitting and the bounded conversions, and
`tests/explorer.test.ts` covers tree ordering and the storage dependency, and
`tests/note-composer.test.ts` covers merge/extract rules and composition. `tests/web-viewer.test.ts`
and `tests/slash-commands.test.ts` cover HTTPS validation and the slash insertion list, and
`tests/page-preview.test.ts` / `tests/audio-recorder.test.ts` cover excerpt/placement and the
recorder lifecycle, and `tests/views.test.ts` covers view-loader registration/replacement,
the built-in view plugins, scope-stop revocation and loader interpretation.
`tests/ui.test.ts` covers ribbon/status registration, replacement, subscriber notification,
validation and runtime consumption.

## Not yet done

- The application now hosts a bridge-backed storage/documents runtime; file recovery uses
  `engine.documents/v1` and the compatibility facade routes read/write/plugin-data through
  `engine.storage/v1`. Note writes from the application itself still use `src/bridge.ts`
  directly, and the remaining Vault operations still use the application host.
- Bookmarks and templates/daily notes are consumed by the application; their persistence
  is still application-side, and the migrated core features are a subset of the 29 core
  plugins.
- The tags, backlinks, outgoing-links, outline, search, graph and properties views consume
  `engine.index/v1`; other core features (file navigation, word count, …)
  remain to be migrated.
- The editor has two providers and the app uses the CodeMirror provider for
  selection/viewport; body-text drafts and write conflicts still use the application's
  existing draft and bridge-conflict logic rather than the provider's text APIs.
- No Electron/worker IPC adapter over these contracts is implemented.
- Cross-process atomicity, crash durability and a permission model remain open.
