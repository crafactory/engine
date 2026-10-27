import type {Note} from '../../types';

/** Props shared by built-in Bases view renderers. */
export interface BasesViewProps {
  view: any;
  rows: Note[];
  cells: Record<string, Record<string, any>>;
  columns: string[];
  sort: string;
  desc: boolean;
  columnLabel: (column: string) => string;
  display: (value: any) => string;
  onOpen: (path: string) => void;
  onSort: (column: string) => void;
  onEdit: (note: Note, column: string) => void;
}

/** Render a cell value consistently across built-in views. */
export const displayValue = (value: any): string => Array.isArray(value) ? value.join(', ') : value === null || value === undefined ? '' : String(value);
