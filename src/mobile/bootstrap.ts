import {Capacitor,registerPlugin} from '@capacitor/core';
import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
import {App as NativeApp} from '@capacitor/app';
import {Keyboard} from '@capacitor/keyboard';
import {Share} from '@capacitor/share';
import type {Bridge} from '../types';
import {createMobileStorage,encodeBytes,type MobileFilesystem} from './storage';

/** Must run before importing App or bridge.ts, which snapshots window.engine. */
export async function bootstrapAndroid():Promise<Bridge>{
  if(!Capacitor.isNativePlatform()||Capacitor.getPlatform()!=='android')throw new Error('Android native runtime required');
  const policy=document.createElement('meta');policy.httpEquiv='Content-Security-Policy';
  policy.content="default-src 'self'; script-src 'self' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss: blob: data:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'";
  const {tablet}=await registerPlugin<{info():Promise<{tablet:boolean}>}>('EngineDevice').info();
  document.head.append(policy);document.body.classList.add('native-android','is-mobile','is-android');
  document.body.classList.toggle('is-phone',!tablet);
  document.body.classList.toggle('is-tablet',tablet);
  const fs:MobileFilesystem={
    stat:async path=>{const info=await Filesystem.stat({path,directory:Directory.Data});return {...info,ctime:info.ctime??info.mtime};},
    readdir:async path=>(await Filesystem.readdir({path,directory:Directory.Data})).files.map(info=>({...info,ctime:info.ctime??info.mtime})),
    read:async(path,binary=false)=>{
      const result=await Filesystem.readFile({path,directory:Directory.Data,...(!binary?{encoding:Encoding.UTF8}:{})});
      if(typeof result.data!=='string')throw new Error('Native filesystem returned non-string data');return result.data;
    },
    write:async(path,data,binary=false)=>{await Filesystem.writeFile({path,data,directory:Directory.Data,...(!binary?{encoding:Encoding.UTF8}:{})});},
    mkdir:async path=>{await Filesystem.mkdir({path,directory:Directory.Data,recursive:true});},
    rename:async(from,to)=>{await Filesystem.rename({from,to,directory:Directory.Data});},
    remove:async(path,directory=false)=>{if(directory)await Filesystem.rmdir({path,directory:Directory.Data,recursive:true});else await Filesystem.deleteFile({path,directory:Directory.Data});},
    asset:async path=>Capacitor.convertFileSrc((await Filesystem.getUri({path,directory:Directory.Data})).uri)
  };
  const bridge=await createMobileStorage(fs);
  const suspend=new Set<()=>Promise<void>>(),back=new Set<()=>Promise<boolean>>();
  let keyboardOpen=false,handlingBack=false;
  const keyboard=(open:boolean)=>{keyboardOpen=open;document.body.classList.toggle('native-keyboard-open',open);};
  await Keyboard.addListener('keyboardWillShow',()=>keyboard(true));
  await Keyboard.addListener('keyboardDidShow',()=>keyboard(true));
  await Keyboard.addListener('keyboardWillHide',()=>keyboard(false));
  await Keyboard.addListener('keyboardDidHide',()=>keyboard(false));
  const report=(error:unknown)=>{
    console.error('Android lifecycle save failed',error);
    window.dispatchEvent(new CustomEvent('engine:native-error',{detail:String(error)}));
  };
  const flush=async()=>{for(const handler of suspend)await handler();};
  await NativeApp.addListener('appStateChange',({isActive})=>{if(!isActive)void flush().catch(report);});
  await NativeApp.addListener('backButton',()=>{
    if(handlingBack)return;handlingBack=true;
    void(async()=>{
      if(keyboardOpen){await Keyboard.hide();return;}
      for(const handler of [...back].reverse())if(await handler())return;
      await flush();await NativeApp.minimizeApp();
    })().catch(report).finally(()=>{handlingBack=false;});
  });
  return {
    ...bridge,
    formFactor:tablet?'tablet':'phone',
    onSuspend:handler=>{suspend.add(handler);return()=>suspend.delete(handler);},
    onBack:handler=>{back.add(handler);return()=>back.delete(handler);},
    exportFile:async(name,content)=>{
      // Only an explicit user export reaches the OS share sheet. Do not publish notes.
      const safe=name.replace(/[\\/\u0000-\u001f:]/g,'_')||'vault.zip';
      const path='exports/'+crypto.randomUUID()+'/'+safe;
      await Filesystem.writeFile({path,data:encodeBytes(new Uint8Array(await content.arrayBuffer())),directory:Directory.Cache,recursive:true});
      const {uri}=await Filesystem.getUri({path,directory:Directory.Cache});
      await Share.share({title:safe,dialogTitle:'Export from Crafactory Engine',files:[uri]});
    }
  };
}
