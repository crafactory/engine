import {expect,it} from 'vitest';
import {readWorkspaceLayout} from '../src/workspace-layout';
const base={tabs:['A.md','B.md'],active:'B.md',split:'A.md',left:true,right:false,mode:'live'};
it('round trips host layout while removing stale files and duplicate tabs',()=>{
  expect(readWorkspaceLayout(base,['A.md','B.md'])).toEqual(base);
  expect(readWorkspaceLayout({...base,tabs:['A.md','A.md','missing.md'],active:'missing.md'},['A.md'])).toEqual({...base,tabs:['A.md'],active:'A.md'});
});
it('restores supported graph and web routes without permitting script URLs',()=>{
  const layout=readWorkspaceLayout({...base,tabs:['@graph','@local:A.md','web:https://example.com','web:javascript:alert(1)'],split:'@local:missing.md'},['A.md']);
  expect(layout?.tabs).toEqual(['@graph','@local:A.md','web:https://example.com']);expect(layout?.split).toBeNull();
  expect(readWorkspaceLayout({...base,tabs:['web:javascript:alert(1)']},['web:javascript:alert(1)'])?.tabs).toEqual([]);
});
it('rejects malformed layouts and bounds tab admission',()=>{
  for(const value of [null,{}, {...base,mode:'execute'},{...base,left:'true'},{...base,tabs:Array(501).fill('A.md')}])expect(readWorkspaceLayout(value,['A.md'])).toBeUndefined();
  expect(readWorkspaceLayout({...base,tabs:[],active:'A.md',split:null},['A.md'])?.active).toBe('');
});
