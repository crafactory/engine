/* Plugin permission vocabulary and the host-operation mapping.
 *
 * Permissions are declarations, not a sandbox: the application host checks them before
 * performing a vault/storage/editor operation for a plugin. A manifest without a
 * `permissions` field keeps legacy unrestricted access; declaring permissions restricts
 * the plugin to the declared set.
 */

export const PLUGIN_PERMISSIONS = ['vault:read', 'vault:write', 'vault:trash', 'editor:write', 'storage:plugin-data'] as const;

export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number];

/** The permission a host operation requires, or null when the operation needs none. */
export function requiredPermission(operation: string): PluginPermission | null {
  switch (operation) {
    case 'read':
    case 'open':
    case 'asset':
      return 'vault:read';
    case 'trash':
      return 'vault:trash';
    case 'editor':
      return 'editor:write';
    case 'create':
    case 'modify':
    case 'append':
    case 'writeLegacy':
    case 'mkdir':
    case 'rename':
      return 'vault:write';
    case 'loadData':
    case 'saveData':
      return 'storage:plugin-data';
    default:
      return null;
  }
}

/**
 * Enforce a manifest's declared permissions for one host operation.
 * Legacy manifests without `permissions` are unrestricted; otherwise the operation is
 * rejected unless the manifest declares the required permission.
 */
export function checkPermission(manifest: {permissions?: string[]}, operation: string): void {
  if (manifest.permissions === undefined) return;
  const required = requiredPermission(operation);
  if (required && !manifest.permissions.includes(required)) throw new Error(`Plugin lacks the ${required} permission for ${operation}`);
}
