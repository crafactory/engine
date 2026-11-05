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
test('search and extra setting controls clear, notify and respect disabled state',async()=>{
  await enable();await page.getByRole('button',{name:'Plugin settings Renderer fixture',exact:true}).click();
  const input=page.getByRole('searchbox',{name:'Fixture search',exact:true}),clear=page.getByRole('button',{name:'Clear search',exact:true}),extra=page.getByRole('button',{name:'Reset fixture search',exact:true});
  await expect(clear).toBeHidden();await input.fill('Filter value');await expect(clear).toBeVisible();await clear.click();await expect(input).toHaveValue('');await expect(input).toBeFocused();
  await expect.poll(async()=>JSON.parse(await fs.readFile(path.join(root,'.crafactory/plugins/renderer-fixture/data.json'),'utf8')).search).toBe('');
  await input.fill('Reset me');await extra.click();await expect(input).toHaveValue('');
  await page.evaluate(()=>{(window as any).__fixtureExtra.setDisabled(true);(window as any).__fixtureSearch.setValue('Disabled value').setDisabled(true);});
  await expect(input).toBeDisabled();await expect(clear).toBeDisabled();await expect(extra).toBeDisabled();
  await extra.evaluate((button:HTMLButtonElement)=>button.click());expect(await page.evaluate(()=>(window as any).__fixtureExtraClicks)).toBe(1);
});
test('renderer property types survive application restart for the same vault',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  await page.evaluate(()=>(window as any).app.metadataTypeManager.setType('Fixture date','date'));
  await app.close();const executablePath=process.env.E2E_EXECUTABLE_PATH;
  app=await electron.launch({executablePath,args:['--no-sandbox',...(executablePath?[]:[path.resolve('electron/main.cjs')]),'--vault',root,'--user-data-dir='+profile],env:{...process.env,ENGINE_DEV:'0'}});
  page=await app.firstWindow();await enable();await page.getByTestId('settings-close').click();
  expect(await page.evaluate(()=>(window as any).app.metadataTypeManager.getAllProperties()['fixture date'])).toEqual({name:'Fixture date',type:'date',count:0});
});
test('renderer UIEvents expose real target nodes and cross-window type checks',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  const checks=await page.evaluate(()=>{
    const body=document.body,div=document.createElement('div'),text=document.createTextNode('event target');div.append(text);body.append(div);
    const click=new MouseEvent('click',{bubbles:true,view:window}) as any;text.dispatchEvent(click);
    const winEvent=new UIEvent('fixture-window',{view:window}) as any;window.dispatchEvent(winEvent);
    const unbound=new MouseEvent('fixture-unbound') as any;
    const frame=document.createElement('iframe');body.append(frame);const foreign=frame.contentWindow as any;
    const target=Object.getOwnPropertyDescriptor(UIEvent.prototype,'targetNode')!.get!;
    const instanceOf=(UIEvent.prototype as any).instanceOf;
    const foreignEvent=new foreign.MouseEvent('fixture-foreign',{view:foreign});foreign.document.body.dispatchEvent(foreignEvent);
    const result=[click.targetNode===text,click.targetNode.instanceOf(Text),click.instanceOf(MouseEvent),click.instanceOf(UIEvent),!click.instanceOf(KeyboardEvent),
      winEvent.targetNode===null,unbound.targetNode===null,target.call(foreignEvent)===foreign.document.body,
      instanceOf.call(foreignEvent,MouseEvent),instanceOf.call(foreignEvent,UIEvent),!instanceOf.call(foreignEvent,KeyboardEvent),
      !instanceOf.call(foreignEvent,class MouseEvent {}),!Object.hasOwn(Object.prototype,'targetNode'),!Object.hasOwn(Object.prototype,'instanceOf')];
    frame.remove();div.remove();return result;
  });
  expect(checks).toEqual(Array(14).fill(true));
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
test('same-file activation prefers the requested earlier leaf and failed activation does not leak an override',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  const result=await page.evaluate(async()=>{
    const app=(window as any).app,a=app.workspace.getRightLeaf(),b=app.workspace.getRightLeaf();
    await a.setViewState({type:'fixture-view',state:{file:'Test.md'}});await b.setViewState({type:'fixture-view',state:{file:'Test.md'}});
    const identities=[];
    for(const leaf of [a,b,a]){await app.workspace.setActiveLeaf(leaf,{focus:false});identities.push(app.workspace.activeLeaf===leaf&&app.workspace.getMostRecentLeaf()===leaf);}
    // Use a tab placement without opening it, so failure exercises host registration.
    const failed=app.workspace.getLeaf(true);failed.view={file:'Missing.md',getViewType:()=> 'fixture-view'};
    let error='';try{await app.workspace.setActiveLeaf(failed,{focus:false});}catch(e){error=String(e);}
    const restored=app.workspace.activeLeaf===a;failed.view=null;await failed.detach();
    await app.vault.create('Missing.md','created after failed activation');
    return {identities,restored,error};
  });
  expect(result.identities).toEqual([true,true,true]);expect(result.restored).toBe(true);expect(result.error).not.toBe('');
  await page.getByTestId('file-Missing.md').click();
  await expect(page.locator('.note-title h1')).toHaveText('Missing');
  await expect(page.locator('.retained-plugin-view')).toHaveCount(0);
});
test('merge flushes the plugin draft into both destination and trash before retiring its view',async()=>{
  await enable();await page.getByTestId('settings-close').click();await command('Open Markdown as text view');
  await page.getByRole('textbox',{name:'Fixture document',exact:true}).fill('latest pending merge draft');
  await page.getByRole('button',{name:'Command palette',exact:true}).click();await page.getByTestId('palette-input').fill('Merge into');await page.keyboard.press('Enter');
  await expect(page.getByTestId('palette-input')).toHaveAttribute('aria-label','Merge into note');
  await page.getByTestId('palette-item-Test.md').click();await page.getByTestId('dialog-submit').click();
  await expect(page.getByTestId('file-Zeta.md')).toHaveCount(0);
  expect(await fs.readFile(path.join(root,'Test.md'),'utf8')).toContain('latest pending merge draft');
  const trash=path.join(root,'.crafactory/trash'),files=(await fs.readdir(trash)).filter(name=>!name.endsWith('.json'));
  expect(await fs.readFile(path.join(trash,files[0]),'utf8')).toBe('latest pending merge draft');
  await expect.poll(()=>page.evaluate(()=>(window as any).app.workspace.getLeavesOfType('fixture-text').length)).toBe(0);
  await expect(fs.stat(path.join(root,'Zeta.md'))).rejects.toThrow();
});
test('failed filesystem rename restores an overlay leaf and its saved draft',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  await app.evaluate(({ipcMain})=>{ipcMain.removeHandler('engine:rename');ipcMain.handle('engine:rename',()=>{throw new Error('fixture rename denied');});});
  const result=await page.evaluate(async()=>{
    const app=(window as any).app,leaf=app.workspace.getRightLeaf();await leaf.setViewState({type:'fixture-text',state:{file:'Test.txt'}});leaf.view.input.value='pending overlay draft';const id=leaf.id;
    let error='';try{await app.vault.rename(app.vault.getAbstractFileByPath('Test.txt'),'Renamed.txt');}catch(e){error=String(e);}
    return {error,same:app.workspace.getLeafById(id)===leaf,connected:leaf.containerEl.isConnected,inert:leaf.containerEl.inert,text:leaf.view?.getViewData()};
  });
  expect(result).toEqual({error:expect.stringContaining('fixture rename denied'),same:true,connected:true,inert:false,text:'pending overlay draft'});
  expect(await fs.readFile(path.join(root,'Test.txt'),'utf8')).toBe('pending overlay draft');await expect(fs.stat(path.join(root,'Renamed.txt'))).rejects.toThrow();
});
test('an earlier unload cannot discard a later draft changed after sealing',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  const result=await page.evaluate(async()=>{
    const app=(window as any).app;await app.vault.createFolder('Batch');const leaves=[];
    for(const name of ['First','Second']){const file=await app.vault.create('Batch/'+name+'.md','original '+name),leaf=app.workspace.getRightLeaf();await leaf.setViewState({type:'fixture-text',state:{file:file.path}});leaf.view.input.value='pending '+name;leaves.push(leaf);}
    const original=leaves[0].view.onUnloadFile.bind(leaves[0].view);leaves[0].view.onUnloadFile=async(file:any)=>{leaves[1].view.input.value='changed after seal';await original(file);};
    let error='';try{await app.vault.rename(app.vault.getAbstractFileByPath('Batch'),'MovedBatch');}catch(e){error=String(e);}
    return {error,leaves:leaves.map(leaf=>({registered:app.workspace.getLeafById(leaf.id)===leaf,connected:leaf.containerEl.isConnected,inert:leaf.containerEl.inert,text:leaf.view?.getViewData()}))};
  });
  expect(result.error).toContain('changed during file retirement');
  expect(result.leaves).toEqual(['pending First','changed after seal'].map(text=>({registered:true,connected:true,inert:false,text})));
  await expect(fs.stat(path.join(root,'MovedBatch'))).rejects.toThrow();expect((await fs.stat(path.join(root,'Batch'))).isDirectory()).toBe(true);
});
test('merge saves a dirty destination plugin view before appending source content',async()=>{
  await enable();await page.getByTestId('settings-close').click();await command('Open Markdown as text view');
  await page.evaluate(async()=>{const app=(window as any).app,leaf=app.workspace.getRightLeaf();await leaf.setViewState({type:'fixture-text',state:{file:'Test.md'}});leaf.view.input.value='latest destination draft';});
  await page.locator('.retained-plugin-view').getByRole('textbox',{name:'Fixture document',exact:true}).fill('latest source draft');
  await page.getByRole('button',{name:'Command palette',exact:true}).click();await page.getByTestId('palette-input').fill('Merge into');await page.keyboard.press('Enter');
  await expect(page.getByTestId('palette-input')).toHaveAttribute('aria-label','Merge into note');await page.getByTestId('palette-item-Test.md').click();await page.getByTestId('dialog-submit').click();
  await expect(page.getByTestId('file-Zeta.md')).toHaveCount(0);
  const destination=await fs.readFile(path.join(root,'Test.md'),'utf8');expect(destination).toContain('latest destination draft');expect(destination).toContain('latest source draft');
});
for(const fail of [true,false])test(`file-view retirement ${fail?'keeps all views after a later save fails':'does not repeat fallible saves after sealing'}`,async()=>{
  await enable();await page.getByTestId('settings-close').click();
  const result=await page.evaluate(async fail=>{
    const app=(window as any).app;await app.vault.createFolder('Batch');
    const leaves=[],calls=[0,0],originals=[];
    for(const [i,name]of ['First','Second'].entries()){
      const file=await app.vault.create('Batch/'+name+'.md','original '+name),leaf=app.workspace.getRightLeaf();
      await leaf.setViewState({type:'fixture-text',state:{file:file.path}});leaf.view.input.value='pending '+name;
      const save=leaf.view.save.bind(leaf.view);originals.push(save);leaf.view.save=async()=>{calls[i]++;if(fail&&i===1||calls[i]>1)throw new Error('fixture final save failed');await save();};leaves.push(leaf);
    }
    let error='';try{await app.vault.rename(app.vault.getAbstractFileByPath('Batch'),'MovedBatch');}catch(e){error=String(e);}
    const retained=leaves.map(leaf=>({connected:leaf.containerEl.isConnected,inert:leaf.containerEl.inert,type:leaf.view?.getViewType(),data:leaf.view?.getViewData()}));
    for(const [i,leaf]of leaves.entries())if(leaf.view)leaf.view.save=originals[i];
    return {error,calls,retained};
  },fail);
  expect(result.calls).toEqual([1,1]);
  if(fail){
    expect(result.error).toContain('fixture final save failed');
    expect(result.retained).toEqual(['First','Second'].map(name=>({connected:true,inert:false,type:'fixture-text',data:'pending '+name})));
    await expect(fs.stat(path.join(root,'MovedBatch'))).rejects.toThrow();expect((await fs.stat(path.join(root,'Batch'))).isDirectory()).toBe(true);
  }else{
    expect(result.error).toBe('');expect(result.retained.every(view=>!view.connected&&!view.type)).toBe(true);
    for(const name of ['First','Second'])expect(await fs.readFile(path.join(root,'MovedBatch',name+'.md'),'utf8')).toBe('pending '+name);
  }
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
test('renderer Node and UIEvent ownership helpers resolve actual documents and windows',async()=>{
  await enable();await page.getByTestId('settings-close').click();
  expect(await page.evaluate(async()=>{
    const text=document.createTextNode('ownership'),fragment=document.createDocumentFragment(),input=document.createElement('input');
    document.body.append(input);let realFocus=false;
    input.addEventListener('focus',event=>{realFocus=(event as any).doc===document&&(event as any).win===window;},{once:true});input.focus();
    const key=new KeyboardEvent('keydown',{bubbles:true});input.dispatchEvent(key);
    const iframe=document.createElement('iframe');document.body.append(iframe);const foreign=iframe.contentDocument!,realm=iframe.contentWindow!;
    const borrowedDoc=Object.getOwnPropertyDescriptor(Node.prototype,'doc')!.get!,borrowedWin=Object.getOwnPropertyDescriptor(Node.prototype,'win')!.get!;
    const foreignEvent=new FocusEvent('focus',{view:realm}),detached=document.implementation.createHTMLDocument('detached');
    const windowEvent=new UIEvent('resize'),documentEvent=new KeyboardEvent('keydown'),detachedEvent=new KeyboardEvent('keydown');
    realm.dispatchEvent(windowEvent);foreign.dispatchEvent(documentEvent);const detachedInput=detached.createElement('input');detachedInput.dispatchEvent(detachedEvent);
    const checks=[(document as any).doc===document,(document as any).win===window,(text as any).doc===document,(fragment as any).win===window,
      (key as any).doc===document,(key as any).win===window,(foreignEvent as any).doc===foreign,(foreignEvent as any).win===realm,
      borrowedDoc.call(foreign)===foreign,borrowedWin.call(foreign)===realm,borrowedDoc.call(detached)===detached,borrowedWin.call(detached)===window,
      (windowEvent as any).doc===foreign,(windowEvent as any).win===realm,(documentEvent as any).doc===foreign,(documentEvent as any).win===realm,
      (detachedEvent as any).doc===detached,(detachedEvent as any).win===window];
    const timer=await new Promise<boolean>(resolve=>(key as any).win.setTimeout(()=>resolve(true),0));
    input.remove();iframe.remove();return {checks,realFocus,timer,objectPollution:Object.hasOwn(Object.prototype,'win')};
  })).toEqual({checks:Array(18).fill(true),realFocus:true,timer:true,objectPollution:false});
});
test('focused embedded editors keep command context through the palette and retire on file switch',async()=>{
  await enable();await page.getByTestId('settings-close').click();const before=await fs.readFile(path.join(root,'Zeta.md'),'utf8');
  await command('Open embedded editor');const input=page.getByRole('textbox',{name:'Embedded Markdown editor',exact:true});await input.fill('owned draft');
  expect(await page.evaluate(()=>{
    const app=(window as any).app,source=(window as any).__fixtureEmbeddedEditor;
    const info={file:app.workspace.getActiveFile(),get editor(){return source.editor;}};
    (window as any).__fixtureFocusedInfo=info;app.workspace.activeEditor=info;return app.workspace.activeEditor===info;
  })).toBe(true);
  await page.evaluate(()=>(window as any).__fixtureEmbeddedEditor.cm.dispatch({selection:{anchor:6,head:11}}));
  await command('Replace focused selection');await expect(input).toHaveText('owned focused selection');
  await command('Edit focused buffer');await expect(input).toHaveText('focused command edit');
  expect(await fs.readFile(path.join(root,'Zeta.md'),'utf8')).toBe(before);
  await page.getByTestId('file-Test.txt').click();
  expect(await page.evaluate(()=>(window as any).app.workspace.activeEditor!==(window as any).__fixtureFocusedInfo)).toBe(true);
  await page.getByRole('button',{name:'Close Embedded fixture',exact:true}).click();
  expect(await page.evaluate(()=>{
    const app=(window as any).app,stale=(window as any).__fixtureFocusedInfo;app.workspace.activeEditor=stale;
    return app.workspace.activeEditor!==stale;
  })).toBe(true);
  expect(await page.evaluate(()=>{try{const app=(window as any).app;app.workspace.activeEditor={file:app.workspace.getActiveFile(),editor:{}};return false;}catch(error){return String(error).includes('must belong to this plugin runtime');}})).toBe(true);
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
