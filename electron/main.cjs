const {app,BrowserWindow,ipcMain,dialog,Menu,shell,protocol,net} = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const {pathToFileURL} = require('node:url');
let win, vault, watcher, Vault, currentRoot, closeAllowed=false;
protocol.registerSchemesAsPrivileged([{scheme:'engine', privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
app.setName('Crafactory Engine');
const development = process.env.ENGINE_DEV === '1';
async function openVault(root) {
  vault = await new Vault(root).init(); currentRoot=root;
  await fs.writeFile(path.join(app.getPath('userData'),'last-vault.json'),JSON.stringify({root}));
  if(watcher) await watcher.close();
  const {watch} = await import('chokidar');
  watcher=watch(root,{ignoreInitial:true,ignored:p=>p.split(path.sep).some(s=>s.startsWith('.')),awaitWriteFinish:{stabilityThreshold:300,pollInterval:100}});
  watcher.on('all',()=>win && !win.isDestroyed() && win.webContents.send('vault:changed'));
}
function ipc(name, handler) {
  ipcMain.handle('engine:'+name,async(event,...args)=>{
    if(!win || event.sender!==win.webContents || event.senderFrame!==win.webContents.mainFrame) throw new Error('Untrusted caller');
    return handler(...args);
  });
}
async function start() {
  ({Vault}=await import('../core/vault.mjs'));
  protocol.handle('engine', request=>{
    const url=new URL(request.url);
    if(url.hostname !== 'app') return new Response('Forbidden',{status:403});
    const relative=decodeURIComponent(url.pathname).replace(/^\/+/,'');
    const file=path.resolve(__dirname,'../dist',relative || 'index.html');
    const root=path.resolve(__dirname,'../dist');
    if(file!==root && !file.startsWith(root+path.sep)) return new Response('Forbidden',{status:403});
    return net.fetch(pathToFileURL(file).toString());
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
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}
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
  win.on('close',event=>{
    if(!closeAllowed){event.preventDefault();win.webContents.send('engine:before-close');}
  });
  ipc('close-ready',()=>{closeAllowed=true;win.close();});
  ipc('vault',async()=>({name:path.basename(currentRoot),root:currentRoot,entries:await vault.list(),state:await vault.loadState()}));
  ipc('choose',async(create=false)=>{
    const result=await dialog.showOpenDialog(win,{title:create?'Choose a folder for your new vault':'Open vault',properties:['openDirectory',...(create?['createDirectory']:[])]});
    if(result.canceled)return false;
    await openVault(result.filePaths[0]); return true;
  });
  for(const name of ['list','read','write','mkdir','rename','trash','asset','attach','snapshots','restore','plugins'])ipc(name,(...args)=>vault[name](...args));
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
  await win.loadURL(development?'http://127.0.0.1:5173':'engine://app/index.html');
}
app.whenReady().then(start).catch(e=>{dialog.showErrorBox('Crafactory Engine',e.message);app.quit();});
app.on('window-all-closed',()=>app.quit());
app.on('window-all-closed',()=>watcher?.close());
