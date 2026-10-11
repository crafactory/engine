import {useEffect,useMemo,useRef,useState} from 'react';
import * as d3 from 'd3';
import {Search,Focus,RotateCcw} from 'lucide-react';
import {links,resolveLink,tags,title,isNote} from './knowledge';
import type {Note} from './types';
interface GNode extends d3.SimulationNodeDatum {id:string;label:string;count:number;tag:string;ghost?:boolean}
interface GLink extends d3.SimulationLinkDatum<GNode> {source:string|GNode;target:string|GNode}
export function Graph({notes,active,onOpen,local=false}:{notes:Note[];active:string;onOpen:(path:string)=>void;local?:boolean}) {
  const svg=useRef<SVGSVGElement>(null);
  const [query,setQuery]=useState(''),[orphans,setOrphans]=useState(true),[unresolved,setUnresolved]=useState(false),[distance,setDistance]=useState(140),[depth,setDepth]=useState(1);
  const graph=useMemo(()=>{
    let visible=notes.filter(n=>isNote(n.path)&&(!query||(`${n.path} ${tags(n.content).join(' ')}`).toLowerCase().includes(query.toLowerCase())));
    const allEdges:{source:string;target:string}[]=[];
    for(const note of visible)for(const link of links(note.content)){
      const target=resolveLink(link.target,note.path,notes);
      if(target)allEdges.push({source:note.path,target:target.path});
      else if(unresolved)allEdges.push({source:note.path,target:link.target});
    }
    if(local){
      let ids=new Set([active]);
      for(let i=0;i<depth;i++){const next=new Set(ids);for(const edge of allEdges){if(ids.has(edge.source))next.add(edge.target);if(ids.has(edge.target))next.add(edge.source);}ids=next;}
      visible=visible.filter(n=>ids.has(n.path));
    }
    const ids=new Set(visible.map(n=>n.path));
    if(unresolved)for(const edge of allEdges)if(ids.has(edge.source)&&!notes.some(n=>n.path===edge.target))ids.add(edge.target);
    const edges=allEdges.filter(e=>ids.has(e.source)&&ids.has(e.target)&&e.source!==e.target);
    const nodes=[...ids].map(id=>({id,label:title(id),count:edges.filter(e=>e.source===id||e.target===id).length,tag:tags(notes.find(n=>n.path===id)?.content||'')[0]||'',ghost:!notes.some(n=>n.path===id)})).filter(n=>orphans||n.count>0);
    const remaining=new Set(nodes.map(n=>n.id));
    return {nodes,edges:edges.filter(e=>remaining.has(e.source)&&remaining.has(e.target))};
  },[notes,query,orphans,unresolved,local,active,depth]);
  useEffect(()=>{
    if(!svg.current)return;
    const element=svg.current;
    let width=Math.max(100,element.clientWidth),height=Math.max(100,element.clientHeight);
    const root=d3.select(element);root.selectAll('*').remove();
    root.attr('viewBox',`0 0 ${width} ${height}`);
    const group=root.append('g');
    const nodes:GNode[]=graph.nodes.map(n=>({...n})),edges:GLink[]=graph.edges.map(e=>({...e}));
    const palette=['#93c5af','#d4b47e','#91b9d1','#c5a6a1','#b4bc95'];
    const color=d3.scaleOrdinal(palette);
    const lines=group.append('g').selectAll('line').data(edges).join('line').attr('stroke','var(--graph-edge)').attr('stroke-width',1.2);
    const points=group.append('g').selectAll('g').data(nodes).join('g').attr('role','button').attr('tabindex',0).attr('aria-label',d=>'Open '+d.label).style('cursor','pointer')
      .on('click',(_,d)=>onOpen(d.id)).on('keydown',(event,d)=>{if(event.key==='Enter')onOpen(d.id);});
    points.append('circle').attr('r',d=>d.id===active?8:Math.min(7,3.5+d.count*.6)).attr('fill',d=>d.ghost?'var(--muted)':d.id===active?'var(--accent)':color(d.tag)).attr('opacity',d=>d.ghost?.5:.9);
    points.append('text').text(d=>d.label).attr('text-anchor','middle').attr('y',20).attr('fill','var(--text)').attr('font-size',12).attr('font-family','inherit');
    const simulation=d3.forceSimulation<GNode>(nodes)
      .force('link',d3.forceLink<GNode,GLink>(edges).id(d=>d.id).distance(distance))
      .force('charge',d3.forceManyBody().strength(-330))
      .force('center',d3.forceCenter(width/2,height/2))
      .force('collision',d3.forceCollide<GNode>().radius(65));
    simulation.on('tick',()=>{
      for(const node of nodes){node.x=Math.max(65,Math.min(width-65,node.x||width/2));node.y=Math.max(30,Math.min(height-35,node.y||height/2));}
      lines.attr('x1',d=>(d.source as GNode).x!).attr('y1',d=>(d.source as GNode).y!).attr('x2',d=>(d.target as GNode).x!).attr('y2',d=>(d.target as GNode).y!);
      points.attr('transform',d=>`translate(${d.x},${d.y})`);
    });
    points.call(d3.drag<any,GNode>().on('start',(event,d)=>{if(!event.active)simulation.alphaTarget(.2).restart();d.fx=d.x;d.fy=d.y;}).on('drag',(event,d)=>{d.fx=event.x;d.fy=event.y;}).on('end',(event,d)=>{if(!event.active)simulation.alphaTarget(0);d.fx=null;d.fy=null;}));
    root.call(d3.zoom<SVGSVGElement,unknown>().scaleExtent([.2,5]).on('zoom',event=>group.attr('transform',event.transform)));
    const observer=new ResizeObserver(records=>{
      width=Math.max(100,records[0].contentRect.width);height=Math.max(100,records[0].contentRect.height);
      root.attr('viewBox',`0 0 ${width} ${height}`);
      simulation.force('center',d3.forceCenter(width/2,height/2)).alpha(.3).restart();
    });
    observer.observe(element);
    return()=>{observer.disconnect();simulation.stop();};
  },[graph,distance,active,onOpen]);
  return <section className="graph-view">
    <div className="view-heading"><span><Focus size={16}/>{local?'Local graph':'Knowledge graph'}</span><span>{graph.nodes.length} notes · {graph.edges.length} connections</span></div>
    <div className="graph-body"><svg ref={svg} className="graph-svg" aria-label="Interactive note graph" data-testid="graph"/>
      <aside className="graph-controls">
        <label className="input-icon"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filter notes or tags" aria-label="Graph filter" data-testid="graph-filter"/></label>
        <label><input type="checkbox" checked={orphans} onChange={e=>setOrphans(e.target.checked)}/> Show orphan notes</label>
        <label><input type="checkbox" checked={unresolved} onChange={e=>setUnresolved(e.target.checked)}/> Show unresolved links</label>
        <label>Link distance<input type="range" min="60" max="300" value={distance} onChange={e=>setDistance(Number(e.target.value))}/></label>
        {local&&<label>Depth <input type="number" min="1" max="5" value={depth} onChange={e=>setDepth(Math.max(1,Math.min(5,Number(e.target.value))))}/></label>}
        <button onClick={()=>{setQuery('');setOrphans(true);setUnresolved(false);setDistance(140);}}><RotateCcw size={13}/> Reset filters</button>
      </aside>
    </div>
    <div className="view-footer">Drag to rearrange · Scroll to zoom · Click a note to open</div>
  </section>;
}
