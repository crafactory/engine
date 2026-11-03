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
  for(const file of ['manifest.json','main.js','styles.css'])await fs.copyFile('examples/plugins/renderer-fixture/'+file,path.join(dir,file));
  const executablePath=process.env.E2E_EXECUTABLE_PATH;
  app=await electron.launch({executablePath,args:['--no-sandbox',...(executablePath?[]:[path.resolve('electron/main.cjs')]),'--vault',root,'--user-data-dir='+profile],env:{...process.env,ENGINE_DEV:'0'}});
  page=await app.firstWindow();await expect(page.locator('.note-title h1')).toHaveText('Test');
});
test.afterEach(async()=>{await app?.close();await fs.rm(root,{recursive:true,force:true});await fs.rm(profile,{recursive:true,force:true});});
test('renderer view actions, SVG helpers and package CSS retain owned cleanup',async()=>{
  await enable();await page.getByTestId('settings-close').click();await command('Open view');
  const action=page.getByRole('button',{name:'Fixture view action',exact:true});
  expect(await action.evaluate(element=>getComputedStyle(element).getPropertyValue('--fixture-owned-style').trim())).toBe('active');
  await action.evaluate(element=>{(window as any).__fixtureClosedAction=element;});await action.click();
  await expect(page.locator('.plugin-view-content')).toHaveText('View action invoked');
  await page.getByRole('button',{name:'Close Fixture view',exact:true}).click();
  await page.evaluate(()=>(window as any).__fixtureClosedAction.click());expect(await page.evaluate(()=>(window as any).__fixtureViewActions)).toBe(1);
  await settings();await page.getByRole('switch',{name:'Enable Renderer fixture',exact:true}).click();
  await expect(page.locator('style[data-plugin="renderer-fixture"]')).toHaveCount(0);
});
test('renderer DOM compatibility helpers delegate, unsubscribe and observe real window migration',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  const result=await page.evaluate(async()=>{
    const root=document.createElement('div') as any,button=document.createElement('button'),child=document.createElement('span');
    button.className='fixture-delegate';button.append(child);root.append(button);document.body.append(root);
    let calls=0,context=false,delegate=false;const listener=function(this:unknown,_event:Event,target:HTMLElement){calls++;context=this===root;delegate=target===button;};
    root.on('click','.fixture-delegate',listener);child.click();root.off('click','.fixture-delegate',listener);child.click();
    let once=0;const unrelated=document.createElement('button');root.append(unrelated);
    root.on('click','.fixture-delegate',()=>once++,{once:true});unrelated.click();child.click();child.click();
    const values=['a','b','a'] as any;values.remove('a');
    const node=document.createElement('div') as any;let inserted=0;const stopInserted=node.onNodeInserted(()=>inserted++,true);root.append(node);await Promise.resolve();node.remove();root.append(node);await Promise.resolve();stopInserted();
    const frame=document.createElement('iframe');root.append(frame);let migrated=0,correctWindow=false;
    const moved=new Promise<void>(resolve=>{const stop=node.onWindowMigrated((win:Window)=>{migrated++;correctWindow=win===frame.contentWindow;stop();resolve();});});
    frame.contentDocument!.body.append(node);await moved;root.append(node);await Promise.resolve();root.remove();
    return {calls,once,context,delegate,values:[...values],inserted,migrated,correctWindow};
  });
  expect(result).toEqual({calls:1,once:1,context:true,delegate:true,values:['b'],inserted:1,migrated:1,correctWindow:true});
});
test('embedded input survives a late read, including typing and clearing the buffer',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  await page.evaluate(async()=>{
    const app=(window as any).app,container=document.createElement('div');document.body.append(container);
    const embed=app.embedRegistry.embedByExtension.md({containerEl:container},null);await embed.load();
    embed.file=app.vault.getFileByPath('Zeta.md');(window as any).__lateEmbed={app,container,embed};
  });
  for(const value of ['typed before read','']){
    await page.evaluate(()=>{
      const state=(window as any).__lateEmbed,read=state.app.vault.read;
      state.app.vault.read=()=>new Promise(resolve=>state.resolve=resolve);
      try{state.embed.showEditor();}finally{state.app.vault.read=read;}
    });
    const input=page.getByRole('textbox',{name:'Embedded Markdown editor',exact:true});
    await input.fill('typed before read');if(!value)await input.fill('');
    await page.evaluate(async()=>{(window as any).__lateEmbed.resolve('late disk text');await Promise.resolve();});
    await expect(input).toHaveText(value);
  }
  await page.evaluate(async()=>{const state=(window as any).__lateEmbed;await state.embed.unload();state.container.remove();delete (window as any).__lateEmbed;});
});
test('reused file leaves release their previous document override',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  await command('Open Markdown as text view');await expect(page.getByRole('textbox',{name:'Fixture document',exact:true})).toBeVisible();
  await command('Reuse leaf for another file');
  await expect(page.locator('.retained-plugin-view')).toHaveCount(1);
  expect(await page.evaluate(()=>(window as any).app.workspace.getLeavesOfType('fixture-text').map((leaf:any)=>leaf.view.file.path))).toEqual(['Test.txt']);
  await page.getByTestId('file-Zeta.md').click();await expect(page.getByRole('textbox',{name:'Fixture document',exact:true})).toBeHidden();
});
test('file-specific text views flush pending data and recreate safely across rename and trash',async()=>{
  await enable();await page.getByTestId('settings-close').click();await command('Open Markdown as text view');
  await page.getByRole('textbox',{name:'Fixture document',exact:true}).fill('pending before rename');
  await page.getByRole('button',{name:'Command palette',exact:true}).click();await page.getByTestId('palette-input').fill('Rename or move current file');await page.keyboard.press('Enter');
  await page.getByRole('dialog',{name:'Rename or move',exact:true}).getByRole('textbox').fill('Moved.md');await page.getByTestId('dialog-submit').click();
  await expect(page.getByTestId('file-Moved.md')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>{const view=(window as any).app.workspace.activeLeaf.view;return {type:view.getViewType(),file:view.file?.path};})).toEqual({type:'fixture-text',file:'Moved.md'});
  await expect(page.getByRole('textbox',{name:'Fixture document',exact:true})).toHaveValue('pending before rename');
  expect(await fs.readFile(path.join(root,'Moved.md'),'utf8')).toBe('pending before rename');await expect(fs.stat(path.join(root,'Zeta.md'))).rejects.toThrow();
  await page.getByRole('textbox',{name:'Fixture document',exact:true}).fill('pending before trash');
  await page.getByTestId('file-Moved.md').click({button:'right'});await page.getByRole('button',{name:'Move to trash',exact:true}).click();await page.getByTestId('dialog-submit').click();
  await expect(page.getByTestId('file-Moved.md')).toHaveCount(0);await expect(page.getByRole('textbox',{name:'Fixture document',exact:true})).toHaveCount(0);
  await expect(fs.stat(path.join(root,'Moved.md'))).rejects.toThrow();await expect(fs.stat(path.join(root,'Zeta.md'))).rejects.toThrow();
  const trash=path.join(root,'.crafactory/trash'),files=(await fs.readdir(trash)).filter(name=>!name.endsWith('.json'));
  expect(await fs.readFile(path.join(trash,files[0]),'utf8')).toBe('pending before trash');
});
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
  expect(await page.evaluate(()=>{const app=(window as any).app;return {file:app.workspace.activeLeaf.view.file,recent:app.workspace.getMostRecentLeaf()===app.workspace.activeLeaf};})).toEqual({file:'Test.fixture',recent:true});
  await settings();await page.getByRole('switch',{name:'Enable Renderer fixture',exact:true}).click();await page.getByTestId('settings-close').click();
  await expect(page.locator('.plugin-view-host')).toHaveCount(0);
});
test('renderer array endpoints and DOM instance checks handle adopted nodes across windows',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  expect(await page.evaluate(()=>{
    const iframe=document.createElement('iframe');document.body.append(iframe);
    const node=document.createElement('p');iframe.contentDocument!.adoptNode(node);
    const realm=iframe.contentWindow as any;
    const checks=[(node as any).instanceOf(realm.HTMLParagraphElement),(node as any).instanceOf(realm.HTMLElement),(node as any).instanceOf(realm.HTMLSpanElement)];
    iframe.remove();
    return {checks,first:([1,2] as any).first(),last:([1,2] as any).last(),emptyFirst:([] as any).first(),emptyLast:([] as any).last()};
  })).toEqual({checks:[true,true,false],first:1,last:2,emptyFirst:undefined,emptyLast:undefined});
});
test('renderer embedded Markdown editor subclasses handle real input and dispose with their view',async()=>{
  await enable();await page.getByTestId('settings-close').click();await command('Open embedded editor');
  const input=page.getByRole('textbox',{name:'Embedded Markdown editor',exact:true});
  await expect(input).toHaveText('embedded initial');await input.fill('edited embedded text');
  await expect(page.getByTestId('embedded-editor-status')).toHaveText('edited embedded text');
  expect(await page.evaluate(()=>(window as any).__fixtureEmbeddedEditor.get())).toBe('edited embedded text');
  await input.press('ControlOrMeta+z');await expect(input).toHaveText('embedded initial');
  await input.press('ControlOrMeta+Shift+z');await expect(input).toHaveText('edited embedded text');
  await input.press('Enter');expect(await page.evaluate(()=>(window as any).__fixtureSourceSubmit)).toBe('edited embedded text');
  expect(await page.evaluate(()=>(window as any).__fixtureSourceUpdates)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Close Embedded fixture',exact:true}).click();await expect(input).toHaveCount(0);
  await command('Open embedded editor');await expect(input).toHaveText('embedded initial');
});
test('legacy mode factories receive separate configuration/specification and do not share instances',async()=>{
  await enable();
  const actual=await page.evaluate(()=>{
    const cm=(window as any).CodeMirror;
    cm.defineMode('fixture-mode',(config:any,spec:any)=>({config,spec}));
    cm.defineMIME('text/x-fixture',{name:'fixture-mode',statementIndent:7});
    const first=cm.getMode({indentUnit:3},'text/x-fixture'),second=cm.getMode({indentUnit:5},{name:'fixture-mode',statementIndent:9});
    const original={stack:[1],nested:{}},copy=cm.copyState({},original);copy.stack.push(2);
    const custom=cm.copyState({copyState:(state:any)=>({value:state.value+1})},{value:4});
    return {first:first.config.indentUnit,statement:first.spec.statementIndent,second:second.config.indentUnit,other:second.spec.statementIndent,same:first===second,copied:copy!==original&&copy.stack!==original.stack&&original.stack.length===1&&copy.nested===original.nested,custom:custom.value};
  });
  expect(actual).toEqual({first:3,statement:7,second:5,other:9,same:false,copied:true,custom:5});
});
test('renderer text-file view loads, autosaves, flushes on close and reopens persisted text',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  await page.getByTestId('file-Test.txt').click();
  const editor=page.getByRole('textbox',{name:'Fixture document'});await expect(editor).toHaveValue('original text');
  await editor.fill('autosaved text');
  await page.evaluate(()=>{(window as any).__fixtureTextView.data='subclass-owned pending state';});
  await expect.poll(()=>fs.readFile(path.join(root,'Test.txt'),'utf8')).toBe('autosaved text');
  expect(await page.evaluate(()=>(window as any).__fixtureTextView.data)).toBe('subclass-owned pending state');
  await editor.evaluate(element=>element.setAttribute('data-retention-probe','same-view'));
  await command('Update current view state');await expect(page.locator('.plugin-status-item')).toHaveText('View reused: true');
  expect(await page.evaluate(()=>(window as any).__fixtureEphemeral)).toEqual({probe:true});
  await expect(editor).toHaveAttribute('data-retention-probe','same-view');
  await page.getByTestId('file-Test.md').click();await expect(editor).toBeHidden();
  await page.getByTestId('file-Test.txt').click();await expect(editor).toHaveAttribute('data-retention-probe','same-view');
  await editor.fill('close-flushed text');await page.getByRole('button',{name:'Close Test.txt',exact:true}).click();
  await expect.poll(()=>fs.readFile(path.join(root,'Test.txt'),'utf8')).toBe('close-flushed text');
  await page.getByTestId('file-Test.txt').click();await expect(editor).toHaveValue('close-flushed text');
});
test('renderer text-file autosave rejects stale versions and retains the live draft',async()=>{
  await enable();await page.getByTestId('settings-close').click();await page.getByTestId('file-Test.txt').click();
  const editor=page.getByRole('textbox',{name:'Fixture document'});await expect(editor).toHaveValue('original text');
  await editor.fill('unsaved local draft');await fs.writeFile(path.join(root,'Test.txt'),'external edit wins');
  await expect(page.locator('.toast')).toContainText('CONFLICT',{timeout:8000});
  expect(await fs.readFile(path.join(root,'Test.txt'),'utf8')).toBe('external edit wins');
  await expect(editor).toHaveValue('unsaved local draft');
  // Restore the expected disk version so normal close can flush the retained local draft.
  await fs.writeFile(path.join(root,'Test.txt'),'original text');await page.getByRole('button',{name:'Close Test.txt',exact:true}).click();
  await expect.poll(()=>fs.readFile(path.join(root,'Test.txt'),'utf8')).toBe('unsaved local draft');
});
test('renderer file transitions serialize queued loads and close, then recover from failed loads',async()=>{
  await enable();await page.getByTestId('settings-close').click();await command('Race fixture file transitions');
  await expect(page.locator('.plugin-status-item')).toHaveText('Transitions complete');
  const result=await page.evaluate(()=>(window as any).__fileTransitions);
  expect(result.events).toEqual(['load Test.txt','loaded Test.txt','unload Test.txt','load Test.md','loaded Test.md','unload Test.md','load Zeta.md','loaded Zeta.md','unload Zeta.md']);
  expect(result.file).toBeNull();expect(result.retry).toBe('Test.md');
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
  const calls=await page.evaluate(()=>(window as any).__scopeCalls);expect(calls).toBe(1);
  await page.keyboard.press('Control+Shift+u');await expect(page.locator('.plugin-status-item')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).__scopeCalls)).toBe(calls);
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
