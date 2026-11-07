import { useEffect, useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { useOverlayFocusReturn } from './ui/overlay-focus';

interface PromptState {
  title: string;
  description?: string;
  value?: string;
  danger?: boolean;
  submit: string;
}

function Prompt({
  dialog,
  setDialog,
  finish,
}: {
  dialog: PromptState;
  setDialog: (value: PromptState) => void;
  finish: (value: string | null) => void;
}) {
  const form = useRef<HTMLFormElement>(null);
  const returnFocus = useOverlayFocusReturn();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) finish(null);
      }}
    >
      <DialogContent
        className="app-prompt input-modal"
        overlayClassName="app-prompt-overlay"
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.stopPropagation()}
        onCloseAutoFocus={returnFocus}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const input = form.current?.querySelector('input');
          if (input) {
            input.focus();
            input.select();
          } else
            form.current
              ?.querySelector<HTMLButtonElement>('[data-testid="dialog-cancel"]')
              ?.focus();
        }}
      >
        <form
          ref={form}
          onSubmit={(event) => {
            event.preventDefault();
            finish(dialog.value ?? 'yes');
          }}
        >
          <DialogHeader className="app-prompt-header">
            <DialogTitle>{dialog.title}</DialogTitle>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Close dialog">
                <X />
              </Button>
            </DialogClose>
          </DialogHeader>
          <DialogDescription className={dialog.description ? '' : 'ui:sr-only'}>
            {dialog.description || 'Enter a value or cancel to leave the note unchanged.'}
          </DialogDescription>
          {dialog.value !== undefined && (
            <Input
              aria-label={dialog.title}
              data-testid="dialog-input"
              value={dialog.value}
              onChange={(event) => setDialog({ ...dialog, value: event.target.value })}
              onFocus={(event) => event.target.select()}
            />
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              data-testid="dialog-cancel"
              onClick={() => finish(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={dialog.danger ? 'destructive' : 'default'}
              data-testid="dialog-submit"
            >
              {dialog.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function useDialog() {
  const [dialog, setDialog] = useState<PromptState | null>(null);
  const resolve = useRef<(value: string | null) => void>();
  useEffect(
    () => () => {
      resolve.current?.(null);
    },
    [],
  );
  function finish(value: string | null) {
    const pending = resolve.current;
    resolve.current = undefined;
    // Release Radix focus/pointer ownership before the awaiting action opens another UI.
    flushSync(() => setDialog(null));
    pending?.(value);
  }
  function open(next: PromptState): Promise<string | null> {
    resolve.current?.(null);
    return new Promise((done) => {
      resolve.current = done;
      setDialog(next);
    });
  }
  function ask(title: string, value = '', description = '') {
    return open({ title, value, description, submit: 'Continue' });
  }
  async function confirm(title: string, description: string, danger = false) {
    return (
      (await open({
        title,
        description,
        danger,
        submit: danger ? 'Move to trash' : 'Continue',
      })) !== null
    );
  }
  return {
    ask,
    confirm,
    open: dialog !== null,
    cancel: () => finish(null),
    ui: dialog ? <Prompt dialog={dialog} setDialog={setDialog} finish={finish} /> : null,
  };
}
