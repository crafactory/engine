/* Native storage service contract (`engine.storage/v1`).
 *
 * Two providers satisfy the same contract: an in-memory preview provider used by the
 * browser preview and tests, and a local-filesystem provider that wraps the existing
 * Vault implementation. Neither imports editor, workspace or Markdown code. See
 * docs/KERNEL-SPEC.md and docs/SERVICES-SPEC.md.
 */
import type {PluginDefinition} from '../kernel';

export const STORAGE_CONTRACT = 'engine.storage/v1';
export const STORAGE_VERSION = '1.0.0';

export interface StorageEntry {path: string; name: string; folder: boolean; size: number; mtime: number; ctime: number}
export interface StoredNote {path: string; content: string; version: string}
export interface StorageSnapshot {id: string; path: string; time: number}
export interface StoredPlugin {manifest: {id: string; name: string; version: string; description?: string}; code: string}

/** Versioned text, metadata and attachment storage. Paths are vault-relative and validated. */
export interface StorageService {
  list(): Promise<StorageEntry[]>;
  read(path: string): Promise<StoredNote>;
  write(path: string, content: string, version?: string): Promise<StoredNote>;
  create(path: string, content: string): Promise<StoredNote>;
  append(path: string, content: string): Promise<StoredNote>;
  mkdir(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  trash(path: string): Promise<void>;
  snapshots(path: string): Promise<StorageSnapshot[]>;
  restore(id: string): Promise<StoredNote>;
  pluginData(id: string, data?: unknown, write?: boolean): Promise<unknown>;
  loadState(): Promise<Record<string, unknown>>;
  saveState(state: unknown): Promise<void>;
  asset(path: string): Promise<string>;
  attach(name: string, data: number[]): Promise<string>;
  plugins(): Promise<StoredPlugin[]>;
}

/** The subset of the local Vault implementation this contract delegates to. */
export type VaultLike = StorageService;

const TEXT_EXTENSIONS = new Set(['.md', '.markdown', '.txt', '.canvas', '.base', '.csv', '.json', '.css', '.js', '.mjs']);
const MAX_TEXT_BYTES = 32 * 1024 * 1024;
const MAX_PLUGIN_DATA_BYTES = 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 64 * 1024 * 1024;
const MIME: Record<string, string> = {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf', mp3: 'audio/mpeg', webm: 'audio/webm', wav: 'audio/wav', ogg: 'audio/ogg', mp4: 'video/mp4'};

/** Reject absolute, parent, hidden and NUL-containing vault paths. */
export function assertStoragePath(relative: string, allowHidden = false): void {
  if (typeof relative !== 'string' || relative.includes('\0') || relative.startsWith('/') || relative.includes('\\')) throw new Error('Invalid vault path');
  if (relative.split('/').some(segment => segment === '..' || (!allowHidden && segment.startsWith('.')))) throw new Error('Invalid vault path');
}

/** Report the lowercase extension of a vault path. */
export function storageExtension(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot < 0 ? '' : path.slice(dot).toLowerCase();
}

/** Synchronous non-cryptographic content fingerprint, stable across providers and runs. */
function fingerprint(content: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let index = 0; index < content.length; index++) {
    hash ^= BigInt(content.charCodeAt(index));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
}

/** Base64-encode bytes without depending on a particular global environment. */
function toBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index], b = index + 1 < bytes.length ? bytes[index + 1] : 0, c = index + 2 < bytes.length ? bytes[index + 2] : 0;
    output += alphabet[a >> 2] + alphabet[((a & 3) << 4) | (b >> 4)] + (index + 1 < bytes.length ? alphabet[((b & 15) << 2) | (c >> 6)] : '=') + (index + 2 < bytes.length ? alphabet[c & 63] : '=');
  }
  return output;
}

/** In-memory preview provider with the same write, conflict, history and isolation semantics. */
export class MemoryStorage implements StorageService {
  private files = new Map<string, string>();
  private metadata = new Map<string, {mtime: number; ctime: number}>();
  private folders = new Set<string>();
  private history: {id: string; path: string; time: number; content: string}[] = [];
  private trashRecords = new Map<string, {path: string; content: string; time: number}>();
  private attachments = new Map<string, string>();
  private pluginDataStore = new Map<string, unknown>();
  private state: Record<string, unknown> = {};
  private queue: Promise<unknown> = Promise.resolve();

