/* Per-scope service bindings for the native plugin kernel.
 * Consumers depend on a versioned contract, never on a concrete provider import. */
import {satisfiesVersion} from './semver';

export interface ServiceBinding {contract: string; version: string; provider: string; scope: string; value: unknown}

export type ProvideOutcome = {ok: true} | {ok: false; conflict: ServiceBinding};
export type ResolveOutcome =
  | {ok: true; binding: ServiceBinding}
  | {ok: false; reason: 'missing'}
  | {ok: false; reason: 'mismatch'; binding: ServiceBinding};

/** Track the single provider for each contract name inside one scope. */
export class ServiceRegistry {
  private readonly bindings = new Map<string, ServiceBinding>();

  /** Register a provider. A duplicate contract in the same scope is a diagnostic, not an overwrite. */
  provide(binding: ServiceBinding): ProvideOutcome {
    const existing = this.bindings.get(binding.contract);
    if (existing) return {ok: false, conflict: existing};
    this.bindings.set(binding.contract, binding);
    return {ok: true};
  }

  /** Resolve a contract, checking the binding version against the consumer range. */
  resolve(contract: string, range = '*'): ResolveOutcome {
    const binding = this.bindings.get(contract);
    if (!binding) return {ok: false, reason: 'missing'};
    if (!satisfiesVersion(binding.version, range)) return {ok: false, reason: 'mismatch', binding};
    return {ok: true, binding};
  }

  /** Report whether a contract has any binding, regardless of version. */
  has(contract: string): boolean { return this.bindings.has(contract); }

  /** Remove and return every binding contributed by one provider plugin. */
  removeProvider(provider: string): ServiceBinding[] {
    const removed: ServiceBinding[] = [];
    for (const [contract, binding] of [...this.bindings]) {
      if (binding.provider === provider) { this.bindings.delete(contract); removed.push(binding); }
    }
    return removed;
  }

  /** Snapshot the current bindings for diagnostics. */
  list(): ServiceBinding[] { return [...this.bindings.values()]; }

  /** Drop all bindings, used when a scope is torn down. */
  clear(): void { this.bindings.clear(); }
}
