import {Hash,Layers,Plus,X} from 'lucide-react';
import {parse,stringify} from 'yaml';
import {frontmatter,setProperties} from '../knowledge';
import type {PanelViewProps} from './contract';

/** Note and vault properties panel registered as a right-slot view contribution. */
export default function PropertiesPanel({note,propertyKeys=[],onSearchProperty,onNoteChange,ask,onError}:PanelViewProps){
  if(!note||!onNoteChange)return null;
  const properties=frontmatter(note.content).properties??{};
  const change=(next:Record<string,unknown>)=>{try{onNoteChange(note.path,setProperties(note.content,next));}catch(error){onError?.(error);}};
  if(frontmatter(note.content).error)return <div className="property-error">Invalid YAML: fix it in source mode.</div>;
  return <>
    <div className="section-heading">Note properties</div>
    <div className="right-properties"><details className="properties" open={undefined}><summary><Layers size={14}/>Properties<span>{Object.keys(properties).length}</span></summary>
      <div className="property-list">{Object.entries(properties).map(([key,value])=><div className="property-row" key={key}><span><Hash size={12}/>{key}</span><button title={'Edit '+key} onClick={async()=>{if(!ask)return;const next=await ask('Edit '+key,stringify(value).trim(),'Use a YAML value: text, number, true / false, or [a, b].');if(next!==null)change({...properties,[key]:parse(next)});}}>{Array.isArray(value)?value.map((item,index)=><span className="property-chip" key={index}>{String(item)}</span>):String(value??'Empty')}</button><button className="property-remove" aria-label={'Remove '+key} onClick={()=>{const next={...properties};delete next[key];change(next);}}><X size={12}/></button></div>)}
      <button className="add-property" onClick={async()=>{if(!ask)return;const key=await ask('Add property','property');if(key&&!['__proto__','constructor','prototype'].includes(key))change({...properties,[key]:''});}}><Plus size={13}/>Add property</button></div></details></div>
    <div className="section-heading">Vault properties</div>
    <div className="tag-list">{propertyKeys.map(key=><button key={key} onClick={()=>onSearchProperty?.(key)}><Hash size={13}/>{key}</button>)}</div>
  </>;
}
