# Crafactory Engine v0.4.0

Independent original code remains MIT, without proprietary Obsidian application/SDK code. This is a prerelease increment, not full non-subscription 1:1 parity.

## New

- Explicit, disabled-by-default trusted-renderer runtime, alongside the unchanged default Worker compatibility mode.
- Original DOM helpers, real plugin settings controls, Modal focus/close handling, status dock and closable dedicated custom views.
- Host CodeMirror module allowlist and actual active-editor extensions, mutable array reconfiguration and unload removal, informed by [public registration behavior](https://docs.obsidian.md/Reference/TypeScript+API/Plugin/registerEditorExtension).
- Separate default Worker / trusted-renderer export inventory: 27 / 43 bounded runtime symbols out of the 154 runtime entries in the [public API index](https://docs.obsidian.md/Reference/TypeScript+API/index).
- Checklist expands from 93 to 98 stable entries, with 33 bounded acceptance checkpoints and all 29 core plugin entries retained.
- Real pinned Reading Time 1.1.2 passes eight bounded Linux workflows; Calendar and Advanced Tables complete startup only; Dataview and Templater still fail. Default Worker still fails all five. See [per-mode tests](https://github.com/crafactory/engine/blob/main/docs/TRUSTED-RENDERER-PLUGIN-TESTS.md).

## Important boundaries

Trusted renderer is NOT sandboxed: it can access the whole UI/vault bridge and metadata and freeze the main thread. It cannot be force-stopped, and completed writes are not undone. No renderer fallback or automatic plugin enable occurs. Electron remains context-isolated, sandboxed and without Node integration; Blob script modules are allowed, unsafe-eval is not. Use only trusted plugins with backed-up disposable vaults.

Status items and dedicated view overlays are not exact reference placement/leaf semantics. Secondary split-editor extensions, full Markdown processors, themes/plugin stylesheets, Node modules, full API members/events and native mobile remain incomplete. No installed reference version has been fixed for differential testing. Windows/macOS builds are not native execution or installer acceptance. Linux downloads remain unsigned.

Verification evidence will be appended to docs/VERIFICATION.md after final CI and packaged runtime checks. Do not count skipped corpus tests or negative startup assertions as functional compatibility.
