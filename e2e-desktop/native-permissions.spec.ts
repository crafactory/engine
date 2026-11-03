import {test,expect,_electron as electron} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {nativeTestEnv} from './native-env';

for(const active of [false,true])test(`restart notices clear when both saved trust switches return to startup ${active}`,async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'engine-trust-revert-')),profile=await fs.mkdtemp(path.join(os.tmpdir(),'engine-trust-profile-'));
  await fs.writeFile(path.join(root,'Test.md'),'Trust reversion fixture');
  await fs.writeFile(path.join(profile,'trusted-renderer.json'),JSON.stringify({unsafeEval:active,nativePlugins:active}));
  const app=await electron.launch({executablePath:process.env.E2E_EXECUTABLE_PATH,args:['--no-sandbox',...(process.env.E2E_EXECUTABLE_PATH?[]:[path.resolve('electron/main.cjs')]),'--vault',root,'--user-data-dir='+profile],env:nativeTestEnv(profile)});
  try{
    const page=await app.firstWindow();await expect(page.locator('.note-title h1')).toHaveText('Test');
    await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1,checkboxChecked:false});});
    await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Community plugins',exact:true}).click();
    for(const [label,confirm,notice]of [
      ['Allow unsafe-eval in trusted renderer','Enable unsafe-eval','Restart Crafactory Engine to apply the unsafe-eval change.'],
      ['Allow native Node.js plugins','Enable native plugins','Restart Crafactory Engine to apply the native plugin permission change, including revocation.']
    ]){
      const toggle=page.getByRole('switch',{name:label,exact:true}),status=page.getByRole('status').filter({hasText:notice});
      await expect(toggle).toBeEnabled();await expect(toggle).toBeChecked({checked:active});
      await toggle.click();if(!active)await page.getByRole('button',{name:confirm,exact:true}).click();
      await expect(toggle).toBeChecked({checked:!active});await expect(status).toBeVisible();
      await toggle.click();if(active)await page.getByRole('button',{name:confirm,exact:true}).click();
      await expect(toggle).toBeChecked({checked:active});await expect(status).toHaveCount(0);
    }
    expect(await page.evaluate(()=>window.engine!.trustProfile!())).toEqual({saved:{unsafeEval:active,nativePlugins:active},active:{unsafeEval:active,nativePlugins:active}});
  }finally{await app.close();await fs.rm(root,{recursive:true,force:true});await fs.rm(profile,{recursive:true,force:true});}
});

test('pending layout writes cannot leak the departing workspace into another vault',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'engine-layout-first-')),next=await fs.mkdtemp(path.join(os.tmpdir(),'engine-layout-second-')),profile=await fs.mkdtemp(path.join(os.tmpdir(),'engine-layout-profile-'));
  await fs.writeFile(path.join(root,'Test.md'),'first');await fs.writeFile(path.join(next,'Other.md'),'second');await fs.mkdir(path.join(next,'.crafactory'));
  await fs.writeFile(path.join(next,'.crafactory/state.json'),JSON.stringify({layout:{tabs:['Other.md'],active:'Other.md',split:null,left:true,right:true,mode:'reading'}}));
  const app=await electron.launch({executablePath:process.env.E2E_EXECUTABLE_PATH,args:['--no-sandbox',...(process.env.E2E_EXECUTABLE_PATH?[]:[path.resolve('electron/main.cjs')]),'--vault',root,'--user-data-dir='+profile],env:nativeTestEnv(profile)});
  try{
    const page=await app.firstWindow();await expect(page.locator('.note-title h1')).toHaveText('Test');
    await app.evaluate(({dialog,ipcMain},next)=>{
      dialog.showOpenDialog=async()=>({canceled:false,filePaths:[next]});
      ipcMain.removeHandler('engine:vault');ipcMain.handle('engine:vault',async()=>{
        // Hold initialization after the real native vault has switched, spanning the old debounce.
        await new Promise(resolve=>setTimeout(resolve,1100));const fs=process.getBuiltinModule('fs').promises,path=process.getBuiltinModule('path');
        return {name:'Second',root:next,entries:[{path:'Other.md',name:'Other.md',folder:false,size:6,ctime:0,mtime:0}],state:JSON.parse(await fs.readFile(path.join(next,'.crafactory/state.json'),'utf8'))};
      });
    },next);
    await page.getByRole('button',{name:'Collapse right sidebar',exact:true}).click();
    await page.getByRole('button',{name:'Open another vault',exact:true}).click();
    await expect.poll(async()=>({title:await page.locator('.note-title h1').textContent(),errors:await page.locator('.error-banner').allTextContents()})).toEqual({title:'Other',errors:[]});
    expect(JSON.parse(await fs.readFile(path.join(next,'.crafactory/state.json'),'utf8')).layout.active).toBe('Other.md');
  }finally{await app.close();for(const folder of [root,next,profile])await fs.rm(folder,{recursive:true,force:true});}
});