  /** Serialize a mutation behind the previous one, preserving in-process ordering. */
  private serialize<T>(operation: () => Promise<T> | T): Promise<T> {
    const next = this.queue.then(operation);
    this.queue = next.catch(() => undefined);
    return next;
  }

  /** List visible files and folders, deriving parent folders from file paths. */
  async list(): Promise<StorageEntry[]> {
    const folders = new Set(this.folders);
    const entries: StorageEntry[] = [];
    for (const path of this.files.keys()) {
      const segments = path.split('/');
      segments.pop();
      let current = '';
      for (const segment of segments) { current += (current ? '/' : '') + segment; folders.add(current); }
    }
    const now = Date.now();
    for (const folder of folders) {
      if (folder.split('/').some(segment => segment.startsWith('.'))) continue;
      entries.push({path: folder, name: folder.split('/').pop()!, folder: true, size: 0, mtime: now, ctime: now});
    }
    for (const [path, content] of this.files) {
      if (path.split('/').some(segment => segment.startsWith('.'))) continue;
      const times = this.metadata.get(path) ?? {mtime: now, ctime: now};
      entries.push({path, name: path.split('/').pop()!, folder: false, size: new TextEncoder().encode(content).length, mtime: times.mtime, ctime: times.ctime});
    }
    return entries.sort((a, b) => Number(b.folder) - Number(a.folder) || a.path.localeCompare(b.path));
  }

  /** Read a text file and its current content fingerprint. */
  async read(path: string): Promise<StoredNote> {
    assertStoragePath(path);
    if (!TEXT_EXTENSIONS.has(storageExtension(path))) throw new Error('Not a text file');
    const content = this.files.get(path);
    if (content === undefined) throw new Error('File not found');
    return {path, content, version: fingerprint(content)};
  }

  /** Write text with optimistic conflict detection and previous-content snapshots. */
  write(path: string, content: string, version?: string): Promise<StoredNote> {
    return this.serialize(() => this.writeUnlocked(path, content, version, false));
  }

  /** Create a new text file, refusing to overwrite existing content. */
  create(path: string, content: string): Promise<StoredNote> {
    return this.serialize(() => this.writeUnlocked(path, content, undefined, true));
  }

  /** Append text, serialized against other appends in this process. */
  async append(path: string, content: string): Promise<StoredNote> {
    if (typeof content !== 'string') throw new Error('Invalid text');
    return this.serialize(async () => {
      const before = await this.read(path);
      return this.writeUnlocked(path, before.content + content, before.version, false);
    });
  }

  /** Ensure a folder exists, even if empty. */
  async mkdir(path: string): Promise<void> {
    assertStoragePath(path);
    this.folders.add(path);
  }

  /** Move a file or folder subtree, refusing to overwrite an existing destination. */
  async rename(from: string, to: string): Promise<void> {
    return this.serialize(async () => {
      assertStoragePath(from); assertStoragePath(to);
      if (to === from || to.startsWith(from + '/')) throw new Error('Cannot move a path into itself');
      if (this.exists(to)) throw new Error('Destination already exists');
      const moved = [...this.files.keys()].filter(path => path === from || path.startsWith(from + '/'));
      const movedFolders = [...this.folders].filter(path => path === from || path.startsWith(from + '/'));
      if (!moved.length && !movedFolders.includes(from)) throw new Error('File not found');
      for (const path of moved) {
        const target = to + path.slice(from.length);
        this.files.set(target, this.files.get(path)!);
        this.metadata.set(target, this.metadata.get(path) ?? {mtime: Date.now(), ctime: Date.now()});
        this.files.delete(path); this.metadata.delete(path);
      }
      for (const [path, data] of [...this.attachments]) if (path === from || path.startsWith(from + '/')) { this.attachments.set(to + path.slice(from.length), data); this.attachments.delete(path); }
      for (const path of movedFolders) { this.folders.add(to + path.slice(from.length)); this.folders.delete(path); }
      this.folders.delete(from); this.folders.delete(to);
    });
  }

