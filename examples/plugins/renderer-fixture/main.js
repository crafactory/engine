// Original MIT test fixture, not copied from a community plugin or SDK.
const {Plugin,PluginSettingTab,Setting,Modal,ItemView,EditorSuggest,BasesView}=require('obsidian');
const {EditorView}=require('@codemirror/view');
const {StateField}=require('@codemirror/state');
class FixtureModal extends Modal {
  onOpen(){this.setTitle('Fixture modal');this.contentEl.createEl('input',{attr:{'aria-label':'Modal input'}});}
  onClose(){this.contentEl.empty();}
}
class FixtureView extends ItemView {
  getViewType(){return 'fixture-view';}
  getDisplayText(){return 'Fixture view';}
  onOpen(){this.contentEl.setText('Independent view opened');}
  setState(state){if(state?.file){this.file=state.file;this.contentEl.setText('Fixture file: '+this.file);}}
  getState(){return {file:this.file};}
}
class FixtureBasesView extends BasesView {
  render(container){container.createDiv({text:'Fixture bases view'});}
}
class FixtureSuggest extends EditorSuggest {
  constructor(app){super(app);this.limit=5;}
  onTrigger(editor){
    const cursor=editor.getCursor(),line=editor.getLine(cursor.line),match=line.slice(0,cursor.ch).match(/@(\w*)$/);
    if(!match)return null;
    return {start:{line:cursor.line,ch:cursor.ch-match[0].length},end:cursor};
  }
  getSuggestions(context){const query=context.query.replace(/^@/,'');return ['Alpha','Beta'].filter(value=>value.toLowerCase().startsWith(query.toLowerCase()));}
  selectSuggestion(value){
    const context=this.context;if(!context)return;
    context.editor.replaceRange('@'+value,context.start,context.end);
  }
}
class FixtureSettings extends PluginSettingTab {
  display(){
    this.containerEl.empty();const p=this.plugin;
    new Setting(this.containerEl).setName('Fixture text').addText(c=>c.setValue(p.data.text||'').onChange(async text=>{p.data.text=text;await p.saveData(p.data);}));
    new Setting(this.containerEl).setName('Fixture format').addDropdown(c=>c.addOptions({one:'One',two:'Two'}).setValue(p.data.format||'one').onChange(async format=>{p.data.format=format;await p.saveData(p.data);}));
    new Setting(this.containerEl).setName('Fixture toggle').addToggle(c=>c.setValue(!!p.data.toggle).onChange(async toggle=>{p.data.toggle=toggle;await p.saveData(p.data);}));
    new Setting(this.containerEl).setName('Fixture slider').addSlider(c=>c.setLimits(1,10,1).setValue(p.data.slider||1).onChange(async slider=>{p.data.slider=slider;await p.saveData(p.data);}));
    new Setting(this.containerEl).setName('Fixture textarea').addTextArea(c=>c.setValue(p.data.area||'').onChange(async area=>{p.data.area=area;await p.saveData(p.data);}));
    new Setting(this.containerEl).setName('Fixture button').addButton(c=>c.setButtonText('Open fixture modal').onClick(()=>new FixtureModal(this.app).open()));
  }
}
module.exports=class extends Plugin {
  async onload(){
    this.data=(await this.loadData())||{};
    this.status=this.addStatusBarItem();this.status.setText('CM changes: 0');this.changes=0;
    this.registerEditorExtension(StateField.define({create:()=>0,update:(value,tr)=>value+(tr.docChanged?1:0)}));
    this.extensions=[EditorView.updateListener.of(update=>{if(update.docChanged)this.status.setText('CM changes: '+(++this.changes));})];
    this.registerEditorExtension(this.extensions);
    this.addSettingTab(new FixtureSettings(this.app,this));
    this.registerView('fixture-view',leaf=>new FixtureView(leaf));
    this.registerExtensions(['fixture'],'fixture-view');
    this.registerEditorSuggest(new FixtureSuggest(this.app));
    this.registerObsidianProtocolHandler('fixture-protocol',params=>this.status.setText('Protocol '+(params.value||'')));
    this.registerHoverLinkSource('fixture-hover',{display:'Fixture hover',defaultMod:true});
    this.registerBasesView('fixture-bases',controller=>new FixtureBasesView(controller));
    this.addCommand({id:'protocol',name:'Dispatch protocol',callback:()=>window.dispatchEvent(new CustomEvent('engine:protocol',{detail:'obsidian://fixture-protocol?value=ok'}))});
    this.addCommand({id:'view',name:'Open view',callback:async()=>{const leaf=this.app.workspace.getRightLeaf(false);await leaf.setViewState({type:'fixture-view'});await this.app.workspace.revealLeaf(leaf);}});
    this.addCommand({id:'modal',name:'Open modal',callback:()=>new FixtureModal(this.app).open()});
    this.addCommand({id:'extensions',name:'Replace extension',callback:()=>{this.extensions.splice(0,1,EditorView.updateListener.of(update=>{if(update.docChanged)this.status.setText('CM replacement');}));this.app.workspace.updateOptions();}});
    this.registerDomEvent(document,'fixture-dom-test',()=>this.status.setText('DOM event'));
    this.addCommand({id:'dom-event',name:'DOM event',callback:()=>document.dispatchEvent(new Event('fixture-dom-test'))});
  }
};
