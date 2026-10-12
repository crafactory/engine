// Original test harness. No proprietary or community-plugin implementation.
const {Plugin,MarkdownRenderChild,MarkdownRenderer,Modal}=require('obsidian');
class Child extends MarkdownRenderChild {
  /** Attach the original fixture owner and choose whether this child owns a native click handler. */
  constructor(element,plugin,interactive=false){super(element);this.plugin=plugin;this.interactive=interactive;}
  /** Persist startup and install an owned native handler only for the code child. */
  async onload(){
    const p=this.plugin;p.data.loads++;await p.saveData(p.data);p.updateStatus();
    const button=this.containerEl.querySelector('button');
    if(this.interactive&&button)this.registerDomEvent(button,'click',async()=>{p.data.clicks++;await p.saveData(p.data);p.updateStatus();});
  }
  /** Persist cleanup so native acceptance can prove balanced child lifecycle counts. */
  async onunload(){const p=this.plugin;p.data.unloads++;await p.saveData(p.data);p.updateStatus();}
}
class RenderModal extends Modal {
  /** Exercise sanitized, nonrecursive static rendering inside a real dialog. */
  async onOpen(){this.setTitle('Static Markdown');await MarkdownRenderer.render(this.app,'**Rendered safely** <script>danger</script>',this.contentEl,'Test.md',this.plugin);}
}
module.exports=class extends Plugin {
  /** Expose diagnostic lifecycle and click counts in a visible native status item. */
  updateStatus(){this.status.setText('Children: '+this.data.loads+'/'+this.data.unloads+'; clicks: '+this.data.clicks);}
  /** Register original bounded processors and commands without importing any upstream implementation. */
  async onload(){
    this.data={loads:0,unloads:0,clicks:0};this.status=this.addStatusBarItem();this.updateStatus();
    this.registerMarkdownPostProcessor((element,context)=>{
      element.createSpan({cls:'processor-order',text:'HIGH'});
      element.createDiv({cls:'processor-context',text:context.sourcePath+' / '+context.frontmatter?.example+' / '+String(context.getSectionInfo(element))});
      context.addChild(new Child(element,this));
    },20);
    this.registerMarkdownPostProcessor(element=>element.createSpan({cls:'processor-order',text:'LOW'}),-10);
    this.registerMarkdownCodeBlockProcessor('engine-fixture',(source,element,context)=>{
      this.codeElement=element;const button=element.createEl('button',{text:'Rendered '+source.trim()});button.setAttr('aria-label','Processed code');
      context.addChild(new Child(element,this,true));
    },5);
    this.addCommand({id:'remove',name:'Remove rendered child',callback:()=>this.codeElement?.remove()});
    this.addCommand({id:'static',name:'Static Markdown',callback:()=>{const modal=new RenderModal(this.app);modal.plugin=this;modal.open();}});
  }
};
