import {it,expect} from 'vitest';
import {minimalBlockChange} from '../src/live-model';
it('updates only a changed table cell and retains all surrounding source coordinates',()=>{
  const before='| A | Open |\n| B | Closed |',after='| A | Saved |\n| B | Closed |';
  const change=minimalBlockChange(20,before,after)!;
  expect(change).toEqual({from:26,to:30,insert:'Saved'});
  expect(before.slice(0,change.from-20)+change.insert+before.slice(change.to-20)).toBe(after);
});
it('round-trips insertions, removals, surrogate pairs and complete replacements',()=>{
  for(const [before,after] of [['abc','abXYc'],['abc','ac'],['😀','😁'],['old','new'],['','中文'],['abc','']]){
    const c=minimalBlockChange(0,before,after)!;
    expect(before.slice(0,c.from)+c.insert+before.slice(c.to)).toBe(after);
  }
});
it('does not emit a document change for a canceled or unchanged cell',()=>expect(minimalBlockChange(100,'same','same')).toBeNull());
