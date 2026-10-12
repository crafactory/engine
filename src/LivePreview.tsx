import {useState} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {StateField,StateEffect,RangeSetBuilder,type EditorState} from '@codemirror/state';
import {EditorView,Decoration,WidgetType,type DecorationSet} from '@codemirror/view';
import DOMPurify from 'dompurify';
import katex from 'katex';
import {Markdown,renderMarkdown} from './Markdown';
import {liveRegions,touchesRange,tableRows,replaceTableCell,type LiveBlock,type TableCell} from './live-model';
import type {Note} from './types';
import {inlineLinks,type InlineLink} from './inline-links';

export const refreshLivePreview=StateEffect.define<null>();
interface Context {path:string;notes:Note[];onOpen:(target:string)=>void}
const roots=new WeakMap<HTMLElement,Root>();
const blockOwners=new WeakMap<HTMLElement,BlockWidget>();

function LiveTable({content,onChange}:{content:string;onChange:(value:string)=>void}){
  const [edit,setEdit]=useState<{cell:TableCell;row:number;col:number;value:string}|null>(null);
  const rows=tableRows(content);
  function commit(){if(edit){onChange(replaceTableCell(content,edit.cell,edit.value));setEdit(null);}}
  return <div className="live-table-scroll"><table className="live-table"><thead>{rows.filter(r=>r.header).map((row,r)=><tr key={r}>{row.cells.map((cell,c)=><th key={c}>{cellUI(cell,0,c)}</th>)}</tr>)}</thead>
    <tbody>{rows.filter(r=>!r.header).map((row,r)=><tr key={r}>{row.cells.map((cell,c)=><td key={c}>{cellUI(cell,r+1,c)}</td>)}</tr>)}</tbody></table></div>;
  function cellUI(cell:TableCell,row:number,col:number){
    if(edit?.row===row&&edit.col===col)return <input autoFocus aria-label={`Cell row ${row+1} column ${col+1}`} value={edit.value}
      onChange={e=>setEdit({...edit,value:e.target.value})} onBlur={commit}
      onKeyDown={e=>{if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();commit();}else if(e.key==='Escape'){e.preventDefault();setEdit(null);}}}/>;
    return <button aria-label={`Edit cell row ${row+1} column ${col+1}`} onClick={()=>setEdit({cell,row,col,value:cell.value})}
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
  updateDOM(host:HTMLElement){const old=blockOwners.get(host);if(!old||!this.sameContent(old))return false;blockOwners.set(host,this);return true;}
  /** Mount a bounded live widget without admitting reading-only plugin processors. */
  toDOM(view:EditorView){
    const host=document.createElement('div');host.className='live-block live-block-'+this.block.kind;
    blockOwners.set(host,this);
    host.dataset.liveBlock=this.block.kind;host.contentEditable='false';
    const edit=document.createElement('button');edit.className='live-edit-source';edit.textContent='Edit source';
    edit.setAttribute('aria-label','Edit '+this.block.kind+' source');
    const reveal=()=>{const owner=blockOwners.get(host)!;if(owner.current(view)){view.dispatch({selection:{anchor:owner.block.from},scrollIntoView:true});view.focus();}};
    edit.onclick=reveal;host.append(edit);
    const body=document.createElement('div');body.className='live-block-body';host.append(body);
    body.ondblclick=e=>{if(!(e.target as HTMLElement).closest('button,input,a,summary,audio,video'))reveal();};
    const root=createRoot(body);roots.set(host,root);
    const onChange=(content:string)=>{
      const owner=blockOwners.get(host)!;
      if(owner.current(view))view.dispatch({changes:{from:owner.block.from,to:owner.block.to,insert:content},userEvent:'input'});
    };
    const ctx=this.context();
    root.render(this.block.kind==='table'?<LiveTable content={this.block.content} onChange={onChange}/>:
      <Markdown content={this.block.content} notes={ctx.notes} path={ctx.path} onOpen={ctx.onOpen} onChange={onChange} pluginProcessing={false}/>);
    requestAnimationFrame(()=>{if(host.isConnected)view.requestMeasure();});
    return host;
  }
  current(view:EditorView){return view.state.sliceDoc(this.block.from,this.block.to)===this.block.content;}
  destroy(dom:HTMLElement){const root=roots.get(dom);roots.delete(dom);blockOwners.delete(dom);queueMicrotask(()=>root?.unmount());}
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
  constructor(readonly expression:string){super();}
  eq(other:InlineMathWidget){return this.expression===other.expression;}
  toDOM(){const span=document.createElement('span');span.className='live-inline-math';span.innerHTML=DOMPurify.sanitize(katex.renderToString(this.expression,{throwOnError:false,trust:false}));return span;}
}
class TaskWidget extends WidgetType {
  constructor(readonly from:number,readonly prefix:string,readonly checked:boolean,readonly label:string){super();}
  eq(other:TaskWidget){return this.from===other.from&&this.prefix===other.prefix&&this.checked===other.checked&&this.label===other.label;}
  toDOM(view:EditorView){
    const box=document.createElement('input');box.type='checkbox';box.checked=this.checked;box.contentEditable='false';box.className='live-task-checkbox';
    box.setAttribute('aria-label','Toggle task: '+this.label);
    box.onchange=()=>{const start=this.from+this.prefix.length;
      if(/^\[[ xX]\]$/.test(view.state.sliceDoc(start,start+3)))view.dispatch({changes:{from:start+1,to:start+2,insert:box.checked?'x':' '},userEvent:'input'});
    };return box;
  }
  ignoreEvent(){return true;}
}

export function livePreview(context:()=>Context){
  const field=StateField.define<DecorationSet>({
    create:state=>build(state,context),
    update:(value,tr)=>tr.docChanged||tr.selection||tr.effects.some(e=>e.is(refreshLivePreview))?build(tr.state,context):value,
    provide:field=>EditorView.decorations.from(field)
  });
  // Styled source marks must remain selectable/editable; only rendered widgets are atomic.
  return [field,EditorView.atomicRanges.of(view=>view.state.field(field).update({filter:(_from,_to,dec)=>!!dec.spec.widget}))];
}
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
