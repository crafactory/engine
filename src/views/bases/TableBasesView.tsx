import {title} from '../../knowledge';
import type {BasesViewProps} from './types';

/** Built-in table renderer for Bases. */
export default function TableBasesView({rows,cells,columns,sort,desc,columnLabel,display,onOpen,onSort,onEdit}:BasesViewProps){
  return <div className="table-scroll"><table className="base-table" data-testid="base-table"><thead><tr>{columns.map(column=><th key={column}><button onClick={()=>onSort(column)}>{columnLabel(column)}{sort===column?(desc?' ↓':' ↑'):''}</button></th>)}</tr></thead><tbody>{rows.map(note=><tr key={note.path}>{columns.map(column=><td key={column}>{column==='file.name'?<button className="table-note" onClick={()=>onOpen(note.path)}>{title(note.path)}</button>:<button onClick={()=>onEdit(note,column)} disabled={column.startsWith('file.')||column.startsWith('formula.')}>{display(cells[note.path]?.[column])||'—'}</button>}</td>)}</tr>)}</tbody></table></div>;
}
