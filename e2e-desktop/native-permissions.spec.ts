import {test,expect,_electron as electron} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {nativeTestEnv} from './native-env';

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
    await fs.rm(settingsFile,{recursive:true});await fs.rename(settingsFile+'.backup',settingsFile);
  }finally{await app.close();await fs.rm(root,{recursive:true,force:true});await fs.rm(profile,{recursive:true,force:true});await fs.rm(outside,{recursive:true,force:true});}
});
