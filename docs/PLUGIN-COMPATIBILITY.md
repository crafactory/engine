# Plugin compatibility report

This release adds an **experimental, independently implemented CommonJS compatibility subset**, not full Obsidian plugin support. Only public behavioral documentation was consulted. No Obsidian application implementation, SDK package, declaration files or sample-plugin source was incorporated. Engine's original code remains MIT; dependencies keep their own licenses.

## Reference and coverage boundaries

The pinned [public API index](https://docs.obsidian.md/Reference/TypeScript+API/index) contains 271 documented names: 154 runtime symbols and 117 type-only names. Engine exposes 27 runtime names as implemented subsets and rejects the other 127 runtime symbols. Type-only names are not fabricated runtime exports. The generated `API-COVERAGE.md` links every name to its public documentation, and `compatibility/obsidian-exports.json` is the machine-readable baseline.

There are distinct coverage levels. Export tests check whether each name exposes a subset or raises `CompatibilityError`; they do not establish every method's semantics. Original behavior fixtures check implemented contracts and explicit unsupported methods; the primary-member inventory covers 12 classes but not every overload/inherited member. Desktop fixtures check the compiled Worker, filesystem, UI enable state and editor. A separate five-plugin corpus runs actual pinned upstream releases at startup only; **all five currently fail and no positive real-plugin functional compatibility is certified.** No installed Obsidian build has been used for differential tests; `compatibility/reference-baseline.json` records that gap rather than implying certification.

## Implemented, bounded contracts

- **Plugin and Component:** asynchronous load/unload, registered cleanup/events/intervals, child lifecycle, command registration/removal, plugin-local JSON data and explicit user enable. Public contracts are listed in [Plugin](https://docs.obsidian.md/Reference/TypeScript+API/Plugin) and [Component](https://docs.obsidian.md/Reference/TypeScript+API/Component). Await lifecycle completion; synchronous timing is not equivalent to the reference.
- **Commands:** `editorCheckCallback` takes precedence over `editorCallback`, then `checkCallback`, then `callback`; checking must synchronously return true to expose a conditional command, and editor commands are unavailable in reading mode. These rules follow the [Command documentation](https://docs.obsidian.md/Reference/TypeScript+API/Command). Custom hotkeys, icon, repeatable and mobile-only options are rejected, not silently applied.
- **Vault:** file/folder/root snapshots, current-path identities, text read/cachedRead/create/modify/append/copy and folder creation. The supported signatures are drawn from [Vault documentation](https://docs.obsidian.md/Reference/TypeScript+API/Vault); Engine supports only its allowlisted text extensions and rejects write options. `create` refuses overwrite and in-process appends serialize; no power-loss or cross-process atomicity claim is made.
- **Workspace and Editor:** one active Markdown editor, existing-file navigation, layout-ready callback and file-open event; synchronous single-selection text projection backed by asynchronous expected-text-checked host edits. Public member lists are [Workspace](https://docs.obsidian.md/Reference/TypeScript+API/Workspace) and [Editor](https://docs.obsidian.md/Reference/TypeScript+API/Editor). Source-mode offsets include frontmatter; live-mode selection inside hidden frontmatter is rejected. Multiselection, actual CodeMirror objects/transactions and UI/focus/scroll APIs are unsupported.
- **Events and helpers:** standalone on/off/offref/trigger/tryTrigger, Vault modify and Workspace file-open snapshots, path/linktext helpers, YAML, bounded frontmatter/tag helpers, boolean short-circuit reference iteration and debounce. Iteration returns the documented boolean in [iterateRefs](https://docs.obsidian.md/Reference/TypeScript+API/iterateRefs), and frontmatter bounds exclude fences as described in [FrontMatterInfo](https://docs.obsidian.md/Reference/TypeScript+API/FrontMatterInfo).

`app.metadataCache.getFirstLinkpathDest` uses Engine's existing limited resolver, not full canonical reference resolution. Complete caches with precise positions and cache events are refused rather than filled with inaccurate shapes; the full [MetadataCache surface](https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache) remains outstanding.

## Explicitly unsupported and unverified

- **UI and rendering:** Modal, Setting/PluginSettingTab, ribbon/status bar, DOM components, custom views, Markdown processors, editor extensions/suggestions, theme/CSS integration.
- **Storage and environment:** binary Vault operations, DataAdapter/fs/process, Node/Electron globals, external `require` modules, plugin rename/trash/delete and atomic process callbacks.
- **Workspace and expansion APIs:** leaf trees, pop-outs, protocol/URI handlers, hover sources, Bases view providers and CLI registration.
- **Cache and events:** exact offsets/caches, resolved/unresolved graph maps, external plugin settings changes, create/delete/rename/indexed/layout/editor/window events.
- **Distribution and real-world parity:** marketplace/update/install/signing, minAppVersion certification, mobile plugin behavior and all published community plugins. Worker isolation is not an adversarial security boundary.

Notice uses a shared app toast, not reference DOM notices; custom duration, DocumentFragment, hide and noticeEl are rejected. `apiVersion` is deliberately `0.0.0`; `requireApiVersion` does not pretend to certify a current Obsidian API release. These boundaries are part of the versioned contract, not subscription exclusions.

## Tests and interpretation

`tests/compatibility.test.ts` covers all 271 export names, primary member-inventory consistency, callback precedence and availability, lifecycle cleanup, data, file identities/text operations, event cleanup, editor offsets/mutations, utility subsets and explicit unsupported methods. `tests/vault.test.mjs` additionally tests real create/append behavior, data persistence, malformed/oversized data and in-vault cross-plugin symlinks. These tests verify original Engine behavior, not an imported reference implementation.

Desktop cases in `e2e-desktop/vault.spec.ts` exercise an original CommonJS fixture through the production bundle: enable, text create/append, data save/load, disable/unload/re-enable, editor selection modification and five negative loaders covering DOM, Node, unavailable export, editor extension and Bases registration. The existing Engine API fixture remains tested. Negative-loader success means unsupported behavior was properly refused; it is **not** positive compatibility.

Real Dataview, Templater, Calendar (Beta), Advanced Tables and Reading Time release files are tested by `e2e-desktop/corpus.spec.ts`, with pinned hashes and observed startup results in `COMMUNITY-PLUGIN-TESTS.md`. Their source is not copied into Engine. The corpus exposed a CommonJS `__esModule` metadata-probe issue: that probe now returns false without inventing an API export. This does not fix all module wrappers; a copied namespace can still turn an unavailable class into a generic load error rather than a named CompatibilityError. All five fail at startup, with the exact failure recorded and no claim to have identified every subsequent blocker.

## Local installation and trust

Place your independently licensed plugin's `manifest.json` and CommonJS `main.js` under `.crafactory/plugins/<id>/`, reopen Settings > Community plugins, and explicitly enable it. The manifest ID must match a lowercase letters/digits/hyphens folder. The original `examples/plugins/compat-fixture` demonstrates the supported subset and is not a port of an Obsidian sample.

Data lives in `.crafactory/plugins/<id>/data.json`, capped at 1 MiB of serialized JSON. Hidden-path access is not available through the text API; plugin metadata rejects namespace symlinks. Plugins may read/modify notes and save data during startup, commands and unload; startup failure does not roll back already completed file writes. Errors remove commands and disable the Worker rather than leave it apparently enabled. Graceful shutdown has a two-second Worker timeout, so pathological unload callbacks are not guaranteed to finish.

Only enable trusted code and use backed-up test vaults. No automatic `.obsidian` discovery, source rewriting, permission escalation or download occurs. Enabling is not persisted across launches. Vault switching stops plugins before changing the filesystem; canceling the vault picker still leaves them disabled.

## Required next compatibility gates

- [ ] Pin an installed reference application version and compare externally observable behavior without importing its code.
- [ ] Expand every member, overload, callback/event and timing contract beyond the primary 12-class inventory.
- [ ] Expand the initial five-plugin startup corpus into license-reviewed functional coverage across commands/editor, metadata/search, daily notes, rendering, settings/views and Bases/Canvas.
- [ ] Record for each corpus plugin: manifest/version/license, APIs observed, startup results, actual workflow behavior, persistence, unload, platforms and unsupported reason. Do not substitute synthetic fixtures for these results.
- [ ] Resolve DOM/main-thread, CodeMirror and Node/Electron assumptions under explicit permissions and safety tests before broad compatibility claims.

Until those gates pass, describe this as an experimental compatibility subset. The parent's feature checkbox remains unchecked.
