import {ArrowRight,FileText} from 'lucide-react';
import {Handle,NodeResizer,Position} from '@xyflow/react';
import {renderMarkdown} from '../../Markdown';
import {title} from '../../knowledge';
import {canvasForeground,canvasBackground} from '../../canvas-color';
import type {CanvasData} from './types';

/** Display a Canvas node; read-only nodes suppress editing and connection affordances. */
export function Card({id,data,selected}:{id:string;data:CanvasData;selected:boolean}) {
  const file=data.notes.find(note=>note.path===data.file);
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

export const canvasNodeTypes={card:Card};
