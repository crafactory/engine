/* Default native service providers assembled by the kernel.
 * No application entry point is replaced yet; these providers are additive. */
import type {Kernel} from '../kernel';
import {createMemoryStoragePlugin, createLocalStoragePlugin, type VaultLike} from './storage';
import {createCommandsPlugin} from './commands';
import {createDocumentsPlugin} from './documents';

export * from './storage';
export * from './commands';
export * from './documents';

export interface DefaultServiceOptions {
  /** Preview uses the in-memory provider; local uses a Vault-like filesystem store. */
  storage: 'memory' | 'local';
  /** Required when `storage` is `local`. */
  vault?: VaultLike;
}

/** Register the default storage, commands and documents providers on a kernel. */
export function registerDefaultServices(kernel: Kernel, options: DefaultServiceOptions): void {
  if (options.storage === 'local') {
    if (!options.vault) throw new Error('Local storage requires a vault');
    kernel.register(createLocalStoragePlugin(options.vault));
  } else {
    kernel.register(createMemoryStoragePlugin());
  }
  kernel.register(createCommandsPlugin());
  kernel.register(createDocumentsPlugin());
}
