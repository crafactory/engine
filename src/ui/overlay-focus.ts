import { useRef } from 'react';

/** Triggerless dialogs return focus only if the next action has not already claimed it. */
export function useOverlayFocusReturn() {
  const previous = useRef(document.activeElement);
  return (event: Event) => {
    event.preventDefault();
    if (document.activeElement !== document.body) return;
    if (previous.current instanceof HTMLElement && previous.current.isConnected)
      previous.current.focus({ preventScroll: true });
  };
}
