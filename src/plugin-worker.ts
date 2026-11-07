import {createCompatibilityRuntime,CompatibilityError,type PluginSnapshot} from './compat-core';
import type {PluginManifest} from './types';
declare const self:{
  postMessage(data:unknown):void;
  addEventListener(type:'unhandledrejection',handler:(event:PromiseRejectionEvent)=>void):void;
  onmessage:(event:MessageEvent)=>void;
  enginePluginBootstrap:(options:{manifest:PluginManifest;snapshot:PluginSnapshot},execute:(require:(name:string)=>unknown,module:{exports:any},exports:any)=>void)=>void;
  engine:any;
};
self.enginePluginBootstrap=(options,execute)=>{
  let sequence=0,stopped=false,legacy=false;
  const pending=new Map<number,{resolve:(data:any)=>void;reject:(error:Error)=>void}>();
  const legacyCommands=new Map<string,{name:string;callback:()=>unknown}>();
  const notify=(type:string,data:Record<string,unknown>={})=>self.postMessage({type,...data});
  const runtime=createCompatibilityRuntime(options.manifest,options.snapshot,{
    request(operation,args){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});notify('request',{id,operation,args});});},
    commands(commands){notify('commands',{commands});},notice(message){notify('notice',{message});}
  });
  self.engine={
    notes:options.snapshot.notes,
    registerCommand(id:string,name:string,callback:()=>unknown){legacyCommands.set(id,{name,callback});notify('commands',{commands:[...legacyCommands].map(([id,c])=>({id,name:c.name}))});},
    notice(message:string){notify('notice',{message});},
    write(path:string,content:string){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});notify('request',{id,operation:'writeLegacy',args:[path,content]});});}
  };
  const error=(reason:unknown)=>notify('failure',{message:reason instanceof Error?reason.message:String(reason)});
  self.addEventListener('unhandledrejection',event=>{event.preventDefault();error(event.reason);});
  self.onmessage=async({data})=>{
    try{
      if(data.type==='response'){
        const callback=pending.get(data.id);if(!callback)return;pending.delete(data.id);
        if(data.error)callback.reject(new Error(data.error));else{if(data.snapshot&&!legacy)runtime.sync(data.snapshot);callback.resolve(data.result);}
      }else if(data.type==='snapshot'){
        self.engine.notes=data.snapshot.notes;if(!legacy)runtime.sync(data.snapshot);
      }else if(data.type==='run'){
        if(stopped)throw new Error('Plugin stopped');
        if(legacy)await legacyCommands.get(data.id)?.callback();else await runtime.run(data.id);
        notify('ran',{id:data.id});
      }else if(data.type==='stop'){
        if(!legacy)await runtime.stop();stopped=true;notify('stopped');
      }
    }catch(e){error(e);}
  };
  (async()=>{
    try{
      const module={exports:{} as any};
      execute(name=>{if(name!=='obsidian')throw new CompatibilityError('require '+name);return runtime.api;},module,module.exports);
      const constructor=typeof module.exports==='function'?module.exports:module.exports.default;
      if(constructor)await runtime.boot(constructor);else if(legacyCommands.size)legacy=true;else throw new Error('No CommonJS Plugin export or Engine command registration');
      notify('ready',{runtime:legacy?'engine':'obsidian-worker'});
    }catch(e){error(e);}
  })();
};
