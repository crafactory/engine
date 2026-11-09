import { useState } from 'react';
import { flushSync } from 'react-dom';
import { FileText, Terminal, ArrowUp, ArrowDown, CornerDownLeft, X } from 'lucide-react';
import { fuzzy } from './knowledge';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './components/ui/dialog';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
  CommandShortcut,
} from './components/ui/command';
import { Button } from './components/ui/button';
import { useOverlayFocusReturn } from './ui/overlay-focus';

export interface Choice {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  run: () => void;
}

export function Palette({
  title,
  items,
  onClose,
  onCreate,
  initial = '',
}: {
  title: string;
  items: Choice[];
  onClose: () => void;
  onCreate?: (text: string) => void;
  initial?: string;
}) {
  const [query, setQuery] = useState(initial);
  const [selected, setSelected] = useState('');
  const returnFocus = useOverlayFocusReturn();
  const filtered = items
    .map((item) => ({
      item,
      score: query ? fuzzy(query, item.label + ' ' + (item.description || '')) : 0,
    }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 60)
    .map((entry) => entry.item);
  // cmdk trims values; JSON string encoding preserves whitespace-significant file IDs.
  const active = filtered.some((item) => JSON.stringify(item.id) === selected)
    ? selected
    : filtered[0]
      ? JSON.stringify(filtered[0].id)
      : '';
  const run = (item: Choice) => {
    flushSync(onClose);
    item.run();
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="palette app-palette"
        showCloseButton={false}
        onCloseAutoFocus={returnFocus}
        onEscapeKeyDown={(event) => event.stopPropagation()}
      >
        <DialogTitle className="ui:sr-only">{title}</DialogTitle>
        <DialogDescription className="ui:sr-only">
          Search, navigate with arrow keys and press Enter to select.
        </DialogDescription>
        <Command shouldFilter={false} value={active} onValueChange={setSelected}>
          <div className="app-command-search">
            <CommandInput
              autoFocus
              aria-label={title}
              data-testid="palette-input"
              placeholder={title === 'Quick switcher' ? 'Find a note…' : 'Type a command…'}
              value={query}
              onValueChange={(value) => {
                setQuery(value);
                setSelected('');
              }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
                if (event.key === 'Enter' && !filtered.length && onCreate && query) {
                  event.preventDefault();
                  flushSync(onClose);
                  onCreate(query);
                }
              }}
            />
            <DialogClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close palette">
                <X />
              </Button>
            </DialogClose>
          </div>
          <CommandList className="palette-list app-command-list">
            <CommandEmpty>
              <h3>No matches</h3>
              <p>{onCreate ? 'Press Enter to create this note.' : 'Try a shorter command name.'}</p>
            </CommandEmpty>
            <CommandGroup heading={title}>
              {filtered.map((item) => (
                <CommandItem
                  key={item.id}
                  value={JSON.stringify(item.id)}
                  onSelect={() => run(item)}
                  data-testid={'palette-item-' + item.id}
                >
                  {title === 'Quick switcher' ? <FileText /> : <Terminal />}
                  <span className="app-command-label">
                    <strong>{item.label}</strong>
                    {item.description && <small>{item.description}</small>}
                  </span>
                  {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <footer>
            <span>
              <ArrowUp size={12} />
              <ArrowDown size={12} /> Navigate
            </span>
            <span>
              <CornerDownLeft size={12} /> Open
            </span>
            <span>Esc to close</span>
          </footer>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
