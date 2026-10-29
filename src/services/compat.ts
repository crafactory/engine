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

/** Host callbacks a compatibility runtime may use while loading a package. */
export interface CompatStartCallbacks {
  snapshot: () => PluginSnapshot;
  commands: (commands: PluginCommand[]) => void;
  operation: (name: string, args: unknown[]) => Promise<unknown>;
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
