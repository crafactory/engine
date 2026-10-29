import type {ComponentType} from 'react';
import type {BlockContribution} from '../../services/ui';

export interface BlockPreviewProps {
  source: string;
  language: string;
  path: string;
}

export type BlockPreviewComponent = ComponentType<BlockPreviewProps>;

function isComponent(candidate: unknown): candidate is BlockPreviewComponent {
  return typeof candidate === 'function' || (typeof candidate === 'object' && candidate !== null && '$$typeof' in candidate);
}

/** Interpret an opaque block-preview loader result as a React component. */
export async function loadBlockComponent(contribution: BlockContribution): Promise<BlockPreviewComponent> {
  const module = await contribution.load();
  const candidate = isComponent(module) ? module : (module as {default?: unknown} | null)?.default;
  if (!isComponent(candidate)) throw new Error(`Block ${contribution.id} did not provide a component`);
  return candidate as BlockPreviewComponent;
}
