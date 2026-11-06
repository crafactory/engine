import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import type {Footnote,FootnotesResponse} from '../footnotes';
import {isNote} from '../knowledge';
import type {PanelViewProps} from './contract';
import './footnotes.css';

/** Native right-slot view. Every edit goes through the actual source editor. */
export default function FootnotesPanel({notes,active,onJumpFootnote}:PanelViewProps){
  const note=notes.find(candidate=>candidate.path===active&&isNote(candidate.path));
  const worker=useRef<Worker|null>(null),request=useRef({id:0,path:'',base:''});
  const [result,setResult]=useState<{path:string;base:string;items:Footnote[];error?:string}|null>(null);
  const [startupError,setStartupError]=useState(false);
  useEffect(()=>{
    let alive=true;
    try{
      const parser=new Worker(new URL('../footnotes.worker.ts',import.meta.url),{type:'module',name:'engine-footnotes'});
      worker.current=parser;
      parser.onmessage=(event:MessageEvent<FootnotesResponse>)=>{
        if(!alive||event.data.id!==request.current.id)return;
        const {path,base}=request.current;
        setResult({path,base,items:event.data.items??[],error:event.data.error});
      };
      parser.onerror=event=>{event.preventDefault();if(alive){console.warn('FOOTNOTES_WORKER:',event.message);setStartupError(true);}};
    }catch{setStartupError(true);}
    return ()=>{alive=false;worker.current?.terminate();worker.current=null;};
  },[]);
  useEffect(()=>{
    request.current={id:request.current.id+1,path:note?.path??'',base:note?.content??''};
    if(note)worker.current?.postMessage({id:request.current.id,content:note.content});
    else setResult(null);
  },[note?.path,note?.content]);
  const snapshot=result?.path===note?.path&&result?.base===note?.content?result:null;
  const items=snapshot?.items??[],busy=!!note&&!snapshot&&!startupError;
  const jump=(offset:number)=>{if(note&&snapshot)onJumpFootnote?.(note.path,snapshot.base,offset);};
  return <section className="footnotes-panel" aria-label="Footnotes" aria-busy={busy}>
    <div className="section-heading"><span>Footnotes</span><small>{busy?'...':items.length}</small></div>
    {!note?<p className="sidebar-hint">Open a Markdown note to see its footnotes.</p>:startupError||snapshot?.error?<p className="sidebar-hint" role="alert">Footnotes could not be parsed. Close and reopen this view to retry.</p>:busy?<p className="sidebar-hint" role="status">Loading footnotes...</p>:!items.length?<p className="sidebar-hint">This note has no footnotes.</p>:
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
