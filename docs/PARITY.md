# Functional parity ledger

This file distinguishes implementation from completeness. The requested target is all non-subscription Obsidian functionality, independently implemented under MIT. **That target is not reached in 0.6.0.** No overall parity percentage is given because there is no comprehensive behavioral test corpus or fixed reference build. `FEATURE-CHECKLIST.md` and its machine-readable JSON preserve unfinished areas and bounded test evidence; they are not an exhaustive reference specification. The native all-plugin architecture in `NATIVE-PLUGIN-ARCHITECTURE.md` has its assembly kernel (with a dependency-lifecycle `disable`/`enable` flow), storage/documents/commands providers, render/workspace view-slot contracts, an editor provider contract (CodeMirror plus a plain replacement), first migrated core features (bookmarks; templates + daily notes), a notes index consumed by the reader panels/search/graph/properties, a navigation service (quick switch + random note), a named-workspace service, unique-note, word-count, slides and format-converter services, an explorer service over storage, a note-composer service, web-viewer, slash-command, page-preview and audio-recorder services, a bridge-backed storage/documents/explorer runtime consumed by file recovery and the compatibility facade's read/write/plugin-data path, and a compatibility facade that resolves links, routes read/write/rename/trash/plugin-data through native storage/documents and reports editor-extension differences through native services, a view-contribution service whose built-in Markdown/Canvas/Bases/graph/editor views with a Bases table/cards/list renderer registry and split Canvas card/toolbar/editor components and left-slot files/search/bookmarks/recent/tags panels and right-slot outline/backlinks/outgoing/properties panels register as lazy component loaders, a native UI contribution service for ribbon buttons, status-bar text, settings sections and opt-in block previews (with Editor settings and Mermaid as built-in consumers), plus plugin package validation, declared-permission host checks and renderer-only ribbon/status/settings/view compatibility hooks with a custom view/extension host, an editor-suggest bridge, protocol handler dispatch, hover-link event transport, renderer-only custom Bases view registration, and metadata-cache change/delete/resolve events (`KERNEL-SPEC.md`, `SERVICES-SPEC.md`), and a click-to-edit Live Preview with in-block table/code scrolling, inline image/tag rendering, but the rest of the product surface is not yet migrated to them.

