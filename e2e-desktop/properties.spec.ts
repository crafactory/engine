import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

test('property clearing, checkbox and Chinese list edits persist exact Markdown and explicit types across restart', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-property-vault-'));
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-property-profile-'));
  let app: ElectronApplication | undefined;
  const file = path.join(root, 'Persist.md');
  const launch = () =>
    electron.launch({
      executablePath: process.env.E2E_EXECUTABLE_PATH,
      args: [
        '--no-sandbox',
        ...(process.env.E2E_EXECUTABLE_PATH ? [] : [path.resolve('electron/main.cjs')]),
        '--vault',
        root,
        '--user-data-dir=' + profile,
      ],
      env: { ...process.env, ENGINE_DEV: '0' },
    });
  try {
    await fs.writeFile(
      file,
      '---\nrating: 12.5\ndone: false\naliases: []\n---\n\n# Persist\n\nBody stays exact.\n',
    );
    app = await launch();
    let page = await app.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && message.text().includes('cannot be given refs'))
        errors.push(message.text());
    });
    await expect(page.locator('.note-title h1')).toHaveText('Persist');
    await page.getByTestId('mode-live').click();
    await page.getByRole('button', { name: 'Property type rating', exact: true }).click();
    await page.getByRole('menuitemradio', { name: 'Number', exact: true }).click();
    const rating = page.getByRole('spinbutton', { name: 'rating', exact: true });
    await rating.fill('');
    await rating.press('Enter');
    await page.getByRole('checkbox', { name: 'done', exact: true }).check();
    const aliases = page.getByRole('combobox', { name: 'aliases', exact: true });
    await aliases.fill('中文');
    await aliases.press('Enter');
    const expected =
      '---\nrating: null\ndone: true\naliases:\n  - 中文\n---\n\n# Persist\n\nBody stays exact.\n';
    await expect.poll(() => fs.readFile(file, 'utf8')).toBe(expected);
    const state = () =>
      fs.readFile(path.join(root, '.crafactory/state.json'), 'utf8').then(JSON.parse);
    await expect.poll(async () => (await state()).propertyTypes?.rating).toBe('number');
    expect(errors).toEqual([]);
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    await expect(page.locator('.note-title h1')).toHaveText('Persist');
    await expect(page.getByRole('spinbutton', { name: 'rating', exact: true })).toHaveValue('');
    await expect(page.getByRole('checkbox', { name: 'done', exact: true })).toBeChecked();
    await expect(
      page.getByRole('button', { name: 'Remove aliases value 中文', exact: true }),
    ).toBeVisible();
    expect(await fs.readFile(file, 'utf8')).toBe(expected);
    expect((await state()).propertyTypes.rating).toBe('number');
  } finally {
    await app?.close();
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(profile, { recursive: true, force: true });
  }
});
