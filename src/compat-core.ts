/* Original compatibility implementation, derived from public behavior descriptions.
 * No Obsidian SDK, declaration files or application implementation is included. */
import {parse as parseYaml,stringify as stringifyYaml} from 'yaml';
import {frontmatter,resolveLink} from './knowledge';
import type {Entry,Note,PluginManifest} from './types';

export interface PluginSnapshot {
  name:string;entries:Entry[];notes:Note[];active:string;
  editor:{text:string;from:number;to:number}|null;
}
export interface CompatHost {
  request(operation:string,args:unknown[]):Promise<unknown>;
  commands(commands:{id:string;name:string}[]):void;
  notice(message:string):void;
  ui?:{
    exports:Record<string,unknown>;workspace:Record<string,unknown>;
    statusBar():HTMLElement;settingTab(tab:any):()=>void;
    editorExtension(extension:unknown):()=>void;updateOptions():void;
    registerView(type:string,factory:(leaf:any)=>any):()=>void;
  };
}
export class CompatibilityError extends Error {
  constructor(readonly capability:string){super('Unsupported Obsidian capability: '+capability+'. See docs/PLUGIN-COMPATIBILITY.md.');this.name='CompatibilityError';}
}
export const unsupported=(name:string):never=>{throw new CompatibilityError(name);};
function guard<T extends object>(object:T,label:string):T{return new Proxy(object,{get(target,key,receiver){
  if(key==='then')return undefined;
  if(typeof key==='symbol'||Reflect.has(target,key))return Reflect.get(target,key,receiver);
  return unsupported(label+'.'+key);
}});}
export const supportedExports=[
  'Plugin','Component','Events','Notice','TAbstractFile','TFile','TFolder','Vault','Workspace','Editor','MarkdownView',
  'normalizePath','parseYaml','stringifyYaml','parseLinktext','getLinkpath','getAllTags',
  'parseFrontMatterAliases','parseFrontMatterTags','parseFrontMatterEntry','parseFrontMatterStringArray',
  'getFrontMatterInfo','iterateRefs','iterateCacheRefs','debounce','apiVersion','requireApiVersion'
] as const;

