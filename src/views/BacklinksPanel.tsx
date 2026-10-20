import {FileText} from 'lucide-react';
import {frontmatter,title} from '../knowledge';
import type {PanelViewProps} from './contract';

/** Linked and unlinked mentions panel registered as a right-slot view contribution. */
export default function BacklinksPanel({incoming,mentions,activeTitle,onOpen}:PanelViewProps){
  return <div className="backlinks-section">
    <div className="section-heading"><span>Linked mentions</span><small>{incoming.length}</small></div>
    <div className="mention-list">
      {incoming.map(note=><button key={note.path} onClick={()=>onOpen(note.path)}>
        <span><FileText size={13}/>{title(note.path)}</span>
        <p>{frontmatter(note.content).body.split('\n').find(line=>line.includes('[[')&&line.toLowerCase().includes(activeTitle.toLowerCase()))?.replace(/[[\]#*]/g,'')||'Links to this note'}</p>
      </button>)}
      {!incoming.length&&<p className="sidebar-hint">Notes that link here will appear here.</p>}
    </div>
    <details className="unlinked"><summary>Unlinked mentions <span>{mentions.length}</span></summary>{mentions.map(note=><button key={note.path} onClick={()=>onOpen(note.path)}>{title(note.path)}</button>)}</details>
  </div>;
}
