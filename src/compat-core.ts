/* Original compatibility implementation, derived from public behavior descriptions.
 * No Obsidian SDK, declaration files or application implementation is included. */
import moment from 'moment';
import {parse as parseYaml,stringify as stringifyYaml} from 'yaml';
import {frontmatter,resolveLink} from './knowledge';
import type {Entry,Note,PluginManifest} from './types';
import type {CachedMetadata} from './metadata';
import {Scope} from './compat-keymap';

const exposedApps:any[]=[];
/** Expose the latest trusted renderer App globally, matching Obsidian's untyped window.app. */
function exposeApp(app:any){
  if(typeof window==='undefined')return;
  exposedApps.push(app);(window as any).app=app;
}
/** Release the global only when this runtime still owns it. */
function releaseApp(app:any){
  const index=exposedApps.indexOf(app);if(index>=0)exposedApps.splice(index,1);
  if(typeof window==='undefined')return;
  if((window as any).app===app){
    const next=exposedApps[exposedApps.length-1];
    if(next)(window as any).app=next;
    else delete (window as any).app;
  }
}
export interface PluginSnapshot {
  name:string;entries:Entry[];notes:Note[];active:string;
  editor:{text:string;from:number;to:number}|null;
}
export interface CompatNativeServices {
  /** Resolve a link target through the native notes index. */
  resolveLink?(link: string, from: string): string | undefined;
  /** Editor provider capability; extensions reject when CodeMirror is not active. */
  editor?: {providerId: string; codeMirrorExtensions: boolean};
  /** Bounded CachedMetadata-shaped lookup for the active note set. */
  metadata?(path: string): CachedMetadata | undefined;
  /** Desktop base path for the bounded FileSystemAdapter. */
  basePath?: string;
  /** Bounded daily-note settings exposed through the synthetic Daily Notes internal plugin. */
  dailyNotes?: {folder:string;format:string;template:string};
}
export interface CompatActiveEditor {file:TFile|null;editor:Editor}
export interface CompatHost {
  request(operation:string,args:unknown[]):Promise<unknown>;
  commands(commands:{id:string;name:string}[]):void;
  notice(message:string):void;
  trace?:(member:string)=>void;
  native?:CompatNativeServices;
  ui?:{
    scope?:unknown;
    keymap?:unknown;
    getActiveEditor?():CompatActiveEditor|null;
    setActiveEditor?(info:CompatActiveEditor|null):void;
    embedRegistry?:unknown;
    reportError?:(error:unknown)=>void;
    exports:Record<string,unknown>;workspace:Record<string,unknown>;
    statusBar():HTMLElement;settingTab(tab:any):()=>void;
    editorExtension(extension:unknown):()=>void;updateOptions():void;
    ribbonIcon?(icon:string,title:string,callback:(event:MouseEvent)=>void):HTMLElement;
    registerView(type:string,factory:(leaf:any)=>any):()=>void;
    registerExtensions?(extensions:string[],viewType:string):()=>void;
    editorSuggest?(suggest:unknown):()=>void;
    protocolHandler?(action:string,handler:(params:Record<string,string>)=>unknown):()=>void;
    hoverLinkSource?(id:string,source:{display:string;defaultMod:boolean}):()=>void;
    basesView?(id:string,factory:(controller:unknown)=>unknown):()=>void;
    postProcessor?(callback:any,sortOrder?:number):{processor:any;dispose:()=>Promise<void>};
    codeProcessor?(language:string,callback:any,sortOrder?:number):{processor:any;dispose:()=>Promise<void>};
  };
}
export class FileSystemAdapter {
  constructor(private readonly root='',private readonly binary?:{read:(path:string)=>Promise<ArrayBuffer>;write:(path:string,data:ArrayBuffer|ArrayBufferView)=>Promise<unknown>}){}
  getBasePath(){if(!this.root)return unsupported('FileSystemAdapter.getBasePath');return this.root;}
  getName(){if(!this.root)return unsupported('FileSystemAdapter.getName');return this.root.split(/[\\/]/).filter(Boolean).pop()||'';}
  async readBinary(path:string){if(!this.binary)return unsupported('FileSystemAdapter.readBinary');return this.binary.read(path);}
  async writeBinary(path:string,data:ArrayBuffer|ArrayBufferView){if(!this.binary)return unsupported('FileSystemAdapter.writeBinary');await this.binary.write(path,data);}
}
export class CompatibilityError extends Error {
  constructor(readonly capability:string){super('Unsupported Obsidian capability: '+capability+'. See docs/PLUGIN-COMPATIBILITY.md.');this.name='CompatibilityError';}
}
export const unsupported=(name:string):never=>{throw new CompatibilityError(name);};
/** Refuse unknown members explicitly while preserving ordinary Promise detection. */
export function guardCompatibilityObject<T extends object>(object:T,label:string,trace?:(member:string)=>void):T{return new Proxy(object,{get(target,key,receiver){
  if(key==='then')return undefined;
  if(typeof key==='string')trace?.(label+'.'+key);
  if(typeof key==='symbol'||Reflect.has(target,key))return Reflect.get(target,key,receiver);
  return unsupported(label+'.'+key);
}});}
const guard=guardCompatibilityObject;
export const supportedExports=[
  'Plugin','Component','Events','Notice','TAbstractFile','TFile','TFolder','Vault','Workspace','Editor','MarkdownView','FileSystemAdapter',
  'normalizePath','parseYaml','stringifyYaml','parseLinktext','getLinkpath','getAllTags',
  'parseFrontMatterAliases','parseFrontMatterTags','parseFrontMatterEntry','parseFrontMatterStringArray',
  'getFrontMatterInfo','iterateRefs','iterateCacheRefs','debounce','apiVersion','requireApiVersion','moment','getLanguage'
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
/** Create a lifecycle barrier before invoking any user-defined hook. */
function lifecyclePromise(){
  let resolve!:()=>void,reject!:(error:unknown)=>void;
  const promise=new Promise<void>((ok,bad)=>{resolve=ok;reject=bad;});
  return {promise,resolve,reject};
}
interface LifecycleState {startup?:Promise<void>;shutdown?:Promise<void>}
const componentLifecycles=new WeakMap<Component,LifecycleState>();
/** Await actual host-owned lifecycle work without making public idempotent calls self-dependent. */
export function componentLifecycle(component:Component,phase:'startup'|'shutdown'):Promise<void>{
  return componentLifecycles.get(component)?.[phase]??Promise.resolve();
}
// Avoid colliding with plugin-owned tree data; symbols also work through guarded receivers.
const componentChildren=Symbol('component children');
export class Component {
  private loaded=false;private disposed=false;private generation=0;private admission=0;private lifecycle:LifecycleState={};private cleanups:(()=>unknown)[]=[];private [componentChildren]:Component[]=[];private childStarts=new Map<Component,Promise<void>>();
  /** Observed private alias backed by actual lifecycle state, not a simulated loaded flag. */
  get _loaded(){return this.loaded&&!this.disposed;}
  set _loaded(value:boolean){if(value!==this._loaded)unsupported('Component._loaded assignment');}
  /** Initialize private host tracking, not an additional Obsidian compatibility export. */
  constructor(){componentLifecycles.set(this,this.lifecycle);}
  /** Serialize reload behind complete old startup and shutdown, including registered cleanup. */
  async load(){
    if(this.loaded)return;
    const admission=this.admission;
    while(this.lifecycle.startup||this.lifecycle.shutdown){
      const pending=this.lifecycle.startup??this.lifecycle.shutdown!;
      await pending;
      if(this.lifecycle.startup===pending)this.lifecycle.startup=undefined;
      if(this.lifecycle.shutdown===pending)this.lifecycle.shutdown=undefined;
    }
    if(admission!==this.admission)return;
    if(this.loaded)return;
    this.loaded=true;this.disposed=false;const generation=++this.generation;
    const {promise:startup,resolve,reject}=lifecyclePromise();
    this.lifecycle.startup=startup;
    void (async()=>{
      try{await this.onload();if(!this.loaded||generation!==this.generation)return;for(const child of this[componentChildren]){if(!this.loaded||generation!==this.generation)break;const started=this.childStarts.get(child);try{await (started??Promise.all([child.load(),componentLifecycle(child,'startup')]));}finally{if(this.childStarts.get(child)===started)this.childStarts.delete(child);}}}
      catch(e){if(generation===this.generation){try{await this.unload();}catch{/* preserve the startup error */}}throw e;}
    })().then(resolve,reject);
    try{await startup;}finally{if(this.lifecycle.startup===startup)this.lifecycle.startup=undefined;}
  }
  /** Revoke all registered resources immediately; await all work without blocking revocation on hooks. */
  async unload(){
    ++this.admission;
    if(!this.loaded)return;
    this.loaded=false;
    this.disposed=true;++this.generation;
    const children=[...this[componentChildren]].reverse(),cleanups=this.cleanups.splice(0).reverse();
    this.childStarts.clear();
    const {promise:shutdown,resolve,reject}=lifecyclePromise();
    this.lifecycle.shutdown=shutdown;
    const jobs:Promise<unknown>[]=[];
    /** Invoke each callback in contract order, isolating failures without delaying other revocations. */
    const schedule=(callback:()=>unknown)=>{try{jobs.push(Promise.resolve(callback()));}catch(error){jobs.push(Promise.reject(error));}};
    schedule(()=>this.onunload());
    for(const child of children)schedule(()=>Promise.all([child.unload(),componentLifecycle(child,'shutdown')]));
    for(const cleanup of cleanups)schedule(cleanup);
    void Promise.allSettled(jobs).then(results=>{
      const failure=results.find(result=>result.status==='rejected');
      if(failure?.status==='rejected')reject(failure.reason);else resolve();
    });
    try{await shutdown;}finally{if(this.lifecycle.shutdown===shutdown)this.lifecycle.shutdown=undefined;}
  }
  /** Override to initialize this component; asynchronous hooks are cooperatively awaited. */
  onload():unknown{return undefined;}
  /** Override to release plugin-specific state; arbitrary hanging hooks cannot be interrupted. */
  onunload():unknown{return undefined;}
  /** Immediately clean late registrations after disposal instead of retaining leaked resources. */
  register(callback:()=>unknown){if(this.disposed){try{void Promise.resolve(callback()).catch(error=>console.error(error));}catch(error){console.error(error);}}else this.cleanups.push(callback);}
  /** Own an emitter reference and revoke it with this component, including late registration. */
  registerEvent(ref:ReturnType<Events['on']>){this.register(()=>ref.emitter.offref(ref));}
  /** Own an existing interval identifier and clear it on disposal without scheduling a new interval. */
  registerInterval(id:ReturnType<typeof setInterval>|number){this.register(()=>clearInterval(id));return id;}
  /** Attach a native event with matching removal options; disposed owners remove it immediately. */
  registerDomEvent(element?:EventTarget,type?:string,callback?:EventListener,options?:AddEventListenerOptions|boolean){
    if(typeof document==='undefined'||!element||!type||!callback)return unsupported('Component.registerDomEvent');
    element.addEventListener(type,callback,options);this.register(()=>element.removeEventListener(type,callback,options));
  }
  /** Adopt a child only while this component remains active or has not yet loaded. */
  addChild<T extends Component>(child:T):T{if(this.disposed)return child;this[componentChildren].push(child);if(this.loaded){const started=Promise.all([child.load(),componentLifecycle(child,'startup')]).then(()=>{});if(this.lifecycle.startup)this.childStarts.set(child,started);void started.catch(error=>console.error(error));}return child;}
  /** Remove an attached child and observe asynchronous cleanup errors rather than leaking rejections. */
  removeChild<T extends Component>(child:T):T{if(!this[componentChildren].includes(child))return child;this[componentChildren]=this[componentChildren].filter(c=>c!==child);this.childStarts.delete(child);void child.unload().catch(error=>console.error(error));return child;}
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
export interface CodeMirrorDocument {
  getValue():string;setValue(value:string):void;
  getLine(line:number):string;lineCount():number;lastLine():number;
  getRange(from:EditorPosition,to:EditorPosition):string;
  replaceRange(value:string,from:EditorPosition,to?:EditorPosition):void;
  replaceSelection(value:string):void;getSelection():string;somethingSelected():boolean;
  getCursor(side?:'from'|'to'|'head'|'anchor'):EditorPosition;
  setCursor(pos:EditorPosition|number,ch?:number):void;
  listSelections():{anchor:EditorPosition;head:EditorPosition}[];
  setSelection(anchor:EditorPosition,head?:EditorPosition):void;
  posFromIndex(index:number):EditorPosition;indexFromPos(pos:EditorPosition):number;
}
export class Editor {
  private value:string;private from:number;private to:number;private doc:CodeMirrorDocument|null=null;private stale=false;
  constructor(snapshot:{text:string;from:number;to:number},private send:(base:string,text:string,from:number,to:number)=>void|Promise<unknown>){this.value=snapshot.text;this.from=snapshot.from;this.to=snapshot.to;}
  private fresh(){if(this.stale)throw new Error('Editor is stale after a rejected host edit; acquire a fresh editor');}
  getValue(){this.fresh();return this.value;}getSelection(){this.fresh();return this.value.slice(Math.min(this.from,this.to),Math.max(this.from,this.to));}
  lineCount(){this.fresh();return this.value.split('\n').length;}lastLine(){return this.lineCount()-1;}
  getLine(line:number){this.fresh();return this.value.split('\n')[line]??'';}
  offsetToPos(offset:number){this.fresh();offset=Math.max(0,Math.min(this.value.length,offset));const before=this.value.slice(0,offset).split('\n');return {line:before.length-1,ch:before[before.length-1].length};}
  posToOffset(pos:{line:number;ch:number}){this.fresh();const lines=this.value.split('\n'),line=Math.max(0,Math.min(lines.length-1,pos.line));return lines.slice(0,line).reduce((n,s)=>n+s.length+1,0)+Math.max(0,Math.min(lines[line].length,pos.ch));}
  getCursor(side:'from'|'to'|'head'|'anchor'='head'){return this.offsetToPos(side==='anchor'?this.from:side==='from'?Math.min(this.from,this.to):side==='to'?Math.max(this.from,this.to):this.to);}
  getRange(from:{line:number;ch:number},to:{line:number;ch:number}){return this.value.slice(this.posToOffset(from),this.posToOffset(to));}
  listSelections(){return [{anchor:this.offsetToPos(this.from),head:this.offsetToPos(this.to)}];}
  somethingSelected(){this.fresh();return this.from!==this.to;}
  private apply(value:string,from:number,to:number){this.fresh();const previous={value:this.value,from:this.from,to:this.to};this.value=value;this.from=from;this.to=to;try{const result=this.send(previous.value,value,from,to);if(result)void Promise.resolve(result).catch(()=>{this.stale=true;});}catch(error){this.value=previous.value;this.from=previous.from;this.to=previous.to;throw error;}}
  setSelection(anchor:{line:number;ch:number},head=anchor){this.apply(this.value,this.posToOffset(anchor),this.posToOffset(head));}
  setCursor(pos:{line:number;ch:number}|number,ch=0){this.setSelection(typeof pos==='number'?{line:pos,ch}:pos);}
  setValue(value:string){this.apply(value,0,0);}
  replaceRange(value:string,from:{line:number;ch:number},to=from){
    const start=this.posToOffset(from),end=this.posToOffset(to),base=this.value;
    this.apply(base.slice(0,start)+value+base.slice(end),start+value.length,start+value.length);
  }
  replaceSelection(value:string){this.replaceRange(value,this.getCursor('from'),this.getCursor('to'));}
  setLine(line:number,value:string){this.replaceRange(value,{line,ch:0},{line,ch:this.getLine(line).length});}
  /** Bounded CodeMirror 5 document view used by legacy editor integrations. */
  getDoc():CodeMirrorDocument{
    return this.doc??={
      getValue:()=>this.getValue(),setValue:value=>this.setValue(value),
      getLine:line=>this.getLine(line),lineCount:()=>this.lineCount(),lastLine:()=>this.lastLine(),
      getRange:(from,to)=>this.getRange(from,to),replaceRange:(value,from,to)=>this.replaceRange(value,from,to),
      replaceSelection:value=>this.replaceSelection(value),getSelection:()=>this.getSelection(),
      somethingSelected:()=>this.somethingSelected(),getCursor:side=>this.getCursor(side),
      setCursor:(pos,ch)=>this.setCursor(pos,ch),listSelections:()=>this.listSelections(),
      setSelection:(anchor,head)=>this.setSelection(anchor,head),
      posFromIndex:index=>this.offsetToPos(index),indexFromPos:pos=>this.posToOffset(pos)
    };
  }
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
/** Construct an original snapshot-based plugin runtime with explicit host operations and optional trusted UI. */
export interface EditorPosition {line:number;ch:number}
export interface EditorSuggestTriggerInfo {start:EditorPosition;end:EditorPosition;query?:string}
export interface EditorSuggestContext {editor:Editor;file:TFile|null;query:string;start:EditorPosition;end:EditorPosition}
/** Bounded EditorSuggest base: trigger, suggestions and selection are bridged by the renderer host. */
export class EditorSuggest<T=unknown> {
  scope:Scope;
  constructor(public app?:any){this.scope=new Scope(app?.scope);}
  context:EditorSuggestContext|null=null;
  limit=50;
  onTrigger(_cursor:EditorPosition,_editor:Editor,_file:TFile|null):EditorSuggestTriggerInfo|null{return null;}
  getSuggestions(_context:EditorSuggestContext):T[]|Promise<T[]>{return [];}
  getSuggestionDisplayText(value:T):string{const label=(value as {label?:unknown})?.label;return typeof value==='string'?value:typeof label==='string'?label:String(value);}
  renderSuggestion(_value:T,_el:HTMLElement):void{}
  selectSuggestion(_value:T,_evt:MouseEvent|KeyboardEvent):void{}
  close():void{}
  setInstructions(_instructions:unknown[]):void{}
}
/** Bind one plugin's public SDK facade to owned snapshots, mutations and lifecycle resources. */
export function createCompatibilityRuntime(manifest:PluginManifest,initial:PluginSnapshot,host:CompatHost){
  const guard=<T extends object>(object:T,label:string)=>guardCompatibilityObject(object,label,host.trace);
  let snapshot=initial,plugin:InstanceType<typeof Plugin>|undefined,unloaded=false,editor:Editor|null=null;
  const pending=new Set<Promise<unknown>>(),commands=new Map<string,CompatCommand>(),objects=new Map<string,TAbstractFile>();
  const pendingCreatedPaths=new Set<string>();
  const editorWrites=new Set<Promise<unknown>>();
  let mutationQueue=Promise.resolve<unknown>(undefined);
  function request(operation:string,args:unknown[]=[]){
    if(unloaded)return Promise.reject(new Error('Plugin is unloaded'));
    const promise=host.request(operation,args);pending.add(promise);promise.then(()=>pending.delete(promise),()=>pending.delete(promise));return promise;
  }
  function mutate(operation:string,args:unknown[]){
    const result=mutationQueue.then(()=>request(operation,args));mutationQueue=result.catch(()=>undefined);pending.add(result);
    result.then(()=>pending.delete(result),()=>pending.delete(result));return result;
  }
  /** Observe queued host writes, retaining failed optimistic edits until their error is consumed. */
  async function settle(){while(pending.size||editorWrites.size){const writes=[...editorWrites],results=await Promise.allSettled([...new Set([...pending,...writes])]);for(const write of writes)editorWrites.delete(write);const failed=results.find(r=>r.status==='rejected');if(failed?.status==='rejected')throw failed.reason;}}
  const adapter=new FileSystemAdapter(host.native?.basePath,{read:path=>request('readBinary',[path]) as Promise<ArrayBuffer>,write:(path,data)=>mutate('writeBinary',[path,data])});
  /** Intern file/folder identities and attach them once to the cached parent graph. */
  function ensureAbstract(path:string,folder:boolean):TAbstractFile{
    const current=objects.get(path);if(current)return current;
    const file=folder?new TFolder(path,vault):new TFile(path,vault);objects.set(path,file);
    if(path){const parent=ensureAbstract(path.split('/').slice(0,-1).join('/'),true) as TFolder;file.parent=parent;if(!parent.children.some(child=>child.path===path))parent.children.push(file);}
    return file;
  }
  const dailyNotes=()=>host.native?.dailyNotes??{folder:'Daily notes',format:'YYYY-MM-DD',template:''};
  class Vault extends Events {
    configDir='.crafactory';
    get adapter(){return adapter;}
    getConfig(key:string){host.trace?.('Vault.getConfig('+key+')');return key==='vimMode'?false:key==='dailyNotes'||key==='daily-notes'?dailyNotes():null;}
    on(name:string,callback:(...args:any[])=>void,ctx?:unknown){if(!['modify','create','delete','rename'].includes(name))return unsupported('Vault event '+name);return super.on(name,callback,ctx);}
    getName(){return snapshot.name;}getRoot(){return objects.get('') as TFolder;}
    getFiles(){return [...objects.values()].filter((f):f is TFile=>f instanceof TFile);}
    getMarkdownFiles(){return this.getFiles().filter(f=>f.extension.toLowerCase()==='md');}
    getAllFolders(includeRoot=false){return [...objects.values()].filter((f):f is TFolder=>f instanceof TFolder&&(includeRoot||!f.isRoot()));}
    getAllLoadedFiles(){return [...objects.values()];}
    getAbstractFileByPath(path:string){return objects.get(path==='/'?'':path)||null;}
    getAbstractFileByPathInsensitive(path:string){const exact=this.getAbstractFileByPath(path);if(exact)return exact;const folded=normalizePath(path).normalize('NFC').toLowerCase();return [...objects.values()].find(file=>file.path.normalize('NFC').toLowerCase()===folded)??null;}
    getFileByPath(path:string){const f=objects.get(path==='/'?'':path);return f instanceof TFile?f:null;}
    getFolderByPath(path:string){const f=objects.get(path==='/'?'':path);return f instanceof TFolder?f:null;}
    async read(file:TFile){checkFile(file);return request('read',[file.path]) as Promise<string>;}
    async cachedRead(file:TFile){checkFile(file);const note=snapshot.notes.find(n=>n.path===file.path);return note?note.content:this.read(file);}
    async create(path:string,data:string,options?:unknown){checkOptions(options,'Vault.create options');await mutate('create',[path,data]);if(!snapshot.entries.some(entry=>entry.path===path))pendingCreatedPaths.add(path);return ensureAbstract(path,false) as TFile;}
    async modify(file:TFile,data:string,options?:unknown){checkFile(file);checkOptions(options,'Vault.modify options');await mutate('modify',[file.path,data]);}
    async append(file:TFile,data:string,options?:unknown){checkFile(file);checkOptions(options,'Vault.append options');await mutate('append',[file.path,data]);}
    async createFolder(path:string){await mutate('mkdir',[path]);if(!snapshot.entries.some(entry=>entry.path===path))pendingCreatedPaths.add(path);return ensureAbstract(path,true) as TFolder;}
    /** Return a collision-free path with a normalized extension; no file is created. */
    getAvailablePath(path:string,extension:string){
      if(typeof path!=='string'||typeof extension!=='string')throw new Error('Invalid available path arguments');
      const base=normalizePath(path),suffix=extension?(extension.startsWith('.')?extension:'.'+extension):'';
      const taken=new Set([...objects.keys()].map(key=>key.toLowerCase()));
      let candidate=base+suffix,index=1;
      while(taken.has(candidate.toLowerCase()))candidate=base+' '+(index++)+suffix;
      return candidate;
    }
    /** Rename a file or folder through the native host, retaining the object subtree. */
    async rename(file:TAbstractFile,newPath:string):Promise<void>{
      checkAbstract(file);
      if(!file.path)return unsupported('Vault.rename root');
      if(typeof newPath!=='string'||!newPath.trim())return unsupported('Vault.rename target');
      const to=normalizePath(newPath);
      if(!to)return unsupported('Vault.rename target');
      const from=file.path;
      if(from===to)return;
      const subtree:TAbstractFile[]=[];
      const collect=(item:TAbstractFile)=>{subtree.push(item);if(item instanceof TFolder)for(const child of item.children)collect(child);};
      collect(file);
      const oldParent=file.parent as TFolder|null;
      await mutate('rename',[from,to]);
      for(const item of subtree){
        const previous=item.path, next=to+previous.slice(from.length);
        if(pendingCreatedPaths.delete(previous))pendingCreatedPaths.add(next);
        if(objects.get(previous)===item)objects.delete(previous);
        item.path=next;
        item.name=next.split('/').pop()||'';
        objects.set(next,item);
      }
      if(oldParent)oldParent.children=oldParent.children.filter(child=>child!==file);
      const parent=objects.get(to.split('/').slice(0,-1).join('/')) as TFolder|undefined;
      if(parent){
        parent.children=parent.children.filter(child=>!subtree.includes(child)&&child.path!==to);
        parent.children.push(file);
      }
      file.parent=parent??null;
    }
    async copy(file:TFile,path:string){checkFile(file);return this.create(path,await this.read(file));}
    /** Move a file or folder subtree to recoverable trash through the native storage host. */
    async trash(file:TAbstractFile):Promise<void>{
      checkAbstract(file);
      if(!file.path)return unsupported('Vault.trash root');
      const subtree:TAbstractFile[]=[];
      const collect=(item:TAbstractFile)=>{subtree.push(item);if(item instanceof TFolder)for(const child of item.children)collect(child);};
      collect(file);
      const parent=file.parent as TFolder|null;
      await mutate('trash',[file.path]);
      if(parent)parent.children=parent.children.filter(child=>child!==file);
      for(const item of subtree){pendingCreatedPaths.delete(item.path);if(objects.get(item.path)===item)objects.delete(item.path);}
    }
    delete(){return unsupported('Vault.delete');}process(){return unsupported('Vault.process atomic callback');}
    async readBinary(file:TFile){checkFile(file);return request('readBinary',[file.path]) as Promise<ArrayBuffer>;}
    async createBinary(path:string,data:ArrayBuffer|ArrayBufferView,options?:unknown){checkOptions(options,'Vault.createBinary options');await mutate('createBinary',[path,data]);if(!snapshot.entries.some(entry=>entry.path===path))pendingCreatedPaths.add(path);return ensureAbstract(path,false) as TFile;}
    async modifyBinary(file:TFile,data:ArrayBuffer|ArrayBufferView,options?:unknown){checkOptions(options,'Vault.modifyBinary options');checkFile(file);await mutate('modifyBinary',[file.path,data]);}
    appendBinary(){return unsupported('Vault.appendBinary');}
    /** Return the host asset URL (a data URL) through the storage service. */
    async getResourcePath(file:TAbstractFile):Promise<string>{
      checkAbstract(file);
      const value=await request('asset',[file.path]);
      if(typeof value!=='string'||!value)throw new Error('Resource path unavailable');
      return value;
    }
    static recurseChildren(root:TFolder,callback:(file:TAbstractFile)=>void){for(const child of root.children){callback(child);if(child instanceof TFolder)Vault.recurseChildren(child,callback);}}
  }
  function checkOptions(options:unknown,name:string){if(options!==undefined)return unsupported(name);}
  function checkAbstract(file:TAbstractFile){if(!(file instanceof TAbstractFile)||file.vault!==vault||objects.get(file.path)!==file)throw new Error('File does not belong to this vault');}
  function checkFile(file:TFile){checkAbstract(file);if(!(file instanceof TFile))throw new Error('Expected TFile');}
  const vault=guard(new Vault(),'Vault');
  class MarkdownView extends Component {
    constructor(){super();return guard(this,'MarkdownView');}
    get file(){return vault.getFileByPath(snapshot.active);}
    get editor(){return editor??(host.ui?new Editor({text:this.getViewData(),from:0,to:0},()=>unsupported('Markdown preview editing')):null);}
    get leaf():any{if(!host.ui)return unsupported('MarkdownView.leaf');return host.ui.workspace.activeLeaf??null;}
    get scope(){return host.ui?.scope??unsupported('MarkdownView.scope');}
    get containerEl(){return host.ui?.workspace.containerEl??this.leaf?.containerEl;}
    get contentEl(){return (this.containerEl as HTMLElement|undefined)?.querySelector('[data-testid="note-editor"]')??this.containerEl;}
    getViewType(){return 'markdown';}
    getMode(){return snapshot.editor?'source':'preview';}
    getState(){return {file:snapshot.active,mode:this.getMode()};}
    getViewData(){return snapshot.notes.find(n=>n.path===snapshot.active)?.content||'';}
    async onClose(){await this.save();}
    async save(){const path=snapshot.active;await mutationQueue;await request('save',[path]);}
  }
  class Workspace extends Events {
    layoutReady=true;
    on(name:string,callback:(...args:any[])=>void,ctx?:unknown){const custom=name.includes(':')||['parse-style-settings','settings-search-loaded'].includes(name);if(name!=='file-open'&&(!host.ui||(!['layout-change','active-leaf-change','editor-change','editor-paste','editor-drop','editor-menu','resize','window-open','window-close','quit','hover-link','file-menu','css-change'].includes(name)&&!custom)))return unsupported('Workspace event '+name);return super.on(name,callback,ctx);}
    getActiveFile(){return vault.getFileByPath(snapshot.active);}
    getActiveViewOfType(type:unknown):any{if(host.ui){if(typeof type!=='function')return unsupported('Workspace.getActiveViewOfType invalid type');const view=(host.ui.workspace.activeLeaf as any)?.view;return view instanceof type?view:null;}return type===MarkdownView&&editor?new MarkdownView():null;}
    iterateAllLeaves(_callback:(leaf:unknown)=>void){return unsupported('Workspace.iterateAllLeaves');}
    /** Prefer an owned embedded focus context while preserving the native editor fallback. */
    get activeEditor():CompatActiveEditor|null{return host.ui?.getActiveEditor?.()??(editor?{file:this.getActiveFile(),editor}:null);}
    /** Delegate focus admission to the renderer; workers cannot fabricate DOM editor ownership. */
    set activeEditor(info:CompatActiveEditor|null){const set=host.ui?.setActiveEditor;if(!set){unsupported('Workspace.activeEditor assignment');return;}set.call(host.ui,info);}
    onLayoutReady(callback:()=>void){callback();}
    /** Internal exact-path open used by workspace leaves; not a reference method. */
    async openPath(path:string){if(typeof path!=='string'||!path)throw new Error('Invalid open path');await request('open',[path]);}
    async openLinkText(linktext:string,sourcePath:string,newLeaf?:unknown,openState?:unknown){
      if(newLeaf||openState)return unsupported('Workspace.openLinkText new leaf/state');
      // When a native resolver is present it is authoritative; the snapshot resolver is only for runtimes without one.
      const resolver=host.native?.resolveLink;
      const target=resolver?resolver(parseLinktext(linktext).path,sourcePath):resolveLink(parseLinktext(linktext).path,sourcePath,snapshot.notes)?.path;
      if(!target)throw new Error('Link target not found');
      await request('open',[target]);
    }
  }
  const workspace=guard(new Workspace(),'Workspace'),metadataCache=guard(new Events(),'MetadataCache') as Events&Record<string,any>;
  let resolvedLinks:Record<string,Record<string,number>>={},unresolvedLinks:Record<string,Record<string,number>>={};
  Object.defineProperty(metadataCache,'resolvedLinks',{get:()=>resolvedLinks});
  Object.defineProperty(metadataCache,'unresolvedLinks',{get:()=>unresolvedLinks});
  if(host.ui){Object.defineProperties(workspace,Object.getOwnPropertyDescriptors(host.ui.workspace));Object.assign(workspace,{updateOptions:()=>host.ui!.updateOptions()});}
  const metadataOn=Events.prototype.on.bind(metadataCache);
  metadataCache.on=(name:string,callback:(...args:any[])=>void,ctx?:unknown)=>{
    if(!['changed','deleted','resolved','resolve'].includes(name)&&!name.includes(':'))return unsupported('MetadataCache event '+name);
    return metadataOn(name,callback,ctx);
  };
  const readCache=(file:unknown)=>{
    if(!(file instanceof TFile)||objects.get(file.path)!==file)throw new Error('File does not belong to this vault');
    return host.native?.metadata?.(file.path)??null;
  };
  const readCacheByPath=(path:unknown)=>{
    if(typeof path!=='string')throw new Error('Invalid cache path');
    const file=objects.get(path);if(!(file instanceof TFile))return null;
    return host.native?.metadata?.(path)??null;
  };
  metadataCache.getFileCache=readCache;
  metadataCache.getCache=readCacheByPath;
  metadataCache.getCachedFiles=()=>snapshot.notes.filter(note=>host.native?.metadata?.(note.path)).map(note=>note.path);
  metadataCache.getFirstLinkpathDest=(link:string,path:string)=>{
    const normalized=link.split('|')[0].split('#')[0].replace(/^\.\//,'');
    const parent=path.includes('/')?path.slice(0,path.lastIndexOf('/')+1):'';
    for(const candidate of [normalized,parent+normalized,normalized+'.md',parent+normalized+'.md']){
      const file=objects.get(candidate);if(file instanceof TFile)return file;
    }
    const resolver=host.native?.resolveLink;const target=resolver?resolver(link,path):resolveLink(link,path,snapshot.notes)?.path;
    return target?vault.getFileByPath(target):null;
  };
  function rebuildLinks(){
    const resolved:Record<string,Record<string,number>>={},unresolved:Record<string,Record<string,number>>={};
    for(const note of snapshot.notes){
      const cache=host.native?.metadata?.(note.path);
      for(const link of cache?.links||[]){
        const target=host.native?.resolveLink?.(link.link,note.path)??resolveLink(link.link,note.path,snapshot.notes)?.path;
        const bucket=target?resolved:unresolved,key=target??link.link;
        const entry=bucket[note.path]??={};entry[key]=(entry[key]||0)+1;
      }
    }
    resolvedLinks=resolved;unresolvedLinks=unresolved;
  }
  const memoryStorage=new Map<string,string>();
  function localStore(){try{return typeof localStorage==='undefined'?null:localStorage;}catch{return null;}}
  function checkStorageKey(key:unknown){if(typeof key!=='string')throw new TypeError('Local storage key must be a string');}
  function readStorage(key:string){
    if(memoryStorage.has(key))return memoryStorage.get(key);
    const store=localStore();if(!store)return undefined;
    try{return store.getItem(key)??undefined;}catch{return undefined;}
  }
  function writeStorage(key:string,value:string){
    const store=localStore();if(!store){memoryStorage.set(key,value);return;}
    try{store.setItem(key,value);memoryStorage.delete(key);}catch{memoryStorage.set(key,value);}
  }
  function removeStorage(key:string){
    memoryStorage.delete(key);const store=localStore();
    if(store)try{store.removeItem(key);}catch{}
  }
  function loadLocalStorage(key:unknown){
    checkStorageKey(key);
    const raw=readStorage(key as string);
    if(raw==null)return null;
    try{return JSON.parse(raw);}catch{return raw;}
  }
  function saveLocalStorage(key:unknown,value:unknown){
    checkStorageKey(key);
    const raw=JSON.stringify(value);
    if(raw===undefined){removeStorage(key as string);return;}
    writeStorage(key as string,raw);
  }
  /** Vault-keyed property types inferred from live notes, with explicit profile-persisted overrides. */
  const propertyTypes=['text','multitext','number','checkbox','date','datetime','tags','aliases'];
  const propertyStorageKey='crafactory:property-types:'+JSON.stringify(host.native?.basePath??snapshot.name);
  type PropertyType={name:string;type:string;count:number};
  const propertyOverrides=()=>{
    const stored=loadLocalStorage(propertyStorageKey),result:Record<string,{name:string;type:string}>=Object.create(null);
    if(stored&&typeof stored==='object'&&!Array.isArray(stored))for(const value of Object.values(stored)){
      if(value&&typeof value==='object'&&typeof (value as any).name==='string'&&(value as any).name.trim()&&propertyTypes.includes((value as any).type)){
        const {name,type}=value as {name:string;type:string};result[name.toLowerCase()]={name,type};
      }
    }
    return result;
  };
  const metadataTypeManager=guard({
    getAllProperties(){
      const result:Record<string,PropertyType>=Object.create(null),overrides=propertyOverrides();
      for(const note of snapshot.notes){
        const properties=host.native?.metadata?.(note.path)?.frontmatter??frontmatter(note.content).properties;
        for(const [name,value]of Object.entries(properties)){
          const key=name.toLowerCase();
          const inferred=typeof value==='boolean'?'checkbox':typeof value==='number'?'number':Array.isArray(value)?'multitext':'text';
          const property=result[key]??={name,type:overrides[key]?.type??inferred,count:0};property.count++;
        }
      }
      for(const [key,value]of Object.entries(overrides))result[key]={...value,count:result[key]?.count??0};
      return result;
    },
    setType(name:string,type:string){
      if(typeof name!=='string'||!name.trim())throw new TypeError('Property name must be a nonempty string');
      if(!propertyTypes.includes(type))return unsupported('Metadata property type '+type);
      const overrides=propertyOverrides();overrides[name.toLowerCase()]={name,type};saveLocalStorage(propertyStorageKey,overrides);
    }
  },'MetadataTypeManager');
  const fileManager=guard({
    async createNewMarkdownFile(parent:TFolder,name='Untitled',content='',options?:unknown){checkAbstract(parent);if(!(parent instanceof TFolder))throw new Error('Expected TFolder');checkOptions(options,'FileManager.createNewMarkdownFile options');if(typeof name!=='string'||/[\\/]/.test(name)||typeof content!=='string')throw new Error('Invalid Markdown filename or content');const base=name.replace(/\.md$/i,'')||'Untitled',path=parent.path?parent.path+'/'+base:base;return vault.create(vault.getAvailablePath(path,'md'),content);},
    /** Engine's new-note placement is the vault root, independent of source document. */
    getNewFileParent(sourcePath?:string){if(sourcePath!==undefined&&typeof sourcePath!=='string')throw new Error('Invalid source path');return vault.getRoot();},
    /** Rename a vault file through the existing host rename primitive. */
    async renameFile(file:TAbstractFile,newPath:string){
      checkAbstract(file);
      if(typeof newPath!=='string'||!newPath.trim())throw new Error('Invalid rename target');
      await vault.rename(file,newPath);
    }
  },'FileManager');
  const dailyPlugin={_id:'daily-notes',enabled:true,get instance(){return {options:{...dailyNotes()}};}};
  // Engine's own canvas provider is not the private Obsidian Canvas core plugin.
  const canvasPlugin={enabled:false,_loaded:false,instance:null,load:()=>unsupported('Obsidian core Canvas plugin')};
  // A missing private core Templates integration is disabled, not silently enabled.
  const templatesPlugin={enabled:false,_loaded:false,instance:Object.freeze({options:Object.freeze({folder:'',dateFormat:'YYYY-MM-DD',timeFormat:'HH:mm'})}),load:()=>unsupported('Obsidian core Templates plugin')};
  const internalPluginInstances={'daily-notes':dailyPlugin,canvas:canvasPlugin,templates:templatesPlugin};
  const internalPlugins={plugins:host.trace?new Proxy(internalPluginInstances,{get(target,key,receiver){if(typeof key==='string')host.trace?.('InternalPlugins.plugins.'+key);return Reflect.get(target,key,receiver);}}):internalPluginInstances,getPluginById:(id:string)=>Object.hasOwn(internalPluginInstances,id)?internalPluginInstances[id as keyof typeof internalPluginInstances]:null};
  // This bounded manager exposes only its own runtime, not other plugins' APIs.
  const plugins={plugins:Object.create(null) as Record<string,Plugin>,enabledPlugins:new Set<string>(),getPlugin:(id:string):Plugin|null=>id===manifest.id?plugins.plugins[id]??null:null};
  const foldManager={load:(_file:TFile)=>({folds:[]}),save:async(_file:TFile,_info:unknown)=>{}};
  type Hotkey={modifiers:string[];key:string};
  const savedHotkeys=host.ui?loadLocalStorage('engine.hotkeys.'+manifest.id):null;
  const customKeys:Record<string,Hotkey[]>=Object.assign(Object.create(null),savedHotkeys&&typeof savedHotkeys==='object'?savedHotkeys:{});
  const hotkeyBindings=new Map<string,unknown[]>();
  const defaultHotkeys=new Map<string,unknown>();
  const commandId=(id:string)=>id.startsWith(manifest.id+':')?id.slice(manifest.id.length+1):id;
  /** Revoke this command's previously owned keyboard registrations. */
  function removeHotkeys(id:string){const scope=host.ui?.scope as any;for(const handler of hotkeyBindings.get(id)??[])scope?.unregister(handler);hotkeyBindings.delete(id);}
  /** Rebind effective user/default shortcuts through the plugin's owned key scope. */
  function bindHotkeys(id:string){
    removeHotkeys(id);const scope=host.ui?.scope as any,command=commands.get(id);if(!scope||!command)return;
    const values=customKeys[manifest.id+':'+id]??defaultHotkeys.get(id)??command.hotkeys??[];
    if(!Array.isArray(values))throw new Error('Invalid hotkeys');
    for(const hotkey of values)if(!hotkey||typeof hotkey.key!=='string'||!Array.isArray(hotkey.modifiers)||hotkey.modifiers.some((m:unknown)=>!['Mod','Meta','Ctrl','Alt','Shift'].includes(String(m))))throw new Error('Invalid hotkey');
    const bindings=[];for(const hotkey of values){
      bindings.push(scope.register(hotkey.modifiers,hotkey.key,()=>{initEditor();if(!available(command,true))return;void Promise.resolve(available(command,false)).then(settle).catch(error=>host.ui?.reportError?host.ui.reportError(error):host.notice(String(error)));return false;}));
    }hotkeyBindings.set(id,bindings);
  }
  const hotkeyManager=guard({
    customKeys,
    getDefaultHotkeys(id:string){return defaultHotkeys.get(commandId(id))??commands.get(commandId(id))?.hotkeys??[];},
    addDefaultHotkeys(command:string|CompatCommand,values?:Hotkey[]){const id=typeof command==='string'?command:command.id;defaultHotkeys.set(commandId(id),values??(typeof command==='object'?command.hotkeys:undefined)??[]);bindHotkeys(commandId(id));},
    removeDefaultHotkeys(id:string){defaultHotkeys.set(commandId(id),[]);bindHotkeys(commandId(id));},
    getHotkeys(id:string){return customKeys[id]??this.getDefaultHotkeys(id);},
    setHotkeys(id:string,hotkeys:Hotkey[]){if(typeof id!=='string'||!Array.isArray(hotkeys))throw new Error('Invalid hotkeys');customKeys[id]=hotkeys;bindHotkeys(commandId(id));saveLocalStorage('engine.hotkeys.'+manifest.id,customKeys);},
    async save(){for(const id of commands.keys())bindHotkeys(id);saveLocalStorage('engine.hotkeys.'+manifest.id,customKeys);}
  },'HotkeyManager');
  const commandManager=guard({
    get commands():Record<string,CompatCommand>{return Object.fromEntries(this.listCommands().map(command=>[command.id,command]));},
    listCommands(){return [...commands.values()].map(command=>({...command,id:manifest.id+':'+command.id,name:manifest.name+': '+command.name}));},
    findCommand(id:string){return this.commands[id]??null;},
    executeCommand(command:CompatCommand){const owned=typeof command?.id==='string'?commands.get(commandId(command.id)):undefined;if(!owned)return false;initEditor();if(!available(owned,true))return false;void Promise.resolve(available(owned,false)).then(settle).catch(error=>host.ui?.reportError?host.ui.reportError(error):host.notice(String(error)));return true;},
    executeCommandById(id:string){const command=commands.get(commandId(id));return command?this.executeCommand(command):false;}
  },'CommandManager');
  const app=guard({appId:'crafactory-engine',isMobile:false,vault,workspace,metadataCache,fileManager,plugins,internalPlugins,foldManager,loadLocalStorage,saveLocalStorage,...(host.ui?{metadataTypeManager,hotkeyManager,commands:commandManager,getAccentColor:()=>{const color=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();return color||unsupported('App.getAccentColor without theme');}}:{}),...(host.ui?.scope?{scope:host.ui.scope}:{}),...(host.ui?.keymap?{keymap:host.ui.keymap}:{}),...(host.ui?.embedRegistry?{embedRegistry:host.ui.embedRegistry}:{})},'App');
  // Some plugins use Obsidian's untyped global instead of the plugin context.
  exposeApp(app);
  /** Reconcile a host snapshot while preserving file identities and emitting requested deltas. */
  function refresh(next:PluginSnapshot,events=false){
    const previous=snapshot;snapshot=next;
    const nextNotePaths=new Set(snapshot.notes.map(note=>note.path));
    const removedNotes=events?previous.notes.filter(note=>!nextNotePaths.has(note.path)).map(note=>({note,file:objects.get(note.path)})):[];
    const removedEntries=events?previous.entries.filter(entry=>!snapshot.entries.some(next=>next.path===entry.path)).map(entry=>({entry,file:objects.get(entry.path)})):[];
    const createdEntries=events?snapshot.entries.filter(entry=>!previous.entries.some(prev=>prev.path===entry.path)):[];
    for(const entry of snapshot.entries)pendingCreatedPaths.delete(entry.path);
    const paths=new Set(['',...snapshot.entries.map(e=>e.path),...snapshot.notes.map(note=>note.path),...pendingCreatedPaths]);
    for(const path of [...paths]){const parts=path.split('/');while(parts.length>1){parts.pop();paths.add(parts.join('/'));}}
    for(const path of [...objects.keys()])if(!paths.has(path))objects.delete(path);
    if(!objects.has(''))objects.set('',new TFolder('',vault));
    for(const entry of snapshot.entries){
      let file=objects.get(entry.path);
      if(!file||(entry.folder?!(file instanceof TFolder):!(file instanceof TFile))){file=entry.folder?new TFolder(entry.path,vault):new TFile(entry.path,vault);objects.set(entry.path,file);}
      file.name=entry.name;file.path=entry.path;
      if(file instanceof TFile)file.stat={ctime:entry.ctime,mtime:entry.mtime,size:entry.size};
    }
    // React/native watchers may publish note content before the matching directory
    // listing. Metadata and workspace events must never receive a null file.
    for(const note of snapshot.notes)ensureAbstract(note.path,false);
    for(const path of paths)if(!objects.has(path))ensureAbstract(path,true);
    for(const f of objects.values())if(f instanceof TFolder)f.children=[];
    for(const f of objects.values())if(f.path){f.parent=objects.get(f.path.split('/').slice(0,-1).join('/')) as TFolder||null;f.parent?.children.push(f);}
    rebuildLinks();
    if(events){
      initEditor();
      for(const {entry,file} of removedEntries)if(file)vault.trigger('delete',file);
      for(const entry of createdEntries){const file=objects.get(entry.path);if(file)vault.trigger('create',file);}
      if(previous.active!==snapshot.active){workspace.trigger('file-open',workspace.getActiveFile());if(host.ui)workspace.trigger('active-leaf-change',host.ui.workspace.activeLeaf);}
      if(host.ui&&(previous.active!==snapshot.active||!!previous.editor!==!!snapshot.editor))workspace.trigger('layout-change');
      for(const note of snapshot.notes){
        const before=previous.notes.find(n=>n.path===note.path);
        if(!before||before.content!==note.content){
          vault.trigger('modify',vault.getFileByPath(note.path));
          metadataCache.trigger('changed',vault.getFileByPath(note.path),note.content,null);
          metadataCache.trigger('resolve',vault.getFileByPath(note.path));
          if(host.ui&&note.path===snapshot.active)workspace.trigger('editor-change',editor,new MarkdownView());
        }
      }
      for(const {note,file} of removedNotes)metadataCache.trigger('deleted',file??new TFile(note.path,vault),null);
    }
  }
  refresh(initial);
  if(host.ui){const leaf=host.ui.workspace.activeLeaf as any;if(leaf&&!leaf.view)leaf.view=new MarkdownView();}
  /** Replace the active editor facade and retain rejected host mutations for settle. */
  function initEditor(){
    const path=snapshot.active;
    editor=snapshot.editor?new Editor(snapshot.editor,(base,text,from,to)=>{const result=mutate('editor',[path,base,text,from,to]);editorWrites.add(result);result.then(()=>editorWrites.delete(result),()=>{});return result;}):null;
  }
  initEditor();
  /** Check and run commands against the admitted editor context rather than a different host draft. */
  function available(command:CompatCommand,checking:boolean){
    let result:unknown;
    const focused=host.ui?.getActiveEditor?.(),active=focused?.editor??editor,context=focused??new MarkdownView();
    if(command.editorCheckCallback){if(!active)return false;result=command.editorCheckCallback(checking,active,context);}
    else if(command.editorCallback){if(!active)return false;if(!checking)result=command.editorCallback(active,context);else return true;}
    else if(command.checkCallback)result=command.checkCallback(checking);
    else {if(!checking)return command.callback?.();return true;}
    if(checking&&result&&typeof (result as any).then==='function')return unsupported('Command async checking callback');
    return checking?result===true:result;
  }
  function publish(){initEditor();host.commands([...commands.values()].filter(c=>available(c,true)).map(c=>({id:c.id,name:manifest.name+': '+c.name})));}
  class Notice {constructor(message:string|DocumentFragment,timeout?:number){if(typeof message!=='string')unsupported('Notice DocumentFragment');if(timeout!==undefined&&typeof timeout!=='number')unsupported('Notice custom duration');host.notice(String(message));}setMessage(message:string){host.notice(message);return this;}hide(){return unsupported('Notice.hide');}get noticeEl(){return unsupported('Notice.noticeEl');}}
  class Plugin extends Component {
    app=app;manifest=manifest;
    constructor(_app=app,_manifest=manifest){super();this.app=_app;this.manifest=_manifest;}
    addCommand(command:CompatCommand){
      if(typeof command.id!=='string'||typeof command.name!=='string'||!command.id)throw new Error('Invalid plugin command');
      if(command.repeatable||command.mobileOnly)return unsupported('Command repeatable/mobileOnly');
      commands.set(command.id,command);bindHotkeys(command.id);publish();this.register(()=>{removeHotkeys(command.id);commands.delete(command.id);});return {...command,id:manifest.id+':'+command.id,name:manifest.name+': '+command.name};
    }
    removeCommand(id:string){id=commandId(id);removeHotkeys(id);commands.delete(id);publish();}
    loadData(){return request('loadData');}saveData(data:unknown){return mutate('saveData',[data]);}
    onExternalSettingsChange(){return unsupported('Plugin.onExternalSettingsChange');}
    onUserEnable():unknown{return undefined;}
    addRibbonIcon(icon:string,title:string,callback:(event:MouseEvent)=>void){
      if(!host.ui?.ribbonIcon)return unsupported('Plugin.addRibbonIcon');
      const element=host.ui.ribbonIcon(icon,title,callback);
      this.register(()=>element.remove());
      return element;
    }
    addSettingTab(tab:unknown){if(!host.ui)return unsupported('Plugin.addSettingTab');this.register(host.ui.settingTab(tab));}
    addStatusBarItem(){if(!host.ui)return unsupported('Plugin.addStatusBarItem');const element=host.ui.statusBar();this.register(()=>element.remove());return element;}
    registerView(type:string,factory:(leaf:any)=>any){if(!host.ui)return unsupported('Plugin.registerView');this.register(host.ui.registerView(type,factory));}
    registerExtensions(extensions:string[],viewType:string){
      if(!host.ui?.registerExtensions)return unsupported('Plugin.registerExtensions');
      this.register(host.ui.registerExtensions(extensions,viewType));
    }
    registerEditorExtension(extension:unknown){
      const editor=host.native?.editor;
      if(editor&&!editor.codeMirrorExtensions)throw new Error(`Editor extensions require the CodeMirror editor provider; active provider is ${editor.providerId}`);
      if(!host.ui)return unsupported('Plugin.registerEditorExtension');
      this.register(host.ui.editorExtension(extension));
    }
    registerEditorSuggest(suggest:unknown){
      if(!host.ui?.editorSuggest)return unsupported('Plugin.registerEditorSuggest');
      this.register(host.ui.editorSuggest(suggest));
    }
    /** Register a renderer-only callback and attach its disposal to this plugin's lifecycle. */
    registerMarkdownPostProcessor(callback:any,sortOrder?:number){if(!host.ui?.postProcessor)return unsupported('Plugin.registerMarkdownPostProcessor');const registration=host.ui.postProcessor(callback,sortOrder);this.register(registration.dispose);return registration.processor;}
    /** Register a renderer-only fenced-code handler with the same lifecycle ownership. */
    registerMarkdownCodeBlockProcessor(language:string,callback:any,sortOrder?:number){if(!host.ui?.codeProcessor)return unsupported('Plugin.registerMarkdownCodeBlockProcessor');const registration=host.ui.codeProcessor(language,callback,sortOrder);this.register(registration.dispose);return registration.processor;}
    registerObsidianProtocolHandler(action:string,handler:(params:Record<string,string>)=>unknown){
      if(!host.ui?.protocolHandler)return unsupported('Plugin.registerObsidianProtocolHandler');
      this.register(host.ui.protocolHandler(action,handler));
    }
    registerHoverLinkSource(id:string,source:{display:string;defaultMod:boolean}){
      if(!host.ui?.hoverLinkSource)return unsupported('Plugin.registerHoverLinkSource');
      this.register(host.ui.hoverLinkSource(id,source));
    }
    registerBasesView(id:string,factory:(controller:unknown)=>unknown){
      if(!host.ui?.basesView)return unsupported('Plugin.registerBasesView');
      this.register(host.ui.basesView(id,factory));
    }
    registerCliHandler(){return ()=>{};}
  }
  const exports:Record<string,unknown>={Plugin,Component,Events,Notice,TAbstractFile,TFile,TFolder,Vault,Workspace,Editor,MarkdownView,FileSystemAdapter,
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
    debounce,apiVersion:'0.0.0',requireApiVersion:(version:string)=>version==='0.0.0',moment,
    // Engine's current application UI is English; this is not the OS/browser locale.
    getLanguage:()=> 'en'};
  Object.assign(exports,host.ui?.exports);
  if(host.trace)for(const [name,constructor] of [['Plugin',Plugin],['WorkspaceLeaf',exports.WorkspaceLeaf]] as const)if(typeof constructor==='function')for(const key of Object.getOwnPropertyNames(constructor.prototype)){
    const descriptor=Object.getOwnPropertyDescriptor(constructor.prototype,key);
    if(key==='constructor'||typeof descriptor?.value!=='function')continue;
    const method=descriptor.value;Object.defineProperty(constructor.prototype,key,{...descriptor,value:function(this:unknown,...args:unknown[]){host.trace?.(name+'.'+key);return method.apply(this,args);}});
  }
  if(host.ui)for(const name of ['Keymap','Platform']){const value=exports[name];if(value&&typeof value==='object')exports[name]=guard(value,name);}
  const api=new Proxy(exports,{get(target,key){if(typeof key==='symbol')return Reflect.get(target,key);if(key==='__esModule')return false;host.trace?.('export.'+key);if(Object.hasOwn(target,key))return target[key];return unsupported('export '+key);}});
  return {
    app,api,settle,
    sync(next:PluginSnapshot){refresh(next,true);publish();},
    /** Await actual initialization even when public repeated load calls return immediately. */
    async boot(constructor:any){
      if(typeof constructor!=='function'||!(constructor.prototype instanceof Plugin))throw new Error('CommonJS default export must extend Plugin');
      plugins.enabledPlugins.add(manifest.id);
      try{plugin=new constructor(app,manifest);plugins.plugins[manifest.id]=plugin!;await Promise.all([plugin!.load(),componentLifecycle(plugin!,'startup')]);await plugin!.onUserEnable();await settle();publish();metadataCache.trigger('resolved');if(host.ui)workspace.trigger('layout-change');}
      catch(error){plugins.enabledPlugins.delete(manifest.id);delete plugins.plugins[manifest.id];throw error;}
    },
    async run(id:string){if(unloaded)throw new Error('Plugin is unloaded');initEditor();const command=commands.get(id);if(!command)throw new Error('Command not found');if(!available(command,true))throw new Error('Command unavailable');await available(command,false);await settle();},
    /** Keep the request fence open until actual hook/cleanup work and data operations settle. */
    async stop(){if(unloaded)return;try{if(plugin)await Promise.all([plugin.unload(),componentLifecycle(plugin,'shutdown')]);await settle();}finally{for(const id of hotkeyBindings.keys())removeHotkeys(id);plugins.enabledPlugins.delete(manifest.id);delete plugins.plugins[manifest.id];commands.clear();host.commands([]);unloaded=true;releaseApp(app);}},
    /** Deliver a hover-link event to renderer plugins with a minimal hover parent. */
    hoverLink(payload:{event:MouseEvent;source:string;targetEl:HTMLElement;linktext:string;sourcePath:string}){
      workspace.trigger('hover-link',{...payload,hoverParent:{hoverPopover:null}});
    },
    /** Trigger a bounded workspace event from the renderer host. */
    triggerWorkspaceEvent(name:string,args:unknown[]){
      if(name==='file-menu'){const [menu,path,source]=args;workspace.trigger(name,menu,vault.getFileByPath(String(path)),source);}
      else workspace.trigger(name,...args);
    },
    /** Report the active editor provider and whether CodeMirror-only extensions apply. */
    editorCompatibility(){return host.native?.editor??{providerId:'unknown',codeMirrorExtensions:!!host.ui};},
    getExports(){return Object.keys(exports);}
  };
}
