/* Native format-converter service contract (`engine.format-converter/v1`).
 *
 * Converts a bounded set of HTML/Markdown constructs to the workspace's Markdown dialect:
 * `<mark>` to `==highlight==` and same-vault `.md` links to wikilinks. Not a general
 * Markdown/HTML converter.
 */
import {Kernel, type PluginDefinition} from '../kernel';
import {ENGINE_VERSION} from './version';

export const FORMAT_CONVERTER_CONTRACT = 'engine.format-converter/v1';
export const FORMAT_CONVERTER_VERSION = '1.0.0';

/** Convert supported formatting constructs in a Markdown note. */
export interface FormatConverterService {
  convert(content: string): string;
}

/** Original bounded converter. */
export class MarkdownConverter implements FormatConverterService {
  /** Convert `<mark>` highlights and `.md` links; leave other constructs untouched. */
  convert(content: string): string {
    const value = typeof content === 'string' ? content : '';
    return value
      .replace(/<mark>([\s\S]*?)<\/mark>/g, '==$1==')
      .replace(/\[([^\]]+)\]\(([^):]+)\.md\)/g, (match: string, label: string, href: string) => /^\/\//.test(href) ? match : `[[${href}|${label}]]`);
  }
}

/** Wrap a converter service as a runtime-scoped native plugin. */
export function formatConverterPlugin(service: FormatConverterService): PluginDefinition {
  return {
    manifest: {id: 'engine.format-converter', name: 'Format converter', version: FORMAT_CONVERTER_VERSION, scopes: ['runtime'], provides: [{contract: FORMAT_CONVERTER_CONTRACT, version: FORMAT_CONVERTER_VERSION}]},
    setup(context) { context.provide(FORMAT_CONVERTER_CONTRACT, FORMAT_CONVERTER_VERSION, service); }
  };
}

export interface FormatConverterRuntime {kernel: Kernel; service: FormatConverterService}

/** Build and start a kernel exposing the converter service. */
export async function createFormatConverterRuntime(options: {engineVersion?: string} = {}): Promise<FormatConverterRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(formatConverterPlugin(new MarkdownConverter()));
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(FORMAT_CONVERTER_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Format converter service was not provided');
  return {kernel, service: resolved.binding.value as FormatConverterService};
}
