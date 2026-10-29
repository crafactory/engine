# QA inventory

The target is functional parity, but only the implemented behaviors listed below can be signed off by this release's tests. Full parity is not a claim. Audio hardware, external websites, Windows/macOS native runtimes, mobile apps, arbitrary community plugins, and very-large vaults cannot be signed off from the sandbox checks.

## Automated functional coverage

- **Persistence:** actual desktop folder open/read/write, autosave, close-time flush, fingerprints, external edit reload, stale-write refusal, recovery, trash, symlink/traversal/root protection, attachments, metadata.
- **Editor:** source/live/reading modes, actual typing, undo/redo library integration, task toggles, property types, template insertion, retained content across tabs, find/replace control.
- **Navigation:** quick switcher, new notes, palette arrow/Enter path, search queries, graph and filters, bookmarks/tags/recent panes, split and workspace cycle.
- **Visual files:** Canvas card add/edit/save/source round-trip; Bases rows/filter/property change; unit-tested safe filters/formulas and rejection of unsupported syntax.
- **Settings:** dark/light cycle, core-feature toggle, plugin trust dialog and actual independent Worker command on desktop.
- **Files:** create, rename/link rewrite, delete/cancel, export/import flows, folder creation, duplicate destination safety.
- **Markdown:** metadata, heading/block indexing, wiki/Markdown links, callouts/tasks, math/diagram rendering, links/tags excluded from code and comments.
- **Failure paths:** invalid YAML, invalid regex, unsupported Bases expression/function, circular formula, changed/deleted disk file, path escape, existing rename target, canceled deletion, empty results.

## Visual coverage

Inspect and capture 1440×940 desktop and 390×844 narrow layouts. Capture initial reading view, source/live editor, graph, Canvas, Bases, both themes, settings, and dialogs. Check visible clipping, page-level horizontal overflow, typography, contrast, layering, long paths, and empty/error states. Small-screen layout is a responsive preview only, not mobile-app equivalence.

## Exploratory checks

1. Rename a note linked from other notes, then reopen sources to verify content and confirm no stale tab.
2. Type a draft and immediately close the desktop window before the debounce timer expires.
3. Edit a vault file externally, then verify a clean editor reload and refusal to overwrite a stale fingerprint.
4. Add a Canvas card, edit it, change modes, and reopen it without losing its JSON.
5. Open and close palettes/settings in narrow viewports, and follow unresolved links into note creation.

## Controls and limitations

Ribbon and sidebars cover explorer, search, graph, canvas, daily note, palette, bookmarks, tags, audio, vault switcher, settings, pane visibility, folder expansion, sort, contextual file actions, back/forward, mode controls, outline, backlinks and outgoing links; note properties are edited inline under the title.

Audio permission/hardware, fullscreen, PDF save dialogs, and embedded third-party page behavior depend on OS/browser capabilities. Test invocation/UI/error handling where possible, but do not infer successful hardware capture or PDF visual fidelity without specific evidence. Graph groups, complete live block rendering, richer Canvas edges/groups, and full Bases grammar are explicit exclusions from signoff, not ignored test cases.

## CommonJS compatibility revision

Claims are bounded to export classification, documented callback precedence, original lifecycle/data/text/editor contracts and explicit unsupported errors. Inventory: enable-confirm-startup, disabled/enabled state, command palette, reading/source editor availability, actual disk create/append, real selection replacement, settings persistence, disable/unload/re-enable and window-close unload. Negative checks cover unsupported DOM/Node/export/CM/Bases startup, existing-file overwrite and traversal. Settings warning must clearly describe the experimental subset and startup privileges.

Visual pass: inspect revised Community plugins warning and empty state in desktop dark/light and 390-pixel narrow view; check dialog fit, legibility and controls. Existing broader browser regression remains applicable. Real community plugins, installed-reference comparisons, full API members and Windows/macOS native execution are explicitly outside signoff.
