# Workstate

## Current focus

External Obsidian-plugin compatibility, with `docs/PLUGIN-SUPPORT-MATRIX.md` as the current
status tracker.

## Current status

- Dataview: bounded query/inline/DataviewJS/`dv.view` workflows pass under the desktop
  unsafe-eval opt-in.
- Templater: `BOUNDED_WORKFLOWS_PASS` for settings persistence, template insertion, create-note
  and disable/re-enable; other settings/list workflows, user scripts and startup templates remain
  unverified.
- Calendar / Advanced Tables: `STARTUP_ONLY`; no functional workflows.
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
- Templater declarative settings persistence, global DOM helpers and `Array.prototype.contains`.

## Next

- Templater other settings/list workflows, user scripts and startup templates.
- Advanced Tables editor commands; Calendar workspace/daily-note behavior.
- Candidate plugins: Tasks, QuickAdd, Kanban, Excalidraw, Style Settings, Omnisearch.

## References

- `docs/REPLICATION-PLAYBOOK.md`
- `docs/PLUGIN-SUPPORT-MATRIX.md`
- `docs/PLUGIN-COMPATIBILITY.md`
- `docs/TRUSTED-RENDERER-PLUGIN-TESTS.md`
- `docs/compatibility/renderer-community-results.json`
