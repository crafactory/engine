/* Original public-contract adapters. No proprietary SDK or plugin implementation. */
import {StateField,EditorState,Transaction,Compartment,type Extension} from '@codemirror/state';
import {EditorView,keymap as cmKeymap,type ViewUpdate} from '@codemirror/view';
import {history,historyKeymap,defaultKeymap} from '@codemirror/commands';
import {markdown} from '@codemirror/lang-markdown';
import {guardCompatibilityObject} from './compat-core';
import moment from 'moment';
import {Component,Editor,EditorSuggest,Events,unsupported} from './compat-core';
import {Keymap,Scope} from './compat-keymap';
import {addIcon,getIcon,getIconIds,setIcon} from './compat-icons';
import {MarkdownRenderChild,createMarkdownRenderer,registerPostProcessor,registerCodeProcessor,stopProcessors} from './markdown-plugins';
export const rendererExports=['Modal','SettingTab','PluginSettingTab','Setting','BaseComponent','ValueComponent','AbstractTextComponent','TextComponent','TextAreaComponent','DropdownComponent','ToggleComponent','ButtonComponent','SliderComponent','View','ItemView','FileView','TextFileView','WorkspaceLeaf','EditorSuggest','AbstractInputSuggest','SuggestModal','FuzzySuggestModal','Keymap','Scope','BasesView','QueryController','MarkdownRenderChild','MarkdownRenderer','Menu','MenuItem','editorLivePreviewField','editorInfoField','Platform','prepareFuzzySearch','addIcon','getIcon','getIconIds','setIcon','setTooltip'] as const;
/** Bounded editor fields: live preview is always active and no file is exposed. */
export const editorLivePreviewField=StateField.define<boolean>({create:()=>true,update:value=>value});
export const editorInfoField=StateField.define<{file:null}>({create:()=>({file:null}),update:value=>value});
export interface PluginTab {id:string;name:string;containerEl:HTMLElement;display():void;hide():void}
/** Minimal QueryController: config and type only; query data is not implemented. */
export class QueryController {
  constructor(public app:unknown,public type:string,public config:unknown){}
}
/** Minimal BasesView base; plugins implement render(container). */
export class BasesView {
  constructor(public controller:QueryController){}
  get type(){return this.controller?.type??'';}
  get name(){return '';}
  get icon(){return '';}
  render(_container:HTMLElement):void{}
  onload():void{}
  onunload():void{}
}
/** Minimal native menu surface used by compatibility plugins. */
export class MenuItem {
  title='';icon='';callback:((event:MouseEvent)=>void)|undefined;disabled=false;checked=false;separator=false;
  submenu?:Menu;
  setSection(_section:string){return this;}
  setWarning(_warning:boolean){return this;}
  setSubmenu(){return this.submenu??=new Menu();}
  setTitle(title:string){this.title=title;return this;}setIcon(icon:string){this.icon=icon;return this;}
  setChecked(checked:boolean){this.checked=checked;return this;}setDisabled(disabled:boolean){this.disabled=disabled;return this;}
  onClick(callback:(event:MouseEvent)=>void){this.callback=callback;return this;}
  then(callback:(item:this)=>void){callback(this);return this;}
}
export class Menu {
  items:MenuItem[]=[];
  private container?:HTMLElement;
  private cleanup?:()=>void;
  private hidden:()=>void=()=>{};
  protected createItem(){return new MenuItem();}
  addItem(callback:(item:MenuItem)=>void){const item=this.createItem();callback(item);this.items.push(item);return this;}
  addSeparator(){const item=new MenuItem();item.separator=true;this.items.push(item);return this;}
  setNoIcon(){return this;}
  onHide(callback:()=>void){this.hidden=callback;return this;}
  hide(){if(!this.container)return;this.cleanup?.();this.cleanup=undefined;this.container.remove();this.container=undefined;for(const item of this.items)item.submenu?.hide();this.hidden();}
  showAtMouseEvent(event:MouseEvent){return this.showAtPosition({x:event.clientX,y:event.clientY});}
  showAtPosition(position:{x:number;y:number}){
    this.hide();const menu=document.createElement('div');this.container=menu;menu.className='menu';menu.setAttribute('role','menu');
    Object.assign(menu.style,{position:'fixed',left:Math.max(0,position.x)+'px',top:Math.max(0,position.y)+'px',zIndex:'10000',minWidth:'180px',padding:'5px',background:'var(--background-primary, white)',color:'var(--text-normal, black)',boxShadow:'0 4px 20px #0004',borderRadius:'6px'});
    for(const item of this.items){
      if(item.separator){const separator=document.createElement('hr');separator.setAttribute('role','separator');menu.append(separator);continue;}
      const button=document.createElement('button');button.setAttribute('role',item.checked?'menuitemcheckbox':'menuitem');if(item.checked)button.setAttribute('aria-checked','true');button.textContent=(item.checked?'[x] ':'')+item.title;button.disabled=item.disabled;button.className='menu-item';Object.assign(button.style,{display:'block',width:'100%',textAlign:'left'});menu.append(button);
      button.addEventListener('click',event=>{if(item.disabled)return;if(item.submenu){const rect=button.getBoundingClientRect();item.submenu.showAtPosition({x:rect.right,y:rect.top});return;}this.hide();item.callback?.(event);});
    }
    document.body.append(menu);const rect=menu.getBoundingClientRect();menu.style.left=Math.max(0,Math.min(position.x,innerWidth-rect.width))+'px';menu.style.top=Math.max(0,Math.min(position.y,innerHeight-rect.height))+'px';
    const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!menu.contains(event.target)&&!(event.target instanceof Element&&event.target.closest('.menu')))this.hide();};
    const keyboard=(event:KeyboardEvent)=>{if(!menu.contains(document.activeElement))return;if(event.key==='Escape'){event.preventDefault();this.hide();}else if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();const buttons=[...menu.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];const current=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[(current+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',keyboard);this.cleanup=()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',keyboard);};menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();return this;
  }
}
const element=(tag:string,parent?:HTMLElement,cls='')=>{const el=document.createElement(tag);el.className=cls;parent?.append(el);return el;};
/** Install shared DOM conveniences once without replacing browser-provided implementations. */
export function installDomHelpers(){
  for(const [name,value]of Object.entries({first(this:unknown[]){return this[0];},last(this:unknown[]){return this[this.length-1];}}))if(!(name in Array.prototype))Object.defineProperty(Array.prototype,name,{value,configurable:true,writable:true});
  if(!('instanceOf' in Node.prototype))Object.defineProperty(Node.prototype,'instanceOf',{configurable:true,writable:true,value:function(this:Node,type:new()=>unknown){
    if(this instanceof type)return true;
    const local=(this.ownerDocument?.defaultView??window) as unknown as Record<string,any>,equivalent=local[type.name];
    if(typeof equivalent!=='function'||type.prototype?.[Symbol.toStringTag]!==equivalent.prototype?.[Symbol.toStringTag])return false;
    for(let prototype=Object.getPrototypeOf(this);prototype;prototype=Object.getPrototypeOf(prototype))if(prototype===equivalent.prototype||prototype.constructor?.name===type.name)return true;
    return false;
  }});
  if(!(String.prototype as any).contains)Object.defineProperty(String.prototype,'contains',{value:function(this:string,needle:string){return this.includes(needle);},configurable:true,writable:true});
  if(!(Array.prototype as any).contains)Object.defineProperty(Array.prototype,'contains',{value:function(this:any[],value:unknown,fromIndex?:number){return this.includes(value,fromIndex);},configurable:true,writable:true});
  if(!(Array.prototype as any).remove)Object.defineProperty(Array.prototype,'remove',{value:function(this:unknown[],value:unknown){for(let index=this.length-1;index>=0;index--)if(index in this&&this[index]===value)this.splice(index,1);},configurable:true,writable:true});
  type Delegated={type:string;selector:string;listener:Function;wrapper:EventListener;capture:boolean};
  const delegated=new WeakMap<HTMLElement|Document,Delegated[]>();
  const capture=(options?:boolean|AddEventListenerOptions)=>typeof options==='boolean'?options:!!options?.capture;
  const off=function(this:HTMLElement|Document,type:string,selector:string,listener:Function,options?:boolean|AddEventListenerOptions){const records=delegated.get(this)??[];for(const record of [...records])if(record.type===type&&record.selector===selector&&record.listener===listener&&record.capture===capture(options)){this.removeEventListener(type,record.wrapper,record.capture);records.splice(records.indexOf(record),1);}if(!records.length)delegated.delete(this);};
  const on=function(this:HTMLElement|Document,type:string,selector:string,listener:Function,options?:boolean|AddEventListenerOptions){
    if(typeof type!=='string'||typeof selector!=='string'||typeof listener!=='function')throw new Error('Invalid delegated DOM event');document.createElement('div').matches(selector);
    const root=this,record:Delegated={type,selector,listener,capture:capture(options),wrapper:event=>{const target=event.target instanceof Element?event.target:(event.target as Node|null)?.parentElement,match=target?.closest(selector);if(match&&root.contains(match)){if(typeof options==='object'&&options.once)off.call(root,type,selector,listener,options);listener.call(root,event,match);}}};
    this.addEventListener(type,record.wrapper,typeof options==='object'?{...options,once:false}:options);const records=delegated.get(this)??[];records.push(record);delegated.set(this,records);
  };
  for(const prototype of [HTMLElement.prototype,Document.prototype])for(const [name,value]of Object.entries({on,off}))if(!(name in prototype))Object.defineProperty(prototype,name,{value,configurable:true,writable:true});
  const globalWindow=window as unknown as Record<string,unknown>;
  if(!('doc' in Node.prototype))Object.defineProperty(Node.prototype,'doc',{get(){return this.nodeType===9?this:this.ownerDocument;},configurable:true});
  if(!('win' in Node.prototype))Object.defineProperty(Node.prototype,'win',{get(){return (this.nodeType===9?this:this.ownerDocument)?.defaultView;},configurable:true});
  if(typeof globalWindow.activeWindow==='undefined')globalWindow.activeWindow=window;
  if(typeof globalWindow.activeDocument==='undefined')globalWindow.activeDocument=document;
  if(typeof globalWindow.global==='undefined')globalWindow.global=window;
  if(typeof globalWindow.sleep==='undefined')globalWindow.sleep=(milliseconds:number)=>new Promise(resolve=>setTimeout(resolve,milliseconds));
  if(typeof globalWindow.createFragment!=='function')globalWindow.createFragment=(callback?:(element:HTMLElement)=>void)=>{const fragment=document.createDocumentFragment();if(typeof callback==='function'){const element=document.createElement('div');callback(element);fragment.append(...element.childNodes);}return fragment;};
  /** Detached element helper exposed globally by the reference API. */
  const createDetached=(tag:string,options:any={},callback?:(element:HTMLElement)=>void)=>{
    const element=document.createElement(tag);
    if(typeof options==='string')element.className=options;else{
      if(options?.cls)element.className=Array.isArray(options.cls)?options.cls.join(' '):options.cls;
      if(options?.text!==undefined)element.textContent=String(options.text);
      for(const [key,value]of Object.entries(options?.attr||{}))element.setAttribute(key,String(value));
      if(options?.type)element.setAttribute('type',options.type);
      if(options?.value!==undefined)(element as HTMLInputElement).value=String(options.value);
    }
    callback?.(element);return element;
  };
  if(typeof globalWindow.createEl!=='function')globalWindow.createEl=createDetached;
  if(typeof globalWindow.createDiv!=='function')globalWindow.createDiv=(options?:any,callback?:any)=>createDetached('div',options,callback);
  if(typeof globalWindow.createSpan!=='function')globalWindow.createSpan=(options?:any,callback?:any)=>createDetached('span',options,callback);
  if(typeof globalWindow.moment!=='function')globalWindow.moment=moment;
  if(typeof globalWindow.process==='undefined')globalWindow.process={env:{NODE_ENV:'production'}};
  // Bounded CodeMirror 5 surface for legacy highlighting-mode registration.
  const codeMirror=(globalWindow.CodeMirror??={}) as Record<string,any>;
  const genericMode={name:'null',startState:()=>({}),copyState:(state:Record<string,unknown>)=>({...state}),blankLine:()=>null,token:(stream:{skipToEnd():void})=>{stream.skipToEnd();return null;}};
  const modes=new Map<string,any>([['javascript',{...genericMode,name:'javascript'}]]);
  const mimeModes=new Map<string,string|Record<string,any>>();
  codeMirror.defineMode??=(name:string,factory:any)=>modes.set(name,factory);
  // CM5 factories receive editor configuration and a distinct mode specification.
  // Instantiate per call: memoizing an instance incorrectly shares mode-specific options.
  codeMirror.getMode??=((config:unknown,name:string|Record<string,any>)=>{
    let spec=typeof name==='string'?{name}:name;const visited=new Set<string>();
    while(mimeModes.has(spec.name)){if(visited.has(spec.name))throw new Error('Cyclic CodeMirror MIME alias');visited.add(spec.name);const alias=mimeModes.get(spec.name)!;spec=typeof alias==='string'?{...spec,name:alias}:{...alias,...spec,name:alias.name};}
    const mode=modes.get(spec.name);return typeof mode==='function'?mode({indentUnit:2,tabSize:4,...(config as Record<string,unknown>||{})},spec):mode??genericMode;
  }) as any;
  codeMirror.startState??=((mode:any)=>mode?.startState?.()??{}) as any;
  codeMirror.copyState??=((mode:any,state:any)=>{
    if(typeof mode?.copyState==='function')return mode.copyState(state);
    if(!state||typeof state!=='object')return state;
    return Object.fromEntries(Object.entries(state).map(([key,value])=>[key,Array.isArray(value)?value.slice():value]));
  }) as any;
  codeMirror.registerHelper??=(()=>{}) as any;
  codeMirror.defineMIME??=((mime:string,spec:string|Record<string,any>)=>{mimeModes.set(mime,spec);}) as any;
  codeMirror.customOverlayMode??=((base:any,overlay:any)=>({name:overlay.name||'overlay',startState:()=>({...base?.startState?.(),...overlay?.startState?.()}),copyState:(state:any)=>overlay.copyState?overlay.copyState(state):state,blankLine:(state:any)=>overlay.blankLine?.(state)??base?.blankLine?.(state)??null,token:(stream:any,state:any)=>overlay.token?.(stream,state)??base?.token?.(stream,state)??null})) as any;
  codeMirror.overlayMode??=codeMirror.customOverlayMode;
  if(typeof globalWindow.addIcon!=='function')globalWindow.addIcon=()=>{};

  const classNames=(values:unknown[]):string[]=>values.flat(Infinity).flatMap(value=>String(value).split(/\s+/)).filter(Boolean);
  const methods:Record<string,Function>={
    onWindowMigrated(this:HTMLElement,listener:(win:Window)=>unknown){if(typeof listener!=='function')throw new Error('Expected window migration listener');const node=this;let owner=node.ownerDocument,win=owner.defaultView;const observer=new MutationObserver(()=>{const next=node.ownerDocument;if(next!==owner){owner=next;observer.disconnect();observer.observe(owner,{childList:true,subtree:true});if(owner.defaultView&&owner.defaultView!==win){win=owner.defaultView;listener(win);}}});observer.observe(owner,{childList:true,subtree:true});return()=>observer.disconnect();},
    onNodeInserted(this:HTMLElement,listener:()=>unknown,once=false){if(typeof listener!=='function')throw new Error('Expected insertion listener');const node=this,observer=new MutationObserver(records=>{if(node.isConnected&&records.some(record=>[...record.addedNodes].some(added=>added===node||added.contains(node)))){if(once)observer.disconnect();listener();}});observer.observe(node.ownerDocument,{childList:true,subtree:true});return()=>observer.disconnect();},
    onClickEvent(this:HTMLElement,callback:(event:MouseEvent)=>unknown,options?:AddEventListenerOptions){this.addEventListener('click',callback,options);return ()=>this.removeEventListener('click',callback,options);},
    empty(this:HTMLElement){this.replaceChildren();},
    setText(this:HTMLElement,text:unknown){this.textContent=String(text);},
    getText(this:HTMLElement){return this.textContent||'';},
    setAttr(this:HTMLElement,key:string,value:string){this.setAttribute(key,value);},
    hasClass(this:HTMLElement,name:string){return this.classList.contains(name);},
    getCssPropertyValue(this:HTMLElement,name:string){return getComputedStyle(this).getPropertyValue(name);},
    addClass(this:HTMLElement,...names:unknown[]){this.classList.add(...classNames(names));},
    addClasses(this:HTMLElement,...names:unknown[]){this.classList.add(...classNames(names));},
    removeClasses(this:HTMLElement,...names:unknown[]){this.classList.remove(...classNames(names));},
    appendText(this:HTMLElement,text:unknown){this.append(document.createTextNode(String(text)));},
    removeClass(this:HTMLElement,...names:string[]){this.classList.remove(...names.flatMap(s=>s.split(/\s+/)).filter(Boolean));},
    toggleClass(this:HTMLElement,names:unknown,enabled:boolean){for(const name of classNames([names]))this.classList.toggle(name,enabled);},
    show(this:HTMLElement){this.hidden=false;},hide(this:HTMLElement){this.hidden=true;},isShown(this:HTMLElement){
      for(let element:HTMLElement|null=this;element;element=element.parentElement){if(element.hidden||getComputedStyle(element).display==='none')return false;}
      return this.isConnected;
    },
    createEl(this:HTMLElement,tag:string,options:any={},callback?:(el:HTMLElement)=>void){
      const el=element(tag,this);if(typeof options==='string')el.className=options;else{
        if(options.cls)el.className=Array.isArray(options.cls)?options.cls.join(' '):options.cls;
        if(options.text!==undefined)el.textContent=String(options.text);
        for(const [key,value]of Object.entries(options.attr||{}))el.setAttribute(key,String(value));
        if(options.type)el.setAttribute('type',options.type);
      }callback?.(el);return el;
    },
    createDiv(this:HTMLElement,options?:any,callback?:any){return methods.createEl.call(this,'div',options,callback);},
    createSpan(this:HTMLElement,options?:any,callback?:any){return methods.createEl.call(this,'span',options,callback);},
    find(this:HTMLElement,selector:string){return this.querySelector(selector);},
    findAll(this:HTMLElement,selector:string){return [...this.querySelectorAll(selector)];},
    findAllSelf(this:HTMLElement,selector:string){return [...(this.matches(selector)?[this]:[]),...this.querySelectorAll(selector)];},
  };
  for(const [name,value]of Object.entries(methods))if(!(name in HTMLElement.prototype))Object.defineProperty(HTMLElement.prototype,name,{value,configurable:true,writable:true});
  for(const name of ['addClass','addClasses','removeClass','removeClasses','toggleClass','hasClass','setAttr','empty','setText','getText','getCssPropertyValue','find','findAll','findAllSelf'] as const)if(!(name in SVGElement.prototype))Object.defineProperty(SVGElement.prototype,name,{value:methods[name],configurable:true,writable:true});
  // Obsidian's DOM helpers also build children on document fragments and shadow roots.
  const fragmentMethods:Record<string,Function>={empty:methods.empty,createEl:methods.createEl,createDiv:methods.createDiv,createSpan:methods.createSpan,appendText:methods.appendText,setText:methods.setText,getText:methods.getText,find:methods.find,findAll:methods.findAll};
  for(const [name,value]of Object.entries(fragmentMethods))if(!(name in DocumentFragment.prototype))Object.defineProperty(DocumentFragment.prototype,name,{value,configurable:true,writable:true});
}
/** Create plugin-owned trusted-renderer UI hooks; this adapter is not an isolation boundary. */
export interface VersionedText {content:string;version:string}
/** Own one renderer plugin's views, editor contributions, events and retirement lifecycle. */
export function createDomAdapters(id:string,name:string,onError:(reason:unknown)=>void,onTabs:(tabs:PluginTab[])=>void,onExtensions:(extensions:unknown[])=>void,onFileExtensions?:(extensions:string[],viewType?:string)=>void,applyEditorEdit?:(base:string,text:string,from:number,to:number)=>Promise<unknown>,fileIO?:{read(path:string):Promise<VersionedText>;write(path:string,data:string,version:string):Promise<VersionedText>},onSaveError:(error:unknown)=>void=onError,onOpenView?:(viewType:string|null,path:string,leafId:string)=>void,onSaveLayout?:()=>Promise<void>){
  installDomHelpers();
  const resources=new Set<HTMLElement>(),modals=new Set<any>(),tabs=new Set<any>(),extensions:unknown[]=[],factories=new Map<string,(leaf:any)=>any>(),leaves=new Set<any>(),extensionViews=new Map<string,string>(),suggests=new Set<EditorSuggest<any>>(),protocolHandlers=new Map<string,(params:Record<string,string>)=>unknown>(),hoverSources=new Map<string,{display:string;defaultMod:boolean}>(),basesFactories=new Map<string,(controller:QueryController)=>unknown>();
  const viewMounts=new WeakMap<WorkspaceLeaf,symbol>();
  const processors=new Set<ReturnType<typeof registerPostProcessor>>();
  let processorsStopped=false;
  /** Keep registration handles private to this plugin and remove them after disposal. */
  const ownProcessor=(entry:ReturnType<typeof registerPostProcessor>)=>{processors.add(entry);return {processor:entry.processor,dispose:async()=>{await entry.dispose();processors.delete(entry);}};};
  const host=(name:string)=>{const el=document.getElementById(name);if(!el)throw new Error('Plugin UI host missing: '+name);return el;};
  const create=(parent:HTMLElement,tag:string,options:any={})=>{const el=element(tag,parent,typeof options==='string'?options:options.cls||'');if(typeof options!=='string'&&options.text!==undefined)el.textContent=String(options.text);return el;};
  const publishTabs=()=>onTabs([...tabs].map((t,i)=>({id:id+':'+i,name,containerEl:t.containerEl,display:()=>safe(()=>{t.display();if(!t.containerEl.childNodes.length)t.renderDeclarative();})(),hide:()=>safe(()=>t.hide())()})));
  const safe=(callback:(...args:any[])=>unknown)=>(...args:any[])=>{try{Promise.resolve(callback(...args)).catch(onError);}catch(e){onError(e);}};
  class BaseComponent {disabled=false;then(callback:(self:this)=>void){callback(this);return this;}setDisabled(disabled:boolean){this.disabled=disabled;return this;}}
  class ValueComponent extends BaseComponent {registerOptionListener(){return unsupported('ValueComponent.registerOptionListener');}}
  class AbstractTextComponent extends ValueComponent {
    inputEl:HTMLInputElement|HTMLTextAreaElement;private change:(value:string)=>unknown=()=>{};
    constructor(parent:HTMLElement,tag='input'){super();this.inputEl=element(tag,parent) as HTMLInputElement;this.inputEl.addEventListener('input',()=>safe(this.change)(this.getValue()));}
    setPlaceholder(value:string){this.inputEl.placeholder=value;return this;}setValue(value:string){this.inputEl.value=value;return this;}
    getValue(){return this.inputEl.value;}onChange(callback:(value:string)=>unknown){this.change=callback;return this;}onChanged(){safe(this.change)(this.getValue());}
    setDisabled(disabled:boolean){super.setDisabled(disabled);this.inputEl.disabled=disabled;return this;}
  }
  class TextComponent extends AbstractTextComponent {}
  class TextAreaComponent extends AbstractTextComponent {constructor(parent:HTMLElement){super(parent,'textarea');}}
  class DropdownComponent extends ValueComponent {
    selectEl:HTMLSelectElement;constructor(parent:HTMLElement){super();this.selectEl=element('select',parent) as HTMLSelectElement;}
    addOption(value:string,label:string){const option=document.createElement('option');option.value=value;option.textContent=label;this.selectEl.append(option);return this;}
    addOptions(values:Record<string,string>){for(const [value,label]of Object.entries(values))this.addOption(value,label);return this;}
    setValue(value:string){this.selectEl.value=value;return this;}getValue(){return this.selectEl.value;}
    onChange(callback:(value:string)=>unknown){this.selectEl.addEventListener('change',()=>safe(callback)(this.getValue()));return this;}
    setDisabled(disabled:boolean){super.setDisabled(disabled);this.selectEl.disabled=disabled;return this;}
  }
  class ToggleComponent extends ValueComponent {
    toggleEl:HTMLInputElement;constructor(parent:HTMLElement){super();this.toggleEl=element('input',parent) as HTMLInputElement;this.toggleEl.type='checkbox';this.toggleEl.setAttribute('role','switch');}
    setValue(value:boolean){this.toggleEl.checked=value;return this;}getValue(){return this.toggleEl.checked;}
    onChange(callback:(value:boolean)=>unknown){this.toggleEl.addEventListener('change',()=>safe(callback)(this.getValue()));return this;}
    setDisabled(disabled:boolean){super.setDisabled(disabled);this.toggleEl.disabled=disabled;return this;}
  }
  class ButtonComponent extends BaseComponent {
    buttonEl:HTMLButtonElement;constructor(parent:HTMLElement){super();this.buttonEl=element('button',parent) as HTMLButtonElement;}
    setButtonText(text:string){this.buttonEl.textContent=text;return this;}setTooltip(text:string){this.buttonEl.title=text;this.buttonEl.setAttribute('aria-label',text);return this;}
    setCta(){this.buttonEl.classList.add('primary');return this;}setWarning(){this.buttonEl.classList.add('danger-text');return this;}
    onClick(callback:(event:MouseEvent)=>unknown){this.buttonEl.addEventListener('click',safe(callback));return this;}
    setDisabled(disabled:boolean){super.setDisabled(disabled);this.buttonEl.disabled=disabled;return this;}
    setIcon(icon:string){setIcon(this.buttonEl,icon);return this;}
  }
  class SliderComponent extends ValueComponent {
    sliderEl:HTMLInputElement;constructor(parent:HTMLElement){super();this.sliderEl=element('input',parent) as HTMLInputElement;this.sliderEl.type='range';}
    setLimits(min:number,max:number,step:number){Object.assign(this.sliderEl,{min:String(min),max:String(max),step:String(step)});return this;}
    setValue(value:number){this.sliderEl.value=String(value);return this;}getValue(){return Number(this.sliderEl.value);}
    onChange(callback:(value:number)=>unknown){this.sliderEl.addEventListener('input',()=>safe(callback)(this.getValue()));return this;}
    setDisabled(disabled:boolean){super.setDisabled(disabled);this.sliderEl.disabled=disabled;return this;}
  }
  class SettingPage extends Component {
    containerEl=element('div',undefined,'plugin-settings-page');
    display(){}hide(){this.containerEl.remove();}
  }
  class AbstractInputSuggest {
    limit=50;suggestionEl:HTMLElement|undefined;
    constructor(public app:any,public inputEl:HTMLInputElement){this.inputEl.addEventListener('input',()=>this.open());}
    setValue(value:string){this.inputEl.value=value;this.inputEl.dispatchEvent(new Event('input'));}
    getSuggestions(_query:string):unknown[]{return [];}
    renderSuggestion(value:unknown,el:HTMLElement){el.textContent=String(value);}
    selectSuggestion(value:unknown){this.setValue(String(value));this.close();}
    open(){this.close();const items=this.getSuggestions(this.inputEl.value)?.slice(0,this.limit)??[];if(!items.length)return this;const container=element('div',document.body,'suggestion-container');const rect=this.inputEl.getBoundingClientRect();container.style.left=rect.left+'px';container.style.top=(rect.bottom+4)+'px';for(const item of items){const button=element('button',container,'suggestion-item');this.renderSuggestion(item,button);button.addEventListener('mousedown',event=>{event.preventDefault();this.selectSuggestion(item);});}this.suggestionEl=container;return this;}
    close(){this.suggestionEl?.remove();this.suggestionEl=undefined;return this;}
  }
  /** Match a fuzzy query against text; the bounded version is a case-insensitive contains check. */
  const prepareFuzzySearch=(query:string)=>(text:string)=>{const needle=query.toLowerCase(),haystack=text.toLowerCase(),start=haystack.indexOf(needle);return start<0?null:{score:1/(start+1),matches:[{start,end:start+needle.length}]};};
  const Platform={isMobile:false,isPhone:false,isTablet:false,isDesktop:true,isDesktopApp:!!window.engine?.desktop,isMobileApp:false,isMacOS:/Mac/i.test(navigator.platform),isWin:/Win/i.test(navigator.platform),isLinux:/Linux/i.test(navigator.platform),isIos:false,isAndroid:false};

  class Setting {
    settingEl:HTMLElement;infoEl:HTMLElement;nameEl:HTMLElement;descEl:HTMLElement;controlEl:HTMLElement;components:any[]=[];
    constructor(parent:HTMLElement){this.settingEl=element('div',parent,'setting-item');this.infoEl=element('div',this.settingEl,'setting-item-info');this.nameEl=element('div',this.infoEl,'setting-item-name');this.descEl=element('div',this.infoEl,'setting-item-description');this.controlEl=element('div',this.settingEl,'setting-item-control');}
    setName(text:string|DocumentFragment){this.nameEl.replaceChildren(typeof text==='string'?document.createTextNode(text):text);return this;}
    setDesc(text:string|DocumentFragment){this.descEl.replaceChildren(typeof text==='string'?document.createTextNode(text):text);return this;}
    setClass(name:string){this.settingEl.classList.add(name);return this;}setHeading(){this.settingEl.classList.add('setting-item-heading');return this;}
    setTooltip(text:string){this.settingEl.title=text;return this;}setDisabled(disabled:boolean){for(const c of this.components)c.setDisabled(disabled);return this;}
    then(callback:(setting:this)=>void){callback(this);return this;}clear(){this.controlEl.replaceChildren();this.components=[];return this;}
    private add(Constructor:any,callback:(component:any)=>void){const c=new Constructor(this.controlEl);this.components.push(c);callback(c);(c.inputEl||c.selectEl||c.toggleEl||c.sliderEl)?.setAttribute('aria-label',this.nameEl.textContent||'Plugin control');return this;}
    addText(callback:any){return this.add(TextComponent,callback);}addTextArea(callback:any){return this.add(TextAreaComponent,callback);}
    addDropdown(callback:any){return this.add(DropdownComponent,callback);}addToggle(callback:any){return this.add(ToggleComponent,callback);}
    addButton(callback:any){return this.add(ButtonComponent,callback);}addSlider(callback:any){return this.add(SliderComponent,callback);}
    addExtraButton(){return unsupported('Setting.addExtraButton');}addColorPicker(){return unsupported('Setting.addColorPicker');}
    addSearch(){return unsupported('Setting.addSearch');}addMomentFormat(){return unsupported('Setting.addMomentFormat');}
    addProgressBar(){return unsupported('Setting.addProgressBar');}addComponent(){return unsupported('Setting.addComponent');}
  }
  class SettingTab {
    containerEl=element('div',undefined,'plugin-settings-content');app:any;icon='settings';constructor(app:any){this.app=app;}
    display(){this.renderDeclarative();}
    hide(){this.containerEl.replaceChildren();}
    /** Re-render declarative settings after a value change. */
    update(){this.renderDeclarative();}
    /** Render the bounded subset of Obsidian's declarative setting definitions. */
    renderDeclarative(){
      const definitions=(this as any).getSettingDefinitions?.();
      if(!Array.isArray(definitions))return;
      this.containerEl.replaceChildren();this.renderDefinitions(this.containerEl,definitions);
    }
    private renderDefinitions(container:HTMLElement,definitions:any[]){
      for(const definition of definitions){
        if(!definition)continue;
        try{if(typeof definition.visible==='function'&&!definition.visible.call(this))continue;}catch(error){console.error(error);continue;}
        if(definition.type==='group'){
          if(definition.heading)create(container,'h3',{text:String(definition.heading)});
          this.renderDefinitions(container,definition.items||[]);continue;
        }
        if(definition.type==='page'){
          const section=create(container,'section',{cls:'setting-page'});
          if(definition.name)create(section,'h4',{text:String(definition.name)});
          this.renderDescription(section,definition.desc);
          if(definition.items)this.renderDefinitions(section,definition.items);
          else if(typeof definition.page==='function'){
            try{const result=definition.page.call(this,section);if(Array.isArray(result))this.renderDefinitions(section,result);}catch(error){console.error(error);}
          }
          continue;
        }
        if(definition.type==='list'){this.renderList(container,definition);continue;}
        this.renderItem(container,definition);
      }
    }
    private renderDescription(container:HTMLElement,description:unknown){
      if(typeof description==='string'&&description)create(container,'p',{cls:'setting-item-description',text:description});
      else if(description instanceof Node)container.append(description);
    }
    private renderItem(container:HTMLElement,definition:any){
      if(!definition.name)return;
      const setting=new Setting(container).setName(String(definition.name));
      this.renderDescription(setting.infoEl,definition.desc);
      if(definition.control)this.renderControl(setting,definition.control);
    }
    private renderControl(setting:any,control:any){
      const key=control.key;if(typeof key!=='string')return;
      const current=(this as any).getControlValue?.(key)??(this as any).plugin?.settings?.[key];
      const commit=(value:unknown)=>{void this.changeControl(key,value);};
      if(control.type==='toggle'){
        setting.addToggle((toggle:any)=>{toggle.setValue(Boolean(current));toggle.onChange(commit);});return;
      }
      if(control.type==='dropdown'){
        setting.addDropdown((dropdown:any)=>{
          for(const [value,label]of Object.entries(control.options||{}))dropdown.addOption(value,String(label));
          dropdown.setValue(String(current??''));dropdown.onChange(commit);
        });return;
      }
      if(control.type==='text'||control.type==='folder'||control.type==='number'){
        setting.addText((text:any)=>{
          if(control.type==='number')text.inputEl.type='number';
          if(control.placeholder)text.setPlaceholder(String(control.placeholder));
          text.setValue(current==null?'':String(current));
          text.inputEl.addEventListener('change',()=>commit(control.type==='number'?Number(text.getValue()):text.getValue()));
        });return;
      }
    }
    private renderList(container:HTMLElement,definition:any){
      const setting=new Setting(container).setName(String(definition.name||''));
      this.renderDescription(setting.infoEl,definition.desc);
      const list=create(container,'div',{cls:'setting-list'});
      const items=Array.isArray(definition.items)?definition.items:[];
      if(!items.length)create(list,'p',{cls:'setting-item-description',text:String(definition.emptyState||'No items.')});
      else for(const item of items){
        const row=create(list,'div',{cls:'setting-list-item'});
        create(row,'span',{text:String(item?.name??item)});
        if(typeof definition.onDelete==='function'){
          const remove=create(row,'button',{text:'Delete'});
          remove.addEventListener('click',()=>{void Promise.resolve(definition.onDelete(item)).then(()=>this.update()).catch((error:unknown)=>console.error(error));});
        }
      }
      if(definition.addItem?.name&&typeof definition.addItem.action==='function'){
        const add=create(list,'button',{text:String(definition.addItem.name)});
        add.addEventListener('click',()=>{void Promise.resolve(definition.addItem.action.call(this)).then(()=>this.update()).catch((error:unknown)=>console.error(error));});
      }
    }
    private async changeControl(key:string,value:unknown){
      try{
        // setControlValue owns the commit path and may defer it behind a confirmation modal.
        if(typeof (this as any).setControlValue==='function')await (this as any).setControlValue(key,value);
        else await (this as any).commitControlValue?.(key,value);
      }catch(error){console.error(error);this.update();}
    }
  }
  class PluginSettingTab extends SettingTab {plugin:any;constructor(app:any,plugin:any){super(app);this.plugin=plugin;}}
  class Modal {
    app:any;containerEl=element('div',undefined,'modal-backdrop plugin-modal-backdrop');modalEl=element('section',this.containerEl,'modal plugin-modal');titleEl=element('h2',this.modalEl);contentEl=element('div',this.modalEl);shouldRestoreSelection=true;
    private previous:Element|null=null;private callback:(()=>void)|undefined;
    constructor(app:any){this.app=app;this.modalEl.setAttribute('role','dialog');this.modalEl.setAttribute('aria-modal','true');const close=element('button',this.modalEl,'plugin-modal-close');close.textContent='×';close.setAttribute('aria-label','Close plugin modal');close.addEventListener('click',()=>this.close());this.containerEl.addEventListener('click',event=>{if(event.target===this.containerEl)this.close();});
      this.containerEl.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();this.close();}if(event.key==='Tab'){const list=[...this.modalEl.querySelectorAll<HTMLElement>('button,input,select,textarea,[tabindex="0"]')].filter(el=>!el.hasAttribute('disabled'));if(list.length){const i=list.indexOf(document.activeElement as HTMLElement),next=(i+(event.shiftKey?-1:1)+list.length)%list.length;event.preventDefault();list[next].focus();}}});}
    scope=new Scope(scope);
    setTitle(text:string){this.titleEl.textContent=text;this.modalEl.setAttribute('aria-label',text);return this;}
    setContent(content:string|DocumentFragment){this.contentEl.replaceChildren(typeof content==='string'?document.createTextNode(content):content);return this;}
    setCloseCallback(callback:()=>void){this.callback=callback;}
    onOpen(){}onClose(){}
    open(){if(this.containerEl.isConnected)return;this.previous=document.activeElement;document.body.append(this.containerEl);modals.add(this);modalScopes.push(this.scope);safe(()=>this.onOpen())();this.modalEl.setAttribute('aria-label',this.titleEl.textContent||'Plugin modal');this.modalEl.querySelector<HTMLElement>('button,input')?.focus();}
    close(){if(!modals.delete(this))return;const index=modalScopes.lastIndexOf(this.scope);if(index>=0)modalScopes.splice(index,1);this.containerEl.remove();safe(()=>this.onClose())();safe(()=>this.callback?.())();if(this.shouldRestoreSelection&&(this.previous as HTMLElement)?.isConnected)(this.previous as HTMLElement).focus();}
  }
  class ConfirmationModal extends Modal {
    /** Add a footer action button; confirmation actions close the dialog. */
    addButton(callback:(button:ButtonComponent)=>void){
      const footer=element('footer',this.modalEl,'modal-button-container'),button=new ButtonComponent(footer),onClick=button.onClick.bind(button);
      button.onClick=(handler)=>{onClick((event)=>{handler(event);this.close();});return button;};
      callback(button);return this;
    }
    /** Add an acknowledgement checkbox whose callback receives its checked state. */
    addCheckbox(label:string,callback:(checked:boolean)=>void){const wrap=element('label',this.modalEl,'modal-checkbox');const input=element('input',wrap) as HTMLInputElement;input.type='checkbox';wrap.append(document.createTextNode(label));input.addEventListener('change',()=>safe(callback)(input.checked));return this;}
    /** Add a cancel button that closes this dialog. */
    addCancelButton(){return this.addButton(button=>button.setButtonText('Cancel').onClick(()=>this.close()));}
  }
  class FuzzySuggestModal extends Modal {
    inputEl=element('input',this.modalEl,'prompt-input') as HTMLInputElement;
    resultContainerEl=element('div',this.modalEl,'prompt-results');
    limit=50;
    constructor(app:unknown){super(app);this.inputEl.addEventListener('input',()=>this.renderResults(this.inputEl.value));this.inputEl.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();const first=this.resultContainerEl.querySelector<HTMLButtonElement>('button');first?.click();}if(event.key==='Escape'){event.stopPropagation();this.close();}});}
    getItems():unknown[]{return [];}
    getItemText(item:unknown){return String(item);}
    onChooseItem(_item:unknown,_event?:MouseEvent){}
    setPlaceholder(text:string){this.inputEl.placeholder=text;return this;}
    setInstructions(instructions:{command:string;purpose:string}[]){this.inputEl.title=instructions.map(item=>item.command+': '+item.purpose).join('\n');return this;}
    renderResults(query:string){this.resultContainerEl.replaceChildren();const fuzzy=prepareFuzzySearch(query);const items=this.getItems().filter(item=>!query||fuzzy(this.getItemText(item))).slice(0,this.limit);for(const item of items){const button=element('button',this.resultContainerEl,'prompt-result');button.textContent=this.getItemText(item);button.addEventListener('click',event=>{this.onChooseItem(item,event);this.close();});}}
    open(){this.inputEl.value='';this.renderResults('');return super.open();}
  }
  /** Bounded async suggestion picker with keyboard navigation and stale-result isolation. */
  class SuggestModal extends Modal {
    inputEl=element('input',this.modalEl,'prompt-input') as HTMLInputElement;
    resultContainerEl=element('div',this.modalEl,'prompt-results');
    limit=100;
    emptyStateText='No suggestions found.';
    private generation=0;private selected=0;private values:unknown[]=[];
    constructor(app:unknown){
      super(app);
      this.inputEl.addEventListener('input',()=>safe(()=>this.renderResults())());
      this.inputEl.addEventListener('keydown',event=>{
        const buttons=[...this.resultContainerEl.querySelectorAll<HTMLButtonElement>('button')];
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){
          event.preventDefault();if(buttons.length)this.selected=(this.selected+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
          this.markSelection();
        }else if(event.key==='Enter'){event.preventDefault();if(buttons[this.selected])safe(()=>this.selectSuggestion(this.values[this.selected],event))();}
      });
    }
    getSuggestions(_query:string):unknown[]|Promise<unknown[]>{return [];}
    renderSuggestion(value:unknown,el:HTMLElement){el.textContent=String(value);}
    onChooseSuggestion(_value:unknown,_event:MouseEvent|KeyboardEvent){}
    selectSuggestion(value:unknown,event:MouseEvent|KeyboardEvent){this.onChooseSuggestion(value,event);this.close();}
    onNoSuggestion(){this.resultContainerEl.textContent=this.emptyStateText;}
    setPlaceholder(text:string){this.inputEl.placeholder=text;return this;}
    setInstructions(instructions:{command:string;purpose:string}[]){this.inputEl.title=instructions.map(item=>item.command+': '+item.purpose).join('\n');return this;}
    private markSelection(){[...this.resultContainerEl.children].forEach((el,index)=>el.classList.toggle('is-selected',index===this.selected));}
    async renderResults(){
      const generation=++this.generation;this.values=[];this.resultContainerEl.replaceChildren();
      const values=await this.getSuggestions(this.inputEl.value);
      if(generation!==this.generation||!this.containerEl.isConnected)return;
      this.selected=0;this.values=values.slice(0,this.limit);
      if(!values.length){this.onNoSuggestion();return;}
      for(const value of this.values){
        const button=element('button',this.resultContainerEl,'prompt-result');
        this.renderSuggestion(value,button);
        button.addEventListener('click',safe(event=>this.selectSuggestion(value,event)));
      }
      this.markSelection();
    }
    open(){super.open();this.inputEl.value='';safe(()=>this.renderResults())();this.inputEl.focus();}
    close(){this.generation++;super.close();}
  }
  let app:any,nativeMarkdownView:any;
  class DOMEditorSuggest<T=unknown> extends EditorSuggest<T>{
    containerEl=element('div',undefined,'suggestion-container');
    suggestEl=element('div',this.containerEl,'suggestion');
    open(){if(!this.containerEl.isConnected)document.body.append(this.containerEl);}
    close(){this.containerEl.remove();this.context=null;}
  }
  const scope=new Scope(new Scope()),modalScopes:Scope[]=[];
  const keymap=new Keymap(scope,modalScopes);
  const dispatchKey=(event:KeyboardEvent)=>{if(!event.defaultPrevented)try{keymap.dispatch(event);}catch(error){onError(error);}};
  document.addEventListener('keydown',dispatchKey);
  class View extends Component {
    leaf:any;app:any;containerEl:HTMLElement;icon='file';navigation=false;
    constructor(leaf:any){super();this.leaf=leaf;this.app=app;this.containerEl=leaf.containerEl;}
    getViewType():string{return unsupported('View.getViewType abstract');}getDisplayText():string{return unsupported('View.getDisplayText abstract');}
    getIcon(){return this.icon;}getState(){return {};}async setState(_state:any,_result?:any){}getEphemeralState(){return {};}setEphemeralState(){return unsupported('View.setEphemeralState');}
    scope=new Scope(scope);async onOpen(){}async onClose(){}
  }
  class ItemView extends View {
    contentEl:HTMLElement;headerEl:HTMLElement;actionsEl:HTMLElement;
    constructor(leaf:any){super(leaf);this.headerEl=element('div',this.containerEl,'view-header');this.actionsEl=element('div',this.headerEl,'view-actions');this.contentEl=element('div',this.containerEl,'view-content plugin-view-content');}
    addAction(icon:string,title:string,callback:(event:MouseEvent)=>unknown){const button=element('button',this.actionsEl,'clickable-icon view-action');button.setAttribute('type','button');button.setAttribute('aria-label',title);button.title=title;setIcon(button,icon);this.registerDomEvent(button,'click',safe(callback));return button;}
  }
  class FileView extends ItemView {
    file:any=null;navigation=true;allowNoFile=false;
    private transitions:Promise<void>=Promise.resolve();
    private transition(action:()=>Promise<void>){const result=this.transitions.then(action);this.transitions=result.catch(()=>{});return result;}
    getState(){return {file:this.file?.path};}
    getDisplayText(){return this.file?.basename??'No file';}
    setState(state:any){
      const path=state.file;
      return this.transition(async()=>{
        if(!path)return;
        const next=app.vault.getFileByPath(path);if(!next)throw new Error('File not found: '+path);
        if(this.file===next)return;
        if(this.file)await this.onUnloadFile(this.file);
        this.file=next;try{await this.onLoadFile(next);}catch(error){this.file=null;throw error;}
      });
    }
    onClose(){return this.transition(async()=>{if(this.file){await this.onUnloadFile(this.file);this.file=null;}});}
    onLoadFile(_file:any):any{}onUnloadFile(_file:any):any{}
  }
  const retiringTextViews=new WeakSet<TextFileView>();
  class TextFileView extends FileView {
    data='';private storedData='';private version='';private timer:ReturnType<typeof setTimeout>|undefined;
    private writes:Promise<void>=Promise.resolve();
    getViewData():string{return unsupported('TextFileView.getViewData abstract');}
    setViewData(_data:string,_clear:boolean):void{return unsupported('TextFileView.setViewData abstract');}
    clear():void{return unsupported('TextFileView.clear abstract');}
    requestSave=()=>{if(retiringTextViews.has(this))return;clearTimeout(this.timer);this.timer=setTimeout(()=>{this.timer=undefined;void this.save().catch(onSaveError);},2000);};
    async onLoadFile(file:any){
      if(!fileIO)return unsupported('TextFileView versioned storage');
      const note=await fileIO.read(file.path);this.data=note.content;this.storedData=note.content;this.version=note.version;this.setViewData(this.data,true);
    }
    async save(){
      if(retiringTextViews.has(this))return;
      clearTimeout(this.timer);this.timer=undefined;
      const file=this.file;if(!file)return;
      const data=this.getViewData();
      const write=this.writes.then(async()=>{
        if(this.file!==file)throw new Error('Text file changed before save');
        if(data!==this.storedData){
          if(!fileIO||!this.version)return unsupported('TextFileView versioned storage');
          const saved=await fileIO.write(file.path,data,this.version);
          if(this.file===file){if(this.data===this.storedData)this.data=data;this.storedData=data;this.version=saved.version;}
        }
      });
      this.writes=write.catch(()=>{});await write;
    }
    async onUnloadFile(_file:any){if(!retiringTextViews.has(this))await this.save();this.clear();this.data='';}
  }
  class WorkspaceLeaf extends Events {
    id:string=crypto.randomUUID();
    constructor(public placement:'overlay'|'tab'='overlay'){super();}
    containerEl=element('section',undefined,'plugin-view-pane');view:any=null;private ephemeralState:unknown=null;
    async setViewState(state:any,mount?:unknown){if(!state||typeof state.type!=='string')throw new Error('Invalid view state');const factory=factories.get(state.type),parent=mount instanceof HTMLElement?mount:undefined;
      if(mount!=null&&!parent)this.setEphemeralState(mount);
      if(this.view instanceof View&&this.view.getViewType()===state.type){
        await this.view.setState(state.state||{},{history:false});
        if(parent)parent.append(this.containerEl);
        else if(this.placement==='tab'&&typeof state.state?.file==='string'){onOpenView?.(state.type,state.state.file,this.id);await app.workspace.openPath(state.state.file);}
        return;
      }
      if(!factory&&state.type==='markdown'){
        if(typeof state.state?.file!=='string')throw new Error('Markdown view requires a file');
        await this.detachView();leaves.add(this);this.placement='tab';
        if(typeof nativeMarkdownView!=='function')return unsupported('Native Markdown view');
        this.view=new nativeMarkdownView();onOpenView?.(null,state.state.file,this.id);await app.workspace.openPath(state.state.file);return;
      }
      if(!factory)return unsupported('View type '+state.type);
      await this.detachView();this.containerEl.classList.add('workspace-leaf-content');this.containerEl.dataset.type=state.type;this.view=factory(this);if(!(this.view instanceof View)){this.view=null;throw new Error('View factory must return View');}
      try{await this.view.load();await this.view.onOpen();await this.view.setState(state.state||{},{history:false});
        const header=this.view instanceof ItemView?this.view.headerEl:element('header',undefined,'plugin-view-header');header.classList.add('plugin-view-header');if(!header.parentElement)this.containerEl.prepend(header);const title=element('strong',undefined);header.prepend(title);title.textContent=this.view.getDisplayText();if(!parent){const close=element('button',header);close.textContent='×';close.setAttribute('aria-label','Close '+title.textContent);close.addEventListener('click',()=>safe(()=>this.detach())());}
        if(!parent&&this.placement==='tab'&&onOpenView&&typeof state.state?.file==='string'){onOpenView(state.type,state.state.file,this.id);await app.workspace.openPath(state.state.file);}
        else (parent??host('plugin-views')).append(this.containerEl);
      }catch(error){await this.detach();throw error;}
    }
    getViewState(){return {type:this.view?.getViewType(),state:this.view?.getState(),active:this.placement==='tab'?currentLeaf()===this:this.containerEl.isConnected};}
    getEphemeralState(){return this.ephemeralState;}
    setEphemeralState(state:unknown){this.ephemeralState=state;}
    /** Open a vault file in the host's main document area without link parsing. */
    async openFile(file:any,openState?:{active?:boolean;state?:Record<string,unknown>}){
      if(!file||typeof file.path!=='string')throw new Error('Invalid file');
      this.placement='tab';leaves.add(this);
      await this.setViewState({type:extensionViews.get(file.extension?.toLowerCase())??'markdown',state:{...openState?.state,file:file.path},active:openState?.active??true});
    }
    async detachView(){if(this.view){const view=this.view;if(view instanceof View){if(view instanceof TextFileView&&!retiringTextViews.has(view))await view.save();try{await view.unload();}finally{await view.onClose();}}if(this.view===view)this.view=null;}this.containerEl.replaceChildren();}
    async detach(notify=true){const path=viewFilePath(this);await this.detachView();this.containerEl.remove();leaves.delete(this);if(notify&&this.placement==='tab'&&path)onOpenView?.(null,path,this.id);}
  }
  const reusableLeaf=new WorkspaceLeaf();let activatedLeaf:WorkspaceLeaf|null=null;
  /** Normalize string-backed and SDK file-backed views to their current path. */
  function viewFilePath(leaf:WorkspaceLeaf):string|undefined{return typeof leaf.view?.file==='string'?leaf.view.file:leaf.view?.file?.path;}
  /** Prefer an explicitly activated live same-file leaf, then registered and native fallbacks. */
  function currentLeaf():WorkspaceLeaf{const path=app?.workspace.getActiveFile()?.path;if(path&&activatedLeaf&&leaves.has(activatedLeaf)&&viewFilePath(activatedLeaf)===path)return activatedLeaf;return (path?[...leaves].reverse().find(leaf=>viewFilePath(leaf)===path):null)??reusableLeaf;}
  const traceEmbed=(member:string)=>{if((window as unknown as {__ENGINE_TRACE_COMPAT?:string}).__ENGINE_TRACE_COMPAT===id)console.debug('[compat:'+id+'] '+member);};
  /** Original embed factory registry; factories own Component lifecycles, not raw HTML. */
  class EmbeddedSourceBase extends Component {
    revision=0;
    scope=new Scope(scope);
    editor:Editor&{cm?:EditorView};cm:EditorView;
    private localExtensions=new Compartment();
    app:any;containerEl:HTMLElement;owner:any;
    constructor(owner:any,...args:unknown[]){
      super();
      const embedded=owner instanceof MarkdownEmbed;
      this.app=embedded?app:owner;this.containerEl=embedded?owner.contentEl:args[0] as HTMLElement;
      this.owner=embedded?owner:args[1];
      if(!(this.containerEl instanceof HTMLElement))throw new Error('Embedded Markdown editor requires a container');
      const send=(_base:string,text:string,from:number,to:number)=>{this.cm.dispatch({changes:{from:0,to:this.cm.state.doc.length,insert:text},selection:{anchor:from,head:to}});};
      this.editor=new Editor({text:'',from:0,to:0},send);
      this.cm=new EditorView({parent:this.containerEl,state:EditorState.create({extensions:[markdown(),history(),this.localExtensions.of([]),cmKeymap.of([...defaultKeymap,...historyKeymap]),EditorView.contentAttributes.of({'aria-label':'Embedded Markdown editor'}),EditorView.updateListener.of(update=>{if(update.docChanged){this.revision++;this.editor=new Editor({text:update.state.doc.toString(),from:update.state.selection.main.from,to:update.state.selection.main.to},send);this.editor.cm=this.cm;}this.onUpdate(update);})]})});
      this.editor.cm=this.cm;this.register(()=>this.cm.destroy());
      return guardCompatibilityObject(this,'EmbeddedSource',traceEmbed);
    }
    set(text:string){if(typeof text!=='string')throw new Error('Embedded editor text must be a string');if(text!==this.get())this.cm.dispatch({changes:{from:0,to:this.cm.state.doc.length,insert:text},annotations:Transaction.addToHistory.of(false)});}
    get(){return this.cm.state.doc.toString();}
    onload(){this.cm.dispatch({effects:this.localExtensions.reconfigure(this.buildLocalExtensions())});}
    buildLocalExtensions():Extension[]{return [];}
    onUpdate(update:ViewUpdate){if(update.docChanged)this.onChange();}
    onChange(){}
  }
  class EmbeddedSource extends EmbeddedSourceBase {}
  class MarkdownEmbed extends Component {
    scope=new Scope(scope);
    containerEl:HTMLElement;contentEl:HTMLElement;
    editMode:EmbeddedSource|undefined;
    constructor(public context:{containerEl:HTMLElement},public file:any,public subpath=''){super();this.containerEl=context.containerEl;this.contentEl=element('div',this.containerEl,'markdown-embed-content');return guardCompatibilityObject(this,'MarkdownEmbed',traceEmbed);}
    async loadFile(file=this.file){this.file=file;if(!file)return;const markdown=await app.vault.read(file);this.contentEl.replaceChildren();await createMarkdownRenderer(()=>app).render(app,markdown,this.contentEl,file.path,this);}
    showEditor(){if(this.editMode)this.removeChild(this.editMode);this.contentEl.replaceChildren();const editor=this.editMode=this.addChild(new EmbeddedSource(this)),version=editor.revision;if(this.file)void app.vault.read(this.file).then((text:string)=>{if(this.editMode===editor&&editor.revision===version)editor.set(text);}).catch(onError);}
    showPreview(){if(this.editMode)this.removeChild(this.editMode);this.editMode=undefined;void this.loadFile().catch(onError);}
    async onload(){await this.loadFile();}
    onunload(){this.contentEl.remove();}
  }
  type EmbedCreator=(context:{containerEl:HTMLElement},file:any,subpath?:string)=>Component;
  const embedByExtension:Record<string,EmbedCreator>={md:(context,file,subpath)=>new MarkdownEmbed(context,file,subpath)};
  const embedRegistry={
    embedByExtension,
    registerExtension(extension:string,creator:EmbedCreator){if(typeof extension!=='string'||!extension||typeof creator!=='function')throw new Error('Invalid embed registration');embedByExtension[extension.replace(/^\./,'').toLowerCase()]=creator;},
    unregisterExtension(extension:string){delete embedByExtension[extension.replace(/^\./,'').toLowerCase()];},
    registerExtensions(extensions:string[],creator:EmbedCreator){for(const extension of extensions)this.registerExtension(extension,creator);},
    unregisterExtensions(extensions:string[]){for(const extension of extensions)this.unregisterExtension(extension);},
    isExtensionRegistered(extension:string){return Object.hasOwn(embedByExtension,extension.replace(/^\./,'').toLowerCase());},
    getEmbedCreator(file:any){return embedByExtension[file.extension?.toLowerCase()]??null;}
  };
  const menus=new Set<Menu>();
  const registerHoverSource=(id:string,source:{display:string;defaultMod:boolean})=>{
    if(typeof id!=='string'||!id||!source||typeof source.display!=='string'||typeof source.defaultMod!=='boolean')throw new Error('Invalid hover link source');
    hoverSources.set(id,{...source});return()=>{hoverSources.delete(id);};
  };
  class OwnedMenuItem extends MenuItem {setSubmenu():Menu{return this.submenu??=new OwnedMenu();}}
  class OwnedMenu extends Menu {
    protected createItem(){return new OwnedMenuItem();}
    addItem(callback:(item:MenuItem)=>void){return super.addItem(item=>{callback(item);if(item.callback)item.callback=safe(item.callback);});}
    onHide(callback:()=>void){return super.onHide(safe(callback));}
    showAtPosition(position:{x:number;y:number}){super.showAtPosition(position);menus.add(this);return this;}
    hide(){try{super.hide();}finally{menus.delete(this);}}
  }
  return {
    setApp(value:any){app=value;nativeMarkdownView=reusableLeaf.view?.constructor;},
    scope,keymap,
    reportError:onError,
    embedRegistry,
    exports:{Modal,ConfirmationModal,SettingTab,PluginSettingTab,SettingPage,Setting,BaseComponent,ValueComponent,AbstractTextComponent,TextComponent,TextAreaComponent,DropdownComponent,ToggleComponent,ButtonComponent,SliderComponent,View,ItemView,FileView,TextFileView,WorkspaceLeaf,EditorSuggest:DOMEditorSuggest,AbstractInputSuggest,SuggestModal,FuzzySuggestModal,Keymap,Scope,BasesView,QueryController,MarkdownRenderChild,MarkdownRenderer:createMarkdownRenderer(()=>app),editorLivePreviewField,editorInfoField,Platform,prepareFuzzySearch,Menu:OwnedMenu,MenuItem,addIcon,getIcon,getIconIds,setIcon,
      setTooltip:(el:HTMLElement,text:string)=>{el.title=text;el.setAttribute('aria-label',text);}},
    /** Bind reading post-processors to this plugin's error and lifecycle ownership. */
    postProcessor(callback:any,sortOrder?:number){if(processorsStopped)throw new Error('Plugin Markdown processors are stopped');return ownProcessor(registerPostProcessor(callback,sortOrder,onError));},
    /** Bind named code-block handlers to the same reading registry. */
    codeProcessor(language:string,callback:any,sortOrder?:number){if(processorsStopped)throw new Error('Plugin Markdown processors are stopped');return ownProcessor(registerCodeProcessor(language,callback,sortOrder,onError));},
    /** Atomically deactivate this plugin's processors before runtime resource cleanup. */
    async stopProcessors(){processorsStopped=true;await stopProcessors(processors);processors.clear();},
    workspace:{
      requestSaveLayout(){if(!onSaveLayout)unsupported('Workspace.requestSaveLayout');void onSaveLayout!().catch(onSaveError);},
      floatingSplit:{children:[]},
      get containerEl(){return document.querySelector('main')??document.body;},
      getMostRecentLeaf(){return currentLeaf();},
      unregisterHoverLinkSource(source:string){hoverSources.delete(source);},
      registerHoverLinkSource:registerHoverSource,
      get activeLeaf(){leaves.add(reusableLeaf);return currentLeaf();},
      getLeafById(leafId:string){return [...leaves].find(leaf=>leaf.id===leafId)??null;},
      getRightLeaf(split?:boolean){if(split)return unsupported('Workspace.getRightLeaf split');const leaf=new WorkspaceLeaf();leaves.add(leaf);return leaf;},getLeaf(newLeaf?:boolean|string){if(newLeaf===false||newLeaf===undefined){leaves.add(reusableLeaf);const leaf=currentLeaf();leaf.placement='tab';return leaf;}if(newLeaf!==true&&newLeaf!=='tab')return unsupported('Workspace.getLeaf split/window');const leaf=new WorkspaceLeaf('tab');leaves.add(leaf);return leaf;},
      getUnpinnedLeaf(){const leaf=new WorkspaceLeaf('tab');leaves.add(leaf);return leaf;},getLeavesOfType(type:string){return [...leaves].filter(l=>l.view?.getViewType()===type);},iterateAllLeaves(callback:(leaf:any)=>void){for(const leaf of [...leaves])callback(leaf);},
      async detachLeavesOfType(type:string){await Promise.all([...leaves].filter(l=>l.view?.getViewType()===type).map(l=>l.detach()));},
      async setActiveLeaf(leaf:WorkspaceLeaf,options?:{focus?:boolean}){if(!leaves.has(leaf))throw new Error('Foreign leaf');const path=viewFilePath(leaf),previous=app.workspace.getActiveFile()?.path;
        if(path){const before=activatedLeaf;activatedLeaf=leaf;try{await app.workspace.openPath(path);}catch(error){activatedLeaf=before;throw error;}if(leaf.placement==='tab')onOpenView?.(factories.has(leaf.view.getViewType())?leaf.view.getViewType():null,path,leaf.id);if(previous===path)app.workspace.trigger('active-leaf-change',leaf);}
        if(options?.focus!==false){const target=leaf.view?.contentEl??leaf.containerEl;target.setAttribute('tabindex','-1');target.focus();}},
      async revealLeaf(leaf:WorkspaceLeaf){if(!leaves.has(leaf))throw new Error('Foreign leaf');if(leaf.placement==='tab'&&leaf.view?.file)await this.setActiveLeaf(leaf);else{host('plugin-views').append(leaf.containerEl);leaf.containerEl.scrollIntoView({block:'nearest'});}}
    },
    statusBar(){const el=element('span',host('plugin-status'),'plugin-status-item');el.dataset.plugin=id;resources.add(el);return el;},
    ribbonIcon(icon:string,title:string,callback:(event:MouseEvent)=>void){
      if(typeof icon!=='string'||!icon||typeof title!=='string'||!title||typeof callback!=='function')throw new Error('Invalid ribbon icon');
      const el=element('button',host('plugin-ribbon'),'plugin-ribbon-item');
      el.dataset.icon=icon;el.title=title;el.setAttribute('aria-label',title);
      const glyph=element('span',el,'plugin-ribbon-glyph');glyph.textContent=title.trim().slice(0,1).toUpperCase()||'?';
      el.addEventListener('click',safe(callback));resources.add(el);return el;
    },
    settingTab(tab:any){if(!(tab instanceof SettingTab))throw new Error('Expected SettingTab');tabs.add(tab);publishTabs();return()=>{tabs.delete(tab);tab.hide();publishTabs();};},
    editorExtension(extension:unknown){extensions.push(extension);onExtensions([...extensions]);return()=>{const i=extensions.indexOf(extension);if(i>=0)extensions.splice(i,1);onExtensions([...extensions]);};},
    updateOptions(){onExtensions([...extensions]);},
    registerView(type:string,factory:(leaf:any)=>any){if(typeof type!=='string'||!type||typeof factory!=='function')throw new Error('Invalid view registration');if(factories.has(type))throw new Error('View already registered');factories.set(type,factory);return()=>{factories.delete(type);};},
    editorSuggest(suggest:EditorSuggest<any>){
      if(!(suggest instanceof EditorSuggest))throw new Error('Expected EditorSuggest');
      suggests.add(suggest);
      return()=>{suggests.delete(suggest);suggest.close();};
    },
    /** Query registered editor suggests against the current document text and position. */
    async queryEditorSuggest(text:string,pos:number){
      const file=app?.workspace?.getActiveFile?.()??null;
      for(const suggest of suggests){
        const editor=new Editor({text,from:pos,to:pos},(base,next,from,to)=>applyEditorEdit?applyEditorEdit(base,next,from,to):Promise.reject(new Error('Editor edits unavailable')));
        const trigger=suggest.onTrigger(editor.getCursor(),editor,file);
        if(!trigger)continue;
        const start=editor.posToOffset(trigger.start),end=editor.posToOffset(trigger.end);
        suggest.context={editor,file,query:typeof trigger.query==='string'?trigger.query:editor.getValue().slice(start,end),start:trigger.start,end:trigger.end};
        const items=await suggest.getSuggestions(suggest.context);
        if(!suggests.has(suggest)||app?.workspace?.getActiveFile?.()?.path!==file?.path)return null;
        return {from:start,options:(items??[]).slice(0,suggest.limit||50).map((item:any)=>{const rendered=element('div');suggest.renderSuggestion(item,rendered);return {label:rendered.textContent||suggest.getSuggestionDisplayText(item),detail:'',apply:()=>{suggest.selectSuggestion(item,new MouseEvent('click'));}};})};
      }
      return null;
    },
    protocolHandler(action:string,handler:(params:Record<string,string>)=>unknown){
      if(typeof action!=='string'||!action||typeof handler!=='function')throw new Error('Invalid protocol handler');
      protocolHandlers.set(action,handler);
      return()=>{if(protocolHandlers.get(action)===handler)protocolHandlers.delete(action);};
    },
    /** Dispatch an obsidian://action?... URL to the registered handler. */
    async dispatchProtocol(url:string){
      let parsed:URL;try{parsed=new URL(url);}catch{return false;}
      if(parsed.protocol!=='obsidian:')return false;
      const action=parsed.hostname||parsed.pathname.replace(/^\//,'');
      const handler=protocolHandlers.get(action);if(!handler)return false;
      const params:Record<string,string>={action};
      for(const [key,value]of parsed.searchParams)params[key]=value;
      await handler(params);return true;
    },
    hoverSources(){return [...hoverSources.keys()];},
    hoverLinkSource:registerHoverSource,
    basesView(id:string,factory:(controller:QueryController)=>unknown){
      if(typeof id!=='string'||!id||typeof factory!=='function')throw new Error('Invalid Bases view');
      if(['table','cards','list'].includes(id))throw new Error('Reserved Bases view id: '+id);
      basesFactories.set(id,factory);
      return()=>{if(basesFactories.get(id)===factory)basesFactories.delete(id);};
    },
    basesViews(){return [...basesFactories.keys()];},
    /** Mount a plugin Bases view into the provided container. */
    mountBasesView(id:string,container:HTMLElement,config:unknown){
      const factory=basesFactories.get(id);if(!factory)throw new Error('Bases view not registered: '+id);
      const controller=new QueryController(app,id,config);
      const view=factory(controller) as {render(container:HTMLElement):void;onload?():void;onunload?():void};
      if(!view||typeof view.render!=='function')throw new Error('Bases factory must return a view with render');
      try{view.onload?.();view.render(container);}
      catch(error){try{view.onunload?.();}finally{container.replaceChildren();}throw error;}
      return {dispose:()=>{try{view.onunload?.();}finally{container.replaceChildren();}}};
    },
    registerExtensions(extensions:string[],viewType:string){
      if(!Array.isArray(extensions)||!extensions.length||extensions.some(extension=>typeof extension!=='string'||!/^\.?[a-z0-9][a-z0-9_-]*$/i.test(extension)))throw new Error('Invalid extensions');
      if(typeof viewType!=='string'||!viewType)throw new Error('Invalid view type');
      if(!factories.has(viewType))throw new Error('View type not registered: '+viewType);
      const normalized=extensions.map(extension=>extension.replace(/^\./,'').toLowerCase());
      for(const extension of normalized)extensionViews.set(extension,viewType);
      onFileExtensions?.(normalized,viewType);
      return()=>{for(const extension of normalized)if(extensionViews.get(extension)===viewType)extensionViews.delete(extension);onFileExtensions?.(normalized);};
    },
    /** Freeze input, flush every draft, then expose a no-further-save retirement lease. */
    async prepareFileViews(path:string){
      const affected=[...leaves].filter(leaf=>{const file=viewFilePath(leaf);return file===path||file?.startsWith(path+'/');});
      const inert=new Map(affected.map(leaf=>[leaf,leaf.containerEl.inert])),textViews=affected.map(leaf=>leaf.view).filter((view):view is TextFileView=>view instanceof TextFileView);
      const values=new Map(textViews.map(view=>[view,view.getViewData()]));
      const snapshots=affected.map(leaf=>({leaf,state:leaf.getViewState(),parent:leaf.containerEl.parentElement})),attempted=new Set<WorkspaceLeaf>();
      const rollback=()=>{for(const [leaf,value]of inert)leaf.containerEl.inert=value;for(const view of textViews)retiringTextViews.delete(view);};
      try{
        for(const leaf of affected)leaf.containerEl.inert=true;
        for(const view of textViews)await view.save();
        return {seal(){for(const [view,value]of values)if(view.getViewData()!==value)throw new Error('Plugin draft changed during file preparation; retry');for(const view of textViews)retiringTextViews.add(view);},
          async commit(){for(const leaf of affected){if(leaf.view instanceof TextFileView&&leaf.view.getViewData()!==values.get(leaf.view))throw new Error('Plugin draft changed during file retirement; retry');attempted.add(leaf);await leaf.detach(false);}},
          async restore(){const closed=snapshots.filter(({leaf})=>attempted.has(leaf)),errors:unknown[]=[];for(const {leaf}of closed){leaf.view=null;leaf.containerEl.replaceChildren();leaves.add(leaf);}for(const {leaf,state,parent}of closed)try{await leaf.setViewState(state,leaf.placement==='tab'?(parent??document.createElement('div')):undefined);attempted.delete(leaf);}catch(error){errors.push(error);}if(errors.length)throw new AggregateError(errors,'Some plugin leaves could not be restored');},
          rollback};
      }catch(error){rollback();throw error;}
    },
    async mountView(viewType:string,path:string,parent:HTMLElement,leafId?:string){
      if(!factories.has(viewType))throw new Error('View type not registered: '+viewType);
      let leaf=leafId?[...leaves].find(leaf=>leaf.id===leafId):undefined;
      leaf??=new WorkspaceLeaf('tab');if(leafId)leaf.id=leafId;
      const token=Symbol('view mount');viewMounts.set(leaf,token);leaves.add(leaf);
      if(leaf.view?.getViewType()===viewType&&viewFilePath(leaf)===path)parent.append(leaf.containerEl);
      else await leaf.setViewState({type:viewType,state:{file:path}},parent);
      const mounted=leaf;
      return {element:mounted.containerEl,dispose:()=>{queueMicrotask(()=>{if(viewMounts.get(mounted)!==token)return;viewMounts.delete(mounted);void mounted.detach(false).catch(onSaveError);});}};
    },
    /** Dispose processor children, visible UI and editor registrations after owner stop. */
    async dispose(){document.removeEventListener('keydown',dispatchKey);for(const menu of [...menus])menu.hide();menus.clear();processorsStopped=true;await stopProcessors(processors);processors.clear();for(const modal of modals)modal.close();for(const leaf of [...leaves])await leaf.detach(false);for(const el of resources)el.remove();for(const tab of tabs)tab.hide();tabs.clear();for(const suggest of suggests)suggest.close();suggests.clear();protocolHandlers.clear();hoverSources.clear();basesFactories.clear();extensions.splice(0);onTabs([]);onExtensions([]);}
  };
}
