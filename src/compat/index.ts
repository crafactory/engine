import {Kernel} from '../kernel';
import {COMPAT_CONTRACT, COMPAT_VERSION, compatPlugin, type CompatService} from '../services/compat';
import {ENGINE_VERSION} from '../services/version';
import {createCompatService} from './service';

export interface CompatRuntime {kernel: Kernel; service: CompatService}

/** Build the native compatibility kernel; package work starts only when requested. */
export async function createCompatRuntime(options: {engineVersion?: string; service?: CompatService} = {}): Promise<CompatRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(compatPlugin(options.service ?? createCompatService()));
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(COMPAT_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Compatibility service was not provided');
  return {kernel, service: resolved.binding.value as CompatService};
}

export * from '../services/compat';
