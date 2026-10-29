import {validatePluginPackage} from '../kernel';
import {checkPermission} from '../kernel/permissions';
import type {PluginManifest} from '../types';
import {startRendererPlugin} from '../plugin-renderer';
import {startPlugin} from '../plugins';
import type {CompatHost, CompatPackage, CompatService} from '../services/compat';
import {ENGINE_VERSION} from '../services/version';

type WorkerStarter = typeof startPlugin;
type RendererStarter = typeof startRendererPlugin;

/** Map Obsidian-shaped host operations to typed host primitives, enforcing declared permissions. */
function operationFor(manifest: PluginManifest, host: CompatHost) {
  return async (name: string, args: unknown[]) => {
    checkPermission(manifest, name);
    switch (name) {
      case 'loadData': return host.loadData(manifest.id);
      case 'saveData': return host.saveData(manifest.id, args[0]);
      case 'read': return host.read(String(args[0]));
      case 'create': return host.create(String(args[0]), String(args[1]));
      case 'modify': return host.modify(String(args[0]), String(args[1]));
      case 'append': return host.append(String(args[0]), String(args[1]));
      case 'writeLegacy': return host.writeLegacy(String(args[0]), String(args[1]));
      case 'rename': return host.rename(String(args[0]), String(args[1]));
      case 'trash': return host.trash(String(args[0]));
      case 'mkdir': return host.mkdir(String(args[0]));
      case 'asset': return host.asset(String(args[0]));
      case 'open': return host.open(String(args[0]));
      case 'editor': return host.editor(String(args[0]), String(args[1]), String(args[2]), Number(args[3]), Number(args[4]));
      default: throw new Error('Unsupported plugin host operation: ' + name);
    }
  };
}

/** Compose discovery and the two existing runtimes behind the support contract. */
export function createCompatService(deps: {
  worker?: WorkerStarter;
  renderer?: RendererStarter;
  discover?: () => Promise<CompatPackage[]>;
  engineVersion?: string;
} = {}): CompatService {
  const worker = deps.worker ?? startPlugin;
  const renderer = deps.renderer ?? startRendererPlugin;
  const discover = deps.discover ?? (async () => (await import('../bridge')).bridge.plugins());
  const engineVersion = deps.engineVersion ?? ENGINE_VERSION;
  return {
    async list() {
      const valid: CompatPackage[] = [];
      for (const pkg of await discover()) {
        const validation = validatePluginPackage({manifest: pkg.manifest}, engineVersion);
        if (validation.ok) valid.push(pkg);
        else console.warn('Skipped invalid plugin package', pkg.manifest?.id, validation.issues);
      }
      return valid;
    },
    start({package: pkg, mode, callbacks}) {
      const mapOperation = operationFor(pkg.manifest, callbacks.host);
      const operation = (name: string, args: unknown[]) => {
        const promise = mapOperation(name, args);
        callbacks.activity?.(promise);
        return promise;
      };
      if (mode === 'renderer') {
        return renderer(pkg.manifest, pkg.code, callbacks.snapshot, callbacks.commands, operation,
          callbacks.notice, callbacks.failure, callbacks.tabs ?? (() => {}), callbacks.extensions ?? (() => {}),
          callbacks.native, callbacks.fileExtensions);
      }
      return worker(pkg.manifest, pkg.code, callbacks.snapshot, callbacks.commands, operation,
        callbacks.notice, callbacks.failure);
    },
    capabilities() { return {worker: true, renderer: true}; }
  };
}
