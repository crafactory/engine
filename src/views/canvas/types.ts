import type {Note} from '../../types';

/** Data attached to a Canvas card node. */
export interface CanvasData extends Record<string, unknown> {
  text?: string;
  file?: string;
  url?: string;
  label?: string;
  color?: string;
  kind: string;
  onEdit: (id: string) => void;
  onOpen: (path: string) => void;
  notes: Note[];
  readOnly?: boolean;
}
