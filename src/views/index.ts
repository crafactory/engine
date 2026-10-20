/* Application-side assembly of the native view-contribution providers.
 *
 * The kernel and services never import React. The view plugins below contribute lazy
 * loaders; the application host interprets them as React components.
 */
import {Kernel} from '../kernel';
import {ENGINE_VERSION} from '../services/version';
import {VIEWS_CONTRACT, viewsPlugin, type ViewsService} from '../services/views';
import {markdownViewPlugin} from './markdown';
import {canvasViewPlugin} from './canvas';
import {basesViewPlugin} from './bases';
import {bookmarksPanelPlugin, recentPanelPlugin, tagsPanelPlugin, outlinePanelPlugin} from './panels';

export interface ViewsRuntime {kernel: Kernel; views: ViewsService}

/** Build and start a kernel exposing the view registry with the built-in view plugins. */
export async function createViewsRuntime(options: {engineVersion?: string} = {}): Promise<ViewsRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(viewsPlugin());
  kernel.register(markdownViewPlugin);
  kernel.register(canvasViewPlugin);
  kernel.register(basesViewPlugin);
  kernel.register(bookmarksPanelPlugin);
  kernel.register(recentPanelPlugin);
  kernel.register(tagsPanelPlugin);
  kernel.register(outlinePanelPlugin);
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(VIEWS_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Views service was not provided');
  return {kernel, views: resolved.binding.value as ViewsService};
}

export * from './contract';
export {ViewBoundary} from './ViewBoundary';
