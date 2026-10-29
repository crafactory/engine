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
    const path=(value:unknown)=>{if(typeof value!=='string')throw new Error('Invalid plugin vault path');return value;};
    const text=(value:unknown)=>{if(typeof value!=='string')throw new Error('Invalid plugin text');return value;};
    const integer=(value:unknown)=>{if(!Number.isInteger(value))throw new Error('Invalid editor mutation');return value as number;};
    switch (name) {
      case 'loadData': return host.loadData(manifest.id);
      case 'saveData': return host.saveData(manifest.id, args[0]);
      case 'read': return host.read(path(args[0]));
      case 'create': return host.create(path(args[0]), text(args[1]));
      case 'modify': return host.modify(path(args[0]), text(args[1]));
      case 'append': return host.append(path(args[0]), text(args[1]));
      case 'writeLegacy': return host.writeLegacy(path(args[0]), text(args[1]));
      case 'rename': return host.rename(path(args[0]), path(args[1]));
      case 'trash': return host.trash(path(args[0]));
      case 'mkdir': return host.mkdir(path(args[0]));
      case 'asset': return host.asset(path(args[0]));
      case 'open': return host.open(path(args[0]));
      case 'editor': return host.editor(path(args[0]), text(args[1]), text(args[2]), integer(args[3]), integer(args[4]));
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
