/* Original trusted-renderer loader. Local source is executable user-authorized code. */
import * as state from '@codemirror/state';
import * as view from '@codemirror/view';
import * as commands from '@codemirror/commands';
import * as language from '@codemirror/language';
import * as search from '@codemirror/search';
import * as autocomplete from '@codemirror/autocomplete';
import * as markdown from '@codemirror/lang-markdown';
import * as highlight from '@lezer/highlight';
import {createCompatibilityRuntime,CompatibilityError,type CompatNativeServices,type PluginSnapshot} from './compat-core';
import {createDomAdapters,type PluginTab} from './compat-dom';
import type {PluginManifest} from './types';
import type {PluginCommand,PluginController} from './plugins';
const modules:Record<string,unknown>={'@codemirror/state':state,'@codemirror/view':view,'@codemirror/commands':commands,'@codemirror/language':language,'@codemirror/search':search,'@codemirror/autocomplete':autocomplete,'@codemirror/lang-markdown':markdown,'@lezer/highlight':highlight};
/** Load explicitly authorized local CommonJS source in the renderer with bounded host adapters. */
export function startRendererPlugin(manifest:PluginManifest,code:string,getSnapshot:()=>PluginSnapshot,
  onCommands:(commands:PluginCommand[])=>void,operation:(name:string,args:unknown[])=>Promise<unknown>,
  onNotice:(message:string)=>void,onFailure:()=>void,onTabs:(tabs:PluginTab[])=>void,onExtensions:(extensions:unknown[])=>void,
  native?:CompatNativeServices,onFileExtensions?:(extensions:string[],viewType?:string)=>void):PluginController {
  let alive=true,stopping=false,stopPromise:Promise<void>|undefined,booting:Promise<void>|undefined;
  const applyEditorEdit=(base:string,text:string,from:number,to:number)=>operation('editor',[getSnapshot().active,base,text,from,to]);
  const dom=createDomAdapters(manifest.id,manifest.name,fail,onTabs,onExtensions,onFileExtensions,applyEditorEdit);
  const runtime=createCompatibilityRuntime(manifest,getSnapshot(),{
    ui:dom,notice:onNotice,native,
    async request(name,args){const result=await operation(name,args);if(alive)runtime.sync(getSnapshot());return result;},
    commands(list){if(stopping)return;onCommands(list.map(command=>({id:`plugin:${manifest.id}:${command.id}`,label:command.name,plugin:manifest.id,
      run(){if(alive&&!stopping){try{runtime.sync(getSnapshot());void runtime.run(command.id).catch(fail);}catch(error){fail(error);}}}})));}
  });
  dom.setApp(runtime.app);
  /** Revoke processor admission immediately, even while startup awaits arbitrary trusted code. */
  async function stop(){
    return stopPromise??=(async()=>{stopping=true;onCommands([]);try{await dom.stopProcessors();await booting?.catch(()=>{});await runtime.stop();}finally{alive=false;await dom.dispose();}})();
  }
  /** Report a first owner failure, revoke admission, and notify the host after cooperative cleanup. */
  function fail(reason:unknown){if(!alive||stopping)return;onNotice(manifest.name+': '+(reason instanceof Error?reason.message:String(reason)));void stop().catch(error=>onNotice(String(error))).finally(onFailure);}
  const slot='__engine_plugin_'+crypto.randomUUID().replaceAll('-','');
  const global=window as unknown as Record<string,unknown>;
  // Compatibility shim for plugins that still register CodeMirror 5 highlighting modes.
  const codeMirror5=(global.CodeMirror??={}) as {defineMode?:()=>void;getMode?:()=>null};
  codeMirror5.defineMode??=()=>{};codeMirror5.getMode??=()=>null;
  let execute:((require:(name:string)=>unknown,module:{exports:any},exports:any)=>void)|undefined;
  global[slot]=(callback:typeof execute)=>{execute=callback;};
  const url=URL.createObjectURL(new Blob([`window[${JSON.stringify(slot)}](function(require,module,exports){\n${code}\n});\nexport {};\n`],{type:'text/javascript'}));
  const ready=(async()=>{
    try{
      await import(/* @vite-ignore */ url);
      if(stopping)throw new Error('Plugin stopped before startup');
      if(!execute)throw new Error('CommonJS source did not load');
      const module={exports:{} as any};
      execute(name=>{if(name==='obsidian')return runtime.api;if(Object.hasOwn(modules,name))return modules[name];throw new CompatibilityError('require '+name);},module,module.exports);
      const constructor=typeof module.exports==='function'?module.exports:module.exports.default;
      booting=runtime.boot(constructor);await booting;
      if(stopping)throw new Error('Plugin stopped during startup');
    }catch(error){fail(error);await stop().catch(()=>{});throw error;}
    finally{delete global[slot];URL.revokeObjectURL(url);}
  })();
  // Main-thread code cannot be forcibly interrupted. This is not a timeout sandbox.
  return {ready,sync(snapshot){if(alive&&!stopping){try{runtime.sync(snapshot);}catch(error){fail(error);}}},stop,mountView:dom.mountView,editorSuggest:(text,pos)=>dom.queryEditorSuggest(text,pos),basesViews:()=>dom.basesViews(),mountBasesView:(id,container,config)=>dom.mountBasesView(id,container,config),hoverSources:()=>dom.hoverSources(),hoverLink:payload=>runtime.hoverLink(payload),dispatchProtocol:async url=>{
    if(!alive||stopping)return false;
    try{return await dom.dispatchProtocol(url);}
    catch(error){fail(error);return undefined;}
  }};
}
