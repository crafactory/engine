import {Graph} from '../Graph';
import type {GraphViewProps} from './contract';

/** Graph view registered through the native view-contribution service. */
export default function GraphView({notes,index,active,local,onOpen}:GraphViewProps){
  return <Graph notes={notes} index={index} active={active} local={local} onOpen={onOpen}/>;
}
