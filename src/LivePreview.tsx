import {useState,useLayoutEffect,useRef} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {StateField,StateEffect,RangeSetBuilder,type EditorState} from '@codemirror/state';
import {EditorView,Decoration,WidgetType,type DecorationSet} from '@codemirror/view';
import DOMPurify from 'dompurify';
import katex from 'katex';
import {Markdown,renderMarkdown} from './Markdown';
import {liveRegions,touchesRange,tableRows,replaceTableCell,minimalBlockChange,type LiveBlock,type TableCell} from './live-model';
import type {Note} from './types';
import {inlineLinks,type InlineLink} from './inline-links';

export const refreshLivePreview=StateEffect.define<null>();
interface Context {path:string;notes:Note[];onOpen:(target:string)=>void}
const roots=new WeakMap<HTMLElement,Root>();
const blockOwners=new WeakMap<HTMLElement,BlockWidget>();

/** Edit bounded Markdown cells while retaining source delimiter and literal-pipe semantics. */
function LiveTable({content,onChange,onMeasure}:{content:string;onChange:(value:string)=>void;onMeasure:()=>void}){
  const [edit,setEdit]=useState<{cell:TableCell;row:number;col:number;value:string;base:string}|null>(null);
  const host=useRef<HTMLDivElement>(null),pendingFocus=useRef<string|null>(null);
  // Measure after reconciliation; a cell is valid only for the source version that opened it.
  useLayoutEffect(()=>{
    if(pendingFocus.current){
      const button=host.current?.querySelector<HTMLButtonElement>(`button[data-live-cell="${pendingFocus.current}"]`);
      pendingFocus.current=null;
      button?.focus({preventScroll:true});button?.scrollIntoView({block:'nearest',inline:'nearest'});
    }
    onMeasure();
  },[content,onMeasure,!!edit]);
  const rows=tableRows(content);
  /** Commit the active cell through the owning block's current source coordinates. */
  function commit(focus=false){if(edit){if(focus)pendingFocus.current=edit.row+':'+edit.col;if(edit.base===content)onChange(replaceTableCell(content,edit.cell,edit.value));setEdit(null);}}
  return <div ref={host} className="live-table-scroll"><table className="live-table"><thead>{rows.filter(r=>r.header).map((row,r)=><tr key={r}>{row.cells.map((cell,c)=><th key={c}>{cellUI(cell,0,c)}</th>)}</tr>)}</thead>
    <tbody>{rows.filter(r=>!r.header).map((row,r)=><tr key={r}>{row.cells.map((cell,c)=><td key={c}>{cellUI(cell,r+1,c)}</td>)}</tr>)}</tbody></table></div>;
  /** Expose either a focusable cell button or its temporary text input. */
  function cellUI(cell:TableCell,row:number,col:number){
    if(edit?.base===content&&edit.row===row&&edit.col===col)return <input autoFocus aria-label={`Cell row ${row+1} column ${col+1}`} value={edit.value}
      onChange={e=>setEdit({...edit,value:e.target.value})} onBlur={()=>commit()}
      onKeyDown={e=>{if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();commit(true);}else if(e.key==='Escape'){e.preventDefault();pendingFocus.current=row+':'+col;setEdit(null);}}}/>;
    return <button data-live-cell={row+':'+col} aria-label={`Edit cell row ${row+1} column ${col+1}`} onClick={()=>setEdit({cell,row,col,value:cell.value,base:content})}
      dangerouslySetInnerHTML={{__html:renderMarkdown(cell.value)||'<span class="live-empty-cell">Empty</span>'}}/>;
  }
}

