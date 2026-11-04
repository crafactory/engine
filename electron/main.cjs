const {app,BrowserWindow,ipcMain,dialog,Menu,shell,protocol,net} = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const {pathToFileURL} = require('node:url');
let win, vault, watcher, Vault, currentRoot, closeAllowed=false,closePending=false,closeListenerReady=false;
let unsafeEvalEnabled=false, activeUnsafeEval=false;
let nativePluginsEnabled=false,activeNativePlugins=false;
protocol.registerSchemesAsPrivileged([{scheme:'engine', privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
app.setName('Crafactory Engine');
// One writer per userData profile: stale processes must not restore revoked grants.
const singleInstance=app.requestSingleInstanceLock();
if(!singleInstance)app.quit();
else app.on('second-instance',()=>{if(win&&!win.isDestroyed()){if(win.isMinimized())win.restore();win.focus();}});
const development = process.env.ENGINE_DEV === '1';
/** Replace the active vault and watcher, then persist the chosen root for restart. */
async function openVault(root) {
  vault = await new Vault(root).init(); currentRoot=root;
  await fs.writeFile(path.join(app.getPath('userData'),'last-vault.json'),JSON.stringify({root}));
  if(watcher) await watcher.close();
  const {watch} = await import('chokidar');
  watcher=watch(root,{ignoreInitial:true,ignored:p=>p.split(path.sep).some(s=>s.startsWith('.')),awaitWriteFinish:{stabilityThreshold:300,pollInterval:100}});
  watcher.on('all',()=>win && !win.isDestroyed() && win.webContents.send('vault:changed'));
}
/** Expose an operation only to this window's current main frame. */
function ipc(name, handler) {
  ipcMain.handle('engine:'+name,async(event,...args)=>{
    if(!win || event.sender!==win.webContents || event.senderFrame!==win.webContents.mainFrame) throw new Error('Untrusted caller');
    return handler(...args);
  });
}
/** Freeze startup privileges, install guarded desktop IPC and load the matching entry page. */
async function start() {
  ({Vault}=await import('../core/vault.mjs'));
  try{const settings=JSON.parse(await fs.readFile(path.join(app.getPath('userData'),'trusted-renderer.json'),'utf8'));unsafeEvalEnabled=settings.unsafeEval===true;nativePluginsEnabled=settings.nativePlugins===true;}catch{}
  activeUnsafeEval=unsafeEvalEnabled;activeNativePlugins=nativePluginsEnabled&&!development;
  protocol.handle('engine', async request=>{
    const url=new URL(request.url);
    if(url.hostname !== 'app') return new Response('Forbidden',{status:403});
    const relative=decodeURIComponent(url.pathname).replace(/^\/+/,'');
    const root=path.resolve(__dirname,'../dist');
    const file=path.resolve(root,relative || 'index.html');
    if(file===path.join(root,'trusted.html')&&!activeUnsafeEval)return new Response('Forbidden',{status:403});
    if(file!==root && !file.startsWith(root+path.sep)) return new Response('Forbidden',{status:403});
    const response=await net.fetch(pathToFileURL(file).toString());
    if(activeNativePlugins&&response.ok&&[path.join(root,'index.html'),path.join(root,'trusted.html')].includes(file)){
      const html=(await response.text()).replace("font-src 'self' data:","font-src 'self' data: blob: https:").replace("connect-src 'self' ws:","connect-src 'self' ws: wss: https:").replace("media-src 'self' data: blob:","media-src 'self' data: blob: https:");
      const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  });
  let last;
  try {last=JSON.parse(await fs.readFile(path.join(app.getPath('userData'),'last-vault.json'),'utf8')).root;} catch {}
  const vaultArg=process.argv.indexOf('--vault');
  const requested=vaultArg>=0?process.argv[vaultArg+1]:undefined;
  await openVault(requested || last || path.join(app.getPath('documents'),'Crafactory Vault'));
  win = new BrowserWindow({
    width:1440,height:940,minWidth:720,minHeight:480,backgroundColor:'#202322',
    icon:path.join(__dirname,'../public/icon.png'),
    title:'Crafactory Engine',
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:!activeNativePlugins,nodeIntegration:activeNativePlugins,nodeIntegrationInSubFrames:false,nodeIntegrationInWorker:false,webviewTag:false,sandbox:!activeNativePlugins,webSecurity:true}
  });
  win.webContents.setWindowOpenHandler(({url}) => {
    if(/^https?:\/\//.test(url)) shell.openExternal(url);
    return {action:'deny'};
  });
  win.webContents.on('will-navigate',(event,url)=>{
    if(url.startsWith('engine://app/') || (development && url.startsWith('http://127.0.0.1:5173/')))return;
    event.preventDefault(); if(/^https?:\/\//.test(url))shell.openExternal(url);
  });
  win.webContents.session.setPermissionRequestHandler((contents,permission,callback)=>callback(contents===win.webContents && permission==='media'));
  win.webContents.on('did-start-navigation',(_event,_url,isInPlace,isMainFrame)=>{if(isMainFrame&&!isInPlace)closeListenerReady=false;});
  win.on('close',event=>{
    if(!closeAllowed){event.preventDefault();if(closeListenerReady)win.webContents.send('engine:before-close');else closePending=true;}
  });
  // Early close requests must survive until the renderer has installed its save/unload handler.
  ipc('close-listener-ready',()=>{closeListenerReady=true;if(closePending){closePending=false;win.webContents.send('engine:before-close');}});
  ipc('close-listener-unready',()=>{closeListenerReady=false;});
  ipc('close-ready',()=>{closeAllowed=true;win.close();});
  ipc('unsafeEval',()=>unsafeEvalEnabled);
  const trustProfile=()=>({saved:{unsafeEval:unsafeEvalEnabled,nativePlugins:nativePluginsEnabled},active:{unsafeEval:activeUnsafeEval,nativePlugins:activeNativePlugins}});
  ipc('trustProfile',trustProfile);
  let trustSettingsQueue=Promise.resolve();
  const withTrustLock=action=>{const result=trustSettingsQueue.then(action);trustSettingsQueue=result.catch(()=>{});return result;};
  const saveTrustSettings=async()=>{const target=path.join(app.getPath('userData'),'trusted-renderer.json');await fs.writeFile(target+'.tmp',JSON.stringify({unsafeEval:unsafeEvalEnabled,nativePlugins:nativePluginsEnabled}),{mode:0o600});await fs.rename(target+'.tmp',target);};
  ipc('nativePlugins',()=>nativePluginsEnabled);
  ipc('readBinary',p=>vault.readBinary(p));
  for(const [operation,mode]of [['writeBinary','write'],['createBinary','create'],['modifyBinary','modify']])ipc(operation,(p,data)=>vault.writeBinary(p,data,mode));
  ipc('setNativePlugins',enabled=>withTrustLock(async()=>{
    if(enabled===true&&!nativePluginsEnabled){
      if(development)throw new Error('Native plugins are unavailable on the development HTTP origin');
      const result=await dialog.showMessageBox(win,{type:'warning',buttons:['Cancel','Enable native plugins'],defaultId:0,cancelId:0,noLink:true,title:'Trust native plugins?',message:'Give this desktop renderer full access to your computer?',detail:'Every script and trusted-renderer plugin in this profile can read and write files outside the vault, execute commands, access credentials and use the network. This is NOT a per-plugin sandbox. Enable only code you fully trust. Restart is required to grant or revoke this access; disabling a plugin cannot undo its effects.'});
      if(result.response!==1)return nativePluginsEnabled;
    }
    const previous=nativePluginsEnabled;nativePluginsEnabled=enabled===true;
    try{await saveTrustSettings();}catch(error){nativePluginsEnabled=previous;throw error;}win.webContents.send('engine:trust-profile-changed',trustProfile());return nativePluginsEnabled;
  }));
  ipc('setUnsafeEval',enabled=>withTrustLock(async()=>{
    if(enabled===true&&!unsafeEvalEnabled){
      const result=await dialog.showMessageBox(win,{type:'warning',buttons:['Cancel','Enable unsafe-eval'],defaultId:0,cancelId:0,noLink:true,title:'Allow unsafe-eval?',message:'Allow trusted-renderer plugins to run eval?',detail:'DataviewJS and dv.view require this. It weakens the Content Security Policy and takes effect after restart. Plugins remain unsandboxed.'});
      if(result.response!==1)return unsafeEvalEnabled;
    }
    const previous=unsafeEvalEnabled;unsafeEvalEnabled=enabled===true;
    try{await saveTrustSettings();}catch(error){unsafeEvalEnabled=previous;throw error;}win.webContents.send('engine:trust-profile-changed',trustProfile());
    return unsafeEvalEnabled;
  }));
  ipc('vault',async()=>({name:path.basename(currentRoot),root:currentRoot,entries:await vault.list(),state:await vault.loadState()}));
  ipc('choose',async(create=false)=>{
    const result=await dialog.showOpenDialog(win,{title:create?'Choose a folder for your new vault':'Open vault',properties:['openDirectory',...(create?['createDirectory']:[])]});
    if(result.canceled)return false;
    await openVault(result.filePaths[0]); return true;
  });
  for(const name of ['list','read','write','create','append','pluginData','mkdir','rename','trash','asset','attach','snapshots','restore','plugins'])ipc(name,(...args)=>vault[name](...args));
  ipc('state',state=>vault.saveState(state));
  ipc('print',async()=>{
    const result=await dialog.showSaveDialog(win,{defaultPath:'Crafactory-note.pdf',filters:[{name:'PDF',extensions:['pdf']}]});
    if(!result.canceled && result.filePath)await fs.writeFile(result.filePath,await win.webContents.printToPDF({printBackground:true,preferCSSPageSize:true}));
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:'Crafactory Engine',submenu:[{role:'about'},{role:'quit'}]},
    {label:'File',submenu:[{label:'Open vault…',accelerator:'CmdOrCtrl+Shift+O',click:()=>win.webContents.send('engine:command','open-vault')},{label:'New note',accelerator:'CmdOrCtrl+N',click:()=>win.webContents.send('engine:command','new-note')},{label:'Export PDF',click:()=>win.webContents.send('engine:command','export-pdf')}]},
    {label:'Edit',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
    {label:'View',submenu:[{role:'reload'},{role:'toggleDevTools'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]},
    {label:'Window',submenu:[{role:'minimize'},{role:'close'}]}
  ]));
  await win.loadURL(development?`http://127.0.0.1:5173/${activeUnsafeEval?'trusted.html':''}`:`engine://app/${activeUnsafeEval?'trusted.html':'index.html'}`);
}
if(singleInstance)app.whenReady().then(start).catch(e=>{dialog.showErrorBox('Crafactory Engine',e.message);app.quit();});
app.on('window-all-closed',()=>app.quit());
app.on('window-all-closed',()=>watcher?.close());
