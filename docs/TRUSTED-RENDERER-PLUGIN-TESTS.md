# Trusted-renderer real-plugin tests

Unchanged upstream release bytes, pinned in `compatibility/community-corpus.json`, are loaded only into disposable Linux x64 vaults. Explicit trusted renderer is **not sandboxed**. These outcomes do not supersede default Worker failures or establish full plugin compatibility. No installed reference application or Windows/macOS/mobile differential test has been performed.

| Plugin | Tag / manifest | Observed outcome | First blocker or bounded workflows | Upstream |
|---|---|---|---|---|
| Dataview | 0.5.70 / 0.5.68 | BOUNDED_WORKFLOWS_PASS | TABLE file.name/file.mtime; TASK; LIST FROM folder; LIST WHERE file.name; LIST SORT/LIMIT; GROUP BY folder; FLATTEN etags; DataviewJS; dv.view custom view; inline query | [Dataview](https://github.com/blacksmithgu/obsidian-dataview) |
| Templater | 2.26.0 / 2.26.0 | BOUNDED_WORKFLOWS_PASS | template folder, toggle and dropdown settings persist across restart; dangerous setting cancel/confirm persists locally across restart; startup template runs and creates an exact note after restart; user script function inserts exact output; template hotkey list add/delete and restart persistence; insert template into active note; persist exact editor content; disable/re-enable re-registers command; create new note from template and open exact content | [Templater](https://github.com/SilentVoid13/Templater) |
| Calendar (Beta) | 2.0.0-beta.2 / 2.0.0 | BOUNDED_WORKFLOWS_PASS | open calendar view; create today daily note from template; exact daily note content and open | [Calendar (Beta)](https://github.com/liamcain/obsidian-calendar-plugin) |
| Advanced Tables | 0.23.2 / 0.23.2 | BOUNDED_WORKFLOWS_PASS | format table at cursor; exact editor/disk persistence | [Advanced Tables](https://github.com/tgrosinger/advanced-tables-obsidian) |
| Reading Time | 1.1.2 / 1.1.2 | BOUNDED_WORKFLOWS_PASS | 400-word document at 200 wpm; reading speed setting saves 100 wpm; reading/source transition retains 4 min; editor-change: 800 words -> 8 min; 10-word selection modal at 100 wpm; Escape closes modal; disable removes status and settings; re-enable restores setting and 8 min | [Reading Time](https://github.com/avr/obsidian-reading-time) |
| Excalidraw | 2.29.1 / 2.29.1 | BOUNDED_WORKFLOWS_WITH_ERRORS | Unsupported Obsidian capability: Obsidian core Canvas plugin. See docs/PLUGIN-COMPATIBILITY.md. | [Excalidraw](https://github.com/zsviczian/obsidian-excalidraw-plugin) |
| Tasks | 8.6.0 / 8.6.0 | BOUNDED_WORKFLOWS_WITH_ERRORS | App.metadataTypeManager remains unsupported; task query/completion workflows passed with the recorded property-type error | [Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) |
| Git | 2.42.0 / 2.42.0 | BOUNDED_WORKFLOWS_PASS | explicit native profile uses real Node modules; stage current file updates the real index; commit staged with specific message creates a local commit containing the edit; push updates a disposable local bare remote; pull imports a peer commit and refreshes the real editor; no credentials or Internet remote used | [Git](https://github.com/vinzent03/obsidian-git) |
| Copilot | 4.0.17 / 4.0.17 | STARTUP_WITH_ERRORS | Copilot failed to start. CompatibilityError: Unsupported Obsidian capability: App.secretStorage. See docs/PLUGIN-COMPATIBILITY.md.     at W (engine://app/assets/main-BWPv2eAV.js:667:3093)     at Object.get (engine://app/assets/main-BWPv2eAV.js:667:3264)     at UA.isAvailable (blob:engine://app/a1b35de4-3d23-4b75-aeaf-e87a9fa89825:1189:4232)     at m5r (blob:engine://app/a1b35de4-3d23-4b75-aeaf-e87a9fa89825:2428:18714)     at f8t (blob:engine://app/a1b35de4-3d23-4b75-aeaf-e87a9fa89825:2428:19014)     at qRe.loadSettings (blob:engine://app/a1b35de4-3d23-4b75-aeaf-e87a9fa89825:4279:17601)     at async qRe.initialize (blob:engine://app/a1b35de4-3d23-4b75-aeaf-e87a9fa89825:4279:1834) | [Copilot](https://github.com/logancyang/obsidian-copilot) |
| Style Settings | 1.0.9 / 1.0.9 | STARTUP_ONLY | No functional workflows executed | [Style Settings](https://github.com/obsidian-community/obsidian-style-settings) |
| Kanban | 2.0.51 / 2.0.51 | BOUNDED_WORKFLOWS_WITH_ERRORS | Card creation remains blocked: Cannot read properties of undefined (reading 'has'); embedded focus also reports missing setTimeout | [Kanban](https://github.com/obsidian-community/obsidian-kanban) |

`STARTUP_ONLY` means startup completed and the enabled switch became checked. It does not certify any plugin commands, custom view, rendering or later background behavior. `LOAD_ERROR` does not diagnose which unavailable class caused the generic error. Only the workflows explicitly listed above received positive functional assertions, through real UI inputs and JSON persistence. Reading Time format variants, invalid inputs, exact timing, frontmatter/CJK/word-count edge cases, multiple leaves and all reference behavior remain unverified. Dataview query/expression/view coverage remains bounded.

## Reproduction

```sh
ENGINE_PLUGIN_CORPUS=/tmp/engine-plugin-corpus node scripts/corpus.mjs
ENGINE_PLUGIN_CORPUS=/tmp/engine-plugin-corpus \
ENGINE_RENDERER_CORPUS_REPORT=/tmp/engine-renderer-corpus-results \
xvfb-run -a npm run test:desktop -- e2e-desktop/renderer-corpus.spec.ts
ENGINE_RENDERER_CORPUS_REPORT=/tmp/engine-renderer-corpus-results node scripts/renderer-corpus-report.mjs
```

The manual `plugin-corpus.yml` workflow runs both modes. Optional corpus tests are skipped without the input directory; skipped is not passed. `E2E_EXECUTABLE_PATH` selects a packaged app. Third-party bundles/manifests/CSS are never committed, redistributed or incorporated into Engine; optional upstream stylesheets are hash-verified and owned by the enabled renderer plugin. Exact hashes, platform, mode, time and observed workflows are in `compatibility/renderer-community-results.json`. Plugin repository-license metadata is not a transitive-license audit.

Excalidraw, Kanban, Git and Copilot runs use the explicit native profile with profile-wide filesystem, process, credential and network access. Dataview, Templater, Kanban and Excalidraw use the separate evaluation opt-in. Each JSON row records both grants and the optional stylesheet hash. None of these grants is a per-plugin sandbox.

`STARTUP_WITH_ERRORS` means the switch became enabled but runtime or console errors were observed during the bounded startup observation window. It is not a working-plugin claim. Full runtime/console diagnostics are retained in the JSON evidence, including recoverable warnings in otherwise passing bounded workflows. Startup-only observation includes opening the command palette and waiting 2.5 seconds after searching for the plugin name; it is not continuous background monitoring or command execution acceptance.
