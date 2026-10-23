import {Bases} from '../Bases';
import type {ReadingViewProps} from './contract';

/** Bases view registered through the native view-contribution service. */
export default function BasesView({note,notes,entries,onOpen,onChange,onNoteChange,ask,pluginBases}:ReadingViewProps){
  return <Bases note={note} notes={notes} entries={entries} onOpen={onOpen} onChange={onChange} onNoteChange={onNoteChange} ask={ask} pluginBases={pluginBases}/>;
}
