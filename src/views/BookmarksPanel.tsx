import {Bookmark,FileText,X} from 'lucide-react';
import {title} from '../knowledge';
import type {PanelViewProps} from './contract';

/** Bookmarks and recent-notes panel registered through the view-contribution service. */
export default function BookmarksPanel({sideTab,notes,bookmarks,recent,onOpen,onRemoveBookmark}:PanelViewProps){
  const paths=sideTab==='bookmarks'?bookmarks:recent.filter(path=>notes.some(note=>note.path===path));
  return <div className="bookmark-list">
    {paths.map(path=><div className="bookmark-row" key={path}>
      <button className="bookmark-open" onClick={()=>onOpen(path)}>
        <FileText size={14}/><span>{title(path)}</span>
      </button>
      {sideTab==='bookmarks'&&<button className="bookmark-remove" aria-label="Remove bookmark" onClick={()=>onRemoveBookmark(path)}><X size={12}/></button>}
    </div>)}
    {sideTab==='bookmarks'&&!bookmarks.length&&<div className="empty"><Bookmark size={24}/><p>Bookmark a note to keep it here.</p></div>}
  </div>;
}
