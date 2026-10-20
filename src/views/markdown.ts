import type {PluginDefinition} from '../kernel';
import {VIEWS_CONTRACT, type ViewsService} from '../services/views';

/** Markdown reading view contribution. */
export const markdownViewPlugin: PluginDefinition = {
  manifest: {id: 'engine.view.markdown', name: 'Markdown view', version: '1.0.0', scopes: ['runtime'], consumes: [{contract: VIEWS_CONTRACT, range: '^1.0.0'}]},
  setup(context) { context.effect(context.service<ViewsService>(VIEWS_CONTRACT).register({viewType: 'markdown', label: 'Markdown', load: () => import('./MarkdownView')})); }
};
