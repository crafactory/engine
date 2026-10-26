import {title} from '../../knowledge';
import type {BasesViewProps} from './types';

/** Built-in card renderer for Bases. */
export default function CardsBasesView({rows,cells,columns,display,onOpen}:BasesViewProps){
  return <div className="base-cards">{rows.map(note=><article key={note.path}><button onClick={()=>onOpen(note.path)}>{title(note.path)}</button>{columns.filter(column=>column!=='file.name').map(column=><p key={column}><span>{column.replace(/^note\./,'')}</span>{display(cells[note.path]?.[column])}</p>)}</article>)}</div>;
}
