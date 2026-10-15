/* Default format view plugins.
 *
 * Each plugin registers its own extension → view type mapping and its view slot through
 * the render and workspace contracts. No plugin imports the corresponding user-interface
 * component; that mapping stays in the application shell.
 */
import type {PluginDefinition} from '../kernel';
import {RENDER_CONTRACT, type FormatRegistration, type RenderService} from './render';
import {WORKSPACE_CONTRACT, type ViewRegistration, type WorkspaceViewService} from './workspace';

export interface FormatPluginOptions {id: string; name: string; formats: FormatRegistration[]; view: ViewRegistration}

/** Build a plugin that registers the supplied formats and one view slot. */
export function formatPlugin(options: FormatPluginOptions): PluginDefinition {
  return {
    manifest: {
      id: options.id, name: options.name, version: '1.0.0', scopes: ['runtime'],
      consumes: [{contract: RENDER_CONTRACT, range: '^1.0.0'}, {contract: WORKSPACE_CONTRACT, range: '^1.0.0'}]
    },
    setup(context) {
      const render = context.service<RenderService>(RENDER_CONTRACT);
      const workspace = context.service<WorkspaceViewService>(WORKSPACE_CONTRACT);
      for (const format of options.formats) context.effect(render.registerFormat(format));
      context.effect(workspace.registerView(options.view));
    }
  };
}

/** Markdown format view plugin. */
export const createMarkdownFormatPlugin = (): PluginDefinition => formatPlugin({
  id: 'engine.format.markdown', name: 'Markdown format',
  formats: [{extension: 'md', viewType: 'markdown', label: 'Markdown'}, {extension: 'markdown', viewType: 'markdown', label: 'Markdown'}],
  view: {viewType: 'markdown', slot: 'main', order: 0, label: 'Markdown'}
});

/** Canvas format view plugin. */
export const createCanvasFormatPlugin = (): PluginDefinition => formatPlugin({
  id: 'engine.format.canvas', name: 'Canvas format',
  formats: [{extension: 'canvas', viewType: 'canvas', label: 'Canvas'}],
  view: {viewType: 'canvas', slot: 'main', order: 10, label: 'Canvas'}
});

/** Bases format view plugin. */
export const createBasesFormatPlugin = (): PluginDefinition => formatPlugin({
  id: 'engine.format.bases', name: 'Bases format',
  formats: [{extension: 'base', viewType: 'base', label: 'Base'}],
  view: {viewType: 'base', slot: 'main', order: 20, label: 'Base'}
});
