# Obsidian plugin support tracker

This document is the single tracking surface for **verified external-plugin compatibility**. It
records only pinned release bytes exercised as black-box inputs; it is not a claim that every
plugin or API works. How to work on compatibility is distilled in [REPLICATION-PLAYBOOK.md](REPLICATION-PLAYBOOK.md); concrete commands and checklists are in [REPLICATION-RUNBOOK.md](REPLICATION-RUNBOOK.md).
Detailed API boundaries remain in
[PLUGIN-COMPATIBILITY.md](PLUGIN-COMPATIBILITY.md), and per-run evidence remains in
[TRUSTED-RENDERER-PLUGIN-TESTS.md](TRUSTED-RENDERER-PLUGIN-TESTS.md) and
[compatibility/renderer-community-results.json](compatibility/renderer-community-results.json).

**Last matrix update:** 2026-11-03. **Runtime:** explicit trusted renderer (not sandboxed) for
the functional rows unless stated otherwise; pinned default-Worker runs still fail.

## Status legend

| Mark | Meaning |
|---|---|
| ✅ | Named bounded workflow(s) pass with real UI/input and persisted effects |
| 🟡 | Startup or partial behavior only; no end-to-end workflow claim |
| ❌ | Not supported or not yet exercised |
| 🔒 | Requires an explicit security opt-in (desktop `unsafe-eval`) |

“Startup only” means the plugin’s enable switch became checked and its startup hooks completed.
It does **not** certify commands, views, rendering, menus, settings behavior or unload.

## Plugin tracker

| Plugin | Pinned release | Outcome | Verified workflows | Main boundary / next step |
|---|---|---|---|---|
| **Dataview** | `0.5.70` / manifest `0.5.68` | ✅ `BOUNDED_WORKFLOWS_PASS` | `TABLE`, `TASK`, `LIST FROM`, `WHERE`, `SORT`/`LIMIT`, `GROUP BY`, `FLATTEN`, inline query, DataviewJS, `dv.view` | Not full query/frontmatter/view semantics; DataviewJS and `dv.view` need 🔒 desktop `unsafe-eval` |
| **Reading Time** | `1.1.2` | ✅ `BOUNDED_WORKFLOWS_PASS` | 400-word test at 200 wpm; speed setting persists; reading/source transition; editor change 8 min; selected-text modal; disable/re-enable | Format variants, invalid input, timing and multiple leaves remain unverified |
| **Templater** | `2.26.0` | ✅ `BOUNDED_WORKFLOWS_PASS` | Template folder, toggle and dropdown settings persist across restart; dangerous trigger-on-creation confirmation cancel/confirm persists locally; template hotkey list add/delete persists; insert template into the active note; exact inserted content persists; disable/re-enable re-registers the command; create a new note from a template and open its exact content | Other dangerous settings (startup/system commands), other lists, number validation, user scripts, startup templates and shell/system functions remain unverified |
| **Calendar (Beta)** | `2.0.0-beta.2` | 🟡 `STARTUP_ONLY` | Startup only | Needs a real workspace leaf/view lifecycle, daily-note integration and menu behavior |
| **Advanced Tables** | `0.23.2` | 🟡 `STARTUP_ONLY` | Startup only | Needs editor-command and CM5/CM6 table integration workflows |

Evidence references: Dataview from pinned Linux corpus workflow `41042973930`; Templater
insertion from the local macOS desktop corpus run on 2026-11-03 (pinned Linux rerun still
pending); Reading Time from its bounded corpus run; Calendar/Advanced Tables retain their latest
pinned startup results. Exact hashes and timestamps are in
[renderer-community-results.json](compatibility/renderer-community-results.json); the Templater
entry there is still the older Linux `STARTUP_ONLY` record until the next Linux run replaces it.

## Dataview detail

Dataview is the deepest compatibility target today. The corpus note and fixtures exercise:

