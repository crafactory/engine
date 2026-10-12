import {it,expect,vi} from 'vitest';
import {createCompatibilityRuntime,supportedExports,type PluginSnapshot} from '../src/compat-core';
import {rendererExports} from '../src/compat-dom';
import inventory from '../docs/compatibility/obsidian-exports.json';
const manifest={id:'renderer-test',name:'Renderer test',version:'1'};
const initial=():PluginSnapshot=>({name:'Test',active:'One.md',entries:[{path:'One.md',name:'One.md',folder:false,size:3,ctime:0,mtime:0}],notes:[{path:'One.md',content:'one'}],editor:null});
function harness(){
  const settingCleanup=vi.fn(),extensionCleanup=vi.fn(),viewCleanup=vi.fn(),updateOptions=vi.fn();
  const ui={exports:{},workspace:{getLeaf:()=>({fixture:true})},statusBar:vi.fn(),settingTab:vi.fn(()=>settingCleanup),editorExtension:vi.fn(()=>extensionCleanup),registerView:vi.fn(()=>viewCleanup),updateOptions};
  const runtime=createCompatibilityRuntime(manifest,initial(),{ui,request:async()=>null,commands:()=>{},notice:()=>{}});
  return {runtime,api:runtime.api as any,ui,settingCleanup,extensionCleanup,viewCleanup,updateOptions};
}
it('renderer export registry is documented, unique and disjoint from Worker exports',()=>{
  expect(rendererExports).toHaveLength(16);expect(new Set(rendererExports).size).toBe(16);
  for(const name of rendererExports){expect(inventory.symbols.some(s=>s.name===name&&s.runtime)).toBe(true);expect(supportedExports).not.toContain(name);}
});
it('renderer MarkdownView exposes actual active document in reading mode',()=>{
  const h=harness(),view=h.runtime.app.workspace.getActiveViewOfType(h.api.MarkdownView);
  expect(view).not.toBeNull();expect(view!.getViewData()).toBe('one');expect(view!.editor).toBeNull();expect(view!.file!.path).toBe('One.md');
});
it('renderer editor-change listeners observe refreshed editor and clean up on unload',async()=>{
  const h=harness(),calls:string[]=[],snap=initial();
  class Fixture extends h.api.Plugin {onload(){this.registerEvent(this.app.workspace.on('editor-change',(editor:any,view:any)=>calls.push(editor.getValue()+':'+view.getViewData())));}}
  await h.runtime.boot(Fixture);h.runtime.sync({...snap,notes:[{path:'One.md',content:'two'}],editor:{text:'two',from:0,to:0}});
  expect(calls).toEqual(['two:two']);await h.runtime.stop();h.runtime.sync({...snap,notes:[{path:'One.md',content:'three'}],editor:{text:'three',from:0,to:0}});expect(calls).toEqual(['two:two']);
});
it('renderer layout-change fires on boot and reading-editor transitions only',async()=>{
  const h=harness(),listener=vi.fn(),snap=initial();
  class Fixture extends h.api.Plugin {onload(){this.registerEvent(this.app.workspace.on('layout-change',listener));}}
  await h.runtime.boot(Fixture);expect(listener).toHaveBeenCalledTimes(1);
  h.runtime.sync({...snap,editor:{text:'one',from:0,to:0}});expect(listener).toHaveBeenCalledTimes(2);
  h.runtime.sync({...snap,editor:{text:'one',from:1,to:1}});expect(listener).toHaveBeenCalledTimes(2);
  h.runtime.sync(snap);expect(listener).toHaveBeenCalledTimes(3);await h.runtime.stop();h.runtime.sync({...snap,editor:{text:'one',from:0,to:0}});expect(listener).toHaveBeenCalledTimes(3);
});
it('renderer hook registrations dispose once and updateOptions reaches actual host',async()=>{
  const h=harness(),tab={},extension:unknown[]=[];
  class Fixture extends h.api.Plugin {onload(){this.addSettingTab(tab);this.registerEditorExtension(extension);this.registerView('test',()=>{});this.app.workspace.updateOptions();}}
  await h.runtime.boot(Fixture);expect(h.ui.settingTab).toHaveBeenCalledWith(tab);expect(h.ui.editorExtension).toHaveBeenCalledWith(extension);expect(h.updateOptions).toHaveBeenCalledOnce();
  await h.runtime.stop();await h.runtime.stop();expect(h.settingCleanup).toHaveBeenCalledOnce();expect(h.extensionCleanup).toHaveBeenCalledOnce();expect(h.viewCleanup).toHaveBeenCalledOnce();
});
it('renderer keeps unsupported events and unrelated runtime exports explicit',()=>{
  const h=harness();expect(()=>h.runtime.app.workspace.on('active-leaf-change',()=>{})).toThrow('Workspace event active-leaf-change');expect(()=>h.api.MarkdownRenderChild).toThrow('export MarkdownRenderChild');
});