  /** Move a file or subtree out of the visible vault into recoverable storage. */
  async trash(path: string): Promise<void> {
    return this.serialize(async () => {
      assertStoragePath(path);
      const removed = [...this.files.keys()].filter(candidate => candidate === path || candidate.startsWith(path + '/'));
      if (!this.exists(path)) throw new Error('File not found');
      for (const candidate of removed) {
        const id = `${Date.now()}-${this.trashRecords.size}-${candidate}`;
        this.trashRecords.set(id, {path: candidate, content: this.files.get(candidate)!, time: Date.now()});
        this.files.delete(candidate); this.metadata.delete(candidate); this.attachments.delete(candidate);
      }
      for (const folder of [...this.folders]) if (folder === path || folder.startsWith(path + '/')) this.folders.delete(folder);
    });
  }

  /** Previous saved versions of a path, newest first. */
  async snapshots(path: string): Promise<StorageSnapshot[]> {
    assertStoragePath(path);
    return this.history.filter(snapshot => snapshot.path === path).sort((a, b) => b.time - a.time).map(({id, path, time}) => ({id, path, time}));
  }

  /** Restore a previous version, which snapshots the version it replaces. */
  async restore(id: string): Promise<StoredNote> {
    const snapshot = this.history.find(entry => entry.id === id);
    if (!snapshot) throw new Error('Snapshot not found');
    return this.write(snapshot.path, snapshot.content);
  }

  /** Read or write plugin-local JSON, isolated by plugin id. */
  async pluginData(id: string, data?: unknown, write = false): Promise<unknown> {
    if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id)) throw new Error('Invalid plugin id');
    if (!write) return structuredClone(this.pluginDataStore.get(id) ?? null);
    const json = JSON.stringify(data);
    if (json === undefined || new TextEncoder().encode(json).length > MAX_PLUGIN_DATA_BYTES) throw new Error('Invalid or oversized plugin data');
    return this.serialize(() => { this.pluginDataStore.set(id, structuredClone(data)); });
  }

  /** Load persisted workspace state, or an empty object. */
  async loadState(): Promise<Record<string, unknown>> { return structuredClone(this.state); }

  /** Persist workspace state. */
  async saveState(state: unknown): Promise<void> {
    return this.serialize(() => { this.state = structuredClone(state) as Record<string, unknown>; });
  }

  /** Return a data URL for a stored attachment. */
  async asset(path: string): Promise<string> {
    assertStoragePath(path);
    const asset = this.attachments.get(path);
    if (!asset) throw new Error('Attachment not found');
    return asset;
  }

  /** Store attachment bytes under the configured attachment folder. */
  async attach(name: string, data: number[]): Promise<string> {
    if (typeof name !== 'string' || !Array.isArray(data) || data.length > MAX_ATTACHMENT_BYTES || data.some(value => !Number.isInteger(value) || value < 0 || value > 255)) throw new Error('Invalid attachment');
    return this.serialize(async () => {
      const settings = (await this.loadState()).settings as {attachmentFolder?: string} | undefined;
      const folder = settings?.attachmentFolder || 'Attachments';
      const base = name.replace(/[^a-zA-Z0-9_.\-\u0080-\uffff]/g, '_') || 'attachment';
      let relative = `${folder}/${base}`;
      if (this.exists(relative)) relative = `${folder}/${crypto.randomUUID()}-${base}`;
      const extension = storageExtension(relative).slice(1);
      this.attachments.set(relative, `data:${MIME[extension] || 'application/octet-stream'};base64,${toBase64(Uint8Array.from(data))}`);
      this.files.set(relative, '');
      this.metadata.set(relative, {mtime: Date.now(), ctime: Date.now()});
      return relative;
    });
  }

  /** Preview providers never discover executable plugin folders in memory. */
  async plugins(): Promise<StoredPlugin[]> { return []; }

  /** Report whether a path or any descendant exists. */
  private exists(path: string): boolean {
    return this.files.has(path) || this.folders.has(path)
      || [...this.files.keys()].some(candidate => candidate.startsWith(path + '/'))
      || [...this.folders].some(candidate => candidate.startsWith(path + '/'));
  }

  /** Perform a validated, fingerprinted write while already holding the mutation queue. */
  private writeUnlocked(path: string, content: string, version: string | undefined, createOnly: boolean): StoredNote {
    if (typeof content !== 'string' || new TextEncoder().encode(content).length > MAX_TEXT_BYTES) throw new Error('Invalid or oversized text');
    if (!TEXT_EXTENSIONS.has(storageExtension(path))) throw new Error('Unsupported text format');
    assertStoragePath(path);
    const previous = this.files.get(path);
    if (createOnly && previous !== undefined) throw new Error('File already exists');
    if (version !== undefined && (previous === undefined || fingerprint(previous) !== version)) throw new Error('CONFLICT: File changed. Reload or save a separate copy.');
    if (previous !== undefined && previous !== content) this.pushHistory(path, previous);
    const now = Date.now();
    this.files.set(path, content);
    this.metadata.set(path, {mtime: now, ctime: this.metadata.get(path)?.ctime ?? now});
    return {path, content, version: fingerprint(content)};
  }

  /** Record a previous version and cap retention at one hundred entries per path. */
  private pushHistory(path: string, content: string): void {
    this.history.unshift({id: `${Date.now()}-${crypto.randomUUID()}`, path, time: Date.now(), content});
    const excess = this.history.filter(snapshot => snapshot.path === path).slice(100);
    for (const snapshot of excess) this.history = this.history.filter(entry => entry.id !== snapshot.id);
  }
}

