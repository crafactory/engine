import {forwardRef,useEffect,useImperativeHandle,useRef} from 'react';
import {EditorState,RangeSetBuilder} from '@codemirror/state';
import {EditorView,keymap,lineNumbers,highlightActiveLine,Decoration,ViewPlugin,ViewUpdate,WidgetType} from '@codemirror/view';
import {markdown,markdownKeymap} from '@codemirror/lang-markdown';
import {defaultKeymap,history,historyKeymap,indentWithTab} from '@codemirror/commands';
import {searchKeymap,highlightSelectionMatches} from '@codemirror/search';
import {autocompletion,CompletionContext} from '@codemirror/autocomplete';
import {syntaxHighlighting,HighlightStyle} from '@codemirror/language';
import {tags as syntaxTags} from '@lezer/highlight';
import {isNote,tags,title,frontmatter} from './knowledge';
import type {Note,Settings} from './types';
export interface EditorHandle {insert(text:string):void;selection():string;replaceSelection(text:string):void;jump(offset:number):void;focus():void;find():void}
const engineHighlight=HighlightStyle.define([
  {tag:syntaxTags.heading,fontWeight:'600',color:'var(--text)'},
  {tag:syntaxTags.strong,fontWeight:'600'},
  {tag:syntaxTags.emphasis,fontStyle:'italic'},
  {tag:[syntaxTags.link,syntaxTags.url],color:'var(--accent)'},
  {tag:syntaxTags.monospace,fontFamily:'monospace',color:'var(--accent-strong)'},
  {tag:[syntaxTags.contentSeparator,syntaxTags.processingInstruction],color:'var(--faint)'},
  {tag:syntaxTags.strikethrough,textDecoration:'line-through'}
]);
function wrap(view:EditorView,marker:string) {
  const range=view.state.selection.main;
  const selected=view.state.sliceDoc(range.from,range.to);
  view.dispatch({changes:{from:range.from,to:range.to,insert:marker+selected+marker},selection:{anchor:range.from+marker.length,head:range.to+marker.length}});
  view.focus();return true;
}
const liveDecorations=ViewPlugin.fromClass(class {
  decorations:any;
  constructor(view:EditorView){this.decorations=this.build(view);}
  update(update:ViewUpdate){if(update.docChanged||update.selectionSet||update.viewportChanged)this.decorations=this.build(update.view);}
  build(view:EditorView) {
    const builder=new RangeSetBuilder<Decoration>();
    const current=view.state.doc.lineAt(view.state.selection.main.head).number;
    const ranges:{from:number;to:number;dec:Decoration}[]=[];
    let fence=false;
    for(let number=1;number<=view.state.doc.lines;number++) {
      const line=view.state.doc.line(number);
      if(/^\s*(```|~~~)/.test(line.text)){fence=!fence;continue;}
      if(fence||number===current)continue;
      const heading=line.text.match(/^(#{1,6}) /);
      if(heading){ranges.push({from:line.from,to:line.from,dec:Decoration.line({class:'live-heading live-h'+heading[1].length})});ranges.push({from:line.from,to:line.from+heading[0].length,dec:Decoration.replace({})});}
      for(const match of line.text.matchAll(/(\*\*|==|~~|`)(.+?)\1|\[\[([^\]]+)\]\]/g)) {
        const from=line.from+match.index!,to=from+match[0].length;
        if(match[3]) {
          ranges.push({from,to,dec:Decoration.mark({class:'live-link'})});
          ranges.push({from,to:from+2,dec:Decoration.replace({})});
          const pipe=match[0].indexOf('|');
          if(pipe>=0)ranges.push({from:from+2,to:from+pipe+1,dec:Decoration.replace({})});
          ranges.push({from:to-2,to,dec:Decoration.replace({})});
        }else{
          const marker=match[1],length=marker.length;
          ranges.push({from,to,dec:Decoration.mark({class:marker==='**'?'live-bold':marker==='=='?'live-mark':marker==='~~'?'live-strike':'live-code'})});
          ranges.push({from,to:from+length,dec:Decoration.replace({})});ranges.push({from:to-length,to,dec:Decoration.replace({})});
        }
      }
    }
    ranges.sort((a,b)=>a.from-b.from||a.dec.startSide-b.dec.startSide||a.to-b.to);
    for(const r of ranges)builder.add(r.from,r.to,r.dec);
    return builder.finish();
  }
},{decorations:v=>v.decorations});
export const Editor=forwardRef<EditorHandle,{note:Note;notes:Note[];settings:Settings;onChange:(content:string)=>void;onOpen:(target:string)=>void;onCommand:(command:string)=>void}>(
function Editor({note,notes,settings,onChange,onOpen,onCommand},handle) {
  const container=useRef<HTMLDivElement>(null),view=useRef<EditorView>();
  const meta=frontmatter(note.content),hideMeta=settings.mode==='live'&&!meta.error;
  const viewContent=hideMeta?meta.body:note.content;
  const prefix=useRef('');prefix.current=hideMeta?meta.raw:'';
  const callbacks=useRef({onChange,onOpen,onCommand,notes});callbacks.current={onChange,onOpen,onCommand,notes};
  const external=useRef(false);
  useImperativeHandle(handle,()=>({
    insert(text){const v=view.current!;const r=v.state.selection.main;v.dispatch({changes:{from:r.from,to:r.to,insert:text},selection:{anchor:r.from+text.length}});v.focus();},
    selection(){const v=view.current!;const r=v.state.selection.main;return v.state.sliceDoc(r.from,r.to);},
    replaceSelection(text){const v=view.current!;const r=v.state.selection.main;v.dispatch({changes:{from:r.from,to:r.to,insert:text}});v.focus();},
    jump(offset){const v=view.current;if(v)v.dispatch({selection:{anchor:Math.min(v.state.doc.length,Math.max(0,offset-prefix.current.length))},scrollIntoView:true});v?.focus();},
    focus(){view.current?.focus();},
    find(){import('@codemirror/search').then(({openSearchPanel})=>view.current&&openSearchPanel(view.current));}
  }),[]);
  useEffect(()=>{
    const complete=(context:CompletionContext)=>{
      const wiki=context.matchBefore(/\[\[[^\]\n]*/);
      if(wiki)return {from:wiki.from+2,options:callbacks.current.notes.filter(n=>isNote(n.path)).map(n=>({label:n.path.replace(/\.md$/,''),displayLabel:title(n.path),type:'text',apply:n.path.replace(/\.md$/,'')+']]'}))};
      const tag=context.matchBefore(/#[\w/-]*/);
      if(tag)return {from:tag.from+1,options:[...new Set(callbacks.current.notes.flatMap(n=>tags(n.content)))].map(label=>({label,type:'keyword'}))};
      const slash=context.matchBefore(/\/[\w-]*/);
      if(!settings.disabledPlugins.includes('slash') && slash && (slash.from===0 || /\s/.test(context.state.sliceDoc(slash.from-1,slash.from))))return {from:slash.from,options:[
        {label:'/heading',apply:'# ',detail:'Heading'},
        {label:'/task',apply:'- [ ] ',detail:'Task'},
        {label:'/callout',apply:'> [!note] Note\n> ',detail:'Callout'},
        {label:'/table',apply:'| Column | Column |\n| --- | --- |\n|  |  |',detail:'Table'},
        {label:'/code',apply:'```\n\n```',detail:'Code block'},
        {label:'/template',apply:(v:EditorView,_c:any,from:number,to:number)=>{v.dispatch({changes:{from,to,insert:''}});callbacks.current.onCommand('insert-template');},detail:'Insert template'},
      ]};
      return null;
    };
    const editor=new EditorView({
      parent:container.current!,state:EditorState.create({doc:viewContent,extensions:[
        markdown(),history(),syntaxHighlighting(engineHighlight),highlightSelectionMatches(),EditorView.lineWrapping,
        ...(settings.lineNumbers?[lineNumbers()]:[]),
        ...(settings.mode==='live'?[liveDecorations]:[highlightActiveLine()]),
        autocompletion({override:[complete]}),
        keymap.of([
          {key:'Mod-b',run:v=>wrap(v,'**')},{key:'Mod-i',run:v=>wrap(v,'*')},
          {key:'Mod-Shift-h',run:v=>wrap(v,'==')},
          ...markdownKeymap,...defaultKeymap,...historyKeymap,...searchKeymap,indentWithTab
        ]),
        EditorView.contentAttributes.of({spellcheck:String(settings.spellcheck),'aria-label':'Note editor','data-testid':'note-editor'}),
        EditorView.updateListener.of(update=>{if(update.docChanged&&!external.current)callbacks.current.onChange(prefix.current+update.state.doc.toString());}),
        EditorView.domEventHandlers({
          click(event,v){
            if(!(event.ctrlKey||event.metaKey))return false;
            const pos=v.posAtCoords({x:event.clientX,y:event.clientY});if(pos===null)return false;
            const line=v.state.doc.lineAt(pos);
            for(const m of line.text.matchAll(/\[\[([^\]]+)\]\]/g)){if(pos>=line.from+m.index!&&pos<=line.from+m.index!+m[0].length){callbacks.current.onOpen(m[1].split('|')[0]);return true;}}
            return false;
          }
        }),
        EditorView.theme({'&':{height:'100%',fontSize:settings.fontSize+'px'},'.cm-scroller':{overflow:'auto',fontFamily:'inherit'},'.cm-content':{padding:'24px 0 100px'},'.cm-line':{padding:'0 4px'},'.cm-gutters':{background:'transparent',border:'none',color:'var(--muted)'},'.cm-activeLine':{background:'var(--hover)'},'.cm-cursor':{borderLeftColor:'var(--accent)'},'.cm-selectionBackground':{background:'var(--selection) !important'},'.cm-tooltip':{background:'var(--panel)',color:'var(--text)',border:'1px solid var(--border)'},'.cm-panels':{background:'var(--panel)',color:'var(--text)'}},{dark:settings.theme==='dark'})
      ]})
    });view.current=editor;
    return()=>{editor.destroy();};
  },[note.path,settings.mode,settings.lineNumbers,settings.fontSize,settings.theme,settings.spellcheck,settings.disabledPlugins]);
  useEffect(()=>{const v=view.current;if(v&&v.state.doc.toString()!==viewContent){external.current=true;v.dispatch({changes:{from:0,to:v.state.doc.length,insert:viewContent}});external.current=false;}},[viewContent]);
  return <div ref={container} className={'editor '+(settings.readableWidth?'readable':'')} data-testid="editor-surface"/>;
});
