import {title} from '../../knowledge';
import type {BasesViewProps} from './types';

/** Built-in list renderer for Bases. */
export default function ListBasesView({rows,onOpen}:BasesViewProps){
  return <div className="base-list">{rows.map(note=><button key={note.path} onClick={()=>onOpen(note.path)}>{title(note.path)}<span>{note.path}</span></button>)}</div>;
}
