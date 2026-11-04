// Original MIT test fixture, not copied from a community plugin or SDK.
const {Plugin,PluginSettingTab,Setting,Modal,SuggestModal,FileView,TextFileView,ItemView,EditorSuggest,BasesView,getLanguage,addIcon,getIcon,getIconIds,setIcon,setTooltip}=require('obsidian');
const {EditorView,keymap}=require('@codemirror/view');
const {StateField}=require('@codemirror/state');
class FixtureModal extends Modal {
  onOpen(){this.setTitle('Fixture modal');this.contentEl.createEl('input',{attr:{'aria-label':'Modal input'}});}
  onClose(){this.contentEl.empty();}
}
class FixtureView extends ItemView {
  getViewType(){return 'fixture-view';}
  getDisplayText(){return 'Fixture view';}
  onOpen(){this.contentEl.setText('Independent view opened');const action=this.addAction('check','Fixture view action',()=>{window.__fixtureViewActions=(window.__fixtureViewActions||0)+1;this.contentEl.setText('View action invoked');});action.addClass('fixture-style-probe');const icon=getIcon('check');icon.addClass('fixture-svg-probe');icon.removeClass('fixture-svg-probe');}
  setState(state){if(state?.file){this.file=state.file;this.contentEl.setText('Fixture file: '+this.file);}}
  getState(){return {file:this.file};}
}
class FixtureBasesView extends BasesView {
  render(container){container.createDiv({text:'Fixture bases view'});}
}
class FixtureSuggest extends EditorSuggest {
  constructor(app){super(app);this.limit=5;}
  onTrigger(cursor,editor){
    const line=editor.getLine(cursor.line),match=line.slice(0,cursor.ch).match(/@(\w*)$/);
    if(!match)return null;
    return {start:{line:cursor.line,ch:cursor.ch-match[0].length},end:cursor,query:match[1]};
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
class FixturePicker extends SuggestModal {
  constructor(app,status){super(app);this.status=status;this.setTitle('Fixture suggestions');this.setPlaceholder('Find fixture choice');}
  async getSuggestions(query){if(query==='slow')await new Promise(resolve=>setTimeout(resolve,200));return [query+' first',query+' second'];}
  renderSuggestion(value,el){el.textContent=value;}
  onChooseSuggestion(value){this.status.setText('Picked '+value);}
}
class FixtureTextView extends TextFileView {
  getViewType(){return 'fixture-text';}
  onOpen(){window.__fixtureTextView=this;this.input=this.contentEl.createEl('textarea',{attr:{'aria-label':'Fixture document'}});this.input.addEventListener('input',()=>{this.data=this.input.value;this.requestSave();});}
  getViewData(){return this.input.value;}
  setViewData(data){this.input.value=data;}
  clear(){this.input.value='';}
}
class FixtureEmbeddedView extends ItemView {
  getViewType(){return 'fixture-embedded';}
  getDisplayText(){return 'Embedded fixture';}
  async onOpen(){
    const probeEl=this.contentEl.createDiv(),embed=this.app.embedRegistry.embedByExtension.md({containerEl:probeEl},null);
    await embed.load();embed.showEditor();
    const Base=Object.getPrototypeOf(Object.getPrototypeOf(embed.editMode)).constructor;
    await embed.unload();probeEl.remove();
    const status=this.contentEl.createDiv({attr:{'data-testid':'embedded-editor-status'}});
    class LocalEditor extends Base {
      onChange(){status.setText(this.get());}
      onUpdate(update){super.onUpdate(update);if(update.docChanged)window.__fixtureSourceUpdates=(window.__fixtureSourceUpdates||0)+1;}
      buildLocalExtensions(){return [...super.buildLocalExtensions(),keymap.of([{key:'Enter',run:()=>{window.__fixtureSourceSubmit=this.get();return true;}}])];}
    }
    const editor=this.addChild(new LocalEditor(this.app,this.contentEl.createDiv(),{}));
    editor.set('embedded initial');
    window.__fixtureEmbeddedEditor=editor;
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
    this.registerView('fixture-text',leaf=>new FixtureTextView(leaf));this.registerExtensions(['txt'],'fixture-text');
    this.registerView('fixture-embedded',leaf=>new FixtureEmbeddedView(leaf));
    this.registerEditorSuggest(new FixtureSuggest(this.app));
    this.registerObsidianProtocolHandler('fixture-protocol',params=>this.status.setText('Protocol '+(params.value||'')));
    this.registerHoverLinkSource('fixture-hover',{display:'Fixture hover',defaultMod:true});
    this.registerEvent(this.app.workspace.on('hover-link',event=>{if(event.source==='fixture-hover')this.status.setText('Hover '+event.linktext);}));
    this.registerBasesView('fixture-bases',controller=>new FixtureBasesView(controller));
    this.addCommand({id:'protocol',name:'Dispatch protocol',callback:()=>window.dispatchEvent(new CustomEvent('engine:protocol',{detail:'obsidian://fixture-protocol?value=ok'}))});
    this.addCommand({id:'view',name:'Open view',callback:async()=>{const leaf=this.app.workspace.getRightLeaf(false);await leaf.setViewState({type:'fixture-view'});await this.app.workspace.revealLeaf(leaf);}});
    this.addCommand({id:'embedded-editor',name:'Open embedded editor',callback:async()=>{await this.app.workspace.getRightLeaf(false).setViewState({type:'fixture-embedded'});}});
    this.addCommand({id:'edit-focused',name:'Edit focused buffer',editorCallback:editor=>editor.setValue('focused command edit')});
    this.addCommand({id:'replace-focused',name:'Replace focused selection',editorCallback:editor=>editor.replaceSelection('focused selection')});
    this.addCommand({id:'text-markdown',name:'Open Markdown as text view',callback:async()=>{await this.app.workspace.getLeaf(false).setViewState({type:'fixture-text',state:{file:'Zeta.md'}});}});
    this.addCommand({id:'reuse-file',name:'Reuse leaf for another file',callback:async()=>{await this.app.workspace.getMostRecentLeaf().setViewState({type:'fixture-text',state:{file:'Test.txt'}});}});
    this.addCommand({id:'same-view-state',name:'Update current view state',callback:async()=>{const leaf=this.app.workspace.getMostRecentLeaf(),view=leaf.view;await leaf.setViewState({type:'fixture-text',state:{file:'Test.txt'}},{probe:true});this.status.setText('View reused: '+(leaf.view===view));window.__fixtureEphemeral=leaf.getEphemeralState();}});
    this.addCommand({id:'reuse-open',name:'Reuse and open',callback:async()=>{const leaf=this.app.workspace.getLeaf(false);await leaf.openFile(this.app.vault.getFileByPath('Z#.md'));await this.app.workspace.revealLeaf(leaf);this.status.setText('Reused leaf');}});
    this.addCommand({id:'modal',name:'Open modal',callback:()=>new FixtureModal(this.app).open()});
    this.addCommand({id:'picker',name:'Show fixture suggestions',callback:()=>new FixturePicker(this.app,this.status).open()});
    this.addCommand({id:'transitions',name:'Race fixture file transitions',callback:async()=>{
      const events=[];let release;const gate=new Promise(resolve=>release=resolve);
      class TransitionView extends FileView {
        async onLoadFile(file){events.push('load '+file.path);if(file.path==='Test.txt')await gate;events.push('loaded '+file.path);}
        async onUnloadFile(file){events.push('unload '+file.path);}
      }
      const view=new TransitionView(this.app.workspace.getLeaf());
      const pending=[view.setState({file:'Test.txt'}),view.setState({file:'Test.md'}),view.setState({file:'Zeta.md'}),view.onClose()];
      setTimeout(release,25);await Promise.all(pending);
      window.__fileTransitions={events,file:view.file};
      let reject=true;
      class RetryView extends FileView {async onLoadFile(){if(reject){reject=false;throw new Error('expected fixture load failure');}}}
      const retry=new RetryView(this.app.workspace.getLeaf());
      await retry.setState({file:'Test.md'}).catch(()=>{});await retry.setState({file:'Test.md'});
      window.__fileTransitions.retry=retry.file.path;await retry.onClose();this.status.setText('Transitions complete');
    }});
    this.addCommand({id:'icons',name:'Show fixture icons',callback:()=>{
      addIcon('fixture-custom','<path d="M0 0L10 10"/><script>window.badIcon=true</script>');
      const modal=new Modal(this.app);modal.setTitle('Fixture icons');
      modal.contentEl.append(getIcon('plus'),getIcon('lucide-plus'),getIcon('fixture-custom'),getIcon('fixture-custom'));
      const button=modal.contentEl.createEl('button');setIcon(button,'check');setTooltip(button,'Fixture icon button');
      modal.contentEl.createSpan({text:getIconIds().includes('fixture-custom')?'Registered icon':'Missing icon'});modal.open();
      modal.contentEl.createSpan({text:getIconIds().every(id=>getIcon(id))?'Icon ID roundtrip':'Broken icon ID'});
    }});
    const handler=this.app.scope.register(['Ctrl','Shift'],'u',()=>{window.__scopeCalls=(window.__scopeCalls||0)+1;this.status.setText('Scoped '+getLanguage());return false;});
    this.register(()=>this.app.scope.unregister(handler));
    this.addCommand({id:'extensions',name:'Replace extension',callback:()=>{this.extensions.splice(0,1,EditorView.updateListener.of(update=>{if(update.docChanged)this.status.setText('CM replacement');}));this.app.workspace.updateOptions();}});
    this.registerDomEvent(document,'fixture-dom-test',()=>this.status.setText('DOM event'));
    this.addCommand({id:'dom-event',name:'DOM event',callback:()=>document.dispatchEvent(new Event('fixture-dom-test'))});
  }
};
