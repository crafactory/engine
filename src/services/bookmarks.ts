/* Native bookmarks service contract (`engine.bookmarks/v1`).
 *
 * A first core-feature migration: bookmark state and operations live in a native plugin
 * that the application consumes, instead of application-local state. Persistence is still
 * the application's responsibility until the storage providers are wired into the UI.
 */
import {Kernel, type PluginDefinition} from '../kernel';
import {ENGINE_VERSION} from './version';

export const BOOKMARKS_CONTRACT = 'engine.bookmarks/v1';
export const BOOKMARKS_VERSION = '1.0.0';

/** Ordered set of bookmarked note paths with change notifications. */
export interface BookmarksService {
  list(): string[];
  has(path: string): boolean;
  add(path: string): void;
  remove(path: string): void;
  toggle(path: string): boolean;
  replace(paths: readonly string[]): void;
  subscribe(listener: (paths: string[]) => void): () => void;
}

/** Original in-memory bookmarks implementation with deterministic ordering. */
export class Bookmarks implements BookmarksService {
  private paths: string[];
  private readonly listeners = new Set<(paths: string[]) => void>();

  /** @param initial Seed paths; duplicates and non-strings are discarded. */
  constructor(initial: readonly string[] = []) { this.paths = sanitize(initial); }

  /** Bookmarked paths in insertion order. */
  list(): string[] { return [...this.paths]; }

  /** Whether a path is bookmarked. */
  has(path: string): boolean { return this.paths.includes(path); }

  /** Add a path; duplicates and empty values are ignored. */
  add(path: string): void {
    if (typeof path !== 'string' || !path || this.paths.includes(path)) return;
    this.paths.push(path);
    this.emit();
  }

  /** Remove a path if present. */
  remove(path: string): void {
    const next = this.paths.filter(candidate => candidate !== path);
    if (next.length === this.paths.length) return;
    this.paths = next;
    this.emit();
  }

  /** Toggle a path and report the resulting state; an empty path is rejected. */
  toggle(path: string): boolean {
    if (typeof path !== 'string' || !path) return false;
    if (this.has(path)) { this.remove(path); return false; }
    this.add(path);
    return true;
  }

  /** Replace the whole set (used when loading persisted state or remapping paths). */
  replace(paths: readonly string[]): void {
    this.paths = sanitize(paths);
    this.emit();
  }

  /** Observe changes; the returned disposer stops the subscription. */
  subscribe(listener: (paths: string[]) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** Notify every listener with its own immutable snapshot. */
  private emit(): void {
    for (const listener of [...this.listeners]) listener(this.list());
  }
}

/** Deduplicate and validate a path list. */
function sanitize(paths: readonly string[]): string[] {
  return [...new Set((Array.isArray(paths) ? paths : []).filter(path => typeof path === 'string' && path))];
}

/** Wrap a bookmarks service as a runtime-scoped native plugin that provides the contract. */
export function bookmarksPlugin(service: BookmarksService): PluginDefinition {
  return {
    manifest: {id: 'engine.bookmarks', name: 'Bookmarks', version: BOOKMARKS_VERSION, scopes: ['runtime'], provides: [{contract: BOOKMARKS_CONTRACT, version: BOOKMARKS_VERSION}]},
    setup(context) { context.provide(BOOKMARKS_CONTRACT, BOOKMARKS_VERSION, service); }
  };
}

export interface BookmarksRuntime {kernel: Kernel; service: BookmarksService}

/** Build and start a kernel exposing the bookmarks service. */
export async function createBookmarksRuntime(options: {engineVersion?: string; initial?: readonly string[]} = {}): Promise<BookmarksRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(bookmarksPlugin(new Bookmarks(options.initial)));
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(BOOKMARKS_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Bookmarks service was not provided');
  return {kernel, service: resolved.binding.value as BookmarksService};
}
