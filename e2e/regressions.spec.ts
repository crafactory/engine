import {test,expect,type Page} from '@playwright/test';
/** Create original regression data through the application's real editor. */
async function host(page:Page,content:string){
  await page.goto('/');await expect(page.locator('.note-title h1')).toHaveText('Welcome');
  await page.getByRole('button',{name:'New note',exact:true}).click();
  await page.getByTestId('dialog-input').fill('Regression.md');await page.getByTestId('dialog-submit').click();
  await page.getByTestId('mode-source').click();await page.getByTestId('note-editor').click();
  await page.keyboard.press('Control+a');await page.keyboard.insertText(content);
}
/** Invoke a named command through the visible palette. */
async function command(page:Page,label:string){
  await page.getByRole('button',{name:'Command palette',exact:true}).click();
  await page.getByTestId('palette-input').fill(label);await page.keyboard.press('Enter');
}
test('Canvas embeds render read-only nodes and edges in reading and Live modes',async({page})=>{
  await host(page,'# Host\n\n![[Projects/Engine.canvas]]\n\nEnd.');
  for(const mode of ['reading','live']){
    await page.getByTestId('mode-'+mode).click();
    const embed=page.getByRole('region',{name:'Embedded Canvas',exact:true});
    await expect(embed.locator('.react-flow__node')).toHaveCount(3);
    await expect(embed.locator('.react-flow__edge')).toHaveCount(2);
    await expect(embed.locator('.canvas-edit')).toHaveCount(0);
    await expect(embed.getByTestId('canvas-add-text')).toHaveCount(0);
    await expect(embed).toBeVisible();
    await page.setViewportSize({width:375,height:940});
    if(await page.getByRole('button',{name:'Collapse sidebar',exact:true}).isVisible())await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();
    await expect.poll(async()=>embed.evaluate(el=>{
      const box=el.getBoundingClientRect();
      return [...el.querySelectorAll('.react-flow__node')].every(node=>{const r=node.getBoundingClientRect();return r.left>=box.left-1&&r.right<=box.right+1&&r.top>=box.top-1&&r.bottom<=box.bottom+1;});
    })).toBe(true);
    await page.setViewportSize({width:1440,height:940});
  }
  await page.locator('.embed-title').click();
  await expect(page.getByTestId('canvas-add-text')).toBeVisible();
});
test('Canvas extensionless rename preserves Canvas and rewrites its embed',async({page})=>{
  await host(page,'# Host\n\n![[Projects/Engine.canvas]]');
  await page.getByTestId('mode-live').click();
  await page.getByTestId('file-Projects/Engine.canvas').click();
  await command(page,'Rename or move current file');await page.getByTestId('dialog-input').fill('Projects/Renamed canvas');
  await page.getByTestId('dialog-submit').click();
  await expect(page.getByTestId('file-Projects/Renamed canvas.canvas')).toBeVisible();
  await expect(page.getByTestId('file-Projects/Renamed canvas.md')).toHaveCount(0);
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await page.getByTestId('file-Regression.md').click();await page.getByTestId('mode-reading').click();
  await expect(page.locator('.embedded-note .react-flow__node')).toHaveCount(3);
  await expect(page.locator('.embed-title')).toHaveText('Renamed canvas');
});
test('Canvas rename rejects accidental Markdown conversion',async({page})=>{
  await page.goto('/');await page.getByTestId('file-Projects/Engine.canvas').click();
  await command(page,'Rename or move current file');await page.getByTestId('dialog-input').fill('Projects/Broken.md');await page.getByTestId('dialog-submit').click();
  await expect(page.getByRole('alert')).toContainText('Renaming cannot change');
  await expect(page.getByTestId('file-Projects/Engine.canvas')).toBeVisible();
  await expect(page.getByTestId('file-Projects/Broken.md')).toHaveCount(0);
});
for(const [from,to,view] of [['Projects/Engine.canvas','Projects/Upper.CANVAS','canvas-add-text'],['Projects/Library.base','Projects/Upper.BASE','base-table']]){
  test(`case-preserving rename opens the original format: ${to}`,async({page})=>{
    await page.goto('/');await page.getByTestId('file-'+from).click();await page.getByTestId('mode-live').click();
    await command(page,'Rename or move current file');await page.getByTestId('dialog-input').fill(to);await page.getByTestId('dialog-submit').click();
    await expect(page.getByTestId('file-'+to)).toBeVisible();await expect(page.getByTestId(view)).toBeVisible();
    await page.getByTestId('file-Welcome.md').click();await page.getByTestId('file-'+to).click();await expect(page.getByTestId(view)).toBeVisible();
  });
}
test('inactive Live wiki aliases and Markdown links navigate on click',async({page})=>{
  await host(page,'# Links\n\n[[Welcome|Wiki destination]] and [Markdown destination](Guides/Getting%20started.md)\n\nTail');
  await page.getByTestId('mode-live').click();
  await expect(page.getByRole('link',{name:'Wiki destination',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Wiki destination',exact:true}).click();await expect(page.locator('.note-title h1')).toHaveText('Welcome');
  await page.getByTestId('file-Regression.md').click();await page.getByTestId('mode-live').click();
  await page.getByRole('link',{name:'Markdown destination',exact:true}).click();await expect(page.locator('.note-title h1')).toHaveText('Getting started');
});
test('typing above a table preserves measured widget DOM and remaps edit callbacks',async({page})=>{
  await host(page,'# Top\n\n| Name | State |\n| --- | --- |\n| Alpha | Open |\n\nTail');
  await page.getByTestId('mode-live').click();
  const cell=page.getByRole('button',{name:'Edit cell row 2 column 2',exact:true});await expect(cell).toBeVisible();
  const widget=await page.locator('.live-block-table').elementHandle();
  await page.getByTestId('note-editor').press('Control+Home');await page.keyboard.type('New ');
  expect(await widget!.evaluate(el=>el.isConnected)).toBe(true);
  await cell.click();await page.getByRole('textbox',{name:'Cell row 2 column 2',exact:true}).fill('Remapped');await page.keyboard.press('Enter');
  await expect(cell).toHaveText('Remapped');await page.getByTestId('mode-source').click();await expect(page.getByTestId('note-editor')).toContainText('| Alpha | Remapped |');
});
test('long document with a tall table keeps the typing caret in the editor viewport',async({page})=>{
  const table='| Name | State |\n| --- | --- |\n'+Array.from({length:100},(_,i)=>`| Row ${i} | Open |`).join('\n');
  await host(page,'# Long\n\n'+table+'\n\n'+Array.from({length:120},(_,i)=>`Paragraph ${i}, enough text to scroll.\n`).join('\n')+'\nTail');
  await page.getByTestId('mode-live').click();await page.getByTestId('note-editor').press('Control+End');
  await page.keyboard.type(' typed after table');
  await expect(page.getByTestId('note-editor')).toContainText('Tail typed after table');
  await expect.poll(async()=>page.evaluate(()=>{
    const cursor=document.querySelector('.cm-cursor')?.getBoundingClientRect(),editor=document.querySelector('.cm-scroller')?.getBoundingClientRect();
    return !!cursor&&!!editor&&cursor.top>=editor.top-2&&cursor.bottom<=editor.bottom+2;
  })).toBe(true);
  await page.keyboard.press('Control+z');await page.keyboard.press('Control+Shift+z');
  await expect(page.getByTestId('note-editor')).toContainText('typed after table');
});
test('editing a cell near the bottom of a tall table keeps the focused input and committed cell visible',async({page})=>{
  const table='| Name | State |\n| --- | --- |\n'+Array.from({length:100},(_,i)=>`| Row ${i} | Open |`).join('\n');
  await host(page,'# Long table\n\n'+table+'\n\nTail');await page.getByTestId('mode-live').click();
  const cell=page.getByRole('button',{name:'Edit cell row 96 column 2',exact:true});await cell.click();
  const input=page.getByRole('textbox',{name:'Cell row 96 column 2',exact:true});
  await input.fill('Editing near bottom');await input.press('End');await page.keyboard.type(' safely');
  await expect(input).toBeFocused();
  const bounds=await input.boundingBox(),viewport=await page.locator('.cm-scroller').boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(viewport!.y-2);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(viewport!.y+viewport!.height+2);
  await page.keyboard.press('Enter');await expect(cell).toHaveText('Editing near bottom safely');
  const committed=await cell.boundingBox();
  expect(committed!.y).toBeGreaterThanOrEqual(viewport!.y-2);expect(committed!.y+committed!.height).toBeLessThanOrEqual(viewport!.y+viewport!.height+2);
});
test('plugin status occupies reserved space instead of overlaying workspace',async({page})=>{
  await page.goto('/');await expect(page.locator('.note-title h1')).toHaveText('Welcome');
  // Stage plugin-produced text; inspect geometry rather than simulating plugin compatibility.
  await page.locator('#plugin-status').evaluate(el=>{el.textContent='Plugin regression status';});
  for(const theme of ['dark','light']){
    await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByTestId('theme-'+theme).click();await page.getByTestId('settings-close').click();
    for(const width of [1440,375]){
      await page.setViewportSize({width,height:940});
      const link=page.getByRole('button',{name:'Explore local graph',exact:true});await expect(link).toBeVisible();
      const status=await page.locator('#plugin-status').boundingBox(),footer=await page.locator('.statusbar').boundingBox(),bounds=await link.boundingBox();
      expect(status!.y).toBeGreaterThanOrEqual(footer!.y+footer!.height-1);
      expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(status!.y);
      expect(status!.y+status!.height).toBeLessThanOrEqual(941);
    }
  }
  await page.getByRole('button',{name:'Explore local graph',exact:true}).click();await expect(page.getByTestId('graph')).toBeVisible();
});
test('empty and malformed Canvas embeds remain bounded and never expose JSON as Markdown',async({page})=>{
  for(const [name,content] of [['Empty.canvas','{"nodes":[],"edges":[]}'],['Invalid.canvas','not valid JSON']]){
    await page.goto('/');await page.locator('input[aria-label="Import files"]').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(content)});
    await expect(page.getByTestId('file-'+name)).toBeVisible();
    await page.getByRole('button',{name:'New note',exact:true}).click();await page.getByTestId('dialog-input').fill('Host '+name+'.md');await page.getByTestId('dialog-submit').click();
    await page.getByTestId('mode-source').click();await page.getByTestId('note-editor').click();await page.keyboard.press('Control+a');await page.keyboard.insertText(`# Host\n\n![[${name}]]`);
    await page.getByTestId('mode-reading').click();
    if(name==='Empty.canvas'){const embed=page.getByRole('region',{name:'Embedded Canvas',exact:true});await expect(embed).toBeVisible();await expect(embed.locator('.react-flow__node')).toHaveCount(0);}
    else await expect(page.locator('.embedded-note')).toContainText('Invalid Canvas file');
    await expect(page.locator('.embedded-note pre')).toHaveCount(0);
  }
});
test('active Live link source remains editable and safe external links are anchors',async({page})=>{
  await host(page,'# Links\n\n[[Welcome|Alias]] and [Website](https://example.com)\n\n`[[Not a link]]` [Unsafe](javascript:bad)\n\nEnd');
  await page.getByTestId('mode-live').click();
  await expect(page.getByRole('link',{name:'Website',exact:true})).toHaveAttribute('href','https://example.com');
  await expect(page.getByRole('link',{name:'Unsafe',exact:true})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Not a link',exact:true})).toHaveCount(0);
  await page.getByTestId('note-editor').press('Control+Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('note-editor')).toContainText('[[Welcome|Alias]]');
  await page.keyboard.press('Home');await page.keyboard.type('Editable ');
  await expect(page.getByTestId('note-editor')).toContainText('Editable [[Welcome|Alias]]');
  await page.keyboard.press('Control+End');
  await expect(page.getByRole('link',{name:'Alias',exact:true})).toBeVisible();
});
