# Plugin compatibility report

Crafactory Engine v0.4.0 provides an experimental independent compatibility subset, not comprehensive Obsidian plugin support. Original code is MIT; dependency licenses remain intact. No proprietary application implementation, SDK package, declaration files or sample-plugin source is used. Public behavioral references and unchanged, external community-plugin release bytes serve different roles: documentation informs original adapters; real plugins are black-box test inputs only.

## Two explicit runtimes

- **Default Worker:** 27 bounded runtime exports, commands, asynchronous lifecycle, text files, plugin-local JSON and one editor selection. DOM, editor extensions and external CommonJS modules remain rejected. Graceful Worker unload has a two-second force-termination limit.
- **Opt-in trusted renderer:** the same 27 plus 16 bounded UI exports, for 43 runtime exports. Select the mode in Community plugins while disabled and approve the separate warning. This mode is NOT sandboxed: plugin source runs on the main renderer and can access DOM, the entire vault bridge and workspace metadata. Main-thread freezes or pathological asynchronous unload cannot be forcibly stopped; completed writes are not rolled back. Do not use untrusted code.

Both modes start disabled, use local `.crafactory/plugins/<id>/manifest.json` and `main.js`, and reset enabled/runtime choices on restart. No automatic `.obsidian` discovery, downloads, marketplace, updates or silent renderer fallback occurs. `script-src` now permits Blob modules for user-authorized source loading, but not `unsafe-eval` or inline script. Electron retains context isolation, sandbox and disabled Node integration. Those platform settings do not isolate trusted renderer plugins from application capabilities.

