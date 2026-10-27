import {useEffect,type RefObject} from 'react';
import {useNodesInitialized,useReactFlow} from '@xyflow/react';

/** Refit read-only geometry when its embedding container changes size or source content. */
export function FitEmbed({host,revision}:{host:RefObject<HTMLElement>;revision:string}){
  const {fitView}=useReactFlow(),ready=useNodesInitialized();
  useEffect(()=>{
    const element=host.current;if(!element||!ready)return;
    let frame=0,disposed=false;
    const fit=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(!disposed&&element.isConnected)void fitView({padding:0.15,minZoom:0.1,maxZoom:1});});};
    const observer=new ResizeObserver(fit);observer.observe(element);fit();
    return()=>{disposed=true;observer.disconnect();cancelAnimationFrame(frame);};
  },[host,revision,ready,fitView]);
  return null;
}
