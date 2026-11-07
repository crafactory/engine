/* Native web-viewer service contract (`engine.web-viewer/v1`).
 *
 * Validates that a user-supplied address is an HTTPS URL and returns the value used in the
 * viewer route. The application keeps the dialog and iframe presentation.
 */
import {Kernel, type PluginDefinition} from '../kernel';
import {ENGINE_VERSION} from './version';

export const WEB_VIEWER_CONTRACT = 'engine.web-viewer/v1';
export const WEB_VIEWER_VERSION = '1.0.0';

/** Normalize an HTTPS address for the web viewer. */
export interface WebViewerService {
  normalize(input: string): string;
}

/** Original HTTPS-only validator. */
export class WebViewer implements WebViewerService {
  /** Return the trimmed input when it parses as HTTPS; throw otherwise. */
  normalize(input: string): string {
    const value = String(input ?? '').trim();
    let parsed: URL;
    try { parsed = new URL(value); } catch { throw new Error('Use an HTTPS URL'); }
    if (parsed.protocol !== 'https:') throw new Error('Use an HTTPS URL');
    return value;
  }
}

/** Wrap a web-viewer service as a runtime-scoped native plugin. */
export function webViewerPlugin(service: WebViewerService): PluginDefinition {
  return {
    manifest: {id: 'engine.web-viewer', name: 'Web viewer', version: WEB_VIEWER_VERSION, scopes: ['runtime'], provides: [{contract: WEB_VIEWER_CONTRACT, version: WEB_VIEWER_VERSION}]},
    setup(context) { context.provide(WEB_VIEWER_CONTRACT, WEB_VIEWER_VERSION, service); }
  };
}

export interface WebViewerRuntime {kernel: Kernel; service: WebViewerService}

/** Build and start a kernel exposing the web-viewer service. */
export async function createWebViewerRuntime(options: {engineVersion?: string} = {}): Promise<WebViewerRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(webViewerPlugin(new WebViewer()));
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(WEB_VIEWER_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Web viewer service was not provided');
  return {kernel, service: resolved.binding.value as WebViewerService};
}
