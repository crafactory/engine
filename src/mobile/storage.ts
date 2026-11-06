import type {Bridge,Entry,Note,PluginManifest,Snapshot,VaultState} from '../types';

/** Small native filesystem boundary, injectable for contract tests. Paths include the app root. */
export interface MobileFile {name:string;type:'file'|'directory';size:number;mtime:number;ctime:number}
export interface MobileFilesystem {
  stat(path:string):Promise<Omit<MobileFile,'name'>>;
  readdir(path:string):Promise<MobileFile[]>;
  read(path:string,binary?:boolean):Promise<string>;
  write(path:string,data:string,binary?:boolean):Promise<void>;
  mkdir(path:string):Promise<void>;
  rename(from:string,to:string):Promise<void>;
  remove(path:string,directory?:boolean):Promise<void>;
  asset(path:string):Promise<string>;
}

const VAULT='vault',PROFILE='engine-profile',MAX_TEXT=32*1024*1024,MAX_BINARY=64*1024*1024;
const ID=/^[a-z0-9][a-z0-9._-]{0,63}$/,HISTORY=/^\d+-[a-f0-9-]+$/;
const textFormat=/\.(md|markdown|txt|canvas|base|json|csv|css|js|ts|html|svg|ya?ml)$/i;
const missing=(error:unknown)=>(error as {code?:string})?.code==='OS-PLUG-FILE-0008';
const parent=(path:string)=>path.slice(0,path.lastIndexOf('/'));
function relative(value:string){
  if(typeof value!=='string'||!value||value.length>4096||/[\\\u0000-\u001f]/.test(value)||
    value.split('/').some(part=>!part||part==='.'||part==='..')||value.includes(':'))
    throw new Error('Invalid vault path');
  return value;
}
function pluginId(id:string){if(typeof id!=='string'||!ID.test(id))throw new Error('Invalid plugin id');return id;}
export function encodeBytes(bytes:Uint8Array){
  let value='';for(let i=0;i<bytes.length;i+=32768)value+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return btoa(value);
}
function decodeBytes(value:string){
  const raw=atob(value),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes;
}
async function version(data:string|Uint8Array){
  const bytes=typeof data==='string'?new TextEncoder().encode(data):new Uint8Array(data);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.buffer)),b=>b.toString(16).padStart(2,'0')).join('');
}

