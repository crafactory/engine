import {useState,useRef} from 'react';
import {X} from 'lucide-react';
export function useDialog() {
  const [dialog,setDialog]=useState<{title:string;description?:string;value?:string;danger?:boolean;submit:string}|null>(null);
  const resolve=useRef<(value:string|null)=>void>();
  function finish(value:string|null){resolve.current?.(value);resolve.current=undefined;setDialog(null);}
  function ask(title:string,value='',description=''):Promise<string|null>{
    return new Promise(r=>{resolve.current=r;setDialog({title,value,description,submit:'Continue'});});
  }
  async function confirm(title:string,description:string,danger=false){
    const value=await new Promise<string|null>(r=>{resolve.current=r;setDialog({title,description,danger,submit:danger?'Move to trash':'Continue'});});
    return value!==null;
  }
  const ui=dialog?<div className="modal-backdrop" onClick={()=>finish(null)}><form className="modal input-modal" role="dialog" aria-modal="true" aria-label={dialog.title} onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();finish(dialog.value??'yes');}}>
    <header><h2>{dialog.title}</h2><button type="button" aria-label="Close dialog" onClick={()=>finish(null)}><X size={17}/></button></header>
    {dialog.description&&<p>{dialog.description}</p>}
    {dialog.value!==undefined&&<input autoFocus aria-label={dialog.title} data-testid="dialog-input" value={dialog.value} onChange={e=>setDialog({...dialog,value:e.target.value})} onFocus={e=>e.target.select()} onKeyDown={e=>{if(e.key==='Escape')finish(null);}}/>}
    <footer><button type="button" onClick={()=>finish(null)}>Cancel</button><button type="submit" className={dialog.danger?'danger':'primary'} data-testid="dialog-submit">{dialog.submit}</button></footer>
  </form></div>:null;
  return {ask,confirm,ui};
}
