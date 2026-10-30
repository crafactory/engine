export interface Entry {path: string; name: string; folder: boolean; size: number; mtime: number; ctime: number}
export interface Note {path: string; content: string; version?: string}
export interface Snapshot {id: string; path: string; time: number}
export interface Settings {
  theme: 'dark' | 'light'; mode: 'source' | 'live' | 'reading';
  fontSize: number; readableWidth: boolean; lineNumbers: boolean; spellcheck: boolean;
  dailyFolder: string; dailyTemplate: string; templatesFolder: string; attachmentFolder: string;
  vimMode: boolean; css: string; disabledPlugins: string[]; hotkeys: Record<string,string>;
}
export type PropertyType = 'text' | 'number' | 'checkbox' | 'date' | 'datetime' | 'list';
export interface Workspace {tabs: string[]; active: string; split: string | null; left: boolean; right: boolean; mode: Settings['mode']}
export interface VaultState {settings: Settings; bookmarks: string[]; workspaces: Record<string,Workspace>; recent: string[]; propertyTypes?: Record<string, PropertyType>}
export interface PluginManifest {id: string; name: string; version: string; description?: string; engine?: string; permissions?: string[]}
export interface Bridge {
  desktop: boolean;
  vault(): Promise<{name: string; root: string; entries: Entry[]; state: Partial<VaultState>}>;
  choose(create?: boolean): Promise<boolean>;
  list(): Promise<Entry[]>;
  read(path: string): Promise<Note>;
  write(path: string, content: string, version?: string): Promise<Note>;
  create(path: string, content: string): Promise<Note>;
  append(path: string, content: string): Promise<Note>;
  pluginData(id:string,data?:unknown,write?:boolean):Promise<unknown>;
  mkdir(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  trash(path: string): Promise<void>;
  state(state: VaultState): Promise<void>;
  asset(path: string): Promise<string>;
  attach(name: string, data: number[]): Promise<string>;
  snapshots(path: string): Promise<Snapshot[]>;
  restore(id: string): Promise<Note>;
  plugins(): Promise<{manifest: PluginManifest; code: string}[]>;
  print(): Promise<void>;
  /** Whether this desktop build may serve the trusted-renderer unsafe-eval entry. */
  unsafeEval?(): Promise<boolean>;
  /** Persist the unsafe-eval opt-in; takes effect after restart. */
  setUnsafeEval?(enabled: boolean): Promise<boolean>;
  onChange(fn: () => void): () => void;
  onBeforeClose?(fn: () => void): () => void;
  closeReady?(): Promise<void>;
}
declare global {interface Window {engine?: Bridge}}
