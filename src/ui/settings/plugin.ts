import type {PluginDefinition} from '../../kernel';
import {UI_CONTRACT,type UiService} from '../../services/ui';

/** Registers the built-in Editor settings section as a native UI contribution. */
export const editorSettingsPlugin: PluginDefinition = {
  manifest: {id: 'engine.settings.editor', name: 'Editor settings', version: '1.0.0', scopes: ['runtime'], consumes: [{contract: UI_CONTRACT, range: '^1.0.0'}]},
  setup(context) { context.effect(context.service<UiService>(UI_CONTRACT).register({kind: 'settings', id: 'editor', label: 'Editor', tab: 'editor', load: () => import('./EditorSettings')})); }
};
