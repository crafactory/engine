import {Markdown} from '../Markdown';
import type {ReadingViewProps} from './contract';

/** Markdown reading view; the host supplies the note and callbacks. */
export default function MarkdownView({note,notes,path,previews,onOpenLink,onChange,onHoverLink}:ReadingViewProps){
  return <Markdown content={note.content} notes={notes} path={path} previews={previews} onOpen={onOpenLink} onChange={onChange} onHoverLink={onHoverLink}/>;
}
