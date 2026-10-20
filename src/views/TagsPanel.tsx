import {Hash} from 'lucide-react';
import type {PanelViewProps} from './contract';

/** Tag list panel registered through the view-contribution service. */
export default function TagsPanel({tags,onSelectTag}:PanelViewProps){
  return <div className="tag-list">{tags.map(([tag,count])=><button key={tag} onClick={()=>onSelectTag(tag)}><Hash size={14}/><span>{tag}</span><small>{count}</small></button>)}</div>;
}
