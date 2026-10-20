import type {PluginDefinition} from '../kernel';
import {VIEWS_CONTRACT, type ViewsService} from '../services/views';

/** Bookmarks panel contribution for the left slot. */
export const bookmarksPanelPlugin: PluginDefinition = {
  manifest: {id: 'engine.view.bookmarks', name: 'Bookmarks panel', version: '1.0.0', scopes: ['runtime'], consumes: [{contract: VIEWS_CONTRACT, range: '^1.0.0'}]},
  setup(context) { context.effect(context.service<ViewsService>(VIEWS_CONTRACT).register({viewType: 'bookmarks', slot: 'left', label: 'Bookmarks', load: () => import('./BookmarksPanel')})); }
};

/** Recent-notes panel contribution for the left slot. */
export const recentPanelPlugin: PluginDefinition = {
  manifest: {id: 'engine.view.recent', name: 'Recent panel', version: '1.0.0', scopes: ['runtime'], consumes: [{contract: VIEWS_CONTRACT, range: '^1.0.0'}]},
  setup(context) { context.effect(context.service<ViewsService>(VIEWS_CONTRACT).register({viewType: 'recent', slot: 'left', label: 'Recent', load: () => import('./BookmarksPanel')})); }
};
