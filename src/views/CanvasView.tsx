import {Canvas} from '../Canvas';
import type {ReadingViewProps} from './contract';

/** Canvas view registered through the native view-contribution service. */
export default function CanvasView({note,notes,onChange,onOpen}:ReadingViewProps){
  return <Canvas note={note} notes={notes} onChange={onChange} onOpen={onOpen}/>;
}
