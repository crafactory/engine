# Workstate

## Current focus

External Obsidian-plugin compatibility, with `docs/PLUGIN-SUPPORT-MATRIX.md` as the current
status tracker.

## Current status

- Dataview: bounded query/inline/DataviewJS/`dv.view` workflows pass under the desktop
  unsafe-eval opt-in.
- Templater: `STARTUP_ONLY`; template insertion and user scripts remain unverified.
- Calendar / Advanced Tables: `STARTUP_ONLY`; no functional workflows.
- Reading Time: bounded workflows pass.
- Default CSP remains strict except `wasm-unsafe-eval`; `unsafe-eval` is desktop opt-in only.

## Recent changes

- Inline properties and persisted property types.
- Live list markers, reading-mode undo, callout folds and code copy.
- `engine.compat/v1`, native support plugin, MetadataCache and Dataview corpus.
- Desktop unsafe-eval opt-in, Dataview `dv.view`, Templater startup surface.

## Next

- Templater template insertion/create-note workflows.
- Advanced Tables editor commands; Calendar workspace/daily-note behavior.
- Candidate plugins: Tasks, QuickAdd, Kanban, Excalidraw, Style Settings, Omnisearch.

## References

- `docs/REPLICATION-PLAYBOOK.md`
- `docs/PLUGIN-SUPPORT-MATRIX.md`
- `docs/PLUGIN-COMPATIBILITY.md`
- `docs/TRUSTED-RENDERER-PLUGIN-TESTS.md`
- `docs/compatibility/renderer-community-results.json`
