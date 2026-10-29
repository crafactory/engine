import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {AlignLeft,Braces,Calendar,CalendarClock,CheckSquare,Hash,List,Plus,X} from 'lucide-react';
import {frontmatter,setProperties,tags} from './knowledge';
import type {Note} from './types';

type PropertyType='text'|'number'|'checkbox'|'date'|'datetime'|'list'|'object';

function inferType(value:unknown):PropertyType {
  if(Array.isArray(value))return 'list';
  if(typeof value==='boolean')return 'checkbox';
  if(typeof value==='number')return 'number';
  if(value instanceof Date)return 'date';
  if(value!==null&&typeof value==='object')return 'object';
  const text=String(value??'');
  if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text))return 'datetime';
  if(/^\d{4}-\d{2}-\d{2}$/.test(text))return 'date';
  return 'text';
}

function dateValue(value:unknown):string {
  if(value instanceof Date)return value.toISOString().slice(0,10);
  return String(value??'').slice(0,10);
}

function datetimeValue(value:unknown):string {
  if(value instanceof Date)return value.toISOString().slice(0,16);
  return String(value??'').slice(0,16);
}

function convert(value:unknown,type:PropertyType):unknown {
  switch(type){
    case 'list': return Array.isArray(value)?value:value===null||value===undefined||value===''?[]:[typeof value==='object'?JSON.stringify(value):String(value)];
    case 'checkbox': return typeof value==='boolean'?value:value==='true'||value===1||value==='1';
    case 'number': {const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;}
    case 'date': return dateValue(value)||new Date().toISOString().slice(0,10);
    case 'datetime': return datetimeValue(value)||new Date().toISOString().slice(0,16);
    case 'object': return typeof value==='object'&&value!==null?value:{};
    default: return Array.isArray(value)?value.join(', '):value instanceof Date?value.toISOString():value!==null&&typeof value==='object'?JSON.stringify(value):String(value??'');
  }
}

function draftFor(value:unknown,type:PropertyType){return type==='date'?dateValue(value):type==='datetime'?datetimeValue(value):Array.isArray(value)?'':String(value??'');}

function typeIcon(type:PropertyType){return type==='list'?List:type==='number'?Hash:type==='checkbox'?CheckSquare:type==='date'?Calendar:type==='datetime'?CalendarClock:type==='object'?Braces:AlignLeft;}

function typeLabel(type:PropertyType){return type==='datetime'?'Date & time':type[0].toUpperCase()+type.slice(1);}

