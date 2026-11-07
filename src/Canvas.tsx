import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ReactFlow,Background,Controls,MiniMap,MarkerType,applyNodeChanges,applyEdgeChanges,addEdge,type Node,type Edge,type NodeChange,type EdgeChange,type Connection} from '@xyflow/react';
import {parseCanvas} from './canvas-model';
import {canvasBackground} from './canvas-color';
import type {Note} from './types';
import type {CanvasData} from './views/canvas/types';
import {canvasNodeTypes} from './views/canvas/Card';
import {FitEmbed} from './views/canvas/FitEmbed';
import {CanvasToolbar} from './views/canvas/CanvasToolbar';
import {CardEditor} from './views/canvas/CardEditor';

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
  return <section ref={host} className={'canvas-view'+(readOnly?' canvas-embedded':'')} aria-label={readOnly?'Embedded Canvas':'Canvas editor'}>{!readOnly&&<CanvasToolbar onAdd={add} nodeCount={nodes.length} edgeCount={edges.length}/>}
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={canvasNodeTypes} onNodesChange={nodeChanges} onEdgesChange={edgeChanges} onConnect={readOnly?undefined:connect} nodesDraggable={!readOnly} nodesConnectable={!readOnly} elementsSelectable={!readOnly} minZoom={readOnly?0.1:0.5} fitView fitViewOptions={readOnly?{minZoom:0.1,maxZoom:1,padding:0.15}:undefined} colorMode={document.documentElement.dataset.theme==='light'?'light':'dark'} deleteKeyCode={readOnly?null:['Backspace','Delete']}><Background gap={22} size={1}/><Controls showInteractive={!readOnly}/>{readOnly?<FitEmbed host={host} revision={note.content}/>:<MiniMap pannable zoomable/>}</ReactFlow>
    {editing&&<CardEditor value={value} color={color} onValue={setValue} onColor={setColor} onCancel={()=>setEditing(null)} onSave={()=>{const next=nodes.map(n=>n.id===editing?{...n,data:{...n.data,color,[n.data.kind==='file'?'file':n.data.kind==='link'?'url':n.data.kind==='group'?'label':'text']:value}}:n);save(next,edges);setEditing(null);}}/>}
  </section>;
}
