/* Native page-preview service contract (`engine.page-preview/v1`).
 *
 * Owns the hover-preview content excerpt and placement rules. The application keeps the
 * hover event handling and renders the popover.
 */
import {Kernel, type PluginDefinition} from '../kernel';
import {frontmatter} from '../knowledge';
import {ENGINE_VERSION} from './version';

export const PAGE_PREVIEW_CONTRACT = 'engine.page-preview/v1';
export const PAGE_PREVIEW_VERSION = '1.0.0';

export interface PreviewAnchor {left: number; bottom: number}
export interface PreviewViewport {width: number; height: number}
export interface PreviewPlacement {x: number; y: number}

/** Excerpt and placement rules for hover previews. */
export interface PagePreviewService {
  excerpt(content: string, limit?: number): string;
  place(anchor: PreviewAnchor, viewport: PreviewViewport): PreviewPlacement;
}

/** Original excerpt length. */
const DEFAULT_LIMIT = 650;
/** Preview popover margins used by the original placement. */
const EDGE_WIDTH = 350, EDGE_HEIGHT = 240, GAP = 8;

/** Original preview rules. */
export class PagePreview implements PagePreviewService {
  /** Strip frontmatter and truncate the body. */
  excerpt(content: string, limit = DEFAULT_LIMIT): string {
    return frontmatter(typeof content === 'string' ? content : '').body.slice(0, limit);
  }

  /** Place the popover below the anchor, clamped inside the viewport. */
  place(anchor: PreviewAnchor, viewport: PreviewViewport): PreviewPlacement {
    return {x: Math.min(anchor.left, viewport.width - EDGE_WIDTH), y: Math.min(anchor.bottom + GAP, viewport.height - EDGE_HEIGHT)};
  }
}

/** Wrap a preview service as a runtime-scoped native plugin. */
export function pagePreviewPlugin(service: PagePreviewService): PluginDefinition {
  return {
    manifest: {id: 'engine.page-preview', name: 'Page preview', version: PAGE_PREVIEW_VERSION, scopes: ['runtime'], provides: [{contract: PAGE_PREVIEW_CONTRACT, version: PAGE_PREVIEW_VERSION}]},
    setup(context) { context.provide(PAGE_PREVIEW_CONTRACT, PAGE_PREVIEW_VERSION, service); }
  };
}

export interface PagePreviewRuntime {kernel: Kernel; service: PagePreviewService}

/** Build and start a kernel exposing the page-preview service. */
export async function createPagePreviewRuntime(options: {engineVersion?: string} = {}): Promise<PagePreviewRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(pagePreviewPlugin(new PagePreview()));
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(PAGE_PREVIEW_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Page preview service was not provided');
  return {kernel, service: resolved.binding.value as PagePreviewService};
}