export class Events {
  private listeners=new Map<string,Set<{emitter:Events;name:string;callback:(...args:any[])=>void;ctx?:unknown}>>();
  on(name:string,callback:(...args:any[])=>void,ctx?:unknown){
    const ref={emitter:this,name,callback,ctx};if(!this.listeners.has(name))this.listeners.set(name,new Set());
    this.listeners.get(name)!.add(ref);return ref;
  }
  off(name:string,callback:(...args:any[])=>void){for(const ref of this.listeners.get(name)||[])if(ref.callback===callback)this.offref(ref);}
  offref(ref:{emitter:Events;name:string;callback:(...args:any[])=>void;ctx?:unknown}){if(ref.emitter===this)this.listeners.get(ref.name)?.delete(ref);}
  trigger(name:string,...args:any[]){for(const ref of [...(this.listeners.get(name)||[])]){if(this.listeners.get(name)?.has(ref))ref.callback.apply(ref.ctx,args);}}
  tryTrigger(ref:{callback:(...args:any[])=>void;ctx?:unknown},args:any[]){try{ref.callback.apply(ref.ctx,args);}catch(error){console.error(error);}}
}
export class Component {
  private loaded=false;private cleanups:(()=>void)[]=[];private children:Component[]=[];
  async load(){if(this.loaded)return;this.loaded=true;try{await this.onload();for(const child of this.children)await child.load();}catch(e){await this.unload();throw e;}}
  async unload(){if(!this.loaded)return;this.loaded=false;let first:unknown;
    try{await this.onunload();}catch(e){first=e;}
    for(const child of [...this.children].reverse())try{await child.unload();}catch(e){first??=e;}
    for(const cleanup of this.cleanups.splice(0).reverse())try{cleanup();}catch(e){first??=e;}
    if(first)throw first;
  }
  onload():unknown{return undefined;} onunload():unknown{return undefined;}
  register(callback:()=>void){this.cleanups.push(callback);}
  registerEvent(ref:ReturnType<Events['on']>){this.register(()=>ref.emitter.offref(ref));}
  registerInterval(id:ReturnType<typeof setInterval>|number){this.register(()=>clearInterval(id));return id;}
  registerDomEvent(element?:EventTarget,type?:string,callback?:EventListener,options?:AddEventListenerOptions|boolean){
    if(typeof document==='undefined'||!element||!type||!callback)return unsupported('Component.registerDomEvent');
    element.addEventListener(type,callback,options);this.register(()=>element.removeEventListener(type,callback,options));
  }
  addChild<T extends Component>(child:T):T{this.children.push(child);if(this.loaded)void child.load();return child;}
  removeChild<T extends Component>(child:T):T{this.children=this.children.filter(c=>c!==child);void child.unload();return child;}
}
export class TAbstractFile {
  path='';name='';parent:TFolder|null=null;vault:any;
  constructor(path:string,vault:any){this.vault=vault;this.path=path;this.name=path.split('/').pop()||'';}
}
export class TFile extends TAbstractFile {
  stat={ctime:0,mtime:0,size:0};
  get extension(){const dot=this.name.lastIndexOf('.');return dot<0?'':this.name.slice(dot+1);}
  get basename(){const dot=this.name.lastIndexOf('.');return dot<0?this.name:this.name.slice(0,dot);}
}
export class TFolder extends TAbstractFile {children:TAbstractFile[]=[];isRoot(){return this.path==='';}}
export function normalizePath(path:string){return path.replace(/\\/g,'/').replace(/\/+/g,'/').replace(/^\/|\/$/g,'');}
export function parseLinktext(text:string){const i=text.indexOf('#');return {path:i<0?text:text.slice(0,i),subpath:i<0?'':text.slice(i)};}
const stringArray=(value:unknown)=>typeof value==='string'?[value]:Array.isArray(value)?value.filter((v):v is string=>typeof v==='string'):null;
export function debounce<T extends (...args:any[])=>unknown>(callback:T,timeout=0,resetTimer=false){
  let timer:ReturnType<typeof setTimeout>|undefined,args:Parameters<T>,ctx:unknown;
  const invoke=function(this:unknown,...next:Parameters<T>){args=next;ctx=this;if(timer&&!resetTimer)return;if(timer)clearTimeout(timer);timer=setTimeout(()=>{timer=undefined;callback.apply(ctx,args);},timeout);};
  invoke.cancel=()=>{if(timer)clearTimeout(timer);timer=undefined;};return invoke;
}

