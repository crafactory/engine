import {Bookmark,FileText,X} from 'lucide-react';
import {title} from '../knowledge';
import type {PanelViewProps} from './contract';

/** Bookmarks and recent-notes panel registered through the view-contribution service. */
export default function BookmarksPanel({sideTab,notes,bookmarks,recent,onOpen,onRemoveBookmark}:PanelViewProps){
  const paths=sideTab==='bookmarks'?bookmarks:recent.filter(path=>notes.some(note=>note.path===path));
  return <div className="bookmark-list">
    {paths.map(path=><button key={path} onClick={()=>onOpen(path)}>
      <FileText size={14}/><span>{title(path)}</span>
      {sideTab==='bookmarks'&&<span role="button" aria-label="Remove bookmark" onClick={event=>{event.stopPropagation();onRemoveBookmark(path);}}><X size={12}/></span>}
    </button>)}
    {sideTab==='bookmarks'&&!bookmarks.length&&<div className="empty"><Bookmark size={24}/><p>Bookmark a note to keep it here.</p></div>}
  </div>;
}
