import {startRendererPlugin} from '../plugin-renderer';
import {startPlugin} from '../plugins';
import type {CompatService} from '../services/compat';

type WorkerStarter = typeof startPlugin;
type RendererStarter = typeof startRendererPlugin;

/** Compose the two existing runtimes behind the support contract. */
export function createCompatService(deps: {worker?: WorkerStarter; renderer?: RendererStarter} = {}): CompatService {
  const worker = deps.worker ?? startPlugin;
  const renderer = deps.renderer ?? startRendererPlugin;
  return {
    start({package: pkg, mode, callbacks}) {
      if (mode === 'renderer') {
        return renderer(pkg.manifest, pkg.code, callbacks.snapshot, callbacks.commands, callbacks.operation,
          callbacks.notice, callbacks.failure, callbacks.tabs ?? (() => {}), callbacks.extensions ?? (() => {}),
          callbacks.native, callbacks.fileExtensions);
      }
      return worker(pkg.manifest, pkg.code, callbacks.snapshot, callbacks.commands, callbacks.operation,
        callbacks.notice, callbacks.failure);
    },
    capabilities() { return {worker: true, renderer: true}; }
  };
}
