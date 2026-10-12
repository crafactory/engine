import type {Bridge,Entry,Note,Snapshot,VaultState,Settings} from './types';
import {demo} from './demo';
export const defaults:Settings = {
  theme:'dark',mode:'live',fontSize:16,readableWidth:true,lineNumbers:false,spellcheck:true,
  dailyFolder:'Daily notes',dailyTemplate:'Templates/Daily.md',templatesFolder:'Templates',attachmentFolder:'Attachments',
  vimMode:false,css:'',disabledPlugins:[],hotkeys:{}
};
function memoryBridge():Bridge {
  const files=new Map(Object.entries(demo)), assets=new Map<string,string>(), folders=new Set<string>();
  const history:{id:string;path:string;time:number;content:string}[]=[];
  let stored:Partial<VaultState>={};
  const pluginData=new Map<string,unknown>();
  const entries=():Entry[]=>{
    for(const p of files.keys()){const parts=p.split('/');parts.pop();let current='';for(const part of parts){current+= (current?'/':'')+part;folders.add(current);}}
    return [...[...folders].map(path=>({path,name:path.split('/').pop()!,folder:true,size:0,mtime:Date.now(),ctime:Date.now()})),...[...files].map(([path,content])=>({path,name:path.split('/').pop()!,folder:false,size:content.length,mtime:Date.now(),ctime:Date.now()}))];
  };
  const read=async(path:string)=>{if(!files.has(path))throw new Error('File not found');return {path,content:files.get(path)!,version:files.get(path)};};
  return {
    desktop:false,
    vault:async()=>({name:'Starter vault',root:'In-memory preview',entries:entries(),state:stored}),
    choose:async()=>{throw new Error('Open the desktop application to choose a local vault. Preview changes are temporary.');},
    list:async()=>entries(),read,
    create:async(path,content)=>{if(files.has(path)||folders.has(path))throw new Error('File already exists');files.set(path,content);return read(path);},
    append:async(path,content)=>{const before=await read(path);files.set(path,before.content+content);return read(path);},
    pluginData:async(id,data,write=false)=>{if(write){pluginData.set(id,structuredClone(data));return;}return structuredClone(pluginData.get(id)??null);},
    write:async(path,content,version)=>{
      const before=files.get(path);
      if(version!==undefined&&before!==version)throw new Error('CONFLICT: File changed. Reload before saving.');
      if(before!==undefined&&before!==content)history.unshift({id:crypto.randomUUID(),path,time:Date.now(),content:before});
      files.set(path,content);return {path,content,version:content};
    },
    mkdir:async(path)=>{folders.add(path);},
    rename:async(from,to)=>{
      if(files.has(to)||folders.has(to))throw new Error('Destination already exists');
      if(files.has(from)){files.set(to,files.get(from)!);files.delete(from);}
      else if(folders.has(from)) {
        for(const [p,c]of [...files])if(p.startsWith(from+'/')){files.set(to+p.slice(from.length),c);files.delete(p);}
        for(const p of [...folders])if(p===from||p.startsWith(from+'/')){folders.add(to+p.slice(from.length));folders.delete(p);}
      }else throw new Error('File not found');
    },
    trash:async(path)=>{for(const p of [...files.keys()])if(p===path||p.startsWith(path+'/'))files.delete(p);for(const p of [...folders])if(p===path||p.startsWith(path+'/'))folders.delete(p);},
    state:async(state)=>{stored=structuredClone(state);},
    asset:async(path)=>assets.get(path)||'',
    attach:async(name,data)=>{
      const path=`Attachments/${crypto.randomUUID()}-${name}`;
      const ext=name.split('.').pop()?.toLowerCase()||'';
      const mime:Record<string,string>={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',pdf:'application/pdf',webm:'audio/webm',mp3:'audio/mpeg',ogg:'audio/ogg',mp4:'video/mp4'};
      const blob=new Blob([new Uint8Array(data)],{type:mime[ext]||'application/octet-stream'});
      const asset=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
      assets.set(path,asset);files.set(path,'');return path;
    },
    snapshots:async(path)=>history.filter(s=>s.path===path).map(({id,path,time})=>({id,path,time})),
    restore:async(id)=>{const s=history.find(s=>s.id===id);if(!s)throw new Error('Snapshot not found');files.set(s.path,s.content);return read(s.path);},
    plugins:async()=>[],print:async()=>window.print(),onChange:()=>()=>{}
  };
}
export const bridge=window.engine || memoryBridge();
