import {describe,it,expect} from 'vitest';
import {renameDestination} from '../src/file-path';
import {rewriteLinks} from '../src/knowledge';
describe('file-format-preserving rename',()=>{
  it('preserves Canvas extension on extensionless names and moves',()=>{
    expect(renameDestination('Board.canvas','Renamed')).toBe('Renamed.canvas');
    expect(renameDestination('Board.canvas','Folder/Renamed')).toBe('Folder/Renamed.canvas');
  });
  it('retains explicit extension spelling and does not convert formats',()=>{
    expect(renameDestination('Board.canvas','New.CANVAS')).toBe('New.CANVAS');
    expect(()=>renameDestination('Board.canvas','New.md')).toThrow('cannot change');
  });
  it('does not append extensions to folders',()=>expect(renameDestination('a.canvas','folder',true)).toBe('folder'));
  it('allows dotted basenames without interpreting version suffixes as conversions',()=>expect(renameDestination('Board.canvas','Board.v2')).toBe('Board.v2.canvas'));
  it('preserves format in rewritten Canvas wiki embeds',()=>{
    const notes=[{path:'Board.canvas',content:'{"nodes":[],"edges":[]}'}];
    expect(rewriteLinks('![[Board.canvas|Board]]','Board.canvas','New.canvas','Host.md',notes)).toBe('![[New.canvas|Board]]');
  });
});
