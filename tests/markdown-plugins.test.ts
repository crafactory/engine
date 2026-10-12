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
it('Component unload awaits async cleanup and continues after a failing cleanup',async()=>{
  const sequence:string[]=[],component=new Component();await component.load();
  component.register(async()=>{await new Promise(resolve=>setTimeout(resolve,5));sequence.push('last');});
  component.register(async()=>{sequence.push('failure');throw new Error('Fixture cleanup error');});
  component.register(async()=>{await new Promise(resolve=>setTimeout(resolve,5));sequence.push('first');});
  await expect(component.unload()).rejects.toThrow('Fixture cleanup error');expect(sequence).toEqual(['first','failure','last']);
  await component.unload();expect(sequence).toEqual(['first','failure','last']);
});
