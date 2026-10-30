const {contextBridge,ipcRenderer}=require('electron');
const invoke=(name)=>(...args)=>ipcRenderer.invoke('engine:'+name,...args);
contextBridge.exposeInMainWorld('engine',{
  desktop:true,
  ...Object.fromEntries(['vault','choose','list','read','write','create','append','pluginData','mkdir','rename','trash','state','asset','attach','snapshots','restore','plugins','print','unsafeEval','setUnsafeEval'].map(name=>[name,invoke(name)])),
  onChange:fn=>{const listener=()=>fn();ipcRenderer.on('vault:changed',listener);return()=>ipcRenderer.removeListener('vault:changed',listener);},
  onBeforeClose:fn=>{const listener=()=>fn();ipcRenderer.on('engine:before-close',listener);return()=>ipcRenderer.removeListener('engine:before-close',listener);},
  closeReady:invoke('close-ready')
});
ipcRenderer.on('engine:command',(_,id)=>window.dispatchEvent(new CustomEvent('engine-command',{detail:id})));
