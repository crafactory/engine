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
