import { test, expect, type Page } from '@playwright/test';

const content =
  '# Footnotes\n\n中文😀 first[^a] repeated[^a]. Inline ^[inline **bold**].\n\n[^a]: original content\n    continued\n\n[^orphan]: unused text\n';
async function command(page: Page, label: string) {
  await page.getByRole('button', { name: 'Command palette', exact: true }).click();
  await page.getByTestId('palette-input').fill(label);
  await page.keyboard.press('Enter');
}
async function create(page: Page, name: string) {
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.getByTestId('dialog-input').fill(name);
  await page.getByTestId('dialog-submit').click();
  await page.getByTestId('mode-source').click();
}
test.beforeEach(async ({ page }) => {
  page.on('console', (message) => {
    if (message.text().startsWith('FOOTNOTES_WORKER:')) console.log(message.text());
  });
  await page.goto('/');
  await expect(page.locator('.note-title h1')).toHaveText('Welcome');
});
test('footnotes view lists, edits and navigates actual named and inline source', async ({
  page,
}) => {
  await create(page, 'Footnotes.md');
  await page.getByTestId('note-editor').click();
  await page.keyboard.insertText(content);
  await command(page, 'Show footnotes view');
  const panel = page.getByRole('region', { name: 'Footnotes', exact: true });
  await expect(panel.locator('li')).toHaveCount(3);
  await expect(panel.getByRole('button', { name: 'Edit footnote a', exact: true })).toContainText(
    'original content',
  );
  await expect(panel.getByText('No references', { exact: true })).toBeVisible();
  await page.getByTestId('mode-reading').click();
  await panel.getByRole('button', { name: 'Edit footnote a', exact: true }).click();
  await expect(page.getByTestId('note-editor')).toBeFocused();
  await page.keyboard.insertText('Edited ');
  await expect(page.getByTestId('note-editor')).toContainText('[^a]: Edited original content');
  await expect(panel.getByRole('button', { name: 'Edit footnote a', exact: true })).toContainText(
    'Edited original content',
  );
  await panel.getByRole('button', { name: 'Go to reference 2 of footnote a', exact: true }).click();
  await page.keyboard.insertText('REF ');
  await expect(page.getByTestId('note-editor')).toContainText('repeatedREF [^a]');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.getByTestId('note-editor')).not.toContainText('REF ');
  await panel.getByRole('button', { name: 'Edit footnote inline 2', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('Changed ');
  await expect(page.getByTestId('note-editor')).toContainText('^[Changed inline **bold**]');
  await expect(
    panel.getByRole('button', { name: 'Edit footnote inline 2', exact: true }),
  ).toContainText('Changed inline bold');
  await page.screenshot({ path: test.info().outputPath('footnotes-editing.png') });
});
test('footnotes view follows the active note and updates after source definitions change', async ({
  page,
}) => {
  await create(page, 'Footnotes.md');
  await page.getByTestId('note-editor').click();
  await page.keyboard.insertText(content);
  await page.getByRole('button', { name: 'Footnotes tab', exact: true }).click();
  await expect(page.locator('.footnotes-list li')).toHaveCount(3);
  await create(page, 'No Footnotes.md');
  await expect(page.getByRole('region', { name: 'Footnotes', exact: true })).toContainText(
    'This note has no footnotes.',
  );
  await page
    .locator('.tabs button')
    .filter({ hasText: 'Footnotes' })
    .filter({ hasNotText: 'No Footnotes' })
    .click();
  await expect(page.locator('.footnotes-list li')).toHaveCount(3);
  await page.getByTestId('note-editor').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText('# Empty now\n');
  await expect(page.locator('.footnotes-list li')).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.footnotes-list li')).toHaveCount(3);
  await page.getByRole('button', { name: 'Graph view', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Footnotes', exact: true })).toContainText(
    'Open a Markdown note',
  );
});
test('footnotes core toggle gates the view and command and can be re-enabled', async ({ page }) => {
  await command(page, 'Show footnotes view');
  await expect(page.getByRole('region', { name: 'Footnotes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Core plugins', exact: true }).click();
  await page.getByRole('switch', { name: 'Enable Footnotes view', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Footnotes tab', exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Footnotes', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Command palette', exact: true }).click();
  await page.getByTestId('palette-input').fill('Show footnotes view');
  await expect(page.locator('.palette-list [role="option"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Core plugins', exact: true }).click();
  await page.getByRole('switch', { name: 'Enable Footnotes view', exact: true }).check();
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await command(page, 'Show footnotes view');
  await expect(page.getByRole('region', { name: 'Footnotes', exact: true })).toBeVisible();
});
test('delayed real parser worker discards old note results and edits only current source', async ({
  page,
}) => {
  let release!: () => void, requested!: () => void;
  const gate = new Promise<void>((resolve) => {
      release = resolve;
    }),
    started = new Promise<void>((resolve) => {
      requested = resolve;
    });
  await page.route('**/*footnotes.worker*', async (route) => {
    requested();
    await gate;
    await route.continue();
  });
  await create(page, 'Worker Footnotes.md');
  await page.getByTestId('note-editor').click();
  await page.keyboard.insertText('Old[^old].\n\n[^old]: old body\n');
  await page.getByRole('button', { name: 'Footnotes tab', exact: true }).click();
  try {
    await started;
    await expect(page.getByRole('status')).toHaveText('Loading footnotes...');
    await page.getByTestId('note-editor').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText('New[^new&amp;id].\n\n[^new&amp;id]: new &amp; body\n');
  } finally {
    release();
  }
  await expect(page.locator('.footnotes-list li')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Edit footnote old', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Edit footnote new&amp;id', exact: true }),
  ).toContainText('new & body');
  await page.getByRole('button', { name: 'Edit footnote new&amp;id', exact: true }).click();
  await page.keyboard.insertText('Edited ');
  await expect(page.getByTestId('note-editor')).toContainText(
    '[^new&amp;id]: Edited new &amp; body',
  );
});
