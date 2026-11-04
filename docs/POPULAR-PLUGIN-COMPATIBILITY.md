# Popular-plugin compatibility: evidence and remaining gaps

This increment extends PR #70 and PR #71 rather than replacing their bounded renderer workflows. The ten targets below are a roadmap and reproducible corpus, not a claim that all ten are fully supported.

## Selection and reproducibility

The target set is the all-time download top ten on [Obsidian Stats](https://www.obsidianstats.com/most-downloaded), fetched on 2026-11-03 from its cached 2026-10-09 snapshot. These are not live November download counts or a claim about active users. Identities are checked against the [official community registry](https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json). Pinned versions are release inputs, not an assertion that every target is its newest release.

| Rank | Target | Pinned release | Verification scope |
|---|---|---|---|
| 1 | Excalidraw | 2.29.1 | Native-profile pointer drawing, saved scene and application restart; private core Canvas integration still rejected |
| 2 | Templater | 2.26.0 | Existing insertion, creation, startup/user scripts and settings workflows |
| 3 | Dataview | tag 0.5.70 / manifest 0.5.68 | Existing bounded DQL and DataviewJS workflows |
| 4 | Tasks | 8.6.0 | Cross-note not-done query, completion persisted to source, query refresh |
| 5 | Git | 2.42.0 | Native-profile stage/commit/push to local bare remote and peer-commit pull; authentication/conflicts not certified |
| 6 | Advanced Tables | 0.23.2 | Existing live-editor table-formatting workflow |
| 7 | Calendar | tag 2.0.0-beta.2 / manifest 2.0.0 | Existing today/create/open daily-note workflow |
| 8 | Copilot | 4.0.17 | Startup with background failure at `App.secretStorage`; inference not tested |
| 9 | Style Settings | 1.0.9 | Startup only; full theme/snippet acceptance unfinished |
| 10 | Kanban | 2.0.51 | Board/list and unchecked-card creation, exact Markdown save, switch and restart/reopen; no recorded errors in the bounded run |

Reading Time 1.1.2 remains an eleventh regression sentinel, not a top-ten claim. Hashes, repositories, identities, actual outcomes and workflows are recorded in the [pins](compatibility/community-corpus.json), [renderer evidence](TRUSTED-RENDERER-PLUGIN-TESTS.md), and [Worker evidence](COMMUNITY-PLUGIN-TESTS.md). External binaries stay outside checkout and packaging inputs. New input licenses have not been audited; test downloads do not authorize redistribution.

## Implementation

- **Markdown DOM shape:** sanitized output nodes are appended directly to the caller's element, without a private wrapper. Tasks relies on this direct-parent relationship to insert controls. Cleanup removes only Engine-rendered nodes, preserving unrelated siblings.
- **Text file views:** file loads, switches and close transitions serialize in request order, including recovery after a load failure. `TextFileView` reads content plus its disk version, retains that version for compare-and-swap writes, debounces/serializes saves and flushes before closing. Original Electron tests cover `.txt` autosave, persisted reopening, external-edit conflicts without overwriting external bytes, retained drafts and transition races.
- **Keyboard/suggestion UI:** renderer `App.scope` and modal scopes support exact modifiers, registration/removal and parent fallback. `SuggestModal` supports async results, stale-result suppression, arrow/Enter selection and close-time invalidation. Cross-plugin simultaneous modal arbitration is not reference-equivalent.
- **Icons/DOM:** actual Lucide lookup, sanitized custom SVG registration and cloned nodes replace the old no-op `addIcon`. Button icons, native-title tooltips, class/CSS helpers and bounded active-window/document/global/sleep aliases are available.
- **Host integration:** `getLanguage()` returns `en`, matching Engine's UI rather than OS locale. Theme/custom-CSS settings changes emit `css-change`. Style Settings' explicit parse event can be registered/triggered. Lezer LR/common use actual open-source modules.
- **Evidence:** all eleven pinned inputs run in both modes. Reports retain runtime/console diagnostics and distinguish background errors, clean startup, and bounded workflows. Recoverable console warnings are retained even when a bounded workflow passes.
- **Native shutdown:** early window-close requests wait for the renderer's initialized save/unload listener, rather than being lost during startup. Close-time state flush also retains property types instead of relying on the debounced settings save.

## Remaining scope and security

Worker remains the default and rejects DOM/native modules. Renderer execution remains explicit, unsandboxed opt-in. Unsafe evaluation is a separate profile-level opt-in; corpus profiles are disposable. The separately confirmed [native profile](NATIVE-PLUGIN-PERMISSIONS.md) grants unrestricted filesystem/process access to every renderer script, not just one plugin. Neither default execution nor enabling a renderer plugin alone grants native access.

Git receives actual native modules in that full-trust profile rather than fake filesystem/process modules. Disposable-repository acceptance does not establish credential, cancellation or conflict safety for arbitrary user repositories. The original embed registry and editable CodeMirror source surface are bounded implementations, not complete private-API parity; `metadataTypeManager` remains unsupported. Tasks' recoverable property-type warning is recorded; automatic reference-app property-type integration is not implemented.

The remaining goal includes additional Excalidraw tools/export/embedding and core Canvas integration, Kanban later card edits/completion/move/conversion/pointer dragging, Git diff/backup/conflict/authentication flows, Copilot authorized authenticated inference, and Style Settings CSS round trips. Existing bounded tests establish neither mobile compatibility nor arbitrary versions, complete settings coverage, cross-plugin focus sharing or all upstream features.

## Public contracts

Implementations are original and follow documented shapes: [Scope](https://docs.obsidian.md/Reference/TypeScript+API/Scope), [keyboard callback cancellation](https://docs.obsidian.md/Reference/TypeScript+API/KeymapEventListener), [SuggestModal](https://docs.obsidian.md/Reference/TypeScript+API/SuggestModal), [TextFileView](https://docs.obsidian.md/Reference/TypeScript+API/TextFileView), and [getLanguage](https://docs.obsidian.md/Reference/TypeScript+API/getLanguage). Community bundles were external black-box inputs; their implementation source was not used to implement adapters.
