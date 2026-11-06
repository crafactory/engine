import {describe,it,expect} from 'vitest';
import {flushIndependent} from '../src/services/flush-independent';
describe('independent persistence phases',()=>{
  it('attempts notes and workspace after a plugin failure, then rejects',async()=>{
    const calls:string[]=[];
    await expect(flushIndependent([
      async()=>{calls.push('plugin');throw new Error('plugin failed');},
      async()=>{calls.push('notes');},
      async()=>{calls.push('workspace');}
    ])).rejects.toThrow('persistence operations failed');
    expect(calls).toEqual(['plugin','notes','workspace']);
  });
  it('retains all failures without skipping other phases',async()=>{
    const failures=[new Error('plugin'),new Error('note')];let saved=false;
    try{await flushIndependent([async()=>{throw failures[0];},async()=>{throw failures[1];},async()=>{saved=true;}]);throw new Error('Expected rejection');}
    catch(error){expect(error).toBeInstanceOf(AggregateError);expect((error as AggregateError).errors).toEqual(failures);}
    expect(saved).toBe(true);
  });
  it('resolves only after every successful phase completes',async()=>{
    const calls:number[]=[];await flushIndependent([async()=>{calls.push(1);},async()=>{calls.push(2);}]);
    expect(calls).toEqual([1,2]);
  });
});
