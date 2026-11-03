# Workstate

## Current focus

External Obsidian-plugin compatibility, with `docs/PLUGIN-SUPPORT-MATRIX.md` as the current
status tracker.

## Current status

- Dataview: bounded query/inline/DataviewJS/`dv.view` workflows pass under the desktop
  unsafe-eval opt-in.
- Templater: `BOUNDED_WORKFLOWS_PASS` for text/toggle/dropdown/list settings persistence,
  dangerous trigger-on-creation/startup confirmations, startup-template execution, user-script
  invocation, template insertion, create-note and disable/re-enable; other dangerous settings,
  other lists and other user-script exports remain unverified.
- Advanced Tables: `BOUNDED_WORKFLOWS_PASS` for live-mode table formatting; Calendar remains
  `STARTUP_ONLY`.
- Reading Time: bounded workflows pass.
- Default CSP is strict (`script-src 'self' blob:`); `unsafe-eval` and `wasm-unsafe-eval` are
  desktop trusted-entry opt-ins only.

## Recent changes

- Inline properties and persisted property types.
- Live list markers, reading-mode undo, callout folds and code copy.
- `engine.compat/v1`, native support plugin, MetadataCache and Dataview corpus.
- Desktop unsafe-eval opt-in, Dataview `dv.view`, Templater startup surface.
- Templater template insertion, App local storage, `Editor.getDoc`, `MarkdownView.save`.
- Templater create-note, `Vault.getAvailablePath`, reusable leaf `openFile`/ephemeral state.
- Templater declarative settings persistence (text/toggle/dropdown/list), dangerous-setting
  cancel/confirm and local persistence, global DOM helpers and `Array.prototype.contains`.
- CodeRabbit fixes: active-note save, case-insensitive available paths, save ordering, storage
  fallback, exact-path leaf open and reusable-leaf registration.
- Templater startup-template execution; `App.fileManager.renameFile`.
- Templater user-script invocation (`tp.user.hello()` in a template).
- Advanced Tables live-mode table formatting.

## Next

- Calendar daily-note/workspace workflow; other Advanced Tables commands and source-mode behavior.
- Advanced Tables editor commands; Calendar workspace/daily-note behavior.
- Candidate plugins: Tasks, QuickAdd, Kanban, Excalidraw, Style Settings, Omnisearch.

## References

- `docs/REPLICATION-PLAYBOOK.md`
- `docs/PLUGIN-SUPPORT-MATRIX.md`
- `docs/PLUGIN-COMPATIBILITY.md`
- `docs/TRUSTED-RENDERER-PLUGIN-TESTS.md`
- `docs/compatibility/renderer-community-results.json`