The reference inventory comes from [Obsidian's public core-plugin list](https://help.obsidian.md/plugins) and [help home](https://help.obsidian.md). Public behavior was consulted; application source was not used. Core plugin names alone are not an exhaustive specification, and third-party community-plugin functionality is not equivalent to the core feature set.

## Baseline

Reference documentation inspected on 2026-10-11. This is a documentation-based inventory, not certification against an installed reference version. Subscription Sync and Publish are excluded because they are [documented add-on services](https://help.obsidian.md). Mobile apps and free first-party extensions remain in scope for eventual parity; they are not excluded just because they are separate distributions.

### Status definitions

- **Implemented subset:** a working Engine flow exists, but some reference behaviors are missing or not verified.
- **Not implemented:** no equivalent Engine flow exists.
- **Excluded:** a subscription service intentionally outside the request.

No row is labeled "complete" without a full behavioral comparison.

## Workspace and file model

| Area | Status | Working behavior | Missing or unverified |
|---|---|---|---|
| Desktop app | Implemented subset | Electron desktop shell, local folders, Windows/macOS/Linux build configuration | Windows/macOS runtime verification, signed/notarized installers, automatic updates, multi-window/pop-out parity |
| Vaults | Implemented subset | Choose/create folder, last vault, plain files, metadata, file watch | Vault switcher catalog, multiple concurrent windows, reference settings migration |
| Save safety | Implemented subset | Debounced saves, SHA-256 optimistic conflicts, atomic replacement, queued writes, close-time flush | Power-loss/fsync guarantees, cross-process locking, edge-case external-write races, filesystem permission/ACL preservation |
| Explorer | Implemented subset | Files/folders, rename/move, drag into folders, sorting, trash | Full context menu parity, bulk selection, attachment renaming in all embed types |
| Links | Implemented subset | Wiki/Markdown links, aliases, relative sibling links, headings/block reads, rename update | Canonical shortest-path disambiguation, `../` resolution, escaped destinations, Canvas/Base references during rename, all ambiguous-name cases |
| Tabs/layout | Implemented subset | Tabs, drag reorder, back/forward, one right split, saved layouts | Arbitrary split tree, stacked tabs, pane pinning/pop-outs, full workspace restoration |
| Import/export | Implemented subset | Markdown and attachments import; Markdown, HTML, PDF, ZIP exports | Native importers for external products, styled self-contained HTML export, PDF embed parity |

## Editing and Markdown

Public formatting behavior is described in [Basic formatting syntax](https://help.obsidian.md/syntax). Engine implements a tested subset rather than copying the reference renderer.

| Area | Status | Working behavior | Missing or unverified |
|---|---|---|---|
| Source editing | Implemented subset | CodeMirror 6, Markdown mode, undo/redo, search/replace, selection formatting, spellcheck, line numbers | Vim/Emacs parity, complete editing-shortcut set, table editor, fold/history semantics |
| Live preview | Implemented subset | Inactive-line formatting and bounded wiki/Markdown link navigation; top-level tables, code, diagrams, callouts/quotes, math, standalone embeds/rules; source reveal; table cell edits, widget reuse on position changes, undo/redo, task toggles | Full inline/nested grammar, nested/escaped Markdown link destinations, list rendering, table row/column operations, all embeds, exact cursor/selection and reference editing behavior, huge-document performance |
| Reading | Implemented subset | Markdown-it, tables, tasks, highlights, code, footnotes, comments, callout styling and nested collapsible callouts | HTML-in-note support, complete OFM grammar, syntax highlighting in reading code fences |
| Math/diagrams | Implemented subset | KaTeX inline/display math, Mermaid strict rendering | Full syntax edge cases, editing behavior, complete compatibility/security audit |
| Embeds | Implemented subset | Note/heading/block transclusion, read-only Canvas geometry, image/audio/video attachments, PDF download | Recursive nested embeds, embedded Canvas file-card format parity, interactive PDFs, image-size wiki syntax, embedded Bases, block edit actions |
| Properties | Implemented subset | Typed YAML editing, add/remove, property search and vault keys | Reference type registry, date/link widgets, drag/reorder, field auto-completion and multi-file bulk edits |
| Attachments | Implemented subset | Add/import local assets, image/audio/video display, ZIP inclusion | Large-file streaming, PDF annotation/viewing, drag/paste paths, per-folder attachment rules |

## Core plugins

The following inventory follows the [public core-plugin list](https://help.obsidian.md/plugins). "Implemented subset" is explicitly not full feature equivalence.

| Core plugin | Status | Engine behavior and limitations |
|---|---|---|
| Audio recorder | Implemented subset | MediaRecorder capture into attachment; device permissions and hardware vary, not hardware-tested |
| Backlinks | Implemented subset | Resolved incoming links and plain-name unlinked mentions; advanced linking/context actions missing |
| Bases | Implemented subset | YAML table/cards/list, inline property editing, sort/filter, CSV; full formulas/functions, grouping/summaries/map views missing |
| Bookmarks | Implemented subset | Notes only; headings, saved searches, groups, arbitrary URLs not implemented |
| Canvas | Implemented subset | Text/file/link/group, position/size, connections, minimap, open JSON; richer groups/edges/media and full interaction parity missing |
| Command palette | Implemented subset | Fuzzy search, arrows/Enter, hotkey display; pinned/recent command ranking not implemented |
| Daily notes | Implemented subset | Folder and template, local ISO date; full configurable date formats/calendar navigation missing |
| File explorer | Implemented subset | File/folder operations as above |
| File recovery | Implemented subset | Up to 100 previous saved versions per text path; reference scheduling/retention behavior differs |
| Format converter | Implemented subset | Basic HTML highlight and Markdown-link conversion; not a comprehensive importer/converter |
| Graph view | Implemented subset | D3 local/global graph, query filter, orphans, unresolved links, zoom/drag/depth/distance; reference groups/layout controls differ |
| Note composer | Implemented subset | Extract selected text, merge content, rewrite resolvable links and trash source; metadata/heading conflict resolution missing |
| Outgoing links | Implemented subset | Linked and unresolved targets; advanced context/link actions missing |
| Outline | Implemented subset | Heading index and jump; complete folding/drag behavior missing |
| Page preview | Implemented subset | Hover previews in reading; edit-mode modifier behavior and recursive/scroll handling missing |
| Properties view | Implemented subset | Active properties and vault keys; registry/type controls missing |
| Publish | Excluded | Subscription service, no backend included |
| Quick switcher | Implemented subset | Fuzzy filename/path search, recent order, create-on-no-match; reference ranking/modifier behavior differs |
| Random note | Implemented subset | Random indexed Markdown file |
| Search | Implemented subset | AND/OR, grouping, negation, quotes, regex, file/path/tag/content/case/line/block/section/task/property operators; full parser/ranking/UI parity missing |
| Slash commands | Implemented subset | A small list of structural insertions; not every command |
| Slides | Implemented subset | Horizontal-rule separation, arrows, exit/fullscreen; complete presentation grammar/theme controls missing |
| Sync | Excluded | Subscription service, no backend included |
| Tags | Implemented subset | Frontmatter/inline Unicode tags and counts; full hierarchy/collapse UI differs |
| Templates | Implemented subset | Title/date/time interpolation and configured folder; token/date-format set narrower |
| Unique note creator | Implemented subset | Timestamp filename; format/template configuration missing |
| Web viewer | Implemented subset | HTTPS iframe and external fallback; sites can block embedding, no browser history/login/clip parity |
| Word count | Implemented subset | Unicode word regex and character count; CJK segmentation and reference counting rules not equal |
| Workspaces | Implemented subset | Save/restore tabs, active file, sidebars, mode, one split; arbitrary workspace tree missing |

Search behavior was informed by [Search documentation](https://help.obsidian.md/plugins/search). Bases parsing was informed by [Bases syntax](https://help.obsidian.md/bases/syntax); the expression interpreter deliberately refuses unsupported operations instead of running arbitrary JavaScript.

## Extensions, themes, and platform surface

| Area | Status | Boundary |
|---|---|---|
| Community plugin API | Implemented subset | Default Worker plus explicit trusted renderer with DOM settings/Modal, dedicated views, host CodeMirror extensions, reading post/code processors and MarkdownRenderChild lifecycle. Whole-host context, null section mapping and non-recursive static rendering are bounded, not reference equivalent. Real plugins remain limited; see PLUGIN-COMPATIBILITY.md and per-mode reports. Full member/overload/reference/platform coverage incomplete. |
| Community catalog | Not implemented | No plugin/theme marketplace, unattended installation, updates or signing; local manual install only |
| Themes/snippets | Implemented subset | Two original themes, one editable vault CSS snippet; reference themes and CSS-variable API not compatible |
| Hotkeys | Implemented subset | Editable application hotkeys; conflicts, editor binding overrides, complete command registration not equal |
| Mobile | Not implemented | Responsive preview is not an iOS/Android app and is not counted as mobile parity |
| CLI | Implemented subset | Original local file CLI; not command-compatible with the reference CLI |
| URI/deep links | Not implemented | No `obsidian://` or `crafactory://` open protocol compatibility |
| Web Clipper | Not implemented | No browser extension; reference first-party free extension remains outstanding |
| Importer / Maps | Not implemented | No equivalent free first-party import or map extension |
| Localization | Not implemented | UI currently English; Chinese note content and filenames supported, not a translated UI |
| Accessibility | Implemented subset | Semantic controls, names, focus, reduced motion; comprehensive screen-reader/accessibility audit outstanding |

## Acceptance gate for a future "1:1" claim

1. Fix a reference application version and enumerate every non-subscription built-in workflow, setting, format, command, and supported platform.
2. Add black-box fixture tests for behavior, persistence, interoperability, shortcuts, and error handling, without importing proprietary code.
3. Implement the outstanding surfaces above, including mobile and the chosen extension-compatibility policy.
4. Verify macOS, Windows, Linux, mobile, large vaults, external editors, Unicode paths, permissions, crashes, and upgrade/migration behavior.
5. Run security/dependency/license reviews and publish the exact pass/fail evidence.

Until those gates pass, describe Engine as an independently implemented workspace under development, not as a full clone.

## Workspace and Live Preview revision

The 0.2.0 revision removes the custom application/vault-name top bar. Vault switching remains available in the ribbon/sidebar; the OS window frame is not changed. Added behavior follows the public [views and editing-mode description](https://help.obsidian.md/edit-and-read), implemented independently. See `QA-LIVE-PREVIEW.md` for explicit test boundaries. No feature row is upgraded to full equivalence.
