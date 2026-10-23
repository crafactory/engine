import workerScript from './plugin-worker.ts?worker&url';
import type {PluginManifest} from './types';
import type {PluginSnapshot} from './compat-core';
export interface PluginCommand {id:string;label:string;run:()=>void;plugin:string}
export interface EditorSuggestOption {label:string;detail?:string;apply:()=>void|Promise<void>}
export interface EditorSuggestResult {from:number;options:EditorSuggestOption[]}

export interface PluginController {
  ready:Promise<void>;
  sync(snapshot:PluginSnapshot):void;
  stop():Promise<void>;
  /** Renderer-only: mount a registered custom view into a host element. */
  mountView?(viewType:string,path:string,parent:HTMLElement):Promise<{element:HTMLElement;dispose():void}>;
  /** Renderer-only: query registered editor suggests at a document position. */
  editorSuggest?(text:string,pos:number):EditorSuggestResult|null|Promise<EditorSuggestResult|null>;
  /** Renderer-only: dispatch an obsidian:// protocol URL to this plugin's handlers. */
  dispatchProtocol?(url:string):Promise<boolean|void>;
  /** Renderer-only: registered Bases view ids. */
  basesViews?(): string[];
  /** Renderer-only: mount a registered Bases view into a container. */
  mountBasesView?(id:string,container:HTMLElement,config:unknown):{dispose():void};
}
/** CommonJS is wrapped as original source text, not eval/Function and not a proprietary SDK. */
export function startPlugin(manifest:PluginManifest,code:string,getSnapshot:()=>PluginSnapshot,onCommands:(commands:PluginCommand[])=>void,
  operation:(name:string,args:unknown[])=>Promise<unknown>,onNotice:(message:string)=>void,onFailure:()=>void=()=>{}):PluginController {
  const script=new URL(workerScript,window.location.href).href;
  const bootstrap=`importScripts(${JSON.stringify(script)});\nself.enginePluginBootstrap(${JSON.stringify({manifest,snapshot:getSnapshot()})},function(require,module,exports){\n${code}\n});\n`;
  const url=URL.createObjectURL(new Blob([bootstrap],{type:'text/javascript'}));
  const worker=new Worker(url);
  let alive=true,ready=false,stopResolve:()=>void=()=>{},rejectReady:(error:Error)=>void=()=>{},resolveReady:()=>void=()=>{};
  let stopPromise:Promise<void>|undefined;
  const readyPromise=new Promise<void>((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  const timer=setTimeout(()=>fail('Plugin startup timed out'),8000);
  function destroy(){alive=false;clearTimeout(timer);if(!ready)rejectReady(new Error('Plugin stopped before startup completed'));worker.terminate();URL.revokeObjectURL(url);onCommands([]);stopResolve();}
  function fail(message:string){if(!alive)return;onNotice(manifest.name+': '+message);if(!ready)rejectReady(new Error(message));destroy();onFailure();}
  worker.onerror=event=>fail(event.message);
  worker.onmessage=async({data})=>{
    if(!alive)return;
    if(data.type==='ready'){ready=true;clearTimeout(timer);resolveReady();}
    else if(data.type==='failure')fail(String(data.message));
    else if(data.type==='notice'&&typeof data.message==='string')onNotice(data.message);
    else if(data.type==='commands'&&Array.isArray(data.commands)){
      const commands=data.commands.filter((c:any)=>typeof c.id==='string'&&typeof c.name==='string').slice(0,500);
      onCommands(commands.map((c:any)=>({id:`plugin:${manifest.id}:${c.id}`,label:c.name,plugin:manifest.id,run:()=>{if(alive&&!stopPromise){worker.postMessage({type:'snapshot',snapshot:getSnapshot()});worker.postMessage({type:'run',id:c.id});}}})));
    }else if(data.type==='request'){
      try{
        if(!Number.isInteger(data.id)||typeof data.operation!=='string'||!Array.isArray(data.args))throw new Error('Invalid plugin request');
        const result=await operation(data.operation,data.args);
        if(alive)worker.postMessage({type:'response',id:data.id,result,snapshot:getSnapshot()});
      }catch(error){if(alive)worker.postMessage({type:'response',id:data.id,error:error instanceof Error?error.message:String(error)});}
    }else if(data.type==='stopped')destroy();
  };
  return {ready:readyPromise,sync(snapshot){if(alive&&ready&&!stopPromise)worker.postMessage({type:'snapshot',snapshot});},
    stop(){if(!alive)return Promise.resolve();return stopPromise??=(new Promise(resolve=>{stopResolve=resolve;worker.postMessage({type:'stop'});setTimeout(()=>{if(alive)destroy();},2000);}));}};
}