/** Persisted Android pilot. Serialization is not a sandbox or cross-process atomic lock. */
export async function createMobileStorage(fs:MobileFilesystem):Promise<Bridge>{
  let queue:Promise<unknown>=Promise.resolve();
  const listeners=new Set<()=>void>();
  const serialize=<T>(action:()=>Promise<T>)=>{const result=queue.then(action);queue=result.catch(()=>{});return result;};
  const notify=()=>{for(const listener of listeners)try{listener();}catch(error){console.error('Vault change listener failed',error);}};
  async function stat(path:string){try{return await fs.stat(path);}catch(error){if(missing(error))return undefined;throw error;}}
  async function directory(path:string){
    const found=await stat(path);if(found){if(found.type!=='directory')throw new Error('Not a directory: '+path);return;}
    await fs.mkdir(path);
  }
  async function optional(path:string){try{return await fs.read(path);}catch(error){if(missing(error))return undefined;throw error;}}
  async function json<T>(path:string,fallback:T):Promise<T>{
    const value=await optional(path);if(value===undefined)return fallback;
    try{return JSON.parse(value) as T;}catch{throw new Error('Corrupt persisted JSON: '+path);}
  }
  /** Reject cross-platform case collisions, including existing parent components. */
  async function casing(path:string,ignore?:string){
    const parts=path.split('/');let current=VAULT;
    for(const part of parts){
      const info=await stat(current);if(!info)return;
      if(info.type!=='directory')throw new Error('Not a directory: '+current);
      for(const file of await fs.readdir(current)){
        const full=current+'/'+file.name;
        if(file.name.normalize('NFC').toLowerCase()===part.normalize('NFC').toLowerCase()&&
          file.name!==part&&full!==ignore)throw new Error('Case-colliding vault path: '+path);
      }
      current+='/'+part;
    }
  }
  async function target(path:string){relative(path);await casing(path);return VAULT+'/'+path;}
  /** Native rename-overwrite is exercised in emulator acceptance, not assumed crash-durable. */
  async function publish(path:string,data:string,binary=false){
    await directory(parent(path));
    const temporary=path+'.engine-'+crypto.randomUUID();
    try{await fs.write(temporary,data,binary);await fs.rename(temporary,path);}
    finally{try{await fs.remove(temporary);}catch(error){if(!missing(error))console.error('Temporary file cleanup failed',error);}}
  }
  async function readText(path:string):Promise<Note>{
    relative(path);
    if(!textFormat.test(path))throw new Error('Unsupported text format');
    const full=await target(path),info=await fs.stat(full);
    if(info.type!=='file'||info.size>MAX_TEXT)throw new Error('Invalid or oversized text file');
    const content=await fs.read(full);return {path,content,version:await version(content)};
  }
  async function historyIndex(){
    const records=await json<Snapshot[]>(PROFILE+'/history-index.json',[]);
    if(!Array.isArray(records)||records.some(s=>!s||!HISTORY.test(s.id)||typeof s.path!=='string'||!Number.isFinite(s.time)))
      throw new Error('Corrupt file recovery index');
    return records;
  }
  async function snapshot(path:string,content:string){
    const record={id:Date.now()+'-'+crypto.randomUUID(),path,time:Date.now()};
    await publish(PROFILE+'/history/'+record.id+'.json',JSON.stringify({path,content}));
    const all=[record,...await historyIndex()],mine=all.filter(s=>s.path===path);
    const retired=new Set(mine.slice(100).map(s=>s.id));
    await publish(PROFILE+'/history-index.json',JSON.stringify(all.filter(s=>!retired.has(s.id))));
    for(const id of retired)try{await fs.remove(PROFILE+'/history/'+id+'.json');}catch(error){if(!missing(error))throw error;}
  }
  async function writeText(path:string,content:string,expected?:string,createOnly=false){
    relative(path);
    if(typeof content!=='string'||new TextEncoder().encode(content).byteLength>MAX_TEXT)throw new Error('Invalid or oversized text');
    if(!textFormat.test(path))throw new Error('Unsupported text format');
    const full=await target(path),info=await stat(full);
    if(info?.type==='directory')throw new Error('Not a file');
    if(createOnly&&info)throw new Error('File already exists');
    const previous=info?await fs.read(full):undefined;
    if(expected!==undefined&&(previous===undefined||await version(previous)!==expected))
      throw new Error('CONFLICT: File changed. Reload or save a separate copy.');
    if(previous!==undefined&&previous!==content)await snapshot(path,previous);
    await publish(full,content);notify();return {path,content,version:await version(content)};
  }
  async function writeBinary(path:string,data:ArrayBuffer|ArrayBufferView,mode:'write'|'create'|'modify'){
    if(!(data instanceof ArrayBuffer)&&!ArrayBuffer.isView(data)||data.byteLength>MAX_BINARY||
      ArrayBuffer.isView(data)&&!(data.buffer instanceof ArrayBuffer))throw new Error('Invalid or oversized binary data');
    // Copy a view's exact byte range before asynchronous admission.
    const bytes=new Uint8Array(ArrayBuffer.isView(data)?new Uint8Array(data.buffer,data.byteOffset,data.byteLength):new Uint8Array(data));
    return serialize(async()=>{
      const full=await target(path),before=await stat(full);
      if(before?.type==='directory')throw new Error('Not a file');
      if(mode==='create'&&before)throw new Error('File already exists');
      if(mode==='modify'&&!before)throw new Error('File not found');
      await publish(full,encodeBytes(bytes),true);notify();return {path,version:await version(bytes)};
    });
  }
  async function list():Promise<Entry[]>{
    const entries:Entry[]=[];
    async function walk(path:string){
      for(const file of await fs.readdir(path)){
        if(file.name.startsWith('.')||/\.engine-[a-f0-9-]{36}$/i.test(file.name))continue;
        const full=path+'/'+file.name,relativePath=full.slice(VAULT.length+1);
        entries.push({path:relativePath,name:file.name,folder:file.type==='directory',size:file.size,mtime:file.mtime,ctime:file.ctime});
        if(file.type==='directory')await walk(full);
      }
    }
    await walk(VAULT);return entries.sort((a,b)=>Number(b.folder)-Number(a.folder)||a.path.localeCompare(b.path));
  }
  await directory(VAULT);await directory(PROFILE);
  const initial=await json<Partial<VaultState>>(PROFILE+'/state.json',{});
  if(!initial||typeof initial!=='object'||Array.isArray(initial))throw new Error('Corrupt Android workspace state');
  const initialized=await optional(PROFILE+'/initialized');
  if(initialized!==undefined&&initialized!=='1')throw new Error('Corrupt Android initialization marker');
  if(initialized===undefined){
    if(!await stat(VAULT+'/Welcome.md'))await publish(VAULT+'/Welcome.md',
      '# Your Android workspace\n\nA shared editor, with notes saved privately on this device.\n\nUse Files to create a note. Export your vault before uninstalling: app-private files are removed on uninstall.\n');
    await publish(PROFILE+'/initialized','1');
  }
  return {
    desktop:false,persistent:true,platform:'android',
    vault:async()=>{await queue;return {name:'Android vault',root:'App-private Android files (not a shared folder)',entries:await list(),state:await json<Partial<VaultState>>(PROFILE+'/state.json',{})};},
    choose:async()=>{throw new Error('Android pilot uses app-private storage. Shared-folder vault selection is not implemented. Export before uninstalling.');},
    list:async()=>{await queue;return list();},
    read:async path=>{await queue;return readText(path);},
    readBinary:async path=>{
      await queue;const full=await target(path),info=await fs.stat(full);
      if(info.type!=='file'||info.size>MAX_BINARY)throw new Error('Invalid or oversized binary file');
      const bytes=decodeBytes(await fs.read(full,true));if(bytes.byteLength>MAX_BINARY)throw new Error('Binary file grew beyond the size limit');
      return bytes.buffer;
    },
    write:(path,content,expected)=>serialize(()=>writeText(path,content,expected)),
    create:(path,content)=>serialize(()=>writeText(path,content,undefined,true)),
    append:(path,content)=>serialize(async()=>{if(typeof content!=='string')throw new Error('Invalid text');const note=await readText(path);return writeText(path,note.content+content,note.version);}),
    writeBinary:(path,data)=>writeBinary(path,data,'write'),
    createBinary:(path,data)=>writeBinary(path,data,'create'),
    modifyBinary:(path,data)=>writeBinary(path,data,'modify'),
    mkdir:path=>serialize(async()=>{const full=await target(path);if(await stat(full))throw new Error('File already exists');await directory(full);notify();}),
    rename:(from,to)=>serialize(async()=>{
      relative(from);relative(to);if(from===to)return;
      if(to.toLowerCase().startsWith(from.toLowerCase()+'/'))throw new Error('Cannot move a folder into itself');
      const source=await target(from);await fs.stat(source);await casing(to,source);
      const destination=VAULT+'/'+to;if(await stat(destination))throw new Error('Destination already exists');
      await directory(parent(destination));await fs.rename(source,destination);notify();
    }),
    trash:path=>serialize(async()=>{
      const full=await target(path);await fs.stat(full);
      const destination=PROFILE+'/trash/'+crypto.randomUUID()+'/'+path.split('/').pop();
      await directory(parent(destination));await fs.rename(full,destination);notify();
    }),
    state:value=>serialize(async()=>{await publish(PROFILE+'/state.json',JSON.stringify(value));}),
    pluginData:(id,data,write=false)=>serialize(async()=>{
      const path=PROFILE+'/plugins/'+pluginId(id)+'.json';
      if(write){const encoded=JSON.stringify(data);if(encoded===undefined)throw new Error('Invalid plugin data');await publish(path,encoded);return;}
      return json<unknown>(path,null);
    }),
    asset:async path=>{await queue;const full=await target(path);await fs.stat(full);return fs.asset(full);},
    attach:(name,data)=>serialize(async()=>{
      if(typeof name!=='string'||!Array.isArray(data)||data.length>MAX_BINARY||data.some(n=>!Number.isInteger(n)||n<0||n>255))throw new Error('Invalid attachment');
      const state=await json<Partial<VaultState>>(PROFILE+'/state.json',{}),folder=state.settings?.attachmentFolder||'Attachments';
      const base=name.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f:]/g,'_')||'attachment';
      let path=folder+'/'+base,full=await target(path);
      if(await stat(full)){path=folder+'/'+crypto.randomUUID()+'-'+base;full=await target(path);}
      await publish(full,encodeBytes(new Uint8Array(data)),true);notify();return path;
    }),
    snapshots:async path=>{relative(path);await queue;return (await historyIndex()).filter(s=>s.path===path);},
    restore:id=>serialize(async()=>{
      if(!HISTORY.test(id)||!(await historyIndex()).some(s=>s.id===id))throw new Error('Snapshot not found');
      const saved=await json<{path:string;content:string}|null>(PROFILE+'/history/'+id+'.json',null);
      if(!saved||typeof saved.path!=='string'||typeof saved.content!=='string')throw new Error('Corrupt recovery snapshot');
      return writeText(saved.path,saved.content);
    }),
    plugins:async()=>{
      await queue;const root=VAULT+'/.crafactory/plugins';if(!await stat(root))return [];
      const result:{manifest:PluginManifest;code:string;styles?:string}[]=[];
      for(const item of await fs.readdir(root)){
        if(item.type!=='directory'||!ID.test(item.name))continue;
        const folder=root+'/'+item.name,manifest=await json<PluginManifest|null>(folder+'/manifest.json',null);
        if(!manifest||manifest.id!==item.name)continue;
        const codeInfo=await fs.stat(folder+'/main.js');if(codeInfo.size>MAX_TEXT)throw new Error('Oversized plugin package: '+item.name);
        const styleInfo=await stat(folder+'/styles.css');if(styleInfo&&styleInfo.size>4*1024*1024)throw new Error('Oversized plugin stylesheet: '+item.name);
        const code=await fs.read(folder+'/main.js'),styles=styleInfo?await fs.read(folder+'/styles.css'):undefined;
        result.push({manifest,code,...(styles?{styles}:{})});
      }
      return result;
    },
    print:async()=>{throw new Error('Android printing is not implemented. Use Export current note or Export vault ZIP.');},
    unsafeEval:async()=>false,setUnsafeEval:async()=>false,nativePlugins:async()=>false,
    onChange:listener=>{listeners.add(listener);return()=>listeners.delete(listener);}
  };
}
