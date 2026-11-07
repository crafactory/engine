import {describe,it,expect} from 'vitest';
import {PagePreview, pagePreviewPlugin, createPagePreviewRuntime, PAGE_PREVIEW_CONTRACT, type PagePreviewService} from '../src/services';
import {Kernel} from '../src/kernel';

describe('page preview service', () => {
  it('strips frontmatter and truncates the body', () => {
    const preview = new PagePreview();
    expect(preview.excerpt('---\ntags: [x]\n---\n# Title\n\nBody text')).toBe('# Title\n\nBody text');
    expect(preview.excerpt('abcdef', 3)).toBe('abc');
    expect(preview.excerpt('')).toBe('');
  });
  it('places the popover below the anchor and clamps it inside the viewport', () => {
    const preview = new PagePreview();
    expect(preview.place({left: 10, bottom: 20}, {width: 1000, height: 800})).toEqual({x: 10, y: 28});
    expect(preview.place({left: 990, bottom: 790}, {width: 1000, height: 800})).toEqual({x: 650, y: 560});
  });
  it('resolves the contract from a runtime and serves a consumer', async () => {
    const runtime = await createPagePreviewRuntime();
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.kernel.runtime.services.resolve(PAGE_PREVIEW_CONTRACT).ok).toBe(true);
    expect(runtime.service.excerpt('body')).toBe('body');
    let excerpt = '';
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(pagePreviewPlugin(new PagePreview()));
    kernel.register({manifest: {id: 'engine.probe', name: 'Probe', version: '1.0.0', consumes: [{contract: PAGE_PREVIEW_CONTRACT}]}, setup(context) { excerpt = context.service<PagePreviewService>(PAGE_PREVIEW_CONTRACT).excerpt('abc', 2); }});
    await kernel.start();
    expect(excerpt).toBe('ab');
  });
});
