import type { Bridge } from '../types';
import type { CompatNativeServices } from '../compat-core';

/** Connect the synchronous Obsidian API to a live desktop vault, never to plugin data. */
export function pluginSecretAdapter(
  bridge: Bridge,
  root: string,
  ensureOpen: () => void,
): CompatNativeServices['secretStorage'] {
  const storage = bridge.pluginSecrets;
  if (!bridge.desktop || !storage?.(root, 'available')) return undefined;
  return {
    getSecret(id) {
      ensureOpen();
      return storage(root, 'get', id);
    },
    listSecrets() {
      ensureOpen();
      return storage(root, 'list');
    },
    setSecret(id, value) {
      ensureOpen();
      storage(root, 'set', id, value);
    },
  };
}
