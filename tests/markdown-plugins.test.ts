import {it,expect,vi} from 'vitest';
import {Component,componentLifecycle} from '../src/compat-core';
import {MarkdownRenderChild,registerPostProcessor,registerCodeProcessor,getProcessorRevision,subscribeProcessors,stopProcessors} from '../src/markdown-plugins';
it('MarkdownRenderChild independently inherits Component and preserves container',()=>{
  const container={} as HTMLElement,child=new MarkdownRenderChild(container);
  expect(child).toBeInstanceOf(Component);expect(child.containerEl).toBe(container);
});
it('processor registration returns the actual callback and disposes idempotently',async()=>{
  const changes:number[]=[],unsubscribe=subscribeProcessors(()=>changes.push(getProcessorRevision()));
  const callback=()=>{},before=getProcessorRevision(),registration=registerPostProcessor(callback,7,()=>{});
  expect(registration.processor).toBe(callback);expect(registration.processor.sortOrder).toBe(7);
  await registration.dispose();await registration.dispose();expect(changes).toEqual([before+1,before+2]);unsubscribe();
});
it('processor validation rejects unsupported language names and invalid sort orders',()=>{
  expect(()=>registerPostProcessor(null as any,0,()=>{})).toThrow('Invalid Markdown post processor');
  expect(()=>registerPostProcessor(()=>{},Infinity,()=>{})).toThrow('Invalid Markdown post processor');
  expect(()=>registerCodeProcessor('bad language',()=>{},0,()=>{})).toThrow('Invalid Markdown code processor');
});
it.each(['throw','reject'])('failed code processors restore original pre before propagating the error: %s',async(kind)=>{
  const failure=new Error('code fixture failure'),parent={},pre:any={},container:any={};
  let current:any=pre;
  pre.parentNode=parent;pre.replaceWith=(next:any)=>{current=next;pre.parentNode=null;next.parentNode=parent;};
  container.replaceWith=(next:any)=>{current=next;container.parentNode=null;next.parentNode=parent;};
  const code={classList:{contains:(name:string)=>name==='language-fixture'},parentElement:pre,textContent:'original bytes\n'};
  const root:any={querySelectorAll:()=>[code],contains:(element:any)=>element===current};
  vi.stubGlobal('document',{createElement:()=>container});
  const registration=registerCodeProcessor('fixture',(source)=>{
    expect(source).toBe('original bytes\n');
    if(kind==='throw')throw failure;
    return Promise.reject(failure);
  },0,()=>{});
  try {
    await expect(registration.processor(root,{docId:'test',sourcePath:'Test.md',frontmatter:null,addChild(){},getSectionInfo:()=>null})).rejects.toBe(failure);
    expect(current).toBe(pre);expect(pre.parentNode).toBe(parent);expect(container.parentNode).toBeNull();
  } finally {await registration.dispose();vi.unstubAllGlobals();}
});
it('owner shutdown atomically deactivates all processors with one revision',async()=>{
  const a=registerPostProcessor(()=>{},0,()=>{}),b=registerCodeProcessor('fixture',()=>{},1,()=>{});
  const before=getProcessorRevision();await stopProcessors([a,b]);expect(getProcessorRevision()).toBe(before+1);
  await a.dispose();await b.dispose();expect(getProcessorRevision()).toBe(before+1);
});
it('Component unload starts all cleanup and awaits completion despite a failing cleanup',async()=>{
  const sequence:string[]=[],component=new Component();await component.load();
  component.register(async()=>{await new Promise(resolve=>setTimeout(resolve,5));sequence.push('last');});
  component.register(async()=>{sequence.push('failure');throw new Error('Fixture cleanup error');});
  component.register(async()=>{await new Promise(resolve=>setTimeout(resolve,5));sequence.push('first');});
  await expect(component.unload()).rejects.toThrow('Fixture cleanup error');expect(sequence).toEqual(['failure','first','last']);
  await component.unload();expect(sequence).toEqual(['failure','first','last']);
});
it('a canceled startup cannot activate children or retain late registered cleanup',async()=>{
  let settle!:()=>void;
  const sequence:string[]=[];
  class Pending extends Component {
    /** Settle canceled startup before attempting late resources that must be revoked. */
    async onload(){await new Promise<void>(resolve=>{settle=resolve;});this.register(()=>sequence.push('late-cleanup'));this.addChild(new class extends Component{/** Record any incorrectly admitted late child startup. */ onload(){sequence.push('late-child');}}());}
  }
  const child=new Pending(),ready=child.load();await child.unload();settle();await ready;
  expect(sequence).toEqual(['late-cleanup']);
});
it('reload waits for canceled startup settlement without adopting its late children',async()=>{
  let settle!:()=>void,calls=0;
  const sequence:string[]=[];
  class Pending extends Component {
    /** Expose distinct old/new generations to verify startup serialization. */
    async onload(){
      if(++calls===1){await new Promise<void>(resolve=>{settle=resolve;});this.addChild(new class extends Component{/** Record any stale-generation child admission. */ onload(){sequence.push('stale-child');}}());this.register(()=>sequence.push('stale-cleanup'));}
      else sequence.push('new-load');
    }
  }
  const component=new Pending(),old=component.load();await component.unload();
  const reload=component.load();await Promise.resolve();expect(calls).toBe(1);
  settle();await old;await reload;expect(calls).toBe(2);expect(sequence).toEqual(['stale-cleanup','new-load']);
  await component.unload();
});
it('reload waits for full pending unload and preserves the next generation cleanup',async()=>{
  let settle!:()=>void,loads=0,unloads=0;
  const cleaned:number[]=[];
  class Pending extends Component {
    /** Register one cleanup owned by this exact startup generation. */
    onload(){const generation=++loads;this.register(()=>cleaned.push(generation));}
    /** Hold the first shutdown until the test explicitly permits completion. */
    onunload(){if(++unloads===1)return new Promise<void>(resolve=>{settle=resolve;});}
  }
  const component=new Pending();await component.load();const old=component.unload(),reload=component.load();
  await Promise.resolve();expect(loads).toBe(1);expect(cleaned).toEqual([1]);
  settle();await old;await reload;expect(loads).toBe(2);expect(cleaned).toEqual([1]);
  await component.unload();expect(cleaned).toEqual([1,2]);
});
it('disposed parents do not unload supplied children owned elsewhere',async()=>{
  let childUnloads=0;
  const parent=new Component(),child=new class extends Component{/** Count teardown to detect foreign-child authority violations. */ onunload(){childUnloads++;}}();
  await parent.load();await parent.unload();await child.load();parent.addChild(child);expect(childUnloads).toBe(0);
  await child.unload();expect(childUnloads).toBe(1);
});
it('a later unload cancels a queued reload without reactivating the component',async()=>{
  let settle!:()=>void,loads=0,unloads=0;
  class Pending extends Component {
    /** Count only startups that are actually admitted. */
    onload(){loads++;}
    /** Keep the first shutdown pending to exercise queued admission cancellation. */
    onunload(){if(++unloads===1)return new Promise<void>(resolve=>{settle=resolve;});}
  }
  const component=new Pending();await component.load();const old=component.unload(),queued=component.load(),cancel=component.unload();
  settle();await Promise.all([old,queued,cancel]);expect(loads).toBe(1);
  await component.load();expect(loads).toBe(2);await component.unload();
});
it('parent load propagates an auto-started child failure without an unhandled rejection',async()=>{
  const logging=vi.spyOn(console,'error').mockImplementation(()=>{});
  let attempts=0;
  try {
    class Parent extends Component {
      /** Let an auto-started child fail before the parent reaches its child wait. */
      async onload(){this.addChild(new class extends Component{/** Fail the initial child startup so parent error propagation is observable. */ onload(){if(++attempts===1)throw new Error('Child startup failed');}}());await new Promise(resolve=>setTimeout(resolve,0));}
    }
    const parent=new Parent();await expect(parent.load()).rejects.toThrow('Child startup failed');await parent.unload();
    expect(logging).toHaveBeenCalled();expect(attempts).toBe(1);
  } finally {logging.mockRestore();}
});
it('awaited repeated lifecycle calls inside their own hooks remain idempotent',async()=>{
  const sequence:string[]=[];
  class Reentrant extends Component {
    /** Await an idempotent repeated public load inside the active startup hook. */
    async onload(){sequence.push('load');await this.load();sequence.push('loaded');}
    /** Await an idempotent repeated public unload inside the active shutdown hook. */
    async onunload(){sequence.push('unload');await this.unload();sequence.push('unloaded');}
  }
  const component=new Reentrant();await component.load();await component.unload();
  expect(sequence).toEqual(['load','loaded','unload','unloaded']);
});
it('host lifecycle tracking still waits for actual teardown after an idempotent repeated unload',async()=>{
  let settle!:()=>void,finished=false;
  class Pending extends Component {/** Hold actual shutdown while repeated public unload returns immediately. */ onunload(){return new Promise<void>(resolve=>{settle=resolve;});}}
  const component=new Pending();await component.load();const first=component.unload();await component.unload();
  const actual=componentLifecycle(component,'shutdown').then(()=>{finished=true;});await Promise.resolve();expect(finished).toBe(false);
  settle();await first;await actual;expect(finished).toBe(true);
});
