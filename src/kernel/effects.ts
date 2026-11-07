/* Effect ownership for the native plugin kernel. Every registration belongs to a scope. */

export interface Disposable {readonly disposed: boolean; dispose(): void}

interface CleanupEntry {run: () => unknown; disposed: boolean}

/** Collect cleanup callbacks and revoke them in reverse registration order exactly once. */
export class EffectScope {
  private generation = 0;
  private active = true;
  private entries: CleanupEntry[] = [];

  /**
   * @param onLate Called when a registration arrives after disposal; the callback
   * is still run immediately so late asynchronous continuations cannot retain resources.
   */
  constructor(private readonly onLate: (count: number) => void = () => {}) {}

  /** Whether registrations are still admitted; false once dispose has started. */
  get isActive(): boolean { return this.active; }

  /** Count the current live cleanup entries, primarily for diagnostics and tests. */
  get size(): number { return this.entries.length; }

  /** The current admission generation, incremented on every dispose. */
  get currentGeneration(): number { return this.generation; }

  /**
   * Own a cleanup callback. After disposal the callback runs immediately and a
   * late-registration signal is reported to the owner instead of being retained.
   */
  add(cleanup: () => unknown): Disposable {
    if (!this.active) {
      this.onLate(1);
      runCleanup(cleanup);
      return {disposed: true, dispose() { /* already disposed */ }};
    }
    const entry: CleanupEntry = {run: cleanup, disposed: false};
    this.entries.push(entry);
    return {
      get disposed() { return entry.disposed; },
      dispose: () => {
        if (entry.disposed) return;
        entry.disposed = true;
        this.remove(entry);
        runCleanup(entry.run);
      }
    };
  }

  /**
   * Revoke admission, then run every remaining cleanup in reverse order and await
   * all results together. Returns the number of cleanups that threw.
   */
  async dispose(): Promise<number> {
    if (!this.active && this.entries.length === 0) return 0;
    this.active = false;
    this.generation++;
    const entries = this.entries.splice(0).reverse();
    const results = await Promise.allSettled(entries.map(entry => {
      entry.disposed = true;
      try { return Promise.resolve(entry.run()); } catch (error) { return Promise.reject(error); }
    }));
    return results.filter(result => result.status === 'rejected').length;
  }

  /** Remove one entry from the pending list, if still present. */
  private remove(entry: CleanupEntry): void {
    const index = this.entries.lastIndexOf(entry);
    if (index >= 0) this.entries.splice(index, 1);
  }
}

/** Invoke a cleanup callback once, converting synchronous throws into ignored rejections. */
function runCleanup(cleanup: () => unknown): void {
  try { void Promise.resolve(cleanup()).catch(() => {}); } catch { /* individual disposal does not observe failures */ }
}
