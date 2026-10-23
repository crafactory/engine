import {it,expect,vi} from 'vitest';
import {EditorSuggest,createCompatibilityRuntime,supportedExports,type PluginSnapshot} from '../src/compat-core';
import {rendererExports} from '../src/compat-dom';
import inventory from '../docs/compatibility/obsidian-exports.json';
const manifest={id:'renderer-test',name:'Renderer test',version:'1'};
const initial=():PluginSnapshot=>({name:'Test',active:'One.md',entries:[{path:'One.md',name:'One.md',folder:false,size:3,ctime:0,mtime:0}],notes:[{path:'One.md',content:'one'}],editor:null});
function harness(){
  const settingCleanup=vi.fn(),extensionCleanup=vi.fn(),viewCleanup=vi.fn(),extensionsCleanup=vi.fn(),suggestCleanup=vi.fn(),protocolCleanup=vi.fn(),hoverCleanup=vi.fn(),basesCleanup=vi.fn(),updateOptions=vi.fn(),ribbonCleanup=vi.fn(),ribbonElement={remove:ribbonCleanup} as unknown as HTMLElement;
  const ui={exports:{EditorSuggest},workspace:{getLeaf:()=>({fixture:true})},statusBar:vi.fn(),ribbonIcon:vi.fn(()=>ribbonElement),settingTab:vi.fn(()=>settingCleanup),editorExtension:vi.fn(()=>extensionCleanup),registerView:vi.fn(()=>viewCleanup),registerExtensions:vi.fn(()=>extensionsCleanup),editorSuggest:vi.fn(()=>suggestCleanup),protocolHandler:vi.fn(()=>protocolCleanup),hoverLinkSource:vi.fn(()=>hoverCleanup),basesView:vi.fn(()=>basesCleanup),updateOptions};
  const runtime=createCompatibilityRuntime(manifest,initial(),{ui,request:async()=>null,commands:()=>{},notice:()=>{}});
  return {runtime,api:runtime.api as any,ui,settingCleanup,extensionCleanup,viewCleanup,extensionsCleanup,suggestCleanup,protocolCleanup,hoverCleanup,basesCleanup,updateOptions,ribbonCleanup,ribbonElement};
}
it('renderer export registry is documented, unique and disjoint from Worker exports',()=>{
  expect(rendererExports).toHaveLength(21);expect(new Set(rendererExports).size).toBe(21);
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
  class FixtureSuggest extends h.api.EditorSuggest {onTrigger(){return {start:0,end:1};}getSuggestions(){return ['one'];}}
  class Fixture extends h.api.Plugin {onload(){this.addSettingTab(tab);this.addRibbonIcon('star','Star',()=>{});this.registerEditorExtension(extension);this.registerView('test',()=>{});this.registerExtensions(['foo'],'test');this.registerEditorSuggest(new FixtureSuggest());this.registerObsidianProtocolHandler('fixture',()=>{});this.registerHoverLinkSource('fixture',{display:'Fixture',defaultMod:true});this.registerBasesView('fixture-bases',()=>({render(){}}));this.app.workspace.updateOptions();}}
  await h.runtime.boot(Fixture);expect(h.ui.settingTab).toHaveBeenCalledWith(tab);expect(h.ui.ribbonIcon).toHaveBeenCalledWith('star','Star',expect.any(Function));expect(h.ui.editorExtension).toHaveBeenCalledWith(extension);expect(h.ui.registerExtensions).toHaveBeenCalledWith(['foo'],'test');expect(h.ui.editorSuggest).toHaveBeenCalledWith(expect.any(h.api.EditorSuggest));expect(h.ui.protocolHandler).toHaveBeenCalledWith('fixture',expect.any(Function));expect(h.ui.hoverLinkSource).toHaveBeenCalledWith('fixture',{display:'Fixture',defaultMod:true});expect(h.ui.basesView).toHaveBeenCalledWith('fixture-bases',expect.any(Function));expect(h.updateOptions).toHaveBeenCalledOnce();
  await h.runtime.stop();await h.runtime.stop();expect(h.settingCleanup).toHaveBeenCalledOnce();expect(h.extensionCleanup).toHaveBeenCalledOnce();expect(h.viewCleanup).toHaveBeenCalledOnce();expect(h.ribbonCleanup).toHaveBeenCalledOnce();expect(h.extensionsCleanup).toHaveBeenCalledOnce();expect(h.suggestCleanup).toHaveBeenCalledOnce();expect(h.protocolCleanup).toHaveBeenCalledOnce();expect(h.hoverCleanup).toHaveBeenCalledOnce();expect(h.basesCleanup).toHaveBeenCalledOnce();
});
it('renderer keeps unsupported events and unrelated runtime exports explicit',()=>{
  const h=harness();expect(()=>h.runtime.app.workspace.on('active-leaf-change',()=>{})).toThrow('Workspace event active-leaf-change');expect(()=>h.api.MarkdownPreviewView).toThrow('export MarkdownPreviewView');
});
