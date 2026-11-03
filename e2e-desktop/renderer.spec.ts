import {test,expect,_electron as electron,type ElectronApplication,type Page} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
let root:string,profile:string,app:ElectronApplication,page:Page;
test.beforeEach(async()=>{
  root=await fs.mkdtemp(path.join(os.tmpdir(),'engine-renderer-'));profile=await fs.mkdtemp(path.join(os.tmpdir(),'engine-renderer-profile-'));
  await fs.writeFile(path.join(root,'Test.md'),'Original text');await fs.writeFile(path.join(root,'ZTarget.md'),'Target');await fs.writeFile(path.join(root,'Zeta.md'),'[[ZTarget]]');await fs.writeFile(path.join(root,'Z#.md'),'Sharp target');await fs.writeFile(path.join(root,'Test.fixture'),'fixture body');await fs.writeFile(path.join(root,'Test.base'),'views:\n  - type: fixture-bases\n    name: Fixture\n');
  await fs.writeFile(path.join(root,'Test.txt'),'original text');
  const dir=path.join(root,'.crafactory/plugins/renderer-fixture');await fs.mkdir(dir,{recursive:true});
  for(const file of ['manifest.json','main.js'])await fs.copyFile('examples/plugins/renderer-fixture/'+file,path.join(dir,file));
  const executablePath=process.env.E2E_EXECUTABLE_PATH;
  app=await electron.launch({executablePath,args:['--no-sandbox',...(executablePath?[]:[path.resolve('electron/main.cjs')]),'--vault',root,'--user-data-dir='+profile],env:{...process.env,ENGINE_DEV:'0'}});
  page=await app.firstWindow();await expect(page.locator('.note-title h1')).toHaveText('Test');
});
test.afterEach(async()=>{await app?.close();await fs.rm(root,{recursive:true,force:true});await fs.rm(profile,{recursive:true,force:true});});
/** Minimal valid empty WebAssembly module: magic header plus version 1. */
const wasm=[0,97,115,109,1,0,0,0];
/** Compile WebAssembly from page context so the entry's real CSP decides. */
async function compileWasm(){return page.evaluate(bytes=>new Promise<string>(resolve=>setTimeout(async()=>{try{await WebAssembly.compile(new Uint8Array(bytes));resolve('compiled');}catch(error){resolve(String(error));}},0)),wasm);}
/** Open the native application's community-plugin settings using visible controls. */
async function settings(){await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Community plugins',exact:true}).click();}
/** Explicitly authorize and enable the original trusted-renderer fixture. */
async function enable(){await settings();await page.getByLabel('Runtime for Renderer fixture',{exact:true}).selectOption('renderer');await page.getByRole('switch',{name:'Enable Renderer fixture',exact:true}).click();await page.getByTestId('dialog-submit').click();await expect(page.getByRole('switch',{name:'Enable Renderer fixture',exact:true})).toBeChecked();}
/** Execute a fixture command through the application's command palette. */
async function command(name:string){await page.getByRole('button',{name:'Command palette',exact:true}).click();await page.getByTestId('palette-input').fill('Renderer fixture: '+name);await page.keyboard.press('Enter');}
test('trusted renderer requires explicit mode and cancellable permission',async()=>{
  await settings();await expect(page.getByLabel('Runtime for Renderer fixture',{exact:true})).toHaveValue('worker');
  await page.getByLabel('Runtime for Renderer fixture',{exact:true}).selectOption('renderer');await page.getByRole('switch',{name:'Enable Renderer fixture',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Enable Renderer fixture?'})).toContainText('NOT sandboxed');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByRole('switch',{name:'Enable Renderer fixture',exact:true})).not.toBeChecked();await expect(page.locator('.plugin-status-item')).toHaveCount(0);
});
test('real plugin status stays below workspace footer and releases its reserved strip on unload',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  await expect(page.locator('.plugin-status-item')).toBeVisible();
  const status=await page.locator('#plugin-status').boundingBox(),footer=await page.locator('.statusbar').boundingBox();
  expect(status!.y).toBeGreaterThanOrEqual(footer!.y+footer!.height-1);
  const link=page.getByRole('button',{name:'Explore local graph',exact:true});await expect(link).toBeVisible();
  const context=await link.boundingBox();expect(context!.y+context!.height).toBeLessThanOrEqual(status!.y);
  await settings();await page.getByRole('switch',{name:'Enable Renderer fixture',exact:true}).click();
  await page.getByTestId('settings-close').click();await expect(page.locator('#plugin-status')).toBeHidden();
});
test('renderer settings controls persist and modal traps focus and closes',async()=>{
  await enable();await page.getByRole('button',{name:'Plugin settings Renderer fixture',exact:true}).click();
  await page.getByLabel('Fixture text',{exact:true}).fill('中文 setting');
  await page.getByLabel('Fixture format',{exact:true}).selectOption('two');
  await page.getByRole('switch',{name:'Fixture toggle',exact:true}).check();
  await page.getByLabel('Fixture textarea',{exact:true}).fill('Multiline\nsetting');
  await page.getByLabel('Fixture slider',{exact:true}).fill('7');
  await expect.poll(async()=>JSON.parse(await fs.readFile(path.join(root,'.crafactory/plugins/renderer-fixture/data.json'),'utf8'))).toEqual({text:'中文 setting',format:'two',toggle:true,area:'Multiline\nsetting',slider:7});
  await page.getByRole('button',{name:'Open fixture modal',exact:true}).click();const modal=page.getByRole('dialog',{name:'Fixture modal',exact:true});await expect(modal).toBeVisible();
  await page.keyboard.press('Tab');await expect(modal.locator(':focus')).toHaveCount(1);await page.keyboard.press('Shift+Tab');await expect(modal.locator(':focus')).toHaveCount(1);
  await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);await expect(page.getByRole('button',{name:'Open fixture modal',exact:true})).toBeFocused();
  await page.getByTestId('settings-close').click();await settings();await page.getByRole('button',{name:'Plugin settings Renderer fixture',exact:true}).click();await expect(page.getByLabel('Fixture text',{exact:true})).toHaveValue('中文 setting');
});
test('renderer registerExtensions mounts a custom view in the main document area',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  await page.getByTestId('file-Test.fixture').click();
  await expect(page.locator('.plugin-view-host .plugin-view-content')).toHaveText('Fixture file: Test.fixture');
  await settings();await page.getByRole('switch',{name:'Enable Renderer fixture',exact:true}).click();await page.getByTestId('settings-close').click();
  await expect(page.locator('.plugin-view-host')).toHaveCount(0);
});
test('renderer text-file view loads, autosaves, flushes on close and reopens persisted text',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  await page.getByTestId('file-Test.txt').click();
  const editor=page.getByRole('textbox',{name:'Fixture document'});await expect(editor).toHaveValue('original text');
  await editor.fill('autosaved text');await expect.poll(()=>fs.readFile(path.join(root,'Test.txt'),'utf8')).toBe('autosaved text');
  await editor.fill('close-flushed text');await page.getByTestId('file-Test.md').click();
  await expect.poll(()=>fs.readFile(path.join(root,'Test.txt'),'utf8')).toBe('close-flushed text');
  await page.getByTestId('file-Test.txt').click();await expect(editor).toHaveValue('close-flushed text');
});
test('renderer suggestion picker ignores stale results and supports keyboard choice',async()=>{
  await enable();await page.getByTestId('settings-close').click();await command('Show fixture suggestions');
  const dialog=page.getByRole('dialog',{name:'Fixture suggestions'}),input=dialog.getByPlaceholder('Find fixture choice');
  await input.fill('slow');await input.fill('current');
  await expect(dialog.locator('.prompt-result')).toHaveText(['current first','current second']);
  await page.waitForTimeout(250);await expect(dialog.locator('.prompt-result')).toHaveText(['current first','current second']);
  await input.press('ArrowDown');await input.press('Enter');await expect(dialog).toHaveCount(0);
  await expect(page.locator('.plugin-status-item')).toHaveText('Picked current second');
});
test('renderer icon lookup clones sanitized SVG and supplies native tooltips',async()=>{
  await enable();await page.getByTestId('settings-close').click();await command('Show fixture icons');
  const modal=page.getByRole('dialog',{name:'Fixture icons'});
  await expect(modal.locator('svg')).toHaveCount(5);await expect(modal.locator('script')).toHaveCount(0);
  await expect(modal).toContainText('Registered icon');
  await expect(modal).toContainText('Icon ID roundtrip');
  await expect(modal.getByRole('button',{name:'Fixture icon button'})).toHaveAttribute('title','Fixture icon button');
  expect(await page.evaluate(()=>(window as any).badIcon)).toBeUndefined();
});
test('renderer App.scope dispatches hotkeys and revokes them on plugin unload',async()=>{
  await enable();await page.getByTestId('settings-close').click();await page.keyboard.press('Control+Shift+u');
  await expect(page.locator('.plugin-status-item')).toHaveText('Scoped en');
  await settings();await page.getByRole('switch',{name:'Enable Renderer fixture',exact:true}).click();await page.getByTestId('settings-close').click();
  await page.keyboard.press('Control+Shift+u');await expect(page.locator('.plugin-status-item')).toHaveCount(0);
});
test('renderer reusable leaf opens an exact path and can be revealed',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  await command('Reuse and open');
  await expect(page.locator('.note-title h1')).toHaveText('Z#');
  await expect(page.locator('.plugin-status-item')).toHaveText('Reused leaf');
});
test('renderer editor suggests bridge to CodeMirror autocomplete',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  await page.getByTestId('mode-source').click();await page.getByTestId('note-editor').click();
  await page.keyboard.press('ControlOrMeta+End');await page.keyboard.type(' @Al');
  const popup=page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();await expect(popup).toContainText('Alpha');
  await popup.locator('li').filter({hasText:'Alpha'}).first().click();
  await expect(page.locator('.cm-content')).toContainText('@Alpha');
});
test('renderer protocol handlers dispatch through the app event',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  await command('Dispatch protocol');
  await expect(page.locator('.plugin-status-item')).toHaveText('Protocol ok');
});
test('renderer Bases views mount in the Bases surface',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  await page.getByTestId('file-Test.base').click();
  await expect(page.locator('.plugin-bases-host')).toContainText('Fixture bases view');
  await settings();await page.getByRole('switch',{name:'Enable Renderer fixture',exact:true}).click();await page.getByTestId('settings-close').click();
  await expect(page.locator('.plugin-bases-host')).toHaveCount(0);
});
test('renderer hover sources receive hover-link events',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  await page.getByTestId('file-Zeta.md').click();await page.getByTestId('mode-reading').click();
  await page.locator('.markdown .internal-link').hover();
  await expect(page.locator('.plugin-status-item')).toHaveText('Hover ZTarget');
});
test('renderer CodeMirror extensions update real editor and unload all UI',async()=>{
  await enable();await expect(page.getByLabel('Runtime for Renderer fixture',{exact:true})).toBeDisabled();await page.getByTestId('settings-close').click();
  await command('DOM event');await expect(page.locator('.plugin-status-item')).toHaveText('DOM event');
  await page.getByTestId('mode-source').click();await page.getByTestId('note-editor').click();await page.keyboard.press('Control+End');await page.keyboard.type('x');await expect(page.locator('.plugin-status-item')).toContainText('CM changes: 1');
  await command('Replace extension');await page.getByTestId('note-editor').click();await page.keyboard.type('y');await expect(page.locator('.plugin-status-item')).toHaveText('CM replacement');
  await page.getByTestId('mode-reading').click();await page.getByTestId('mode-live').click();await page.getByTestId('note-editor').click();await page.keyboard.type('z');await expect(page.locator('.plugin-status-item')).toHaveText('CM replacement');
  await command('Open view');await expect(page.locator('.plugin-view-content')).toHaveText('Independent view opened');await page.getByRole('button',{name:'Close Fixture view',exact:true}).click();await expect(page.locator('.plugin-view-pane')).toHaveCount(0);
  await command('Open view');await command('Open modal');await expect(page.getByRole('dialog',{name:'Fixture modal',exact:true})).toBeVisible();await page.keyboard.press('Escape');
  await settings();await page.getByRole('switch',{name:'Enable Renderer fixture',exact:true}).click();await expect(page.locator('.plugin-status-item')).toHaveCount(0);await expect(page.locator('.plugin-view-pane')).toHaveCount(0);await expect(page.getByRole('button',{name:'Plugin settings Renderer fixture',exact:true})).toHaveCount(0);
  await page.getByTestId('settings-close').click();await page.getByTestId('note-editor').click();await page.keyboard.type('after-unload');await expect(page.locator('.plugin-status-item')).toHaveCount(0);await expect(page.locator('.error-banner')).toHaveCount(0);
});
for(const [label,source] of [['Node','require("fs");'],['Allocated UI','const {Plugin}=require("obsidian");module.exports=class extends Plugin{onload(){this.addStatusBarItem().setText("allocated");throw new Error("Startup fixture failure");}};']])
test(`trusted renderer failure cleans up: ${label}`,async()=>{
  await fs.writeFile(path.join(root,'.crafactory/plugins/renderer-fixture/main.js'),source);await settings();await page.getByLabel('Runtime for Renderer fixture',{exact:true}).selectOption('renderer');await page.getByRole('switch',{name:'Enable Renderer fixture',exact:true}).click();await page.getByTestId('dialog-submit').click();
  await expect(page.locator('.error-banner')).toBeVisible();await expect(page.getByRole('switch',{name:'Enable Renderer fixture',exact:true})).not.toBeChecked();await expect(page.locator('.plugin-status-item')).toHaveCount(0);
});
test('default entry refuses WebAssembly compilation',async()=>{
  const result=await compileWasm();
  expect(result).not.toBe('compiled');
  expect(result).toContain('CompileError');
  expect(result).toContain('Content Security Policy');
  await expect(page).toHaveURL('engine://app/index.html');
});
test('unsafe-eval is opt-in, desktop-only and applies after restart',async()=>{
  expect(await page.evaluate(()=>new Promise(resolve=>setTimeout(()=>{try{resolve(eval('2 + 2'));}catch{resolve('blocked');}},0)))).toBe('blocked');
  await settings();
  const toggle=page.getByRole('switch',{name:'Allow unsafe-eval in trusted renderer',exact:true});
  await expect(toggle).not.toBeChecked();
  await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1,checkboxChecked:false});});
  await toggle.click();await expect(page.getByRole('alert')).toContainText('unsafe-eval');await page.getByRole('button',{name:'Enable unsafe-eval',exact:true}).click();await expect(toggle).toBeChecked();
  await expect(page.getByRole('status').filter({hasText:'Restart Crafactory Engine'})).toBeVisible();
  await app.close();
  const executablePath=process.env.E2E_EXECUTABLE_PATH;
  app=await electron.launch({executablePath,args:['--no-sandbox',...(executablePath?[]:[path.resolve('electron/main.cjs')]),'--vault',root,'--user-data-dir='+profile],env:{...process.env,ENGINE_DEV:'0'}});
  page=await app.firstWindow();
  await expect(page).toHaveURL('engine://app/trusted.html');
  expect(await page.evaluate(()=>new Promise(resolve=>setTimeout(()=>{try{resolve(eval('2 + 2'));}catch(error){resolve(String(error));}},0)))).toBe(4);
  expect(await compileWasm()).toBe('compiled');
});
