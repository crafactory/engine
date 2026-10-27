import {forwardRef,useEffect,useImperativeHandle,useLayoutEffect,useRef} from 'react';
import {EditorState,Compartment,type Extension} from '@codemirror/state';
import {EditorView,keymap,lineNumbers,highlightActiveLine,drawSelection} from '@codemirror/view';
import {markdown,markdownKeymap} from '@codemirror/lang-markdown';
import {defaultKeymap,history,historyKeymap,indentWithTab} from '@codemirror/commands';
import {searchKeymap,highlightSelectionMatches} from '@codemirror/search';
import {autocompletion,CompletionContext,type CompletionResult} from '@codemirror/autocomplete';
import {syntaxHighlighting,HighlightStyle} from '@codemirror/language';
import {tags as syntaxTags} from '@lezer/highlight';
import {isNote,tags,title,frontmatter} from './knowledge';
import type {Note,Settings} from './types';
import {livePreview,refreshLivePreview} from './LivePreview';
import {inlineLinks} from './inline-links';
import {liveRegions} from './live-model';
import {toDocumentOffset,toViewOffset,type EditorChange,type EditorSession} from './services/editor';
import type {SlashCommandsService} from './services/slash-commands';
export interface EditorHandle {path():string;insert(text:string):void;selection():string;replaceSelection(text:string):void;jump(offset:number):void;focus():void;find():void;snapshot():{text:string;from:number;to:number};applyPluginEdit(base:string,text:string,from:number,to:number):boolean}
const engineHighlight=HighlightStyle.define([
  {tag:syntaxTags.heading,fontWeight:'600',color:'var(--text)'},
  {tag:syntaxTags.strong,fontWeight:'600'},
  {tag:syntaxTags.emphasis,fontStyle:'italic'},
  {tag:[syntaxTags.link,syntaxTags.url],color:'var(--accent)'},
  {tag:syntaxTags.monospace,fontFamily:'monospace',color:'var(--accent-strong)'},
  {tag:[syntaxTags.contentSeparator,syntaxTags.processingInstruction],color:'var(--faint)'},
  {tag:syntaxTags.strikethrough,textDecoration:'line-through'}
]);
/** Wrap the current selection and retain its selected inner text for continued editing. */
function wrap(view:EditorView,marker:string) {
  const range=view.state.selection.main;
  const selected=view.state.sliceDoc(range.from,range.to);
  view.dispatch({changes:{from:range.from,to:range.to,insert:marker+selected+marker},selection:{anchor:range.from+marker.length,head:range.to+marker.length}});
  view.focus();return true;
}
/** Read the document offset at the top of the editor's visible area. */
function viewportTop(v:EditorView){const rect=v.scrollDOM.getBoundingClientRect();const pos=v.posAtCoords({x:rect.left+2,y:rect.top+2});return Math.max(0,Math.min(v.state.doc.length,pos??0));}
const contentAttributes=(spellcheck:boolean)=>EditorView.contentAttributes.of({spellcheck:String(spellcheck),'aria-label':'Note editor','data-testid':'note-editor'});
const editorTheme=(settings:Settings)=>EditorView.theme({'&':{height:'100%',fontSize:settings.fontSize+'px'},'.cm-scroller':{overflow:'auto',fontFamily:'inherit'},'.cm-content':{padding:'24px 0 100px'},'.cm-line':{padding:'0 4px'},'.cm-gutters':{background:'transparent',border:'none',color:'var(--muted)'},'.cm-activeLine':{background:'var(--hover)'},'.cm-cursor':{borderLeftColor:'var(--accent)'},'.cm-selectionBackground':{background:'var(--selection) !important'},'.cm-tooltip':{background:'var(--panel)',color:'var(--text)',border:'1px solid var(--border)'},'.cm-panels':{background:'var(--panel)',color:'var(--text)'}},{dark:settings.theme==='dark'});