The [public API index](https://docs.obsidian.md/Reference/TypeScript+API/index) inventory remains 271 names: 154 runtime and 117 type-only. `API-COVERAGE.md` now distinguishes Worker and renderer columns; export availability never establishes every member, overload, timing contract or plugin workflow. `compatibility/member-contracts.json` remains a 12-class Worker baseline, not a renderer or exhaustive member audit.

## New renderer contracts and boundaries

- **Settings:** real PluginSettingTab/SettingTab mounting, display/hide, Setting name/description and text, textarea, dropdown, toggle, button and slider controls, with plugin callbacks and existing saveData persistence. The reference lists are [PluginSettingTab](https://docs.obsidian.md/Reference/TypeScript+API/PluginSettingTab), [Setting](https://docs.obsidian.md/Reference/TypeScript+API/Setting), and [TextComponent](https://docs.obsidian.md/Reference/TypeScript+API/TextComponent). Unsupported controls, option listeners and icon buttons still fail; this is not full settings layout/default/validation equivalence.
- **Modal:** original DOM dialog, title/content, open/close callbacks, Escape/outside/close-button handling, keyboard focus cycle and selection-focus restoration. See [Modal documentation](https://docs.obsidian.md/Reference/TypeScript+API/Modal). Scope/keymap integration, stacked-dialog equivalence, mobile animation and complete focus/selection semantics remain unfinished.
- **DOM/status:** a bounded set of HTMLElement creation/text/class/visibility helpers, registered native DOM event cleanup and real status items. Status items currently occupy a separate compact dock above the application status bar, not exact reference placement; all DOM extensions, sanitization and adversarial cleanup remain unaudited.
- **Views:** independently implemented View/ItemView/WorkspaceLeaf classes and registered factories create actual closable plugin panes. See [ItemView](https://docs.obsidian.md/Reference/TypeScript+API/ItemView). These are dedicated overlay panes, not an equivalent workspace leaf tree. `getRightLeaf(false)` and `getLeaf()`/`getLeaf(true)` create a new dedicated pane; split/reuse semantics, menus/actions, resizing, popouts, activeLeaf and Markdown leaves remain unsupported or unverified. Basic get/set state does not reproduce history/layout persistence.
- **CodeMirror:** `registerEditorExtension` applies the host's real extensions via an editor Compartment; mutating a registered extension array and calling `workspace.updateOptions` reconfigures it, following the [registration contract](https://docs.obsidian.md/Reference/TypeScript+API/Plugin/registerEditorExtension). Removal on disable, source/live transitions and StateField/updateListener interoperability are tested with original fixtures. Only the active primary editor receives extensions; secondary split editors, upstream plugins using undocumented editor internals and full Live Preview decorations are not certified.
- **Workspace events:** renderer adds layout-change and editor-change to file-open; editor callbacks observe refreshed snapshots and getViewData reads the active document in reading mode. See [Workspace](https://docs.obsidian.md/Reference/TypeScript+API/Workspace). Selection-only transactions do not emit editor-change, exact reference order/timing and other workspace events are not implemented.

The renderer CommonJS module allowlist contains the installed host packages `@codemirror/state`, `view`, `commands`, `language`, `search`, `autocomplete`, `lang-markdown`, and `@lezer/highlight`. This is not arbitrary npm/Node loading, vendored proprietary modules or reference module-version equivalence. Unknown modules such as `fs` reject explicitly.

## Existing contracts

Plugin/Component retain awaited lifecycle and cleanup, command registration and plugin data; command precedence is editorCheckCallback, editorCallback, checkCallback, callback, with synchronous checking. Custom hotkeys/icon/repeatable/mobileOnly reject. Public behavior is described in [Plugin](https://docs.obsidian.md/Reference/TypeScript+API/Plugin), [Component](https://docs.obsidian.md/Reference/TypeScript+API/Component), and [Command](https://docs.obsidian.md/Reference/TypeScript+API/Command).

Vault supports snapshot file identities and allowlisted text read/create/modify/append/copy/createFolder; options, binary/adapter/rename/delete/trash/process APIs reject. See [Vault](https://docs.obsidian.md/Reference/TypeScript+API/Vault). createFolder now returns the resulting TFolder; create refuses overwrite, appends serialize in-process, writes use optimistic conflicts, and plugin data is isolated by ID, capped at 1 MiB and rejects namespace symlinks. Cross-process/power-loss atomicity and stats equivalence are not certified.

Editor remains a single UTF-16 snapshot selection with asynchronous expected-text-checked writes, not direct reference Editor/CodeMirror internals. Live selections inside hidden frontmatter reject. MetadataCache remains a limited getFirstLinkpathDest resolver, not complete cache offsets/events. Full contracts remain outstanding in [Editor](https://docs.obsidian.md/Reference/TypeScript+API/Editor) and [MetadataCache](https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache). Notice still uses a shared string toast; apiVersion stays `0.0.0`, deliberately not certifying an Obsidian release.

## Real plugins and interpretation

Default Worker still fails all five pinned releases at startup, as recorded in `COMMUNITY-PLUGIN-TESTS.md`. Separate trusted-renderer outcomes and exact bounded workflows are recorded in `TRUSTED-RENDERER-PLUGIN-TESTS.md` and `compatibility/renderer-community-results.json`; the input hashes have not changed.

Reading Time receives positive assertions for document time, settings persistence, editor changes, reading/source transition, selected-text Modal, disable and re-enable. This is not full Reading Time equivalence. Calendar and Advanced Tables startup alone do not certify functional behavior; Dataview and Templater still have first-load blockers. Generic class errors are not guessed API diagnoses. Community stylesheets remain unsupported, and third-party source is never copied into Engine or installer.

Tests in `tests/renderer-contracts.test.ts` cover renderer dispatch/event contracts; `e2e-desktop/renderer.spec.ts` tests actual controls, focus, editor integration, failure cleanup and view/unload. The original Worker export/member/rejection tests remain. Real corpus tests run only with verified external inputs; ordinary CI skips them, while the manual corpus workflow runs both modes. A passing negative test means refusal was observed, not successful compatibility.

## Unfinished gates

- [ ] Fix an installed reference application version for clean-room external differential tests.
- [ ] Audit every public member, overload, event, timing contract and DOM extension.
- [ ] Execute Calendar/Advanced Tables workflows and resolve Dataview/Templater blockers.
- [ ] Full renderer processors, MarkdownRenderChild, editor suggestions, ribbons, menus, CSS/theme variables and multiple leaves.
- [ ] Node/Electron/network/module assumptions under an explicit reviewed permission policy.
- [ ] Marketplace, version requirements, protocol/URI, hover, Bases and CLI extension APIs.
- [ ] Native Windows/macOS/mobile functional runs; installer, upgrade and migration behavior.
- [ ] License/security/accessibility/adversarial and large-vault audits.

These are not subscription exclusions. Keep parent feature checkboxes unchecked; only bounded acceptance checkpoints may be signed off.
