import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const config=JSON.parse(await fs.readFile(new URL('../docs/compatibility/community-corpus.json',import.meta.url),'utf8'));
const directory=process.env.ENGINE_RENDERER_CORPUS_REPORT;assert(directory,'Set ENGINE_RENDERER_CORPUS_REPORT');
const results=[];
for(const plugin of config.plugins){
  const result=JSON.parse(await fs.readFile(path.join(directory,plugin.directory+'.json'),'utf8'));
  for(const key of ['repo','tag','manifest_version','main_sha256','manifest_sha256'])assert.equal(result[key],plugin[key]);
  assert.equal(result.styles_sha256,plugin.styles_sha256??null);
  assert.equal(result.native_enabled,['Git','Kanban','Excalidraw','Copilot'].includes(plugin.name));
  assert.equal(result.unsafe_eval_enabled,['Dataview','Templater','Kanban','Excalidraw'].includes(plugin.name));
  assert(['UNSUPPORTED_STARTUP','LOAD_ERROR','STARTUP_ONLY','STARTUP_WITH_ERRORS','BOUNDED_WORKFLOWS_PASS','BOUNDED_WORKFLOWS_WITH_ERRORS'].includes(result.outcome));
  if(result.outcome.startsWith('BOUNDED_WORKFLOWS_'))assert(Array.isArray(result.functional_workflows)&&result.functional_workflows.length>0);
  if(result.outcome==='BOUNDED_WORKFLOWS_WITH_ERRORS')assert((result.runtime_errors?.length??0)+(result.console_errors?.length??0)>0);
  results.push(result);
}
const escape=text=>String(text).replaceAll('|','\\|').replaceAll('\n',' ');
let md='# Trusted-renderer real-plugin tests\n\nUnchanged upstream release bytes, pinned in `compatibility/community-corpus.json`, are loaded only into disposable Linux x64 vaults. Explicit trusted renderer is **not sandboxed**. These outcomes do not supersede default Worker failures or establish full plugin compatibility. No installed reference application or Windows/macOS/mobile differential test has been performed.\n\n| Plugin | Tag / manifest | Observed outcome | First blocker or bounded workflows | Upstream |\n|---|---|---|---|---|\n';
for(const r of results){const workflows=Array.isArray(r.functional_workflows)?r.functional_workflows.join('; '):'';const details=[r.first_blocker,workflows&&'Bounded workflows: '+workflows].filter(Boolean).join(' ');md+=`| ${r.name} | ${r.tag} / ${r.manifest_version} | ${r.outcome} | ${escape(details||'No functional workflows executed')} | [${r.name}](https://github.com/${r.repo}) |\n`;}
md+='\n`STARTUP_ONLY` means startup completed and the enabled switch became checked. It does not certify any plugin commands, custom view, rendering or later background behavior. `LOAD_ERROR` does not diagnose which unavailable class caused the generic error. Only listed Reading Time and Dataview workflows received positive functional assertions, through real UI inputs and JSON persistence. Reading Time format variants, invalid inputs, exact timing, frontmatter/CJK/word-count edge cases, multiple leaves and all reference behavior remain unverified. Dataview query/expression/view coverage remains bounded.\n\n## Reproduction\n\n```sh\nENGINE_PLUGIN_CORPUS=/tmp/engine-plugin-corpus node scripts/corpus.mjs\nENGINE_PLUGIN_CORPUS=/tmp/engine-plugin-corpus \\\nENGINE_RENDERER_CORPUS_REPORT=/tmp/engine-renderer-corpus-results \\\nxvfb-run -a npm run test:desktop -- renderer-corpus.spec.ts\nENGINE_RENDERER_CORPUS_REPORT=/tmp/engine-renderer-corpus-results node scripts/renderer-corpus-report.mjs\n```\n\nThe manual `plugin-corpus.yml` workflow runs both modes. Optional corpus tests are skipped without the input directory; skipped is not passed. `E2E_EXECUTABLE_PATH` selects a packaged app. Third-party bundles/manifests/CSS are never committed, redistributed or incorporated into Engine; upstream stylesheet injection remains unsupported. Exact hashes, platform, mode, time and observed workflows are in `compatibility/renderer-community-results.json`. Plugin repository-license metadata is not a transitive-license audit.\n';
md=md.replaceAll('-- renderer-corpus.spec.ts','-- e2e-desktop/renderer-corpus.spec.ts');
md=md.replace('Only listed Reading Time and Dataview workflows received','Only the workflows explicitly listed above received');
md=md.replace('upstream stylesheet injection remains unsupported','optional upstream stylesheets are hash-verified and owned by the enabled renderer plugin');
md+='\nExcalidraw, Kanban and Git runs use the explicit native profile with profile-wide filesystem, process, credential and network access. Dataview, Templater, Kanban and Excalidraw use the separate evaluation opt-in. Each JSON row records both grants and the optional stylesheet hash. None of these grants is a per-plugin sandbox.\n';
md+='\n`STARTUP_WITH_ERRORS` means the switch became enabled but runtime or console errors were observed during the bounded startup observation window. It is not a working-plugin claim. Full runtime/console diagnostics are retained in the JSON evidence, including recoverable warnings in otherwise passing bounded workflows. Startup-only observation includes opening the command palette and waiting 2.5 seconds after searching for the plugin name; it is not continuous background monitoring or command execution acceptance.\n';
md=md.replace('Excalidraw, Kanban and Git runs','Excalidraw, Kanban, Git and Copilot runs');
await fs.writeFile(new URL('../docs/TRUSTED-RENDERER-PLUGIN-TESTS.md',import.meta.url),md);
await fs.writeFile(new URL('../docs/compatibility/renderer-community-results.json',import.meta.url),JSON.stringify({scope:'Explicit trusted renderer on Linux x64; only named bounded workflows verified',results},null,2)+'\n');
console.log('Recorded '+results.length+' separate renderer outcomes.');
