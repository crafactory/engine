import type {Workspace} from './types';
/** Admit only host routes or files in this vault, never arbitrary persisted object shapes. */
export function readWorkspaceLayout(value:unknown,files:readonly string[]):Workspace|undefined{
  if(!value||typeof value!=='object')return;
  const raw=value as Record<string,unknown>,available=new Set(files);
  const valid=(path:unknown):path is string=>{
    if(typeof path!=='string')return false;
    if(path.startsWith('web:'))try{return ['http:','https:'].includes(new URL(path.slice(4)).protocol);}catch{return false;}
    if(path.startsWith('@local:'))return available.has(path.slice(7));
    if(available.has(path)||path==='@graph')return true;
    return false;
  };
  if(!Array.isArray(raw.tabs)||raw.tabs.length>500||typeof raw.left!=='boolean'||typeof raw.right!=='boolean'||!['source','live','reading'].includes(raw.mode as string))return;
  const tabs=[...new Set(raw.tabs.filter(valid))],active=valid(raw.active)&&tabs.includes(raw.active)?raw.active:tabs[0]??'';
  return {tabs,active,split:valid(raw.split)?raw.split:null,left:raw.left,right:raw.right,mode:raw.mode as Workspace['mode']};
}
