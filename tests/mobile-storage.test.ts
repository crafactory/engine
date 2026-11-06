import {afterEach,describe,expect,it,vi} from 'vitest';
import {mkdtemp,mkdir,readFile,writeFile,readdir,stat,rename,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createMobileStorage,type MobileFilesystem} from '../src/mobile/storage';
import type {VaultState} from '../src/types';

const roots:string[]=[];
afterEach(async()=>{vi.restoreAllMocks();await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
async function fixture(){
  const root=await mkdtemp(join(tmpdir(),'engine-mobile-'));roots.push(root);
  async function native<T>(action:()=>Promise<T>):Promise<T>{
    try{return await action();}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')throw Object.assign(new Error('Missing native file'),{code:'OS-PLUG-FILE-0008'});throw error;}
  }
  const info=async(path:string)=>{const value=await stat(join(root,path));return {type:value.isDirectory()?'directory' as const:'file' as const,size:value.size,mtime:value.mtimeMs,ctime:value.birthtimeMs};};
  const fs:MobileFilesystem={
    stat:path=>native(()=>info(path)),
    readdir:path=>native(async()=>Promise.all((await readdir(join(root,path))).map(async name=>({name,...await info(path+'/'+name)})))),
    read:(path,binary=false)=>native(async()=>{const bytes=await readFile(join(root,path));return bytes.toString(binary?'base64':'utf8');}),
    write:async(path,data,binary=false)=>{await writeFile(join(root,path),data,binary?'base64':'utf8');},
    mkdir:async path=>{await mkdir(join(root,path),{recursive:true});},
    rename:(from,to)=>native(()=>rename(join(root,from),join(root,to))),
    remove:(path,directory=false)=>native(()=>rm(join(root,path),{recursive:directory})),
    asset:async path=>'https://localhost/_capacitor_file_/'+join(root,path)
  };
  return {root,fs,bridge:await createMobileStorage(fs)};
}

describe('app-private native storage contract (Node adapter, not Android certification)',()=>{
  it('reports persistence without pretending to be desktop and seeds only once',async()=>{
    const {fs,bridge}=await fixture();
    expect(bridge).toMatchObject({desktop:false,persistent:true,platform:'android'});
    await bridge.trash('Welcome.md');
    const restarted=await createMobileStorage(fs);
    expect((await restarted.vault()).entries).toEqual([]);
    await expect(restarted.choose()).rejects.toThrow('Shared-folder');
  });
  it('persists exact Unicode text and optimistic versions through a new bridge',async()=>{
    const {fs,bridge}=await fixture(),note=await bridge.create('资料/笔记.md','# 中文\n');
    const updated=await bridge.write(note.path,note.content+'Second line\n',note.version);
    await expect(bridge.write(note.path,'stale',note.version)).rejects.toThrow('CONFLICT');
    const restarted=await createMobileStorage(fs);
    expect(await restarted.read(note.path)).toEqual(updated);
  });
  it('serializes simultaneous create-only operations without overwriting the winner',async()=>{
    const {bridge}=await fixture();
    const outcomes=await Promise.allSettled([bridge.create('Race.md','first'),bridge.create('Race.md','second')]);
    expect(outcomes.map(value=>value.status)).toEqual(['fulfilled','rejected']);
    expect((await bridge.read('Race.md')).content).toBe('first');
  });
  it('copies the exact binary view before admission and preserves create/modify distinctions',async()=>{
    const {fs,bridge}=await fixture(),bytes=new Uint8Array([9,1,2,9]),view=bytes.subarray(1,3);
    const writing=bridge.createBinary!('Assets/bytes.bin',view);view.fill(7);await writing;
    expect([...new Uint8Array(await bridge.readBinary!('Assets/bytes.bin'))]).toEqual([1,2]);
    await expect(bridge.createBinary!('Assets/bytes.bin',new Uint8Array([4]))).rejects.toThrow('exists');
    await expect(bridge.modifyBinary!('absent.bin',new Uint8Array([4]))).rejects.toThrow('not found');
    await bridge.modifyBinary!('Assets/bytes.bin',new Uint8Array([3,4]));
    const restarted=await createMobileStorage(fs);
    expect([...new Uint8Array(await restarted.readBinary!('Assets/bytes.bin'))]).toEqual([3,4]);
  });
  it.each(['../escape.md','/absolute.md','x\\bad.md','x//bad.md','x/./bad.md','x/../bad.md','file:bad.md',''])('rejects guarded path %j',async path=>{
    const {bridge}=await fixture();await expect(bridge.create(path,'bad')).rejects.toThrow('Invalid vault path');
  });
  it('rejects case-colliding files/parents and permits an explicit case-only rename',async()=>{
    const {bridge}=await fixture();await bridge.create('Folder/Case.md','safe');
    await expect(bridge.create('folder/Other.md','bad')).rejects.toThrow('Case-colliding');
    await expect(bridge.create('Folder/case.md','bad')).rejects.toThrow('Case-colliding');
    await bridge.rename('Folder/Case.md','Folder/case.md');
    expect((await bridge.read('Folder/case.md')).content).toBe('safe');
    await expect(bridge.rename('Folder','Folder/child')).rejects.toThrow('into itself');
  });
  it('renames nested content, refuses destination overwrite and retains trash bytes privately',async()=>{
    const {root,bridge}=await fixture();await bridge.create('Old/Nested.md','retained');await bridge.create('Other.md','other');
    await bridge.rename('Old','New');
    await expect(bridge.rename('New/Nested.md','Other.md')).rejects.toThrow('exists');
    await bridge.trash('New');
    expect((await bridge.list()).some(entry=>entry.path.startsWith('New'))).toBe(false);
    const [id]=await readdir(join(root,'engine-profile/trash'));
    expect(await readFile(join(root,'engine-profile/trash',id,'New/Nested.md'),'utf8')).toBe('retained');
  });
  it('persists settings and plugin data outside the visible vault',async()=>{
    const {root,fs,bridge}=await fixture();
    const state={settings:{theme:'light'},layout:{active:'Welcome.md'}} as VaultState;
    await bridge.state(state);await bridge.pluginData('style-settings',{choice:'wide'},true);
    const restarted=await createMobileStorage(fs);
    expect((await restarted.vault()).state).toEqual(state);
    expect(await restarted.pluginData('style-settings')).toEqual({choice:'wide'});
    expect(await readFile(join(root,'engine-profile/plugins/style-settings.json'),'utf8')).toBe('{"choice":"wide"}');
    expect((await restarted.list()).some(entry=>entry.path.includes('engine-profile'))).toBe(false);
    await expect(restarted.pluginData('../escape',{},true)).rejects.toThrow('Invalid plugin id');
  });
  it('retains and restores a previous saved version after restart',async()=>{
    const {fs,bridge}=await fixture(),first=await bridge.create('History.md','first');
    await bridge.write(first.path,'second',first.version);
    const restarted=await createMobileStorage(fs),snapshots=await restarted.snapshots(first.path);
    expect(snapshots).toHaveLength(1);
    expect((await restarted.restore(snapshots[0].id)).content).toBe('first');
    await expect(restarted.restore('../bad')).rejects.toThrow('Snapshot not found');
  });
  it('does not erase corrupt or denied persisted state or regenerate a deleted welcome',async()=>{
    const {root,fs,bridge}=await fixture();await bridge.trash('Welcome.md');
    await writeFile(join(root,'engine-profile/state.json'),'{broken');
    await expect(createMobileStorage(fs)).rejects.toThrow('Corrupt persisted JSON');
    expect(await readFile(join(root,'engine-profile/state.json'),'utf8')).toBe('{broken');
    await writeFile(join(root,'engine-profile/state.json'),'{}');
    const read=fs.read.bind(fs);
    vi.spyOn(fs,'read').mockImplementation((path,binary)=>path.endsWith('state.json')?Promise.reject(Object.assign(new Error('denied'),{code:'OS-PLUG-FILE-0007'})):read(path,binary));
    await expect(createMobileStorage(fs)).rejects.toThrow('denied');
    expect(await readdir(join(root,'vault'))).toEqual([]);
  });
  it('preserves old bytes and cleans staged files if publication fails',async()=>{
    const {root,fs,bridge}=await fixture(),note=await bridge.create('Stable.md','original'),move=fs.rename.bind(fs);
    vi.spyOn(fs,'rename').mockImplementation((from,to)=>to==='vault/Stable.md'?Promise.reject(new Error('native publish failed')):move(from,to));
    await expect(bridge.write(note.path,'replacement',note.version)).rejects.toThrow('publish failed');
    expect(await readFile(join(root,'vault/Stable.md'),'utf8')).toBe('original');
    expect((await readdir(join(root,'vault'))).some(name=>name.includes('.engine-'))).toBe(false);
  });
  it('loads unchanged package text/styles without exposing hidden installation files',async()=>{
    const {root,bridge}=await fixture(),folder=join(root,'vault/.crafactory/plugins/original-fixture');
    await mkdir(folder,{recursive:true});
    const code='module.exports = class OriginalFixture {};',styles='body { --original: 1; }';
    await writeFile(join(folder,'manifest.json'),JSON.stringify({id:'original-fixture',name:'Original fixture',version:'1.0.0',isDesktopOnly:true}));
    await writeFile(join(folder,'main.js'),code);await writeFile(join(folder,'styles.css'),styles);
    expect(await bridge.plugins()).toEqual([{manifest:{id:'original-fixture',name:'Original fixture',version:'1.0.0',isDesktopOnly:true},code,styles}]);
    expect((await bridge.list()).some(entry=>entry.path.startsWith('.crafactory'))).toBe(false);
  });
  it('attaches exact bytes and returns a native asset URL with no leading vault slash',async()=>{
    const {bridge}=await fixture(),path=await bridge.attach('sample.png',[1,2,3]);
    expect(path).toBe('Attachments/sample.png');
    expect([...new Uint8Array(await bridge.readBinary!(path))]).toEqual([1,2,3]);
    expect(await bridge.asset(path)).toContain('/vault/Attachments/sample.png');
  });
});
