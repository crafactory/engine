import {FileText,Group,Link,Plus} from 'lucide-react';

/** Editable Canvas toolbar; read-only embeds do not render it. */
export function CanvasToolbar({onAdd,nodeCount,edgeCount}:{onAdd:(kind:string)=>void;nodeCount:number;edgeCount:number}){
  return <div className="canvas-toolbar"><button onClick={()=>onAdd('text')} data-testid="canvas-add-text"><Plus size={15}/>Text card</button><button onClick={()=>onAdd('file')}><FileText size={15}/>Note</button><button onClick={()=>onAdd('link')}><Link size={15}/>Link</button><button onClick={()=>onAdd('group')}><Group size={15}/>Group</button><span>{nodeCount} cards · {edgeCount} connections</span></div>;
}
