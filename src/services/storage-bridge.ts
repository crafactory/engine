/* Bridge-backed storage provider (`engine.storage/v1`).
 *
 * Wraps the application's existing preload/memory bridge as a native storage service so
 * the facade and later features can consume `engine.storage/v1` and `engine.documents/v1`
 * without replacing the application's own persistence path. The application continues to
 * write through the bridge directly; this adapter exposes the same underlying store.
 */
import {Kernel} from '../kernel';
import type {Bridge, VaultState} from '../types';
import {ENGINE_VERSION} from './version';
import {storagePlugin, STORAGE_CONTRACT, type StorageEntry, type StorageService, type StorageSnapshot, type StoredNote, type StoredPlugin} from './storage';
import {createDocumentsPlugin, DOCUMENTS_CONTRACT, type DocumentsService} from './documents';

/** Adapt the application bridge to the storage contract. */
export class BridgeStorage implements StorageService {
  /** @param bridge The active desktop or preview bridge. */
  constructor(private readonly bridge: Bridge) {}

  list(): Promise<StorageEntry[]> { return this.bridge.list(); }
  async read(path: string): Promise<StoredNote> { return note(await this.bridge.read(path)); }
  async write(path: string, content: string, version?: string): Promise<StoredNote> { return note(await this.bridge.write(path, content, version)); }
  async create(path: string, content: string): Promise<StoredNote> { return note(await this.bridge.create(path, content)); }
  async append(path: string, content: string): Promise<StoredNote> { return note(await this.bridge.append(path, content)); }
  mkdir(path: string): Promise<void> { return this.bridge.mkdir(path); }
  rename(from: string, to: string): Promise<void> { return this.bridge.rename(from, to); }
  trash(path: string): Promise<void> { return this.bridge.trash(path); }
  snapshots(path: string): Promise<StorageSnapshot[]> { return this.bridge.snapshots(path); }
  async restore(id: string): Promise<StoredNote> { return note(await this.bridge.restore(id)); }
  pluginData(id: string, data?: unknown, write?: boolean): Promise<unknown> { return this.bridge.pluginData(id, data, write); }
  async loadState(): Promise<Record<string, unknown>> { const vault = await this.bridge.vault(); return (vault.state || {}) as Record<string, unknown>; }
  async saveState(state: unknown): Promise<void> { await this.bridge.state(state as VaultState); }
  asset(path: string): Promise<string> { return this.bridge.asset(path); }
  attach(name: string, data: number[]): Promise<string> { return this.bridge.attach(name, data); }
  plugins(): Promise<StoredPlugin[]> { return this.bridge.plugins(); }
}

/** Normalize a bridge note (optional version) into a stored note (required fingerprint). */
function note(value: {path: string; content: string; version?: string}): StoredNote {
  return {path: value.path, content: value.content, version: value.version ?? ''};
}

export interface AppStorageRuntime {kernel: Kernel; storage: StorageService; documents: DocumentsService}

/** Build and start a kernel exposing the bridge-backed storage and documents services. */
export async function createStorageRuntime(options: {bridge: Bridge; engineVersion?: string}): Promise<AppStorageRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(storagePlugin('engine.storage.bridge', 'Bridge storage', new BridgeStorage(options.bridge)));
  kernel.register(createDocumentsPlugin());
  await kernel.start();
  const storage = kernel.runtime.services.resolve(STORAGE_CONTRACT, '^1.0.0');
  const documents = kernel.runtime.services.resolve(DOCUMENTS_CONTRACT, '^1.0.0');
  if (!storage.ok) throw new Error('Storage service was not provided');
  if (!documents.ok) throw new Error('Documents service was not provided');
  return {kernel, storage: storage.binding.value as StorageService, documents: documents.binding.value as DocumentsService};
}
