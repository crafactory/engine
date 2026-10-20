import type {PanelViewProps} from './contract';

/** Outline panel registered as a right-slot view contribution. */
export default function OutlinePanel({headings,onJumpHeading}:PanelViewProps){
  return <div className="outline-list">{headings.length?headings.map((heading,index)=><button key={index} style={{paddingLeft:14+(heading.level-1)*12}} onClick={()=>onJumpHeading(heading)}>{heading.text}</button>):<p className="sidebar-hint">Headings in your note will appear here.</p>}</div>;
}
