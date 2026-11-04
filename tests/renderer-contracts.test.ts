import {it,expect,vi} from 'vitest';
import {Editor,EditorSuggest,createCompatibilityRuntime,supportedExports,type CompatNativeServices,type PluginSnapshot} from '../src/compat-core';
import {rendererExports} from '../src/compat-dom';
import inventory from '../docs/compatibility/obsidian-exports.json';
const manifest={id:'renderer-test',name:'Renderer test',version:'1'};
const initial=():PluginSnapshot=>({name:'Test',active:'One.md',entries:[{path:'One.md',name:'One.md',folder:false,size:3,ctime:0,mtime:0}],notes:[{path:'One.md',content:'one'}],editor:null});
function harness(native?:CompatNativeServices){
  const settingCleanup=vi.fn(),extensionCleanup=vi.fn(),viewCleanup=vi.fn(),extensionsCleanup=vi.fn(),suggestCleanup=vi.fn(),protocolCleanup=vi.fn(),hoverCleanup=vi.fn(),basesCleanup=vi.fn(),updateOptions=vi.fn(),ribbonCleanup=vi.fn(),ribbonElement={remove:ribbonCleanup} as unknown as HTMLElement;
  const iterateAllLeaves=vi.fn(),ui={exports:{EditorSuggest},workspace:{activeLeaf:{view:null as any},getLeaf:()=>({fixture:true}),iterateAllLeaves},statusBar:vi.fn(),ribbonIcon:vi.fn(()=>ribbonElement),settingTab:vi.fn(()=>settingCleanup),editorExtension:vi.fn(()=>extensionCleanup),registerView:vi.fn(()=>viewCleanup),registerExtensions:vi.fn(()=>extensionsCleanup),editorSuggest:vi.fn(()=>suggestCleanup),protocolHandler:vi.fn(()=>protocolCleanup),hoverLinkSource:vi.fn(()=>hoverCleanup),basesView:vi.fn(()=>basesCleanup),updateOptions};
  const request=vi.fn(async(_operation:string,_args:unknown[])=>null);
  const runtime=createCompatibilityRuntime(manifest,initial(),{ui,request,commands:()=>{},notice:()=>{},native});
  return {runtime,api:runtime.api as any,ui,iterateAllLeaves,request,settingCleanup,extensionCleanup,viewCleanup,extensionsCleanup,suggestCleanup,protocolCleanup,hoverCleanup,basesCleanup,updateOptions,ribbonCleanup,ribbonElement};
}
it('keeps the owned enabled-plugin Set stable across load and unload',async()=>{
  const h=harness(),manager=h.runtime.app.plugins,enabled=manager.enabledPlugins;
  expect(enabled).toBeInstanceOf(Set);expect(enabled.size).toBe(0);
  class P extends h.api.Plugin{
    onload(){expect(enabled.has(manifest.id)).toBe(true);expect(manager.getPlugin(manifest.id)).toBe(this);}
    onunload(){expect(enabled.has(manifest.id)).toBe(true);}
  }
  await h.runtime.boot(P);expect(manager.enabledPlugins).toBe(enabled);expect([...enabled]).toEqual([manifest.id]);
  expect(enabled.has('obsidian-tasks-plugin')).toBe(false);expect(manager.getPlugin('obsidian-tasks-plugin')).toBeNull();
  await h.runtime.stop();expect(enabled.size).toBe(0);expect(manager.plugins).not.toHaveProperty(manifest.id);
});
it.each(['constructor','onload','onUserEnable'] as const)('removes failed %s admission from enabled plugins',async phase=>{
  const h=harness(),manager=h.runtime.app.plugins;
  class P extends h.api.Plugin{
    constructor(...args:any[]){super(...args);if(phase==='constructor')throw new Error('admission failed');}
    onload(){if(phase==='onload')throw new Error('admission failed');}
    onUserEnable(){if(phase==='onUserEnable')throw new Error('admission failed');}
  }
  await expect(h.runtime.boot(P)).rejects.toThrow('admission failed');
  expect(manager.enabledPlugins.size).toBe(0);expect(manager.plugins).not.toHaveProperty(manifest.id);expect(manager.getPlugin(manifest.id)).toBeNull();
  await h.runtime.stop();
});
it('revokes enabled-plugin admission even when plugin shutdown fails',async()=>{
  const h=harness(),enabled=h.runtime.app.plugins.enabledPlugins;
  class P extends h.api.Plugin{onunload(){throw new Error('shutdown failed');}}
  await h.runtime.boot(P);await expect(h.runtime.stop()).rejects.toThrow('shutdown failed');expect(enabled.size).toBe(0);
});
it('refuses reads and further writes after an asynchronous editor send rejects',async()=>{
  let reject!:(error:Error)=>void;const result=new Promise<void>((_resolve,no)=>{reject=no;}),send=vi.fn(()=>result),editor=new Editor({text:'one',from:0,to:1},send);
  editor.setValue('rejected');reject(new Error('host rejected'));await result.catch(()=>{});
  for(const action of [()=>editor.getValue(),()=>editor.getSelection(),()=>editor.listSelections(),()=>editor.getLine(0),()=>editor.setValue('again'),()=>editor.setCursor(0)])expect(action).toThrow('stale');
  expect(send).toHaveBeenCalledOnce();
});
it('reports an editor rejection through settle even after its promise has already settled',async()=>{
  const h=harness();h.runtime.sync({...initial(),editor:{text:'one',from:0,to:0}});h.request.mockImplementation(async operation=>{if(operation==='editor')throw new Error('CONFLICT fixture');return null;});
  class P extends h.api.Plugin{onload(){this.addCommand({id:'async-rejection',name:'Async rejection',editorCallback:async(editor:Editor)=>{editor.setValue('rejected');await vi.waitFor(()=>expect(()=>editor.getValue()).toThrow('stale'));}});}}
  await h.runtime.boot(P);await expect(h.runtime.run('async-rejection')).rejects.toThrow('CONFLICT fixture');await h.runtime.stop();
});
it('renderer export registry is documented, unique and disjoint from Worker exports',()=>{
  expect(new Set(rendererExports).size).toBe(rendererExports.length);expect(rendererExports).toContain('TextFileView');
  for(const name of rendererExports){expect(inventory.symbols.some(s=>s.name===name&&s.runtime)).toBe(true);expect(supportedExports).not.toContain(name);}
});
it('renderer custom style events dispatch through Events and are revocable',async()=>{
  const h=harness(),calls:string[]=[];
  for(const name of ['css-change','parse-style-settings','settings-search-loaded']){
    const ref=h.runtime.app.workspace.on(name,()=>calls.push(name));
    h.runtime.triggerWorkspaceEvent(name,[]);h.runtime.app.workspace.offref(ref);h.runtime.triggerWorkspaceEvent(name,[]);
  }
  expect(calls).toEqual(['css-change','parse-style-settings','settings-search-loaded']);
});
it('renderer MarkdownView exposes actual active document in reading mode',()=>{
  const h=harness(),view=h.runtime.app.workspace.getActiveViewOfType(h.api.MarkdownView);
  expect(view).not.toBeNull();expect(view!.getViewData()).toBe('one');expect(view!.editor.getValue()).toBe('one');expect(view!.file!.path).toBe('One.md');
  expect(()=>view!.editor.setValue('no')).toThrow('Markdown preview editing');
  const editor=view!.editor;
  for(const change of [()=>editor.setValue('rejected'),()=>editor.replaceRange('bad',{line:0,ch:1}),()=>editor.setSelection({line:0,ch:1},{line:0,ch:2})]){
    expect(change).toThrow('Markdown preview editing');expect(editor.getValue()).toBe('one');
    expect(editor.listSelections()).toEqual([{anchor:{line:0,ch:0},head:{line:0,ch:0}}]);
  }
  h.ui.workspace.activeLeaf.view={getViewType:()=> 'drawing'};
  expect(h.runtime.app.workspace.getActiveViewOfType(h.api.MarkdownView)).toBeNull();
});
it('renderer editor-change listeners observe refreshed editor and clean up on unload',async()=>{
  const h=harness(),calls:string[]=[],snap=initial();
  class Fixture extends h.api.Plugin {onload(){this.registerEvent(this.app.workspace.on('editor-change',(editor:any,view:any)=>calls.push(editor.getValue()+':'+view.getViewData())));}}
  await h.runtime.boot(Fixture);h.runtime.sync({...snap,notes:[{path:'One.md',content:'two'}],editor:{text:'two',from:0,to:0}});
  expect(calls).toEqual(['two:two']);await h.runtime.stop();h.runtime.sync({...snap,notes:[{path:'One.md',content:'three'}],editor:{text:'three',from:0,to:0}});expect(calls).toEqual(['two:two']);
});
it('renderer layout-change fires on boot and reading-editor transitions only',async()=>{
  const h=harness(),listener=vi.fn(),snap=initial();
  class Fixture extends h.api.Plugin {onload(){this.registerEvent(this.app.workspace.on('layout-change',listener));}}
  await h.runtime.boot(Fixture);expect(listener).toHaveBeenCalledTimes(1);
  h.runtime.sync({...snap,editor:{text:'one',from:0,to:0}});expect(listener).toHaveBeenCalledTimes(2);
  h.runtime.sync({...snap,editor:{text:'one',from:1,to:1}});expect(listener).toHaveBeenCalledTimes(2);
  h.runtime.sync(snap);expect(listener).toHaveBeenCalledTimes(3);await h.runtime.stop();h.runtime.sync({...snap,editor:{text:'one',from:0,to:0}});expect(listener).toHaveBeenCalledTimes(3);
});
it('renderer hook registrations dispose once and updateOptions reaches actual host',async()=>{
  const h=harness(),tab={},extension:unknown[]=[];
  class FixtureSuggest extends h.api.EditorSuggest {onTrigger(){return {start:0,end:1};}getSuggestions(){return ['one'];}}
  class Fixture extends h.api.Plugin {onload(){this.addSettingTab(tab);this.addRibbonIcon('star','Star',()=>{});this.registerEditorExtension(extension);this.registerView('test',()=>{});this.registerExtensions(['foo'],'test');this.registerEditorSuggest(new FixtureSuggest());this.registerObsidianProtocolHandler('fixture',()=>{});this.registerHoverLinkSource('fixture',{display:'Fixture',defaultMod:true});this.registerBasesView('fixture-bases',()=>({render(){}}));this.app.workspace.updateOptions();}}
  await h.runtime.boot(Fixture);expect(h.ui.settingTab).toHaveBeenCalledWith(tab);expect(h.ui.ribbonIcon).toHaveBeenCalledWith('star','Star',expect.any(Function));expect(h.ui.editorExtension).toHaveBeenCalledWith(extension);expect(h.ui.registerExtensions).toHaveBeenCalledWith(['foo'],'test');expect(h.ui.editorSuggest).toHaveBeenCalledWith(expect.any(h.api.EditorSuggest));expect(h.ui.protocolHandler).toHaveBeenCalledWith('fixture',expect.any(Function));expect(h.ui.hoverLinkSource).toHaveBeenCalledWith('fixture',{display:'Fixture',defaultMod:true});expect(h.ui.basesView).toHaveBeenCalledWith('fixture-bases',expect.any(Function));expect(h.updateOptions).toHaveBeenCalledOnce();
  await h.runtime.stop();await h.runtime.stop();expect(h.settingCleanup).toHaveBeenCalledOnce();expect(h.extensionCleanup).toHaveBeenCalledOnce();expect(h.viewCleanup).toHaveBeenCalledOnce();expect(h.ribbonCleanup).toHaveBeenCalledOnce();expect(h.extensionsCleanup).toHaveBeenCalledOnce();expect(h.suggestCleanup).toHaveBeenCalledOnce();expect(h.protocolCleanup).toHaveBeenCalledOnce();expect(h.hoverCleanup).toHaveBeenCalledOnce();expect(h.basesCleanup).toHaveBeenCalledOnce();
});
it('exposes bounded App bootstrap fields and forwards workspace leaf iteration',()=>{
  const h=harness();
  expect(h.runtime.app.appId).toBe('crafactory-engine');
  expect(h.runtime.app.isMobile).toBe(false);
  expect(h.runtime.app.internalPlugins.plugins['daily-notes'].instance.options).toEqual({folder:'Daily notes',format:'YYYY-MM-DD',template:''});
  expect(h.runtime.app.internalPlugins.getPluginById('daily-notes')).toBe(h.runtime.app.internalPlugins.plugins['daily-notes']);
  expect(h.runtime.app.plugins.getPlugin('periodic-notes')).toBeNull();
  expect(h.runtime.app.vault.getConfig('dailyNotes')).toEqual({folder:'Daily notes',format:'YYYY-MM-DD',template:''});
  expect(h.runtime.app.foldManager.load({} as any)).toEqual({folds:[]});
  h.runtime.app.workspace.iterateAllLeaves(()=>{});
  expect(h.iterateAllLeaves).toHaveBeenCalledOnce();
});
it('Editor.getDoc exposes a bounded CodeMirror 5 document adapter',async()=>{
  const h=harness();
  h.runtime.sync({...initial(),editor:{text:'one\ntwo',from:0,to:0}});
  const editor=h.runtime.app.workspace.activeEditor!.editor;
  const doc=editor.getDoc();
  expect(doc).toBe(editor.getDoc());
  expect(doc.getValue()).toBe('one\ntwo');expect(doc.lineCount()).toBe(2);expect(doc.lastLine()).toBe(1);
  expect(doc.getCursor()).toEqual({line:0,ch:0});expect(doc.getRange({line:0,ch:0},{line:0,ch:3})).toBe('one');
  doc.replaceRange('X',{line:0,ch:0});
  expect(doc.getValue()).toBe('Xone\ntwo');
  await h.runtime.app.workspace.getActiveViewOfType(h.api.MarkdownView)!.save();
  expect(h.request).toHaveBeenCalledWith('save',['One.md']);
  const operations=h.request.mock.calls.map(call=>call[0]);
  expect(operations.indexOf('editor')).toBeGreaterThanOrEqual(0);
  expect(operations.indexOf('editor')).toBeLessThan(operations.indexOf('save'));
});
it('reads daily-note settings at call time',()=>{
  let daily={folder:'A',format:'YYYY-MM-DD',template:''};
  const h=harness({get dailyNotes(){return daily;}} as unknown as CompatNativeServices);
  expect(h.runtime.app.vault.getConfig('dailyNotes')).toEqual(daily);
  daily={folder:'B',format:'YYYY-MM-DD',template:''};
  expect((h.runtime.app.vault.getConfig('dailyNotes') as {folder:string}).folder).toBe('B');
  expect(h.runtime.app.internalPlugins.getPluginById('daily-notes')!.instance!.options.folder).toBe('B');
  expect(h.runtime.app.internalPlugins.getPluginById('canvas')).toMatchObject({enabled:false,_loaded:false,instance:null});
  expect(()=>h.runtime.app.internalPlugins.plugins.canvas.load()).toThrow('Obsidian core Canvas plugin');
});
it('private command manager lists and executes only live commands owned by its plugin',async()=>{
  const h=harness(),run=vi.fn();
  class P extends h.api.Plugin {onload(){this.addCommand({id:'owned',name:'Owned command',callback:run});}}
  await h.runtime.boot(P);const manager=h.runtime.app.commands!;
  expect(manager.listCommands()).toEqual([expect.objectContaining({id:manifest.id+':owned',name:manifest.name+': Owned command'})]);
  expect(manager.findCommand(manifest.id+':owned')).not.toBeNull();
  expect(manager.executeCommandById(manifest.id+':owned')).toBe(true);expect(run).toHaveBeenCalledOnce();
  expect(manager.executeCommandById('other-plugin:owned')).toBe(false);
  expect(manager.executeCommandById('editor:toggle-source')).toBe(false);
  await h.runtime.stop();expect(manager.executeCommandById(manifest.id+':owned')).toBe(false);
});
it('metadata cache admits real local custom event delivery without promising a cross-plugin bus',()=>{
  const h=harness(),receive=vi.fn(),cache=h.runtime.app.metadataCache;
  const ref=cache.on('fixture:metadata-change',receive);cache.trigger('fixture:metadata-change','updated');expect(receive).toHaveBeenCalledWith('updated');
  cache.offref(ref);cache.trigger('fixture:metadata-change','late');expect(receive).toHaveBeenCalledOnce();
  expect(()=>cache.on('unknown-standard-event',receive)).toThrow('MetadataCache event');
});
it('observed private component loaded alias follows actual startup and unload',async()=>{
  const h=harness(),component=new h.api.Component(),start=vi.fn(),cleanup=vi.fn();component.onload=start;component.register(cleanup);expect(component._loaded).toBe(false);
  component._loaded=false;
  expect(()=>component._loaded=true).toThrow('Component._loaded assignment');expect(component._loaded).toBe(false);
  await component.load();expect(component._loaded).toBe(true);expect(start).toHaveBeenCalledOnce();
  component._loaded=true;expect(start).toHaveBeenCalledOnce();
  expect(()=>component._loaded=false).toThrow('Component._loaded assignment');expect(component._loaded).toBe(true);
  await component.unload();expect(component._loaded).toBe(false);expect(cleanup).toHaveBeenCalledOnce();
});
it('MarkdownView.save retains its requested path while an earlier mutation and navigation complete',async()=>{
  const h=harness(),snap=initial();snap.entries.push({path:'Two.md',name:'Two.md',folder:false,size:3,ctime:0,mtime:0});snap.notes.push({path:'Two.md',content:'two'});h.runtime.sync(snap);
  let release!:()=>void;
  h.request.mockImplementation(async(operation)=>{if(operation==='modify')await new Promise<void>(resolve=>release=resolve);return null;});
  const mutation=h.runtime.app.vault.modify(h.runtime.app.vault.getFileByPath('One.md')!,'changed');
  await vi.waitFor(()=>expect(release).toBeTypeOf('function'));
  const save=new h.api.MarkdownView().save();
  h.runtime.sync({...snap,active:'Two.md'});release();await mutation;await save;
  expect(h.request).toHaveBeenCalledWith('save',['One.md']);expect(h.request).not.toHaveBeenCalledWith('save',['Two.md']);
  await h.runtime.stop();
});
it('releases window.app to the previous runtime and clears it',async()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
  Object.defineProperty(globalThis,'window',{configurable:true,value:{}});
  try{
    const first=harness(),second=harness();
    expect((window as any).app).toBe(second.runtime.app);
    await second.runtime.stop();
    expect((window as any).app).toBe(first.runtime.app);
    await first.runtime.stop();
    expect((window as any).app).toBeUndefined();
  }finally{
    if(descriptor)Object.defineProperty(globalThis,'window',descriptor);
    else delete (globalThis as any).window;
  }
});
it('App local storage round-trips JSON and rejects non-string keys',()=>{
  const h=harness(),key='renderer-contracts-'+Math.random().toString(36).slice(2);
  expect(h.runtime.app.loadLocalStorage(key)).toBeNull();
  h.runtime.app.saveLocalStorage(key,{text:'value'});
  expect(h.runtime.app.loadLocalStorage(key)).toEqual({text:'value'});
  expect(()=>h.runtime.app.loadLocalStorage(1 as any)).toThrow('must be a string');
});
it('App local storage keeps a failed browser write visible in memory',()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=> 'old',setItem(){throw new Error('quota');},removeItem(){}}});
  try{
    const h=harness();h.runtime.app.saveLocalStorage('quota-key','new');
    expect(h.runtime.app.loadLocalStorage('quota-key')).toBe('new');
  }finally{
    if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);
    else delete (globalThis as any).localStorage;
  }
});
it('fires bounded Vault create/delete and MetadataCache resolve events',async()=>{
  const h=harness(),base=initial(),created=vi.fn(),deleted=vi.fn(),resolved=vi.fn();
  const second={...base,entries:[...base.entries,{path:'Two.md',name:'Two.md',folder:false,size:3,ctime:0,mtime:0}],notes:[...base.notes,{path:'Two.md',content:'two'}]};
  class Fixture extends h.api.Plugin {onload(){this.registerEvent(this.app.vault.on('create',created));this.registerEvent(this.app.vault.on('delete',deleted));this.registerEvent(this.app.metadataCache.on('resolve',resolved));}}
  await h.runtime.boot(Fixture);
  h.runtime.sync(second);expect(created).toHaveBeenCalledOnce();expect(created.mock.calls[0][0].path).toBe('Two.md');
  await vi.waitFor(()=>expect(resolved.mock.calls.some(call=>call[0].path==='Two.md')).toBe(true));
  h.runtime.sync(base);expect(deleted).toHaveBeenCalledOnce();expect(deleted.mock.calls[0][0].path).toBe('Two.md');
  await h.runtime.stop();
});
it('never delivers a null metadata file when content arrives before the directory listing',async()=>{
  const h=harness(),base=initial(),changed=vi.fn(),created=vi.fn();
  class Fixture extends h.api.Plugin {onload(){this.registerEvent(this.app.metadataCache.on('changed',changed));this.registerEvent(this.app.vault.on('create',created));}}
  await h.runtime.boot(Fixture);
  const early={...base,notes:[...base.notes,{path:'Folder/New.md',content:'new'}]};
  h.runtime.sync(early);
  const file=h.runtime.app.vault.getFileByPath('Folder/New.md');
  expect(file).toBeInstanceOf(h.api.TFile);expect(file?.parent?.path).toBe('Folder');
  expect(changed.mock.calls.find(call=>call[0]?.path==='Folder/New.md')?.[0]).toBe(file);
  expect(changed.mock.calls.every(call=>call[0]!==null)).toBe(true);
  h.runtime.sync({...early,entries:[...base.entries,{path:'Folder/New.md',name:'New.md',folder:false,size:3,ctime:0,mtime:0}]});
  expect(h.runtime.app.vault.getFileByPath('Folder/New.md')).toBe(file);
  expect(created.mock.calls.filter(call=>call[0].path==='Folder/New.md')).toHaveLength(1);
  await h.runtime.stop();
});
it('returns real file/folder objects from successful creation before a snapshot update',async()=>{
  const h=harness();class Fixture extends h.api.Plugin {}
  await h.runtime.boot(Fixture);
  const folder=await h.runtime.app.vault.createFolder('Created');
  const file=await h.runtime.app.vault.create('Created/Note.md','new');
  expect(folder).toBeInstanceOf(h.api.TFolder);expect(file).toBeInstanceOf(h.api.TFile);
  expect(file.parent).toBe(folder);expect(folder.children).toContain(file);
  expect(h.runtime.app.vault.getAbstractFileByPathInsensitive('created/NOTE.MD')).toBe(file);
  await h.runtime.stop();
});
it('serves bounded resolved and unresolved link maps',()=>{
  const h=harness({
    resolveLink:(link:string)=>link==='Two'?'Two.md':undefined,
    metadata:(path:string)=>({links:path==='One.md'?[{link:'Two'},{link:'Missing'}]:[]})
  } as unknown as CompatNativeServices);
  expect(h.runtime.app.metadataCache.resolvedLinks['One.md']).toEqual({'Two.md':1});
  expect(h.runtime.app.metadataCache.unresolvedLinks['One.md']).toEqual({'Missing':1});
});
it('serves bounded CachedMetadata through getFileCache and getCache',()=>{
  const h=harness({metadata:path=>({frontmatter:{path},headings:[{heading:'One',level:1,position:{start:{line:0,col:0,offset:0},end:{line:0,col:3,offset:3}}}]})});
  const file=h.runtime.app.vault.getFileByPath('One.md')!;
  expect(h.runtime.app.metadataCache.getFileCache(file).frontmatter).toEqual({path:'One.md'});
  expect(h.runtime.app.metadataCache.getCache('One.md').headings[0].heading).toBe('One');
  expect(()=>h.runtime.app.metadataCache.getFileCache({path:'One.md'} as any)).toThrow('File does not belong to this vault');
  expect(h.runtime.app.metadataCache.getCache('Missing.md')).toBeNull();
});
it('renderer keeps unsupported events and unrelated runtime exports explicit',()=>{
  const h=harness();const changed=vi.fn();h.runtime.app.workspace.on('active-leaf-change',changed);h.runtime.triggerWorkspaceEvent('active-leaf-change',[null]);expect(changed).toHaveBeenCalledWith(null);expect(()=>h.runtime.app.workspace.on('unknown-event',()=>{})).toThrow('Workspace event unknown-event');expect(()=>h.api.MarkdownPreviewView).toThrow('export MarkdownPreviewView');
});