test('native permission is cancellable, preserves eval settings, grants real Node only after restart and revokes after restart',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'engine-native-vault-'));
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'engine-native-profile-'));
  const outside=await fs.mkdtemp(path.join(os.tmpdir(),'engine-native-outside-'));
  await fs.writeFile(path.join(root,'Test.md'),'Native permission fixture');
  const pluginDir=path.join(root,'.crafactory','plugins','native-fixture'),packageResult=path.join(outside,'package-result.json');
  await fs.mkdir(pluginDir,{recursive:true});
  await fs.writeFile(path.join(pluginDir,'manifest.json'),JSON.stringify({id:'native-fixture',name:'Native Fixture',version:'1.0.0'}));
  await fs.writeFile(path.join(pluginDir,'dependency.cjs'),'module.exports = {value: "relative dependency"};');
  await fs.writeFile(path.join(pluginDir,'main.js'),`const {Plugin}=require('obsidian');const fs=require('node:fs');const dependency=require('./dependency.cjs');const commonJSReceiver=this===exports;module.exports=class extends Plugin{onload(){fs.writeFileSync(${JSON.stringify(packageResult)},JSON.stringify({value:dependency.value,resolved:require.resolve('./dependency.cjs'),dirname:__dirname,filename:__filename,moduleFilename:module.filename,loaded:module.loaded,commonJSReceiver}));}};`);
  const settingsFile=path.join(profile,'trusted-renderer.json');
  await fs.writeFile(settingsFile,JSON.stringify({unsafeEval:true}));
  const launch=()=>electron.launch({executablePath:process.env.E2E_EXECUTABLE_PATH,args:['--no-sandbox',...(process.env.E2E_EXECUTABLE_PATH?[]:[path.resolve('electron/main.cjs')]),'--vault',root,'--user-data-dir='+profile],env:nativeTestEnv(profile)});
  let app=await launch();
  try{
    let page=await app.firstWindow();
    const settings=async()=>{await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Community plugins',exact:true}).click();};
    await expect(page.locator('.note-title h1')).toHaveText('Test');
    const second=spawn(app.process().spawnfile,['--no-sandbox',...(process.env.E2E_EXECUTABLE_PATH?[]:[path.resolve('electron/main.cjs')]),'--vault',root,'--user-data-dir='+profile],{env:nativeTestEnv(profile),stdio:'ignore'});
    try{await expect.poll(()=>second.exitCode,{timeout:10000}).toBe(0);}finally{if(second.exitCode===null)second.kill();}
    expect(await page.evaluate(()=>typeof (window as any).require)).toBe('undefined');
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content',/font-src 'self' data:;/);
    await settings();
    let toggle=page.getByRole('switch',{name:'Allow native Node.js plugins',exact:true});
    await toggle.click();await expect(page.getByRole('alert')).toContainText('every script');
    await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(toggle).not.toBeChecked();
    await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:0,checkboxChecked:false});});
    await toggle.click();await page.getByRole('button',{name:'Enable native plugins',exact:true}).click();
    await expect(toggle).not.toBeChecked();
    expect(JSON.parse(await fs.readFile(settingsFile,'utf8'))).toEqual({unsafeEval:true});
    await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1,checkboxChecked:false});});
    await toggle.click();await page.getByRole('button',{name:'Enable native plugins',exact:true}).click();
    await expect(toggle).toBeChecked();
    expect(await page.evaluate(()=>typeof (window as any).require)).toBe('undefined');
    expect(JSON.parse(await fs.readFile(settingsFile,'utf8'))).toEqual({unsafeEval:true,nativePlugins:true});
    await app.close();app=await launch();page=await app.firstWindow();
    await expect(page.locator('.note-title h1')).toHaveText('Test');
    expect(await page.evaluate(()=>typeof (window as any).require)).toBe('function');
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content',/font-src 'self' data: blob: https:;/);
    await settings();await page.getByLabel('Runtime for Native Fixture',{exact:true}).selectOption('renderer');
    const pluginSwitch=page.getByRole('switch',{name:'Enable Native Fixture',exact:true});
    await pluginSwitch.click();await page.getByTestId('dialog-submit').click();await expect(pluginSwitch).toBeChecked();
    expect(JSON.parse(await fs.readFile(packageResult,'utf8'))).toEqual({value:'relative dependency',resolved:path.join(pluginDir,'dependency.cjs'),dirname:pluginDir,filename:path.join(pluginDir,'main.js'),moduleFilename:path.join(pluginDir,'main.js'),loaded:true,commonJSReceiver:true});
    await pluginSwitch.click();await expect(pluginSwitch).not.toBeChecked();
    await page.getByTestId('settings-close').click();
    const target=path.join(outside,'native-fixture.bin');
    const result=await page.evaluate(async target=>{
      const require=(window as any).require;
      require('node:fs').writeFileSync(target,require('node:buffer').Buffer.from([0,255,42]));
      return await new Promise<string>((resolve,reject)=>require('node:child_process').execFile('git',['--version'],(error:Error|null,stdout:string)=>error?reject(error):resolve(stdout)));
    },target);
    expect([...await fs.readFile(target)]).toEqual([0,255,42]);expect(result).toMatch(/^git version /);
    await settings();toggle=page.getByRole('switch',{name:'Allow native Node.js plugins',exact:true});
    await expect(toggle).toBeChecked();await toggle.click();await expect(toggle).not.toBeChecked();
    // Disabling cannot retroactively remove already-granted Node access.
    expect(await page.evaluate(()=>typeof (window as any).require)).toBe('function');
    expect(JSON.parse(await fs.readFile(settingsFile,'utf8'))).toEqual({unsafeEval:true,nativePlugins:false});
    await app.close();app=await launch();page=await app.firstWindow();
    await expect(page.locator('.note-title h1')).toHaveText('Test');
    expect(await page.evaluate(()=>typeof (window as any).require)).toBe('undefined');
    expect(await page.evaluate(()=>window.engine?.desktop)).toBe(true);
    await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1,checkboxChecked:false});});
    expect(await page.evaluate(()=>Promise.all([window.engine!.setNativePlugins!(true),window.engine!.setNativePlugins!(false)]))).toEqual([true,false]);
    expect(JSON.parse(await fs.readFile(settingsFile,'utf8'))).toEqual({unsafeEval:true,nativePlugins:false});
    expect(await page.evaluate(()=>typeof (window as any).require)).toBe('undefined');
    // Failed persistence must not leave an in-memory grant or an unhandled UI rejection.
    await fs.rename(settingsFile,settingsFile+'.backup');await fs.mkdir(settingsFile);
    await settings();await page.getByRole('switch',{name:'Allow native Node.js plugins',exact:true}).click();
    await page.getByRole('button',{name:'Enable native plugins',exact:true}).click();
    await expect(page.getByRole('alert')).toContainText('Error');
    await expect(page.getByRole('switch',{name:'Allow native Node.js plugins',exact:true})).not.toBeChecked();
    expect(await page.evaluate(()=>window.engine!.nativePlugins!())).toBe(false);
    await page.getByRole('switch',{name:'Allow unsafe-eval in trusted renderer',exact:true}).click();
    await expect(page.getByRole('alert').filter({hasText:'Error'})).toHaveCount(2);
    await expect(page.getByRole('switch',{name:'Allow unsafe-eval in trusted renderer',exact:true})).toBeChecked();
    expect(await page.evaluate(()=>window.engine!.unsafeEval!())).toBe(true);
    await fs.rm(settingsFile,{recursive:true});await fs.rename(settingsFile+'.backup',settingsFile);
  }finally{await app.close();await fs.rm(root,{recursive:true,force:true});await fs.rm(profile,{recursive:true,force:true});await fs.rm(outside,{recursive:true,force:true});}
});
