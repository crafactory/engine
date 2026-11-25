import { useRef, type ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

export type FileMenuAction =
  | { separator: true }
  | {
      label: string;
      icon?: ReactNode;
      disabled?: boolean;
      danger?: boolean;
      run(event: MouseEvent): void;
    };

export type FileMenuAnchor = {
  x: number;
  y: number;
  trigger: HTMLButtonElement;
  keyboard: boolean;
};

/** Place the registry menu at the pointer (or row) without moving the row itself. */
export function FileContextMenu({
  anchor,
  items,
  close,
}: {
  anchor: FileMenuAnchor;
  items: FileMenuAction[];
  close(): void;
}) {
  const action = useRef<(() => void) | undefined>(undefined);
  const click = useRef<MouseEvent | undefined>(undefined);
  const interactedOutside = useRef(false);
  return (
    <DropdownMenu open modal={false} onOpenChange={(open) => !open && close()}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          style={{
            position: 'fixed',
            left: anchor.x,
            top: anchor.y,
            width: 0,
            height: 0,
            padding: 0,
            border: 0,
            pointerEvents: 'none',
          }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-engine-file-menu=""
        aria-label="File actions"
        className="ui:z-[70] ui:w-52 ui:max-w-[calc(100vw-16px)]"
        align="start"
        collisionPadding={8}
        onEscapeKeyDown={(event) => event.stopPropagation()}
        onInteractOutside={() => {
          interactedOutside.current = true;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (!interactedOutside.current && anchor.trigger.isConnected)
            anchor.trigger.focus({ preventScroll: true });
          action.current?.();
          action.current = undefined;
        }}
        onFocus={(event) => {
          if (anchor.keyboard && event.target === event.currentTarget)
            event.currentTarget
              .querySelector<HTMLElement>('[role="menuitem"]:not([data-disabled])')
              ?.focus();
        }}
      >
        {items.map((item, index) =>
          'separator' in item ? (
            <DropdownMenuSeparator key={index} />
          ) : (
            <DropdownMenuItem
              key={index}
              disabled={item.disabled}
              variant={item.danger ? 'destructive' : 'default'}
              onClick={(event) => {
                click.current = event.nativeEvent;
              }}
              onSelect={(event) => {
                // Radix dispatches a selection event for both mouse and keyboard.
                const selected =
                  click.current ??
                  new MouseEvent('click', {
                    clientX: anchor.x,
                    clientY: anchor.y,
                  });
                click.current = undefined;
                event.preventDefault();
                action.current = () => item.run(selected);
                close();
              }}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
