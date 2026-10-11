# Independent plugin API

Engine's plugin interface is original and not compatible with Obsidian's API. Version 0.1.0 loads local plugins only; there is no marketplace or unattended installer.

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
- `engine.write(path, content)`: create or edit a `.md` file through normal save handling. Hidden and parent paths are rejected.
- `engine.notice(message)`: show a transient message.

Disabling a plugin terminates its Worker and removes commands. Enabling is explicit, warns about note read/write privileges, and is not persisted across app launches.

## Trust boundary

Workers separate plugin execution from the UI and Electron main process, but do not constitute a complete adversarial sandbox. Plugins can consume resources, read note data handed to them, modify notes through the API, and make same-origin requests permitted by the application CSP. Do not enable untrusted code. Plugin command registries, resource quotas, permission granularity, API version negotiation, and compatibility guarantees remain future work.

Neither arbitrary npm imports nor Node filesystem access are available. There is no synchronous compatibility shim for third-party reference plugins.
