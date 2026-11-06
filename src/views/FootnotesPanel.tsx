import {useMemo} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {footnotes} from '../footnotes';
import {isNote} from '../knowledge';
import type {PanelViewProps} from './contract';
import './footnotes.css';

/** Native right-slot view. Every edit goes through the actual source editor. */
export default function FootnotesPanel({notes,active,onJumpFootnote}:PanelViewProps){
  const note=notes.find(candidate=>candidate.path===active&&isNote(candidate.path));
  const items=useMemo(()=>note?footnotes(note.content):[],[note?.content]);
  const jump=(offset:number)=>{if(note)onJumpFootnote?.(note.path,note.content,offset);};
  return <section className="footnotes-panel" aria-label="Footnotes">
    <div className="section-heading"><span>Footnotes</span><small>{items.length}</small></div>
    {!note?<p className="sidebar-hint">Open a Markdown note to see its footnotes.</p>:!items.length?<p className="sidebar-hint">This note has no footnotes.</p>:
      <ol className="footnotes-list">{items.map((item,index)=><li key={item.key}>
        <button className="footnote-edit" aria-label={'Edit footnote '+(item.kind==='named'?item.label:'inline '+(index+1))} onClick={()=>jump(item.editOffset)}>
          <span className="footnote-label">{item.kind==='named'?'[^'+item.label+']':'Inline '+(index+1)}</span>
          <span className="footnote-text">{item.text||'Empty footnote'}</span>
        </button>
        <div className="footnote-references">{item.references.map((reference,i)=><button key={reference.from} aria-label={'Go to reference '+(i+1)+' of footnote '+(item.kind==='named'?item.label:'inline '+(index+1))} onClick={()=>jump(reference.from)}><ArrowUpRight size={12}/>{item.references.length>1?'Reference '+(i+1):'Go to reference'}</button>)}
          {!item.references.length&&<span>No references</span>}
        </div>
      </li>)}</ol>}
  </section>;
}
