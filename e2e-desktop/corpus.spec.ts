import {test,expect,_electron as electron} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
const corpus=JSON.parse(await fs.readFile(new URL('../docs/compatibility/community-corpus.json',import.meta.url),'utf8'));
for(const plugin of corpus.plugins)test(`real plugin startup boundary: ${plugin.name} ${plugin.tag}`,async({},testInfo)=>{
  test.skip(!process.env.ENGINE_PLUGIN_CORPUS,'Optional corpus requires verified upstream inputs');
  const source=path.resolve(process.env.ENGINE_PLUGIN_CORPUS!,plugin.directory);
  const main=await fs.readFile(path.join(source,'main.js')),manifestBytes=await fs.readFile(path.join(source,'manifest.json'));
  expect(crypto.createHash('sha256').update(main).digest('hex')).toBe(plugin.main_sha256);
  expect(crypto.createHash('sha256').update(manifestBytes).digest('hex')).toBe(plugin.manifest_sha256);
  const manifest=JSON.parse(manifestBytes.toString());expect(manifest.version).toBe(plugin.manifest_version);
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'engine-corpus-')),profile=await fs.mkdtemp(path.join(os.tmpdir(),'engine-corpus-profile-'));
  const directory=path.join(root,'.crafactory/plugins',manifest.id);await fs.mkdir(directory,{recursive:true});
  await fs.writeFile(path.join(root,'Test.md'),'# Test\n\nCorpus fixture only.\n');
  await fs.copyFile(path.join(source,'main.js'),path.join(directory,'main.js'));await fs.copyFile(path.join(source,'manifest.json'),path.join(directory,'manifest.json'));
  const executablePath=process.env.E2E_EXECUTABLE_PATH;
  const app=await electron.launch({executablePath,args:['--no-sandbox',...(executablePath?[]:[path.resolve('electron/main.cjs')]),'--vault',root,'--user-data-dir='+profile],env:{...process.env,ENGINE_DEV:'0'}});
  try{
    const page=await app.firstWindow();await expect(page.locator('.note-title h1')).toHaveText('Test');
    await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Community plugins',exact:true}).click();
    const control=page.getByRole('switch',{name:'Enable '+manifest.name,exact:true});await control.click();await page.getByTestId('dialog-submit').click();
    await expect(page.locator('.error-banner')).toBeVisible({timeout:12000});
    const blocker=await page.locator('.error-banner span').innerText();await expect(control).not.toBeChecked();expect(blocker.length).toBeGreaterThan(0);
    const result={name:plugin.name,repo:plugin.repo,tag:plugin.tag,manifest_version:manifest.version,main_sha256:plugin.main_sha256,manifest_sha256:plugin.manifest_sha256,
      platform:'Linux x64 Electron',scope:'startup only',outcome:blocker.includes('Unsupported Obsidian capability:')?'UNSUPPORTED_STARTUP':'LOAD_ERROR',first_blocker:blocker,functional_workflows:'NOT_RUN',checked_at:new Date().toISOString()};
    testInfo.annotations.push({type:'compatibility',description:JSON.stringify(result)});
    if(process.env.ENGINE_CORPUS_REPORT){await fs.mkdir(process.env.ENGINE_CORPUS_REPORT,{recursive:true});await fs.writeFile(path.join(process.env.ENGINE_CORPUS_REPORT,plugin.directory+'.json'),JSON.stringify(result,null,2)+'\n');}
    expect(await fs.readFile(path.join(root,'Test.md'),'utf8')).toBe('# Test\n\nCorpus fixture only.\n');
  }finally{await app.close();await fs.rm(root,{recursive:true,force:true});await fs.rm(profile,{recursive:true,force:true});}
});
