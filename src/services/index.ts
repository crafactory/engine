/* Default native service providers assembled by the kernel.
 * No application entry point is replaced yet; these providers are additive. */
import {Kernel,type PluginDefinition} from '../kernel';
import {createMemoryStoragePlugin, createLocalStoragePlugin, type VaultLike} from './storage';
import {createCommandsPlugin} from './commands';
import {createDocumentsPlugin} from './documents';
import {FormatRegistry, renderPlugin, type RenderService} from './render';
import {WORKSPACE_CONTRACT, workspacePlugin, type WorkspaceViewService} from './workspace';
import {createMarkdownFormatPlugin, createCanvasFormatPlugin, createBasesFormatPlugin} from './formats';
import {ENGINE_VERSION} from './version';
import {UI_CONTRACT, uiPlugin, type UiService} from './ui';

export * from './version';
export * from './storage';
export * from './commands';
export * from './documents';
export * from './render';
export * from './workspace';
export * from './views';
export * from './ui';
export * from './compat';
export * from './formats';
export * from './editor';
export * from './bookmarks';
export * from './templates';
export * from './daily-notes';
export * from './notes-index';
export * from './navigation';
export * from './workspaces';
export * from './unique-note';
export * from './wordcount';
export * from './slides';
export * from './format-converter';
export * from './explorer';
export * from './note-composer';
export * from './web-viewer';
export * from './slash-commands';
export * from './page-preview';
export * from './audio-recorder';
export * from './storage-bridge';
export {ENGINE_VERSION};

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

export interface WorkspaceRuntime {kernel: Kernel; render: RenderService; workspace: WorkspaceViewService}

/**
 * Build and start the render + workspace kernel with the Markdown, Canvas and Bases
 * format plugins. Activation populates the returned render service, and the workspace
 * service is resolved from the same kernel so it reads the render provider it consumes.
 */
export async function createWorkspaceRuntime(options: {engineVersion?: string} = {}): Promise<WorkspaceRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  const render = new FormatRegistry();
  kernel.register(renderPlugin(render));
  kernel.register(workspacePlugin());
  kernel.register(createMarkdownFormatPlugin());
  kernel.register(createCanvasFormatPlugin());
  kernel.register(createBasesFormatPlugin());
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(WORKSPACE_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Workspace service was not provided');
  return {kernel, render, workspace: resolved.binding.value as WorkspaceViewService};
}


export interface UiRuntime {kernel: Kernel; ui: UiService}

/** Build and start a kernel exposing the UI contribution registry. */
export async function createUiRuntime(options: {engineVersion?: string; plugins?: PluginDefinition[]} = {}): Promise<UiRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(uiPlugin());
  for (const plugin of options.plugins ?? []) kernel.register(plugin);
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(UI_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('UI service was not provided');
  return {kernel, ui: resolved.binding.value as UiService};
}
