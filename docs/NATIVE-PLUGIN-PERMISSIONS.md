# Native plugin permissions

The desktop application has two different trust profiles. Native Node.js access is off by default; enabling a trusted-renderer plugin alone does not grant it.

## Default profile

- Electron keeps `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- Worker plugins retain their existing operation permissions and explicit refusals.
- Trusted-renderer plugins can access the host DOM and vault bridge, but the CommonJS adapter does not supply filesystem, subprocess, Electron or other Node modules.
- Browser/development HTTP pages cannot activate the native profile.

These defaults follow [Electron's security guidance](https://www.electronjs.org/docs/latest/tutorial/security). Native mode deliberately changes this model and must not be presented as an isolated or least-privilege plugin sandbox.

## Explicit native profile

Open Settings → Community plugins → Allow native Node.js plugins, read the profile-wide warning, confirm the native Electron dialog, and restart the application.

- Every script in this desktop renderer can use real Node modules, including synchronous filesystem APIs, subprocesses, credentials available to the current user and network access. Access is not restricted to the vault or to the plugin that prompted the user to enable it.
- Electron uses `nodeIntegration: true`, `contextIsolation: false`, and `sandbox: false` for this explicitly trusted profile. Web security remains enabled; renderer navigation and popup guards remain in place. Node integration in workers and subframes and the webview tag remain disabled.
- The preload exposes the same host bridge directly rather than through contextBridge, which is unavailable without context isolation.
- Plugin entry modules receive a real, package-rooted CommonJS loader for native modules and relative dependencies, `require.resolve`, `module.filename`, `module.loaded`, `__filename`, `__dirname`, and the CommonJS exports receiver. Obsidian and supported CodeMirror/Lezer modules still come from the host adapter to preserve API and editor identity.
- This does not make an incomplete Obsidian host API complete. Obsidian-specific imports made inside auxiliary Node dependency files, private registries, popout windows and unsupported view methods need their own contracts and tests.
- CSP unsafe-eval remains a separate opt-in. Neither setting implicitly enables the other; both are persisted together using serialized, atomic writes. This controls the entry-page CSP, not a containment boundary for native code: Node access already permits arbitrary code execution through native modules and subprocesses.
- A single-instance lock protects each user-data profile. A second launch focuses the existing window instead of starting another writer that could restore a stale native grant. Both preference controls retain their prior value and show an error if persistence fails.
- Only the active native profile also permits HTTPS font/media resources and HTTPS/WSS data connections in the desktop entry CSP. This enables resources such as Excalidraw's external fonts without relaxing the default profile. Remote script tags remain disallowed. Network permissions are profile-wide, not per-plugin grants.
- Native black-box tests use a temporary HOME and an allowlist of process environment variables rather than inheriting service credentials. This prevents normal environment/home credential lookup from reaching the test host's account configuration; it is not an OS filesystem sandbox and must not be treated as containment for malicious native plugins.
- Unloading a plugin does not revoke Node access, undo a command, recover a deleted file or withdraw a credential already read. Disable the native switch and restart to revoke the renderer's grant.
- Do not load code or dependencies you do not fully trust. Back up the vault and keep unrelated sensitive files outside the application's operating-system account where possible.

## Verification and limits

The native permission E2E exercises refusal by default, UI cancellation, native-dialog cancellation, restart-based granting/revocation, real byte writes outside a disposable vault, a local Git subprocess, relative package dependencies, concurrent preference changes, and persistence failure rollback. All filesystem/process effects use disposable test directories; no user credentials or external Git remotes are used.

The public Scope handler contract includes a reference to its actual scope and string-or-null modifiers, as documented by [KeymapEventHandler](https://docs.obsidian.md/Reference/TypeScript+API/KeymapEventHandler). The observed desktop-private `Scope.keys`, embed registry and hotkey manager surfaces are additional bounded contracts, not claims of complete private-API parity.

The bounded embedded Markdown editor uses a real editable CodeMirror view with Markdown parsing, undo/redo, get/set and document-change hooks. Editing this local buffer does not itself write a vault file; its owning plugin/view must request persistence. It is not a complete implementation of Obsidian's private source-editor internals. Primary TextFileView saves retain their compare-and-swap protection and compare against private last-persisted bytes, not the plugin-mutable public `data` field.

Main-document plugin views remain mounted while their tabs are inactive. Updating the state of an existing view type does not recreate the view; closing a tab or disabling its plugin disposes it. Native host tabs, active route, split route, sidebar visibility and mode are validated and restored from the vault's saved layout. `Workspace.requestSaveLayout()` schedules an actual tracked host-state write; arbitrary plugin-specific leaf state is not yet serialized/restored by that layout contract.

Plugin form stacking uses the public [CSS layering variable contract](https://docs.obsidian.md/Reference/CSS+variables/Foundations/Layers). This supplies host layering tokens without copying Obsidian's theme or community plugin styles.

Compatibility results must distinguish native-profile workflows, strict-profile refusal, startup-only observations and unverified features. Local bare-remote Git tests do not certify SSH/HTTPS authentication, credential helpers, hooks, signing, conflicts, every operating system, or every plugin command.

Excalidraw's bounded drawing/save/restart flow does not implement Obsidian's private core Canvas integration, whose rejection is retained in the report. Kanban's board/list save/restart flow does not implement card editing: Enter currently reaches a parser failure on undefined `has`, and embedded focus reports undefined `setTimeout`. The corpus contains negative acceptance for failed card creation rather than calling it a supported workflow. The full diagnostics remain in the generated JSON evidence.

TextFileView save completion updates its private persisted bytes/version without overwriting newer subclass-owned public `data`. The original fixture sets a distinct pending state before autosave and verifies that both the actual file write and that state survive.
