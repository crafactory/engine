import {Markdown} from '../../Markdown';
import type {BlockPreviewProps} from './contract';

/** Built-in opt-in Mermaid block preview. */
export default function MermaidBlockPreview({source,path}:BlockPreviewProps){
  return <div className="block-preview-mermaid" data-block-preview="mermaid"><Markdown content={'```mermaid\n'+source+'\n```'} notes={[]} path={path} onOpen={()=>{}} pluginProcessing={false}/></div>;
}
