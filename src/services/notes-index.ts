/* Native notes-index service contract (`engine.index/v1`).
 *
 * A derived metadata and search index over Markdown notes: title, aliases, tags, headings,
 * links, properties, backlinks, link resolution and full-text search. Search, graph and
 * properties features are expected to consume this contract instead of recomputing
 * per-note metadata. The index is built from note content supplied by the caller, so it
 * depends on no editor or UI module.
 */
import {Kernel, type PluginDefinition} from '../kernel';
import type {Note} from '../types';
import {frontmatter, headings, links, resolveLink, search, tags, title} from '../knowledge';
import {ENGINE_VERSION} from './version';

export const INDEX_CONTRACT = 'engine.index/v1';
export const INDEX_VERSION = '1.0.0';

export interface IndexedLink {target: string; label: string; embed: boolean; fragment: string}
export interface IndexedHeading {level: number; text: string; offset: number}
export interface IndexedNote {
  path: string; title: string; aliases: string[]; tags: string[];
  headings: IndexedHeading[]; links: IndexedLink[]; properties: Record<string, unknown>; body: string;
}
export interface Backlink {path: string; context: string}
export interface TagCount {tag: string; count: number}

/** Derived note metadata, relationships and search over a mutable note set. */
export interface IndexService {
  rebuild(notes: readonly Note[]): void;
  update(path: string, content: string): void;
  remove(path: string): void;
  size(): number;
  paths(): string[];
  note(path: string): IndexedNote | undefined;
  outgoing(path: string): IndexedLink[];
  backlinks(path: string): Backlink[];
  tags(): TagCount[];
  headings(path: string): IndexedHeading[];
  properties(path: string): Record<string, unknown>;
  resolve(linktext: string, from: string): string | undefined;
  search(query: string, options?: {caseSensitive?: boolean}): string[];
}

/** Read a frontmatter value that may be a string or an array of strings. */
function aliasesOf(properties: Record<string, unknown>): string[] {
  const value = properties.aliases ?? properties.alias;
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string');
  return [];
}

/** Original in-memory index with per-note derived-metadata caching. */
export class NotesIndex implements IndexService {
  private notes: Note[] = [];
  private readonly cache = new Map<string, IndexedNote>();

  /** Replace the whole note set and clear cached derivations. */
  rebuild(notes: readonly Note[]): void {
    this.notes = (Array.isArray(notes) ? notes : []).filter(note => note && typeof note.path === 'string').map(note => ({path: note.path, content: note.content ?? ''}));
    this.cache.clear();
  }

  /** Insert or replace one note and invalidate its cached derivation. */
  update(path: string, content: string): void {
    this.notes = this.notes.filter(note => note.path !== path);
    this.notes.push({path, content});
    this.cache.delete(path);
  }

  /** Remove a note from the index. */
  remove(path: string): void {
    this.notes = this.notes.filter(note => note.path !== path);
    this.cache.delete(path);
  }

  /** Number of indexed notes. */
  size(): number { return this.notes.length; }

  /** Indexed paths in insertion order. */
  paths(): string[] { return this.notes.map(note => note.path); }

  /** Derived metadata for a note, computed once per content revision. */
  note(path: string): IndexedNote | undefined {
    const cached = this.cache.get(path);
    if (cached) return cached;
    const source = this.notes.find(note => note.path === path);
    if (!source) return undefined;
    const parsed = frontmatter(source.content);
    const entry: IndexedNote = {
      path, title: title(path), aliases: aliasesOf(parsed.properties), tags: tags(source.content),
      headings: headings(source.content), links: links(source.content), properties: parsed.properties, body: parsed.body
    };
    this.cache.set(path, entry);
    return entry;
  }

  /** Outgoing links of a note. */
  outgoing(path: string): IndexedLink[] { return this.note(path)?.links ?? []; }

  /** Headings of a note. */
  headings(path: string): IndexedHeading[] { return this.note(path)?.headings ?? []; }

  /** Frontmatter properties of a note. */
  properties(path: string): Record<string, unknown> { return this.note(path)?.properties ?? {}; }

  /** Notes whose links resolve to the given path, once per source, with the link label. */
  backlinks(path: string): Backlink[] {
    const result: Backlink[] = [], seen = new Set<string>();
    for (const source of this.notes) {
      if (source.path === path || seen.has(source.path)) continue;
      for (const link of links(source.content)) {
        if (resolveLink(link.target, source.path, this.notes)?.path !== path) continue;
        seen.add(source.path);
        result.push({path: source.path, context: link.label || link.target});
        break;
      }
    }
    return result;
  }

  /** Tag counts across the index, most frequent first. */
  tags(): TagCount[] {
    const counts = new Map<string, number>();
    for (const source of this.notes) for (const tag of tags(source.content)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return [...counts].map(([tag, count]) => ({tag, count})).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  /** Resolve a link target from a source path to an indexed path. */
  resolve(linktext: string, from: string): string | undefined { return resolveLink(linktext, from, this.notes)?.path; }

  /** Full-text search returning matching paths. */
  search(query: string, options: {caseSensitive?: boolean} = {}): string[] {
    return search(this.notes, query, options.caseSensitive ?? false).map(note => note.path);
  }
}

/** Wrap an index service as a runtime-scoped native plugin that provides the contract. */
export function indexPlugin(service: IndexService): PluginDefinition {
  return {
    manifest: {id: 'engine.index', name: 'Index', version: INDEX_VERSION, scopes: ['runtime'], provides: [{contract: INDEX_CONTRACT, version: INDEX_VERSION}]},
    setup(context) { context.provide(INDEX_CONTRACT, INDEX_VERSION, service); }
  };
}

export interface IndexRuntime {kernel: Kernel; index: IndexService}

/** Build and start a kernel exposing the index service. */
export async function createIndexRuntime(options: {engineVersion?: string} = {}): Promise<IndexRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(indexPlugin(new NotesIndex()));
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(INDEX_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Index service was not provided');
  return {kernel, index: resolved.binding.value as IndexService};
}
