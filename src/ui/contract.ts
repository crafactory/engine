/* UI-side loader for native settings contributions. */
import type {ComponentType} from 'react';
import type {SettingsContribution} from '../services/ui';

export type SettingsComponent = ComponentType;

/** Interpret an opaque settings loader result as a React component. */
export async function loadSettingsComponent(contribution: SettingsContribution): Promise<SettingsComponent> {
  const module = await contribution.load();
  const candidate = typeof module === 'function' ? module : (module as {default?: unknown} | null)?.default;
  if (typeof candidate !== 'function') throw new Error(`Settings ${contribution.id} did not provide a component`);
  return candidate as SettingsComponent;
}
