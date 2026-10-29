/* Original public-contract adapters. No proprietary SDK or plugin implementation. */
import {Component,Editor,EditorSuggest,unsupported} from './compat-core';
import {MarkdownRenderChild,createMarkdownRenderer,registerPostProcessor,registerCodeProcessor,stopProcessors} from './markdown-plugins';
export const rendererExports=['Modal','SettingTab','PluginSettingTab','Setting','BaseComponent','ValueComponent','AbstractTextComponent','TextComponent','TextAreaComponent','DropdownComponent','ToggleComponent','ButtonComponent','SliderComponent','View','ItemView','WorkspaceLeaf','EditorSuggest','BasesView','QueryController','MarkdownRenderChild','MarkdownRenderer'] as const;
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
const element=(tag:string,parent?:HTMLElement,cls='')=>{const el=document.createElement(tag);el.className=cls;parent?.append(el);return el;};
export function installDomHelpers(){
  const methods:Record<string,Function>={
    empty(this:HTMLElement){this.replaceChildren();},
    setText(this:HTMLElement,text:unknown){this.textContent=String(text);},
    getText(this:HTMLElement){return this.textContent||'';},
    setAttr(this:HTMLElement,key:string,value:string){this.setAttribute(key,value);},
    addClass(this:HTMLElement,...names:string[]){this.classList.add(...names.flatMap(s=>s.split(/\s+/)).filter(Boolean));},
    removeClass(this:HTMLElement,...names:string[]){this.classList.remove(...names.flatMap(s=>s.split(/\s+/)).filter(Boolean));},
    toggleClass(this:HTMLElement,names:string,enabled:boolean){for(const name of names.split(/\s+/).filter(Boolean))this.classList.toggle(name,enabled);},
    show(this:HTMLElement){this.hidden=false;},hide(this:HTMLElement){this.hidden=true;},
    createEl(this:HTMLElement,tag:string,options:any={},callback?:(el:HTMLElement)=>void){
      const el=element(tag,this);if(typeof options==='string')el.className=options;else{
        if(options.cls)el.className=Array.isArray(options.cls)?options.cls.join(' '):options.cls;
        if(options.text!==undefined)el.textContent=String(options.text);
        for(const [key,value]of Object.entries(options.attr||{}))el.setAttribute(key,String(value));
        if(options.type)el.setAttribute('type',options.type);
      }callback?.(el);return el;
    },
    createDiv(this:HTMLElement,options?:any,callback?:any){return methods.createEl.call(this,'div',options,callback);},
    createSpan(this:HTMLElement,options?:any,callback?:any){return methods.createEl.call(this,'span',options,callback);}
  };
  for(const [name,value]of Object.entries(methods))if(!(name in HTMLElement.prototype))Object.defineProperty(HTMLElement.prototype,name,{value,configurable:true,writable:true});
}
/** Create plugin-owned trusted-renderer UI hooks; this adapter is not an isolation boundary. */
export function createDomAdapters(id:string,name:string,onError:(reason:unknown)=>void,onTabs:(tabs:PluginTab[])=>void,onExtensions:(extensions:unknown[])=>void,onFileExtensions?:(extensions:string[],viewType?:string)=>void,applyEditorEdit?:(base:string,text:string,from:number,to:number)=>Promise<unknown>){
  installDomHelpers();
  const resources=new Set<HTMLElement>(),modals=new Set<any>(),tabs=new Set<any>(),extensions:unknown[]=[],factories=new Map<string,(leaf:any)=>any>(),leaves=new Set<any>(),extensionViews=new Map<string,string>(),suggests=new Set<EditorSuggest<any>>(),protocolHandlers=new Map<string,(params:Record<string,string>)=>unknown>(),hoverSources=new Map<string,{display:string;defaultMod:boolean}>(),basesFactories=new Map<string,(controller:QueryController)=>unknown>();
  const processors=new Set<ReturnType<typeof registerPostProcessor>>();
  let processorsStopped=false;
  /** Keep registration handles private to this plugin and remove them after disposal. */
  const ownProcessor=(entry:ReturnType<typeof registerPostProcessor>)=>{processors.add(entry);return {processor:entry.processor,dispose:async()=>{await entry.dispose();processors.delete(entry);}};};
  const host=(name:string)=>{const el=document.getElementById(name);if(!el)throw new Error('Plugin UI host missing: '+name);return el;};
  const publishTabs=()=>onTabs([...tabs].map((t,i)=>({id:id+':'+i,name,containerEl:t.containerEl,display:()=>safe(()=>t.display())(),hide:()=>safe(()=>t.hide())()})));
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
    setButtonText(text:string){this.buttonEl.textContent=text;return this;}setTooltip(text:string){this.buttonEl.title=text;return this;}
    setCta(){this.buttonEl.classList.add('primary');return this;}setWarning(){this.buttonEl.classList.add('danger-text');return this;}
    onClick(callback:(event:MouseEvent)=>unknown){this.buttonEl.addEventListener('click',safe(callback));return this;}
    setDisabled(disabled:boolean){super.setDisabled(disabled);this.buttonEl.disabled=disabled;return this;}
    setIcon(){return unsupported('ButtonComponent.setIcon');}
  }
  class SliderComponent extends ValueComponent {
    sliderEl:HTMLInputElement;constructor(parent:HTMLElement){super();this.sliderEl=element('input',parent) as HTMLInputElement;this.sliderEl.type='range';}
    setLimits(min:number,max:number,step:number){Object.assign(this.sliderEl,{min:String(min),max:String(max),step:String(step)});return this;}
    setValue(value:number){this.sliderEl.value=String(value);return this;}getValue(){return Number(this.sliderEl.value);}
    onChange(callback:(value:number)=>unknown){this.sliderEl.addEventListener('input',()=>safe(callback)(this.getValue()));return this;}
    setDisabled(disabled:boolean){super.setDisabled(disabled);this.sliderEl.disabled=disabled;return this;}
  }
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
  class SettingTab {containerEl=element('div',undefined,'plugin-settings-content');app:any;icon='settings';constructor(app:any){this.app=app;}display(){}hide(){this.containerEl.replaceChildren();}}
  class PluginSettingTab extends SettingTab {plugin:any;constructor(app:any,plugin:any){super(app);this.plugin=plugin;}}
  class Modal {
    app:any;containerEl=element('div',undefined,'modal-backdrop plugin-modal-backdrop');modalEl=element('section',this.containerEl,'modal plugin-modal');titleEl=element('h2',this.modalEl);contentEl=element('div',this.modalEl);shouldRestoreSelection=true;
    private previous:Element|null=null;private callback:(()=>void)|undefined;
    constructor(app:any){this.app=app;this.modalEl.setAttribute('role','dialog');this.modalEl.setAttribute('aria-modal','true');const close=element('button',this.modalEl,'plugin-modal-close');close.textContent='×';close.setAttribute('aria-label','Close plugin modal');close.addEventListener('click',()=>this.close());this.containerEl.addEventListener('click',event=>{if(event.target===this.containerEl)this.close();});
      this.containerEl.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();this.close();}if(event.key==='Tab'){const list=[...this.modalEl.querySelectorAll<HTMLElement>('button,input,select,textarea,[tabindex="0"]')].filter(el=>!el.hasAttribute('disabled'));if(list.length){const i=list.indexOf(document.activeElement as HTMLElement),next=(i+(event.shiftKey?-1:1)+list.length)%list.length;event.preventDefault();list[next].focus();}}});}
    get scope(){return unsupported('Modal.scope');}
    setTitle(text:string){this.titleEl.textContent=text;this.modalEl.setAttribute('aria-label',text);return this;}
    setContent(content:string|DocumentFragment){this.contentEl.replaceChildren(typeof content==='string'?document.createTextNode(content):content);return this;}
    setCloseCallback(callback:()=>void){this.callback=callback;}
    onOpen(){}onClose(){}
    open(){if(this.containerEl.isConnected)return;this.previous=document.activeElement;document.body.append(this.containerEl);modals.add(this);safe(()=>this.onOpen())();this.modalEl.setAttribute('aria-label',this.titleEl.textContent||'Plugin modal');this.modalEl.querySelector<HTMLElement>('button,input')?.focus();}
    close(){if(!modals.delete(this))return;this.containerEl.remove();safe(()=>this.onClose())();safe(()=>this.callback?.())();if(this.shouldRestoreSelection&&(this.previous as HTMLElement)?.isConnected)(this.previous as HTMLElement).focus();}
  }
  let app:any;
  class View extends Component {
    leaf:any;app:any;containerEl:HTMLElement;icon='file';navigation=false;
    constructor(leaf:any){super();this.leaf=leaf;this.app=app;this.containerEl=leaf.containerEl;}
    getViewType(){return unsupported('View.getViewType abstract');}getDisplayText(){return unsupported('View.getDisplayText abstract');}
    getIcon(){return this.icon;}getState(){return {};}async setState(_state:any,_result?:any){}getEphemeralState(){return {};}setEphemeralState(){return unsupported('View.setEphemeralState');}
    get scope(){return unsupported('View.scope');}async onOpen(){}async onClose(){}
  }
  class ItemView extends View {contentEl:HTMLElement;constructor(leaf:any){super(leaf);this.contentEl=element('div',this.containerEl,'plugin-view-content');}addAction(){return unsupported('ItemView.addAction');}}
  class WorkspaceLeaf {
    containerEl=element('section',undefined,'plugin-view-pane');view:any=null;
    async setViewState(state:any,parent?:HTMLElement){if(!state||typeof state.type!=='string')throw new Error('Invalid view state');const factory=factories.get(state.type);if(!factory)return unsupported('View type '+state.type);
      await this.detachView();this.view=factory(this);if(!(this.view instanceof View)){this.view=null;throw new Error('View factory must return View');}
      try{await this.view.load();await this.view.onOpen();await this.view.setState(state.state||{},{history:false});
        const header=element('header',undefined,'plugin-view-header');this.containerEl.prepend(header);const title=element('strong',header);title.textContent=this.view.getDisplayText();if(!parent){const close=element('button',header);close.textContent='×';close.setAttribute('aria-label','Close '+title.textContent);close.addEventListener('click',()=>safe(()=>this.detach())());}(parent??host('plugin-views')).append(this.containerEl);
      }catch(error){await this.detach();throw error;}
    }
    getViewState(){return {type:this.view?.getViewType(),state:this.view?.getState(),active:this.containerEl.isConnected};}
    async detachView(){if(this.view){const view=this.view;this.view=null;try{await view.onClose();}finally{await view.unload();}}this.containerEl.replaceChildren();}
    async detach(){await this.detachView();this.containerEl.remove();leaves.delete(this);}
  }
  return {
    setApp(value:any){app=value;},
    exports:{Modal,SettingTab,PluginSettingTab,Setting,BaseComponent,ValueComponent,AbstractTextComponent,TextComponent,TextAreaComponent,DropdownComponent,ToggleComponent,ButtonComponent,SliderComponent,View,ItemView,WorkspaceLeaf,EditorSuggest,BasesView,QueryController,MarkdownRenderChild,MarkdownRenderer:createMarkdownRenderer(()=>app)},
    /** Bind reading post-processors to this plugin's error and lifecycle ownership. */
    postProcessor(callback:any,sortOrder?:number){if(processorsStopped)throw new Error('Plugin Markdown processors are stopped');return ownProcessor(registerPostProcessor(callback,sortOrder,onError));},
    /** Bind named code-block handlers to the same reading registry. */
    codeProcessor(language:string,callback:any,sortOrder?:number){if(processorsStopped)throw new Error('Plugin Markdown processors are stopped');return ownProcessor(registerCodeProcessor(language,callback,sortOrder,onError));},
    /** Atomically deactivate this plugin's processors before runtime resource cleanup. */
    async stopProcessors(){processorsStopped=true;await stopProcessors(processors);processors.clear();},
    workspace:{
      getRightLeaf(split?:boolean){if(split)return unsupported('Workspace.getRightLeaf split');const leaf=new WorkspaceLeaf();leaves.add(leaf);return leaf;},getLeaf(newLeaf?:boolean|string){if(newLeaf!==undefined&&newLeaf!==true)return unsupported('Workspace.getLeaf reuse/split');const leaf=new WorkspaceLeaf();leaves.add(leaf);return leaf;},
      getLeavesOfType(type:string){return [...leaves].filter(l=>l.view?.getViewType()===type);},iterateAllLeaves(callback:(leaf:any)=>void){for(const leaf of [...leaves])callback(leaf);},
      async detachLeavesOfType(type:string){await Promise.all([...leaves].filter(l=>l.view?.getViewType()===type).map(l=>l.detach()));},
      async revealLeaf(leaf:any){if(!leaves.has(leaf))throw new Error('Foreign leaf');host('plugin-views').append(leaf.containerEl);leaf.containerEl.scrollIntoView({block:'nearest'});}
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
        const trigger=suggest.onTrigger(editor,editor,file);
        if(!trigger)continue;
        const start=editor.posToOffset(trigger.start),end=editor.posToOffset(trigger.end);
        suggest.context={editor,file,query:editor.getValue().slice(start,end),start:trigger.start,end:trigger.end};
        const items=await suggest.getSuggestions(suggest.context);
        return {from:start,options:(items??[]).slice(0,suggest.limit||50).map((item:any)=>({label:suggest.getSuggestionDisplayText(item),detail:'',apply:()=>{suggest.selectSuggestion(item,new MouseEvent('click'));}}))};
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
    hoverLinkSource(id:string,source:{display:string;defaultMod:boolean}){
      if(typeof id!=='string'||!id||!source||typeof source.display!=='string'||typeof source.defaultMod!=='boolean')throw new Error('Invalid hover link source');
      hoverSources.set(id,{...source});
      return()=>{hoverSources.delete(id);};
    },
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
    /** Mount a registered view into a host element without going through the global plugin view pane. */
    async mountView(viewType:string,path:string,parent:HTMLElement){
      if(!factories.has(viewType))throw new Error('View type not registered: '+viewType);
      const leaf=new WorkspaceLeaf();leaves.add(leaf);
      await leaf.setViewState({type:viewType,state:{file:path}},parent);
      return {element:leaf.containerEl,dispose:()=>{void leaf.detach();}};
    },
    /** Dispose processor children, visible UI and editor registrations after owner stop. */
    async dispose(){processorsStopped=true;await stopProcessors(processors);processors.clear();for(const modal of modals)modal.close();for(const leaf of [...leaves])await leaf.detach();for(const el of resources)el.remove();for(const tab of tabs)tab.hide();tabs.clear();for(const suggest of suggests)suggest.close();suggests.clear();protocolHandlers.clear();hoverSources.clear();basesFactories.clear();extensions.splice(0);onTabs([]);onExtensions([]);}
  };
}