| Capability | Evidence |
|---|---|
| Table/list rendering | `TABLE file.name`, `LIST`, `TASK` |
| Source selection | `FROM "Folder"`, `WHERE file.name = ...` |
| Ordering and cardinality | `SORT file.name DESC`, `LIMIT 2` |
| Aggregation/grouping | `GROUP BY file.folder`, `length(rows)` |
| Flattening | `FLATTEN file.etags AS Tag` |
| Inline query | `` `= this.file.name` `` → resolved title |
| JavaScript query | `dataviewjs` block → `JS Test` |
| Custom view script | `dv.view("View", …)` → `VIEW Test` |
| Metadata | `MetadataCache.getFileCache/getCache` with frontmatter/headings/links/tags/sections/listItems/blocks |

Known Dataview gaps:

- No claim for complete expression semantics, frontmatter-heavy queries, Dataview inline JS,
  workspace views, exact section partitioning, `frontmatterLinks` or
  `resolvedLinks`/`unresolvedLinks`.
- `unsafe-eval` is required for DataviewJS and `dv.view`; only the desktop
  `trusted.html` entry provides it, behind the Community plugins warning + native confirmation
  + restart. The browser preview and default entry stay strict.
- `dv.view` is a script file loaded through `getFirstLinkpathDest` + `vault.read` +
  `new Function`; it is **not** a workspace leaf view in Dataview 0.5.70.

## Templater detail

Templater reaches `BOUNDED_WORKFLOWS_PASS` for three workflows under the 🔒 desktop trusted
entry (`unsafe-eval` + `wasm-unsafe-eval`):

1. **Settings persistence:** opens the declarative plugin settings, changes **Template folder
   location** to `Templates`, enables **Automatic jump to cursor**, selects **User script
   intellisense** value `4`, cancels and then confirms the dangerous **Trigger Templater on new
   file creation** warning (including the acknowledgement checkbox), adds a **Template hotkey**
   and deletes it, verifies `data.json` and `templater-local-settings`, restarts the app,
   re-enables Templater and verifies the text/toggle/dropdown/local/list values.
2. **Insert template:** runs **Open insert template modal**, picks the template, and verifies
   exact editor and persisted note bytes.
3. **Create note from template:** runs **Create new note from template**, picks
   `Templates/Create`, and verifies the new `Untitled.md` opens with the exact template content
   and persists to disk.

The corpus then disables and re-enables the plugin and verifies the insert command is registered
again. The Templater corpus now asserts no page errors for these workflows.

The bounded surface that made this possible includes CodeMirror 5 mode/helper/MIME shims,
`FileSystemAdapter`, `Platform`, `AbstractInputSuggest`, `FuzzySuggestModal`, `SettingPage`,
`ConfirmationModal`, numeric Notice durations, command icon/hotkey metadata, CLI-handler
acceptance, `file-menu` events, `util`/`child_process` stubs (`exec` refuses), `App.loadLocalStorage`/
`saveLocalStorage`, a bounded CodeMirror 5 document view through `Editor.getDoc`,
`MarkdownView.save` backed by a host save/flush operation, `Vault.getAvailablePath`, a reusable
workspace leaf with `openFile`/ephemeral state, global `createEl`/`createDiv`/`createSpan`, an
`Array.prototype.contains` alias and a bounded declarative settings renderer for
`getSettingDefinitions()` groups/pages/items, toggle/dropdown/text/number/folder controls and list
add/delete.

Not yet verified:

- Other dangerous settings (startup templates/system commands), other lists (user scripts,
  folder/file templates), number-control validation
- Nested folder creation and conflict naming beyond the single `Untitled` case
- User scripts and startup templates
- Shell/system functions (`child_process` is deliberately refused)
- Exact reference settings navigation/search, leaf, unload and error-recovery semantics

## Candidate plugins (next validation targets)

| Candidate | What it would exercise |
|---|---|
| **Tasks** | Query parsing, date handling, code-block rendering, vault events |
| **QuickAdd** | `SuggestModal`/`FuzzySuggestModal`, file creation, macros |
| **Kanban** | Custom `ItemView`/leaf lifecycle, Markdown board rendering |
| **Excalidraw** | Custom file view, asset/binary handling, Canvas-like embedding |
| **Style Settings** | CSS variables, theme/settings persistence |
| **Omnisearch** | Index/search semantics, modal and result rendering |

Candidates are not compatibility claims until they are pinned, hashed, added to
`community-corpus.json` and covered by a bounded workflow.

## Capability matrix

