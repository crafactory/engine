import {useEffect,useRef} from 'react';
import {Editor,type EditorHandle} from '../Editor';
import type {EditorViewProps} from './contract';

/** Editor surface registered through the native view-contribution service. */
export default function EditorView({note,notes,settings,pluginExtensions,session,slashCommands,blocks,onChange,onOpen,onCommand,onHandle,suggest}:EditorViewProps){
  const ref=useRef<EditorHandle>(null);
  useEffect(()=>{onHandle?.(ref.current);return()=>onHandle?.(null);},[onHandle]);
  return <Editor ref={ref} note={note} notes={notes} settings={settings} pluginExtensions={pluginExtensions} session={session} slashCommands={slashCommands} blocks={blocks} onChange={onChange} onOpen={onOpen} onCommand={onCommand} suggest={suggest}/>;
}
