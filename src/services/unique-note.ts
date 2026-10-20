/* Native unique-note service contract (`engine.unique-note/v1`).
 *
 * Creates a timestamp-named note and applies the configured template through
 * `engine.templates/v1`; migrated with templates so the dependency edge is tested.
 */
import {Kernel, type PluginDefinition} from '../kernel';
import {ENGINE_VERSION} from './version';
import {TEMPLATES_CONTRACT, TemplateEngine, templatesPlugin, type TemplateService} from './templates';

export const UNIQUE_NOTE_CONTRACT = 'engine.unique-note/v1';
export const UNIQUE_NOTE_VERSION = '1.0.0';

export interface UniqueNoteContext {templateContent?: string; date?: Date}
export interface UniqueNote {path: string; content: string}

/** Create a timestamp-named note with optional template interpolation. */
export interface UniqueNoteService {
  create(context?: UniqueNoteContext): UniqueNote;
}

/** UTC timestamp name (YYYYMMDDHHmmss), matching the application's previous command. */
const stamp = (date: Date): string => date.toISOString().replace(/\D/g, '').slice(0, 14);

/** Unique-note service backed by a templates provider. */
export class UniqueNotes implements UniqueNoteService {
  /** @param templates Template provider used when template content is supplied. */
  constructor(private readonly templates: TemplateService) {}

  /** Build the timestamp path and either the interpolated template or a default heading. */
  create(context: UniqueNoteContext = {}): UniqueNote {
    const date = context.date ?? new Date();
    const name = stamp(date);
    const template = context.templateContent ?? '';
    return {path: `${name}.md`, content: template ? this.templates.apply(template, {title: name, date}) : `# ${name}\n\n`};
  }
}

/** Wrap a unique-note service as a provider that consumes the templates contract. */
export function uniqueNotePlugin(factory: (templates: TemplateService) => UniqueNoteService = templates => new UniqueNotes(templates)): PluginDefinition {
  return {
    manifest: {
      id: 'engine.unique-note', name: 'Unique note', version: UNIQUE_NOTE_VERSION, scopes: ['runtime'],
      provides: [{contract: UNIQUE_NOTE_CONTRACT, version: UNIQUE_NOTE_VERSION}],
      consumes: [{contract: TEMPLATES_CONTRACT, range: '^1.0.0'}]
    },
    setup(context) {
      const templates = context.service<TemplateService>(TEMPLATES_CONTRACT);
      context.provide(UNIQUE_NOTE_CONTRACT, UNIQUE_NOTE_VERSION, factory(templates));
    }
  };
}

export interface UniqueNoteRuntime {kernel: Kernel; templates: TemplateService; uniqueNote: UniqueNoteService}

/** Build and start a kernel with templates and unique note, returning both services. */
export async function createUniqueNoteRuntime(options: {engineVersion?: string} = {}): Promise<UniqueNoteRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(templatesPlugin(new TemplateEngine()));
  kernel.register(uniqueNotePlugin());
  await kernel.start();
  const templates = kernel.runtime.services.resolve(TEMPLATES_CONTRACT, '^1.0.0');
  const uniqueNote = kernel.runtime.services.resolve(UNIQUE_NOTE_CONTRACT, '^1.0.0');
  if (!templates.ok) throw new Error('Templates service was not provided');
  if (!uniqueNote.ok) throw new Error('Unique note service was not provided');
  return {kernel, templates: templates.binding.value as TemplateService, uniqueNote: uniqueNote.binding.value as UniqueNoteService};
}
