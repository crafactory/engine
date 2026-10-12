/* Original renderer registry, based only on public behavioral documentation. */
import {Component,unsupported} from './compat-core';
import {frontmatter} from './knowledge';

export class MarkdownRenderChild extends Component {
  constructor(readonly containerEl:HTMLElement) { super(); }
}

export interface ProcessorContext {
  docId:string;
  sourcePath:string;
  frontmatter:Record<string,unknown>|null;
  addChild(child:MarkdownRenderChild):void;
  getSectionInfo(element:HTMLElement):null;
}
export type PostProcessor=((element:HTMLElement,context:ProcessorContext)=>void|Promise<void>)&{sortOrder?:number};
export type CodeProcessor=(source:string,element:HTMLElement,context:ProcessorContext)=>void|Promise<void>;
interface Registration {
  callback:PostProcessor;
  active:boolean;
  sequence:number;
  onError:(error:unknown)=>void;
}
interface ChildRecord {
  child:MarkdownRenderChild;
  registration:Registration;
  ready:Promise<void>;
  closing?:Promise<void>;
}
const registrations=new Set<Registration>();
const sessions=new Set<RenderSession>();
const listeners=new Set<()=>void>();
const contextActivity=new WeakMap<ProcessorContext,()=>boolean>();
const childOwners=new WeakMap<MarkdownRenderChild,RenderSession>();
let revision=0,sequence=0;
export const getProcessorRevision=()=>revision;
export function subscribeProcessors(listener:()=>void) {
  listeners.add(listener);
  return ()=>{listeners.delete(listener);};
}
function changed() {
  revision++;
  for(const listener of listeners)listener();
}
function report(registration:Registration,error:unknown) {
  // Reporting one plugin must not prevent cleanup of unrelated registrations.
  try { registration.onError(error); } catch (secondary) { console.error(secondary); }
}
export function registerPostProcessor(callback:PostProcessor,sortOrder:number|undefined,onError:(error:unknown)=>void) {
  if(typeof callback!=='function'||sortOrder!==undefined&&!Number.isFinite(sortOrder))throw new TypeError('Invalid Markdown post processor');
  if(sortOrder!==undefined)callback.sortOrder=sortOrder;
  const registration:Registration={callback,active:true,sequence:++sequence,onError};
  registrations.add(registration);
  changed();
  let disposal:Promise<void>|undefined;
  const deactivate=()=>{
    if(!registration.active)return false;
    registration.active=false;
    registrations.delete(registration);
    return true;
  };
  return {
    processor:callback,
    deactivate,
    dispose() {
      if(deactivate())changed();
      return disposal??=Promise.all([...sessions].map(session=>session.removeRegistration(registration))).then(()=>{});
    }
  };
}
export async function stopProcessors(entries:Iterable<ReturnType<typeof registerPostProcessor>>) {
  const batch=[...entries];
  let didChange=false;
  for(const entry of batch)if(entry.deactivate())didChange=true;
  if(didChange)changed();
  await Promise.all(batch.map(entry=>entry.dispose()));
}
export function registerCodeProcessor(language:string,callback:CodeProcessor,sortOrder:number|undefined,onError:(error:unknown)=>void) {
  if(!/^[a-zA-Z0-9][\w-]*$/.test(language)||typeof callback!=='function')throw new TypeError('Invalid Markdown code processor');
  const post:PostProcessor=async(element,context)=>{
    const codes=[...element.querySelectorAll<HTMLElement>('pre > code')].filter(code=>code.classList.contains('language-'+language));
    for(const code of codes) {
      if(contextActivity.get(context)?.()===false)break;
      const pre=code.parentElement;
      if(!pre||!element.contains(pre))continue;
      const source=code.textContent||'';
      const container=document.createElement('div');
      container.className='plugin-code-block';
      pre.replaceWith(container);
      await callback(source,container,context);
    }
  };
  return registerPostProcessor(post,sortOrder,onError);
}

