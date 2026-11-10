/* Owned native table workflow; composition and candidate keys use Android, not CDP. */
import path from 'node:path';
import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { composeNative } from './android-compose.mjs';

/** Verify real composing keys, visible rotation drafts and exact private bytes after restart. */
export async function acceptLiveTable({
  getPage,
  restart,
  writeNative,
  readNative,
  readJSON,
  shell,
  quote,
  APP,
  output,
  nativeTap,
  keyboardVisibility,
  recoverLauncherAnr,
  metadata,
  command,
}) {
  const file = 'Table composition.md';
  const original =
    '# Table composition\n\n| A | Longer column |\n| --- | --- |\n| Short | Value |\n\n```js\nconst following = 1;\n```\n\nTail\n';
  const expected = original.replace('Short', '中文');
  await writeNative('vault/' + file, Buffer.from(original));
  const previous = readJSON('engine-profile/state.json').mobileLayout.active;
  await restart();
  let page = getPage();
  await expect(page.locator('.note-title h1')).toHaveText(path.basename(previous, '.md'));
  await page.getByRole('button', { name: 'Mobile files', exact: true }).click();
  await page.getByTestId('file-' + file).click();
  await expect(page.locator('.note-title h1')).toHaveText('Table composition');
  await command('Live editing');
  const cell = page.getByRole('button', { name: 'Edit cell row 2 column 1', exact: true });
  await nativeTap(cell);
  const input = page.getByRole('textbox', { name: 'Cell row 2 column 1', exact: true });
  await input.fill('');
  const node = await input.elementHandle();
  metadata.tableCompositionEvents = await composeNative({
    page,
    target: input,
    shell,
    quote,
    APP,
    output,
    nativeTap,
    recoverLauncherAnr,
    whileComposing: async () => {
      await expect(input).toHaveValue('中');
      const following = page.locator('.live-block-code');
      const block = await following.elementHandle();
      const before = await following.boundingBox();
      const columns = await page
        .locator('.live-table th')
        .evaluateAll((cells) => cells.map((element) => element.getBoundingClientRect().width));
      for (const key of ['KEYCODE_ENTER', 'KEYCODE_TAB', 'KEYCODE_ESCAPE']) {
        shell('input keyevent ' + key);
        await expect(input).toHaveValue('中');
        await expect(input).toBeFocused();
        assert(await node.evaluate((element) => element.isConnected), 'Retain native input');
        assert(await block.evaluate((element) => element.isConnected), 'Retain following block');
        assert(
          Math.abs((await following.boundingBox()).y - before.y) <= 1,
          'Stable block position',
        );
        const current = await page
          .locator('.live-table th')
          .evaluateAll((cells) => cells.map((element) => element.getBoundingClientRect().width));
        assert(current.every((width, index) => Math.abs(width - columns[index]) <= 1));
        assert.equal(
          readNative('vault/' + file),
          original,
          'Candidate keys do not save partial text',
        );
      }
      await page.screenshot({ path: path.join(output, 'android-table-composing.png') });
    },
  });
  await expect(input).toHaveValue('中文');
  assert.equal(readNative('vault/' + file), original, 'Compositionend retains an unsaved draft');
  await nativeTap(input);
  await expect
    .poll(keyboardVisibility, { timeout: 15000 })
    .toEqual({ native: true, reported: true });
  shell('input keyevent 4');
  await expect.poll(keyboardVisibility).toEqual({ native: false, reported: false });
  try {
    shell('settings put system user_rotation 1');
    await expect.poll(() => page.evaluate(() => innerWidth > innerHeight)).toBe(true);
    await expect(input).toHaveValue('中文');
    assert(await node.evaluate((element) => element.isConnected), 'Rotation retains draft input');
    await expect
      .poll(async () => {
        const box = await input.boundingBox();
        const nav = await page.locator('.mobile-nav').boundingBox();
        const top = await page.locator('.mobile-topbar').boundingBox();
        return (
          !!box && !!nav && !!top && box.y >= top.y + top.height && box.y + box.height <= nav.y
        );
      })
      .toBe(true);
    assert.equal(readNative('vault/' + file), original, 'Rotation does not commit');
    await page.screenshot({ path: path.join(output, 'android-table-landscape.png') });
  } finally {
    shell('settings put system user_rotation 0');
  }
  await expect.poll(() => page.evaluate(() => innerHeight > innerWidth)).toBe(true);
  await expect(input).toHaveValue('中文');
  await input.press('Enter');
  await expect(cell).toHaveText('中文');
  await expect.poll(() => readNative('vault/' + file)).toBe(expected);
  await cell.click();
  await input.fill('Cancelled draft');
  await input.press('Escape');
  await expect(cell).toHaveText('中文');
  assert.equal(readNative('vault/' + file), expected, 'Ordinary Escape cancels');
  await restart();
  page = getPage();
  await expect(page.locator('.note-title h1')).toHaveText('Table composition');
  await expect(
    page.getByRole('button', { name: 'Edit cell row 2 column 1', exact: true }),
  ).toHaveText('中文');
  assert.equal(readNative('vault/' + file), expected, 'Exact table Markdown survives restart');
  await page.screenshot({ path: path.join(output, 'android-table-persisted.png') });
}
