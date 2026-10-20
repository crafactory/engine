/* Native workspaces service contract (`engine.workspaces/v1`).
 *
 * Named workspace layouts: save, load, list and remove. The application mirrors the stored
 * record into render state via `subscribe`; persistence stays application-side until the
 * state store is migrated.
 */
import {Kernel, type PluginDefinition} from '../kernel';
import type {Workspace} from '../types';
import {ENGINE_VERSION} from './version';

export const WORKSPACES_CONTRACT = 'engine.workspaces/v1';
export const WORKSPACES_VERSION = '1.0.0';

/** Named workspace layouts with change notifications. */
export interface WorkspacesService {
  list(): string[];
  get(name: string): Workspace | undefined;
  save(name: string, workspace: Workspace): void;
  remove(name: string): void;
  replace(record: Record<string, Workspace>): void;
  subscribe(listener: (record: Record<string, Workspace>) => void): () => void;
}

/** Original in-memory workspace store with isolated snapshots. */
export class WorkspaceStore implements WorkspacesService {
  private items: Record<string, Workspace>;
  private readonly listeners = new Set<(record: Record<string, Workspace>) => void>();

  /** @param initial Seed record; invalid entries are discarded. */
  constructor(initial: Record<string, Workspace> = {}) { this.items = sanitize(initial); }

  /** Saved workspace names in insertion order. */
  list(): string[] { return Object.keys(this.items); }

  /** A workspace snapshot, or undefined when the name is unknown. */
  get(name: string): Workspace | undefined { const value = this.items[name]; return value ? structuredClone(value) : undefined; }

  /** Save or replace a named workspace. */
  save(name: string, workspace: Workspace): void {
    if (typeof name !== 'string' || !name || !workspace) return;
    this.items[name] = structuredClone(workspace);
    this.emit();
  }

  /** Remove a named workspace if present. */
  remove(name: string): void {
    if (!Object.hasOwn(this.items, name)) return;
    delete this.items[name];
    this.emit();
  }

  /** Replace the whole record (loading persisted state). */
  replace(record: Record<string, Workspace>): void {
    this.items = sanitize(record);
    this.emit();
  }

  /** Observe changes; the returned disposer stops the subscription. */
  subscribe(listener: (record: Record<string, Workspace>) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** Notify every listener with its own deep snapshot. */
  private emit(): void {
    for (const listener of [...this.listeners]) listener(structuredClone(this.items));
  }
}

/** Keep only object-valued workspace entries. */
function sanitize(record: Record<string, Workspace>): Record<string, Workspace> {
  const result: Record<string, Workspace> = {};
  for (const [name, workspace] of Object.entries(record ?? {})) if (name && workspace && typeof workspace === 'object') result[name] = structuredClone(workspace);
  return result;
}

/** Wrap a workspaces service as a runtime-scoped native plugin. */
export function workspacesPlugin(service: WorkspacesService): PluginDefinition {
  return {
    manifest: {id: 'engine.workspaces', name: 'Workspaces', version: WORKSPACES_VERSION, scopes: ['runtime'], provides: [{contract: WORKSPACES_CONTRACT, version: WORKSPACES_VERSION}]},
    setup(context) { context.provide(WORKSPACES_CONTRACT, WORKSPACES_VERSION, service); }
  };
}

export interface WorkspacesRuntime {kernel: Kernel; service: WorkspacesService}

/** Build and start a kernel exposing the workspaces service. */
export async function createWorkspacesRuntime(options: {engineVersion?: string; initial?: Record<string, Workspace>} = {}): Promise<WorkspacesRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(workspacesPlugin(new WorkspaceStore(options.initial)));
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(WORKSPACES_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Workspaces service was not provided');
  return {kernel, service: resolved.binding.value as WorkspacesService};
}
