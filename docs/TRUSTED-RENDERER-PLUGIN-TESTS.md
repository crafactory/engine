# Trusted-renderer real-plugin tests

Unchanged upstream release bytes, pinned in `compatibility/community-corpus.json`, are loaded only into disposable Linux x64 vaults. Explicit trusted renderer is **not sandboxed**. These outcomes do not supersede default Worker failures or establish full plugin compatibility. No installed reference application or Windows/macOS/mobile differential test has been performed.

| Plugin | Tag / manifest | Observed outcome | First blocker or bounded workflows | Upstream |
|---|---|---|---|---|
| Dataview | 0.5.70 / 0.5.68 | BOUNDED_WORKFLOWS_PASS | `TABLE`, `TASK`, `LIST FROM`, `WHERE`, `SORT`/`LIMIT`, `GROUP BY`, `FLATTEN`, inline query, DataviewJS and `dv.view` under the unsafe-eval opt-in | [Dataview](https://github.com/blacksmithgu/obsidian-dataview) |
| Templater | 2.26.0 / 2.26.0 | LOAD_ERROR | Class extends value undefined is not a constructor or null | [Templater](https://github.com/SilentVoid13/Templater) |
| Calendar (Beta) | 2.0.0-beta.2 / 2.0.0 | STARTUP_ONLY | No functional workflows executed | [Calendar (Beta)](https://github.com/liamcain/obsidian-calendar-plugin) |
| Advanced Tables | 0.23.2 / 0.23.2 | STARTUP_ONLY | No functional workflows executed | [Advanced Tables](https://github.com/tgrosinger/advanced-tables-obsidian) |
| Reading Time | 1.1.2 / 1.1.2 | BOUNDED_WORKFLOWS_PASS | 400-word document at 200 wpm; reading speed setting saves 100 wpm; reading/source transition retains 4 min; editor-change: 800 words -> 8 min; 10-word selection modal at 100 wpm; Escape closes modal; disable removes status and settings; re-enable restores setting and 8 min | [Reading Time](https://github.com/avr/obsidian-reading-time) |

A later pinned Linux corpus workflow rerun executes bounded Dataview `TABLE`, `TASK`, `FROM`, `WHERE`, `SORT`/`LIMIT`, `GROUP BY`, `FLATTEN` and inline-query workflows. DataviewJS and a `dv.view` script execute in the corpus through the explicit desktop `unsafe-eval` opt-in. This does not establish workspace views, frontmatter-heavy queries or full query semantics. `STARTUP_ONLY` means startup completed and the enabled switch became checked. It does not certify any plugin commands, custom view, rendering or later background behavior. `LOAD_ERROR` does not diagnose which unavailable class caused the generic error. Only listed Reading Time and Dataview workflows received positive functional assertions, through real UI inputs and JSON persistence. Reading Time format variants, invalid inputs, exact timing, frontmatter/CJK/word-count edge cases, multiple leaves and all reference behavior remain unverified. Dataview query/expression/view coverage remains bounded.

## Reproduction

```sh
ENGINE_PLUGIN_CORPUS=/tmp/engine-plugin-corpus node scripts/corpus.mjs
ENGINE_PLUGIN_CORPUS=/tmp/engine-plugin-corpus \
ENGINE_RENDERER_CORPUS_REPORT=/tmp/engine-renderer-corpus-results \
xvfb-run -a npm run test:desktop -- e2e-desktop/renderer-corpus.spec.ts
ENGINE_RENDERER_CORPUS_REPORT=/tmp/engine-renderer-corpus-results node scripts/renderer-corpus-report.mjs
```

The manual `plugin-corpus.yml` workflow runs both modes. Optional corpus tests are skipped without the input directory; skipped is not passed. `E2E_EXECUTABLE_PATH` selects a packaged app. Third-party bundles/manifests/CSS are never committed, redistributed or incorporated into Engine; upstream stylesheet injection remains unsupported. Exact hashes, platform, mode, time and observed workflows are in `compatibility/renderer-community-results.json`. Plugin repository-license metadata is not a transitive-license audit.
