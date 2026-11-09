import { useCallback, useEffect, useLayoutEffect, useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import {
  Dialog,
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
  requestId,
  setDialog,
  finish,
}: {
  dialog: PromptState;
  requestId: number;
  setDialog: (value: PromptState) => void;
  finish: (value: string | null) => void;
}) {
  const form = useRef<HTMLFormElement>(null);
  const returnFocus = useOverlayFocusReturn();
  /** Reset each request without remounting the focus scope or losing its return target. */
  const focusInitial = useCallback(() => {
    const input = form.current?.querySelector('input');
    if (input) {
      input.focus();
      input.select();
    } else form.current?.querySelector<HTMLButtonElement>('[data-testid="dialog-cancel"]')?.focus();
  }, []);
  useLayoutEffect(focusInitial, [focusInitial, requestId]);
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
        onEscapeKeyDown={(event) => event.stopPropagation()}
        onCloseAutoFocus={returnFocus}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          focusInitial();
        }}
      >
        <form
          ref={form}
          onSubmit={(event) => {
            event.preventDefault();
            finish(dialog.value ?? 'yes');
          }}
        >
          <DialogHeader className="ui:pr-8 ui:text-left">
            <DialogTitle>{dialog.title}</DialogTitle>
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
  const requestId = useRef(0);
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
      requestId.current++;
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
    ui: dialog ? (
      <Prompt dialog={dialog} requestId={requestId.current} setDialog={setDialog} finish={finish} />
    ) : null,
  };
}
