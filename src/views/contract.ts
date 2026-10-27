/* UI-side contract for view components.
 *
 * This module is type-only: it imports React types and the shared note/entry types, but it
 * is not imported by the kernel or any native service provider.
 */
import type {ComponentType} from 'react';
import type {Entry, Note, Settings} from '../types';
import type {PagePreviewService} from '../services/page-preview';
import type {ViewContribution} from '../services/views';
import type {HoverLinkPayload,PluginController} from '../plugins';
import type {EditorHandle} from '../Editor';
import type {EditorSession} from '../services/editor';
import type {SlashCommandsService} from '../services/slash-commands';
import type {Extension} from '@codemirror/state';
import type {CompletionContext,CompletionResult} from '@codemirror/autocomplete';
import type {IndexService} from '../services/notes-index';

/** Props every reading-surface view receives from the application host. */
export interface ReadingViewProps {
  note: Note;
  notes: Note[];
  entries: Entry[];
  path: string;
  mode: Settings['mode'];
  previews?: PagePreviewService;
  pluginBases?: Record<string,{controller:PluginController;id:string}>;
  onHoverLink?: (payload:Omit<HoverLinkPayload,'source'>)=>void;
  onOpen(target: string): void;
  /** Markdown-link semantics: may resolve or create a note. */
  onOpenLink(target: string): void;
  onChange(content: string): void;
  onNoteChange(path: string, content: string): void;
  ask(title: string, value?: string, description?: string): Promise<string | null>;
}

export type ViewComponent = ComponentType<ReadingViewProps>;

/** Props for the editor surface view. */
export interface EditorViewProps {
  note: Note;
  notes: Note[];
  settings: Settings;
  pluginExtensions?: Extension[];
  session?: EditorSession;
  slashCommands?: SlashCommandsService;
  onChange: (content: string) => void;
  onOpen: (target: string) => void;
  onCommand: (command: string) => void;
  onHandle?: (handle: EditorHandle | null) => void;
  suggest?: (context: CompletionContext) => CompletionResult | null | Promise<CompletionResult | null>;
}

/** Props for the synthetic graph view. */
export interface GraphViewProps {notes:Note[];index:IndexService;active:string;local:boolean;onOpen:(path:string)=>void}

/** Props for a sidebar/panel view contribution. */
export type SidePanelTab = 'files' | 'search' | 'bookmarks' | 'recent' | 'tags' | 'outline' | 'backlinks' | 'outgoing' | 'properties';

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
  note?: Note;
  propertyKeys?: string[];
  entries?: Entry[];
  activePath?: string;
  fileSort?: string;
  expanded?: Set<string>;
  loading?: boolean;
  childrenFor?: (parent:string)=>Entry[];
  onToggleFolder?: (path:string)=>void;
  onOpenFile?: (path:string)=>void;
  onFileContextMenu?: (path:string,x:number,y:number)=>void;
  onDropFile?: (from:string,folder:string)=>void;
  onCollapseAll?: ()=>void;
  onFileSortChange?: (sort:string)=>void;
  onCreateNote?: ()=>void;
  query?: string;
  caseSensitive?: boolean;
  searchSort?: string;
  results?: Note[];
  onQuery?: (query:string)=>void;
  onToggleCase?: ()=>void;
  onSearchSort?: (sort:string)=>void;
  onCopy?: ()=>void;
  onSearchProperty?: (key:string)=>void;
  onNoteChange?: (path:string,content:string)=>void;
  ask?: (title:string,value?:string,description?:string)=>Promise<string|null>;
  onError?: (error:unknown)=>void;
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