export const Editor=forwardRef<EditorHandle,{note:Note;notes:Note[];settings:Settings;pluginExtensions?:Extension[];session?:EditorSession;slashCommands?:SlashCommandsService;onChange:(content:string)=>void;onOpen:(target:string)=>void;onCommand:(command:string)=>void;suggest?:(context:CompletionContext)=>CompletionResult|null|Promise<CompletionResult|null>}>(
/** Maintain the current CodeMirror document and independently refresh only external preview dependencies. */
function Editor({note,notes,settings,pluginExtensions=[],session,slashCommands,onChange,onOpen,onCommand,suggest},handle) {
  const container=useRef<HTMLDivElement>(null),view=useRef<EditorView>();
  const pluginCompartment=useRef(new Compartment()),lineNumbersCompartment=useRef(new Compartment()),themeCompartment=useRef(new Compartment()),spellcheckCompartment=useRef(new Compartment());
  const sessionRef=useRef(session);
  // Commit the session reference before the setup effect so handlers never use an abandoned render's session.
  useLayoutEffect(()=>{sessionRef.current=session;},[session]);
  const meta=frontmatter(note.content),hideMeta=settings.mode==='live'&&!meta.error;
  const viewContent=hideMeta?meta.body:note.content;
  const prefix=useRef('');prefix.current=hideMeta?meta.raw:'';
  const callbacks=useRef({onChange,onOpen,onCommand,notes,suggest,slashEnabled:!settings.disabledPlugins.includes('slash')});callbacks.current={onChange,onOpen,onCommand,notes,suggest,slashEnabled:!settings.disabledPlugins.includes('slash')};
  const external=useRef(false);
  const notePath=useRef(note.path);notePath.current=note.path;
  const hideMetaRef=useRef(hideMeta);hideMetaRef.current=hideMeta;
  useImperativeHandle(handle,()=>({
    path(){return notePath.current;},
    snapshot(){const v=view.current!;const r=v.state.selection.main;return {text:prefix.current+v.state.doc.toString(),from:r.anchor+prefix.current.length,to:r.head+prefix.current.length};},
    applyPluginEdit(base,text,from,to){
      const v=view.current;if(!v||prefix.current+v.state.doc.toString()!==base)return false;
      const parsed=frontmatter(text),nextPrefix=hideMetaRef.current&&!parsed.error?parsed.raw:'';
      if(from<nextPrefix.length||to<nextPrefix.length)throw new Error('Plugin selection inside hidden properties requires source mode');
      const next=text.slice(nextPrefix.length);prefix.current=nextPrefix;
      v.dispatch({changes:{from:0,to:v.state.doc.length,insert:next},selection:{anchor:Math.max(0,Math.min(next.length,from-nextPrefix.length)),head:Math.max(0,Math.min(next.length,to-nextPrefix.length))},userEvent:'input'});
      // A prefix-only change produces no CM document change, but must still persist.
      callbacks.current.onChange(text);return true;
    },
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
      if(callbacks.current.slashEnabled && slash && slashCommands && (slash.from===0 || /\s/.test(context.state.sliceDoc(slash.from-1,slash.from))))return {from:slash.from,options:slashCommands.list().map(command=>command.action==='insert-template'
        ? {label:command.label,detail:command.detail,apply:(v:EditorView,_c:any,from:number,to:number)=>{v.dispatch({changes:{from,to,insert:''}});callbacks.current.onCommand('insert-template');}}
        : {label:command.label,detail:command.detail,apply:command.insert??''})};
      return callbacks.current.suggest?.(context)??null;
    };
    const editor=new EditorView({
      parent:container.current!,state:EditorState.create({doc:viewContent,extensions:[
        markdown(),history(),drawSelection(),syntaxHighlighting(engineHighlight),highlightSelectionMatches(),EditorView.lineWrapping,pluginCompartment.current.of(pluginExtensions),
        lineNumbersCompartment.current.of(settings.lineNumbers?[lineNumbers()]:[]),
        ...(settings.mode==='live'?livePreview(()=>({path:note.path,notes:callbacks.current.notes,onOpen:target=>callbacks.current.onOpen(target)})):[highlightActiveLine()]),
        autocompletion({override:[complete]}),
        keymap.of([
          {key:'Mod-b',run:v=>wrap(v,'**')},{key:'Mod-i',run:v=>wrap(v,'*')},
          {key:'Mod-Shift-h',run:v=>wrap(v,'==')},
          ...markdownKeymap,...defaultKeymap,...historyKeymap,...searchKeymap,indentWithTab
        ]),
        spellcheckCompartment.current.of(contentAttributes(settings.spellcheck)),
        EditorView.updateListener.of(update=>{
          if(update.docChanged){const text=update.state.doc.toString(),prefixLength=prefix.current.length;if(!external.current){callbacks.current.onChange(prefix.current+text);const changes:EditorChange[]=[];update.changes.iterChanges((fromA,toA,_fromB,_toB,inserted)=>changes.push({from:fromA+prefixLength,to:toA+prefixLength,inserted:inserted.length}));sessionRef.current?.track(prefix.current+text,changes);}else sessionRef.current?.track(prefix.current+text);}
          if(update.selectionSet||update.docChanged){const range=update.state.selection.main,prefixLength=prefix.current.length;sessionRef.current?.setSelection({anchor:toDocumentOffset(range.anchor,prefixLength),head:toDocumentOffset(range.head,prefixLength)});}
        }),
        EditorView.domEventHandlers({
          /** Follow modifier-clicked supported links without intercepting ordinary source editing. */
          click(event,v){
            if(!(event.ctrlKey||event.metaKey))return false;
            const pos=v.posAtCoords({x:event.clientX,y:event.clientY});if(pos===null)return false;
            if(liveRegions(v.state.doc.toString()).literal.some(r=>pos>=r.from&&pos<r.to))return false;
            const line=v.state.doc.lineAt(pos);
            for(const link of inlineLinks(line.text)){if(pos>=line.from+link.from&&pos<=line.from+link.to){
              event.preventDefault();
              if(link.external)window.open(link.target,'_blank','noopener,noreferrer');else callbacks.current.onOpen(link.target);
              return true;
            }}
            return false;
          }
        }),
        themeCompartment.current.of(editorTheme(settings))
      ]})
    });view.current=editor;
    const activeSession=sessionRef.current,draft=activeSession?.draft();
    if(draft){const max=editor.state.doc.length,prefixLength=prefix.current.length;editor.dispatch({selection:{anchor:toViewOffset(draft.selection.anchor,prefixLength,max),head:toViewOffset(draft.selection.head,prefixLength,max)}});const viewport=toViewOffset(draft.viewport.anchor,prefixLength,max);if(viewport>0)editor.dispatch({effects:EditorView.scrollIntoView(viewport,{y:'start'})});}
    /** Persist the scroll anchor through the editor session so it survives remounts. */
    const trackScroll=()=>{const offset=toDocumentOffset(viewportTop(editor),prefix.current.length);sessionRef.current?.setViewport({anchor:offset,head:offset});};
    // Register after CodeMirror's scheduled viewport restore so that restore does not overwrite the draft.
    const scrollFrame=requestAnimationFrame(()=>editor.scrollDOM.addEventListener('scroll',trackScroll,{passive:true}));
    return()=>{cancelAnimationFrame(scrollFrame);editor.scrollDOM.removeEventListener('scroll',trackScroll);editor.destroy();};
  },[note.path,settings.mode,slashCommands]);
  useEffect(()=>{view.current?.dispatch({effects:lineNumbersCompartment.current.reconfigure(settings.lineNumbers?[lineNumbers()]:[])});},[settings.lineNumbers]);
  useEffect(()=>{view.current?.dispatch({effects:themeCompartment.current.reconfigure(editorTheme(settings))});},[settings.fontSize,settings.theme]);
  useEffect(()=>{view.current?.dispatch({effects:spellcheckCompartment.current.reconfigure(contentAttributes(settings.spellcheck))});},[settings.spellcheck]);
  useEffect(()=>{const v=view.current;if(v&&v.state.doc.toString()!==viewContent){external.current=true;v.dispatch({changes:{from:0,to:v.state.doc.length,insert:viewContent}});external.current=false;}},[viewContent]);
  // Current-document edits already rebuild the field in their CM transaction.
  const linkedRevision=notes.filter(n=>n.path!==note.path).map(n=>n.path+'\0'+n.content).join('\0');
  useEffect(()=>{if(settings.mode==='live')view.current?.dispatch({effects:refreshLivePreview.of(null)});},[linkedRevision,settings.mode]);
  useEffect(()=>{view.current?.dispatch({effects:pluginCompartment.current.reconfigure(pluginExtensions)});},[pluginExtensions]);
  return <div ref={container} className={'editor '+(settings.readableWidth?'readable':'')} data-testid="editor-surface"/>;
});
