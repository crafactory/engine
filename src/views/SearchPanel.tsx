import {Copy,FileText,Search} from 'lucide-react';
import {frontmatter,title} from '../knowledge';
import type {PanelViewProps} from './contract';

/** Full-text search panel registered as a left-slot view contribution. */
export default function SearchPanel({query='',caseSensitive=false,searchSort='name',results=[],onQuery,onToggleCase,onSearchSort,onCopy,onOpenFile}:PanelViewProps){
  return <>
    <label className="search-input"><Search size={15}/><input autoFocus placeholder="Search notes…" value={query} onChange={event=>onQuery?.(event.target.value)} aria-label="Search notes" data-testid="search-input"/><button onClick={()=>onToggleCase?.()} className={caseSensitive?'selected':''} aria-label="Match case">Aa</button></label>
    <div className="search-meta"><span>{results.length} results</span><select aria-label="Sort search results" value={searchSort} onChange={event=>onSearchSort?.(event.target.value)}><option value="name">Name ↑</option><option value="modified">Modified ↓</option></select><button aria-label="Copy search results" onClick={()=>onCopy?.()}><Copy size={13}/></button></div>
    <div className="search-results">{results.map(note=><button key={note.path} onClick={()=>onOpenFile?.(note.path)} data-testid={'search-result-'+note.path}><span><FileText size={13}/>{title(note.path)}</span><small>{note.path}</small>{query&&<p>{frontmatter(note.content).body.replace(/[#*`\[\]]/g,'').slice(0,140)}</p>}</button>)}</div>
    <p className="search-help">Try tag:#thinking, path:Ideas, task-todo: or /regex/. Operators can be grouped with parentheses and OR.</p>
  </>;
}
