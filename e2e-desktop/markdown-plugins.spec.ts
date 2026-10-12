import {test,expect,_electron as electron,type ElectronApplication,type Page} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
let root:string,profile:string,app:ElectronApplication,page:Page;
const content='---\nexample: public-contract\n---\n# Test\n\n```engine-fixture\nsource bytes\n```\n';
test.beforeEach(async()=>{
  root=await fs.mkdtemp(path.join(os.tmpdir(),'engine-markdown-'));profile=await fs.mkdtemp(path.join(os.tmpdir(),'engine-markdown-profile-'));
  await fs.writeFile(path.join(root,'Test.md'),content);
  const dir=path.join(root,'.crafactory/plugins/markdown-fixture');await fs.mkdir(dir,{recursive:true});
  for(const file of ['manifest.json','main.js'])await fs.copyFile('examples/plugins/markdown-fixture/'+file,path.join(dir,file));
  const executablePath=process.env.E2E_EXECUTABLE_PATH;
  app=await electron.launch({executablePath,args:['--no-sandbox',...(executablePath?[]:[path.resolve('electron/main.cjs')]),'--vault',root,'--user-data-dir='+profile],env:{...process.env,ENGINE_DEV:'0'}});
  page=await app.firstWindow();await expect(page.locator('.note-title h1')).toHaveText('Test');
});
test.afterEach(async()=>{await app?.close();await fs.rm(root,{recursive:true,force:true});await fs.rm(profile,{recursive:true,force:true});});
/** Open the real community-plugin settings through normal input. */
async function settings(){await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Community plugins',exact:true}).click();}
/** Explicitly select and authorize trusted mode, then open reading mode. */
async function enable(){
  await settings();await page.getByLabel('Runtime for Markdown fixture',{exact:true}).selectOption('renderer');
  await page.getByRole('switch',{name:'Enable Markdown fixture',exact:true}).click();await page.getByTestId('dialog-submit').click();await expect(page.getByRole('switch',{name:'Enable Markdown fixture',exact:true})).toBeChecked();
  await page.getByTestId('settings-close').click();await page.getByTestId('mode-reading').click();
}
/** Read actual native persisted fixture data, not a mocked bridge. */
async function data(){return JSON.parse(await fs.readFile(path.join(root,'.crafactory/plugins/markdown-fixture/data.json'),'utf8'));}
/** Run the fixture's named command through the real palette and keyboard. */
async function command(name:string){await page.getByRole('button',{name:'Command palette',exact:true}).click();await page.getByTestId('palette-input').fill('Markdown fixture: '+name);await page.keyboard.press('Enter');}
test('reading processors render source bytes in order with real context and child lifecycle',async()=>{
  await enable();await expect(page.getByRole('button',{name:'Processed code',exact:true})).toHaveText('Rendered source bytes');
  await expect(page.locator('.processor-order')).toHaveText(['LOW','HIGH']);await expect(page.locator('.processor-context')).toHaveText('Test.md / public-contract / null');
  await expect.poll(async()=>(await data()).loads).toBe(2);
  await page.getByRole('button',{name:'Processed code',exact:true}).click();await expect.poll(async()=>(await data()).clicks).toBe(1);
  await command('Remove rendered child');await expect(page.getByRole('button',{name:'Processed code',exact:true})).toHaveCount(0);await expect.poll(async()=>(await data()).unloads).toBe(1);
  await page.getByTestId('mode-source').click();await expect.poll(async()=>(await data()).unloads).toBe(2);
  await page.getByTestId('mode-reading').click();await expect(page.getByRole('button',{name:'Processed code',exact:true})).toBeVisible();await expect.poll(async()=>(await data()).loads).toBe(4);
  await settings();await page.getByRole('switch',{name:'Enable Markdown fixture',exact:true}).click();await expect(page.getByRole('switch',{name:'Enable Markdown fixture',exact:true})).not.toBeChecked();
  await expect.poll(async()=>{const d=await data();return d.loads===d.unloads;}).toBe(true);
  await page.getByTestId('settings-close').click();await expect(page.locator('.processor-order')).toHaveCount(0);await expect(page.locator('code.language-engine-fixture')).toHaveText('source bytes\n');
  expect(await fs.readFile(path.join(root,'Test.md'),'utf8')).toBe(content);
});
test('static Markdown rendering uses the sanitized renderer without recursive processors',async()=>{
  await enable();await command('Static Markdown');
  const modal=page.getByRole('dialog',{name:'Static Markdown',exact:true});await expect(modal.locator('strong')).toHaveText('Rendered safely');await expect(modal.locator('script')).toHaveCount(0);await expect(modal.locator('.processor-order')).toHaveCount(0);
  await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);
});
test('canceling a slow render leaves the next document unmodified and children unloaded',async()=>{
  const dir=path.join(root,'.crafactory/plugins/markdown-fixture');
  await fs.writeFile(path.join(dir,'main.js'),'const {Plugin,MarkdownRenderChild}=require("obsidian");module.exports=class extends Plugin{onload(){this.registerMarkdownPostProcessor(async(el,ctx)=>{await new Promise(r=>setTimeout(r,250));el.createDiv({cls:"late-render",text:ctx.sourcePath});ctx.addChild(new MarkdownRenderChild(el));});}};');
  await enable();await page.getByTestId('mode-source').click();await page.getByTestId('note-editor').click();await page.keyboard.press('Control+a');await page.keyboard.insertText('# Changed\n\nClean next document.');
  await page.getByTestId('mode-reading').click();await expect(page.locator('.late-render')).toHaveText('Test.md');await expect(page.locator('.markdown')).toContainText('Clean next document.');
  await settings();await page.getByRole('switch',{name:'Enable Markdown fixture',exact:true}).click();await page.getByTestId('settings-close').click();await expect(page.locator('.late-render')).toHaveCount(0);await expect(page.locator('.markdown')).toContainText('Clean next document.');
  await expect(page.locator('.error-banner')).toHaveCount(0);
});
test('a render child startup error disables its plugin and restores the original code block',async()=>{
  const dir=path.join(root,'.crafactory/plugins/markdown-fixture');
  await fs.writeFile(path.join(dir,'main.js'),'const {Plugin,MarkdownRenderChild}=require("obsidian");module.exports=class extends Plugin{onload(){this.registerMarkdownCodeBlockProcessor("engine-fixture",(source,el,ctx)=>{el.setText("allocated");ctx.addChild(new class extends MarkdownRenderChild{onload(){throw new Error("render child fixture failure");}}(el));});}};');
  await enable();await expect(page.locator('.toast')).toContainText('render child fixture failure');await expect(page.locator('code.language-engine-fixture')).toHaveText('source bytes\n');
  await settings();await expect(page.getByRole('switch',{name:'Enable Markdown fixture',exact:true})).not.toBeChecked();
  expect(await fs.readFile(path.join(root,'Test.md'),'utf8')).toBe(content);
});
test('disabling a pending processor prevents late child startup and stale rendered output',async()=>{
  const dir=path.join(root,'.crafactory/plugins/markdown-fixture');
  await fs.writeFile(path.join(dir,'main.js'),'const {Plugin,MarkdownRenderChild}=require("obsidian");module.exports=class extends Plugin{onload(){this.registerMarkdownPostProcessor(async(el,ctx)=>{await new Promise(r=>setTimeout(r,1000));el.createDiv({cls:"late-render",text:"stale"});const plugin=this;ctx.addChild(new class extends MarkdownRenderChild{async onload(){window.__lateChildLoaded=true;await plugin.saveData({lateChildLoaded:true});}}(el));window.__lateFixtureCompleted=true;});}};');
  await enable();await settings();await page.getByRole('switch',{name:'Enable Markdown fixture',exact:true}).click();await expect(page.getByRole('switch',{name:'Enable Markdown fixture',exact:true})).not.toBeChecked();await page.getByTestId('settings-close').click();
  // Synchronize with the actual delayed callback before checking visible output and disk.
  await page.waitForFunction(()=>Boolean((window as any).__lateFixtureCompleted));
  expect(await page.evaluate(()=>Boolean((window as any).__lateChildLoaded))).toBe(false);
  await expect(page.locator('.late-render')).toHaveCount(0);expect(await fs.access(path.join(dir,'data.json')).then(()=>true,()=>false)).toBe(false);
});
test('nonsettling child startup cannot block owner cleanup or repeated enable and disable',async()=>{
  const dir=path.join(root,'.crafactory/plugins/markdown-fixture');
  await fs.writeFile(path.join(dir,'main.js'),'const {Plugin,MarkdownRenderChild}=require("obsidian");module.exports=class extends Plugin{onload(){this.addStatusBarItem().setText("pending-child owner");this.registerMarkdownPostProcessor((el,ctx)=>{ctx.addChild(new class extends MarkdownRenderChild{onload(){window.__childStarted=true;return new Promise(()=>{});}}(el));});}onunload(){window.__ownerUnloads=(window.__ownerUnloads||0)+1;}};');
  await enable();await page.waitForFunction(()=>Boolean((window as any).__childStarted));
  await settings();await page.getByRole('switch',{name:'Enable Markdown fixture',exact:true}).click();await expect(page.getByRole('switch',{name:'Enable Markdown fixture',exact:true})).not.toBeChecked();
  expect(await page.evaluate(()=>(window as any).__ownerUnloads)).toBe(1);await expect(page.locator('#plugin-status')).not.toContainText('pending-child owner');
  await page.getByRole('switch',{name:'Enable Markdown fixture',exact:true}).click();await page.getByTestId('dialog-submit').click();await expect(page.getByRole('switch',{name:'Enable Markdown fixture',exact:true})).toBeChecked();
  await page.getByRole('switch',{name:'Enable Markdown fixture',exact:true}).click();await expect(page.getByRole('switch',{name:'Enable Markdown fixture',exact:true})).not.toBeChecked();
  expect(await page.evaluate(()=>(window as any).__ownerUnloads)).toBe(2);
  expect(await fs.readFile(path.join(root,'Test.md'),'utf8')).toBe(content);
});
test('a child settling after bounded shutdown cannot retain registered events or nested children',async()=>{
  const dir=path.join(root,'.crafactory/plugins/markdown-fixture');
  await fs.writeFile(path.join(dir,'main.js'),'const {Plugin,MarkdownRenderChild,Component}=require("obsidian");module.exports=class extends Plugin{onload(){this.registerMarkdownPostProcessor((el,ctx)=>{ctx.addChild(new class extends MarkdownRenderChild{async onload(){await new Promise(resolve=>window.__releaseChild=resolve);this.registerDomEvent(document,"click",()=>window.__lateClicks=(window.__lateClicks||0)+1);this.addChild(new class extends Component{onload(){window.__lateNestedChild=true;}}());window.__lateChildSettled=true;}}(el));});}onunload(){window.__ownerStopped=true;}};');
  await enable();await page.waitForFunction(()=>typeof (window as any).__releaseChild==='function');
  await settings();await page.getByRole('switch',{name:'Enable Markdown fixture',exact:true}).click();await expect(page.getByRole('switch',{name:'Enable Markdown fixture',exact:true})).not.toBeChecked();expect(await page.evaluate(()=>Boolean((window as any).__ownerStopped))).toBe(true);
  await page.evaluate(()=>(window as any).__releaseChild());await page.waitForFunction(()=>Boolean((window as any).__lateChildSettled));
  await page.getByTestId('settings-close').click();await page.getByTestId('mode-source').click();await page.getByTestId('mode-reading').click();
  expect(await page.evaluate(()=>({clicks:(window as any).__lateClicks||0,nested:Boolean((window as any).__lateNestedChild)}))).toEqual({clicks:0,nested:false});
  await expect(page.locator('code.language-engine-fixture')).toHaveText('source bytes\n');
});
test('a revoked context cannot unload a child adopted by a successor reading session',async()=>{
  const dir=path.join(root,'.crafactory/plugins/markdown-fixture');
  await fs.writeFile(path.join(dir,'main.js'),'const {Plugin,MarkdownRenderChild}=require("obsidian");module.exports=class extends Plugin{onload(){window.__sharedLoads=0;window.__sharedUnloads=0;window.__sharedClicks=0;this.registerMarkdownPostProcessor((el,ctx)=>{el.createEl("button",{text:"Shared child action",attr:{"aria-label":"Shared child action"}});if(!this.shared){this.oldCtx=ctx;this.shared=new class extends MarkdownRenderChild{onload(){window.__sharedLoads++;this.registerDomEvent(this.containerEl.querySelector("button"),"click",()=>window.__sharedClicks++);}onunload(){window.__sharedUnloads++;}}(el);}else this.shared.containerEl=el;ctx.addChild(this.shared);});this.addCommand({id:"stale",name:"Late old context",callback:()=>this.oldCtx.addChild(this.shared)});}};');
  await enable();await page.waitForFunction(()=>(window as any).__sharedLoads===1);
  await page.getByTestId('mode-source').click();await page.waitForFunction(()=>(window as any).__sharedUnloads===1);
  await page.getByTestId('mode-reading').click();await page.waitForFunction(()=>(window as any).__sharedLoads===2);
  await command('Late old context');expect(await page.evaluate(()=>(window as any).__sharedUnloads)).toBe(1);
  await page.getByRole('button',{name:'Shared child action',exact:true}).click();expect(await page.evaluate(()=>(window as any).__sharedClicks)).toBe(1);
  await settings();await page.getByRole('switch',{name:'Enable Markdown fixture',exact:true}).click();await expect(page.getByRole('switch',{name:'Enable Markdown fixture',exact:true})).not.toBeChecked();expect(await page.evaluate(()=>(window as any).__sharedUnloads)).toBe(2);
});
