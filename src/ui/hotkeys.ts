export const defaultKeys: Record<string, string> = {
  'new-note': 'mod+n',
  'quick-switcher': 'mod+o',
  'command-palette': 'mod+p',
  search: 'mod+shift+f',
  'toggle-mode': 'mod+e',
  settings: 'mod+,',
  'close-tab': 'mod+w',
  'daily-note': 'mod+shift+d',
};

const keyLabels: Record<string, string> = { mod: '⌘', alt: '⌥', shift: '⇧' };
/** Render a normalized key binding (`mod+shift+f`) as display text (`⌘ ⇧ F`). */
export const formatHotkey = (binding: string) =>
  binding
    .split('+')
    .map((part) => keyLabels[part] ?? (part.length === 1 ? part.toUpperCase() : part))
    .join(' ');
