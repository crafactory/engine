import {describe,it,expect} from 'vitest';
import {WordCounter, wordCountPlugin, createWordCountRuntime, WORDCOUNT_CONTRACT} from '../src/services';
import {Kernel} from '../src/kernel';

describe('word count service', () => {
  it('counts Unicode letter/number runs as words and UTF-16 units as characters', () => {
    const counter = new WordCounter();
    expect(counter.count('hello world')).toEqual({words: 2, characters: 11});
    expect(counter.count('one-two, three')).toEqual({words: 3, characters: 14});
    expect(counter.count('')).toEqual({words: 0, characters: 0});
  });
  it('treats a contiguous CJK run as one word and reports code units', () => {
    const counter = new WordCounter();
    expect(counter.count('你好 世界')).toEqual({words: 2, characters: 5});
    expect(counter.count('😀 word').characters).toBe(7);
    expect(counter.count('😀 word').words).toBe(1);
  });
  it('tolerates a non-string value', () => {
    expect(new WordCounter().count(undefined as unknown as string)).toEqual({words: 0, characters: 0});
  });
});

describe('word count plugin', () => {
  it('resolves the contract from a runtime', async () => {
    const runtime = await createWordCountRuntime();
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.kernel.runtime.services.resolve(WORDCOUNT_CONTRACT).ok).toBe(true);
    expect(runtime.service.count('two words').words).toBe(2);
  });
  it('provides the service to a consumer plugin', async () => {
    let words = -1;
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(wordCountPlugin(new WordCounter()));
    kernel.register({manifest: {id: 'engine.probe', name: 'Probe', version: '1.0.0', consumes: [{contract: WORDCOUNT_CONTRACT}]}, setup(context) { words = context.service<WordCounter>(WORDCOUNT_CONTRACT).count('a b c').words; }});
    await kernel.start();
    expect(words).toBe(3);
    expect(kernel.diagnostics).toEqual([]);
  });
});
