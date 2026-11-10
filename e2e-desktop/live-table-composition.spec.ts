import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

test('live table composition retains its input and exact Markdown across desktop restart', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-table-vault-'));
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-table-profile-'));
  const file = path.join(root, 'Persist.md');
  const source =
    '# Persist\n\n| A | Longer column |\n| --- | --- |\n| Short | Value |\n\n```js\nconst following = 1;\n```\n\nTail\n';
  let app: ElectronApplication | undefined;
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
    await fs.writeFile(file, source);
    app = await launch();
    let page = await app.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await expect(page.locator('.note-title h1')).toHaveText('Persist');
    await page.getByTestId('mode-live').click();
    const cell = page.getByRole('button', { name: 'Edit cell row 2 column 1', exact: true });
    await cell.click();
    const input = page.getByRole('textbox', { name: 'Cell row 2 column 1', exact: true });
    const node = await input.elementHandle();
    const following = page.locator('.live-block-code');
    const block = await following.elementHandle();
    const before = await following.boundingBox();
    await input.dispatchEvent('compositionstart', { data: '' });
    await input.fill('中');
    for (const key of ['Enter', 'Tab', 'Escape']) {
      await input.press(key);
      await expect(input).toHaveValue('中');
      await expect(input).toBeFocused();
      expect(await node!.evaluate((element) => element.isConnected)).toBe(true);
      expect(await block!.evaluate((element) => element.isConnected)).toBe(true);
      expect(Math.abs((await following.boundingBox())!.y - before!.y)).toBeLessThanOrEqual(1);
      expect(await fs.readFile(file, 'utf8')).toBe(source);
    }
    await input.fill('中文');
    await input.dispatchEvent('compositionend', { data: '中文' });
    await expect(input).toBeFocused();
    expect(await fs.readFile(file, 'utf8')).toBe(source);
    await input.press('Enter');
    const expected = source.replace('Short', '中文');
    await expect.poll(() => fs.readFile(file, 'utf8')).toBe(expected);
    await cell.click();
    await input.fill('Cancelled draft');
    await input.press('Escape');
    await expect(cell).toHaveText('中文');
    expect(await fs.readFile(file, 'utf8')).toBe(expected);
    await page.screenshot({ path: test.info().outputPath('table-composition.png') });
    expect(errors).toEqual([]);
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    await expect(page.locator('.note-title h1')).toHaveText('Persist');
    await expect(
      page.getByRole('button', { name: 'Edit cell row 2 column 1', exact: true }),
    ).toHaveText('中文');
    expect(await fs.readFile(file, 'utf8')).toBe(expected);
  } finally {
    await app?.close();
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(profile, { recursive: true, force: true });
  }
});
