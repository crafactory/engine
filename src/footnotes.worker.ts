import {footnotes,type FootnotesRequest,type FootnotesResponse} from './footnotes';

/** CPU-heavy Markdown parsing never runs in the editor's UI thread. */
self.onmessage=(event:MessageEvent<FootnotesRequest>)=>{
  const {id,content}=event.data;
  let response:FootnotesResponse;
  try{response={id,items:footnotes(content)};}
  catch{response={id,error:'Footnotes could not be parsed.'};}
  self.postMessage(response);
};