This is the host/API surface behind the plugin rows. “Partial” means the named subset exists
and has explicit rejection or documented gaps for the rest.

| Capability | State | Implemented / verified | Boundary or consumer |
|---|---|---|---|
| Plugin lifecycle, commands, settings, ribbon/status | ✅ | Load/unload, commands (including icon/hotkey metadata), settings tabs, ribbon/status, notices, `registerCliHandler` acceptance | Exact reference timing/visuals differ |
| App identity / local storage | 🟡 | `appId`, empty `internalPlugins`, JSON-backed `loadLocalStorage`/`saveLocalStorage` | Other App members reject; trusted-renderer storage is per profile with a per-runtime memory fallback, not a vault file |
| Vault text I/O and file identity | 🟡 | Read/create/modify/append/copy/mkdir/rename/trash, `getAvailablePath`; `.md/.txt/.canvas/.base/.csv/.json/.css/.js/.mjs`; plugin data | No binary/process/delete APIs; rename event not synthesized |
| `FileSystemAdapter` / platform identity | 🟡 | Bounded `getBasePath`/`getName` from the desktop base path; `Platform` fields | Rejects when no base path; not a complete adapter |
| MetadataCache | 🟡 | `getFileCache/getCache` with frontmatter, headings, links/embeds, tags, sections, listItems, blocks and full-file positions; changed/deleted/resolved/resolve | No exact reference section partitioning, frontmatter-link cache or resolved/unresolved link maps |
| Workspace / views / leaves | 🟡 | Dedicated plugin view panes, getLeaf/getRightLeaf/getLeavesOfType/revealLeaf, reusable `getLeaf(false)` with `openFile`/ephemeral state, `file-menu` with rendered `Menu`/`MenuItem`, `MarkdownView.save` flushes pending editor writes | No real tab/leaf tree, splits, popouts, activeLeaf or layout persistence |
| Editor / CodeMirror | 🟡 | CM6 provider, selection/mutation host, plugin extensions, editor suggest, `editorInfoField`/`editorLivePreviewField`, bounded CM5 shim and `Editor.getDoc` document view | Multiple leaves, undocumented CM internals and a real CM5 Doc object are unsupported |
| Markdown processors | ✅ | Reading post-processors, named code processors, `MarkdownRenderChild`, static sanitized renderer, opt-in live block previews | Live processors are opt-in block kinds, not full reference Live Preview |
| DOM / UI components | 🟡 | Bounded HTMLElement/DocumentFragment helpers, global `createEl`/`createDiv`/`createSpan`, Modal, ConfirmationModal, Menu/MenuItem, Settings, declarative `getSettingDefinitions` rendering, AbstractInputSuggest, FuzzySuggestModal, View/ItemView/WorkspaceLeaf | Full settings navigation/search/list semantics, theme icons, menus, popovers, mobile and accessibility parity unverified |
| Network / Node modules | ❌ | `util` and refusing `child_process` shims only | No `requestUrl`, `moment`, `fs`, `path`, arbitrary npm or Electron Node |
| CSP / security | 🔒 | Default entry is `script-src 'self' blob:` (no `unsafe-eval` or `wasm-unsafe-eval`); desktop `trusted.html` opt-in adds both; native confirmation + restart | Trusted renderer is **not** sandboxed; `unsafe-eval` is a deliberate risk; the default entry has no verified WebAssembly-only workflow |
| Plugin discovery / distribution | ❌ | Local `.crafactory/plugins/<id>/{manifest.json,main.js}` only | No `.obsidian` discovery, marketplace, updates, dependency install or signatures |

## Verification commands

```sh
npm run check
npm run test:e2e
npm run test:desktop
ENGINE_PLUGIN_CORPUS=/tmp/engine-plugin-corpus node scripts/corpus.mjs
ENGINE_PLUGIN_CORPUS=/tmp/engine-plugin-corpus \
ENGINE_RENDERER_CORPUS_REPORT=/tmp/engine-renderer-corpus-results \
npx playwright test -c playwright.desktop.config.ts e2e-desktop/renderer-corpus.spec.ts
```

The optional corpus workflow is skipped without verified inputs; skipped is not passed.
Third-party source is never copied into Engine. Exact release bytes are pinned by SHA-256.
