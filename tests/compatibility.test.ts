import {describe,it,expect,vi} from 'vitest';
import {createCompatibilityRuntime,Component,Events,Editor,TFile,TFolder,supportedExports,CompatibilityError,type PluginSnapshot} from '../src/compat-core';
import inventory from '../docs/compatibility/obsidian-exports.json';
import memberContracts from '../docs/compatibility/member-contracts.json';

const manifest={id:'fixture',name:'Fixture',version:'1.0.0'};
const initial=():PluginSnapshot=>({name:'Test vault',active:'Folder/One.md',
  entries:[{path:'Folder',name:'Folder',folder:true,size:0,ctime:1,mtime:2},{path:'Folder/One.md',name:'One.md',folder:false,size:5,ctime:1,mtime:2},{path:'Two.md',name:'Two.md',folder:false,size:3,ctime:1,mtime:2}],
  notes:[{path:'Folder/One.md',content:'hello'},{path:'Two.md',content:'two'}],editor:{text:'hello',from:1,to:3}});
function harness(){
  let snapshot=initial();const calls:{operation:string;args:unknown[]}[]=[],notices:string[]=[];
  let commands:{id:string;name:string}[]=[],data:unknown=null;
  const runtime:any=createCompatibilityRuntime(manifest,snapshot,{
    commands(next){commands=next;},notice(message){notices.push(message);},
    async request(operation,args){
      calls.push({operation,args});
      const path=args[0] as string;
      if(operation==='read'){const n=snapshot.notes.find(n=>n.path===path);if(!n)throw new Error('Missing');return n.content;}
      if(operation==='loadData')return data;
      if(operation==='saveData'){data=args[0];return;}
      if(operation==='open'){snapshot={...snapshot,active:path};runtime.sync(snapshot);return;}
      if(operation==='editor'){snapshot={...snapshot,editor:{text:args[2] as string,from:args[3] as number,to:args[4] as number}};runtime.sync(snapshot);return;}
      if(operation==='mkdir'){snapshot={...snapshot,entries:[...snapshot.entries,{path,name:path,folder:true,size:0,ctime:1,mtime:2}]};runtime.sync(snapshot);return;}
      if(['create','modify','append'].includes(operation)){
        const previous=snapshot.notes.find(n=>n.path===path);
        if(operation==='create'&&previous)throw new Error('Already exists');
        if(operation!=='create'&&!previous)throw new Error('Missing');
        const content=operation==='append'?previous!.content+args[1]:args[1] as string;
        snapshot={...snapshot,notes:[...snapshot.notes.filter(n=>n.path!==path),{path,content}],
          entries:previous?snapshot.entries:[...snapshot.entries,{path,name:path.split('/').pop()!,folder:false,size:content.length,ctime:1,mtime:2}]};
        runtime.sync(snapshot);return;
      }
      throw new Error('Unexpected host operation '+operation);
    }
  });
  return {runtime,api:runtime.api as any,calls,notices,get commands(){return commands;},get data(){return data;},sync(next:PluginSnapshot){snapshot=next;runtime.sync(next);}};
}
describe('public export inventory and explicit boundaries',()=>{
  it('pins unique documented symbols and references',()=>{
    expect(inventory.symbols).toHaveLength(271);
    expect(new Set(inventory.symbols.map(s=>s.name)).size).toBe(271);
    expect(inventory.symbols.filter(s=>s.runtime)).toHaveLength(154);
    for(const name of supportedExports)expect(inventory.symbols.some(s=>s.runtime&&s.name===name),name).toBe(true);
  });
  for(const symbol of inventory.symbols){
    it(`API export ${symbol.name}: ${symbol.runtime?'runtime surface':'type only, not a runtime export'}`,()=>{
      const h=harness();
      if((supportedExports as readonly string[]).includes(symbol.name))expect(h.api[symbol.name]).toBeDefined();
      else expect(()=>h.api[symbol.name]).toThrow(CompatibilityError);
    });
  }
  it('exports no undocumented or extra runtime names',()=>expect(harness().runtime.getExports().sort()).toEqual([...supportedExports].sort()));
  it('CommonJS interop metadata is not mistaken for a missing Obsidian API',()=>{const h=harness();expect(h.api.__esModule).toBe(false);expect(Object.keys(h.api)).not.toContain('__esModule');});
  it('does not impersonate a full Obsidian API version',()=>{const h=harness();expect(h.api.apiVersion).toBe('0.0.0');expect(h.api.requireApiVersion('1.0.0')).toBe(false);});
  for(const item of memberContracts.classes)it(`member inventory ${item.name} has bounded, nonoverlapping classifications`,()=>{
    const all=[...item.subset,...item.rejected];expect(new Set(all).size).toBe(all.length);
    expect(item.limits.length).toBeGreaterThan(10);expect(item.source).toMatch(/^https:\/\/docs\.obsidian\.md\//);
    expect(inventory.symbols.some(s=>s.name===item.name)).toBe(true);
  });
  for(const item of memberContracts.classes)for(const member of item.rejected)it(`documented rejection ${item.name}.${member}`,()=>{
    const h=harness();
    const object:any=item.name==='Vault'?h.runtime.app.vault:item.name==='Workspace'?h.runtime.app.workspace:
      item.name==='MetadataCache'?h.runtime.app.metadataCache:item.name==='Editor'?new Editor({text:'',from:0,to:0},()=>{}):
      item.name==='Notice'?new h.api.Notice('test'):item.name==='MarkdownView'?new h.api.MarkdownView():new h.api[item.name]();
    expect(()=>{const value=object[member];if(typeof value==='function')value.call(object);}).toThrow(CompatibilityError);
  });
});
describe('documented command callback rules',()=>{
  it('prefixes commands and prioritizes editorCheckCallback',async()=>{
    const h=harness(),seen:string[]=[];
    class P extends h.api.Plugin {onload(){this.addCommand({id:'go',name:'Go',callback:()=>seen.push('callback'),checkCallback:()=>seen.push('check'),editorCallback:()=>seen.push('editor'),editorCheckCallback:(checking:boolean)=>{seen.push(checking?'editor-check':'editor-run');return true;}});}}
    await h.runtime.boot(P);expect(h.commands).toEqual([{id:'go',name:'Fixture: Go'}]);await h.runtime.run('go');
    expect(seen).not.toContain('callback');expect(seen).not.toContain('check');expect(seen).not.toContain('editor');expect(seen).toContain('editor-run');
    await h.runtime.stop();expect(h.commands).toEqual([]);
  });
  it('editorCallback takes precedence and is hidden without an editor',async()=>{
    const h=harness(),seen:string[]=[];
    class P extends h.api.Plugin {onload(){this.addCommand({id:'e',name:'Edit',checkCallback:()=>{seen.push('check');return true;},editorCallback:()=>seen.push('edit')});}}
    await h.runtime.boot(P);await h.runtime.run('e');expect(seen).toEqual(['edit']);
    h.sync({...initial(),editor:null});expect(h.commands).toEqual([]);await expect(h.runtime.run('e')).rejects.toThrow('unavailable');
  });
  it('checkCallback must return true to expose a command',async()=>{
    const h=harness(),checks:boolean[]=[];
    class P extends h.api.Plugin {onload(){
      this.addCommand({id:'yes',name:'Yes',checkCallback:(checking:boolean)=>{checks.push(checking);return true;}});
      this.addCommand({id:'no',name:'No',checkCallback:()=>false});
      this.addCommand({id:'undefined',name:'No result',checkCallback:()=>undefined});
    }}
    await h.runtime.boot(P);expect(h.commands.map(c=>c.id)).toEqual(['yes']);await h.runtime.run('yes');expect(checks).toContain(false);
  });
  it('ordinary callback executes once and removeCommand unregisters',async()=>{
    const h=harness(),callback=vi.fn();let p:any;
    class P extends h.api.Plugin {onload(){p=this;this.addCommand({id:'c',name:'Callback',callback});}}
    await h.runtime.boot(P);await h.runtime.run('c');expect(callback).toHaveBeenCalledTimes(1);p.removeCommand('fixture:c');expect(h.commands).toEqual([]);
  });
  for(const option of ['hotkeys','icon','repeatable','mobileOnly'])it(`rejects command option ${option} instead of ignoring it`,async()=>{
    const h=harness();class P extends h.api.Plugin {onload(){this.addCommand({id:'x',name:'X',[option]:true});}}
    await expect(h.runtime.boot(P)).rejects.toThrow('Unsupported');
  });
  it('rejects asynchronous checking and non-Plugin default exports',async()=>{
    const h=harness();class P extends h.api.Plugin {onload(){this.addCommand({id:'x',name:'X',checkCallback:async()=>true});}}
    await expect(h.runtime.boot(P)).rejects.toThrow('async checking');await expect(h.runtime.boot(class{})).rejects.toThrow('extend Plugin');
  });
});
describe('lifecycle, data and event registration',()=>{
  it('loads once, cleans children and registered callbacks in reverse order',async()=>{
    const seen:string[]=[];class C extends Component {onload(){seen.push('load');}onunload(){seen.push('unload');}}
    const parent=new C(),child=new C();parent.addChild(child);parent.register(()=>seen.push('first'));parent.register(()=>seen.push('last'));
    await parent.load();await parent.load();await parent.unload();await parent.unload();expect(seen).toEqual(['load','load','unload','unload','last','first']);
  });
  it('event context, off, offref and cleanup are effective',async()=>{
    const events=new Events(),callback=vi.fn(function(this:any){return this.label;}),ctx={label:'ctx'};
    const ref=events.on('go',callback,ctx);events.trigger('go',1);expect(callback.mock.contexts[0]).toBe(ctx);
    events.offref(ref);events.trigger('go');expect(callback).toHaveBeenCalledTimes(1);
    const c=new Component();await c.load();c.registerEvent(events.on('go',callback));await c.unload();events.trigger('go');expect(callback).toHaveBeenCalledTimes(1);
    events.on('go',callback);events.off('go',callback);events.trigger('go');expect(callback).toHaveBeenCalledTimes(1);
  });
  it('tryTrigger catches an event error without throwing to its caller',()=>{const error=vi.spyOn(console,'error').mockImplementation(()=>{});const e=new Events();expect(()=>e.tryTrigger(e.on('x',()=>{throw new Error('event');}),[])).not.toThrow();expect(error).toHaveBeenCalledOnce();error.mockRestore();});
  it('registered intervals stop on unload',async()=>{vi.useFakeTimers();try{const c=new Component(),callback=vi.fn();await c.load();c.registerInterval(setInterval(callback,10));vi.advanceTimersByTime(20);await c.unload();vi.advanceTimersByTime(20);expect(callback).toHaveBeenCalledTimes(2);}finally{vi.useRealTimers();}});
  it('saves data on load and unload and awaits lifecycle promises',async()=>{
    const h=harness();class P extends h.api.Plugin {async onload(){expect(await this.loadData()).toBeNull();await this.saveData({enabled:true});}async onunload(){await this.saveData({enabled:false});}}
    await h.runtime.boot(P);expect(h.data).toEqual({enabled:true});await h.runtime.stop();expect(h.data).toEqual({enabled:false});
  });
  it('failed startup removes registered commands and cleanup runs',async()=>{
    const h=harness(),cleanup=vi.fn();class P extends h.api.Plugin {onload(){this.register(cleanup);this.addCommand({id:'x',name:'X',callback(){}});throw new Error('load failed');}}
    await expect(h.runtime.boot(P)).rejects.toThrow('load failed');await h.runtime.stop();expect(cleanup).toHaveBeenCalledTimes(1);expect(h.commands).toEqual([]);
  });
});
describe('vault, workspace and text operations',()=>{
  it('preserves file identities, root, folders, parents and stat fields',()=>{
    const h=harness(),v=h.runtime.app.vault,f=v.getFileByPath('Folder/One.md');expect(f).toBeInstanceOf(TFile);
    expect(f.basename).toBe('One');expect(f.extension).toBe('md');expect(f.stat.size).toBe(5);expect(f.parent).toBeInstanceOf(TFolder);
    expect(v.getRoot().isRoot()).toBe(true);expect(v.getAllFolders()).toHaveLength(1);expect(v.getAllFolders(true)).toHaveLength(2);
    expect(v.getFiles()).toHaveLength(2);expect(v.getMarkdownFiles()).toHaveLength(2);expect(v.getAllLoadedFiles()).toHaveLength(4);
    expect(v.getFolderByPath(f.path)).toBeNull();expect(v.getFileByPath('Folder')).toBeNull();
    h.sync(initial());expect(v.getFileByPath(f.path)).toBe(f);
  });
  it('reads cached snapshots and fresh host text, creates/copies/modifies/appends',async()=>{
    const h=harness(),v=h.runtime.app.vault,f=v.getFileByPath('Folder/One.md')!;
    expect(await v.cachedRead(f)).toBe('hello');expect(h.calls).toHaveLength(0);expect(await v.read(f)).toBe('hello');
    const made=await v.create('New.md','new');expect(made).toBeInstanceOf(TFile);await v.modify(made,'changed');await v.append(made,'!');
    expect(await v.read(made)).toBe('changed!');expect(await v.copy(made,'Copy.md')).toBeInstanceOf(TFile);await v.createFolder('Empty');
    expect(v.getFolderByPath('Empty')).toBeInstanceOf(TFolder);await expect(v.create('New.md','overwrite')).rejects.toThrow('exists');
  });
  it('emits modify only for changed existing notes and unregisters on stop',async()=>{
    const h=harness(),seen=vi.fn();class P extends h.api.Plugin {onload(){this.registerEvent(this.app.vault.on('modify',seen));}}
    await h.runtime.boot(P);h.sync({...initial(),notes:initial().notes.map(n=>({...n,content:n.content+'!'}))});expect(seen).toHaveBeenCalledTimes(2);
    await h.runtime.stop();h.sync(initial());expect(seen).toHaveBeenCalledTimes(2);
  });
  it('workspace file-open, MarkdownView and existing-file links use host navigation',async()=>{
    const h=harness(),w=h.runtime.app.workspace,callback=vi.fn(),ready=vi.fn();
    w.onLayoutReady(ready);expect(ready).toHaveBeenCalledOnce();expect(w.getActiveFile().path).toBe('Folder/One.md');
    expect(w.getActiveViewOfType(h.api.MarkdownView).getViewType()).toBe('markdown');expect(w.activeEditor.editor).toBeInstanceOf(Editor);
    w.on('file-open',callback);await w.openLinkText('Two','Folder/One.md');expect(callback.mock.calls[0][0].path).toBe('Two.md');
    expect(h.runtime.app.metadataCache.getFirstLinkpathDest('One','Two.md').path).toBe('Folder/One.md');
    await expect(w.openLinkText('Missing','Two.md')).rejects.toThrow('not found');
    await expect(w.openLinkText('Two','Two.md',true)).rejects.toThrow('Unsupported');
  });
  it('rejects foreign file objects and unsupported data-write options',async()=>{
    const h=harness(),v=h.runtime.app.vault;
    await expect(v.read(new TFile('Two.md',{}))).rejects.toThrow('belong');
    await expect(v.read(new TFile('Two.md',v))).rejects.toThrow('belong');
    await expect(v.create('X.md','x',{mtime:4})).rejects.toThrow('Unsupported');
  });
});
describe('editor snapshot contract',()=>{
  it('positions are zero-based UTF-16 offsets, reversed selections retain anchor/head',()=>{
    const sent=vi.fn(),e=new Editor({text:'😀 hi\n世界',from:5,to:2},sent);
    expect(e.lineCount()).toBe(2);expect(e.lastLine()).toBe(1);expect(e.getLine(1)).toBe('世界');
    expect(e.getSelection()).toBe(' hi');expect(e.getCursor('anchor')).toEqual({line:0,ch:5});expect(e.getCursor('head')).toEqual({line:0,ch:2});
    expect(e.offsetToPos(6)).toEqual({line:1,ch:0});expect(e.posToOffset({line:1,ch:1})).toBe(7);
    expect(e.getRange({line:1,ch:0},{line:1,ch:2})).toBe('世界');expect(e.somethingSelected()).toBe(true);expect(e.listSelections()).toHaveLength(1);
  });
  it('mutations carry expected-base text and preserve single selection',()=>{
    const sent=vi.fn(),e=new Editor({text:'hello\nworld',from:1,to:3},sent);
    e.replaceSelection('X');expect(e.getValue()).toBe('hXlo\nworld');expect(sent.mock.calls[0]).toEqual(['hello\nworld','hXlo\nworld',2,2]);
    e.setCursor(1,2);expect(e.getCursor()).toEqual({line:1,ch:2});e.setLine(1,'new');expect(e.getLine(1)).toBe('new');
    e.setValue('done');expect(e.getValue()).toBe('done');expect(e.getCursor()).toEqual({line:0,ch:0});
  });
  it('editorCallback mutation reaches the serialized host',async()=>{
    const h=harness();class P extends h.api.Plugin {onload(){this.addCommand({id:'edit',name:'Edit',editorCallback:(e:Editor)=>e.replaceSelection('X')});}}
    await h.runtime.boot(P);await h.runtime.run('edit');expect(h.calls).toContainEqual({operation:'editor',args:['Folder/One.md','hello','hXlo',2,2]});
  });
});
describe('unsupported methods fail, not no-op',()=>{
  const pluginMethods=['addRibbonIcon','addSettingTab','addStatusBarItem','registerView','registerExtensions','registerEditorExtension','registerEditorSuggest','registerMarkdownPostProcessor','registerMarkdownCodeBlockProcessor','registerObsidianProtocolHandler','registerHoverLinkSource','registerBasesView','registerCliHandler','registerDomEvent','onExternalSettingsChange'];
  for(const method of pluginMethods)it(`Plugin.${method} is explicitly rejected`,()=>{const h=harness();expect(()=>new h.api.Plugin()[method]()).toThrow(CompatibilityError);});
  for(const method of ['delete','process','readBinary','createBinary','modifyBinary','appendBinary','getResourcePath','rename','trash'])it(`Vault.${method} is explicitly rejected`,()=>{const h=harness();expect(()=>h.runtime.app.vault[method]()).toThrow(CompatibilityError);});
  for(const method of ['getDoc','setSelections','transaction','exec','focus','blur','hasFocus','getScrollInfo','scrollTo','scrollIntoView','undo','redo','refresh','wordAt','processLines'])it(`Editor.${method} is explicitly rejected`,()=>expect(()=>(new Editor({text:'',from:0,to:0},()=>{}) as any)[method]()).toThrow(CompatibilityError));
  for(const name of ['create','delete','rename'])it(`Vault event ${name} is explicitly rejected`,()=>expect(()=>harness().runtime.app.vault.on(name,()=>{})).toThrow(CompatibilityError));
  it('rejects undocumented app/workspace/cache access and unsupported events',()=>{
    const h=harness();
    for(const op of [()=>h.runtime.app.fileManager,()=>h.runtime.app.workspace.getLeaf,()=>h.runtime.app.vault.adapter,()=>h.runtime.app.metadataCache.getCache('Two.md'),()=>h.runtime.app.workspace.on('layout-change',()=>{}),()=>h.runtime.app.metadataCache.on('changed',()=>{})])expect(op).toThrow(CompatibilityError);
  });
});
describe('documented utility subsets',()=>{
  it('normalizes slash separators and parses link subpaths',()=>{const h=harness();expect(h.api.normalizePath('/Folder\\\\One.md/')).toBe('Folder/One.md');expect(h.api.parseLinktext('One#Heading')).toEqual({path:'One',subpath:'#Heading'});expect(h.api.getLinkpath('One#^block')).toBe('One');});
  it('YAML and frontmatter string/list helpers handle nulls and aliases',()=>{
    const a=harness().api;expect(a.parseYaml(a.stringifyYaml({a:1}))).toEqual({a:1});
    expect(a.parseFrontMatterAliases({alias:'A'})).toEqual(['A']);expect(a.parseFrontMatterTags({tags:['x','#y']})).toEqual(['#x','#y']);
    expect(a.parseFrontMatterEntry({},'missing')).toBeNull();expect(a.parseFrontMatterStringArray({a:[1,'x']},'a')).toEqual(['x']);
    expect(a.getAllTags({tags:[{tag:'#x'}],frontmatter:{tags:['x','y']}})).toEqual(['#x','#y']);
  });
  it('frontmatter offsets delimit contents excluding fences, including CRLF',()=>{
    const a=harness().api,text='---\r\na: 1\r\n---\r\nBody',r=a.getFrontMatterInfo(text);
    expect(text.slice(r.from,r.to)).toBe('a: 1');expect(text.slice(r.contentStart)).toBe('Body');expect(r.frontmatter).toBe('a: 1');
    expect(a.getFrontMatterInfo('Body').exists).toBe(false);
    const empty=a.getFrontMatterInfo('---\n---\nBody');expect(empty.exists).toBe(true);expect(empty.frontmatter).toBe('');expect(empty.contentStart).toBe(8);
  });
  it('reference iteration returns its early-stop boolean',()=>{
    const a=harness().api,seen:number[]=[];expect(a.iterateRefs([1,2,3],(n:number)=>{seen.push(n);return n===2;})).toBe(true);expect(seen).toEqual([1,2]);
    expect(a.iterateCacheRefs({links:[1],embeds:[2]},()=>false)).toBe(false);
  });
  it('debounce schedules the latest arguments, cancellation prevents callbacks',()=>{
    vi.useFakeTimers();try{const a=harness().api,callback=vi.fn(),d=a.debounce(callback,10,true);d(1);d(2);vi.advanceTimersByTime(10);expect(callback).toHaveBeenCalledWith(2);d(3);d.cancel();vi.advanceTimersByTime(10);expect(callback).toHaveBeenCalledTimes(1);}finally{vi.useRealTimers();}
  });
  it('text notices work while DOM, custom duration and hide are rejected',()=>{const h=harness(),notice=new h.api.Notice('one');notice.setMessage('two');expect(h.notices).toEqual(['one','two']);expect(()=>notice.hide()).toThrow(CompatibilityError);expect(()=>new h.api.Notice({})).toThrow(CompatibilityError);expect(()=>new h.api.Notice('long',100)).toThrow(CompatibilityError);});
});