/** Local-filesystem provider that delegates to the existing Vault implementation. */
export class LocalStorage implements StorageService {
  /** @param vault A Vault-like object, such as `new Vault(root)` from core/vault.mjs. */
  constructor(private readonly vault: VaultLike) {}

  list(): Promise<StorageEntry[]> { return this.vault.list(); }
  read(path: string): Promise<StoredNote> { return this.vault.read(path); }
  write(path: string, content: string, version?: string): Promise<StoredNote> { return this.vault.write(path, content, version); }
  create(path: string, content: string): Promise<StoredNote> { return this.vault.create(path, content); }
  append(path: string, content: string): Promise<StoredNote> { return this.vault.append(path, content); }
  mkdir(path: string): Promise<void> { return this.vault.mkdir(path); }
  rename(from: string, to: string): Promise<void> { return this.vault.rename(from, to); }
  trash(path: string): Promise<void> { return this.vault.trash(path); }
  snapshots(path: string): Promise<StorageSnapshot[]> { return this.vault.snapshots(path); }
  restore(id: string): Promise<StoredNote> { return this.vault.restore(id); }
  pluginData(id: string, data?: unknown, write?: boolean): Promise<unknown> { return this.vault.pluginData(id, data, write); }
  loadState(): Promise<Record<string, unknown>> { return this.vault.loadState(); }
  saveState(state: unknown): Promise<void> { return this.vault.saveState(state); }
  asset(path: string): Promise<string> { return this.vault.asset(path); }
  attach(name: string, data: number[]): Promise<string> { return this.vault.attach(name, data); }
  plugins(): Promise<StoredPlugin[]> { return this.vault.plugins(); }
}

/** Wrap a storage provider as a runtime-scoped native plugin that provides the contract. */
export function storagePlugin(id: string, name: string, service: StorageService): PluginDefinition {
  return {
    manifest: {id, name, version: STORAGE_VERSION, scopes: ['runtime'], provides: [{contract: STORAGE_CONTRACT, version: STORAGE_VERSION}]},
    setup(context) { context.provide(STORAGE_CONTRACT, STORAGE_VERSION, service); }
  };
}

/** Preview-profile provider plugin backed by in-memory storage. */
export const createMemoryStoragePlugin = (): PluginDefinition => storagePlugin('engine.storage.memory', 'Memory storage', new MemoryStorage());

/** Desktop/web provider plugin backed by a Vault-like local filesystem store. */
export const createLocalStoragePlugin = (vault: VaultLike): PluginDefinition => storagePlugin('engine.storage.local', 'Local storage', new LocalStorage(vault));
