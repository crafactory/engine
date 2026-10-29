import type {PluginDefinition} from '../../kernel';
import {UI_CONTRACT,type UiService} from '../../services/ui';

/** Registers the built-in Mermaid live block preview through engine.ui/v1. */
export const mermaidBlockPlugin: PluginDefinition = {
  manifest: {id: 'engine.blocks.mermaid', name: 'Mermaid block preview', version: '1.0.0', scopes: ['runtime'], consumes: [{contract: UI_CONTRACT, range: '^1.0.0'}]},
  setup(context) { context.effect(context.service<UiService>(UI_CONTRACT).register({kind: 'block', id: 'mermaid', label: 'Mermaid', language: 'mermaid', load: () => import('./MermaidBlockPreview')})); }
};
