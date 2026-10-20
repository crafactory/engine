/* Native explorer service contract (`engine.explorer/v1`).
 *
 * File-tree listing, ordering and child lookup over `engine.storage/v1`. The application
 * keeps expansion and interaction state; this service owns the derived ordering so the UI
 * and any other consumer agree on folder-first, name/modified sort semantics.
 */
import {Kernel, type PluginDefinition} from '../kernel';
import type {Entry} from '../types';
import {ENGINE_VERSION} from './version';
import {createMemoryStoragePlugin, STORAGE_CONTRACT, type StorageService} from './storage';

export const EXPLORER_CONTRACT = 'engine.explorer/v1';
export const EXPLORER_VERSION = '1.0.0';

export type ExplorerSort = 'name' | 'modified';

export interface ExplorerListOptions {sort?: ExplorerSort}

/** File-tree listing and ordering over the storage contract. */
export interface ExplorerService {
  list(options?: ExplorerListOptions): Promise<Entry[]>;
  sort(entries: readonly Entry[], sort?: ExplorerSort): Entry[];
  children(entries: readonly Entry[], parent: string, sort?: ExplorerSort): Entry[];
}

/** Original folder-first ordering; `modified` sorts newest first within each group. */
export class Explorer implements ExplorerService {
  /** @param storage Storage provider supplying the vault entries. */
  constructor(private readonly storage: StorageService) {}

  /** List vault entries in tree order. */
  async list(options: ExplorerListOptions = {}): Promise<Entry[]> { return this.sort(await this.storage.list(), options.sort); }

  /** Sort entries folders-first, then by name or modification time (name breaks ties). */
  sort(entries: readonly Entry[], sort: ExplorerSort = 'name'): Entry[] {
    return [...entries].sort((a, b) => Number(b.folder) - Number(a.folder)
      || (sort === 'modified' ? b.mtime - a.mtime || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)));
  }

  /** Direct children of a folder (or the root when `parent` is empty), in tree order. */
  children(entries: readonly Entry[], parent: string, sort: ExplorerSort = 'name'): Entry[] {
    return this.sort(entries.filter(entry => entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) === parent : !parent), sort);
  }
}

/** Wrap an explorer service as a runtime-scoped provider that consumes storage. */
export function explorerPlugin(factory: (storage: StorageService) => ExplorerService = storage => new Explorer(storage)): PluginDefinition {
  return {
    manifest: {
      id: 'engine.explorer', name: 'Explorer', version: EXPLORER_VERSION, scopes: ['runtime'],
      provides: [{contract: EXPLORER_CONTRACT, version: EXPLORER_VERSION}],
      consumes: [{contract: STORAGE_CONTRACT, range: '^1.0.0'}]
    },
    setup(context) {
      const storage = context.service<StorageService>(STORAGE_CONTRACT);
      context.provide(EXPLORER_CONTRACT, EXPLORER_VERSION, factory(storage));
    }
  };
}

export interface ExplorerRuntime {kernel: Kernel; explorer: ExplorerService}

/** Default explorer provider plugin over the resolved storage service. */
export const createExplorerPlugin = (): PluginDefinition => explorerPlugin();

/** Build and start a kernel with a memory storage provider and the explorer. */
export async function createExplorerRuntime(options: {engineVersion?: string} = {}): Promise<ExplorerRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(createMemoryStoragePlugin());
  kernel.register(explorerPlugin());
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(EXPLORER_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Explorer service was not provided');
  return {kernel, explorer: resolved.binding.value as ExplorerService};
}
