import {useEffect,useRef,useState} from 'react';
import type {PluginController} from '../plugins';

/** Mount a compatibility plugin's registered view into the main document area. */
export function PluginViewHost({path,viewType,controller}:{path:string;viewType:string;controller?:PluginController}){
  const ref=useRef<HTMLDivElement>(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    let active=true,mounted:{dispose():void}|undefined;
    setFailed(false);
    const mount=controller?.mountView;
    if(!ref.current||!mount){setFailed(true);return;}
    mount(viewType,path,ref.current).then(result=>{if(active)mounted=result;else result.dispose();}).catch(()=>{if(active)setFailed(true);});
    return ()=>{active=false;mounted?.dispose();};
  },[path,viewType,controller]);
  return <div className="plugin-view-host" ref={ref}>{failed&&<div className="empty workspace-empty"><h1>Plugin view unavailable</h1><p>Enable the providing plugin or reopen the file.</p></div>}</div>;
}
