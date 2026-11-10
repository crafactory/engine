import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Trash2 } from 'lucide-react';
import { renderMarkdown } from '../../Markdown';
import {
  tableRows,
  replaceTableCell,
  appendTableRow,
  appendTableColumn,
  tableAlignments,
  deleteTableRow,
  moveTableRow,
  deleteTableColumn,
  moveTableColumn,
  type TableCell,
} from '../../live-model';

/** Edit bounded Markdown cells while retaining source delimiter and literal-pipe semantics. */
export function LiveTable({
  content,
  onChange,
  onMeasure,
}: {
  content: string;
  onChange: (value: string) => void;
  onMeasure: () => void;
}) {
  const [edit, setEdit] = useState<{
    cell: TableCell;
    row: number;
    col: number;
    value: string;
    base: string;
    columns: number[];
    height: number;
  } | null>(null);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const host = useRef<HTMLDivElement>(null),
    pendingFocus = useRef<string | null>(null),
    composing = useRef(false);
  // Measure after reconciliation; a cell is valid only for the source version that opened it.
  useLayoutEffect(() => {
    if (pendingFocus.current) {
      const button = host.current?.querySelector<HTMLButtonElement>(
        `button[data-live-cell="${pendingFocus.current}"]`,
      );
      pendingFocus.current = null;
      button?.focus({ preventScroll: true });
      button?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    onMeasure();
  }, [content, onMeasure, edit?.columns]);
  useEffect(() => {
    if (!edit || edit.base !== content) return;
    const scroll = host.current?.querySelector<HTMLElement>('.live-table-scroll');
    if (!scroll) return;
    let previous = scroll.clientWidth,
      active = true;
    const observer = new ResizeObserver(() => {
      const next = scroll.clientWidth;
      if (!active || next <= 0 || previous <= 0 || Math.abs(next - previous) < 1) return;
      const ratio = next / previous;
      previous = next;
      // Keep the draft/input node, but adapt its measured grid to drawer/viewport changes.
      setEdit((current) =>
        current?.base === content
          ? { ...current, columns: current.columns.map((width) => Math.max(100, width * ratio)) }
          : current,
      );
    });
    observer.observe(scroll);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [edit?.base, edit?.row, edit?.col, content]);
  const rows = tableRows(content),
    alignments = tableAlignments(content);
  const columns = rows[0]?.cells.length ?? 1,
    lastRow = rows.length - 1;
  /** Commit the active cell and optionally move focus to another cell. */
  function commit(target?: string, value?: string) {
    if (!edit) return;
    if (edit.base === content) {
      const next = replaceTableCell(content, edit.cell, value ?? edit.value);
      if (next !== content) onChange(next);
    }
    pendingFocus.current = target ?? null;
    if (target) {
      const [row, col] = target.split(':').map(Number);
      setSelected({ row, col });
    }
    setEdit(null);
  }
  /** Move one cell; Tab on the last cell appends a row and focuses its first cell. */
  function move(direction: 1 | -1) {
    if (!edit) return;
    if (direction === 1 && edit.row === lastRow && edit.col === columns - 1) {
      const base =
        edit.base === content ? replaceTableCell(content, edit.cell, edit.value) : content;
      onChange(appendTableRow(base, columns));
      pendingFocus.current = lastRow + 1 + ':0';
      setSelected({ row: lastRow + 1, col: 0 });
      setEdit(null);
      return;
    }
    if (direction === -1 && edit.row === 0 && edit.col === 0) return;
    let row = edit.row,
      col = edit.col + direction;
    if (col >= columns) {
      row = Math.min(lastRow, row + 1);
      col = 0;
    }
    if (col < 0) {
      row = Math.max(0, row - 1);
      col = columns - 1;
    }
    commit(row + ':' + col);
  }
  const sizing = edit?.base === content ? edit : null;
  return (
    <div ref={host} className="live-table-shell">
      <div className="live-table-scroll">
        <table
          className="live-table"
          style={
            sizing
              ? {
                  tableLayout: 'fixed',
                  width: sizing.columns.reduce((total, width) => total + width, 0),
                }
              : undefined
          }
        >
          {sizing && (
            <colgroup>
              {sizing.columns.map((width, col) => (
                <col key={col} style={{ width }} />
              ))}
            </colgroup>
          )}
          <thead>
            {rows
              .filter((r) => r.header)
              .map((row, r) => (
                <tr key={r}>
                  {row.cells.map((cell, c) => (
                    <th key={c} style={{ textAlign: alignments[c] ?? undefined }}>
                      {cellUI(cell, 0, c)}
                    </th>
                  ))}
                </tr>
              ))}
          </thead>
          <tbody>
            {rows
              .filter((r) => !r.header)
              .map((row, r) => (
                <tr key={r}>
                  {row.cells.map((cell, c) => (
                    <td key={c} style={{ textAlign: alignments[c] ?? undefined }}>
                      {cellUI(cell, r + 1, c)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="live-table-add live-table-add-row"
        aria-label="Add row below"
        title="Add row below"
        onClick={() => onChange(appendTableRow(content, columns))}
      >
        +
      </button>
      <button
        type="button"
        className="live-table-add live-table-add-column"
        aria-label="Add column right"
        title="Add column right"
        onClick={() => onChange(appendTableColumn(content))}
      >
        +
      </button>
      {selected && (
        <div className="live-table-tools">
          <button
            type="button"
            aria-label="Move row up"
            title="Move row up"
            disabled={selected.row <= 1}
            onClick={() => {
              onChange(moveTableRow(content, selected.row, -1));
              setSelected(null);
            }}
          >
            <ArrowUp size={12} />
          </button>
          <button
            type="button"
            aria-label="Move row down"
            title="Move row down"
            disabled={selected.row >= lastRow}
            onClick={() => {
              onChange(moveTableRow(content, selected.row, 1));
              setSelected(null);
            }}
          >
            <ArrowDown size={12} />
          </button>
          <button
            type="button"
            aria-label="Delete row"
            title="Delete row"
            disabled={selected.row < 1}
            onClick={() => {
              onChange(deleteTableRow(content, selected.row));
              setSelected(null);
            }}
          >
            <Trash2 size={12} />
          </button>
          <button
            type="button"
            aria-label="Move column left"
            title="Move column left"
            disabled={selected.col === 0}
            onClick={() => {
              onChange(moveTableColumn(content, selected.col, -1));
              setSelected(null);
            }}
          >
            <ArrowLeft size={12} />
          </button>
          <button
            type="button"
            aria-label="Move column right"
            title="Move column right"
            disabled={selected.col >= columns - 1}
            onClick={() => {
              onChange(moveTableColumn(content, selected.col, 1));
              setSelected(null);
            }}
          >
            <ArrowRight size={12} />
          </button>
          <button
            type="button"
            aria-label="Delete column"
            title="Delete column"
            disabled={columns <= 1}
            onClick={() => {
              onChange(deleteTableColumn(content, selected.col));
              setSelected(null);
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
  /** Expose either a focusable cell button or its temporary text input. */
  function cellUI(cell: TableCell, row: number, col: number) {
    if (edit?.base === content && edit.row === row && edit.col === col)
      return (
        <input
          autoFocus
          aria-label={`Cell row ${row + 1} column ${col + 1}`}
          value={edit.value}
          style={{ height: edit.height }}
          onChange={(e) => setEdit({ ...edit, value: e.target.value })}
          onCompositionStart={() => (composing.current = true)}
          onCompositionEnd={(event) => {
            composing.current = false;
            const value = event.currentTarget.value;
            if (document.activeElement !== event.currentTarget) commit(undefined, value);
            else setEdit((current) => (current ? { ...current, value } : current));
          }}
          onBlur={(event) => {
            if (!composing.current) commit(undefined, event.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (composing.current || e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) {
              // Do not let DOM Tab navigation or an ancestor shortcut retire the input.
              if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
              }
              return;
            }
            if (e.key === 'Tab') {
              e.preventDefault();
              move(e.shiftKey ? -1 : 1);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              commit(row + ':' + col);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              pendingFocus.current = row + ':' + col;
              setEdit(null);
            }
          }}
        />
      );
    return (
      <button
        data-live-cell={row + ':' + col}
        aria-label={`Edit cell row ${row + 1} column ${col + 1}`}
        onMouseEnter={() => setSelected({ row, col })}
        onFocus={() => setSelected({ row, col })}
        onClick={(event) => {
          // Inputs have a different intrinsic width from rendered Markdown. Freeze the measured
          // grid for this edit session instead of letting the browser redistribute every column.
          const button = event.currentTarget,
            columns = [...button.closest('table')!.querySelectorAll('thead th')].map(
              (el) => el.getBoundingClientRect().width,
            );
          setSelected({ row, col });
          composing.current = false;
          setEdit({
            cell,
            row,
            col,
            value: cell.value,
            base: content,
            columns,
            height: button.getBoundingClientRect().height,
          });
        }}
        dangerouslySetInnerHTML={{
          __html: renderMarkdown(cell.value) || '<span class="live-empty-cell">Empty</span>',
        }}
      />
    );
  }
}
