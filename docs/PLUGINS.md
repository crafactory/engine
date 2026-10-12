# Local plugin APIs

Engine retains its original Worker API and adds an experimental, independently implemented CommonJS Obsidian API subset in 0.3.0. This is not full community-plugin compatibility. See `PLUGIN-COMPATIBILITY.md`, `API-COVERAGE.md` and `examples/plugins/compat-fixture`. Only local explicit installation is available; no marketplace or unattended installer.

## Layout

```text
.crafactory/plugins/my-plugin/
  manifest.json
  main.js
```

The manifest's `id` must equal the folder name and use lowercase letters, numbers, and hyphens. `name` and `version` must be strings. Optional `description` is displayed in settings.

## API

Plugins execute in a Web Worker. Electron Node integration is not exposed. The provided API is:

```js
engine.registerCommand('id', 'Human-readable command label', () => {
  // engine.notes is refreshed immediately before a command runs.
  const notes = engine.notes; // [{ path, content, version? }]
  engine.notice(`Indexed ${notes.length} text files.`);
});

engine.write('Ideas/New thought.md', '# A new thought\n\n');
```

- `engine.registerCommand(id, label, callback)`: add a command to the palette.
- `engine.notes`: snapshot of indexed text files. It is refreshed before running each plugin command.
- `engine.write(path, content)`: returns a Promise for Markdown create/modify through normal save handling. Hidden and parent paths are rejected.
- `engine.notice(message)`: show a transient message.

Disabling a CommonJS plugin awaits unload and removes commands; after two seconds the Worker is terminated regardless. Enabling warns about startup/command/unload read/write privileges, and is not persisted across launches. Plugins are stopped before switching vaults, even if the subsequent picker is canceled.

## Trust boundary

Workers separate plugin execution from the UI and Electron main process, but do not constitute a complete adversarial sandbox. Plugins can consume resources, read note data handed to them, modify notes through the API, and make same-origin requests permitted by the application CSP. Do not enable untrusted code. Plugin command registries, resource quotas, permission granularity, API version negotiation, and compatibility guarantees remain future work.

Neither arbitrary npm imports nor Node filesystem access are available. CommonJS `require('obsidian')` exposes only the documented Engine subset; other imports and unsupported API symbols fail explicitly. Synchronous editor methods operate on a snapshot; mutations reach the host asynchronously and are checked against expected text, not executed on a reference CodeMirror instance.
