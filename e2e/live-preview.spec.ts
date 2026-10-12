import {test,expect,type Page} from '@playwright/test';
const fixture='# Live fixtures\n\nLead paragraph with $x^2$ and `code $x$`.\n\n| Name | State |\n| :--- | ---: |\n| Alpha | Open |\n| Beta | Closed |\n\n- [ ] First task\n- [x] Second task\n\n> [!note]- Folded title\n> Hidden callout content.\n\n$$\nx^2 + y^2\n$$\n\n```js\nconst answer = 42;\n```\n\n```mermaid\nflowchart LR\nA-->B\n```\n\n![[Ideas/Small pieces, loosely joined]]\n\nLast paragraph.\n';
/** Populate a note through the source editor before exercising live-preview controls. */
async function prepare(page:Page,content=fixture){
  await page.goto('/');await expect(page.locator('.note-title h1')).toHaveText('Welcome');
  await page.getByRole('button',{name:'New note',exact:true}).click();await page.getByTestId('dialog-input').fill('Live QA.md');await page.getByTestId('dialog-submit').click();
  await page.getByTestId('mode-source').click();await page.getByTestId('note-editor').click();await page.keyboard.press('Control+a');await page.keyboard.insertText(content);
  await page.getByTestId('mode-live').click();await expect(page.locator('.live-block')).not.toHaveCount(0);
}
test('removed header gives the workspace full top edge and keeps vault switching',async({page})=>{
  await page.goto('/');await expect(page.locator('.note-title h1')).toHaveText('Welcome');
  await expect(page.locator('.titlebar')).toHaveCount(0);
  expect((await page.locator('.tabbar').boundingBox())?.y).toBe(0);
  await expect(page.getByRole('button',{name:'Open another vault',exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  expect((await page.locator('.left-sidebar').boundingBox())?.y).toBe(0);
  await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();
  await page.getByRole('button',{name:'Expand sidebar',exact:true}).click();await expect(page.locator('.sidebar-footer')).toBeVisible();
});
test('inactive blocks render math, code, diagrams, tables and note embeds',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await prepare(page);
  await expect(page.locator('.live-block-table table')).toBeVisible();
  await expect(page.locator('.live-block-math .katex-display')).toBeVisible();
  await expect(page.locator('.live-block-code pre')).toContainText('const answer = 42;');
  await expect(page.locator('.live-block-diagram .mermaid svg')).toBeVisible();
  await expect(page.locator('.live-block-embed .embedded-note')).toContainText('Small pieces');
  await expect(page.locator('.live-inline-math')).toHaveCount(1);
  expect(errors).toEqual([]);
});
test('edit source reveals one block and moving away restores its preview',async({page})=>{
  await prepare(page);await page.locator('.live-block-code').hover();await page.getByRole('button',{name:'Edit code source',exact:true}).click();
  await expect(page.locator('.live-block-code')).toHaveCount(0);await expect(page.getByTestId('note-editor')).toContainText('```js');
  await page.keyboard.press('Control+Home');await expect(page.locator('.live-block-code pre')).toContainText('const answer = 42;');
  await page.getByTestId('mode-source').click();await expect(page.getByTestId('note-editor')).toContainText('```js');
  await page.getByTestId('mode-reading').click();await expect(page.locator('.reading-surface pre').first()).toContainText('const answer = 42;');
});
test('live table edits preserve Markdown delimiters and escaped pipes',async({page})=>{
  await prepare(page);await page.getByRole('button',{name:'Edit cell row 2 column 2',exact:true}).click();
  await page.getByRole('textbox',{name:'Cell row 2 column 2',exact:true}).fill('In | progress');
  await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Edit cell row 2 column 2',exact:true})).toContainText('In | progress');
  await page.getByTestId('mode-source').click();await page.keyboard.press('Control+Home');
  await expect(page.getByTestId('note-editor')).toContainText('| Alpha | In \\| progress |');
  await expect(page.getByTestId('note-editor')).toContainText('| :--- | ---: |');
});
test('table cancel, undo and redo preserve editable preview',async({page})=>{
  await prepare(page);await page.getByRole('button',{name:'Edit cell row 2 column 2',exact:true}).click();
  await page.getByRole('textbox',{name:'Cell row 2 column 2',exact:true}).fill('Cancel me');await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Edit cell row 2 column 2',exact:true})).toHaveText('Open');
  await page.getByRole('button',{name:'Edit cell row 2 column 2',exact:true}).click();
  await page.getByRole('textbox',{name:'Cell row 2 column 2',exact:true}).fill('Done');await page.keyboard.press('Enter');
  await page.getByTestId('note-editor').press('Control+z');await expect(page.getByRole('button',{name:'Edit cell row 2 column 2',exact:true})).toHaveText('Open');
  await page.getByTestId('note-editor').press('Control+Shift+z');await expect(page.getByRole('button',{name:'Edit cell row 2 column 2',exact:true})).toHaveText('Done');
});
test('live task checkbox edits exactly its task and retains frontmatter',async({page})=>{
  await prepare(page,'---\naliases: [Live]\n---\n'+fixture);
  await page.getByRole('checkbox',{name:'Toggle task: First task',exact:true}).check();
  await expect(page.getByRole('checkbox',{name:'Toggle task: Second task',exact:true})).toBeChecked();
  await page.getByRole('checkbox',{name:'Toggle task: First task',exact:true}).uncheck();
  await page.getByTestId('mode-source').click();await page.keyboard.press('Control+Home');await expect(page.getByTestId('note-editor')).toContainText('aliases: [Live]');
  await expect(page.getByTestId('note-editor')).toContainText('- [ ] First task');
});
test('foldable callouts honor defaults and toggle in live and reading views',async({page})=>{
  await prepare(page);
  const details=page.locator('.live-block-callout details');await expect(details).not.toHaveAttribute('open');
  await details.locator('summary').click();await expect(details).toHaveAttribute('open','');await expect(details).toContainText('Hidden callout content.');
  await details.locator('summary').click();await expect(details).not.toHaveAttribute('open');
  await page.getByTestId('mode-reading').click();const reading=page.locator('.reading-surface details');
  await expect(reading).not.toHaveAttribute('open');await reading.locator('summary').press('Enter');await expect(reading).toHaveAttribute('open','');
});
test('selection crossing blocks exposes source rather than losing selected text',async({page})=>{
  await prepare(page);await page.getByTestId('note-editor').press('Control+Home');await page.keyboard.press('Control+Shift+End');
  await expect(page.locator('.live-block')).toHaveCount(0);await expect(page.getByTestId('note-editor')).toContainText('| Alpha | Open |');
  await page.keyboard.press('ArrowLeft');await expect(page.locator('.live-block-table')).toBeVisible();
});
test('invalid diagrams and missing embeds keep editable source without page errors',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await prepare(page,'# Errors\n\n```mermaid\nnot valid diagram\n```\n\n![[Missing note]]\n\n$$\\badcommand$$\n\nEnd.');
  await expect(page.locator('.live-block-embed')).toContainText('Unresolved embed: Missing note');
  await page.locator('.live-block-diagram').hover();await page.getByRole('button',{name:'Edit diagram source',exact:true}).click();
  await expect(page.getByTestId('note-editor')).toContainText('not valid diagram');expect(errors).toEqual([]);
});
test('live tables fit a narrow editor and their source remains accessible',async({page})=>{
  await prepare(page);await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();
  await expect(page.locator('.live-block-table')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.locator('.live-block-table').getByRole('button',{name:'Edit table source',exact:true}).click();
  await expect(page.getByTestId('note-editor')).toContainText('| Alpha | Open |');
});
test('expanded and nested callouts preserve independent folding defaults',async({page})=>{
  await prepare(page,'# Callouts\n\n> [!note]+ Outer title\n> Outer body.\n>\n> > [!warning]- Inner title\n> > Inner body.\n\nEnd.');
  const outer=page.locator('.live-block-callout details').first(),inner=outer.locator('details');
  await expect(outer).toHaveAttribute('open','');await expect(inner).not.toHaveAttribute('open');
  await inner.locator('summary').click();await expect(inner).toHaveAttribute('open','');await expect(inner.locator('p')).toHaveText('Inner body.');
  await page.getByTestId('mode-source').click();await expect(page.getByTestId('note-editor')).toContainText('> > [!warning]- Inner title');
});
test('table header edits commit on blur and Tab commits a body cell',async({page})=>{
  await prepare(page);await page.getByRole('button',{name:'Edit cell row 1 column 1',exact:true}).click();
  await page.getByRole('textbox',{name:'Cell row 1 column 1',exact:true}).fill('Title');
  await page.getByRole('button',{name:'Edit cell row 2 column 1',exact:true}).click();
  await expect(page.getByRole('button',{name:'Edit cell row 1 column 1',exact:true})).toHaveText('Title');
  await expect(page.getByRole('textbox',{name:'Cell row 2 column 1',exact:true})).toBeVisible();
  await page.getByRole('textbox',{name:'Cell row 2 column 1',exact:true}).fill('Renamed');await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name:'Edit cell row 2 column 1',exact:true})).toHaveText('Renamed');
});
test('live embeds refresh when the target note is edited',async({page})=>{
  await prepare(page);await page.locator('.live-block-embed .embed-title').click();
  await expect(page.locator('.note-title h1')).toHaveText('Small pieces, loosely joined');
  await page.getByTestId('mode-source').click();await page.getByTestId('note-editor').click();await page.keyboard.press('Control+End');await page.keyboard.insertText('\nEmbed refresh marker.');
  await page.locator('.tabs button').filter({hasText:'Live QA'}).click();await page.getByTestId('mode-live').click();
  await expect(page.locator('.live-block-embed .embedded-note')).toContainText('Embed refresh marker.');
});
