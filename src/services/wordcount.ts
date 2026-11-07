/* Native word-count service contract (`engine.wordcount/v1`).
 *
 * Counts Unicode letters/numbers as words and UTF-16 code units as characters. Shared by
 * the status bar and available to other consumers.
 */
import {Kernel, type PluginDefinition} from '../kernel';
import {ENGINE_VERSION} from './version';

export const WORDCOUNT_CONTRACT = 'engine.wordcount/v1';
export const WORDCOUNT_VERSION = '1.0.0';

export interface WordCount {words: number; characters: number}

/** Count words and characters for a text value. */
export interface WordCountService {
  count(text: string): WordCount;
}

/** Original regex-based counter. */
export class WordCounter implements WordCountService {
  /** Count runs of Unicode letters/numbers as words; characters are UTF-16 units. */
  count(text: string): WordCount {
    const value = typeof text === 'string' ? text : '';
    return {words: value.match(/[\p{L}\p{N}]+/gu)?.length ?? 0, characters: value.length};
  }
}

/** Wrap a word-count service as a runtime-scoped native plugin. */
export function wordCountPlugin(service: WordCountService): PluginDefinition {
  return {
    manifest: {id: 'engine.wordcount', name: 'Word count', version: WORDCOUNT_VERSION, scopes: ['runtime'], provides: [{contract: WORDCOUNT_CONTRACT, version: WORDCOUNT_VERSION}]},
    setup(context) { context.provide(WORDCOUNT_CONTRACT, WORDCOUNT_VERSION, service); }
  };
}

export interface WordCountRuntime {kernel: Kernel; service: WordCountService}

/** Build and start a kernel exposing the word-count service. */
export async function createWordCountRuntime(options: {engineVersion?: string} = {}): Promise<WordCountRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(wordCountPlugin(new WordCounter()));
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(WORDCOUNT_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Word count service was not provided');
  return {kernel, service: resolved.binding.value as WordCountService};
}
