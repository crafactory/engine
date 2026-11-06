import {describe,it,expect} from 'vitest';
import {retainExportCache} from '../src/mobile/export-cache';
describe('Android share cache retention',()=>{
  it('prunes only expired exports and preserves recipients for 24 hours',async()=>{
    const removed:string[]=[];await retainExportCache([{path:'old',mtime:1,bytes:10},{path:'recent',mtime:100_000_000,bytes:20}],10,async path=>{removed.push(path);},100_000_001);
    expect(removed).toEqual(['old']);
  });
  it('bounds retained copies even when shares are canceled',async()=>{
    await expect(retainExportCache(Array.from({length:12},(_,i)=>({path:String(i),mtime:10,bytes:1})),1,async()=>{},11)).rejects.toThrow('cache is full');
    await expect(retainExportCache([{path:'large',mtime:10,bytes:256*1024*1024}],1,async()=>{},11)).rejects.toThrow('cache is full');
  });
  it('does not hide cleanup failures',async()=>{
    await expect(retainExportCache([{path:'old',mtime:1,bytes:10}],1,async()=>{throw new Error('denied');},100_000_000)).rejects.toThrow('denied');
  });
});
