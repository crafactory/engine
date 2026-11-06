import {test,expect,type Page} from '@playwright/test';

/** Create source through the real editor, with the caret outside rendered blocks. */
async function prepare(page:Page,source:string){
  await page.goto('/');await expect(page.locator('.note-title h1')).toHaveText('Welcome');
  await page.getByRole('button',{name:'New note',exact:true}).click();
  await page.getByTestId('dialog-input').fill('Stability.md');await page.getByTestId('dialog-submit').click();
  await page.getByTestId('mode-source').click();await page.getByTestId('note-editor').click();
  await page.keyboard.press('ControlOrMeta+a');await page.keyboard.insertText(source);
  await page.getByTestId('mode-live').click();
}
test('opening and cancelling a table cell preserves column and following-block geometry',async({page})=>{
  await prepare(page,'# Top\n\n| A | Longer column name |\n| --- | --- |\n| Short | Value |\n\n```js\nconst following = 1;\n```\n\nTail');
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
  const image='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24"%3E%3Crect width="24" height="24"/%3E%3C/svg%3E';
  await prepare(page,`# Top\n\nBefore ![pixel](${image}) after.\n\nTail`);
  const node=await page.locator('.live-inline-image').elementHandle();await expect(page.locator('.live-inline-image')).toBeVisible();
  await page.getByTestId('note-editor').press('ControlOrMeta+Home');
  await page.keyboard.insertText('An inserted prefix that is longer than the original first line ');
  expect(await node!.evaluate(el=>el.isConnected)).toBe(true);
  await page.locator('.live-inline-image').click();
  await expect(page.locator('.live-inline-image')).toHaveCount(0);
  await expect(page.getByTestId('note-editor')).toContainText('![pixel]');
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
