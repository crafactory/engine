import {useEffect,useRef,useState} from 'react';
import {Search,FileText,Terminal,ArrowUp,ArrowDown,CornerDownLeft,X} from 'lucide-react';
import {fuzzy} from './knowledge';
export interface Choice {id:string;label:string;description?:string;shortcut?:string;run:()=>void}
export function Palette({title,items,onClose,onCreate,initial=''}:{title:string;items:Choice[];onClose:()=>void;onCreate?:(text:string)=>void;initial?:string}) {
  const [query,setQuery]=useState(initial),[index,setIndex]=useState(0);
  const list=useRef<HTMLDivElement>(null);
  const filtered=items.map(item=>({item,score:query?fuzzy(query,item.label+' '+(item.description||'')):0})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score).slice(0,60).map(x=>x.item);
  useEffect(()=>setIndex(0),[query]);
  useEffect(()=>{list.current?.querySelectorAll('button')[index]?.scrollIntoView({block:'nearest'});},[index]);
  const run=(item:Choice)=>{onClose();item.run();};
  return <div className="modal-backdrop palette-backdrop" onClick={onClose}><section className="palette" role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()}>
    <div className="palette-input"><Search size={20}/><input autoFocus aria-label={title} data-testid="palette-input" placeholder={title==='Quick switcher'?'Find a note…':'Type a command…'} value={query} onChange={e=>setQuery(e.target.value)}
      onKeyDown={e=>{if(e.key==='Escape')onClose();if(e.key==='ArrowDown'){e.preventDefault();setIndex(Math.min(filtered.length-1,index+1));}if(e.key==='ArrowUp'){e.preventDefault();setIndex(Math.max(0,index-1));}if(e.key==='Enter'){e.preventDefault();if(filtered[index])run(filtered[index]);else if(onCreate&&query){onClose();onCreate(query);}}}}/><button onClick={onClose} aria-label="Close palette"><X size={17}/></button></div>
    <div className="palette-title">{title}</div>
    <div className="palette-list" ref={list}>{filtered.length?filtered.map((item,i)=><button key={item.id} className={i===index?'selected':''} onMouseEnter={()=>setIndex(i)} onClick={()=>run(item)} data-testid={'palette-item-'+item.id}>
      {title==='Quick switcher'?<FileText size={16}/>:<Terminal size={16}/>}<span><strong>{item.label}</strong>{item.description&&<small>{item.description}</small>}</span>{item.shortcut&&<kbd>{item.shortcut}</kbd>}
    </button>):<div className="empty"><h3>No matches</h3><p>{onCreate?'Press Enter to create this note.':'Try a shorter command name.'}</p></div>}</div>
    <footer><span><ArrowUp size={12}/><ArrowDown size={12}/> Navigate</span><span><CornerDownLeft size={12}/> Open</span><span>Esc to close</span></footer>
  </section></div>;
}
