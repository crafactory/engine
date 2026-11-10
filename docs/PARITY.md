# Functional parity and current gaps

This is a workflow comparison, not a parity percentage or a claim of reference-equivalent
behavior. The official core-plugin index was checked on 2026-11-06 UTC; it currently lists
Footnotes view and Tags view, and no longer lists Format converter as a core plugin
([Obsidian core plugins](https://help.obsidian.md/plugins)).
Sync and Publish remain excluded by project policy; free extensions, Android, editing
behavior and community-plugin compatibility remain in scope.

The generated [feature checklist](FEATURE-CHECKLIST.md) is the acceptance ledger.
[PLUGIN-SUPPORT-MATRIX.md](PLUGIN-SUPPORT-MATRIX.md) is the single per-plugin verdict tracker;
do not copy its verdicts into a second matrix. [VERIFICATION.md](VERIFICATION.md) records
frozen executions, not permanently valid counts. [ANDROID.md](ANDROID.md) records the
framework decision, native acceptance and Android-specific limitations.

## Status meanings and evidence boundaries

- **Implemented subset**: a bounded owned workflow exists; missing behavior is explicit.
- **Partial**: only part of the reference workflow exists, or an integration boundary remains.
- **Not implemented**: the named workflow is absent; adjacent syntax/UI is not a substitute.
- **Excluded**: only the two project-policy exclusions below.
- **Unverified**: source or startup success is not evidence that the named operation works.

The shared frontend uses CodeMirror, a Markdown renderer and owned document/workspace/
storage/render services. The optional Obsidian facade consumes those services rather than
replacing the host. Desktop persistence uses the Electron bridge; browser preview remains
temporary. Android's development pilot passed nine actual filesystem/WebView workflow
groups on the final accepted #76 head ([native run](https://github.com/crafactory/engine/actions/runs/42188594088));
responsive browser rendering alone does not count as Android acceptance.
Service boundaries and remaining migration details are in
[NATIVE-PLUGIN-ARCHITECTURE.md](NATIVE-PLUGIN-ARCHITECTURE.md).

## Editing and document stability

Obsidian distinguishes Reading view from Editing view, with Live Preview and Source
editing modes. Live Preview reveals syntax when the cursor enters formatted content
([official editing documentation](https://raw.githubusercontent.com/obsidianmd/obsidian-help/master/en/Editing%20and%20formatting/Views%20and%20editing%20mode.md)).
Engine provides those three visible modes, but that does not certify identical selection,
layout, undo, input-method or plugin behavior.

| Workflow | Current Engine evidence | Remaining boundary |
| --- | --- | --- |
| Live tables | Measured columns and edit-control heights survive entering/exiting edits. An edit-owned ResizeObserver adapts the grid without discarding the draft/focus. Composition-aware Enter/Tab/Escape and deferred blur retain the draft through final composition input; ordinary keys keep their save/navigation/cancel behavior. | Arbitrary nested syntax, every theme/font/zoom, assistive technology and all touch/IME workflows are not certified. See the bounded table IME checks in [QA-CANVAS-LIVE-EDIT.md](QA-CANVAS-LIVE-EDIT.md); browser protocol events are not native IME certification. |
| Live images and diagrams | Unchanged image/diagram DOM survives typing and unrelated-note refresh. Real source changes still invalidate. Root-note assets resolve; modified asset metadata selectively refreshes decoded bytes. | External writers with indistinguishable metadata, every image format and all plugin renderers are unverified. |
| Mermaid labels | Native SVG text renders labels under mandatory DOMPurify; HTML-label output is not restored by weakening sanitization. | Every Mermaid diagram type and visual equivalence remain unverified. |
| Source/live continuity | Shared editor document, selection, history compartments and original live-stability regressions are retained. Browser, Electron and actual Linux-package regressions cover the named geometry/identity failures. | Finite regressions do not prove that all geometry shifts or all editor bugs are fixed. See [QA-CANVAS-LIVE-EDIT.md](QA-CANVAS-LIVE-EDIT.md). |
| Footnote syntax and view | Existing `markdown-it-footnote` rendering plus a lazy native panel listing named, repeated, inline and unreferenced footnotes, with exact-source editing/navigation. See [workflow contract](FOOTNOTES.md). | Source presence is not final-head acceptance; current increment adds browser, desktop-byte/restart and Android checks. Installed-reference visual/interaction comparison remains outstanding. |

The accepted Live Editing repair is
[PR #75](https://github.com/crafactory/engine/pull/75). Its tests and historical acceptance
remain distinct from subsequent native Android tests.

## Core plugins

Reference names below follow the current
[official core-plugin index](https://help.obsidian.md/plugins).
Descriptions of Engine behavior refer to owned implementation and bounded tests, not to
an inspection or copy of Obsidian implementation.

| Core plugin | Status | Current subset | Remaining boundary |
| --- | --- | --- | --- |
| Audio recorder | Implemented subset | Desktop browser MediaRecorder inserts a local recording. | Device/codec behavior and Android microphone integration are unverified; no Android microphone permission is requested in this pilot. |
| Backlinks | Implemented subset | Resolved backlinks and unlinked mentions exist. | Full reference context, rename/refactor edge cases and large-vault behavior remain incomplete. |
| Bases | Partial | Local `.base` table/list/cards views and a small extension view hook exist. | Full formula, query, grouping, configuration and extension-view APIs do not. |
| Bookmarks | Implemented subset | Note bookmarks exist. | Groups, headings, saved searches and arbitrary URL bookmarks remain missing. |
| Canvas | Implemented subset | Owned `.canvas` cards, connections, groups, zoom and editing exist. | This is not the internal Obsidian Canvas API required by Excalidraw's embedded-canvas path; deep interoperability and mobile touch workflows remain unverified. |
| Command palette | Implemented subset | Fuzzy commands, keyboard selection and hotkey display exist. | Full ranking, pinning/recent behavior and arbitrary plugin command fidelity remain incomplete. |
| Daily notes | Implemented subset | Configurable date format/folder/template and daily navigation exist. | All locale/timezone/template combinations remain unverified. |
| File explorer | Implemented subset | Files/folders, rename, move, trash and attachments exist with host path/version guards. | No cross-process atomic lock, ACL preservation or power-loss guarantee is claimed. Android shared-folder selection is absent. |
| File recovery | Implemented subset | Prior saved text versions and a recovery UI exist; up to 100 per file are retained. | The Android backend has a separate private profile, not the desktop recovery directory. Unsaved-process-kill recovery is not certified. |
| Footnotes view | Implemented subset | Native current-note list, inline/named/repeated/unreferenced entries, source editing, per-reference navigation, live updates and core toggle; [contract and tests](FOOTNOTES.md). | Editing deliberately opens Source mode rather than a separate rich-text editor; complete installed-reference comparison and every syntax/device combination remain unverified. |
| Graph view | Implemented subset | Owned global/local force graph, filtering and basic interaction exist. | Reference layout, visual controls and large-graph performance are not equivalent. |
| Note composer | Implemented subset | Merge and selection extraction, including owned link handling, exist. | Every reference refactor/metadata/link edge case remains unverified. |
| Outgoing links | Implemented subset | Indexed outgoing and unresolved links exist. | Full reference grouping/context/navigation behavior remains incomplete. |
| Outline | Implemented subset | Heading navigation exists. | Full drag/reorder/reference behavior and all plugin headings remain incomplete. |
| Page preview | Implemented subset | Owned note-hover previews exist. | Complete hover-parent ownership, popover behavior and plugin source integrations remain incomplete. |
| Properties view | Implemented subset | Owned frontmatter/property editing and property indexing exist. | Arbitrary property types, complete metadata-manager semantics and reference layout remain incomplete. |
| Publish | Excluded | Not in project scope. | Excluded by project policy. |
| Quick switcher | Implemented subset | Fuzzy note selection exists. | Full ranking, context and modifier semantics remain incomplete. |
| Random note | Implemented subset | Selects an eligible Markdown note. | Full option/filter/reference behavior is not certified. |
| Search | Implemented subset | Indexed text, owned operators and result navigation exist. | Complete reference grammar, context, ranking and large-vault performance remain incomplete. |
| Slash commands | Implemented subset | Shared command discovery/insertion exists. | Full cursor, mobile keyboard and plugin-command behavior is not certified. |
| Slides | Implemented subset | Markdown slide rendering/navigation exists. | Complete presenter/export/reference behavior remains incomplete. |
| Sync | Excluded | Not in project scope. | Excluded by project policy. |
| Tags view | Implemented subset | Tag listing/filtering exists. | Complete reference hierarchy, counts and interaction remain incomplete. |
| Templates | Implemented subset | Template insertion and owned date/title expansion exist. | Full third-party templating APIs/macros are not provided. |
| Unique note creator | Implemented subset | Creates timestamp-formatted notes in a configured folder. | Every collision/template/date-format case remains unverified. |
| Web viewer | Implemented subset | Desktop embedded web views and owned navigation exist. | Android remote frames are deliberately blocked; opening remote pages in a trusted native WebView is not enabled. Complete reference browser integration remains absent. |
| Word count | Implemented subset | Active-document word/character counts exist. | Reference tokenization/selection/locale behavior is not identical. |
| Workspaces | Implemented subset | Saved layouts restore tabs, split, modes and sidebars. | Arbitrary workspace-leaf/view hierarchy, every plugin state and mobile layout fidelity remain incomplete. |

Format converter remains an additional/legacy host workflow, not a newly verified current
reference core plugin. Updating the reference list must not remove Engine's existing
format-conversion functionality.

## Workspace, files and Markdown areas

These retain the existing host-area inventory identities while updating the boundaries;
their overlaps with core-plugin rows are not additional units of parity.

| Area | Status | Current subset | Remaining boundary |
| --- | --- | --- | --- |
| Desktop app | Implemented subset | Electron shell and Windows/macOS/Linux package configuration; actual Linux-package regressions. | Windows/macOS runtime certification, signing/notarization, automatic updates, multi-window/pop-out equivalence. |
| Vaults | Implemented subset | Desktop choose/create folder, last vault, file metadata/watch; Android private vault implementation under native test. | Vault catalog, concurrent windows, reference-settings migration and Android shared folders/SAF. |
| Save safety | Implemented subset | Queued writes, SHA-256 optimistic conflicts, desktop replacement/close flush; staged Android publication. | Power-loss/fsync, cross-process locking, external-write races, ACL preservation and unsaved-process-kill recovery. |
| Explorer | Implemented subset | Files/folders, rename/move, folder drag, sorting and trash. | Complete context menus, bulk selection and attachment/refactor handling across every embed type. |
| Links | Implemented subset | Wiki/Markdown links, aliases, relative siblings, heading/block reads and owned rename updates. | Complete shortest-path disambiguation, escaped/parent-relative destinations and Canvas/Base/ambiguous rename references. |
| Tabs/layout | Implemented subset | Tabs/reorder, back/forward, one right split and saved layouts. | Arbitrary split trees, stacked tabs, pane pinning/pop-outs and all plugin workspace states. |
| Import/export | Implemented subset | Markdown/assets import and note/HTML/PDF/ZIP export on desktop; Android share export implementation under test. | Product-specific importers, self-contained HTML, Android printing/SAF and complete hidden-profile backup/restore. |
| Source editing | Implemented subset | CodeMirror, Markdown, undo/redo, search/replace, selection formatting, spelling/line settings and an owned table editor. | Vim/Emacs mode equivalence, every editing shortcut, folding/history semantics and every input method. |
| Live preview | Implemented subset | Source reveal, formatting, tasks, tables with row/column operations, owned fenced-block previews and repaired geometry/identity. | Obsidian Markdown processors still run only in reading mode; complete inline/nested grammar, every list/embed, cursor/selection equivalence and huge-document performance remain incomplete. |
| Reading | Implemented subset | Markdown-it, tables, tasks, highlights, footnotes, comments and nested callout folding; dedicated Footnotes view can reveal editable source. | Complete OFM, HTML-in-note and code-fence highlighting equivalence remain unverified. |
| Math/diagrams | Implemented subset | KaTeX and strict Mermaid with sanitized native SVG text labels. | All syntax/render/editing types and complete compatibility/security certification. |
| Embeds | Implemented subset | Note/heading/block transclusion, read-only Canvas geometry and image/audio/video; PDF download. | Recursive embeds, Canvas file cards, interactive PDF, full wiki image sizing, embedded Bases and block edit actions. |
| Properties | Implemented subset | Typed YAML editing, add/remove, property search and indexed inference/overrides used by the facade. Registry value/type controls, composition-safe drafts and null clearing for explicitly typed empty scalars; native type-menu Back handling. | Full reference type-manager semantics, rich date/link widgets, drag/reorder, completion and multi-file bulk edits. Empty-value serialization is an Engine policy, not verified reference equivalence. |
| Attachments | Implemented subset | Local asset import/display and ZIP inclusion; root paths and modified decoded assets repaired. | Large-file streaming, PDF viewing/annotation, every drag/paste path and per-folder rules; Android picker flows unverified. |

## Host capabilities beyond the core list

| Area | Current subset | Important gaps |
| --- | --- | --- |
| Formatting and tables | Owned formatting, checklists, links, Mermaid/math, editable tables and row/column insertion/reordering exist. | Do not repeat the stale claim that table row/column operations are entirely missing. Advanced nested Markdown and full editing equivalence remain unverified. |
| Tabs, layout and focus | Tabs, history, a split view, sidebars and owned leaf hosting exist. | Full reference pane tree, arbitrary view-state serialization, all keyboard/focus transitions and cross-window behavior remain incomplete. |
| CSS/themes | Appearance settings, custom CSS and bounded plugin setting controls exist. | Complete theme/snippet discovery/management, every CSS variable and mobile theme equivalence remain incomplete. |
| URI/plugin protocols | An owned in-app protocol dispatch and plugin protocol-handler registration subset exist. | No OS `obsidian://` registration is claimed; Android VIEW/BROWSABLE intent integration is absent. |
| Import/export | Local import, note export and vault ZIP export exist. Android export uses an explicit OS share sheet. | Android SAF/shared-folder vaults and a complete backup/restore including hidden profile/history/plugin data are not provided. Opening a share sheet does not prove another app retained a backup. |
| File observations | Desktop host watching and own mutation notifications refresh indexes/assets. | Android pilot has no general native filesystem watcher for external/direct native writers. Metadata equality is not a content-hash guarantee. |
| Free extensions | Importer, Web Clipper and Maps remain comparison targets, not policy exclusions. | Complete importer formats, browser-extension integration and Maps/geospatial behavior remain absent or unverified. |
| Security | Sanitized Markdown, least-privilege defaults and explicit profile-wide renderer/native trust remain distinct from sandboxing. Compatible production dependency patches are included in the Android increment. | Trusted renderer code can access the whole host. Android native APIs are app-UID trust, not desktop OS-user Node privilege or per-plugin isolation. Dependency audit results are scoped, not a general security certification. |

## Community plugins and native integration

The facade exposes only a subset of the public API. Worker is the default; trusted
renderer is explicitly confirmed, not sandboxed and cannot be forcibly interrupted.
Desktop native Node integration is a separate profile-wide opt-in with full OS-user
trust; it is unavailable on Android. Binary APIs and serialized process operations exist
in their documented providers, so older blanket descriptions of them as entirely refused
are stale. No permission boundary should be inferred from DOM code executing successfully.

Finite unchanged-package workflows, API member boundaries, public release fingerprints
and remaining per-plugin gaps are recorded in
[PLUGIN-SUPPORT-MATRIX.md](PLUGIN-SUPPORT-MATRIX.md),
[PLUGIN-COMPATIBILITY.md](PLUGIN-COMPATIBILITY.md) and
[API-COVERAGE.md](API-COVERAGE.md). Excalidraw's core Canvas dependency, Copilot secure
secret storage/inference, authenticated/conflicted Git, deep Kanban workflows and the
unexercised Style Settings kinds remain explicit targets until tested. A successful startup,
settings screen or drag interaction is not full plugin compatibility.

## Extensions, themes, and platform surface

| Area | Status | Current subset | Remaining boundary |
| --- | --- | --- | --- |
| Community plugin API | Implemented subset | Default Worker and explicitly trusted renderer; owned document/workspace/storage/render providers; mobile flags and desktop-only refusal. | Full members, overloads, workspace semantics, platform workflows and plugin compatibility remain incomplete; per-plugin verdicts live only in the support matrix. |
| Community catalog | Not implemented | Local manually installed packages; Android debug sideload only. | No marketplace, unattended install/update/signing, or Android installation UI. |
| Themes/snippets | Implemented subset | Original themes, editable custom CSS and bounded Style Settings controls. | Complete theme/snippet management and reference CSS-variable equivalence are unverified. |
| Hotkeys | Implemented subset | Editable application hotkeys and owned plugin scopes. | Full conflict resolution, arbitrary editor overrides and mobile external-keyboard coverage are incomplete. |
| Mobile | Implemented subset | Capacitor Android private-vault pilot: final #76 APK passed nine actual API35 workflows, including Chinese IME, keyboard/Back, persistence/failure recovery, plugins and OS chooser; [native evidence](https://github.com/crafactory/engine/actions/runs/42188594088). | iOS, SAF/shared vault selection, mobile plugin installer, full profile backup, production signing/upgrades and complete device/OEM coverage remain absent. New-head source changes require their own native gate. |
| CLI | Implemented subset | Owned local-file CLI. | Not command-compatible with the reference CLI. |
| URI/deep links | Implemented subset | Owned in-app plugin protocol dispatch exists. | OS `obsidian://`/`crafactory://` registration and Android VIEW/BROWSABLE intents are absent. |
| Web Clipper | Not implemented | No browser extension. | Reference free-extension interoperability remains outstanding. |
| Importer / Maps | Not implemented | No equivalent import-format/map extension. | Full importer formats and geospatial workflows remain outstanding. |
| Localization | Not implemented | Unicode note content and filenames work. | UI is currently English, not a translated Chinese interface. |
| Accessibility | Implemented subset | Named semantic controls, keyboard focus, reduced motion and mobile touch-target work. | Comprehensive screen-reader/device/accessibility audit remains outstanding. |
| Format converter | Implemented subset | Existing legacy format-conversion workflow remains. | Not a current core-index entry; complete conversion interoperability remains unverified. |

## Android acceptance boundary

The Android increment uses Capacitor while sharing React DOM/CodeMirror and the
compatibility layer. React Native's native-component model and Tauri's extra native
toolchain were evaluated in [ANDROID.md](ANDROID.md); the choice is an architectural
fit assessment, not a performance ranking.

The native gate builds a real APK and uses the native WebView, app-private file bytes,
keyboard/back, restart and unchanged pinned Style Settings controls.
[The first complete native run](https://github.com/crafactory/engine/actions/runs/42184825123)
passed nine bounded groups on API35 Pixel6/WebView 124; subsequent visual-review
regressions additionally guard canceled sharing and settings-tab overlap.
Current-head checks must pass rather than inheriting an older run's verdict.
A debug APK is not release signing, Play publication, physical-device/OEM
certification or full mobile parity. iOS is not implemented in this Android-only increment.

Android-specific remaining gaps include shared folders/SAF, multi-vault selection,
community-plugin installation UI, complete profile backup/restore, OS deep links,
notifications/background jobs, microphone/camera integration, desktop-only plugins,
Node/Electron and unsafe-eval/WASM opt-in. Capacitor supports API24+, but only the tested
API35 emulator may be reported as exercised; WebView111+ is an application requirement,
not an assertion that all supported Android devices were tested.
