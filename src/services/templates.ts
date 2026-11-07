/* Native templates service contract (`engine.templates/v1`).
 *
 * Token interpolation for note templates. A daily-notes plugin consumes this contract, so
 * templates and daily notes migrate together with a tested dependency edge.
 */
import {Kernel, type PluginDefinition} from '../kernel';
import {ENGINE_VERSION} from './version';

export const TEMPLATES_CONTRACT = 'engine.templates/v1';
export const TEMPLATES_VERSION = '1.0.0';

export interface TemplateContext {title: string; date?: Date}

/** Interpolate template tokens into note content. */
export interface TemplateService {
  apply(content: string, context: TemplateContext): string;
}

const pad = (value: number): string => String(value).padStart(2, '0');

/** Original template engine: `{{title}}`, `{{date}}`, `{{date:YYYY-MM-DD}}` and `{{time}}`. */
export class TemplateEngine implements TemplateService {
  /** Replace supported tokens, leaving unknown tokens untouched. */
  apply(content: string, context: TemplateContext): string {
    const date = context.date ?? new Date();
    const dateString = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    return content
      .replace(/\{\{title\}\}/g, context.title)
      .replace(/\{\{date(?::([^}]+))?\}\}/g, (_match, format?: string) => format
        ? format.replace(/YYYY/g, String(date.getFullYear())).replace(/MM/g, pad(date.getMonth() + 1)).replace(/DD/g, pad(date.getDate()))
        : dateString)
      .replace(/\{\{time\}\}/g, `${pad(date.getHours())}:${pad(date.getMinutes())}`);
  }
}

/** Wrap a templates service as a runtime-scoped native plugin. */
export function templatesPlugin(service: TemplateService): PluginDefinition {
  return {
    manifest: {id: 'engine.templates', name: 'Templates', version: TEMPLATES_VERSION, scopes: ['runtime'], provides: [{contract: TEMPLATES_CONTRACT, version: TEMPLATES_VERSION}]},
    setup(context) { context.provide(TEMPLATES_CONTRACT, TEMPLATES_VERSION, service); }
  };
}

export interface TemplatesRuntime {kernel: Kernel; templates: TemplateService}

/** Build and start a kernel exposing the templates service. */
export async function createTemplatesRuntime(options: {engineVersion?: string} = {}): Promise<TemplatesRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(templatesPlugin(new TemplateEngine()));
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(TEMPLATES_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Templates service was not provided');
  return {kernel, templates: resolved.binding.value as TemplateService};
}
