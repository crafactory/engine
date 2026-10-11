import type {Note,PluginManifest} from './types';
export interface PluginCommand {id:string;label:string;run:()=>void;plugin:string}
/** Opt-in plugins run in Web Workers, never in Electron's main process. */
export function startPlugin(manifest:PluginManifest,code:string,getNotes:()=>Note[],onCommands:(commands:PluginCommand[])=>void,onEdit:(path:string,content:string)=>void,onNotice:(message:string)=>void) {
  const bootstrap=`
    const callbacks=new Map();
    let sequence=0;
    self.engine={
      registerCommand(id,label,callback){callbacks.set(id,callback);postMessage({type:'command',id,label});},
      notice(message){postMessage({type:'notice',message});},
      write(path,content){postMessage({type:'write',path,content});},
      notes:[],
    };
    self.onmessage=event=>{
      if(event.data.type==='notes')engine.notes=event.data.notes;
      if(event.data.type==='run')Promise.resolve(callbacks.get(event.data.id)?.()).catch(e=>engine.notice(String(e)));
    };
  `;
  const url=URL.createObjectURL(new Blob([bootstrap,'\n',code],{type:'text/javascript'}));
  const worker=new Worker(url),commands:PluginCommand[]=[];
  worker.onmessage=({data})=>{
    if(data.type==='command'&&typeof data.id==='string'&&typeof data.label==='string'){
      commands.push({id:`plugin:${manifest.id}:${data.id}`,label:data.label,plugin:manifest.id,run:()=>{worker.postMessage({type:'notes',notes:getNotes()});worker.postMessage({type:'run',id:data.id});}});
      onCommands([...commands]);
    }
    if(data.type==='notice'&&typeof data.message==='string')onNotice(data.message);
    if(data.type==='write'&&typeof data.path==='string'&&typeof data.content==='string'&&data.path.endsWith('.md')){
      if(!data.path.split('/').some((p:string)=>p.startsWith('.')||p==='..'))onEdit(data.path,data.content);
    }
  };
  worker.onerror=event=>onNotice(`${manifest.name}: ${event.message}`);
  worker.postMessage({type:'notes',notes:getNotes()});
  return()=>{worker.terminate();URL.revokeObjectURL(url);};
}
