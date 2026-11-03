const {contextBridge,ipcRenderer}=require('electron');
const invoke=(name)=>(...args)=>ipcRenderer.invoke('engine:'+name,...args);
let closeListenerCount=0;
function onBeforeClose(fn){
  const listener=()=>fn();let active=true;
  ipcRenderer.on('engine:before-close',listener);
  if(++closeListenerCount===1)invoke('close-listener-ready')().catch(error=>console.error('Close listener registration failed',error));
  return()=>{
    if(!active)return;active=false;
    ipcRenderer.removeListener('engine:before-close',listener);
    if(--closeListenerCount===0)invoke('close-listener-unready')().catch(()=>{});
  };
}
const api={
  desktop:true,
  ...Object.fromEntries(['readBinary','writeBinary','createBinary','modifyBinary'].map(name=>[name,invoke(name)])),
  ...Object.fromEntries(['vault','choose','list','read','write','create','append','pluginData','mkdir','rename','trash','state','asset','attach','snapshots','restore','plugins','print','unsafeEval','setUnsafeEval','nativePlugins','setNativePlugins','trustProfile'].map(name=>[name,invoke(name)])),
  onChange:fn=>{const listener=()=>fn();ipcRenderer.on('vault:changed',listener);return()=>ipcRenderer.removeListener('vault:changed',listener);},
  onBeforeClose,
  closeReady:invoke('close-ready')
};
if(typeof process!=='undefined'&&process.contextIsolated===false)window.engine=api;
else contextBridge.exposeInMainWorld('engine',api);
ipcRenderer.on('engine:command',(_,id)=>window.dispatchEvent(new CustomEvent('engine-command',{detail:id})));
