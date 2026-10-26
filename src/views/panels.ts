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

/** Tags panel contribution for the left slot. */
export const tagsPanelPlugin: PluginDefinition = {
  manifest: {id: 'engine.view.tags', name: 'Tags panel', version: '1.0.0', scopes: ['runtime'], consumes: [{contract: VIEWS_CONTRACT, range: '^1.0.0'}]},
  setup(context) { context.effect(context.service<ViewsService>(VIEWS_CONTRACT).register({viewType: 'tags', slot: 'left', label: 'Tags', load: () => import('./TagsPanel')})); }
};

/** Outline panel contribution for the right slot. */
export const outlinePanelPlugin: PluginDefinition = {
  manifest: {id: 'engine.view.outline', name: 'Outline panel', version: '1.0.0', scopes: ['runtime'], consumes: [{contract: VIEWS_CONTRACT, range: '^1.0.0'}]},
  setup(context) { context.effect(context.service<ViewsService>(VIEWS_CONTRACT).register({viewType: 'outline', slot: 'right', label: 'Outline', load: () => import('./OutlinePanel')})); }
};

/** Linked/unlinked mentions panel contribution for the right slot. */
export const backlinksPanelPlugin: PluginDefinition = {
  manifest: {id: 'engine.view.backlinks', name: 'Backlinks panel', version: '1.0.0', scopes: ['runtime'], consumes: [{contract: VIEWS_CONTRACT, range: '^1.0.0'}]},
  setup(context) { context.effect(context.service<ViewsService>(VIEWS_CONTRACT).register({viewType: 'backlinks', slot: 'right', label: 'Backlinks', load: () => import('./BacklinksPanel')})); }
};

/** Outgoing-links panel contribution for the right slot. */
export const outgoingPanelPlugin: PluginDefinition = {
  manifest: {id: 'engine.view.outgoing', name: 'Outgoing panel', version: '1.0.0', scopes: ['runtime'], consumes: [{contract: VIEWS_CONTRACT, range: '^1.0.0'}]},
  setup(context) { context.effect(context.service<ViewsService>(VIEWS_CONTRACT).register({viewType: 'outgoing', slot: 'right', label: 'Outgoing', load: () => import('./OutgoingPanel')})); }
};


/** Note/vault properties panel contribution for the right slot. */
export const propertiesPanelPlugin: PluginDefinition = {
  manifest: {id: 'engine.view.properties', name: 'Properties panel', version: '1.0.0', scopes: ['runtime'], consumes: [{contract: VIEWS_CONTRACT, range: '^1.0.0'}]},
  setup(context) { context.effect(context.service<ViewsService>(VIEWS_CONTRACT).register({viewType: 'properties', slot: 'right', label: 'Properties', load: () => import('./PropertiesPanel')})); }
};


/** Vault file tree contribution for the left slot. */
export const filesPanelPlugin: PluginDefinition = {
  manifest: {id: 'engine.view.files', name: 'Files panel', version: '1.0.0', scopes: ['runtime'], consumes: [{contract: VIEWS_CONTRACT, range: '^1.0.0'}]},
  setup(context) { context.effect(context.service<ViewsService>(VIEWS_CONTRACT).register({viewType: 'files', slot: 'left', label: 'Files', load: () => import('./FilesPanel')})); }
};


/** Full-text search contribution for the left slot. */
export const searchPanelPlugin: PluginDefinition = {
  manifest: {id: 'engine.view.search', name: 'Search panel', version: '1.0.0', scopes: ['runtime'], consumes: [{contract: VIEWS_CONTRACT, range: '^1.0.0'}]},
  setup(context) { context.effect(context.service<ViewsService>(VIEWS_CONTRACT).register({viewType: 'search', slot: 'left', label: 'Search', load: () => import('./SearchPanel')})); }
};


/** Graph contribution for the main slot. */
export const graphViewPlugin: PluginDefinition = {
  manifest: {id: 'engine.view.graph', name: 'Graph view', version: '1.0.0', scopes: ['runtime'], consumes: [{contract: VIEWS_CONTRACT, range: '^1.0.0'}]},
  setup(context) { context.effect(context.service<ViewsService>(VIEWS_CONTRACT).register({viewType: 'graph', slot: 'main', label: 'Graph', load: () => import('./GraphView')})); }
};
