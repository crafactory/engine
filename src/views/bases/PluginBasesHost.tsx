import {useEffect,useRef,useState} from 'react';
import type {PluginController} from '../../plugins';

/** Mount a compatibility plugin's Bases view and dispose it with the React tree. */
export default function PluginBasesHost({controller,id,config}:{controller:PluginController;id:string;config:unknown}){
  const ref=useRef<HTMLDivElement>(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    if(!ref.current)return;
    let mounted:{dispose():void}|undefined;
    try{mounted=controller.mountBasesView?.(id,ref.current,config);}catch(error){console.error('Plugin Bases view failed',error);setFailed(true);}
    return()=>mounted?.dispose();
  },[controller,id,config]);
  return <div className="plugin-bases-host" ref={ref}>{failed&&<div className="empty"><p>Bases view unavailable.</p></div>}</div>;
}
