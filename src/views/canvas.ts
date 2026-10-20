import type {PluginDefinition} from '../kernel';
import {VIEWS_CONTRACT, type ViewsService} from '../services/views';

/** Canvas view contribution. */
export const canvasViewPlugin: PluginDefinition = {
  manifest: {id: 'engine.view.canvas', name: 'Canvas view', version: '1.0.0', scopes: ['runtime'], consumes: [{contract: VIEWS_CONTRACT, range: '^1.0.0'}]},
  setup(context) { context.effect(context.service<ViewsService>(VIEWS_CONTRACT).register({viewType: 'canvas', label: 'Canvas', load: () => import('./CanvasView')})); }
};
