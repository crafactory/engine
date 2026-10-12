/* Original renderer registry, based only on public behavioral documentation. */
import {Component,componentLifecycle,unsupported} from './compat-core';
import {frontmatter} from './knowledge';

export class MarkdownRenderChild extends Component {
  /** Preserve the renderer-owned container while inheriting cooperative component cleanup. */
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
/** Return the registry revision used by reading hosts' external-store subscription. */
export const getProcessorRevision=()=>revision;
/** Subscribe React hosts to processor registration changes; return an idempotent removal hook. */
export function subscribeProcessors(listener:()=>void) {
  listeners.add(listener);
  /** Remove this host's subscription without changing processor membership. */
  const unsubscribe=()=>{listeners.delete(listener);};
  return unsubscribe;
}
/** Publish a single revision after registry membership changes. */
function changed() {
  revision++;
  for(const listener of listeners)listener();
}
/** Isolate an owner's error reporter from unrelated session cleanup. */
function report(registration:Registration,error:unknown) {
  // Reporting one plugin must not prevent cleanup of unrelated registrations.
  try { registration.onError(error); } catch (secondary) { console.error(secondary); }
}
/** Register the original callback with stable ordering and owner-scoped disposal. */
export function registerPostProcessor(callback:PostProcessor,sortOrder:number|undefined,onError:(error:unknown)=>void) {
  if(typeof callback!=='function'||sortOrder!==undefined&&!Number.isFinite(sortOrder))throw new TypeError('Invalid Markdown post processor');
  if(sortOrder!==undefined)callback.sortOrder=sortOrder;
  const registration:Registration={callback,active:true,sequence:++sequence,onError};
  registrations.add(registration);
  changed();
  let disposal:Promise<void>|undefined;
  /** Remove registry membership without notifying until an atomic batch is complete. */
  const deactivate=()=>{
    if(!registration.active)return false;
    registration.active=false;
    registrations.delete(registration);
    return true;
  };
  return {
    processor:callback,
    deactivate,
    /** Idempotently publish removal and drain this registration's render children. */
    dispose() {
      if(deactivate())changed();
      return disposal??=Promise.all([...sessions].map(session=>session.removeRegistration(registration))).then(()=>{});
    }
  };
}
/** Deactivate an owner's entire batch before draining any render-child resources. */
export async function stopProcessors(entries:Iterable<ReturnType<typeof registerPostProcessor>>) {
  const batch=[...entries];
  let didChange=false;
  for(const entry of batch)if(entry.deactivate())didChange=true;
  if(didChange)changed();
  await Promise.all(batch.map(entry=>entry.dispose()));
}
/** Replace matching fenced blocks with containers and pass their original text to the handler. */
export function registerCodeProcessor(language:string,callback:CodeProcessor,sortOrder:number|undefined,onError:(error:unknown)=>void) {
  if(!/^[a-zA-Z0-9][\w-]*$/.test(language)||typeof callback!=='function')throw new TypeError('Invalid Markdown code processor');
  /** Visit matching fenced blocks while this context still owns admission authority. */
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

/** Wait at most one second for cooperative work; never claim to interrupt main-thread code. */
async function settlesWithin(promise:Promise<unknown>):Promise<boolean> {
  let timer:ReturnType<typeof setTimeout>|undefined;
  try {
    return await Promise.race([
      promise.then(()=>true,()=>true),
      new Promise<boolean>(resolve=>{timer=setTimeout(()=>resolve(false),1000);})
    ]);
  } finally {if(timer!==undefined)clearTimeout(timer);}
}

/** Own children for one immutable reading root, including canceled and detached roots. */
export class RenderSession {
  private active=true;
  private children=new Set<ChildRecord>();
  private connected:boolean;
  private observer:MutationObserver;
  private closePromise:Promise<void>|undefined;
  private docId=crypto.randomUUID();
  /** Observe root/container removal without observing attributes or plugin text mutations. */
  constructor(private root:HTMLElement,private markdown:string,private sourcePath:string) {
    this.connected=root.isConnected;
    this.observer=new MutationObserver(()=>this.reconcile());
    this.observer.observe(root,{childList:true,subtree:true});
    this.observer.observe(document.documentElement,{childList:true,subtree:true});
    sessions.add(this);
  }
  /** Close detached sessions and remove children whose containers left this root. */
  private reconcile() {
    if(this.root.isConnected)this.connected=true;
    if(this.connected&&!this.root.isConnected){void this.close();return;}
    for(const record of this.children)if(!this.root.contains(record.child.containerEl))void this.closeChild(record);
  }
  /** Bound cooperative startup/unload waits and retain ownership until late startup settles. */
  private closeChild(record:ChildRecord):Promise<void> {
    return record.closing??=(async()=>{
      const ready=await settlesWithin(record.ready);
      /** Report cleanup errors without allowing one owner to abort other children. */
      const unload=()=>Promise.all([record.child.unload(),componentLifecycle(record.child,'shutdown')]).then(()=>{},error=>report(record.registration,error));
      const unloading=unload();
      await settlesWithin(unloading);
      this.children.delete(record);
      // A timed-out child cannot be adopted until both old startup and cleanup settle.
      // Late registered Component resources clean themselves after unload; arbitrary code does not.
      void record.ready.then(async()=>{
        await unloading;
        if(!ready)await unload();
        if(childOwners.get(record.child)===this)childOwners.delete(record.child);
      });
    })();
  }
  /** Drain only children created by this registration, leaving other owners intact. */
  async removeRegistration(registration:Registration) {
    await Promise.all([...this.children].filter(record=>record.registration===registration).map(record=>this.closeChild(record)));
  }
  /** Build bounded whole-host context with unknown section mapping represented by null. */
  private context(registration:Registration):ProcessorContext {
    const parsed=frontmatter(this.markdown);
    const context:ProcessorContext={
      docId:this.docId,sourcePath:this.sourcePath,frontmatter:parsed.error||!parsed.raw?null:parsed.properties,
      /** Return documented nullable unknown rather than fabricating source-section positions. */
      getSectionInfo:()=>null,
      /** Admit an unowned child only while both the owner registration and session are active. */
      addChild:child=>{
        if(!(child instanceof MarkdownRenderChild))throw new TypeError('Expected MarkdownRenderChild');
        // A revoked context has no authority to unload a supplied child, which may have a new owner.
        if(!this.active||!registration.active)return;
        if([...this.children].some(record=>record.child===child))throw new Error('Child already registered');
        if(childOwners.has(child))throw new Error('Child belongs to another render session');
        const record:ChildRecord={child,registration,ready:Promise.resolve()};
        this.children.add(record);
        childOwners.set(child,this);
        record.ready=Promise.all([child.load(),componentLifecycle(child,'startup')]).then(()=>{},error=>report(registration,error));
        void record.ready.then(()=>{if(!this.active||!registration.active)void this.closeChild(record);});
      }
    };
    contextActivity.set(context,()=>this.active&&registration.active);
    return context;
  }
  /** Execute active callbacks in sorted order and await their registered children. */
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
  /** Stop admitting children, disconnect observation and idempotently drain owned resources. */
  close():Promise<void> {
    return this.closePromise??=(async()=>{
      this.active=false;
      this.observer.disconnect();
      await Promise.all([...this.children].map(record=>this.closeChild(record)));
      sessions.delete(this);
    })();
  }
}
/** Start processing one immutable reading root and return its completion/cleanup handles. */
export function processMarkdown(root:HTMLElement,markdown:string,sourcePath:string) {
  const session=new RenderSession(root,markdown,sourcePath);
  return {ready:session.run(),close:()=>session.close()};
}

/** Construct the original static-render adapter bound to this compatibility application. */
export function createMarkdownRenderer(getApp:()=>unknown) {
  return class MarkdownRenderer extends MarkdownRenderChild {
    /** Append sanitized Markdown and remove it with its Component owner; no recursive processors. */
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
    /** Support the legacy static signature through the same bounded safe renderer. */
    static async renderMarkdown(markdown:string,element:HTMLElement,sourcePath:string,component:Component) {
      return this.render(getApp(),markdown,element,sourcePath,component);
    }
    /** Reject the abstract reference file member rather than returning a fake file. */
    get file():never { return unsupported('MarkdownRenderer.file abstract'); }
    /** Return only the application bound to this independently implemented renderer. */
    get app() { return getApp(); }
    /** Reject reference hover state until the corresponding behavior is implemented. */
    get hoverPopover():never { return unsupported('MarkdownRenderer.hoverPopover'); }
  };
}
