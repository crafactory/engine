/* Native slides service contract (`engine.slides/v1`).
 *
 * Splits a Markdown note into presentation slides: frontmatter is removed and slides are
 * separated by `---` rules on their own line.
 */
import {Kernel, type PluginDefinition} from '../kernel';
import {ENGINE_VERSION} from './version';

export const SLIDES_CONTRACT = 'engine.slides/v1';
export const SLIDES_VERSION = '1.0.0';

/** Parse a note into slide Markdown bodies. */
export interface SlidesService {
  parse(content: string): string[];
}

/** Original slide splitter. */
export class SlideDeck implements SlidesService {
  /** Remove frontmatter and split on horizontal rules; always returns at least one slide. */
  parse(content: string): string[] {
    const body = (typeof content === 'string' ? content : '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
    const slides = body.split(/\n---+\n/);
    return slides.length ? slides : [''];
  }
}

/** Wrap a slides service as a runtime-scoped native plugin. */
export function slidesPlugin(service: SlidesService): PluginDefinition {
  return {
    manifest: {id: 'engine.slides', name: 'Slides', version: SLIDES_VERSION, scopes: ['runtime'], provides: [{contract: SLIDES_CONTRACT, version: SLIDES_VERSION}]},
    setup(context) { context.provide(SLIDES_CONTRACT, SLIDES_VERSION, service); }
  };
}

export interface SlidesRuntime {kernel: Kernel; service: SlidesService}

/** Build and start a kernel exposing the slides service. */
export async function createSlidesRuntime(options: {engineVersion?: string} = {}): Promise<SlidesRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(slidesPlugin(new SlideDeck()));
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(SLIDES_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Slides service was not provided');
  return {kernel, service: resolved.binding.value as SlidesService};
}
