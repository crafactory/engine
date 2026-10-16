/* Native daily-notes service contract (`engine.daily-notes/v1`).
 *
 * Computes the daily note path and content, consuming `engine.templates/v1` for token
 * interpolation. Migrated with templates so the dependency edge is assembled and tested
 * together.
 */
import {Kernel, type PluginDefinition} from '../kernel';
import {ENGINE_VERSION} from './version';
import {TEMPLATES_CONTRACT, TemplateEngine, templatesPlugin, type TemplateService} from './templates';

export const DAILY_NOTES_CONTRACT = 'engine.daily-notes/v1';
export const DAILY_NOTES_VERSION = '1.0.0';

export interface DailyNoteContext {folder: string; templateContent: string; date?: Date}
export interface DailyNote {path: string; content: string; date: string}

/** Compute today's daily note from a folder and template. */
export interface DailyNotesService {
  today(context: DailyNoteContext): DailyNote;
}

/** Daily-note service backed by a templates provider. */
export class DailyNotes implements DailyNotesService {
  /** @param templates Template provider used for the date and content interpolation. */
  constructor(private readonly templates: TemplateService) {}

  /** Return the date-based path and interpolated content for a daily note. */
  today(context: DailyNoteContext): DailyNote {
    const date = context.date ?? new Date();
    const name = this.templates.apply('{{date}}', {title: '', date});
    return {path: `${context.folder}/${name}.md`, content: this.templates.apply(context.templateContent, {title: name, date}), date: name};
  }
}

/** Wrap a daily-notes service as a provider that consumes the templates contract. */
export function dailyNotesPlugin(factory: (templates: TemplateService) => DailyNotesService = templates => new DailyNotes(templates)): PluginDefinition {
  return {
    manifest: {
      id: 'engine.daily-notes', name: 'Daily notes', version: DAILY_NOTES_VERSION, scopes: ['runtime'],
      provides: [{contract: DAILY_NOTES_CONTRACT, version: DAILY_NOTES_VERSION}],
      consumes: [{contract: TEMPLATES_CONTRACT, range: '^1.0.0'}]
    },
    setup(context) {
      const templates = context.service<TemplateService>(TEMPLATES_CONTRACT);
      context.provide(DAILY_NOTES_CONTRACT, DAILY_NOTES_VERSION, factory(templates));
    }
  };
}

export interface DailyNotesRuntime {kernel: Kernel; templates: TemplateService; dailyNotes: DailyNotesService}

/** Build and start a kernel with templates and daily notes, returning both services. */
export async function createDailyNotesRuntime(options: {engineVersion?: string} = {}): Promise<DailyNotesRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(templatesPlugin(new TemplateEngine()));
  kernel.register(dailyNotesPlugin());
  await kernel.start();
  const templates = kernel.runtime.services.resolve(TEMPLATES_CONTRACT, '^1.0.0');
  const dailyNotes = kernel.runtime.services.resolve(DAILY_NOTES_CONTRACT, '^1.0.0');
  if (!templates.ok) throw new Error('Templates service was not provided');
  if (!dailyNotes.ok) throw new Error('Daily notes service was not provided');
  return {kernel, templates: templates.binding.value as TemplateService, dailyNotes: dailyNotes.binding.value as DailyNotesService};
}
