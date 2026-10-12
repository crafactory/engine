import {test,expect,_electron as electron,type ElectronApplication,type Page} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
let root:string,userData:string,app:ElectronApplication,page:Page;
test.beforeEach(async()=>{
  root=await fs.mkdtemp(path.join(os.tmpdir(),'engine-native-'));
  userData=await fs.mkdtemp(path.join(os.tmpdir(),'engine-profile-'));
  await fs.writeFile(path.join(root,'Persist.md'),'# Persist\n\nOriginal content.\n');
  const executablePath=process.env.E2E_EXECUTABLE_PATH;
  app=await electron.launch({executablePath,args:['--no-sandbox',...(executablePath?[]:[path.resolve('electron/main.cjs')]),'--vault',root,'--user-data-dir='+userData],timeout:45000,env:{...process.env,ENGINE_DEV:'0'}});
  page=await app.firstWindow();await expect(page.locator('.note-title h1')).toHaveText('Persist');
});
test.afterEach(async()=>{await app?.close();await fs.rm(root,{recursive:true,force:true});await fs.rm(userData,{recursive:true,force:true});});
test('native renderer opens under secure app protocol and writes real Markdown',async()=>{
  expect(page.url()).toBe('engine://app/index.html');
  expect(await page.evaluate(()=>!!window.engine?.desktop)).toBe(true);
  await page.getByTestId('mode-source').click();await page.getByTestId('note-editor').click();await page.keyboard.press('Control+End');await page.keyboard.type('Saved by desktop.');
  await expect.poll(async()=>fs.readFile(path.join(root,'Persist.md'),'utf8')).toContain('Saved by desktop.');
  await page.getByTestId('mode-reading').click();await expect(page.locator('.markdown')).toContainText('Saved by desktop.');
  const records=await fs.readdir(path.join(root,'.crafactory/recovery'));expect(records.length).toBeGreaterThan(0);
});
test('native watcher reloads external edits',async()=>{
  await fs.writeFile(path.join(root,'Persist.md'),'# Persist\n\nEdited externally.\n');
  await expect(page.getByTestId('note-editor')).toContainText('Edited externally.');
});
test('native embedded tasks cannot mutate a different host task or embedded source',async()=>{
  const canvas=JSON.stringify({nodes:[{id:'task',type:'text',x:0,y:0,width:260,height:160,text:'- [ ] Canvas task'}],edges:[]},null,2);
  const embedded='- [ ] Embedded task\n';
  const source='---\nstatus: pending\n---\n# Persist\n\n- [ ] First\n\n![[Tasks.canvas]]\n\n![[Embedded.md]]\n\n- [ ] Second\n\n> - [ ] Quoted\n\n1. [ ] Ordered\n'.replace(/\n/g,'\r\n');
  await page.getByTestId('mode-source').click();
  await fs.writeFile(path.join(root,'Tasks.canvas'),canvas);await fs.writeFile(path.join(root,'Embedded.md'),embedded);
  await fs.writeFile(path.join(root,'Persist.md'),source);
  await expect.poll(async()=>(await page.getByTestId('note-editor').locator('.cm-line').allTextContents()).join('\n')).toBe(source.replace(/\r\n/g,'\n'));
  await expect(page.getByTestId('file-Tasks.canvas')).toBeVisible();await expect(page.getByTestId('file-Embedded.md')).toBeVisible();
  await page.getByTestId('mode-reading').click();
  await expect(page.getByRole('checkbox',{name:'Canvas task',exact:true})).toBeDisabled();
  await expect(page.getByRole('checkbox',{name:'Embedded task',exact:true})).toBeDisabled();
  for(const name of ['Second','Quoted','Ordered'])await page.getByRole('checkbox',{name,exact:true}).check();
  await expect(page.getByRole('checkbox',{name:'First',exact:true})).not.toBeChecked();
  await expect.poll(async()=>fs.readFile(path.join(root,'Persist.md'),'utf8')).toBe(source.replace('- [ ] Second','- [x] Second').replace('- [ ] Quoted','- [x] Quoted').replace('1. [ ] Ordered','1. [x] Ordered'));
  expect(await fs.readFile(path.join(root,'Tasks.canvas'),'utf8')).toBe(canvas);
  expect(await fs.readFile(path.join(root,'Embedded.md'),'utf8')).toBe(embedded);
});
test('native Canvas embed and rename preserve exact JSON bytes and file type',async()=>{
  const content=JSON.stringify({custom:'retain me',nodes:[{id:'a',type:'text',x:0,y:0,width:260,height:160,text:'# Canvas marker'}],edges:[]},null,2);
  await fs.writeFile(path.join(root,'Board.canvas'),content);
  await fs.writeFile(path.join(root,'Persist.md'),'# Persist\n\n![[Board.canvas]]');
  await expect(page.getByTestId('file-Board.canvas')).toBeVisible();
  await page.getByTestId('mode-reading').click();
  await expect(page.locator('.embedded-note .react-flow__node')).toHaveCount(1);
  await expect(page.locator('.embedded-note .canvas-markdown')).toContainText('Canvas marker');
  await expect(page.locator('.embedded-note .canvas-edit')).toHaveCount(0);
  expect(await fs.readFile(path.join(root,'Board.canvas'),'utf8')).toBe(content);
  await page.locator('.embed-title').click();await expect(page.getByTestId('canvas-add-text')).toBeVisible();
  await page.getByRole('button',{name:'Command palette',exact:true}).click();await page.getByTestId('palette-input').fill('Rename or move current file');await page.keyboard.press('Enter');
  await page.getByTestId('dialog-input').fill('Renamed');await page.getByTestId('dialog-submit').click();
  await expect.poll(async()=>fs.readFile(path.join(root,'Renamed.canvas'),'utf8').catch(()=>null)).toBe(content);
  expect(await fs.stat(path.join(root,'Renamed.md')).catch(()=>null)).toBeNull();
  expect(await fs.stat(path.join(root,'Board.canvas')).catch(()=>null)).toBeNull();
  await expect.poll(async()=>fs.readFile(path.join(root,'Persist.md'),'utf8')).toContain('![[Renamed.canvas]]');
  await page.getByTestId('file-Persist.md').click();await page.getByTestId('mode-live').click();
  await expect(page.locator('.embedded-note .react-flow__node')).toHaveCount(1);
  await page.locator('.embed-title').click();await expect(page.getByTestId('canvas-add-text')).toBeVisible();
  expect(await fs.readFile(path.join(root,'Renamed.canvas'),'utf8')).toBe(content);
});
test('native rename rewrites resolved links and trash preserves content',async()=>{
  await fs.writeFile(path.join(root,'Ref.md'),'# Ref\n\n[[Persist]]\n');
  await expect(page.getByTestId('file-Ref.md')).toBeVisible();
  await page.getByRole('button',{name:'Command palette',exact:true}).click();await page.getByTestId('palette-input').fill('Rename or move current file');await page.keyboard.press('Enter');
  await page.getByTestId('dialog-input').fill('Moved.md');await page.getByTestId('dialog-submit').click();await expect.poll(async()=>fs.readFile(path.join(root,'Ref.md'),'utf8')).toContain('[[Moved]]');
  await page.getByRole('button',{name:'Command palette',exact:true}).click();await page.getByTestId('palette-input').fill('Move current file to trash');await page.keyboard.press('Enter');await page.getByTestId('dialog-submit').click();
  await expect(page.getByTestId('file-Moved.md')).toHaveCount(0);expect((await fs.readdir(path.join(root,'.crafactory/trash'))).length).toBe(2);
});
test('window close flushes a just-typed draft before exiting',async()=>{
  await page.getByTestId('mode-source').click();await page.getByTestId('note-editor').click();await page.keyboard.press('Control+End');await page.keyboard.type('Immediate close draft.');
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());
  await expect.poll(async()=>fs.readFile(path.join(root,'Persist.md'),'utf8')).toContain('Immediate close draft.');
});
test('Unicode filename and content round-trip through native UI and disk',async()=>{
  await page.getByRole('button',{name:'New note',exact:true}).click();await page.getByTestId('dialog-input').fill('想法/你好.md');await page.getByTestId('dialog-submit').click();await expect(page.locator('.note-title h1')).toHaveText('你好');
  await page.getByTestId('note-editor').click();await page.keyboard.press('Control+End');await page.keyboard.insertText('中文内容保留。');await expect.poll(async()=>fs.readFile(path.join(root,'想法/你好.md'),'utf8')).toContain('中文内容保留。');
});
test('opt-in local plugin runs its independent Worker command',async()=>{
  const dir=path.join(root,'.crafactory/plugins/example');await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({id:'example',name:'Example',version:'1'}));
  await fs.writeFile(path.join(dir,'main.js'),'engine.registerCommand("make", "Example: create note", () => engine.write("Plugin.md", "# Plugin\\n\\nWritten by Worker."));');
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Community plugins',exact:true}).click();
  await page.getByRole('switch',{name:'Enable Example',exact:true}).click();await page.getByTestId('dialog-submit').click();await expect(page.getByRole('switch',{name:'Enable Example',exact:true})).toBeChecked();await page.getByTestId('settings-close').click();
  await page.getByRole('button',{name:'Command palette',exact:true}).click();await page.getByTestId('palette-input').fill('Example: create note');await page.keyboard.press('Enter');
  await expect.poll(async()=>fs.readFile(path.join(root,'Plugin.md'),'utf8').catch(()=>'' )).toContain('Written by Worker.');
});
test('native live table and task edits persist exact Markdown without the custom header',async()=>{
  await expect(page.locator('.titlebar')).toHaveCount(0);
  await page.getByTestId('mode-source').click();await page.getByTestId('note-editor').click();await page.keyboard.press('Control+a');
  await page.keyboard.insertText('---\naliases: [Original]\n---\n# Persist\n\n| Name | State |\n| --- | --- |\n| One | Open |\n\n- [ ] Verify native save\n\nEnd.\n');
  await page.getByTestId('mode-live').click();
  await page.getByRole('button',{name:'Edit cell row 2 column 2',exact:true}).click();
  await page.getByRole('textbox',{name:'Cell row 2 column 2',exact:true}).fill('Saved | native');await page.keyboard.press('Enter');
  await page.getByRole('checkbox',{name:'Toggle task: Verify native save',exact:true}).check();
  await expect.poll(async()=>fs.readFile(path.join(root,'Persist.md'),'utf8')).toContain('| One | Saved \\| native |');
  const content=await fs.readFile(path.join(root,'Persist.md'),'utf8');expect(content).toContain('- [x] Verify native save');expect(content).toContain('aliases: [Original]');
});
/** Install an original compatibility fixture into the temporary native vault. */
async function installCompat(code?:string,id='compat-fixture',name='Compatibility fixture'){
  const dir=path.join(root,'.crafactory/plugins',id);await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({id,name,version:'1.0.0'}));
  await fs.writeFile(path.join(dir,'main.js'),code??await fs.readFile('examples/plugins/compat-fixture/main.js','utf8'));
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Community plugins',exact:true}).click();
  await page.getByRole('switch',{name:'Enable '+name,exact:true}).click();await page.getByTestId('dialog-submit').click();
  return page.getByRole('switch',{name:'Enable '+name,exact:true});
}
/** Invoke a compatibility-fixture command through the visible palette. */
async function pluginCommand(name:string){
  await page.getByRole('button',{name:'Command palette',exact:true}).click();await page.getByTestId('palette-input').fill(name);await page.keyboard.press('Enter');
}
test('CommonJS plugin loads through the packaged worker and persists text/data on unload',async()=>{
  const control=await installCompat();await expect(control).toBeChecked();await page.getByTestId('settings-close').click();
  await pluginCommand('Compatibility fixture: Create a test note');
  await expect.poll(async()=>fs.readFile(path.join(root,'Compatibility.md'),'utf8').catch(()=>'' )).toContain('Original plugin, independent runtime.');
  await expect.poll(async()=>JSON.parse(await fs.readFile(path.join(root,'.crafactory/plugins/compat-fixture/data.json'),'utf8'))).toEqual({loads:1,unloaded:false});
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Community plugins',exact:true}).click();
  await control.click();await expect(control).not.toBeChecked();
  await expect.poll(async()=>JSON.parse(await fs.readFile(path.join(root,'.crafactory/plugins/compat-fixture/data.json'),'utf8'))).toEqual({loads:1,unloaded:true});
  await control.click();await page.getByTestId('dialog-submit').click();await expect(control).toBeChecked();
  await expect.poll(async()=>JSON.parse(await fs.readFile(path.join(root,'.crafactory/plugins/compat-fixture/data.json'),'utf8')).loads).toBe(2);
});
test('CommonJS editor callback replaces the actual source selection and saves',async()=>{
  const control=await installCompat();await expect(control).toBeChecked();await page.getByTestId('settings-close').click();
  await page.getByTestId('mode-source').click();await page.getByTestId('note-editor').click();await page.keyboard.press('Control+Home');await page.keyboard.press('Control+Shift+End');
  await pluginCommand('Compatibility fixture: Replace the selection');
  await expect.poll(async()=>fs.readFile(path.join(root,'Persist.md'),'utf8')).toBe('PLUGIN');
  await expect(page.getByTestId('note-editor')).toHaveText('PLUGIN');
});
for(const [name,code,expected] of [
  ['DOM','const {Plugin}=require("obsidian");module.exports=class extends Plugin{onload(){this.addStatusBarItem();}};','Plugin.addStatusBarItem'],
  ['Node','require("fs");','require fs'],
  ['Export','const {Modal}=require("obsidian");','export Modal'],
  ['Editor extension','const {Plugin}=require("obsidian");module.exports=class extends Plugin{onload(){this.registerEditorExtension([]);}};','Plugin.registerEditorExtension'],
  ['Bases view','const {Plugin}=require("obsidian");module.exports=class extends Plugin{onload(){this.registerBasesView("test",{});}};','Plugin.registerBasesView']
])test(`unsupported ${name} plugin is refused without becoming enabled`,async()=>{
  const control=await installCompat(code,'negative','Negative');await expect(control).not.toBeChecked();
  await expect(page.locator('.error-banner')).toContainText(expected);
  expect(await fs.readFile(path.join(root,'Persist.md'),'utf8')).toContain('Original content.');
});
test('plugin unload finishes persistent data when the window closes',async()=>{
  const control=await installCompat();await expect(control).toBeChecked();await page.getByTestId('settings-close').click();
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());
  await expect.poll(async()=>JSON.parse(await fs.readFile(path.join(root,'.crafactory/plugins/compat-fixture/data.json'),'utf8')).unloaded).toBe(true);
});
test('failed plugin command cannot overwrite an existing note and is disabled',async()=>{
  const control=await installCompat('const {Plugin}=require("obsidian");module.exports=class extends Plugin{onload(){this.addCommand({id:"bad",name:"Overwrite",callback:()=>this.app.vault.create("Persist.md","BAD")});}};','collision','Collision');
  await expect(control).toBeChecked();await page.getByTestId('settings-close').click();await pluginCommand('Collision: Overwrite');
  await expect(page.locator('.toast')).toContainText('exists');
  expect(await fs.readFile(path.join(root,'Persist.md'),'utf8')).toContain('Original content.');
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Community plugins',exact:true}).click();await expect(control).not.toBeChecked();
});
test('plugin traversal command is refused without writing outside the vault',async()=>{
  const target='../'+path.basename(root)+'-escape.md';
  const control=await installCompat(`const {Plugin}=require("obsidian");module.exports=class extends Plugin{onload(){this.addCommand({id:"bad",name:"Traverse",callback:()=>this.app.vault.create(${JSON.stringify(target)},"BAD")});}};`,'traversal','Traversal');
  await expect(control).toBeChecked();await page.getByTestId('settings-close').click();await pluginCommand('Traversal: Traverse');
  await expect(page.locator('.toast')).toContainText('Invalid plugin vault path');
  expect(await fs.readFile(path.join(root,'Persist.md'),'utf8')).toContain('Original content.');
  await expect(fs.access(path.resolve(root,target))).rejects.toThrow();
});
test('editor command is unavailable in reading mode and returns in source mode',async()=>{
  const control=await installCompat();await expect(control).toBeChecked();await page.getByTestId('settings-close').click();
  await page.getByTestId('mode-reading').click();await page.getByRole('button',{name:'Command palette',exact:true}).click();
  await page.getByTestId('palette-input').fill('Compatibility fixture: Replace the selection');await expect(page.locator('.palette-list button')).toHaveCount(0);await page.keyboard.press('Escape');
  await page.getByTestId('mode-source').click();await page.getByRole('button',{name:'Command palette',exact:true}).click();
  await page.getByTestId('palette-input').fill('Compatibility fixture: Replace the selection');await expect(page.locator('.palette-list button')).toHaveCount(1);
});
