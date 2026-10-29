/* Native Obsidian-plugin support contract (`engine.compat/v1`).
 *
 * The contract exposes package loading plus the host callbacks needed by the compatibility
 * runtime. Obsidian-shaped APIs stay inside the support implementation; callers only start,
 * stop and observe a controller.
 */
import type {PluginDefinition} from '../kernel';
import type {PluginTab} from '../compat-dom';
import type {CompatNativeServices, PluginSnapshot} from '../compat-core';
import type {PluginCommand, PluginController} from '../plugins';
import type {PluginManifest} from '../types';
import {ENGINE_VERSION} from './version';

export const COMPAT_CONTRACT = 'engine.compat/v1';
export const COMPAT_VERSION = '1.0.0';

/** A local package discovered by the support plugin. */
export interface CompatPackage {manifest: PluginManifest; code: string}

/** Host primitives used by the Obsidian adapter; operation names stay inside src/compat. */
export interface CompatHost {
  loadData(id: string): Promise<unknown>;
  saveData(id: string, data: unknown): Promise<unknown>;
  read(path: string): Promise<string>;
  create(path: string, content: string): Promise<unknown>;
  modify(path: string, content: string): Promise<unknown>;
  append(path: string, content: string): Promise<unknown>;
  writeLegacy(path: string, content: string): Promise<unknown>;
  rename(from: string, to: string): Promise<string>;
  trash(path: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  asset(path: string): Promise<string>;
  open(path: string): Promise<void>;
  editor(path: string, base: string, text: string, from: number, to: number): Promise<void>;
}

/** Host callbacks a compatibility runtime may use while loading a package. */
export interface CompatStartCallbacks {
  snapshot: () => PluginSnapshot;
  commands: (commands: PluginCommand[]) => void;
  host: CompatHost;
  /** Observe one in-flight host operation so the application can await it on shutdown. */
  activity?: (promise: Promise<unknown>) => void;
  notice: (message: string) => void;
  failure: () => void;
  tabs?: (tabs: PluginTab[]) => void;
  extensions?: (extensions: unknown[]) => void;
  fileExtensions?: (extensions: string[], viewType?: string) => void;
  native?: CompatNativeServices;
}

export interface CompatStartRequest {
  package: CompatPackage;
  mode: 'worker' | 'renderer';
  callbacks: CompatStartCallbacks;
}

/** Loader/runtime surface consumed by the application host. */
export interface CompatService {
  /** Discover and validate local packages before they are offered in Settings. */
  list(): Promise<CompatPackage[]>;
  start(request: CompatStartRequest): PluginController;
  capabilities(): {worker: boolean; renderer: boolean};
}

/** Register a support implementation as a native runtime plugin. */
export function compatPlugin(service: CompatService): PluginDefinition {
  return {
    manifest: {
      id: 'engine.compat',
      name: 'Obsidian plugin support',
      version: COMPAT_VERSION,
      scopes: ['runtime'],
      provides: [{contract: COMPAT_CONTRACT, version: COMPAT_VERSION}]
    },
    setup(context) { context.provide(COMPAT_CONTRACT, COMPAT_VERSION, service); }
  };
}

export {ENGINE_VERSION};
