/* Native UI-contribution contract (`engine.ui/v1`).
 *
 * Extensions contribute declarative ribbon buttons and status-bar text without importing
 * application React code. The service is UI-free; the host renders the contributions.
 */
import type {PluginDefinition} from '../kernel';

export const UI_CONTRACT = 'engine.ui/v1';
export const UI_VERSION = '1.0.0';

export interface UiContributionBase {
  id: string;
  label: string;
  order?: number;
}

/** A ribbon button; `run` is invoked in-process by the host. */
export interface RibbonContribution extends UiContributionBase {
  kind: 'ribbon';
  icon?: string;
  run: () => void;
}

/** A status-bar text item; re-register to change the text. */
export interface StatusContribution extends UiContributionBase {
  kind: 'status';
  text: string;
}

export type UiContribution = RibbonContribution | StatusContribution;

/** Register UI contributions and subscribe to changes. */
export interface UiService {
  register(contribution: UiContribution): () => void;
  list(kind?: UiContribution['kind']): UiContribution[];
  ribbon(): RibbonContribution[];
  status(): StatusContribution[];
  subscribe(listener: () => void): () => void;
}

/** Ordered UI registry with nearest-predecessor replacement semantics. */
export class UiContributions implements UiService {
  private readonly contributions: UiContribution[] = [];
  private readonly listeners = new Set<() => void>();
  private readonly previous = new WeakMap<UiContribution, UiContribution | undefined>();
  private readonly revoked = new WeakSet<UiContribution>();

  /** Register or replace a contribution; the disposer restores the predecessor. */
  register(contribution: UiContribution): () => void {
    if (!contribution || typeof contribution.id !== 'string' || !contribution.id) throw new Error('Invalid UI contribution id');
    if (typeof contribution.label !== 'string' || !contribution.label.trim()) throw new Error('Invalid UI contribution label');
    if (contribution.order !== undefined && !Number.isFinite(contribution.order)) throw new Error('Invalid UI contribution order');
    if (contribution.kind === 'ribbon') {
      if (typeof contribution.run !== 'function') throw new Error('Ribbon contribution needs a run function');
    } else if (contribution.kind === 'status') {
      if (typeof contribution.text !== 'string') throw new Error('Status contribution needs text');
    } else throw new Error('Invalid UI contribution kind');
    const normalized = {...contribution} as UiContribution;
    const index = this.contributions.findIndex(candidate => candidate.kind === normalized.kind && candidate.id === normalized.id);
    this.previous.set(normalized, index >= 0 ? this.contributions[index] : undefined);
    if (index >= 0) this.contributions[index] = normalized; else this.contributions.push(normalized);
    this.publish();
    return () => {
      this.revoked.add(normalized);
      const current = this.contributions.findIndex(candidate => candidate.kind === normalized.kind && candidate.id === normalized.id);
      if (current < 0 || this.contributions[current] !== normalized) return;
      let replacement = this.previous.get(normalized);
      while (replacement && this.revoked.has(replacement)) replacement = this.previous.get(replacement);
      if (replacement) this.contributions[current] = replacement; else this.contributions.splice(current, 1);
      this.publish();
    };
  }

  /** List contributions ordered by kind order then registration order. */
  list(kind?: UiContribution['kind']): UiContribution[] {
    return this.contributions
      .filter(contribution => kind === undefined || contribution.kind === kind)
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  }

  /** Ribbon contributions in host order. */
  ribbon(): RibbonContribution[] { return this.list('ribbon') as RibbonContribution[]; }

  /** Status contributions in host order. */
  status(): StatusContribution[] { return this.list('status') as StatusContribution[]; }

  /** Observe contribution changes; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** Notify every listener; one failing subscriber must not orphan the registration. */
  private publish() {
    for (const listener of this.listeners) {
      try { listener(); }
      catch (error) { console.error('UI contribution listener failed', error); }
    }
  }
}

/** Wrap a UI registry as a runtime-scoped native plugin. */
export function uiPlugin(service: UiService = new UiContributions()): PluginDefinition {
  return {
    manifest: {id: 'engine.ui', name: 'UI', version: UI_VERSION, scopes: ['runtime'], provides: [{contract: UI_CONTRACT, version: UI_VERSION}]},
    setup(context) { context.provide(UI_CONTRACT, UI_VERSION, service); }
  };
}
