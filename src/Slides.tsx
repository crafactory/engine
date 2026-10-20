import {useEffect,useState} from 'react';
import {ChevronLeft,ChevronRight,X,Maximize} from 'lucide-react';
import {Markdown} from './Markdown';
import type {Note} from './types';
import type {SlidesService} from './services/slides';
export function Slides({note,notes,onOpen,onClose,service}:{note:Note;notes:Note[];onOpen:(target:string)=>void;onClose:()=>void;service?:SlidesService}) {
  const [index,setIndex]=useState(0);
  const slides=service?service.parse(note.content):note.content.replace(/^---\n[\s\S]*?\n---\n/,'').split(/\n---+\n/);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();setIndex(i=>Math.min(slides.length-1,i+1));}if(e.key==='ArrowLeft')setIndex(i=>Math.max(0,i-1));};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[slides.length,onClose]);
  return <section className="slides-view"><header><span>Presentation</span><button aria-label="Exit presentation" onClick={onClose}><X size={20}/></button></header><div className="slide"><Markdown content={slides[index]} notes={notes} path={note.path} onOpen={onOpen}/></div><footer><button aria-label="Previous slide" disabled={!index} onClick={()=>setIndex(index-1)}><ChevronLeft/></button><span>{index+1} / {slides.length}</span><button aria-label="Next slide" disabled={index===slides.length-1} onClick={()=>setIndex(index+1)}><ChevronRight/></button><button aria-label="Fullscreen" onClick={()=>document.documentElement.requestFullscreen?.()}><Maximize size={18}/></button></footer></section>;
}