/** Inline, type-aware editor for the note's YAML properties. */
export function PropertiesEditor({note,notes,onNoteChange,onError,ask}:{note:Note;notes:Note[];onNoteChange:(path:string,content:string)=>void;onError:(error:unknown)=>void;ask:(title:string,value?:string,description?:string)=>Promise<string|null>}){
  const [menu,setMenu]=useState<string|null>(null);
  const section=useRef<HTMLElement>(null);
  const meta=frontmatter(note.content),properties=meta.properties??{};
  const suggestions=useMemo(()=>{
    const result:Record<string,string[]>={};
    const add=(key:string,value:unknown)=>{const list=Array.isArray(value)?value:[value];for(const item of list){if(item===null||item===undefined||typeof item==='object')continue;const text=String(item);if(!text)continue;(result[key]??=[]).push(text);}};
    for(const entry of notes){const fm=frontmatter(entry.content);for(const [key,value]of Object.entries(fm.properties??{}))add(key,value);}
    for(const noteTags of notes.flatMap(entry=>tags(entry.content)))add('tags',noteTags);
    for(const key of Object.keys(result))result[key]=[...new Set(result[key])].sort();
    return result;
  },[notes]);
  useEffect(()=>{
    if(menu===null)return;
    const close=(event:PointerEvent)=>{if(!section.current?.contains(event.target as Node))setMenu(null);};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setMenu(null);};
    document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);
    return ()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);};
  },[menu]);
  const change=(next:Record<string,unknown>)=>{try{onNoteChange(note.path,setProperties(note.content,next));}catch(error){onError(error);}};
  const remove=(key:string)=>{const next={...properties};delete next[key];change(next);};
  const convertTo=(key:string,type:PropertyType|'automatic')=>{setMenu(null);if(type==='automatic')return;change({...properties,[key]:convert(properties[key],type)});};
  const addProperty=async()=>{const key=await ask('Add property','property');if(key&&!['__proto__','constructor','prototype'].includes(key)&&!(key in properties))change({...properties,[key]:''});};
  if(meta.error)return <div className="inline-properties"><div className="property-error">Invalid YAML: fix it in source mode.</div></div>;
  return <section ref={section} className="inline-properties" aria-label="Note properties">
    <div className="inline-properties-heading">Properties</div>
    {Object.entries(properties).map(([key,value])=>{
      const type=inferType(value),Icon=typeIcon(type);
      return <div className="inline-property-row" key={key}>
        <div className="property-type-wrap">
          <button type="button" className="property-type" aria-label={`Property type ${key}`} aria-haspopup="menu" aria-expanded={menu===key} title={typeLabel(type)} onClick={()=>setMenu(menu===key?null:key)}><Icon size={14}/></button>
          {menu===key&&<div className="property-type-menu" role="menu">
            <button type="button" role="menuitem" onClick={()=>convertTo(key,'automatic')}>Automatic</button>
            <button type="button" role="menuitem" onClick={()=>convertTo(key,'checkbox')}>Checkbox</button>
            <button type="button" role="menuitem" onClick={()=>convertTo(key,'date')}>Date</button>
            <button type="button" role="menuitem" onClick={()=>convertTo(key,'datetime')}>Date &amp; time</button>
            <button type="button" role="menuitem" onClick={()=>convertTo(key,'list')}>List</button>
            <button type="button" role="menuitem" onClick={()=>convertTo(key,'number')}>Number</button>
            <button type="button" role="menuitem" onClick={()=>convertTo(key,'text')}>Text</button>
          </div>}
        </div>
        <span className="property-key" title={key}>{key}</span>
        <div className="property-value">
          <PropertyValue key={`${note.path}:${key}:${type}`} propertyKey={key} value={value} type={type} suggestions={suggestions[key]??[]} onChange={next=>change({...properties,[key]:next})}/>
        </div>
        <button type="button" className="inline-property-remove" aria-label={`Remove ${key}`} title={`Remove ${key}`} onClick={()=>remove(key)}><X size={12}/></button>
      </div>;
    })}
    <button type="button" className="add-property inline-add-property" onClick={addProperty}><Plus size={13}/>Add property</button>
  </section>;
}

/** One value editor; text-like values commit on blur or Enter, list edits commit immediately. */
function PropertyValue({propertyKey,value,type,suggestions,onChange}:{propertyKey:string;value:unknown;type:PropertyType;suggestions:string[];onChange:(value:unknown)=>void}){
  const listId=useId();
  const [draft,setDraft]=useState(()=>draftFor(value,type));
  const [listDraft,setListDraft]=useState('');
  useEffect(()=>{setDraft(draftFor(value,type));},[value,type]);
  const commit=()=>{if(type==='number')onChange(Number(draft)||0);else if(type==='date')onChange(draft);else if(type==='datetime')onChange(draft);else if(draft!==String(value??''))onChange(draft);};
  if(type==='object')return <code className="property-structured" title="Structured value: edit in source mode">{JSON.stringify(value)}</code>;
  if(type==='checkbox')return <input aria-label={propertyKey} type="checkbox" role="switch" checked={!!value} onChange={event=>onChange(event.target.checked)}/>;
  if(type==='list'){
    const items=Array.isArray(value)?value:[];
    const add=()=>{const next=listDraft.trim();if(!next)return;if(!items.map(String).includes(next))onChange([...items,next]);setListDraft('');};
    return <>
      {items.map((item,index)=><span className="property-chip" key={index}>{String(item)}<button type="button" aria-label={`Remove ${propertyKey} value ${String(item)}`} onClick={()=>onChange(items.filter((_item,position)=>position!==index))}><X size={10}/></button></span>)}
      <input aria-label={propertyKey} list={listId} value={listDraft} placeholder="Add value" onChange={event=>setListDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'||event.key===','){event.preventDefault();add();}}} onBlur={add}/>
      <datalist id={listId}>{suggestions.map(item=><option key={item} value={item}/>)}</datalist>
    </>;
  }
  return <input aria-label={propertyKey} type={type==='number'?'number':type==='date'?'date':type==='datetime'?'datetime-local':'text'} value={draft} placeholder="Empty" onChange={event=>setDraft(event.target.value)} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();commit();}}}/>;
}
