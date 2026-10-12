import {it,expect} from 'vitest';
import {Component} from '../src/compat-core';
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
    async onload(){await new Promise<void>(resolve=>{settle=resolve;});this.register(()=>sequence.push('late-cleanup'));this.addChild(new class extends Component{onload(){sequence.push('late-child');}}());}
  }
  const child=new Pending(),ready=child.load();await child.unload();settle();await ready;
  expect(sequence).toEqual(['late-cleanup']);
});
it('reload waits for canceled startup settlement without adopting its late children',async()=>{
  let settle!:()=>void,calls=0;
  const sequence:string[]=[];
  class Pending extends Component {
    async onload(){
      if(++calls===1){await new Promise<void>(resolve=>{settle=resolve;});this.addChild(new class extends Component{onload(){sequence.push('stale-child');}}());this.register(()=>sequence.push('stale-cleanup'));}
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
    onload(){const generation=++loads;this.register(()=>cleaned.push(generation));}
    onunload(){if(++unloads===1)return new Promise<void>(resolve=>{settle=resolve;});}
  }
  const component=new Pending();await component.load();const old=component.unload(),reload=component.load();
  await Promise.resolve();expect(loads).toBe(1);expect(cleaned).toEqual([1]);
  settle();await old;await reload;expect(loads).toBe(2);expect(cleaned).toEqual([1]);
  await component.unload();expect(cleaned).toEqual([1,2]);
});
it('disposed parents do not unload supplied children owned elsewhere',async()=>{
  let childUnloads=0;
  const parent=new Component(),child=new class extends Component{onunload(){childUnloads++;}}();
  await parent.load();await parent.unload();await child.load();parent.addChild(child);expect(childUnloads).toBe(0);
  await child.unload();expect(childUnloads).toBe(1);
});
