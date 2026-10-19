/* Native navigation service contract (`engine.navigation/v1`).
 *
 * Quick-switcher ordering and random-note selection, derived from `engine.index/v1`.
 * Migrated with the notes index so the dependency edge is assembled and tested together.
 */
import {Kernel, type PluginDefinition} from '../kernel';
import {ENGINE_VERSION} from './version';
import {INDEX_CONTRACT, indexPlugin, NotesIndex, type IndexService} from './notes-index';

export const NAVIGATION_CONTRACT = 'engine.navigation/v1';
export const NAVIGATION_VERSION = '1.0.0';

export interface NavigationOptions {recent?: readonly string[]}
export interface NavigationService {
  /** Vault paths with recently opened ones first; the palette performs fuzzy filtering. */
  quickSwitch(options?: NavigationOptions): string[];
  /** A random Markdown note path, or undefined when the vault has none. */
  randomNote(): string | undefined;
}

const MARKDOWN = /\.(md|markdown)$/i;

/** Navigation over a notes index; the random source is injectable for tests. */
export class NotesNavigation implements NavigationService {
  /**
   * @param index Notes index providing the vault paths.
   * @param random Random source in [0, 1); defaults to Math.random.
   */
  constructor(private readonly index: IndexService, private readonly random: () => number = Math.random) {}

  /** Return indexed paths, stable-sorted so recently opened paths come first. */
  quickSwitch(options: NavigationOptions = {}): string[] {
    const recent = options.recent ?? [];
    return [...this.index.paths()].sort((a, b) => {
      const left = recent.indexOf(a), right = recent.indexOf(b);
      return (left < 0 ? recent.length : left) - (right < 0 ? recent.length : right);
    });
  }

  /** Choose a random Markdown note, or undefined when none is indexed. */
  randomNote(): string | undefined {
    const notes = this.index.paths().filter(path => MARKDOWN.test(path));
    return notes.length ? notes[Math.floor(this.random() * notes.length)] : undefined;
  }
}

/** Wrap a navigation service as a provider that consumes the index contract. */
export function navigationPlugin(factory: (index: IndexService) => NavigationService = index => new NotesNavigation(index)): PluginDefinition {
  return {
    manifest: {
      id: 'engine.navigation', name: 'Navigation', version: NAVIGATION_VERSION, scopes: ['runtime'],
      provides: [{contract: NAVIGATION_CONTRACT, version: NAVIGATION_VERSION}],
      consumes: [{contract: INDEX_CONTRACT, range: '^1.0.0'}]
    },
    setup(context) {
      const index = context.service<IndexService>(INDEX_CONTRACT);
      context.provide(NAVIGATION_CONTRACT, NAVIGATION_VERSION, factory(index));
    }
  };
}

export interface NavigationRuntime {kernel: Kernel; index: IndexService; navigation: NavigationService}

/** Build and start a kernel with the notes index and navigation providers. */
export async function createNavigationRuntime(options: {engineVersion?: string} = {}): Promise<NavigationRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(indexPlugin(new NotesIndex()));
  kernel.register(navigationPlugin());
  await kernel.start();
  const index = kernel.runtime.services.resolve(INDEX_CONTRACT, '^1.0.0');
  const navigation = kernel.runtime.services.resolve(NAVIGATION_CONTRACT, '^1.0.0');
  if (!index.ok) throw new Error('Index service was not provided');
  if (!navigation.ok) throw new Error('Navigation service was not provided');
  return {kernel, index: index.binding.value as IndexService, navigation: navigation.binding.value as NavigationService};
}
