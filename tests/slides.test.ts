import {describe,it,expect} from 'vitest';
import {SlideDeck, slidesPlugin, createSlidesRuntime, SLIDES_CONTRACT} from '../src/services';
import {Kernel} from '../src/kernel';

describe('slides service', () => {
  it('removes frontmatter and splits on horizontal rules', () => {
    const deck = new SlideDeck();
    expect(deck.parse('---\ntags: [x]\n---\n# One\n\n---\n\n# Two\n\n---\n\n# Three')).toEqual(['# One\n', '\n# Two\n', '\n# Three']);
    expect(deck.parse('# Only slide')).toEqual(['# Only slide']);
    expect(deck.parse('')).toEqual(['']);
  });
  it('handles CRLF decks and an empty frontmatter block', () => {
    const deck = new SlideDeck();
    expect(deck.parse('# A\r\n\r\n---\r\n\r\n# B')).toEqual(['# A\n', '\n# B']);
    expect(deck.parse('---\n---\n# A')).toEqual(['# A']);
    expect(deck.parse('---\r\n---\r\n# A')).toEqual(['# A']);
  });
  it('resolves the contract from a runtime', async () => {
    const runtime = await createSlidesRuntime();
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.kernel.runtime.services.resolve(SLIDES_CONTRACT).ok).toBe(true);
    expect(runtime.service.parse('A\n---\nB')).toEqual(['A', 'B']);
  });
  it('provides the service to a consumer plugin', async () => {
    let slides: string[] = [];
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(slidesPlugin(new SlideDeck()));
    kernel.register({manifest: {id: 'engine.probe', name: 'Probe', version: '1.0.0', consumes: [{contract: SLIDES_CONTRACT}]}, setup(context) { slides = context.service<SlideDeck>(SLIDES_CONTRACT).parse('A\n---\nB'); }});
    await kernel.start();
    expect(slides).toEqual(['A', 'B']);
  });
});
