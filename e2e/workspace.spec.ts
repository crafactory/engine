import {test,expect,type Page} from '@playwright/test';
async function command(page:Page,label:string){await page.getByRole('button',{name:'Command palette',exact:true}).click();await page.getByTestId('palette-input').fill(label);await page.keyboard.press('Enter');}
async function newNote(page:Page,name:string){await page.getByRole('button',{name:'New note',exact:true}).click();await page.getByTestId('dialog-input').fill(name);await page.getByTestId('dialog-submit').click();}
test.beforeEach(async({page})=>{await page.goto('/');await expect(page.locator('.note-title h1')).toHaveText('Welcome');});
test('reading view renders Markdown and toggles tasks',async({page})=>{
  await expect(page.locator('.markdown .callout')).toBeVisible();
  await page.locator('.markdown input[type=checkbox]').nth(1).check();
  await page.getByTestId('mode-source').click();
  await expect(page.getByTestId('note-editor')).toContainText('- [x] Write something worth keeping');
});
test('new note edits, autosaves and survives switching tabs',async({page})=>{
  await newNote(page,'QA Note.md');
  await page.getByTestId('note-editor').click();await page.keyboard.press('ControlOrMeta+End');await page.keyboard.type('A durable thought [[Welcome]].');
  await expect(page.locator('.statusbar')).toContainText('Preview vault');
  await page.getByRole('button',{name:'Reading view',exact:true}).click();
  await expect(page.locator('.markdown')).toContainText('A durable thought');
  await page.locator('.tabs button').filter({hasText:'Welcome'}).click();
  await page.locator('.tabs button').filter({hasText:'QA Note'}).click();
  await expect(page.locator('.markdown')).toContainText('A durable thought');
});
test('all editor modes work without runtime failures',async({page})=>{
  for(const id of ['mode-source','mode-live','mode-reading']){await page.getByTestId(id).click();await expect(page.locator('.error-banner')).toHaveCount(0);}
  await expect(page.locator('.markdown')).toBeVisible();
});
test('live editing hides frontmatter without dropping it on save',async({page})=>{
  await page.getByTestId('mode-live').click();await expect(page.getByTestId('note-editor')).not.toContainText('aliases:');
  await page.getByTestId('note-editor').click();await page.keyboard.press('ControlOrMeta+End');await page.keyboard.type('\nLive metadata check.');await page.getByTestId('mode-source').click();await page.keyboard.press('ControlOrMeta+Home');await expect(page.getByTestId('note-editor')).toContainText('aliases: [Start here]');
});
test('quick switcher supports fuzzy note selection',async({page})=>{
  await page.keyboard.press('ControlOrMeta+o');await page.getByTestId('palette-input').fill('Connected thinking');await page.keyboard.press('Enter');await expect(page.locator('.note-title h1')).toHaveText('Connected thinking');
  await expect(page.locator('.right-sidebar')).toContainText('Linked mentions');
});
test('search supports operators and no-result states',async({page})=>{
  await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByTestId('search-input').fill('tag:#thinking');
  await expect(page.locator('.search-results>button')).toHaveCount(3);
  await page.getByTestId('search-input').fill('nonexistent-content-xyz');await expect(page.locator('.search-meta')).toContainText('0 results');
});
test('graph builds actual note relationships and filters',async({page})=>{
  await page.getByRole('button',{name:'Graph view',exact:true}).click();await expect(page.getByTestId('graph').locator('circle')).toHaveCount(10);
  await page.getByTestId('graph-filter').fill('Connected');await expect(page.getByTestId('graph').locator('circle')).toHaveCount(1);
});
test('Canvas creates, edits and persists a card',async({page})=>{
  await page.getByTestId('file-Projects/Engine.canvas').click();await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await page.getByTestId('canvas-add-text').click();await expect(page.locator('.react-flow__node')).toHaveCount(4);
  await page.locator('.react-flow__node').last().click();await page.locator('.canvas-edit').last().click();await page.getByTestId('canvas-card-content').fill('# QA card\n\nA connected idea.');await page.getByTestId('canvas-save-card').click();
  await expect(page.locator('.canvas-markdown').last()).toContainText('QA card');
  await page.getByTestId('mode-source').click();await page.getByTestId('note-editor').click();await page.keyboard.press('ControlOrMeta+End');await expect(page.getByTestId('note-editor')).toContainText('QA card');
});
test('Bases filters and edits YAML-backed properties',async({page})=>{
  await page.getByTestId('file-Projects/Library.base').click();await expect(page.getByTestId('base-table').locator('tbody tr')).toHaveCount(10);
  await page.getByTestId('base-filter').fill('Connected thinking');await expect(page.getByTestId('base-table').locator('tbody tr')).toHaveCount(1);
  await page.getByTestId('base-table').getByRole('button',{name:'seedling',exact:true}).click();await page.getByTestId('dialog-input').fill('evergreen');await page.getByTestId('dialog-submit').click();await expect(page.getByTestId('base-table')).toContainText('evergreen');
});
test('properties retain YAML types and bookmarks work',async({page})=>{
  await page.locator('.properties>summary').first().click();await page.getByRole('button',{name:'Add property',exact:true}).click();await page.getByTestId('dialog-input').fill('rating');await page.getByTestId('dialog-submit').click();
  await page.getByTitle('Edit rating',{exact:true}).click();await page.getByTestId('dialog-input').fill('5');await page.getByTestId('dialog-submit').click();
  await page.getByRole('button',{name:'Bookmark note',exact:true}).click();await page.getByRole('button',{name:'Bookmarks',exact:true}).click();await expect(page.locator('.bookmark-list')).toContainText('Welcome');
  await page.getByTestId('mode-source').click();await expect(page.getByTestId('note-editor')).toContainText('rating: 5');
});
test('rename updates links across notes',async({page})=>{
  await page.getByTestId('file-Ideas/Connected thinking.md').click();await command(page,'Rename or move current file');await page.getByTestId('dialog-input').fill('Ideas/Renamed idea.md');await page.getByTestId('dialog-submit').click();
  await expect(page.locator('.note-title h1')).toHaveText('Renamed idea');
  await page.getByTestId('file-Welcome.md').click();await page.getByTestId('mode-source').click();await expect(page.getByTestId('note-editor')).toContainText('Ideas/Renamed idea|Connected thinking');
});
test('file recovery restores a saved version',async({page})=>{
  await page.getByTestId('mode-source').click();await page.getByTestId('note-editor').click();await page.keyboard.press('ControlOrMeta+End');await page.keyboard.type('\nRecovery marker.');await page.waitForTimeout(850);
  await command(page,'Open file recovery');await page.locator('.recovery-modal>button').first().click();await expect(page.getByTestId('note-editor')).not.toContainText('Recovery marker.');
});
test('daily notes and templates generate real text',async({page})=>{
  // Always exercise creation rather than whichever demo date happens to match the runner clock.
  await page.clock.install({time:new Date('2030-02-03T12:00:00Z')});await page.reload();
  await expect(page.locator('.note-title h1')).toHaveText('Welcome');await page.clock.pauseAt(new Date('2030-02-03T12:00:01Z'));
  await page.getByRole('button',{name:'Daily note',exact:true}).click();await expect(page.locator('.note-title h1')).toHaveText(/\d{4}-\d{2}-\d{2}/);
  await command(page,'Insert template');await expect(page.getByRole('dialog',{name:'Insert template',exact:true})).toBeVisible();
  const input=page.getByTestId('palette-input');await input.fill('Meeting');await expect(page.getByTestId('palette-item-Templates/Meeting.md')).toBeVisible();
  await page.clock.runFor(150);await expect(input).toBeFocused();await page.keyboard.press('Enter');await page.clock.runFor(20);await expect(page.getByTestId('note-editor')).toContainText('Discussion');
});
test('settings themes, custom CSS and plugin controls',async({page})=>{
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByTestId('theme-light').click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');await page.getByTestId('theme-dark').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.getByRole('button',{name:'Core plugins',exact:true}).click();await page.getByRole('switch',{name:'Enable Graph view',exact:true}).uncheck();await page.getByRole('button',{name:'Extensions',exact:true}).click();await expect(page.getByText('Extensions that contribute settings will appear here.')).toBeVisible();await page.getByTestId('settings-close').click();await expect(page.getByRole('button',{name:'Graph view',exact:true})).toHaveCount(0);
});
test('save and restore workspace and split editor',async({page})=>{
  await command(page,'Split editor right');await expect(page.locator('.secondary-pane')).toBeVisible();await command(page,'Save current workspace');await page.getByTestId('dialog-input').fill('QA layout');await page.getByTestId('dialog-submit').click();
  await page.getByRole('button',{name:'Close split pane',exact:true}).click();await command(page,'Load a workspace');await page.getByTestId('palette-input').fill('QA layout');await page.keyboard.press('Enter');await expect(page.locator('.secondary-pane')).toBeVisible();
});
test('delete confirmation preserves files when canceled',async({page})=>{
  await newNote(page,'Disposable.md');await command(page,'Move current file to trash');await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.locator('.note-title h1')).toHaveText('Disposable');
  await command(page,'Move current file to trash');await page.getByTestId('dialog-submit').click();await expect(page.getByTestId('file-Disposable.md')).toHaveCount(0);
});
test('mobile viewport keeps document and dialogs usable',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();await expect(page.locator('.note-title h1')).toBeVisible();await command(page,'Create new note');await page.getByTestId('dialog-input').fill('Mobile.md');await page.getByTestId('dialog-submit').click();await expect(page.locator('.note-title h1')).toHaveText('Mobile');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('undo, redo, formatting and find/replace are actual editor operations',async({page})=>{
  await newNote(page,'Editing.md');await page.getByTestId('note-editor').click();await page.keyboard.press('ControlOrMeta+End');await page.keyboard.type('Findme');
  await page.keyboard.press('ControlOrMeta+z');await expect(page.getByTestId('note-editor')).not.toContainText('Findme');await page.keyboard.press('ControlOrMeta+Shift+z');await expect(page.getByTestId('note-editor')).toContainText('Findme');
  await page.keyboard.press('ControlOrMeta+Shift+ArrowLeft');await page.keyboard.press('ControlOrMeta+b');await page.getByTestId('mode-source').click();await expect(page.getByTestId('note-editor')).toContainText('**Findme**');
  await command(page,'Find and replace in current note');await expect(page.locator('.cm-search')).toBeVisible();
});
test('tag, outgoing, outline, recent and unlinked context controls work',async({page})=>{
  await page.getByRole('button',{name:'Tags',exact:true}).click();await page.locator('.tag-list>button').filter({hasText:'thinking'}).click();await expect(page.getByTestId('search-input')).toHaveValue('tag:#thinking');
  await page.getByTestId('search-result-Ideas/Connected thinking.md').click();await page.getByRole('button',{name:'Outgoing links tab',exact:true}).click();await expect(page.locator('.right-sidebar .bookmark-list')).toContainText('Small pieces');
  await page.getByRole('button',{name:'Outline tab',exact:true}).click();await page.locator('.outline-list button').filter({hasText:'A simple model'}).click();await expect(page.locator('.katex-display')).toBeVisible();
  await page.getByRole('button',{name:'Recent notes',exact:true}).click();await expect(page.locator('.left-sidebar .bookmark-list')).toContainText('Connected thinking');
});
test('new folder, import, attachment embed and ZIP export preserve files',async({page})=>{
  await page.getByRole('button',{name:'New folder',exact:true}).click();await page.getByTestId('dialog-input').fill('Archive');await page.getByTestId('dialog-submit').click();await expect(page.getByTestId('file-Archive')).toBeVisible();
  await page.locator('input[aria-label="Import files"]').setInputFiles({name:'Imported.md',mimeType:'text/markdown',buffer:Buffer.from('# Imported\n\nA imported thought.')});await expect(page.locator('.note-title h1')).toHaveText('Imported');
  await page.locator('input[aria-label="Add attachment"]').setInputFiles({name:'pixel.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jr1cAAAAASUVORK5CYII=','base64')});await page.getByTestId('mode-reading').click();await expect(page.locator('.markdown .embed-slot img')).toBeVisible();
  const event=page.waitForEvent('download');await command(page,'Export entire vault as ZIP');const zip=await event;expect(zip.suggestedFilename()).toBe('Starter vault.zip');
});
test('Markdown renders math, diagrams and source-safe fenced content',async({page})=>{
  await page.getByTestId('file-Projects/Engine.md').click();await expect(page.locator('.markdown .mermaid svg')).toBeVisible({timeout:15000});
  await page.getByTestId('file-Ideas/Connected thinking.md').click();await expect(page.locator('.katex-display')).toBeVisible();
});
test('unresolved link creates a note and browser vault action reports its limit',async({page})=>{
  await newNote(page,'Linking.md');await page.getByTestId('note-editor').click();await page.keyboard.press('ControlOrMeta+End');await page.keyboard.type('[[New linked idea]]');await page.getByTestId('mode-reading').click();await page.locator('.markdown .internal-link').click();await expect(page.locator('.note-title h1')).toHaveText('New linked idea');
  await page.getByRole('button',{name:'Open another vault',exact:true}).click();await expect(page.getByRole('alert')).toContainText('desktop application');
});
test('slides and all non-destructive export commands produce actual output',async({page})=>{
  await command(page,'Start presentation');await expect(page.locator('.slides-view')).toBeVisible();await page.getByRole('button',{name:'Exit presentation',exact:true}).click();
  for(const label of ['Export current note as Markdown','Export current note as HTML']){const event=page.waitForEvent('download');await command(page,label);const file=await event;expect(file.suggestedFilename()).toMatch(/\.(md|html)$/);}
});