/** Snapshot-based synchronous editor projection. Host applies each mutation with a conflict check. */
export class Editor {
  private value:string;private from:number;private to:number;
  constructor(snapshot:{text:string;from:number;to:number},private send:(base:string,text:string,from:number,to:number)=>void){this.value=snapshot.text;this.from=snapshot.from;this.to=snapshot.to;}
  getValue(){return this.value;}getSelection(){return this.value.slice(Math.min(this.from,this.to),Math.max(this.from,this.to));}
  lineCount(){return this.value.split('\n').length;}lastLine(){return this.lineCount()-1;}
  getLine(line:number){return this.value.split('\n')[line]??'';}
  offsetToPos(offset:number){offset=Math.max(0,Math.min(this.value.length,offset));const before=this.value.slice(0,offset).split('\n');return {line:before.length-1,ch:before[before.length-1].length};}
  posToOffset(pos:{line:number;ch:number}){const lines=this.value.split('\n'),line=Math.max(0,Math.min(lines.length-1,pos.line));return lines.slice(0,line).reduce((n,s)=>n+s.length+1,0)+Math.max(0,Math.min(lines[line].length,pos.ch));}
  getCursor(side:'from'|'to'|'head'|'anchor'='head'){return this.offsetToPos(side==='anchor'?this.from:side==='from'?Math.min(this.from,this.to):side==='to'?Math.max(this.from,this.to):this.to);}
  getRange(from:{line:number;ch:number},to:{line:number;ch:number}){return this.value.slice(this.posToOffset(from),this.posToOffset(to));}
  listSelections(){return [{anchor:this.offsetToPos(this.from),head:this.offsetToPos(this.to)}];}
  somethingSelected(){return this.from!==this.to;}
  setSelection(anchor:{line:number;ch:number},head=anchor){const base=this.value;this.from=this.posToOffset(anchor);this.to=this.posToOffset(head);this.send(base,this.value,this.from,this.to);}
  setCursor(pos:{line:number;ch:number}|number,ch=0){this.setSelection(typeof pos==='number'?{line:pos,ch}:pos);}
  setValue(value:string){const base=this.value;this.value=value;this.from=this.to=0;this.send(base,value,0,0);}
  replaceRange(value:string,from:{line:number;ch:number},to=from){
    const start=this.posToOffset(from),end=this.posToOffset(to),base=this.value;
    this.value=base.slice(0,start)+value+base.slice(end);this.from=this.to=start+value.length;this.send(base,this.value,this.from,this.to);
  }
  replaceSelection(value:string){this.replaceRange(value,this.getCursor('from'),this.getCursor('to'));}
  setLine(line:number,value:string){this.replaceRange(value,{line,ch:0},{line,ch:this.getLine(line).length});}
  getDoc(){return unsupported('Editor.getDoc');}
  setSelections(){return unsupported('Editor.setSelections');}transaction(){return unsupported('Editor.transaction');}
  exec(){return unsupported('Editor.exec');}focus(){return unsupported('Editor.focus');}blur(){return unsupported('Editor.blur');}
  hasFocus(){return unsupported('Editor.hasFocus');}getScrollInfo(){return unsupported('Editor.getScrollInfo');}
  scrollTo(){return unsupported('Editor.scrollTo');}scrollIntoView(){return unsupported('Editor.scrollIntoView');}
  undo(){return unsupported('Editor.undo');}redo(){return unsupported('Editor.redo');}refresh(){return unsupported('Editor.refresh');}
  wordAt(){return unsupported('Editor.wordAt');}processLines(){return unsupported('Editor.processLines');}
}
export interface CompatCommand {
  id:string;name:string;callback?:()=>unknown;checkCallback?:(checking:boolean)=>unknown;
  editorCallback?:(editor:Editor,ctx:any)=>unknown;editorCheckCallback?:(checking:boolean,editor:Editor,ctx:any)=>unknown;
  hotkeys?:unknown;icon?:unknown;repeatable?:boolean;mobileOnly?:boolean;
}
export function createCompatibilityRuntime(manifest:PluginManifest,initial:PluginSnapshot,host:CompatHost){
  let snapshot=initial,plugin:InstanceType<typeof Plugin>|undefined,unloaded=false,editor:Editor|null=null;
  const pending=new Set<Promise<unknown>>(),commands=new Map<string,CompatCommand>(),objects=new Map<string,TAbstractFile>();
  let mutationQueue=Promise.resolve<unknown>(undefined);
  function request(operation:string,args:unknown[]=[]){
    if(unloaded)return Promise.reject(new Error('Plugin is unloaded'));
    const promise=host.request(operation,args);pending.add(promise);promise.then(()=>pending.delete(promise),()=>pending.delete(promise));return promise;
  }
  function mutate(operation:string,args:unknown[]){
    const result=mutationQueue.then(()=>request(operation,args));mutationQueue=result.catch(()=>undefined);pending.add(result);
    result.then(()=>pending.delete(result),()=>pending.delete(result));return result;
  }
  async function settle(){while(pending.size){const results=await Promise.allSettled([...pending]);const failed=results.find(r=>r.status==='rejected');if(failed?.status==='rejected')throw failed.reason;}}
  class Vault extends Events {
    configDir='.crafactory';
    get adapter(){return unsupported('Vault.adapter');}
    on(name:string,callback:(...args:any[])=>void,ctx?:unknown){if(name!=='modify')return unsupported('Vault event '+name);return super.on(name,callback,ctx);}
    getName(){return snapshot.name;}getRoot(){return objects.get('') as TFolder;}
    getFiles(){return [...objects.values()].filter((f):f is TFile=>f instanceof TFile);}
    getMarkdownFiles(){return this.getFiles().filter(f=>f.extension.toLowerCase()==='md');}
    getAllFolders(includeRoot=false){return [...objects.values()].filter((f):f is TFolder=>f instanceof TFolder&&(includeRoot||!f.isRoot()));}
    getAllLoadedFiles(){return [...objects.values()];}
    getAbstractFileByPath(path:string){return objects.get(path)||null;}
    getFileByPath(path:string){const f=objects.get(path);return f instanceof TFile?f:null;}
    getFolderByPath(path:string){const f=objects.get(path);return f instanceof TFolder?f:null;}
    async read(file:TFile){checkFile(file);return request('read',[file.path]) as Promise<string>;}
    async cachedRead(file:TFile){checkFile(file);const note=snapshot.notes.find(n=>n.path===file.path);return note?note.content:this.read(file);}
    async create(path:string,data:string,options?:unknown){checkOptions(options,'Vault.create options');await mutate('create',[path,data]);return this.getFileByPath(path)!;}
    async modify(file:TFile,data:string,options?:unknown){checkFile(file);checkOptions(options,'Vault.modify options');await mutate('modify',[file.path,data]);}
    async append(file:TFile,data:string,options?:unknown){checkFile(file);checkOptions(options,'Vault.append options');await mutate('append',[file.path,data]);}
    async createFolder(path:string){await mutate('mkdir',[path]);return this.getFolderByPath(path)!;}
    rename(){return unsupported('Vault.rename');}
    async copy(file:TFile,path:string){checkFile(file);return this.create(path,await this.read(file));}
    trash(){return unsupported('Vault.trash');}
    delete(){return unsupported('Vault.delete');}process(){return unsupported('Vault.process atomic callback');}
    readBinary(){return unsupported('Vault.readBinary');}createBinary(){return unsupported('Vault.createBinary');}
    modifyBinary(){return unsupported('Vault.modifyBinary');}appendBinary(){return unsupported('Vault.appendBinary');}
    getResourcePath(){return unsupported('Vault.getResourcePath');}
    static recurseChildren(root:TFolder,callback:(file:TAbstractFile)=>void){for(const child of root.children){callback(child);if(child instanceof TFolder)Vault.recurseChildren(child,callback);}}
  }
  function checkOptions(options:unknown,name:string){if(options!==undefined)return unsupported(name);}
  function checkAbstract(file:TAbstractFile){if(!(file instanceof TAbstractFile)||file.vault!==vault||objects.get(file.path)!==file)throw new Error('File does not belong to this vault');}
  function checkFile(file:TFile){checkAbstract(file);if(!(file instanceof TFile))throw new Error('Expected TFile');}
  const vault=guard(new Vault(),'Vault');
  class MarkdownView {file:TFile|null;editor:Editor|null;constructor(){this.file=vault.getFileByPath(snapshot.active);this.editor=editor;return guard(this,'MarkdownView');}getViewType(){return 'markdown';}getViewData(){return snapshot.notes.find(n=>n.path===snapshot.active)?.content||'';}}
  class Workspace extends Events {
    layoutReady=true;
    on(name:string,callback:(...args:any[])=>void,ctx?:unknown){if(name!=='file-open'&&(!host.ui||!['layout-change','editor-change'].includes(name)))return unsupported('Workspace event '+name);return super.on(name,callback,ctx);}
    getActiveFile(){return vault.getFileByPath(snapshot.active);}
    getActiveViewOfType(type:unknown){return type===MarkdownView&&(editor||host.ui&&snapshot.active.endsWith('.md'))?new MarkdownView():null;}
    get activeEditor(){return editor?{file:this.getActiveFile(),editor}:null;}
    onLayoutReady(callback:()=>void){callback();}
    async openLinkText(linktext:string,sourcePath:string,newLeaf?:unknown,openState?:unknown){
      if(newLeaf||openState)return unsupported('Workspace.openLinkText new leaf/state');
      const dest=resolveLink(parseLinktext(linktext).path,sourcePath,snapshot.notes);if(!dest)throw new Error('Link target not found');
      await request('open',[dest.path]);
    }
  }
  const workspace=guard(new Workspace(),'Workspace'),metadataCache=guard(new Events(),'MetadataCache') as Events&Record<string,any>;
  if(host.ui)Object.assign(workspace,host.ui.workspace,{updateOptions:()=>host.ui!.updateOptions()});
  metadataCache.on=(name:string)=>unsupported('MetadataCache event '+name);
  metadataCache.getFileCache=()=>unsupported('MetadataCache.getFileCache exact positions');
  metadataCache.getCache=()=>unsupported('MetadataCache.getCache exact positions');
  metadataCache.getFirstLinkpathDest=(link:string,path:string)=>{const note=resolveLink(link,path,snapshot.notes);return note?vault.getFileByPath(note.path):null;};
  const app=guard({vault,workspace,metadataCache},'App');
  function refresh(next:PluginSnapshot,events=false){
    const previous=snapshot;snapshot=next;
    const paths=new Set(['',...snapshot.entries.map(e=>e.path)]);
    for(const path of [...objects.keys()])if(!paths.has(path))objects.delete(path);
    if(!objects.has(''))objects.set('',new TFolder('',vault));
    for(const entry of snapshot.entries){
      let file=objects.get(entry.path);
      if(!file||(entry.folder?!(file instanceof TFolder):!(file instanceof TFile))){file=entry.folder?new TFolder(entry.path,vault):new TFile(entry.path,vault);objects.set(entry.path,file);}
      file.name=entry.name;file.path=entry.path;
      if(file instanceof TFile)file.stat={ctime:entry.ctime,mtime:entry.mtime,size:entry.size};
    }
    for(const f of objects.values())if(f instanceof TFolder)f.children=[];
    for(const f of objects.values())if(f.path){f.parent=objects.get(f.path.split('/').slice(0,-1).join('/')) as TFolder||null;f.parent?.children.push(f);}
    if(events){
      initEditor();
      if(previous.active!==snapshot.active)workspace.trigger('file-open',workspace.getActiveFile());
      if(host.ui&&(previous.active!==snapshot.active||!!previous.editor!==!!snapshot.editor))workspace.trigger('layout-change');
      for(const note of snapshot.notes){const before=previous.notes.find(n=>n.path===note.path);if(before&&before.content!==note.content){
        vault.trigger('modify',vault.getFileByPath(note.path));
        if(host.ui&&note.path===snapshot.active)workspace.trigger('editor-change',editor,new MarkdownView());
      }}
    }
  }
  refresh(initial);
  function initEditor(){
    const path=snapshot.active;
    editor=snapshot.editor?new Editor(snapshot.editor,(base,text,from,to)=>{void mutate('editor',[path,base,text,from,to]);}):null;
  }
  initEditor();
  function available(command:CompatCommand,checking:boolean){
    let result:unknown;
    if(command.editorCheckCallback){if(!editor)return false;result=command.editorCheckCallback(checking,editor,new MarkdownView());}
    else if(command.editorCallback){if(!editor)return false;if(!checking)result=command.editorCallback(editor,new MarkdownView());else return true;}
    else if(command.checkCallback)result=command.checkCallback(checking);
    else {if(!checking)return command.callback?.();return true;}
    if(checking&&result&&typeof (result as any).then==='function')return unsupported('Command async checking callback');
    return checking?result===true:result;
  }
  function publish(){initEditor();host.commands([...commands.values()].filter(c=>available(c,true)).map(c=>({id:c.id,name:manifest.name+': '+c.name})));}
  class Notice {constructor(message:string|DocumentFragment,timeout?:number){if(typeof message!=='string')unsupported('Notice DocumentFragment');if(timeout!==undefined)unsupported('Notice custom duration');host.notice(String(message));}setMessage(message:string){host.notice(message);return this;}hide(){return unsupported('Notice.hide');}get noticeEl(){return unsupported('Notice.noticeEl');}}
  class Plugin extends Component {
    app=app;manifest=manifest;
    constructor(_app=app,_manifest=manifest){super();this.app=_app;this.manifest=_manifest;}
    addCommand(command:CompatCommand){
      if(typeof command.id!=='string'||typeof command.name!=='string'||!command.id)throw new Error('Invalid plugin command');
      if(command.hotkeys||command.icon||command.repeatable||command.mobileOnly)return unsupported('Command hotkeys/icon/repeatable/mobileOnly');
      commands.set(command.id,command);publish();this.register(()=>{commands.delete(command.id);});return {...command,id:manifest.id+':'+command.id,name:manifest.name+': '+command.name};
    }
    removeCommand(id:string){commands.delete(id.startsWith(manifest.id+':')?id.slice(manifest.id.length+1):id);publish();}
    loadData(){return request('loadData');}saveData(data:unknown){return mutate('saveData',[data]);}
    onExternalSettingsChange(){return unsupported('Plugin.onExternalSettingsChange');}
    onUserEnable():unknown{return undefined;}
    addRibbonIcon(){return unsupported('Plugin.addRibbonIcon');}
    addSettingTab(tab:unknown){if(!host.ui)return unsupported('Plugin.addSettingTab');this.register(host.ui.settingTab(tab));}
    addStatusBarItem(){if(!host.ui)return unsupported('Plugin.addStatusBarItem');const element=host.ui.statusBar();this.register(()=>element.remove());return element;}
    registerView(type:string,factory:(leaf:any)=>any){if(!host.ui)return unsupported('Plugin.registerView');this.register(host.ui.registerView(type,factory));}
    registerExtensions(){return unsupported('Plugin.registerExtensions');}
    registerEditorExtension(extension:unknown){if(!host.ui)return unsupported('Plugin.registerEditorExtension');this.register(host.ui.editorExtension(extension));}
    registerEditorSuggest(){return unsupported('Plugin.registerEditorSuggest');}
    registerMarkdownPostProcessor(){return unsupported('Plugin.registerMarkdownPostProcessor');}
    registerMarkdownCodeBlockProcessor(){return unsupported('Plugin.registerMarkdownCodeBlockProcessor');}
    registerObsidianProtocolHandler(){return unsupported('Plugin.registerObsidianProtocolHandler');}
    registerHoverLinkSource(){return unsupported('Plugin.registerHoverLinkSource');}registerBasesView(){return unsupported('Plugin.registerBasesView');}
    registerCliHandler(){return unsupported('Plugin.registerCliHandler');}
  }
  const exports:Record<string,unknown>={Plugin,Component,Events,Notice,TAbstractFile,TFile,TFolder,Vault,Workspace,Editor,MarkdownView,
    normalizePath,parseYaml,stringifyYaml,parseLinktext,getLinkpath:(text:string)=>parseLinktext(text).path,
    getAllTags:(cache:any)=>[...new Set([...(cache?.tags||[]).map((t:any)=>t.tag),...(stringArray(cache?.frontmatter?.tags)||[]).map(t=>t.startsWith('#')?t:'#'+t)])],
    parseFrontMatterAliases:(fm:any)=>stringArray(fm?.aliases??fm?.alias),
    parseFrontMatterTags:(fm:any)=>stringArray(fm?.tags??fm?.tag)?.map(t=>t.startsWith('#')?t:'#'+t)||null,
    parseFrontMatterEntry:(fm:any,key:string)=>fm?.[key]??null,
    parseFrontMatterStringArray:(fm:any,key:string)=>stringArray(fm?.[key]),
    getFrontMatterInfo:(text:string)=>{
      const match=text.match(/^---\r?\n(?:([\s\S]*?)\r?\n)?---(?:\r?\n|$)/);
      if(!match)return {exists:false,frontmatter:'',from:0,to:0,contentStart:0};
      const body=match[1]||'',from=text.indexOf('\n')+1,to=from+body.length;
      return {exists:true,frontmatter:body,from,to,contentStart:match[0].length};
    },
    iterateRefs:(refs:any[],callback:(r:any)=>boolean|void)=>{for(const r of refs)if(callback(r)===true)return true;return false;},
    iterateCacheRefs:(cache:any,callback:(r:any)=>boolean|void)=>{for(const r of [...(cache.links||[]),...(cache.embeds||[])])if(callback(r)===true)return true;return false;},
    debounce,apiVersion:'0.0.0',requireApiVersion:(version:string)=>version==='0.0.0'};
  Object.assign(exports,host.ui?.exports);
  const api=new Proxy(exports,{get(target,key){if(typeof key==='symbol')return Reflect.get(target,key);if(key==='__esModule')return false;if(Object.hasOwn(target,key))return target[key];return unsupported('export '+key);}});
  return {
    app,api,settle,
    sync(next:PluginSnapshot){refresh(next,true);publish();},
    async boot(constructor:any){if(typeof constructor!=='function'||!(constructor.prototype instanceof Plugin))throw new Error('CommonJS default export must extend Plugin');plugin=new constructor(app,manifest);await plugin!.load();await plugin!.onUserEnable();await settle();publish();if(host.ui)workspace.trigger('layout-change');},
    async run(id:string){if(unloaded)throw new Error('Plugin is unloaded');initEditor();const command=commands.get(id);if(!command)throw new Error('Command not found');if(!available(command,true))throw new Error('Command unavailable');await available(command,false);await settle();},
    async stop(){if(unloaded)return;try{await plugin?.unload();await settle();}finally{commands.clear();host.commands([]);unloaded=true;}},
    getExports(){return Object.keys(exports);}
  };
}
