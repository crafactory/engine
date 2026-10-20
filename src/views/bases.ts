import type {PluginDefinition} from '../kernel';
import {VIEWS_CONTRACT, type ViewsService} from '../services/views';

/** Bases view contribution. */
export const basesViewPlugin: PluginDefinition = {
  manifest: {id: 'engine.view.bases', name: 'Bases view', version: '1.0.0', scopes: ['runtime'], consumes: [{contract: VIEWS_CONTRACT, range: '^1.0.0'}]},
  setup(context) { context.effect(context.service<ViewsService>(VIEWS_CONTRACT).register({viewType: 'base', label: 'Bases', load: () => import('./BasesView')})); }
};
