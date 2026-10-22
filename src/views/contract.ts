/* UI-side contract for view components.
 *
 * This module is type-only: it imports React types and the shared note/entry types, but it
 * is not imported by the kernel or any native service provider.
 */
import type {ComponentType} from 'react';
import type {Entry, Note, Settings} from '../types';
import type {PagePreviewService} from '../services/page-preview';
import type {ViewContribution} from '../services/views';

/** Props every reading-surface view receives from the application host. */
export interface ReadingViewProps {
  note: Note;
  notes: Note[];
  entries: Entry[];
  path: string;
  mode: Settings['mode'];
  previews?: PagePreviewService;
  onOpen(target: string): void;
  /** Markdown-link semantics: may resolve or create a note. */
  onOpenLink(target: string): void;
  onChange(content: string): void;
  onNoteChange(path: string, content: string): void;
  ask(title: string, value?: string, description?: string): Promise<string | null>;
}

export type ViewComponent = ComponentType<ReadingViewProps>;

/** Props for a sidebar/panel view contribution. */
export type SidePanelTab = 'bookmarks' | 'recent' | 'tags' | 'outline' | 'backlinks' | 'outgoing';

export interface PanelHeading {level: number; text: string; offset: number}

export interface PanelLink {target: string; label: string; embed: boolean; fragment: string}

export interface PanelViewProps {
  sideTab: SidePanelTab;
  notes: Note[];
  bookmarks: string[];
  recent: string[];
  tags: [string, number][];
  headings: PanelHeading[];
  incoming: Note[];
  mentions: Note[];
  activeTitle: string;
  active: string;
  outgoing: PanelLink[];
  onOpen(path: string): void;
  onRemoveBookmark(path: string): void;
  onSelectTag(tag: string): void;
  onJumpHeading(heading: PanelHeading): void;
  onOpenLink(target: string): void;
}

export type PanelComponent = ComponentType<PanelViewProps>;

/** React component types include functions and exotic objects such as memo/forwardRef. */
function isComponent(candidate: unknown): candidate is ViewComponent {
  return typeof candidate === 'function' || (typeof candidate === 'object' && candidate !== null && '$$typeof' in candidate);
}

/** Interpret an opaque loader result as a view component. */
export async function loadViewComponent(contribution: ViewContribution): Promise<ViewComponent> {
  const module = await contribution.load();
  const candidate = isComponent(module) ? module : (module as {default?: unknown} | null)?.default;
  if (!isComponent(candidate)) throw new Error(`View ${contribution.viewType} did not provide a component`);
  return candidate as ViewComponent;
}