class BlockWidget extends WidgetType {
  readonly notes:Note[];
  /** Snapshot external documents without treating current-document typing as a dependency refresh. */
  constructor(readonly block:LiveBlock,readonly context:()=>Context){super();this.notes=context().notes.filter(n=>n.path!==context().path);}
  /** Compare linked-note content rather than the array replaced by each current-note keystroke. */
  sameContent(other:BlockWidget){return this.block.kind===other.block.kind&&this.block.content===other.block.content&&this.context===other.context&&this.notes.length===other.notes.length&&this.notes.every((n,i)=>n.path===other.notes[i].path&&n.content===other.notes[i].content);}
  /** Let CodeMirror reuse a widget only when both its content and source coordinates match. */
  eq(other:BlockWidget){return this.block.from===other.block.from&&this.block.to===other.block.to&&this.sameContent(other);}
  /** Reuse measured DOM while rebinding edit callbacks to newly mapped source positions. */
  updateDOM(host:HTMLElement,view:EditorView){
    const old=blockOwners.get(host);if(!old)return false;
    if(this.block.kind==='table'&&old.block.kind==='table'&&this.context===old.context){
      blockOwners.set(host,this);
      if(this.block.content!==old.block.content)this.renderBody(host,view);
      return true;
    }
    if(!this.sameContent(old))return false;
    blockOwners.set(host,this);return true;
  }
  /** Reconcile into the existing React root and reject edits based on superseded source content. */
  renderBody(host:HTMLElement,view:EditorView){
    const root=roots.get(host);if(!root)return;
    const base=this.block.content;
    /** Persist only a still-owned block revision and keep its pre-edit viewport anchor. */
    const onChange=(content:string)=>{
      const owner=blockOwners.get(host);
      if(owner?.block.content===base&&owner.current(view)){
        const changes=minimalBlockChange(owner.block.from,base,content);
        // Anchor the viewport before replacing widget-backed source; selection may be elsewhere.
        if(changes)view.dispatch({changes,effects:view.scrollSnapshot(),userEvent:'input'});
      }
    };
    const ctx=this.context();
    root.render(this.block.kind==='table'?<LiveTable content={base} onChange={onChange} onMeasure={()=>{if(blockOwners.has(host))view.requestMeasure();}}/>:
      <Markdown content={base} notes={ctx.notes} path={ctx.path} onOpen={ctx.onOpen} onChange={onChange} pluginProcessing={false}/>);
  }
  /** Mount a bounded live widget without admitting reading-only plugin processors. */
  toDOM(view:EditorView){
    const host=document.createElement('div');host.className='live-block live-block-'+this.block.kind;
    blockOwners.set(host,this);
    host.dataset.liveBlock=this.block.kind;host.contentEditable='false';
    const edit=document.createElement('button');edit.className='live-edit-source';edit.textContent='Edit source';
    edit.setAttribute('aria-label','Edit '+this.block.kind+' source');
    /** Reveal the current source range rather than coordinates captured by an older widget. */
    const reveal=()=>{const owner=blockOwners.get(host);if(owner?.current(view)){view.dispatch({selection:{anchor:owner.block.from},scrollIntoView:true});view.focus();}};
    edit.onclick=reveal;host.append(edit);
    const body=document.createElement('div');body.className='live-block-body';host.append(body);
    body.ondblclick=e=>{if(!(e.target as HTMLElement).closest('button,input,a,summary,audio,video'))reveal();};
    const root=createRoot(body);roots.set(host,root);
    this.renderBody(host,view);
    requestAnimationFrame(()=>{if(host.isConnected)view.requestMeasure();});
    return host;
  }
  /** Reject gestures whose captured block no longer matches the editor document. */
  current(view:EditorView){return view.state.sliceDoc(this.block.from,this.block.to)===this.block.content;}
  /** Release the owned React root after CodeMirror finishes its synchronous DOM update. */
  destroy(dom:HTMLElement){const root=roots.get(dom);roots.delete(dom);blockOwners.delete(dom);queueMicrotask(()=>root?.unmount());}
  /** Keep widget controls independent of CodeMirror's source-selection event handling. */
  ignoreEvent(){return true;}
}
class LinkWidget extends WidgetType {
  /** Bind an immutable safe link token to the current editor's navigation context. */
  constructor(readonly link:InlineLink,readonly context:()=>Context){super();}
  /** Preserve the link node when its displayed label and destination are unchanged. */
  eq(other:LinkWidget){return this.link.target===other.link.target&&this.link.label===other.link.label&&this.context===other.context;}
  /** Render a keyboard-accessible link without changing selection before navigation. */
  toDOM(){
    const anchor=document.createElement('a');anchor.className='live-link';anchor.textContent=this.link.label;
    if(this.link.external){anchor.href=this.link.target;anchor.target='_blank';anchor.rel='noopener noreferrer';}
    else {anchor.href='#';anchor.onclick=e=>{e.preventDefault();this.context().onOpen(this.link.target);};}
    return anchor;
  }
  /** Let anchors handle pointer and keyboard activation rather than editing hidden syntax. */
  ignoreEvent(){return true;}
}
class InlineMathWidget extends WidgetType {
  /** Capture the expression rendered by this immutable inline widget. */
  constructor(readonly expression:string){super();}
  /** Reuse unchanged sanitized math nodes. */
  eq(other:InlineMathWidget){return this.expression===other.expression;}
  /** Render untrusted math with KaTeX trust disabled and sanitized output. */
  toDOM(){const span=document.createElement('span');span.className='live-inline-math';span.innerHTML=DOMPurify.sanitize(katex.renderToString(this.expression,{throwOnError:false,trust:false}));return span;}
}
class TaskWidget extends WidgetType {
  /** Capture a checkbox's verified source marker and accessible task label. */
  constructor(readonly from:number,readonly prefix:string,readonly checked:boolean,readonly label:string){super();}
  /** Preserve checkbox DOM only while its complete source identity remains unchanged. */
  eq(other:TaskWidget){return this.from===other.from&&this.prefix===other.prefix&&this.checked===other.checked&&this.label===other.label;}
  /** Toggle a still-matching source marker through an undoable editor transaction. */
  toDOM(view:EditorView){
    const box=document.createElement('input');box.type='checkbox';box.checked=this.checked;box.contentEditable='false';box.className='live-task-checkbox';
    box.setAttribute('aria-label','Toggle task: '+this.label);
    box.onchange=()=>{const start=this.from+this.prefix.length;
      if(/^\[[ xX]\]$/.test(view.state.sliceDoc(start,start+3)))view.dispatch({changes:{from:start+1,to:start+2,insert:box.checked?'x':' '},userEvent:'input'});
    };return box;
  }
  /** Let the checkbox own its input event rather than move the source cursor. */
  ignoreEvent(){return true;}
}

