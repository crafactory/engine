import type {ReactNode} from 'react';
import {ChevronDown,ChevronRight,FileText,Folder,LayoutDashboard,Table2} from 'lucide-react';
import {title} from '../knowledge';
import type {Entry} from '../types';
import type {PanelViewProps} from './contract';

/** Vault file tree registered as a left-slot view contribution. */
export default function FilesPanel({entries=[],activePath='',fileSort='name',expanded=new Set(),loading=false,childrenFor,onToggleFolder,onOpenFile,onFileContextMenu,onDropFile,onCollapseAll,onFileSortChange,onCreateNote}:PanelViewProps){
  const children=(parent:string):Entry[]=>childrenFor?childrenFor(parent):[];
  function render(parent=''):ReactNode{
    return children(parent).map(entry=><div key={entry.path} className="tree-item">
      <button className={'tree-row '+(entry.path===activePath?'selected':'')} style={{paddingLeft:12+(parent?parent.split('/').length:0)*13}} onClick={()=>entry.folder?onToggleFolder?.(entry.path):onOpenFile?.(entry.path)}
        onContextMenu={event=>{event.preventDefault();onFileContextMenu?.(entry.path,event.clientX,event.clientY);}}
        draggable onDragStart={event=>event.dataTransfer.setData('engine/path',entry.path)} onDragOver={event=>entry.folder&&event.preventDefault()}
        onDrop={event=>{if(entry.folder){event.preventDefault();const path=event.dataTransfer.getData('engine/path');if(path&&path!==entry.path&&!entry.path.startsWith(path+'/'))onDropFile?.(path,entry.path);}}}
        data-testid={'file-'+entry.path}>
        {entry.folder?(expanded.has(entry.path)?<ChevronDown size={13}/>:<ChevronRight size={13}/>):<span className="tree-indent"/>}
        {entry.folder?<Folder size={14}/>:/\.canvas$/i.test(entry.path)?<LayoutDashboard size={14}/>:/\.base$/i.test(entry.path)?<Table2 size={14}/>:<FileText size={14}/>}
        <span>{entry.folder?entry.name:title(entry.path)}</span>
      </button>{entry.folder&&expanded.has(entry.path)&&render(entry.path)}
    </div>);
  }
  return <>
    <div className="file-controls"><button onClick={()=>onCollapseAll?.()} title="Collapse all folders">Collapse all</button><select aria-label="Sort files" value={fileSort} onChange={event=>onFileSortChange?.(event.target.value)}><option value="name">Name ↑</option><option value="modified">Modified ↓</option></select></div>
    <div className="file-tree">{loading?<div className="skeleton-list"><i/><i/><i/><i/></div>:entries.length?render():<div className="empty"><Folder size={25}/><p>Your vault is empty. Start with one note.</p><button onClick={()=>onCreateNote?.()}>New note</button></div>}</div>
  </>;
}
