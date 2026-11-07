import type { Settings as Preferences } from '../../types';
import type { SettingsComponentProps } from '../contract';
import { Switch } from '../../components/ui/switch';
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select';
import { settingRow as row } from '../../components/settings/row';

/** Editor settings section contributed through engine.ui/v1. */
export default function EditorSettings({ value, onChange }: SettingsComponentProps) {
  const toggle = (key: keyof Preferences) => (
    <Switch
      aria-label={String(key)}
      checked={!!value[key]}
      onCheckedChange={(checked) => onChange({ ...value, [key]: checked })}
    />
  );
  return (
    <>
      {row(
        'Default editing mode',
        'Source shows syntax. Live mode hides some inline syntax away from the cursor.',
        <NativeSelect
          aria-label="Default editing mode"
          value={value.mode}
          onChange={(event) =>
            onChange({ ...value, mode: event.target.value as Preferences['mode'] })
          }
        >
          <NativeSelectOption value="live">Live editing</NativeSelectOption>
          <NativeSelectOption value="source">Source</NativeSelectOption>
          <NativeSelectOption value="reading">Reading</NativeSelectOption>
        </NativeSelect>,
      )}
      {row('Line numbers', 'Show line numbers in the editor.', toggle('lineNumbers'))}
      {row('Spellcheck', 'Use the operating system spellchecker.', toggle('spellcheck'))}
      <p className="settings-note">
        Live editing is currently an inline-formatting subset, not full rendered-block parity. Vim
        bindings are not yet implemented.
      </p>
    </>
  );
}
