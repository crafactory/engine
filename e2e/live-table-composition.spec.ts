import { test, expect, type Page } from '@playwright/test';
import { fixture } from './android-fixture';

const source =
  '# Top\n\n| A | Longer column name |\n| --- | --- |\n| Short | Value |\n\n```js\nconst following = 1;\n```\n\nTail';

/** Create a finite two-column source fixture through the real editor controls. */
async function prepare(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.getByTestId('dialog-input').fill('Composition.md');
  await page.getByTestId('dialog-submit').click();
  await page.getByTestId('mode-source').click();
  await page.getByTestId('note-editor').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(source);
  await page.getByTestId('mode-live').click();
}

for (const width of [1440, 390])
  test(`composing table keys preserve the draft, input and geometry at ${width}px`, async ({
    page,
  }) => {
    await prepare(page);
    await page.setViewportSize({ width, height: 940 });
    if (width < 650)
      await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
    await page.getByRole('button', { name: 'Edit cell row 2 column 1', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Cell row 2 column 1', exact: true });
    const node = await input.elementHandle();
    const following = page.locator('.live-block-code');
    const followingNode = await following.elementHandle();
    const before = await following.boundingBox();
    const widths = () =>
      page
        .locator('.live-table th')
        .evaluateAll((cells) => cells.map((cell) => cell.getBoundingClientRect().width));
    const columns = await widths();
    // Protocol events deliberately isolate the DOM contract; native IME has its own APK gate.
    await input.dispatchEvent('compositionstart', { data: '' });
    await input.fill('中');
    for (const key of ['Enter', 'Tab', 'Escape']) {
      await input.dispatchEvent('keydown', { key, bubbles: true, cancelable: true });
      expect(await node!.evaluate((element) => element.isConnected)).toBe(true);
      await expect(input).toBeFocused();
      await expect(input).toHaveValue('中');
      const current = await widths();
      for (let col = 0; col < columns.length; col++)
        expect(Math.abs(current[col] - columns[col])).toBeLessThanOrEqual(1);
      expect(Math.abs((await following.boundingBox())!.y - before!.y)).toBeLessThanOrEqual(1);
      expect(await followingNode!.evaluate((element) => element.isConnected)).toBe(true);
    }
    await input.fill('中文');
    await input.dispatchEvent('compositionend', { data: '中文' });
    await expect(input).toHaveValue('中文');
    await expect(input).toBeFocused();
    await input.press('Enter');
    await expect(
      page.getByRole('button', { name: 'Edit cell row 2 column 1', exact: true }),
    ).toHaveText('中文');
    await page.getByTestId('mode-source').click();
    await expect(page.getByTestId('note-editor').locator('.cm-line')).toHaveText(
      source.replace('Short', '中文').split('\n'),
    );
  });

for (const guard of [{ isComposing: true }, { keyCode: 229 }])
  test(`table keys respect native composition guard ${JSON.stringify(guard)}`, async ({ page }) => {
    await prepare(page);
    await page.getByRole('button', { name: 'Edit cell row 2 column 1', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Cell row 2 column 1', exact: true });
    await input.fill('Draft');
    for (const key of ['Enter', 'Tab', 'Escape']) {
      await input.dispatchEvent('keydown', { key, ...guard, bubbles: true, cancelable: true });
      await expect(input).toHaveValue('Draft');
      await expect(input).toBeFocused();
    }
    await input.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Edit cell row 2 column 1', exact: true }),
    ).toHaveText('Short');
  });

test('composing table blur defers saving until the final composition value', async ({ page }) => {
  await prepare(page);
  await page.getByRole('button', { name: 'Edit cell row 2 column 1', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Cell row 2 column 1', exact: true });
  await input.dispatchEvent('compositionstart', { data: '' });
  await input.fill('中文');
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  await expect(input).toHaveValue('中文');
  await expect(input).not.toBeFocused();
  await input.dispatchEvent('compositionend', { data: '中文' });
  await expect(input).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Edit cell row 2 column 1', exact: true }),
  ).toHaveText('中文');
});

test('table composition ends locally and ordinary Escape still cancels', async ({ page }) => {
  await prepare(page);
  await page.getByRole('button', { name: 'Edit cell row 2 column 1', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Cell row 2 column 1', exact: true });
  await input.dispatchEvent('compositionstart', { data: '' });
  await input.fill('中文');
  await input.dispatchEvent('compositionend', { data: '中文' });
  await expect(input).toHaveValue('中文');
  await input.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Edit cell row 2 column 1', exact: true }),
  ).toHaveText('Short');
  await page.getByTestId('mode-source').click();
  await expect(page.getByTestId('note-editor').locator('.cm-line')).toHaveText(source.split('\n'));
});

test('native landscape keeps the entire active table input above its navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page, { settings: { mode: 'source', theme: 'light' } });
  await page.getByTestId('note-editor').press('ControlOrMeta+a');
  await page.keyboard.insertText(source);
  await page.getByRole('button', { name: 'Mobile tools', exact: true }).click();
  await page.getByRole('button', { name: 'Live editing', exact: true }).click();
  await page.getByRole('button', { name: 'Edit cell row 2 column 1', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Cell row 2 column 1', exact: true });
  await input.fill('中文 draft');
  const node = await input.elementHandle();
  await page.setViewportSize({ width: 844, height: 344 });
  await expect
    .poll(async () => {
      const box = await input.boundingBox();
      const nav = await page.locator('.mobile-nav').boundingBox();
      const top = await page.locator('.mobile-topbar').boundingBox();
      return !!box && !!nav && !!top && box.y >= top.y + top.height && box.y + box.height <= nav.y;
    })
    .toBe(true);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('中文 draft');
  expect(await node!.evaluate((element) => element.isConnected)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('native-table-landscape.png') });
});
