import type {ComponentType} from 'react';
import TableBasesView from './TableBasesView';
import CardsBasesView from './CardsBasesView';
import ListBasesView from './ListBasesView';
import type {BasesViewProps} from './types';

export type BasesViewComponent = ComponentType<BasesViewProps>;

/** UI registry for built-in Bases renderers; plugin Bases views use the renderer host. */
export class BasesViewRegistry {
  private readonly views = new Map<string, BasesViewComponent>();

  register(id: string, component: BasesViewComponent): () => void {
    if (typeof id !== 'string' || !id || typeof component !== 'function') throw new Error('Invalid Bases view');
    if (this.views.has(id)) throw new Error('Bases view already registered: '+id);
    this.views.set(id, component);
    return () => { if (this.views.get(id) === component) this.views.delete(id); };
  }

  resolve(id: string): BasesViewComponent | undefined { return this.views.get(id); }

  list(): string[] { return [...this.views.keys()]; }
}

/** Built-in Bases view registry. */
export const builtinBasesViews = new BasesViewRegistry();
builtinBasesViews.register('table', TableBasesView);
builtinBasesViews.register('cards', CardsBasesView);
builtinBasesViews.register('list', ListBasesView);

export {displayValue} from './types';
