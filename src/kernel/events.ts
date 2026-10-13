/* Declared event contracts for the native plugin kernel.
 * Every event states how it is delivered so callers never guess return type or timing. */
import type {EffectScope} from './effects';

export type EventStrategy = 'sync-broadcast' | 'async-concurrent' | 'async-serial' | 'abortable';

export interface EventDeclaration {strategy: EventStrategy; description?: string}
export interface EmitOptions {signal?: AbortSignal}
export type EventListener = (payload: unknown, context: {signal?: AbortSignal}) => unknown;

export interface EventRef {
  readonly name: string;
  readonly listener: EventListener;
  readonly owner?: EffectScope;
  dispose(): void;
}

/** A bus whose delivery strategy is fixed by each declaration, not by each caller. */
export class EventBus {
  private readonly declarations = new Map<string, EventDeclaration>();
  private readonly listeners = new Map<string, Set<EventRef>>();

  /** Fix the delivery strategy for an event name; redeclaring with a different strategy is rejected. */
  declare(name: string, strategy: EventStrategy, description?: string): void {
    const existing = this.declarations.get(name);
    if (existing && existing.strategy !== strategy) throw new Error(`Event ${name} already declared as ${existing.strategy}`);
    this.declarations.set(name, {strategy, description});
  }

  /** Look up the declared strategy for an event name. */
  strategy(name: string): EventStrategy | undefined { return this.declarations.get(name)?.strategy; }

  /** Subscribe to an event. When an owner scope is given, disposal removes the listener. */
  on(name: string, listener: EventListener, owner?: EffectScope): EventRef {
    if (!this.declarations.has(name)) throw new Error(`Event ${name} is not declared`);
    const ref: EventRef = {
      name, listener, owner,
      dispose: () => {
        const set = this.listeners.get(name);
        if (!set) return;
        set.delete(ref);
        if (set.size === 0) this.listeners.delete(name);
      }
    };
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name)!.add(ref);
    owner?.add(() => ref.dispose());
    return ref;
  }

  /** Remove a listener reference directly. */
  off(ref: EventRef): void { ref.dispose(); }

  /** Count currently registered listeners, primarily for diagnostics and tests. */
  listenerCount(name: string): number { return this.listeners.get(name)?.size ?? 0; }

  /**
   * Emit an event using its declared strategy. Synchronous broadcast returns void;
   * asynchronous strategies return a promise and are safe to await.
   */
  emit(name: string, payload?: unknown, options: EmitOptions = {}): void | Promise<void> {
    const declaration = this.declarations.get(name);
    if (!declaration) throw new Error(`Event ${name} is not declared`);
    const listeners = [...(this.listeners.get(name) ?? [])];
    if (declaration.strategy === 'sync-broadcast') {
      const errors: unknown[] = [];
      for (const ref of listeners) {
        try { ref.listener(payload, options); } catch (error) { errors.push(error); }
      }
      if (errors.length) throw aggregate(name, errors);
      return;
    }
    const signal = options.signal;
    if (declaration.strategy === 'async-concurrent') {
      return Promise.allSettled(listeners.map(ref => Promise.resolve().then(() => ref.listener(payload, options)))).then(results => {
        const errors = results.filter(result => result.status === 'rejected').map(result => (result as PromiseRejectedResult).reason);
        if (errors.length) throw aggregate(name, errors);
      });
    }
    if (declaration.strategy === 'async-serial') {
      return (async () => {
        for (const ref of listeners) await ref.listener(payload, options);
      })();
    }
    return (async () => {
      for (const ref of listeners) {
        if (signal?.aborted) return;
        await ref.listener(payload, options);
      }
    })();
  }

  /** Remove every listener reference, leaving owner-scope disposal to the caller. */
  clear(): void { this.listeners.clear(); }
}

/** Combine listener failures into one error without discarding the originals. */
function aggregate(name: string, errors: unknown[]): AggregateError {
  return new AggregateError(errors, `Event ${name} had ${errors.length} failing listener(s)`);
}