export class RenderSession {
  private active=true;
  private children=new Set<ChildRecord>();
  private connected:boolean;
  private observer:MutationObserver;
  private closePromise:Promise<void>|undefined;
  private docId=crypto.randomUUID();
  constructor(private root:HTMLElement,private markdown:string,private sourcePath:string) {
    this.connected=root.isConnected;
    this.observer=new MutationObserver(()=>this.reconcile());
    this.observer.observe(root,{childList:true,subtree:true});
    this.observer.observe(document.documentElement,{childList:true,subtree:true});
    sessions.add(this);
  }
  private reconcile() {
    if(this.root.isConnected)this.connected=true;
    if(this.connected&&!this.root.isConnected){void this.close();return;}
    for(const record of this.children)if(!this.root.contains(record.child.containerEl))void this.closeChild(record);
  }
  private closeChild(record:ChildRecord):Promise<void> {
    return record.closing??=(async()=>{
      await record.ready;
      try { await record.child.unload(); } catch(error) { report(record.registration,error); }
      this.children.delete(record);
      if(childOwners.get(record.child)===this)childOwners.delete(record.child);
    })();
  }
  async removeRegistration(registration:Registration) {
    await Promise.all([...this.children].filter(record=>record.registration===registration).map(record=>this.closeChild(record)));
  }
  private context(registration:Registration):ProcessorContext {
    const parsed=frontmatter(this.markdown);
    const context:ProcessorContext={
      docId:this.docId,sourcePath:this.sourcePath,frontmatter:parsed.error||!parsed.raw?null:parsed.properties,
      // Exact source-section mapping is not yet implemented; documented callers must handle null.
      getSectionInfo:()=>null,
      addChild:child=>{
        if(!(child instanceof MarkdownRenderChild))throw new TypeError('Expected MarkdownRenderChild');
        if(!this.active||!registration.active){void child.unload().catch(error=>report(registration,error));return;}
        if([...this.children].some(record=>record.child===child))throw new Error('Child already registered');
        if(childOwners.has(child))throw new Error('Child belongs to another render session');
        const record:ChildRecord={child,registration,ready:Promise.resolve()};
        this.children.add(record);
        childOwners.set(child,this);
        record.ready=child.load().catch(error=>report(registration,error));
        void record.ready.then(()=>{if(!this.active||!registration.active)void this.closeChild(record);});
      }
    };
    contextActivity.set(context,()=>this.active&&registration.active);
    return context;
  }
  async run() {
    const ordered=[...registrations].sort((a,b)=>(a.callback.sortOrder||0)-(b.callback.sortOrder||0)||a.sequence-b.sequence);
    for(const registration of ordered) {
      if(!this.active)break;
      if(!registration.active)continue;
      try { await registration.callback(this.root,this.context(registration)); }
      catch(error) { report(registration,error); }
    }
    await Promise.all([...this.children].map(record=>record.ready));
    this.reconcile();
  }
  close():Promise<void> {
    return this.closePromise??=(async()=>{
      this.active=false;
      this.observer.disconnect();
      await Promise.all([...this.children].map(record=>this.closeChild(record)));
      sessions.delete(this);
    })();
  }
}
export function processMarkdown(root:HTMLElement,markdown:string,sourcePath:string) {
  const session=new RenderSession(root,markdown,sourcePath);
  return {ready:session.run(),close:()=>session.close()};
}

export function createMarkdownRenderer(getApp:()=>unknown) {
  return class MarkdownRenderer extends MarkdownRenderChild {
    static async render(app:unknown,markdown:string,element:HTMLElement,sourcePath:string,component:Component) {
      if(app!==getApp())throw new Error('Foreign application');
      if(!(element instanceof HTMLElement)||!(component instanceof Component)||typeof markdown!=='string'||typeof sourcePath!=='string')throw new TypeError('Invalid Markdown render arguments');
      // Nested static rendering is sanitized; automatic recursive processors are deliberately unsupported.
      let disposed=false,container:HTMLElement|undefined;
      component.register(()=>{disposed=true;container?.remove();});
      const {renderMarkdown}=await import('./Markdown');
      if(disposed)return;
      container=document.createElement('div');
      container.className='markdown';
      container.innerHTML=renderMarkdown(markdown);
      element.append(container);
    }
    static async renderMarkdown(markdown:string,element:HTMLElement,sourcePath:string,component:Component) {
      return this.render(getApp(),markdown,element,sourcePath,component);
    }
    get file():never { return unsupported('MarkdownRenderer.file abstract'); }
    get app() { return getApp(); }
    get hoverPopover():never { return unsupported('MarkdownRenderer.hoverPopover'); }
  };
}
