/* Native note-composer service contract (`engine.note-composer/v1`).
 *
 * Pure content operations for merging and extracting notes. The application keeps the
 * dialogs, editor selection replacement, link rewriting across the vault and the trash
 * write; this service owns the merge/extract content rules.
 */
import {Kernel, type PluginDefinition} from '../kernel';
import {frontmatter} from '../knowledge';
import {ENGINE_VERSION} from './version';

export const NOTE_COMPOSER_CONTRACT = 'engine.note-composer/v1';
export const NOTE_COMPOSER_VERSION = '1.0.0';

/** Merge and extraction content rules. */
export interface NoteComposerService {
  /** Append the source body (without its frontmatter) to the target content. */
  merge(targetContent: string, sourceContent: string): string;
  /** Build a wikilink to a target path, dropping a `.md` suffix. */
  extractLink(targetPath: string): string;
}

/** Original composer rules. */
export class NoteComposer implements NoteComposerService {
  /** Keep the target note intact and append the source prose. */
  merge(targetContent: string, sourceContent: string): string {
    return `${targetContent ?? ''}\n\n${frontmatter(sourceContent ?? '').body}`;
  }

  /** Build `[[path]]` without the Markdown extension. */
  extractLink(targetPath: string): string {
    return `[[${(targetPath ?? '').replace(/\.md$/i, '')}]]`;
  }
}

/** Wrap a composer service as a runtime-scoped native plugin. */
export function noteComposerPlugin(service: NoteComposerService): PluginDefinition {
  return {
    manifest: {id: 'engine.note-composer', name: 'Note composer', version: NOTE_COMPOSER_VERSION, scopes: ['runtime'], provides: [{contract: NOTE_COMPOSER_CONTRACT, version: NOTE_COMPOSER_VERSION}]},
    setup(context) { context.provide(NOTE_COMPOSER_CONTRACT, NOTE_COMPOSER_VERSION, service); }
  };
}

export interface NoteComposerRuntime {kernel: Kernel; service: NoteComposerService}

/** Build and start a kernel exposing the composer service. */
export async function createNoteComposerRuntime(options: {engineVersion?: string} = {}): Promise<NoteComposerRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(noteComposerPlugin(new NoteComposer()));
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(NOTE_COMPOSER_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Note composer service was not provided');
  return {kernel, service: resolved.binding.value as NoteComposerService};
}
