import {test,expect,type Page} from '@playwright/test';

/** Create source through the real editor, with the caret outside rendered blocks. */
async function prepare(page:Page,source:string){
  await page.goto('/');await expect(page.locator('.note-title h1')).toHaveText('Welcome');
  await page.getByRole('button',{name:'New note',exact:true}).click();
  await page.getByTestId('dialog-input').fill('Stability.md');await page.getByTestId('dialog-submit').click();
  await expect(page.locator('.note-title h1')).toHaveText('Stability');
  await page.getByTestId('mode-source').click();await page.getByTestId('note-editor').click();
  await page.keyboard.press('ControlOrMeta+a');await page.keyboard.insertText(source);
  await page.getByTestId('mode-live').click();
}
for(const width of [1440,390])test(`opening and cancelling a table cell preserves geometry at ${width}px`,async({page})=>{
  await prepare(page,'# Top\n\n| A | Longer column name |\n| --- | --- |\n| Short | Value |\n\n```js\nconst following = 1;\n```\n\nTail');
  await page.setViewportSize({width,height:940});
  if(width<650)await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();
  const table=page.locator('.live-table'),following=page.locator('.live-block-code');
  await expect(table).toBeVisible();await expect(following.locator('pre')).toBeVisible();
  const columns=await table.locator('th').evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().width));
  const before=await following.boundingBox();
  await page.getByRole('button',{name:'Edit cell row 2 column 1',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Cell row 2 column 1',exact:true})).toBeFocused();
  const during=await table.locator('th').evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().width));
  for(let i=0;i<columns.length;i++)expect(Math.abs(during[i]-columns[i])).toBeLessThanOrEqual(1);
  expect(Math.abs((await following.boundingBox())!.y-before!.y)).toBeLessThanOrEqual(1);
  await page.keyboard.press('Escape');
  expect(Math.abs((await following.boundingBox())!.y-before!.y)).toBeLessThanOrEqual(1);
});
test('typing before an inline image retains its DOM and reveals the mapped source',async({page})=>{
  const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24"/></svg>');
  await prepare(page,`# Top\n\nBefore ![pixel](${image}) after.\n\nTail`);
  await expect(page.locator('.live-inline-image')).toBeVisible();
  await page.getByTestId('note-editor').press('ControlOrMeta+Home');
  const node=await page.locator('.live-inline-image').elementHandle();
  await page.keyboard.insertText('An inserted prefix that is longer than the original first line ');
  expect(await node!.evaluate(el=>el.isConnected)).toBe(true);
  await page.locator('.live-inline-image').click();
  await expect(page.locator('.live-inline-image')).toHaveCount(0);
  await expect(page.getByTestId('note-editor')).toContainText('![pixel]');
});
test('an open table cell reflows on container resize without committing or losing its draft',async({page})=>{
  await prepare(page,'# Top\n\n| A | Longer column |\n| --- | --- |\n| Short | Value |\n\nTail');
  await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();
  await page.getByRole('button',{name:'Edit cell row 2 column 1',exact:true}).click();
  const input=page.getByRole('textbox',{name:'Cell row 2 column 1',exact:true});
  await input.fill('Uncommitted draft');
  await page.setViewportSize({width:390,height:940});
  await expect.poll(()=>page.locator('.live-table-scroll').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
  await expect(input).toBeFocused();await expect(input).toHaveValue('Uncommitted draft');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Edit cell row 2 column 1',exact:true})).toHaveText('Short');
  await page.setViewportSize({width:1440,height:940});
  await expect(input).toHaveCount(0);
});
test('typing prose preserves diagram identity, dimensions and following-block position',async({page})=>{
  await prepare(page,'# Top\n\nLead paragraph.\n\n```mermaid\nflowchart LR\nA-->B\n```\n\n| A | B |\n| --- | --- |\n| One | Two |\n\nTail');
  const svg=page.locator('.live-block-diagram .mermaid svg');await expect(svg).toBeVisible();
  const node=await svg.elementHandle(),before=await svg.boundingBox(),table=await page.locator('.live-block-table').boundingBox();
  await page.getByTestId('note-editor').locator('.cm-line').filter({hasText:'Lead paragraph.'}).click();
  await page.keyboard.press('End');await page.keyboard.type(' More text.',{delay:30});
  expect(await node!.evaluate(el=>el.isConnected)).toBe(true);
  const after=await svg.boundingBox();
  for(const key of ['x','y','width','height'] as const)expect(Math.abs(after![key]-before![key])).toBeLessThanOrEqual(1);
  expect(Math.abs((await page.locator('.live-block-table').boundingBox())!.y-table!.y)).toBeLessThanOrEqual(1);
});
test('external note refresh updates embeds without remounting source-only diagram contributions',async({page})=>{
  await page.addInitScript(()=>{
    const files=new Map([['Welcome.md','# Welcome\n\n```mermaid\nflowchart LR\nA-->B\n```\n\n![[Other]]\n\nTail'],['Other.md','# Other\n\nOriginal body.']]);
    const listeners=new Set<()=>void>();
    const list=async()=>[...files].map(([path,content])=>({path,name:path,folder:false,size:content.length,mtime:1,ctime:1}));
    const read=async(path:string)=>({path,content:files.get(path)!,version:files.get(path)});
    (window as any).engine={desktop:false,vault:async()=>({name:'Stability fixture',root:'fixture',entries:await list(),state:{}}),
      list,read,plugins:async()=>[],pluginData:async()=>null,state:async()=>{},
      onChange:(listener:()=>void)=>{listeners.add(listener);return()=>listeners.delete(listener);}};
    (window as any).externalEdit=(diagram=false)=>{
      if(diagram)files.set('Welcome.md',files.get('Welcome.md')!.replace('A-->B','A-->C'));
      else files.set('Other.md','# Other\n\nUpdated external body.');
      for(const listener of listeners)listener();
    };
  });
  await page.goto('/');await expect(page.locator('.note-title h1')).toHaveText('Welcome');
  await page.getByTestId('mode-live').click();
  const svg=page.locator('.live-block-diagram .mermaid svg');await expect(svg).toBeVisible();
  await expect(svg.locator('g.node text')).toHaveText(['A','B']);
  await expect(svg.locator('foreignObject')).toHaveCount(0);
  await expect(page.locator('.embedded-note')).toContainText('Original body.');
  const node=await svg.elementHandle(),before=await svg.boundingBox();
  await page.evaluate(()=>(window as any).externalEdit());
  await expect(page.locator('.embedded-note')).toContainText('Updated external body.');
  expect(await node!.evaluate(el=>el.isConnected)).toBe(true);
  const after=await svg.boundingBox();
  for(const key of ['x','y','width','height'] as const)expect(Math.abs(after![key]-before![key])).toBeLessThanOrEqual(1);
  // The cache must not hide real source changes while retaining unchanged contributions.
  await page.evaluate(()=>(window as any).externalEdit(true));
  await expect(svg.locator('g.node text')).toHaveText(['A','C']);
  expect(await node!.evaluate(el=>el.isConnected)).toBe(false);
});
