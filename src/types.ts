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
export interface VaultState {settings: Settings; bookmarks: string[]; workspaces: Record<string,Workspace>; recent: string[]; propertyTypes?: Record<string, PropertyType>;layout?:Workspace}
export interface PluginManifest {id: string; name: string; version: string; description?: string; engine?: string; permissions?: string[];isDesktopOnly?:boolean}
export interface Bridge {
  desktop: boolean;
  /** Persisted storage does not imply desktop/Node capabilities. */
  persistent?:boolean;
  platform?:'android';
  exportFile?(name:string,content:Blob,type:string):Promise<void>;
  onSuspend?(fn:()=>Promise<void>):()=>void;
  onBack?(fn:()=>Promise<boolean>):()=>void;
  vault(): Promise<{name: string; root: string; entries: Entry[]; state: Partial<VaultState>}>;
  choose(create?: boolean): Promise<boolean>;
  list(): Promise<Entry[]>;
  read(path: string): Promise<Note>;
  readBinary?(path:string):Promise<ArrayBuffer>;
  writeBinary?(path:string,data:ArrayBuffer|ArrayBufferView):Promise<{path:string;version:string}>;
  createBinary?(path:string,data:ArrayBuffer|ArrayBufferView):Promise<{path:string;version:string}>;
  modifyBinary?(path:string,data:ArrayBuffer|ArrayBufferView):Promise<{path:string;version:string}>;
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
  plugins(): Promise<{manifest: PluginManifest; code: string;styles?:string}[]>;
  print(): Promise<void>;
  /** Whether this desktop build may serve the trusted-renderer unsafe-eval entry. */
  unsafeEval?(): Promise<boolean>;
  /** Persist the unsafe-eval opt-in; takes effect after restart. */
  setUnsafeEval?(enabled: boolean): Promise<boolean>;
  /** Profile-wide full Node access, never enabled by default. Restart grants/revokes it. */
  nativePlugins?(): Promise<boolean>;
  setNativePlugins?(enabled: boolean): Promise<boolean>;
  /** Saved preferences and immutable privileges active in this process. */
  trustProfile?(): Promise<{saved:{unsafeEval:boolean;nativePlugins:boolean};active:{unsafeEval:boolean;nativePlugins:boolean}}>;
  /** Subscribe to confirmed profile writes; privileges remain startup-active until restart. */
  onTrustProfileChange?(fn:(profile:{saved:{unsafeEval:boolean;nativePlugins:boolean};active:{unsafeEval:boolean;nativePlugins:boolean}})=>void):()=>void;
  onChange(fn: () => void): () => void;
  onBeforeClose?(fn: () => void): () => void;
  closeReady?(): Promise<void>;
}
declare global {interface Window {engine?: Bridge}}
