import {useEffect,useMemo,useRef,useState} from 'react';
import {parse,stringify} from 'yaml';
import {Table2,LayoutGrid,List,Download,Plus,Filter} from 'lucide-react';
import {frontmatter,setProperties,title,isNote} from './knowledge';
import {baseFilter,expression} from './base-expression';
import type {Note,Entry} from './types';
import type {PluginController} from './plugins';
export function Bases({note,notes,entries,onOpen,onChange,onNoteChange,ask,pluginBases}:{note:Note;notes:Note[];entries:Entry[];onOpen:(path:string)=>void;onChange:(value:string)=>void;onNoteChange:(path:string,content:string)=>void;ask:(title:string,value?:string,description?:string)=>Promise<string|null>;pluginBases?:Record<string,{controller:PluginController;id:string}>}) {
  const [viewIndex,setViewIndex]=useState(0),[query,setQuery]=useState(''),[sort,setSort]=useState('file.name'),[desc,setDesc]=useState(false);
  const data=useMemo(()=>{try{return {base:parse(note.content)||{},error:''};}catch(e){return {base:{},error:String(e)};}},[note.content]);
  const view=data.base.views?.[viewIndex]||{type:'table',name:'All notes'};
  const columns:string[]=view.order||['file.name','note.status','note.tags','file.folder'];
  const result=useMemo(()=>{
    if(pluginBases?.[view.type])return {rows:[] as Note[],cells:{} as Record<string,Record<string,any>>,error:''};
    let error=data.error;
    const cells:Record<string,Record<string,any>>={};
    let rows:Note[]=[];
    try {
      if(!['table','cards','list'].includes(view.type||'table'))throw new Error('Unsupported view type: '+view.type);
      rows=notes.filter(n=>isNote(n.path)).filter(n=>{
        const entry=entries.find(e=>e.path===n.path);
        if(!baseFilter(data.base.filters,n,entry,notes,data.base.formulas||{})||!baseFilter(view.filters,n,entry,notes,data.base.formulas||{}))return false;
        if(query&&!(`${n.path} ${JSON.stringify(frontmatter(n.content).properties)}`).toLowerCase().includes(query.toLowerCase()))return false;
        cells[n.path]=Object.fromEntries([...new Set([...columns,sort])].map(c=>[c,expression(c,n,entry,notes,data.base.formulas||{})]));
        return true;
      }).sort((a,b)=>{const x=cells[a.path][sort],y=cells[b.path][sort];const value=typeof x==='number'&&typeof y==='number'?x-y:String(x??'').localeCompare(String(y??''));return desc?-value:value;});
      if(view.limit)rows=rows.slice(0,Number(view.limit));
    }catch(e){error=String(e);rows=[];}
    return {rows,cells,error};
  },[note.content,notes,entries,query,viewIndex,sort,desc,pluginBases,view]);
  function display(value:any){return Array.isArray(value)?value.join(', '):value===null||value===undefined?'':String(value);}
  async function edit(n:Note,column:string) {
    if(column.startsWith('file.')||column.startsWith('formula.'))return;
    const key=column.replace(/^note\./,''),props=frontmatter(n.content).properties;
    const value=await ask(`Edit ${key} (YAML value)`,stringify(props[key]??'').trim());
    if(value!==null){try{onNoteChange(n.path,setProperties(n.content,{...props,[key]:parse(value)}));}catch(e){window.alert(String(e));}}
  }
  function exportCsv(){
    const encode=(v:any)=>'"'+display(v).replaceAll('"','""')+'"';
    const csv=[columns.map(encode).join(','),...result.rows.map(n=>columns.map(c=>encode(result.cells[n.path][c])).join(','))].join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=title(note.path)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section className="bases-view"><header className="bases-toolbar"><div className="base-views">{(data.base.views||[{name:'All notes',type:'table'}]).map((v:any,index:number)=><button key={index} className={index===viewIndex?'selected':''} onClick={()=>setViewIndex(index)}>{v.type==='cards'?<LayoutGrid size={14}/>:v.type==='list'?<List size={14}/>:<Table2 size={14}/>} {v.name}</button>)}
      <button aria-label="Add view" onClick={async()=>{const name=await ask('View name','New view');if(name){const type=await ask('View type: table, cards, list','table');if(type&&['table','cards','list'].includes(type))onChange(stringify({...data.base,views:[...(data.base.views||[]),{type,name,order:columns}]}));}}}><Plus size={15}/></button></div>
      <label className="input-icon"><Filter size={14}/><input aria-label="Filter base" value={query} placeholder="Filter rows…" onChange={e=>setQuery(e.target.value)} data-testid="base-filter"/></label><button onClick={exportCsv}><Download size={14}/>CSV</button></header>
    {result.error?<div className="empty"><h2>Cannot evaluate this base</h2><p>{result.error}</p><p>Switch to source mode to inspect the definition. Unsupported expressions are not silently ignored.</p></div>:
      pluginBases?.[view.type]?<PluginBasesHost controller={pluginBases[view.type].controller} id={pluginBases[view.type].id} config={view}/>:
      view.type==='cards'?<div className="base-cards">{result.rows.map(n=><article key={n.path}><button onClick={()=>onOpen(n.path)}>{title(n.path)}</button>{columns.filter(c=>c!=='file.name').map(c=><p key={c}><span>{c.replace(/^note\./,'')}</span>{display(result.cells[n.path][c])}</p>)}</article>)}</div>:
      view.type==='list'?<div className="base-list">{result.rows.map(n=><button key={n.path} onClick={()=>onOpen(n.path)}>{title(n.path)}<span>{n.path}</span></button>)}</div>:
      <div className="table-scroll"><table className="base-table" data-testid="base-table"><thead><tr>{columns.map(c=><th key={c}><button onClick={()=>{setSort(c);setDesc(sort===c?!desc:false);}}>{data.base.properties?.[c]?.displayName||c.replace(/^(note|file)\./,'')}{sort===c?(desc?' ↓':' ↑'):''}</button></th>)}</tr></thead><tbody>{result.rows.map(n=><tr key={n.path}>{columns.map(c=><td key={c}>{c==='file.name'?<button className="table-note" onClick={()=>onOpen(n.path)}>{title(n.path)}</button>:<button onClick={()=>edit(n,c)} disabled={c.startsWith('file.')||c.startsWith('formula.')}>{display(result.cells[n.path][c])||'—'}</button>}</td>)}</tr>)}</tbody></table></div>}
    <footer className="view-footer">{result.rows.length} notes · Properties are stored in YAML frontmatter</footer>
  </section>;
}

/** Mount a plugin Bases view into the document and dispose it with the React tree. */
function PluginBasesHost({controller,id,config}:{controller:PluginController;id:string;config:unknown}){
  const ref=useRef<HTMLDivElement>(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    if(!ref.current)return;
    let mounted:{dispose():void}|undefined;
    try{mounted=controller.mountBasesView?.(id,ref.current,config);}catch(error){console.error('Plugin Bases view failed',error);setFailed(true);}
    return()=>mounted?.dispose();
  },[controller,id,config]);
  return <div className="plugin-bases-host" ref={ref}>{failed&&<div className="empty"><p>Bases view unavailable.</p></div>}</div>;
}
