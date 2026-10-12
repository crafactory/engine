import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {normalizeText,parseParityLedger} from './inventory-model.mjs';
const check=process.argv.includes('--check');
const read=async path=>normalizeText(await fs.readFile(new URL('../'+path,import.meta.url),'utf8'));
const ledger=await read('docs/PARITY.md'),baseline=JSON.parse(await read('docs/compatibility/reference-baseline.json'));
const exported=JSON.parse(await read('docs/compatibility/obsidian-exports.json'));
const source=await read('src/compat-core.ts');
const supported=[...source.match(/supportedExports=\[([\s\S]*?)\] as const/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
assert.equal(new Set(exported.symbols.map(s=>s.name)).size,exported.symbols.length);
for(const name of supported)assert(exported.symbols.some(s=>s.runtime&&s.name===name),'Undocumented export: '+name);
const items=parseParityLedger(ledger,baseline.core_source,exported.source_url);
const core=items.filter(i=>i.id.startsWith('CORE-'));
assert.equal(core.length,29,'All 29 documented core plugins must remain in the inventory');
assert.deepEqual(core.map(i=>i.title).sort(),[...baseline.core_plugins].sort());
assert.deepEqual(items.filter(i=>i.status==='excluded').map(i=>i.title).sort(),[...baseline.excluded_subscription_services].sort());
const accepted=[
  ['ACCEPT-local-save','Local save and close-time draft flush','e2e-desktop/vault.spec.ts','window close flushes a just-typed draft before exiting'],
  ['ACCEPT-external-edit','Clean editor reloads external edit','e2e-desktop/vault.spec.ts','native watcher reloads external edits'],
  ['ACCEPT-unicode','Unicode filename/content round trip','e2e-desktop/vault.spec.ts','Unicode filename and content round-trip through native UI and disk'],
  ['ACCEPT-conflict','Stale write preserves external edits','tests/vault.test.mjs','detects external changes without overwriting them'],
  ['ACCEPT-traversal','Reject hidden, absolute and parent paths','tests/vault.test.mjs','rejects parent traversal, hidden paths, absolute paths, and NUL bytes'],
  ['ACCEPT-recovery','Recover previous saved content','tests/vault.test.mjs','snapshots previous content and restores safely'],
  ['ACCEPT-header','No custom app/Vault top header','e2e/live-preview.spec.ts','removed header gives the workspace full top edge and keeps vault switching'],
  ['ACCEPT-live-blocks','Inactive top-level live blocks render','e2e/live-preview.spec.ts','inactive blocks render math, code, diagrams, tables and note embeds'],
  ['ACCEPT-table-cells','Table edit retains delimiters and literal pipes','e2e/live-preview.spec.ts','live table edits preserve Markdown delimiters and escaped pipes'],
  ['ACCEPT-tasks','Live task edit retains frontmatter','e2e/live-preview.spec.ts','live task checkbox edits exactly its task and retains frontmatter'],
  ['ACCEPT-callouts','Independent nested callout folding','e2e/live-preview.spec.ts','expanded and nested callouts preserve independent folding defaults'],
  ['ACCEPT-source-editor','Undo/redo, formatting and find/replace','e2e/workspace.spec.ts','undo, redo, formatting and find/replace are actual editor operations'],
  ['ACCEPT-search','Search operators and empty-result UI','e2e/workspace.spec.ts','search supports operators and no-result states'],
  ['ACCEPT-graph','Graph relationships and filter','e2e/workspace.spec.ts','graph builds actual note relationships and filters'],
  ['ACCEPT-canvas','Canvas card create/edit/persist','e2e/workspace.spec.ts','Canvas creates, edits and persists a card'],
  ['ACCEPT-bases','Bases filter/property edit','e2e/workspace.spec.ts','Bases filters and edits YAML-backed properties'],
  ['ACCEPT-templates','Daily note and template content','e2e/workspace.spec.ts','daily notes and templates generate real text'],
  ['ACCEPT-layout','Save/restore one-split layout','e2e/workspace.spec.ts','save and restore workspace and split editor'],
  ['ACCEPT-legacy-plugin','Legacy Engine Worker command','e2e-desktop/vault.spec.ts','opt-in local plugin runs its independent Worker command'],
  ['ACCEPT-commonjs','CommonJS text writes and unload data persistence','e2e-desktop/vault.spec.ts','CommonJS plugin loads through the packaged worker and persists text/data on unload'],
  ['ACCEPT-plugin-editor','Plugin replaces real editor selection','e2e-desktop/vault.spec.ts','CommonJS editor callback replaces the actual source selection and saves'],
  ['ACCEPT-plugin-data','Plugin data namespace isolation','tests/vault.test.mjs','plugin data is persisted as JSON and isolated by id'],
  ['ACCEPT-plugin-data-symlink','Reject cross-plugin data symlinks','tests/vault.test.mjs','plugin data rejects in-vault cross-plugin symlinks'],
  ['ACCEPT-create-only','Plugin create refuses overwrite','tests/vault.test.mjs','plugin create never overwrites existing content, including competing creates'],
  ['ACCEPT-append','Serialized in-process appends','tests/vault.test.mjs','plugin append serializes concurrent updates and rejects missing files'],
  ['ACCEPT-callback-order','editorCheckCallback precedence','tests/compatibility.test.ts','prefixes commands and prioritizes editorCheckCallback'],
  ['ACCEPT-lifecycle','Awaited lifecycle and unload settings','tests/compatibility.test.ts','saves data on load and unload and awaits lifecycle promises'],
  ['ACCEPT-api-index','Unique documented export inventory','tests/compatibility.test.ts','pins unique documented symbols and references']
];
for(const [id,title,file,test]of accepted){
  assert((await read(file)).includes(test),`Missing evidence for ${id}: ${file} / ${test}`);
  items.push({id,section:'Bounded acceptance checks',title,status:'verified-subset',reference:id.includes('plugin')||id.includes('commonjs')||id.includes('callback')||id.includes('lifecycle')||id.includes('api')?exported.source_url:'https://help.obsidian.md',implemented:title,remaining:'This checked checkpoint does not complete its parent parity area.',evidence:[{file,test}]});
}
const outstanding=[
  ['GATE-reference','Pin an installed reference version for clean-room black-box comparisons'],
  ['GATE-plugin-corpus','Expand the five-plugin startup corpus into actual functional/platform compatibility and license-reviewed coverage'],
  ['GATE-settings','Enumerate every setting, default, command and shortcut with fixtures'],
  ['GATE-platforms','Native Windows/macOS and iOS/Android runtime, installation and upgrade acceptance'],
  ['GATE-security','Security, dependencies/licenses, accessibility and adversarial plugin audit'],
  ['GATE-large-vault','Large vaults/documents, external writers and crash/power-loss acceptance'],
  ['GATE-api-members','Audit every API member, overload and event beyond primary contracts'],
  ['GATE-plugin-ui','DOM/settings/Modal/view/render processors and CM integration'],
  ['GATE-plugin-environment','Node/Electron/network/npm assumptions under an explicit permission policy'],
  ['GATE-extensions','Free Importer, Maps and Web Clipper equivalents'],
  ['GATE-checklist-expansion','Expand every partial parent into exhaustive per-workflow acceptance']
];
for(const [id,title]of outstanding)items.push({id,section:'Unfinished parity gates',title,status:'missing',reference:id.includes('api')||id.includes('plugin')?exported.source_url:'https://help.obsidian.md',implemented:'None signed off',remaining:title,evidence:[]});
assert.equal(new Set(items.map(i=>i.id)).size,items.length);
const checklist={baseline,scope:'Parent areas are incomplete; checked boxes are bounded Engine acceptance checkpoints. No overall parity percentage.',items};
let md='# Feature checklist\n\nDocumentation baseline: 2026-10-12 UTC. Installed reference version: **not fixed or tested**. This is a traceable starting inventory, not an exhaustive specification or a 1:1 claim.\n\nOnly bounded acceptance checkpoints may be checked. Parent areas stay unchecked until all reference workflows pass. Exclusions are only Sync and Publish; free extensions, mobile and plugins remain in scope. Add new cases when workflows are discovered. Test evidence is checked for existence by `npm run inventory:check` and exercised by the normal test suites; the inventory checker itself does not run tests.\n\n';
for(const group of [...new Set(items.map(i=>i.section))]){
  md+='## '+group+'\n\n';
  for(const item of items.filter(i=>i.section===group)){
    md+=`- [${item.status==='verified-subset'?'x':' '}] **${item.id} ${item.title}**: ${item.status}. Reference: [public documentation](${item.reference}).\n`;
    md+=`  - ${item.status==='verified-subset'?'Acceptance':'Current scope'}: ${item.implemented}\n`;
    if(item.status!=='verified-subset')md+=`  - Remaining / boundary: ${item.remaining}\n`;
    for(const ev of item.evidence)md+=`  - Evidence: \`${ev.file}\` / \`${ev.test}\`.\n`;
  }md+='\n';
}
md+='## Maintenance\n\nEdit `PARITY.md` and the acceptance registry in `scripts/inventory.mjs`, then run `npm run inventory:update`. Commit generated JSON and Markdown together. CI rejects drift, missing core plugins, extra exclusions, duplicate IDs and missing evidence. Do not remove unfinished areas to improve statistics. Keep checkpoint IDs stable; append new cases. Public docs may change: refresh the baseline deliberately and record differences.\n';
let api='# Public API export coverage\n\n'+`Pinned [public API index](${exported.source_url}): ${exported.symbols.length} names; ${exported.symbols.filter(s=>s.runtime).length} runtime symbols; ${exported.symbols.filter(s=>!s.runtime).length} type-only names. ${supported.length} runtime symbols expose a bounded implementation; other runtime symbols are explicitly rejected. **Export-access tests do not establish member behavior or real-plugin compatibility.** See PLUGIN-COMPATIBILITY.md and compatibility/member-contracts.json.\n\n| Symbol | Kind | Runtime behavior | Public documentation |\n|---|---|---|---|\n`;
for(const s of exported.symbols)api+=`| ${s.name} | ${s.kind} | ${!s.runtime?'Type only; runtime access rejected':supported.includes(s.name)?'Implemented subset, not full equivalence':'Unsupported; explicit CompatibilityError'} | [${s.name}](${s.source_url}) |\n`;
const generated={'docs/FEATURE-CHECKLIST.md':md,'docs/compatibility/feature-checklist.json':JSON.stringify(checklist,null,2)+'\n','docs/API-COVERAGE.md':api};
for(const [file,content]of Object.entries(generated)){
  if(check)assert.equal(await read(file),content,'Inventory drift: '+file+'; run npm run inventory:update');
  else await fs.writeFile(new URL('../'+file,import.meta.url),content);
}
console.log(`${check?'Checked':'Generated'} ${items.length} feature entries (${core.length} core, ${accepted.length} bounded checkpoints); ${exported.symbols.length} API exports (${supported.length} subset).`);
