import {describe,it,expect} from 'vitest';
import {taskMarker,setTaskChecked} from '../src/task-source';
describe('owned source tasks',()=>{
  it('locates plain, nested, quoted and ordered task markers',()=>{
    for(const line of ['- [ ] Plain','  - [x] Nested','> - [ ] Quote','> > 2. [X] Ordered']){
      expect(taskMarker(line)).toBe(line.indexOf('['));
    }
    expect(taskMarker('prose [ ] example')).toBeNull();expect(taskMarker('- [no] invalid')).toBeNull();
  });
  it('changes only the captured marker and preserves metadata and other tasks',()=>{
    const content='---\nstatus: pending\n---\n\n- [ ] First\n\n> - [ ] Second\n';
    const offset=content.lastIndexOf('[ ]');
    expect(setTaskChecked(content,offset,true)).toBe(content.slice(0,offset)+'[x]'+content.slice(offset+3));
    expect(setTaskChecked(setTaskChecked(content,offset,true)!,offset,false)).toBe(content);
  });
  it('rejects stale or invalid source locations',()=>{
    for(const offset of [-1,0.5,99])expect(setTaskChecked('- [ ] Task',offset,true)).toBeNull();
    expect(setTaskChecked('source changed',2,true)).toBeNull();
  });
  it('preserves CRLF bytes when applying a task edit',()=>{
    const source='---\r\nstatus: pending\r\n---\r\n\r\n- [ ] First\r\n\r\n- [ ] Second\r\n';
    expect(setTaskChecked(source,source.lastIndexOf('[ ]'),true)).toBe(source.replace('- [ ] Second','- [x] Second'));
  });
});
