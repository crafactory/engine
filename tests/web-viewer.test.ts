import {describe,it,expect} from 'vitest';
import {WebViewer, webViewerPlugin, createWebViewerRuntime, WEB_VIEWER_CONTRACT} from '../src/services';
import {Kernel} from '../src/kernel';

describe('web viewer service', () => {
  it('accepts and trims HTTPS addresses', () => {
    const viewer = new WebViewer();
    expect(viewer.normalize('  https://example.com/a?b#c  ')).toBe('https://example.com/a?b#c');
  });
  it('rejects non-HTTPS and unparsable addresses', () => {
    const viewer = new WebViewer();
    for (const value of ['http://example.com', 'javascript:alert(1)', 'not a url', '']) {
      expect(() => viewer.normalize(value)).toThrow('Use an HTTPS URL');
    }
  });
  it('resolves the contract from a runtime and serves a consumer', async () => {
    const runtime = await createWebViewerRuntime();
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.kernel.runtime.services.resolve(WEB_VIEWER_CONTRACT).ok).toBe(true);
    expect(runtime.service.normalize('https://example.com')).toBe('https://example.com');
    let value = '';
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(webViewerPlugin(new WebViewer()));
    kernel.register({manifest: {id: 'engine.probe', name: 'Probe', version: '1.0.0', consumes: [{contract: WEB_VIEWER_CONTRACT}]}, setup(context) { value = context.service<WebViewer>(WEB_VIEWER_CONTRACT).normalize('https://example.com/x'); }});
    await kernel.start();
    expect(value).toBe('https://example.com/x');
  });
});