/** Register original live decorations and restrict atomic ranges to rendered widgets. */
export function livePreview(context:()=>Context){
  const field=StateField.define<DecorationSet>({
    create:state=>build(state,context),
    update:(value,tr)=>tr.docChanged||tr.selection||tr.effects.some(e=>e.is(refreshLivePreview))?build(tr.state,context):value,
    provide:field=>EditorView.decorations.from(field)
  });
  // Styled source marks must remain selectable/editable; only rendered widgets are atomic.
  return [field,EditorView.atomicRanges.of(view=>view.state.field(field).update({filter:(_from,_to,dec)=>!!dec.spec.widget}))];
}
/** Build bounded block and inline previews while keeping selected source editable. */
function build(state:EditorState,context:()=>Context):DecorationSet {
  const ranges:{from:number;to:number;dec:Decoration}[]=[];
  const selected=state.selection.ranges;
  const {blocks,literal}=liveRegions(state.doc.toString());
  for(const block of blocks)if(!touchesRange(block.from,block.to,selected))ranges.push({from:block.from,to:block.to,dec:Decoration.replace({block:true,widget:new BlockWidget(block,context)})});
  for(let n=1;n<=state.doc.lines;n++){
    const line=state.doc.line(n);
    if([...blocks,...literal].some(b=>line.from>=b.from&&line.from<b.to))continue;
    const active=touchesRange(line.from,line.to+1,selected);
    const links=inlineLinks(line.text);
    for(const link of links)ranges.push({from:line.from+link.from,to:line.from+link.to,dec:active?Decoration.mark({class:'live-link',attributes:{'data-live-target':link.target}}):Decoration.replace({widget:new LinkWidget(link,context)})});
    if(active)continue;
    const heading=line.text.match(/^(#{1,6}) /);
    if(heading){ranges.push({from:line.from,to:line.from,dec:Decoration.line({class:'live-heading live-h'+heading[1].length})});ranges.push({from:line.from,to:line.from+heading[0].length,dec:Decoration.replace({})});}
    const task=line.text.match(/^(\s*[-*+] +)\[([ xX])\] (.*)$/);
    if(task)ranges.push({from:line.from,to:line.from+task[1].length+3,dec:Decoration.replace({widget:new TaskWidget(line.from,task[1],task[2].toLowerCase()==='x',task[3])})});
    const occupied:{from:number;to:number}[]=[];
    for(const match of line.text.matchAll(/(\*\*|==|~~|`)(.+?)\1/g)){
      const from=line.from+match.index!,to=from+match[0].length;occupied.push({from,to});
      if(links.some(link=>from<line.from+link.to&&to>line.from+link.from))continue;
      const marker=match[1],length=marker.length;
      ranges.push({from,to,dec:Decoration.mark({class:marker==='**'?'live-bold':marker==='=='?'live-mark':marker==='~~'?'live-strike':'live-code'})},
        {from,to:from+length,dec:Decoration.replace({})},{from:to-length,to,dec:Decoration.replace({})});
    }
    for(const match of line.text.matchAll(/(?<!\\)\$(?!\$)([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\$)/g)){
      const from=line.from+match.index!,to=from+match[0].length;
      if(!occupied.some(r=>from<r.to&&to>r.from))ranges.push({from,to,dec:Decoration.replace({widget:new InlineMathWidget(match[1])})});
    }
  }
  ranges.sort((a,b)=>a.from-b.from||a.dec.startSide-b.dec.startSide||a.to-b.to);
  const builder=new RangeSetBuilder<Decoration>();for(const r of ranges)builder.add(r.from,r.to,r.dec);
  return builder.finish();
}
