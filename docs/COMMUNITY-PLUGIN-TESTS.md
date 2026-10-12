# Real community-plugin startup tests

These are **actual upstream release artifacts**, loaded unchanged into disposable Engine vaults on Linux x64 Electron. They are not a synthetic replacement for community plugins. All five currently fail at startup; no plugin is counted as functionally compatible. Tests passing means the recorded unsupported boundary was observed, not that the plugin works. Actual plugin workflows, additional blockers beyond the first, Windows/macOS/mobile and an installed-reference differential comparison remain untested.

## Pinned inputs and observed results

| Plugin / category | Release tag / manifest version | Startup result / first blocker | Upstream repository |
|---|---|---|---|
| Dataview / metadata/query | `0.5.70` / `0.5.68` | UNSUPPORTED_STARTUP; `require @codemirror/state` | [Dataview](https://github.com/blacksmithgu/obsidian-dataview) |
| Templater / templates/automation | `2.26.0` / `2.26.0` | LOAD_ERROR; `Class extends value undefined is not a constructor or null` | [Templater](https://github.com/SilentVoid13/Templater) |
| Calendar (Beta) / calendar/daily notes | `2.0.0-beta.2` / `2.0.0` | UNSUPPORTED_STARTUP; `export Modal` | [Calendar (Beta)](https://github.com/liamcain/obsidian-calendar-plugin) |
| Advanced Tables / editor/tables | `0.23.2` / `0.23.2` | UNSUPPORTED_STARTUP; `export Modal` | [Advanced Tables](https://github.com/tgrosinger/advanced-tables-obsidian) |
| Reading Time / status bar/statistics | `1.1.2` / `1.1.2` | UNSUPPORTED_STARTUP; `export PluginSettingTab` | [Reading Time](https://github.com/avr/obsidian-reading-time) |

Dataview release tag and manifest version differ in the downloaded artifacts; Calendar has a beta tag with manifest 2.0.0. Both values are preserved. SHA-256 for main.js and manifest.json is pinned in `compatibility/community-corpus.json` and verified before loading; observed results/times are in `compatibility/community-results.json`. A LOAD_ERROR is a generic failed load, not a confirmed API diagnosis: CommonJS namespace-copy helpers can lose the export Proxy and yield an undefined class rather than a named CompatibilityError. Broader interop remains unfinished.

## Reproduction

```sh
ENGINE_PLUGIN_CORPUS=/tmp/engine-plugin-corpus node scripts/corpus.mjs
ENGINE_PLUGIN_CORPUS=/tmp/engine-plugin-corpus \
ENGINE_CORPUS_REPORT=/tmp/engine-corpus-results \
xvfb-run -a npm run test:desktop -- corpus.spec.ts
ENGINE_CORPUS_REPORT=/tmp/engine-corpus-results node scripts/corpus-report.mjs
```

The `plugin-corpus.yml` manual workflow downloads pinned files, checks hashes and runs startup tests. Set `E2E_EXECUTABLE_PATH` for a packaged executable. Ordinary desktop runs skip these five optional cases without `ENGINE_PLUGIN_CORPUS`; skipped is not passed.

## License and safety boundary

Only original harnesses, metadata/hashes and results are committed. Third-party main.js, manifests and CSS are not redistributed, packaged or used to implement Engine. Repository-license metadata is not a transitive-license audit. Use disposable synthetic vaults; CSS is not injected because stylesheet support is unfinished. These tests do not reach functional UI workflows.

## Unfinished validation

- [ ] Successful startup and actual workflows for these five plugins.
- [ ] Every API requirement beyond the first observed failure.
- [ ] Reference-equivalent editor/render/settings/data behavior and module-wrapper semantics.
- [ ] More community plugins/versions and Windows/macOS/mobile.
- [ ] Installed-reference differential tests and adversarial security review.

Address module/CodeMirror integration and DOM/settings/views, rerun pinned inputs and add actual workflows. This corpus begins, but does not complete, comprehensive compatibility testing.
