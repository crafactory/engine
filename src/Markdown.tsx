import {useEffect,useRef,useState,useMemo,useSyncExternalStore} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {getProcessorRevision,subscribeProcessors,processMarkdown} from './markdown-plugins';
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import mark from 'markdown-it-mark';
import tasks from 'markdown-it-task-lists';
import DOMPurify from 'dompurify';
import katex from 'katex';
import {bridge} from './bridge';
import {frontmatter,resolveLink,section,title,search} from './knowledge';
import type {PagePreviewService} from './services/page-preview';
import type {Note} from './types';
import {taskMarker,setTaskChecked} from './task-source';

const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
/** Supply an inert external-store subscription for reading-only processors disabled in live widgets. */
function noProcessors(){
  /** No resources are acquired by this disabled subscription. */
  return function unsubscribe(){};
}
/** Keep disabled processor consumers at a stable revision without subscribing. */
function zeroRevision(){return 0;}
const md=new MarkdownIt({html:false,linkify:true,breaks:false,typographer:false}).use(footnote).use(mark).use(tasks,{enabled:true,label:true});
/** Bind generated task inputs to parser source lines; static and embedded controls remain read-only. */
md.core.ruler.after('github-task-lists','engine-task-ownership',(state:any)=>{
  // Parser line numbers survive newline normalization; offsets must use the original CRLF/LF source.
  const source=typeof state.env.engineTaskSource==='string'?state.env.engineTaskSource:state.src;
  const lines=source.split('\n'),starts:number[]=[];let offset=0;
  for(const line of lines){starts.push(offset);offset+=line.length+1;}
  for(const token of state.tokens){
    if(token.type!=='inline'||!token.children)continue;
    const line=token.map?.[0],marker=line===undefined?null:taskMarker(lines[line]||'');
    const owned=typeof state.env.engineTaskPrefix==='number'&&marker!==null;
    for(const child of token.children)if(child.type==='html_inline'&&child.content.includes('task-list-item-checkbox')){
      child.content=child.content.replace(/<input\b([^>]*)>/g,(_input:string,attributes:string)=>
        owned?`<input${attributes} data-engine-task-offset="${state.env.engineTaskPrefix+starts[line]+marker!}">`:
          `<input${attributes} disabled="">`);
    }
  }
});
md.inline.ruler.before('link','wiki',(state:any,silent:boolean)=>{
  const start=state.pos;
  const embed=state.src.startsWith('![[',start);
  if(!embed&&!state.src.startsWith('[[',start))return false;
  const end=state.src.indexOf(']]',start+3);
  if(end<0)return false;
  const inner=state.src.slice(start+(embed?3:2),end),[destination,...alias]=inner.split('|');
  if(!silent) {
    const token=state.push('html_inline','',0);
    token.content=embed?`<span class="embed-slot" data-embed="${escape(destination)}"></span>`:
      `<a class="internal-link" href="#" data-note="${escape(destination)}">${escape(alias.join('|')||destination.split('#')[0]||destination.slice(1))}</a>`;
  }
  state.pos=end+2;return true;
});
md.inline.ruler.before('escape','comment',(state:any,silent:boolean)=>{
  if(!state.src.startsWith('%%',state.pos))return false;
  const end=state.src.indexOf('%%',state.pos+2);if(end<0)return false;
  if(!silent)state.push('text','',0).content='';
  state.pos=end+2;return true;
});
md.inline.ruler.before('escape','math',(state:any,silent:boolean)=>{
  if(state.src[state.pos]!=='$'||state.src[state.pos+1]==='$')return false;
  const end=state.src.indexOf('$',state.pos+1);if(end<=state.pos+1)return false;
  if(!silent) {
    const token=state.push('html_inline','',0);
    token.content=katex.renderToString(state.src.slice(state.pos+1,end),{throwOnError:false,trust:false});
  }
  state.pos=end+1;return true;
});
md.block.ruler.before('fence','math-block',(state:any,start:number,end:number,silent:boolean)=>{
  const begin=state.bMarks[start]+state.tShift[start],finish=state.eMarks[start];
  const first=state.src.slice(begin,finish).trim();
  if(/^\$\$.+\$\$$/.test(first)){
    if(!silent){const token=state.push('html_block','',0);token.content=katex.renderToString(first.slice(2,-2),{displayMode:true,throwOnError:false,trust:false});token.map=[start,start+1];state.line=start+1;}
    return true;
  }
  if(first!=='$$')return false;
  let next=start+1;while(next<end&&state.src.slice(state.bMarks[next],state.eMarks[next]).trim()!=='$$')next++;
  if(next>=end)return false;
  if(silent)return true;
  const token=state.push('html_block','',0);
  token.content=katex.renderToString(state.src.slice(state.bMarks[start+1],state.bMarks[next]),{displayMode:true,throwOnError:false,trust:false});
  token.map=[start,next+1];
  state.line=next+1;return true;
});
md.core.ruler.after('inline','engine-callouts',(state:any)=>{
  const tokens=state.tokens;
  for(let i=0;i<tokens.length;i++){
    const open=tokens[i],inline=tokens[i+2];
    if(open.type!=='blockquote_open'||tokens[i+1]?.type!=='paragraph_open'||inline?.type!=='inline')continue;
    const match=inline.content.match(/^\[!([a-z-]+)\]([+-]?)([^\n]*)(?:\n|$)/i);
    if(!match)continue;
    const type=match[1].toLowerCase(),fold=match[2],label=match[3].trim()||type[0].toUpperCase()+type.slice(1);
    open.meta={callout:{type,fold,label}};
    const close=tokens.slice(i+1).find((token:any)=>token.type==='blockquote_close'&&token.level===open.level);
    if(close)close.meta=open.meta;
    inline.content=inline.content.slice(match[0].length);inline.children=md.parseInline(inline.content,state.env)[0].children;
  }
});
md.renderer.rules.blockquote_open=(tokens,idx)=>{
  const callout=tokens[idx].meta?.callout;
  if(!callout)return '<blockquote>\n';
  const classes=`callout callout-${escape(callout.type)}`;
  return callout.fold?`<details class="${classes}"${callout.fold==='+'?' open':''}><summary class="callout-title">${escape(callout.label)}</summary>\n`:
    `<blockquote class="${classes}"><div class="callout-title">${escape(callout.label)}</div>\n`;
};
md.renderer.rules.blockquote_close=(tokens,idx)=>tokens[idx].meta?.callout?.fold?'</details>\n':'</blockquote>\n';
const defaultLink=md.renderer.rules.link_open || ((tokens,idx,options,_env,self)=>self.renderToken(tokens,idx,options));
md.renderer.rules.link_open=(tokens,idx,options,env,self)=>{
  const href=tokens[idx].attrGet('href') || '';
  if(!/^(https?:|mailto:|#)/.test(href)){let decoded=href;try{decoded=decodeURIComponent(href);}catch{}tokens[idx].attrSet('data-note',decoded);}
  else if(/^https?:/.test(href)){tokens[idx].attrSet('target','_blank');tokens[idx].attrSet('rel','noopener noreferrer');}
  return defaultLink(tokens,idx,options,env,self);
};
const defaultImage=md.renderer.rules.image!;
md.renderer.rules.image=(tokens,idx,options,env,self)=>{
  const source=tokens[idx].attrGet('src') || '';
  if(!/^(https?:|data:|blob:)/.test(source)){tokens[idx].attrSet('data-asset',source);tokens[idx].attrSet('src','');}
  return defaultImage(tokens,idx,options,env,self);
};
md.renderer.rules.heading_open=(tokens,idx,options,_env,self)=>{
  const next=tokens[idx+1];
  tokens[idx].attrSet('id','heading-'+(next?.content||'').toLowerCase().replace(/\s+/g,'-'));
  return self.renderToken(tokens,idx,options);
};
/** Render original Engine Markdown with raw HTML disabled and sanitized output. */
export function renderMarkdown(content:string,editableTasks=false) {
  const meta=frontmatter(content);
  const html=md.render(meta.body,editableTasks?{engineTaskPrefix:meta.raw.length,engineTaskSource:meta.body}:{});
  return DOMPurify.sanitize(html,{ADD_ATTR:['target','data-note','data-embed','data-asset','data-engine-task-offset'],FORBID_TAGS:['style','iframe','object','embed']});
}
/** Render an immutable reading host; dispose owned processing when content or registry changes. */
export function Markdown({content,notes,path,onOpen,onChange,depth=0,pluginProcessing=true,previews}:{
  content:string;notes:Note[];path:string;onOpen:(target:string)=>void;onChange?:(content:string)=>void;depth?:number;pluginProcessing?:boolean;previews?:PagePreviewService;
}) {
  const ref=useRef<HTMLDivElement>(null);
  const taskOwners=useRef(new WeakMap<HTMLInputElement,number>());
  const [hover,setHover]=useState<{note:Note;x:number;y:number}|null>(null);
  const revision=useSyncExternalStore(pluginProcessing?subscribeProcessors:noProcessors,pluginProcessing?getProcessorRevision:zeroRevision);
  // Each session gets a distinct DOM root so late asynchronous plugin writes cannot corrupt its successor.
  const renderKey=useMemo(()=>crypto.randomUUID(),[content,notes,path,depth,revision,!!onChange]);
  useEffect(()=>{
    let disposed=false;const root=ref.current;if(!root)return;
    // Capture identities before resolving embeds or admitting plugin DOM; neither may acquire host write ownership.
    taskOwners.current=new WeakMap();
    for(const input of root.querySelectorAll<HTMLInputElement>('input[data-engine-task-offset]')){
      const offset=Number(input.dataset.engineTaskOffset);
      if(Number.isInteger(offset))taskOwners.current.set(input,offset);
    }
    let processorSession:ReturnType<typeof processMarkdown>|undefined;
    const canvasRoots:Root[]=[];
    /** Resolve original built-ins, then process only the still-current reading host. */
    const load=async()=>{
      for(const img of root.querySelectorAll<HTMLImageElement>('img[data-asset]')) {
        const name=img.dataset.asset!;
        const relative=resolveLink(name,path,notes)?.path || name;
        try {const asset=await bridge.asset(relative);if(!disposed)img.src=asset;}catch {img.alt='Attachment not found: '+name;}
      }
      for(const slot of root.querySelectorAll<HTMLElement>('[data-embed]')) {
        if(disposed)return;
        const target=slot.dataset.embed!,[name,...fragment]=target.split('#');
        const linked=resolveLink(name,path,notes);
        if(depth>=3){slot.textContent='Embed depth limit';continue;}
        if(linked) {
          slot.className='embedded-note';
          slot.innerHTML=`<button class="embed-title" data-note="${escape(target)}">${escape(title(linked.path))}</button>`;
          if(/\.canvas$/i.test(linked.path)){
            try{
              const {Canvas}=await import('./Canvas');
              if(disposed)return;
              const body=document.createElement('div');body.className='canvas-embed-host';slot.append(body);
              const canvasRoot=createRoot(body);canvasRoots.push(canvasRoot);
              canvasRoot.render(<Canvas note={linked} notes={notes} readOnly onChange={()=>{}} onOpen={onOpen}/>);
            }catch{if(!disposed)slot.append(document.createTextNode('Canvas preview unavailable. Open the file to inspect it.'));}
          }else slot.insertAdjacentHTML('beforeend',renderMarkdown(section(linked.content,fragment.join('#'))));
        }else if(/\.(png|jpe?g|gif|webp|svg|pdf|mp3|wav|webm|ogg|mp4)$/i.test(name)){
          try{
            const asset=await bridge.asset(name);if(disposed)continue;
            const tag=/\.(mp3|wav|webm|ogg)$/i.test(name)?'audio':/\.mp4$/i.test(name)?'video':/\.pdf$/i.test(name)?'a':'img';
            const el=document.createElement(tag);
            if(el instanceof HTMLImageElement){el.src=asset;el.alt=name;}
            if(el instanceof HTMLMediaElement){el.src=asset;el.controls=true;}
            if(el instanceof HTMLAnchorElement){el.href=asset;el.download=name.split('/').pop()!;el.textContent='Open PDF: '+name;}
            slot.replaceChildren(el);
          }catch{slot.textContent='Attachment not found: '+name;}
        }else{slot.textContent='Unresolved embed: '+target;}
      }
      for(const code of root.querySelectorAll<HTMLElement>('code.language-mermaid')) {
        try {
          const {default:mermaid}=await import('mermaid');
          mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:document.documentElement.dataset.theme==='light'?'default':'dark'});
          const {svg}=await mermaid.render('mermaid-'+crypto.randomUUID().replaceAll('-',''),code.textContent||'');
          if(!disposed){const div=document.createElement('div');div.className='mermaid';div.innerHTML=DOMPurify.sanitize(svg);code.parentElement?.replaceWith(div);}
        }catch{if(!disposed)code.dataset.error='Invalid diagram';}
      }
      for(const code of root.querySelectorAll<HTMLElement>('code.language-query')) {
        const results=search(notes,code.textContent||'');
        const div=document.createElement('div');div.className='query-results';
        for(const note of results){const button=document.createElement('button');button.dataset.note=note.path;button.textContent=title(note.path);div.append(button);}
        code.parentElement?.replaceWith(div);
      }
      if(!disposed&&pluginProcessing){processorSession=processMarkdown(root,content,path);await processorSession.ready;}
    };
    load();
    return()=>{disposed=true;void processorSession?.close();queueMicrotask(()=>canvasRoots.forEach(root=>root.unmount()));};
  },[content,notes,path,depth,pluginProcessing,renderKey,!!onChange]);
  /** Route note links and persist only task inputs captured from this host's own parsed source. */
  function click(e:React.MouseEvent) {
    const target=e.target as HTMLElement;
    const link=target.closest<HTMLElement>('[data-note]');
    if(link){e.preventDefault();onOpen(link.dataset.note!);return;}
    if(target instanceof HTMLInputElement&&target.type==='checkbox'&&onChange) {
      const offset=taskOwners.current.get(target);
      if(offset===undefined)return;
      const next=setTaskChecked(content,offset,target.checked);
      if(next!==null&&next!==content)onChange(next);
    }
  }
  return <div className="markdown-container">
    <div className="markdown" key={renderKey} ref={ref} onClick={click}
      onMouseOver={e=>{const link=(e.target as HTMLElement).closest<HTMLElement>('[data-note]');if(link){const note=resolveLink(link.dataset.note!.split('#')[0],path,notes);if(note){const bounds=link.getBoundingClientRect();const placement=previews?previews.place(bounds,{width:window.innerWidth,height:window.innerHeight}):{x:Math.min(bounds.left,window.innerWidth-350),y:Math.min(bounds.bottom+8,window.innerHeight-240)};setHover({note,...placement});}}}}
      onMouseOut={()=>setHover(null)} dangerouslySetInnerHTML={{__html:renderMarkdown(content,!!onChange)}} />
    {hover&&<aside className="hover-preview" style={{left:hover.x,top:hover.y}}><strong>{title(hover.note.path)}</strong><div dangerouslySetInnerHTML={{__html:renderMarkdown(previews?previews.excerpt(hover.note.content):frontmatter(hover.note.content).body.slice(0,650))}}/></aside>}
  </div>;
}
