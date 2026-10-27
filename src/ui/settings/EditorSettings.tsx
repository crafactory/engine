import type {Settings as Preferences} from '../../types';
import type {SettingsComponentProps} from '../contract';

/** Editor settings section contributed through engine.ui/v1. */
export default function EditorSettings({value,onChange}:SettingsComponentProps){
  const row=(name:string,description:string,control:React.ReactNode)=><div className="setting-row"><div><strong>{name}</strong><p>{description}</p></div>{control}</div>;
  const toggle=(key:keyof Preferences)=><input aria-label={String(key)} type="checkbox" role="switch" checked={!!value[key]} onChange={event=>onChange({...value,[key]:event.target.checked})}/>;
  return <>
    {row('Default editing mode','Source shows syntax. Live mode hides some inline syntax away from the cursor.',<select aria-label="Default editing mode" value={value.mode} onChange={event=>onChange({...value,mode:event.target.value as Preferences['mode']})}><option value="live">Live editing</option><option value="source">Source</option><option value="reading">Reading</option></select>)}
    {row('Line numbers','Show line numbers in the editor.',toggle('lineNumbers'))}
    {row('Spellcheck','Use the operating system spellchecker.',toggle('spellcheck'))}
    <p className="settings-note">Live editing is currently an inline-formatting subset, not full rendered-block parity. Vim bindings are not yet implemented.</p>
  </>;
}
