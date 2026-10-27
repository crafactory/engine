/* UI-side loader for native settings contributions. */
import type {ComponentType} from 'react';
import type {Settings as Preferences} from '../types';
import type {SettingsContribution} from '../services/ui';

export interface SettingsComponentProps {
  value: Preferences;
  onChange: (value: Preferences) => void;
}

export type SettingsComponent = ComponentType<SettingsComponentProps>;

/** React component types include functions and exotic objects such as memo/forwardRef. */
function isComponent(candidate: unknown): candidate is SettingsComponent {
  return typeof candidate === 'function' || (typeof candidate === 'object' && candidate !== null && '$$typeof' in candidate);
}

/** Interpret an opaque settings loader result as a React component. */
export async function loadSettingsComponent(contribution: SettingsContribution): Promise<SettingsComponent> {
  const module = await contribution.load();
  const candidate = isComponent(module) ? module : (module as {default?: unknown} | null)?.default;
  if (!isComponent(candidate)) throw new Error(`Settings ${contribution.id} did not provide a component`);
  return candidate as SettingsComponent;
}
