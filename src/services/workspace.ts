/* Native workspace view-slot service contract (`engine.workspace/v1`).
 *
 * A view registers a view type in a slot and resolves file paths through the format
 * registry. The kernel and this service never import a concrete view implementation.
 */
import type {PluginDefinition} from '../kernel';
import {RENDER_CONTRACT, type RenderService} from './render';

export const WORKSPACE_CONTRACT = 'engine.workspace/v1';
export const WORKSPACE_VERSION = '1.0.0';

export type ViewSlot = 'main' | 'left' | 'right' | 'auxiliary';

export interface ViewRegistration {viewType: string; slot: ViewSlot; order?: number; label?: string}

/** Register view types in workspace slots and resolve a path to its view. */
export interface WorkspaceViewService {
  registerView(view: ViewRegistration): () => void;
  list(): ViewRegistration[];
  viewsForSlot(slot: ViewSlot): ViewRegistration[];
  resolveView(path: string): ViewRegistration | undefined;
}

const SLOTS: readonly ViewSlot[] = ['main', 'left', 'right', 'auxiliary'];

/** Ordered view registry backed by a render/format service. */
export class WorkspaceViews implements WorkspaceViewService {
  private readonly views: ViewRegistration[] = [];
  private readonly previous = new WeakMap<ViewRegistration, ViewRegistration | undefined>();
  private readonly revoked = new WeakSet<ViewRegistration>();

  /** @param render Format service used to resolve extensions to view types. */
  constructor(private readonly render: RenderService) {}

  /** Register or replace a view; the returned disposer restores the nearest active predecessor. */
  registerView(view: ViewRegistration): () => void {
    if (!view || typeof view.viewType !== 'string' || !view.viewType || !SLOTS.includes(view.slot)) throw new Error('Invalid view registration');
    const normalized: ViewRegistration = {...view};
    const index = this.views.findIndex(candidate => candidate.viewType === normalized.viewType);
    this.previous.set(normalized, index >= 0 ? this.views[index] : undefined);
    if (index >= 0) this.views[index] = normalized; else this.views.push(normalized);
    return () => {
      this.revoked.add(normalized);
      const current = this.views.findIndex(candidate => candidate.viewType === normalized.viewType);
      if (current < 0 || this.views[current] !== normalized) return;
      let replacement = this.previous.get(normalized);
      while (replacement && this.revoked.has(replacement)) replacement = this.previous.get(replacement);
      if (replacement) this.views[current] = replacement; else this.views.splice(current, 1);
    };
  }

  /** List views ordered by slot order then registration order. */
  list(): ViewRegistration[] {
    return [...this.views].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /** List the views assigned to one slot, ordered by ascending order. */
  viewsForSlot(slot: ViewSlot): ViewRegistration[] { return this.list().filter(view => view.slot === slot); }

  /** Resolve a path to the view registered for its format, or undefined. */
  resolveView(path: string): ViewRegistration | undefined {
    const format = this.render.resolve(path);
    if (!format) return undefined;
    return this.views.find(view => view.viewType === format.viewType);
  }
}

/**
 * Wrap a workspace view service as a provider that consumes the render contract.
 * The service is built from the render provider resolved at activation time, so the
 * workspace always reads the same registry the format plugins register into.
 */
export function workspacePlugin(factory: (render: RenderService) => WorkspaceViewService = render => new WorkspaceViews(render)): PluginDefinition {
  return {
    manifest: {
      id: 'engine.workspace', name: 'Workspace', version: WORKSPACE_VERSION, scopes: ['runtime'],
      provides: [{contract: WORKSPACE_CONTRACT, version: WORKSPACE_VERSION}],
      consumes: [{contract: RENDER_CONTRACT, range: '^1.0.0'}]
    },
    setup(context) {
      const render = context.service<RenderService>(RENDER_CONTRACT);
      context.provide(WORKSPACE_CONTRACT, WORKSPACE_VERSION, factory(render));
    }
  };
}
