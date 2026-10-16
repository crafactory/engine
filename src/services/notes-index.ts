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
import {frontmatter, headings, links, search, tags, title} from '../knowledge';
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
  tags(paths?: readonly string[]): TagCount[];
  headings(path: string): IndexedHeading[];
  properties(path: string): Record<string, unknown>;
  propertyKeys(): string[];
  resolve(linktext: string, from: string): string | undefined;
  search(query: string, options?: {caseSensitive?: boolean}): string[];
}

/** Read a frontmatter value that may be a string or an array of strings (singular or plural). */
function aliasesOf(properties: Record<string, unknown>): string[] {
  const value = properties.aliases ?? properties.alias;
  if (typeof value === 'string') return value ? [value] : [];
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string');
  return [];
}

/** Original in-memory index with per-note derivation caching and path/title/alias lookups. */
export class NotesIndex implements IndexService {
  private notes: Note[] = [];
  private readonly cache = new Map<string, IndexedNote>();
  private readonly byPath = new Map<string, string>();

  /** Replace the whole note set (one entry per path, last wins) and rebuild lookups. */
  rebuild(notes: readonly Note[]): void {
    const unique = new Map<string, Note>();
    for (const note of Array.isArray(notes) ? notes : []) {
      if (!note || typeof note.path !== 'string') continue;
      unique.set(note.path, {path: note.path, content: note.content ?? ''});
    }
    this.notes = [...unique.values()];
    this.cache.clear();
    this.reindexLookups();
  }

  /** Insert or replace one note and invalidate its cached derivation. */
  update(path: string, content: string): void {
    this.notes = this.notes.filter(note => note.path !== path);
    this.notes.push({path, content});
    this.cache.delete(path);
    this.reindexLookups();
  }

  /** Remove a note from the index. */
  remove(path: string): void {
    this.notes = this.notes.filter(note => note.path !== path);
    this.cache.delete(path);
    this.reindexLookups();
  }

  /** Number of indexed notes. */
  size(): number { return this.notes.length; }

  /** Indexed paths in insertion order. */
  paths(): string[] { return this.notes.map(note => note.path); }

  /** Derived metadata for a note as an isolated snapshot. */
  note(path: string): IndexedNote | undefined {
    const entry = this.derive(path);
    return entry ? structuredClone(entry) : undefined;
  }

  /** Outgoing links of a note. */
  outgoing(path: string): IndexedLink[] { return (this.derive(path)?.links ?? []).map(link => ({...link})); }

  /** Headings of a note. */
  headings(path: string): IndexedHeading[] { return (this.derive(path)?.headings ?? []).map(heading => ({...heading})); }

  /** Frontmatter properties of a note as an isolated snapshot. */
  properties(path: string): Record<string, unknown> { return structuredClone(this.derive(path)?.properties ?? {}); }

  /** Unique frontmatter property keys across the index, in first-seen order. */
  propertyKeys(): string[] {
    const keys = new Set<string>();
    for (const note of this.notes) for (const key of Object.keys(this.derive(note.path)!.properties)) keys.add(key);
    return [...keys];
  }

  /** Notes whose links resolve to the given path, once per source, with the link label. */
  backlinks(path: string): Backlink[] {
    const result: Backlink[] = [], seen = new Set<string>();
    for (const source of this.notes) {
      if (source.path === path || seen.has(source.path)) continue;
      for (const link of this.derive(source.path)!.links) {
        if (this.resolve(link.target, source.path) !== path) continue;
        seen.add(source.path);
        result.push({path: source.path, context: link.label || link.target});
        break;
      }
    }
    return result;
  }

  /** Tag counts, optionally limited to a set of paths, most frequent first. */
  tags(paths?: readonly string[]): TagCount[] {
    const allowed = paths ? new Set(paths) : undefined;
    const counts = new Map<string, number>();
    for (const source of this.notes) {
      if (allowed && !allowed.has(source.path)) continue;
      for (const tag of tags(source.content)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts].map(([tag, count]) => ({tag, count})).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  /** Resolve a link target from a source path by path, sibling, title or alias. */
  resolve(linktext: string, from: string): string | undefined {
    if (!linktext) return this.notes.find(note => note.path === from)?.path;
    const normalized = linktext.replace(/^\.\//, '');
    const parent = from.includes('/') ? from.slice(0, from.lastIndexOf('/') + 1) : '';
    for (const candidate of [normalized, normalized + '.md', parent + normalized, parent + normalized + '.md']) {
      const hit = this.byPath.get(candidate.toLowerCase());
      if (hit) return hit;
    }
    // First note (in index order) whose title or alias matches, preserving the original
    // resolver order; a string alias keeps its substring match.
    const normalizedTitle = title(normalized).toLowerCase();
    const found = this.notes.find(note => {
      const entry = this.derive(note.path)!;
      if (entry.title.toLowerCase() === normalizedTitle) return true;
      const value = entry.properties.aliases ?? entry.properties.alias;
      if (Array.isArray(value)) return value.includes(linktext);
      return typeof value === 'string' && value.includes(linktext);
    });
    return found?.path;
  }

  /** Full-text search returning matching paths. */
  search(query: string, options: {caseSensitive?: boolean} = {}): string[] {
    return search(this.notes, query, options.caseSensitive ?? false).map(note => note.path);
  }

  /** Cached derivation for a note, without cloning. */
  private derive(path: string): IndexedNote | undefined {
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

  /** Rebuild the case-insensitive path lookup; the first path wins. */
  private reindexLookups(): void {
    this.byPath.clear();
    for (const note of this.notes) {
      const key = note.path.toLowerCase();
      if (!this.byPath.has(key)) this.byPath.set(key, note.path);
    }
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
