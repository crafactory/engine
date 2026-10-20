import {Link2} from 'lucide-react';
import {resolveLink} from '../knowledge';
import type {PanelViewProps} from './contract';

/** Outgoing-links panel registered as a right-slot view contribution. */
export default function OutgoingPanel({outgoing,active,notes,onOpenLink}:PanelViewProps){
  return <div className="outgoing-section">
    <div className="section-heading"><span>Outgoing links</span><small>{outgoing.length}</small></div>
    <div className="bookmark-list">{outgoing.map((link,index)=><button key={index} onClick={()=>onOpenLink(link.target+(link.fragment?'#'+link.fragment:''))}><Link2 size={13}/>{link.label||link.target}<span className={resolveLink(link.target,active,notes)?'':'unresolved'}>{resolveLink(link.target,active,notes)?'':'New'}</span></button>)}</div>
  </div>;
}
