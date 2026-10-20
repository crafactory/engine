/* Native view-contribution service contract (`engine.views/v1`).
 *
 * A view provider registers a view type with a lazy component loader. The service stores
 * the loader as an opaque value: it never imports React or a concrete view implementation,
 * so the kernel and services stay UI-free. The application host is the only place that
 * interprets the loader as a React component.
 */
import type {PluginDefinition} from '../kernel';

export const VIEWS_CONTRACT = 'engine.views/v1';
export const VIEWS_VERSION = '1.0.0';

export interface ViewContribution {
  viewType: string;
  load: () => Promise<unknown>;
  label?: string;
}

/** Register view types and resolve their lazy component loaders. */
export interface ViewsService {
  register(contribution: ViewContribution): () => void;
  resolve(viewType: string): ViewContribution | undefined;
  list(): ViewContribution[];
}

/** Ordered loader registry keyed by view type. */
export class ViewContributions implements ViewsService {
  private readonly contributions: ViewContribution[] = [];
  private readonly previous = new WeakMap<ViewContribution, ViewContribution | undefined>();
  private readonly revoked = new WeakSet<ViewContribution>();

  /** Register or replace a view type; the returned disposer restores the predecessor. */
  register(contribution: ViewContribution): () => void {
    if (!contribution || typeof contribution.viewType !== 'string' || !contribution.viewType || typeof contribution.load !== 'function') throw new Error('Invalid view contribution');
    const normalized: ViewContribution = {...contribution};
    const index = this.contributions.findIndex(candidate => candidate.viewType === normalized.viewType);
    this.previous.set(normalized, index >= 0 ? this.contributions[index] : undefined);
    if (index >= 0) this.contributions[index] = normalized; else this.contributions.push(normalized);
    return () => {
      this.revoked.add(normalized);
      const current = this.contributions.findIndex(candidate => candidate.viewType === normalized.viewType);
      if (current < 0 || this.contributions[current] !== normalized) return;
      let replacement = this.previous.get(normalized);
      while (replacement && this.revoked.has(replacement)) replacement = this.previous.get(replacement);
      if (replacement) this.contributions[current] = replacement; else this.contributions.splice(current, 1);
    };
  }

  /** Resolve one view type to its loader. */
  resolve(viewType: string): ViewContribution | undefined {
    return this.contributions.find(contribution => contribution.viewType === viewType);
  }

  /** List registered view types in registration order. */
  list(): ViewContribution[] { return [...this.contributions]; }
}

/** Wrap a view registry as a runtime-scoped native plugin. */
export function viewsPlugin(service: ViewsService = new ViewContributions()): PluginDefinition {
  return {
    manifest: {id: 'engine.views', name: 'Views', version: VIEWS_VERSION, scopes: ['runtime'], provides: [{contract: VIEWS_CONTRACT, version: VIEWS_VERSION}]},
    setup(context) { context.provide(VIEWS_CONTRACT, VIEWS_VERSION, service); }
  };
}
