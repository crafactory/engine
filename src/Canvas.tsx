import {useCallback,useEffect,useMemo,useRef,useState,type RefObject} from 'react';
import {ReactFlow,Background,Controls,MiniMap,Handle,Position,NodeResizer,MarkerType,applyNodeChanges,applyEdgeChanges,addEdge,useReactFlow,useNodesInitialized,type Node,type Edge,type NodeChange,type EdgeChange,type Connection} from '@xyflow/react';
import {Plus,FileText,Link,Group,ArrowRight,X} from 'lucide-react';
import {renderMarkdown} from './Markdown';
import {title} from './knowledge';
import type {Note} from './types';
import {canvasForeground,canvasBackground,canvasColors as colors} from './canvas-color';
import {parseCanvas} from './canvas-model';
interface CanvasData extends Record<string,unknown> {
  text?:string;file?:string;url?:string;label?:string;color?:string;
  kind:string;onEdit:(id:string)=>void;onOpen:(path:string)=>void;notes:Note[];readOnly?:boolean;
}
/** Display a Canvas node; read-only nodes suppress editing and connection affordances. */
function Card({id,data,selected}:{id:string;data:CanvasData;selected:boolean}) {
  const file=data.notes.find(n=>n.path===data.file);
  const background=canvasBackground(data.color);
  return <div className={'canvas-card '+(background?'canvas-colored ':'')+(data.kind==='group'?'canvas-group':'')} style={{background,color:background?canvasForeground(background):undefined}}>
    <NodeResizer color="#93c5af" isVisible={selected&&!data.readOnly} minWidth={160} minHeight={100}/>
    {[['left',Position.Left],['right',Position.Right],['top',Position.Top],['bottom',Position.Bottom]].map(([side,pos])=><Handle key={String(side)} id={String(side)} type="source" position={pos as Position} isConnectable={!data.readOnly}/> )}
    {[['left',Position.Left],['right',Position.Right],['top',Position.Top],['bottom',Position.Bottom]].map(([side,pos])=><Handle key={'t-'+side} id={'t-'+side} type="target" position={pos as Position} isConnectable={!data.readOnly}/>)}
    {data.kind==='file'?<><button className="canvas-file-label nodrag" onClick={()=>data.onOpen(data.file!)}><FileText size={14}/>{title(data.file!)}<ArrowRight size={13}/></button><div className="canvas-markdown" dangerouslySetInnerHTML={{__html:renderMarkdown(file?.content||'File not found')}}/></>:
      data.kind==='link'?<a className="nodrag canvas-url" href={/^https?:\/\//.test(data.url||'')?data.url:'#'} target="_blank" rel="noreferrer">{data.url}</a>:
      <div className="canvas-markdown" onDoubleClick={()=>data.onEdit(id)} dangerouslySetInnerHTML={{__html:renderMarkdown(data.kind==='group'?data.label||'Group':data.text||'Double-click to edit')}}/>}
    {!data.readOnly&&<button aria-label="Edit card" className="canvas-edit nodrag" onClick={()=>data.onEdit(id)}>Edit</button>}
  </div>;
}
const nodeTypes={card:Card};
/** Refit read-only geometry when its embedding container changes size or source content. */
function FitEmbed({host,revision}:{host:RefObject<HTMLElement>;revision:string}){
  const {fitView}=useReactFlow(),ready=useNodesInitialized();
  useEffect(()=>{
    const element=host.current;if(!element||!ready)return;
    let frame=0,disposed=false;
    /** Coalesce resize notifications after ReactFlow has measured the new container. */
    const fit=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(!disposed&&element.isConnected)void fitView({padding:0.15,minZoom:0.1,maxZoom:1});});};
    const observer=new ResizeObserver(fit);observer.observe(element);fit();
    return()=>{disposed=true;observer.disconnect();cancelAnimationFrame(frame);};
  },[host,revision,ready,fitView]);
  return null;
}
/** Render Canvas geometry with an optional read-only embed boundary that never persists changes. */
export function Canvas({note,notes,onChange,onOpen,readOnly=false}:{note:Note;notes:Note[];onChange:(value:string)=>void;onOpen:(path:string)=>void;readOnly?:boolean}) {
  const host=useRef<HTMLElement>(null);
  const [editing,setEditing]=useState<string|null>(null),[value,setValue]=useState(''),[color,setColor]=useState('');
  const parsed=useMemo(()=>parseCanvas(note.content),[note.content]);
  const [nodes,setNodes]=useState<Node<CanvasData>[]>([]),[edges,setEdges]=useState<Edge[]>([]);
  const parsedRef=useRef(parsed);parsedRef.current=parsed;
  /** Admit card editing only in the standalone view and read the newest parsed source. */
  const edit=useCallback((id:string)=>{if(readOnly)return;const node=parsedRef.current.data.nodes.find((n:any)=>n.id===id);if(node){setEditing(id);setValue(node.text||node.file||node.url||node.label||'');setColor(node.color||'');}},[readOnly]);
  useEffect(()=>{
    setNodes(parsed.data.nodes.map((node:any)=>({
      id:node.id,type:'card',position:{x:node.x,y:node.y},style:{width:node.width,height:node.height},
      zIndex:node.type==='group'?-1:0,data:{...node,kind:node.type,onEdit:edit,onOpen,notes,readOnly}
    })));
    setEdges(parsed.data.edges.map((edge:any)=>({id:edge.id,source:edge.fromNode,target:edge.toNode,sourceHandle:edge.fromSide||'right',targetHandle:'t-'+(edge.toSide||'left'),label:edge.label,markerEnd:edge.toEnd==='none'?undefined:{type:MarkerType.ArrowClosed},style:{stroke:canvasBackground(edge.color)||'var(--muted)'}})));
  },[parsed,notes,edit,onOpen,readOnly]);
  /** Preserve unknown JSON fields when persisting editable geometry; embeds reject all writes. */
  function save(nextNodes:Node<CanvasData>[],nextEdges:Edge[]) {
    if(readOnly)return;
    const oldNodes=new Map(parsed.data.nodes.map((n:any)=>[n.id,n]));
    const oldEdges=new Map(parsed.data.edges.map((e:any)=>[e.id,e]));
    onChange(JSON.stringify({...parsed.data,nodes:nextNodes.map(n=>({
      ...((oldNodes.get(n.id)||{})as any),id:n.id,type:n.data.kind,x:n.position.x,y:n.position.y,
      width:n.measured?.width||Number(n.style?.width)||280,height:n.measured?.height||Number(n.style?.height)||200,
      ...(n.data.text!==undefined?{text:n.data.text}:{}),...(n.data.file?{file:n.data.file}:{}),...(n.data.url?{url:n.data.url}:{}),...(n.data.label?{label:n.data.label}:{}),
      ...(n.data.color?{color:n.data.color}:{})
    })),edges:nextEdges.map(e=>({...((oldEdges.get(e.id)||{})as any),id:e.id,fromNode:e.source,toNode:e.target,fromSide:e.sourceHandle||'right',toSide:e.targetHandle?.replace(/^t-/,'')||'left',...(e.label?{label:e.label}:{})}))},null,2));
  }
  /** Apply ReactFlow measurements and persist completed editable node operations. */
  function nodeChanges(changes:NodeChange[]) {
    const next=applyNodeChanges(changes,nodes) as Node<CanvasData>[];setNodes(next);
    if(changes.some(c=>c.type==='remove'||(c.type==='position'&&c.dragging===false)||(c.type==='dimensions'&&c.resizing===false)))save(next,edges);
  }
  /** Keep visual edge state current, persisting removals only outside the read-only boundary. */
  function edgeChanges(changes:EdgeChange[]) {const next=applyEdgeChanges(changes,edges);setEdges(next);if(changes.some(c=>c.type==='remove'))save(nodes,next);}
  /** Create an original edge for an explicit editable connection gesture. */
  function connect(connection:Connection) {const next=addEdge({...connection,id:crypto.randomUUID()},edges);setEdges(next);save(nodes,next);}
  /** Create a typed card from the editable Canvas toolbar. */
  function add(kind:string) {
    const id=crypto.randomUUID();
    const node:Node<CanvasData>={id,type:'card',position:{x:100+nodes.length*30,y:100+nodes.length*30},style:{width:280,height:200},data:{kind,...(kind==='file'?{file:notes.find(n=>n.path.endsWith('.md'))?.path||''}:kind==='link'?{url:'https://example.com'}:kind==='group'?{label:'New group'}:{text:'## New idea\n\nDouble-click to edit.'}),notes,onEdit:edit,onOpen}};
    const next=[...nodes,node];setNodes(next);save(next,edges);
  }
  if(parsed.error)return <div className="empty"><h2>Invalid Canvas file</h2><p>{parsed.error}</p><p>Switch to source mode to repair the JSON.</p></div>;
  return <section ref={host} className={'canvas-view'+(readOnly?' canvas-embedded':'')} aria-label={readOnly?'Embedded Canvas':'Canvas editor'}>{!readOnly&&<div className="canvas-toolbar"><button onClick={()=>add('text')} data-testid="canvas-add-text"><Plus size={15}/>Text card</button><button onClick={()=>add('file')}><FileText size={15}/>Note</button><button onClick={()=>add('link')}><Link size={15}/>Link</button><button onClick={()=>add('group')}><Group size={15}/>Group</button><span>{nodes.length} cards · {edges.length} connections</span></div>}
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={nodeChanges} onEdgesChange={edgeChanges} onConnect={readOnly?undefined:connect} nodesDraggable={!readOnly} nodesConnectable={!readOnly} elementsSelectable={!readOnly} minZoom={readOnly?0.1:0.5} fitView fitViewOptions={readOnly?{minZoom:0.1,maxZoom:1,padding:0.15}:undefined} colorMode={document.documentElement.dataset.theme==='light'?'light':'dark'} deleteKeyCode={readOnly?null:['Backspace','Delete']}><Background gap={22} size={1}/><Controls showInteractive={!readOnly}/>{readOnly?<FitEmbed host={host} revision={note.content}/>:<MiniMap pannable zoomable/>}</ReactFlow>
    {editing&&<div className="modal-backdrop"><section className="modal card-modal" role="dialog" aria-label="Edit canvas card"><header><h2>Edit card</h2><button onClick={()=>setEditing(null)} aria-label="Close"><X size={16}/></button></header>
      <textarea aria-label="Card content" autoFocus value={value} onChange={e=>setValue(e.target.value)} data-testid="canvas-card-content"/>
      <label>Color<select value={color} onChange={e=>setColor(e.target.value)}><option value="">Default</option>{Object.keys(colors).map(c=><option key={c} value={c}>{['Red','Orange','Yellow','Green','Blue','Purple'][Number(c)-1]}</option>)}</select></label>
      <footer><button onClick={()=>setEditing(null)}>Cancel</button><button className="primary" data-testid="canvas-save-card" onClick={()=>{const next=nodes.map(n=>n.id===editing?{...n,data:{...n.data,color,[n.data.kind==='file'?'file':n.data.kind==='link'?'url':n.data.kind==='group'?'label':'text']:value}}:n);save(next,edges);setEditing(null);}}>Save card</button></footer>
    </section></div>}
  </section>;
}
