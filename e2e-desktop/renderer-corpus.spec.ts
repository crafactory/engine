import {test,expect,_electron as electron} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
const corpus=JSON.parse(await fs.readFile(new URL('../docs/compatibility/community-corpus.json',import.meta.url),'utf8'));
for(const plugin of corpus.plugins)test(`trusted renderer real plugin: ${plugin.name} ${plugin.tag}`,async({},testInfo)=>{
  test.skip(!process.env.ENGINE_PLUGIN_CORPUS,'Optional corpus requires verified upstream inputs');
  const source=path.resolve(process.env.ENGINE_PLUGIN_CORPUS!,plugin.directory);
  for(const [file,hash] of [['main.js',plugin.main_sha256],['manifest.json',plugin.manifest_sha256]])expect(crypto.createHash('sha256').update(await fs.readFile(path.join(source,file))).digest('hex')).toBe(hash);
  const manifest=JSON.parse(await fs.readFile(path.join(source,'manifest.json'),'utf8'));
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'engine-renderer-corpus-')),profile=await fs.mkdtemp(path.join(os.tmpdir(),'engine-renderer-corpus-profile-'));
  const dir=path.join(root,'.crafactory/plugins',manifest.id);await fs.mkdir(dir,{recursive:true});
  const note=plugin.name==='Dataview'?'# Test\n\n#alpha\n\n```dataview\nTABLE file.name AS "Name", file.mtime AS "Modified"\n```\n\n```dataview\nTASK\n```\n\n```dataview\nLIST FROM "Folder"\n```\n\n```dataview\nLIST\nWHERE file.name = "Second"\n```\n\n```dataview\nLIST FROM ""\nSORT file.name DESC\nLIMIT 2\n```\n\n```dataview\nTABLE rows.file.name AS "Files", length(rows) AS "Count"\nGROUP BY file.folder\n```\n\n```dataview\nTABLE WITHOUT ID file.name AS "Name", Tag\nFLATTEN file.etags AS Tag\n```\n\nInline: `= this.file.name`\n\n- [ ] Task one\n- [x] Task two\n':Array(400).fill('word').join(' ');
  await fs.writeFile(path.join(root,'Test.md'),note);
  if(plugin.name==='Dataview'){
    await fs.writeFile(path.join(root,'Second.md'),'# Second\n\n#alpha\n');
    await fs.mkdir(path.join(root,'Folder'),{recursive:true});await fs.writeFile(path.join(root,'Folder/Third.md'),'# Third\n\n#alpha\n\n- [ ] Third task\n');
  }
  for(const file of ['main.js','manifest.json'])await fs.copyFile(path.join(source,file),path.join(dir,file));
  const executablePath=process.env.E2E_EXECUTABLE_PATH;
  const app=await electron.launch({executablePath,args:['--no-sandbox',...(executablePath?[]:[path.resolve('electron/main.cjs')]),'--vault',root,'--user-data-dir='+profile],env:{...process.env,ENGINE_DEV:'0'}});
  try{
    const page=await app.firstWindow();await page.getByTestId('file-Test.md').click();await expect(page.locator('.note-title h1')).toHaveText('Test');
    const settings=async()=>{await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Community plugins',exact:true}).click();};
    await settings();await page.getByLabel('Runtime for '+manifest.name,{exact:true}).selectOption('renderer');
    const control=page.getByRole('switch',{name:'Enable '+manifest.name,exact:true});
    await control.click();await page.getByTestId('dialog-submit').click();
    await expect.poll(async()=>(await control.isChecked())||(await page.locator('.error-banner').count())>0,{timeout:15000}).toBe(true);
    let outcome='STARTUP_ONLY',blocker='',workflows:string[]=[];
    if(await page.locator('.error-banner').count()){
      blocker=await page.locator('.error-banner span').innerText();outcome=blocker.includes('Unsupported Obsidian capability:')?'UNSUPPORTED_STARTUP':'LOAD_ERROR';
      await expect(control).not.toBeChecked();await expect(page.locator('.plugin-status-item')).toHaveCount(0);
    }else if(plugin.name==='Dataview'){
      await page.getByTestId('settings-close').click();await page.getByTestId('mode-reading').click();
      const blocks=page.locator('.reading-surface .plugin-code-block');
      await expect(blocks).toHaveCount(7);
      await expect(blocks.nth(0)).toContainText('Name');await expect(blocks.nth(0)).toContainText('Modified');await expect(blocks.nth(0)).toContainText('Third');
      await expect(blocks.nth(1)).toContainText('Task one');await expect(blocks.nth(1)).toContainText('Task two');await expect(blocks.nth(1)).toContainText('Third task');
      await expect(blocks.nth(2)).toContainText('Third');
      await expect(blocks.nth(3)).toContainText('Second');
      expect((await blocks.nth(4).innerText()).split('\n').map(line=>line.trim()).filter(Boolean)).toEqual(['Third','Test']);
      await expect(blocks.nth(5)).toContainText('Folder');await expect(blocks.nth(5)).toContainText('Third');await expect(blocks.nth(5)).toContainText('2');
      await expect(blocks.nth(6)).toContainText('#alpha');
      const reading=page.locator('.reading-surface');await expect(reading).toContainText(/Inline:\s*Test/);await expect(reading).not.toContainText('= this.file.name');
      await expect(page.locator('.toast')).toHaveCount(0);
      outcome='BOUNDED_WORKFLOWS_PASS';workflows=['TABLE file.name/file.mtime','TASK','LIST FROM folder','LIST WHERE file.name','LIST SORT/LIMIT','GROUP BY folder','FLATTEN etags','inline query'];
    }else if(plugin.name==='Reading Time'){
      const status=page.locator('.plugin-status-item');await expect(status).toHaveText('2 min read');
      await page.getByRole('button',{name:'Plugin settings '+manifest.name,exact:true}).click();await page.getByLabel('Reading speed',{exact:true}).fill('100');await expect(status).toHaveText('4 min read');
      await expect.poll(async()=>JSON.parse(await fs.readFile(path.join(dir,'data.json'),'utf8')).readingSpeed).toBe(100);
      await page.getByTestId('settings-close').click();await page.getByTestId('mode-reading').click();await expect(status).toHaveText('4 min read');await page.getByTestId('mode-source').click();
      await page.getByTestId('note-editor').click();await page.keyboard.press('Control+a');await page.keyboard.insertText(Array(800).fill('word').join(' '));await expect(status).toHaveText('8 min read',{timeout:6000});
      await page.keyboard.press('Control+Home');for(let i=0;i<10;i++)await page.keyboard.press('Control+Shift+ArrowRight');
      await page.getByRole('button',{name:'Command palette',exact:true}).click();await page.getByTestId('palette-input').fill(manifest.name+': Selected Text');await page.keyboard.press('Enter');
      const modal=page.getByRole('dialog',{name:'Reading Time of Selected Text',exact:true});await expect(modal).toContainText('1 min read');await expect(modal).toContainText('(at 100 wpm)');await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);
      await settings();await control.click();await expect(control).not.toBeChecked();await expect(status).toHaveCount(0);await expect(page.getByRole('button',{name:'Plugin settings '+manifest.name,exact:true})).toHaveCount(0);
      await control.click();await page.getByTestId('dialog-submit').click();await expect(control).toBeChecked();await expect(status).toHaveText('8 min read');
      await page.getByRole('button',{name:'Plugin settings '+manifest.name,exact:true}).click();await expect(page.getByLabel('Reading speed',{exact:true})).toHaveValue('100');
      outcome='BOUNDED_WORKFLOWS_PASS';workflows=['400-word document at 200 wpm','reading speed setting saves 100 wpm','reading/source transition retains 4 min','editor-change: 800 words -> 8 min','10-word selection modal at 100 wpm','Escape closes modal','disable removes status and settings','re-enable restores setting and 8 min'];
    }
    if(plugin.name==='Reading Time'||plugin.name==='Dataview')expect(outcome).toBe('BOUNDED_WORKFLOWS_PASS');
    const result={name:plugin.name,repo:plugin.repo,tag:plugin.tag,manifest_version:manifest.version,main_sha256:plugin.main_sha256,manifest_sha256:plugin.manifest_sha256,platform:'Linux x64 Electron',mode:'trusted renderer (explicit opt-in, not sandboxed)',outcome,first_blocker:blocker,functional_workflows:workflows.length?workflows:'NOT_RUN',checked_at:new Date().toISOString()};
    testInfo.annotations.push({type:'compatibility',description:JSON.stringify(result)});
    if(process.env.ENGINE_RENDERER_CORPUS_REPORT){await fs.mkdir(process.env.ENGINE_RENDERER_CORPUS_REPORT,{recursive:true});await fs.writeFile(path.join(process.env.ENGINE_RENDERER_CORPUS_REPORT,plugin.directory+'.json'),JSON.stringify(result,null,2)+'\n');}
  }finally{await app.close();await fs.rm(root,{recursive:true,force:true});await fs.rm(profile,{recursive:true,force:true});}
});
