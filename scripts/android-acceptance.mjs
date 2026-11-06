/* Original native acceptance. Pinned plugin bytes are only hashed, installed and executed. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {setTimeout as wait} from 'node:timers/promises';
import {deflateSync} from 'node:zlib';
import {chromium,expect} from '@playwright/test';
import JSZip from 'jszip';

const APP='com.crafactory.engine',APK=path.resolve('android/app/build/outputs/apk/debug/app-debug.apk');
const output=path.resolve('test-results-android');await fs.mkdir(output,{recursive:true});
const records=[],errors=[],consoleErrors=[],expectedConsoleErrorIndexes=new Set();
const metadata={testedHead:process.env.ENGINE_TESTED_HEAD||'',apkSha256:'',androidApi:'',webView:''};
let browser,page;
const quote=value=>"'"+value.replaceAll("'","'\\''")+"'";
const adb=(...args)=>execFileSync('adb',args,{encoding:'utf8',timeout:30000,maxBuffer:16*1024*1024});
const shell=command=>adb('shell','-T',command);
const readNative=relative=>shell(`run-as ${APP} cat ${quote('files/'+relative)}`);
const rawNative=relative=>execFileSync('adb',['exec-out',`run-as ${APP} cat ${quote(relative)}`],{maxBuffer:64*1024*1024});
const readJSON=relative=>JSON.parse(readNative(relative));
const resumed=()=>/mResumedActivity:.*com\.crafactory\.engine|topResumedActivity=.*com\.crafactory\.engine/.test(shell('dumpsys activity activities'));
async function writeNative(relative,bytes){
  const full='files/'+relative,command=`mkdir -p ${quote(path.posix.dirname(full))} && cat > ${quote(full)}`;
  execFileSync('adb',['shell','-T',`run-as ${APP} sh -c ${quote(command)}`],{input:bytes,timeout:30000});
}
async function step(name,action){
  const start=Date.now();console.log('ANDROID '+name);
  try{await action();records.push({name,status:'passed',milliseconds:Date.now()-start});}
  catch(error){records.push({name,status:'failed',error:String(error),milliseconds:Date.now()-start});throw error;}
  finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify({metadata,records,errors,consoleErrors,expectedConsoleErrorIndexes:[...expectedConsoleErrorIndexes]},null,2));}
}
async function connect(){
  let last;const deadline=Date.now()+90000;
  while(Date.now()<deadline){
    try{
      const pid=shell('pidof '+APP).trim().split(/\s+/)[0];
      const socket='webview_devtools_remote_'+pid;
      if(pid&&shell('cat /proc/net/unix').includes(socket)){
        adb('forward','tcp:9222','localabstract:'+socket);
        // A real WebView cannot implement desktop Browser.setDownloadBehavior/context APIs.
        browser=await chromium.connectOverCDP('http://127.0.0.1:9222',{timeout:5000,noDefaults:true});
        page=browser.contexts()[0]?.pages()[0];if(!page)throw new Error('Native WebView has no page');
        page.on('pageerror',error=>{errors.push(error.stack||error.message);console.error('WEBVIEW ERROR',error);});
        page.on('console',message=>{if(message.type()==='error'){consoleErrors.push(message.text());console.error('WEBVIEW CONSOLE',message.text());}});
        await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeVisible({timeout:20000});
        return;
      }
    }catch(error){
      last=error;await browser?.close().catch(()=>{});browser=undefined;
    }
    // Bounded readiness polling of the external emulator, not a fixed startup sleep.
    await wait(500);
  }
  throw new Error('Native CDP connection failed: '+last);
}
async function restart(){
  await browser?.close();browser=undefined;
  shell('am force-stop '+APP);shell(`am start -n ${APP}/.MainActivity`);await connect();
}
const css=`/* @settings
name: Android Probe
id: android-probe
settings:
  - id: android-probe-choice
    title: Native choice
    type: variable-select
    default: narrow
    options:
      - narrow
      - wide
  - id: android-probe-number
    title: Native number
    type: variable-number
    default: 10
    format: px
  - id: android-probe-slider
    title: Native slider
    type: variable-number-slider
    default: 12
    min: 8
    max: 24
    step: 1
    format: px
*/
body { --android-probe-choice: narrow; --android-probe-number: 10px; --android-probe-slider: 12px; }
`;
// Original fixture, not an upstream implementation.
const probe=`const {Plugin,Platform}=require('obsidian');
module.exports=class NativeProbe extends Plugin {
  async onload(){
    await this.saveData({appMobile:this.app.isMobile,renderer:typeof document!=='undefined',...Platform});
    if(typeof document!=='undefined')this.addCommand({id:'modal',name:'Open native probe modal',callback:()=>{
      const {Modal}=require('obsidian');const modal=new Modal(this.app);modal.setTitle('Native probe modal');
      modal.contentEl.textContent='Native Back closes only this modal.';modal.open();
    }});
  }
};`;
function png(width,height){
  const crc=bytes=>{let value=0xffffffff;for(const b of bytes){value^=b;for(let i=0;i<8;i++)value=(value>>>1)^(value&1?0xedb88320:0);}return (value^0xffffffff)>>>0;};
  const chunk=(type,bytes)=>{const tag=Buffer.from(type),length=Buffer.alloc(4),check=Buffer.alloc(4);length.writeUInt32BE(bytes.length);check.writeUInt32BE(crc(Buffer.concat([tag,bytes])));return Buffer.concat([length,tag,bytes,check]);};
  const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
  const rows=Buffer.alloc(height*(1+width*3));for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=y*(1+width*3)+1+x*3;rows[p]=115;rows[p+1]=88;rows[p+2]=190;}
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
async function community(){
  await page.getByRole('button',{name:'Mobile settings',exact:true}).click();
  await page.getByRole('button',{name:'Community plugins',exact:true}).click();
}
async function enable(name,mode='renderer'){
  const control=page.getByRole('switch',{name:'Enable '+name,exact:true});
  await page.getByLabel('Runtime for '+name,{exact:true}).selectOption(mode);
  await control.click();
  await expect(page.getByTestId('dialog-submit')).toBeVisible();await page.getByTestId('dialog-submit').click();
  await expect(control).toBeChecked({timeout:20000});
  await expect(page.locator('.error-banner')).toHaveCount(0);
}
async function closeSettings(){await page.getByTestId('settings-close').click();}
async function command(text){
  await page.getByRole('button',{name:'Mobile commands',exact:true}).click();
  await page.locator('.palette input').fill(text);
  await page.locator('.palette-list button').filter({hasText:text}).first().click();
}
const effects=()=>page.evaluate(()=>['choice','number','slider'].map(name=>getComputedStyle(document.body).getPropertyValue('--android-probe-'+name).trim()));
async function styleTab(){
  await page.evaluate(()=>window.app.workspace.trigger('parse-style-settings'));
  await page.getByRole('button',{name:'Plugin settings Style Settings',exact:true}).click();
  await page.locator('.plugin-settings-content').getByText('Android Probe',{exact:true}).click();
}
const notePath='Native Probe.md',initial='# Native Probe\n\nStart\n\n![Native asset](pixel.png)\n';
let expectedText=initial;
try{
  await step('real APK installation and app-private fixtures',async()=>{
    metadata.apkSha256=crypto.createHash('sha256').update(await fs.readFile(APK)).digest('hex');
    metadata.androidApi=shell('getprop ro.build.version.sdk').trim();
    adb('install','-r',APK);
    await writeNative('vault/'+notePath,initial);await writeNative('vault/pixel.png',png(32,16));
    await writeNative('engine-profile/state.json',JSON.stringify({settings:{mode:'source',css},layout:{tabs:[notePath],active:notePath,split:null,left:false,right:false,mode:'source'}}));
    for(const [id,name,desktop,code]of [
      ['native-probe','Original Native Probe',false,probe],
      ['desktop-probe','Desktop-only Probe',true,'throw new Error("Desktop-only code must not execute on Android");']
    ]){
      const folder='vault/.crafactory/plugins/'+id;
      await writeNative(folder+'/manifest.json',JSON.stringify({id,name,version:'1.0.0',isDesktopOnly:desktop}));
      await writeNative(folder+'/main.js',code);
    }
    const config=JSON.parse(await fs.readFile('docs/compatibility/community-corpus.json','utf8'));
    const pinned=config.plugins.find(plugin=>plugin.name==='Style Settings');assert(pinned);
    const source=path.resolve(process.env.ENGINE_PLUGIN_CORPUS||'.compat-corpus',pinned.directory);
    let manifest;
    for(const [file,digest]of [['manifest.json',pinned.manifest_sha256],['main.js',pinned.main_sha256],...(pinned.styles_sha256?[['styles.css',pinned.styles_sha256]]:[])]){
      const bytes=await fs.readFile(path.join(source,file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),digest,'Upstream fingerprint mismatch');
      if(file==='manifest.json')manifest=JSON.parse(bytes.toString('utf8'));
      await writeNative('vault/.crafactory/plugins/'+pinned.directory+'/'+file,bytes);
    }
    assert.equal(manifest.id,pinned.directory);
    shell(`am start -n ${APP}/.MainActivity`);await connect();
    metadata.webView=browser.version();
    assert.equal(new URL(page.url()).origin,'https://localhost');
    assert.deepEqual(await page.evaluate(()=>({platform:window.engine.platform,persistent:window.engine.persistent,desktop:window.engine.desktop,node:typeof window.require})),{platform:'android',persistent:true,desktop:false,node:'undefined'});
    await expect(page.locator('.statusbar')).toContainText('Saved locally');
    await expect(page.locator('.note-title h1')).toHaveText('Native Probe');
    await expect(page.locator('.ribbon')).toBeHidden();
    const targets=await page.locator('.mobile-nav button').evaluateAll(buttons=>buttons.map(button=>{const r=button.getBoundingClientRect();return {width:r.width,height:r.height};}));
    assert.equal(targets.length,4);assert(targets.every(target=>target.width>=44&&target.height>=44));
    await page.screenshot({path:path.join(output,'android-workspace.png')});
  });
  await step('native filesystem overwrite, Unicode composition and real keyboard/back',async()=>{
    const editor=page.locator('.editor .cm-content').first();await expect(editor).toBeVisible();
    await editor.click();await page.keyboard.press('Control+End');
    const client=await page.context().newCDPSession(page);
    await client.send('Input.imeSetComposition',{text:'中文',selectionStart:2,selectionEnd:2});
    await client.send('Input.insertText',{text:'中文'});
    await client.send('Input.insertText',{text:' Android persisted\n'});
    expectedText=initial+'中文 Android persisted\n';
    await expect.poll(()=>readNative('vault/'+notePath),{timeout:15000}).toBe(expectedText);
    // A real Android touch focuses the editor and must show the emulator's actual IME.
    const rect=await editor.boundingBox(),ratio=await page.evaluate(()=>devicePixelRatio);assert(rect);
    shell(`input tap ${Math.round((rect.x+40)*ratio)} ${Math.round((rect.y+40)*ratio)}`);
    await expect(page.locator('body')).toHaveClass(/native-keyboard-open/,{timeout:15000});
    const ime=shell('dumpsys input_method');await fs.writeFile(path.join(output,'keyboard.txt'),ime);
    assert.match(ime,/mInputShown=true|mIsInputViewShown=true|isInputViewShown=true/);
    await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeHidden();
    await fs.writeFile(path.join(output,'android-keyboard.png'),execFileSync('adb',['exec-out','screencap','-p']));
    shell('input keyevent 4');
    await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeVisible({timeout:10000});
    await expect(page.locator('.note-title h1')).toHaveText('Native Probe');
    await client.detach();
  });
  await step('restart retains exact native bytes and decodes a local asset',async()=>{
    await restart();assert.equal(readNative('vault/'+notePath),expectedText);
    await page.getByRole('button',{name:'Reading view',exact:true}).click();
    const image=page.locator('.reading-surface img').first();
    await expect(image).toBeVisible();
    await expect.poll(()=>image.evaluate(img=>img.complete&&img.naturalWidth),{timeout:15000}).toBe(32);
    assert.match(await image.getAttribute('src'),/^https:\/\/localhost\/_capacitor_file_\//);
    await page.evaluate(bytes=>window.engine.modifyBinary('pixel.png',new Uint8Array(bytes)),[...png(48,16)]);
    await expect.poll(()=>page.locator('.reading-surface img').first().evaluate(img=>img.complete&&img.naturalWidth),{timeout:15000}).toBe(48);
    assert.deepEqual(rawNative('files/vault/pixel.png'),png(48,16));
    await page.screenshot({path:path.join(output,'android-reading.png')});
  });
  await step('native history restores exact saved bytes after restart',async()=>{
    await page.evaluate(async()=>{
      const first=await window.engine.create('Recovery probe.md','Original 中文\n');
      await window.engine.write(first.path,'Replacement\n',first.version);
    });
    await restart();
    const restored=await page.evaluate(async()=>{
      const records=await window.engine.snapshots('Recovery probe.md');
      if(records.length!==1)throw new Error('Expected one native recovery snapshot');
      return window.engine.restore(records[0].id);
    });
    assert.equal(restored.content,'Original 中文\n');
    assert.equal(readNative('vault/Recovery probe.md'),'Original 中文\n');
    await page.evaluate(()=>window.engine.trash('Recovery probe.md'));
  });
  await step('native drawers, settings and top-modal Back ownership',async()=>{
    await page.getByRole('button',{name:'Mobile files',exact:true}).click();await expect(page.locator('.left-sidebar')).toBeVisible();
    shell('input keyevent 4');await expect(page.locator('.left-sidebar')).toHaveCount(0);
    await page.getByRole('button',{name:'Mobile search',exact:true}).click();await expect(page.locator('.left-sidebar')).toBeVisible();
    shell('input keyevent 4');await expect(page.locator('.left-sidebar')).toHaveCount(0);
    await community();
    await expect(page.getByRole('switch',{name:'Enable Desktop-only Probe',exact:true})).toBeDisabled();
    await expect(page.getByRole('switch',{name:'Allow unsafe-eval in trusted renderer',exact:true})).toBeDisabled();
    await expect(page.getByRole('switch',{name:'Allow native Node.js plugins',exact:true})).toBeDisabled();
    shell('settings put system accelerometer_rotation 0');shell('settings put system user_rotation 1');
    await expect.poll(()=>page.evaluate(()=>innerWidth>innerHeight),{timeout:15000}).toBe(true);
    await enable('Original Native Probe','worker');
    await expect.poll(()=>readJSON('engine-profile/plugins/native-probe.json'),{timeout:15000}).toMatchObject({appMobile:true,renderer:false,isMobile:true,isPhone:true,isTablet:false,isAndroidApp:true,isDesktopApp:false});
    await page.screenshot({path:path.join(output,'android-landscape.png')});
    shell('settings put system user_rotation 0');
    await expect.poll(()=>page.evaluate(()=>innerHeight>innerWidth),{timeout:15000}).toBe(true);
    await page.getByRole('switch',{name:'Enable Original Native Probe',exact:true}).click();
    await enable('Original Native Probe');
    await expect.poll(()=>readJSON('engine-profile/plugins/native-probe.json'),{timeout:15000}).toMatchObject({appMobile:true,renderer:true,isMobile:true,isPhone:true,isAndroidApp:true,isDesktopApp:false});
    await closeSettings();await command('Open native probe modal');
    await expect(page.getByRole('dialog',{name:'Native probe modal',exact:true})).toBeVisible();
    shell('input keyevent 4');await expect(page.getByRole('dialog',{name:'Native probe modal',exact:true})).toHaveCount(0);
    await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeVisible();
  });
  await step('unchanged pinned Style Settings dropdown, number, slider and persisted CSS',async()=>{
    await community();await enable('Style Settings');await styleTab();
    await page.getByLabel('Native choice',{exact:true}).selectOption('wide');
    await page.getByLabel('Native number',{exact:true}).fill('14');await page.getByLabel('Native number',{exact:true}).press('Tab');
    const slider=page.getByRole('slider',{name:'Native slider',exact:true});
    await slider.focus();await slider.press('Home');for(let i=0;i<10;i++)await slider.press('ArrowRight');
    await expect(slider).toHaveValue('18');
    await expect(slider).toHaveAttribute('title','18');await expect(slider).toHaveAttribute('aria-valuetext','18');
    await expect.poll(effects,{timeout:15000}).toEqual(['wide','14px','18px']);
    await expect.poll(()=>readJSON('engine-profile/plugins/obsidian-style-settings.json'),{timeout:15000}).toMatchObject({
      'android-probe@@android-probe-choice':'wide','android-probe@@android-probe-number':14,'android-probe@@android-probe-slider':18
    });
    await page.screenshot({path:path.join(output,'android-style-settings.png')});
    await closeSettings();
  });
  await step('native save failure retains draft and refuses root Back until recovery',async()=>{
    await page.getByRole('button',{name:'Source mode',exact:true}).click();
    const editor=page.locator('.editor .cm-content').first();
    await editor.click();await page.keyboard.press('Control+End');
    shell(`run-as ${APP} mv ${quote('files/vault/'+notePath)} ${quote('files/vault/'+notePath+'.blocked')}`);
    shell(`run-as ${APP} mkdir ${quote('files/vault/'+notePath)}`);
    await page.keyboard.insertText('Recovered after failure\n');
    expectedText+='Recovered after failure\n';
    await expect(page.locator('.error-banner')).toContainText('Not a file',{timeout:15000});
    assert.equal(readNative('vault/'+notePath+'.blocked'),expectedText.replace(/Recovered after failure\n$/,''));
    if(await page.locator('body').evaluate(body=>body.classList.contains('native-keyboard-open'))){
      shell('input keyevent 4');
      await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeVisible();
    }
    assert(resumed(),'App must be foreground before root Back');
    const firstError=consoleErrors.length;
    shell('input keyevent 4');
    await expect.poll(()=>consoleErrors.slice(firstError).filter(error=>error.startsWith('Android lifecycle save failed')).length,{timeout:10000}).toBe(1);
    expectedConsoleErrorIndexes.add(consoleErrors.findIndex((error,index)=>index>=firstError&&error.startsWith('Android lifecycle save failed')));
    assert(resumed(),'Failed flush must not minimize the app');
    await expect(editor).toContainText('Recovered after failure');
    shell(`run-as ${APP} rmdir ${quote('files/vault/'+notePath)}`);
    shell(`run-as ${APP} mv ${quote('files/vault/'+notePath+'.blocked')} ${quote('files/vault/'+notePath)}`);
    await command('Save all pending changes');
    await expect.poll(()=>readNative('vault/'+notePath),{timeout:15000}).toBe(expectedText);
    await page.getByRole('button',{name:'Dismiss error',exact:true}).click();
    await expect(page.locator('.error-banner')).toHaveCount(0);
  });
  await step('background flush does not unload plugins; restart keeps values but not trust',async()=>{
    await page.getByRole('button',{name:'Source mode',exact:true}).click();
    await page.locator('.editor .cm-content').first().click();await page.keyboard.press('Control+End');
    await page.keyboard.insertText('Background save\n');expectedText+='Background save\n';
    // Background immediately rather than waiting for the ordinary autosave to settle.
    shell('input keyevent 3');
    await expect.poll(()=>readNative('vault/'+notePath),{timeout:15000}).toBe(expectedText);
    shell(`am start -n ${APP}/.MainActivity`);
    await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeVisible();
    await expect.poll(effects).toEqual(['wide','14px','18px']);
    await community();await expect(page.getByRole('switch',{name:'Enable Style Settings',exact:true})).toBeChecked();await closeSettings();
    await restart();assert.equal(readNative('vault/'+notePath),expectedText);
    await community();await expect(page.getByRole('switch',{name:'Enable Style Settings',exact:true})).not.toBeChecked();
    await enable('Style Settings');await styleTab();
    await expect(page.getByLabel('Native choice',{exact:true})).toHaveValue('wide');
    await expect(page.getByLabel('Native number',{exact:true})).toHaveValue('14');
    await expect(page.getByRole('slider',{name:'Native slider',exact:true})).toHaveValue('18');
    await expect.poll(effects).toEqual(['wide','14px','18px']);
    await closeSettings();
  });
  await step('explicit native ZIP export, no broad storage permissions and root Back',async()=>{
    await command('Export entire vault');
    await expect.poll(()=>shell(`run-as ${APP} find cache/exports -name '*.zip'`),{timeout:15000}).toContain('.zip');
    const file=shell(`run-as ${APP} find cache/exports -name '*.zip'`).trim().split('\n')[0];
    const zipBytes=rawNative(file);
    const zip=await JSZip.loadAsync(zipBytes);assert.equal(await zip.file(notePath).async('string'),expectedText);
    shell('input keyevent 4'); // dismiss the OS chooser; no content is sent to a recipient
    await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeVisible();
    const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;assert(sdk);
    const versions=(await fs.readdir(path.join(sdk,'build-tools'))).sort().reverse();
    const aapt=path.join(sdk,'build-tools',versions[0],'aapt');
    const permissions=execFileSync(aapt,['dump','permissions',APK],{encoding:'utf8'});
    await fs.writeFile(path.join(output,'permissions.txt'),permissions);
    assert.doesNotMatch(permissions,/android\.permission\.(?:READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|MANAGE_EXTERNAL_STORAGE|READ_MEDIA|CAMERA|RECORD_AUDIO|ACCESS_FINE_LOCATION)/);
    await fs.writeFile(path.join(output,'android-final.png'),execFileSync('adb',['exec-out','screencap','-p']));
    assert(resumed(),'App must be foreground before final root Back');
    shell('input keyevent 4');
    await expect.poll(resumed,{timeout:10000}).toBe(false);
    assert.equal(readNative('vault/'+notePath),expectedText);
  });
  assert.deepEqual(errors,[],'Native page errors');
  assert(!consoleErrors.some((error,index)=>!expectedConsoleErrorIndexes.has(index)&&/^Plugin .* failed|Unsupported Obsidian capability|Android lifecycle save failed/.test(error)),'Unexpected native plugin/lifecycle errors');
  console.log('ANDROID ACCEPTANCE PASSED '+records.length+' native workflow groups, no skips');
}catch(error){
  console.error(error);
  try{await page?.screenshot({path:path.join(output,'failure-webview.png')});await fs.writeFile(path.join(output,'failure-dom.txt'),await page.content());}catch{}
  try{await fs.writeFile(path.join(output,'failure-native.png'),execFileSync('adb',['exec-out','screencap','-p']));}catch{}
  process.exitCode=1;
}finally{
  try{await fs.writeFile(path.join(output,'logcat.txt'),adb('logcat','-d','-v','threadtime'));}catch{}
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({metadata,records,errors,consoleErrors,expectedConsoleErrorIndexes:[...expectedConsoleErrorIndexes]},null,2));
  await browser?.close();
}
