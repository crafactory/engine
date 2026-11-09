import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.note-title h1')).toHaveText('Welcome');
});

test('saved themes use official neutral surfaces and foregrounds, not the former green palette', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  for (const [name, background, foreground] of [
    ['Light', 'oklch(1 0 0)', 'oklch(0.145 0 0)'],
    ['Dark', 'oklch(0.145 0 0)', 'oklch(0.985 0 0)'],
  ]) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('body')).toHaveCSS('background-color', background);
    await expect(page.locator('body')).toHaveCSS('color', foreground);
  }
});

test('registry prompt retains standard borders, input spacing and neutral radius scale', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  const prompt = page.getByRole('dialog');
  const cancel = page.getByTestId('dialog-cancel');
  await expect(prompt).toHaveCSS('border-top-style', 'solid');
  await expect(prompt).toHaveCSS('border-top-width', '1px');
  await expect(prompt).toHaveCSS('border-radius', '10px');
  await expect(cancel).toHaveCSS('border-top-style', 'solid');
  await expect(cancel).toHaveCSS('border-top-width', '1px');
  await expect(cancel).toHaveCSS('border-radius', '8px');
  const input = page.getByTestId('dialog-input');
  await expect(input).toHaveCSS('padding-left', '12px');
  await expect(input).toHaveCSS('padding-top', '4px');
  await expect(input).toHaveCSS('border-radius', '8px');
});

test('settings navigation and native selects are not resized by legacy appearance rules', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const editor = page.locator('.app-settings > nav').getByRole('button', {
    name: 'Editor',
    exact: true,
  });
  await expect(editor).toHaveCSS('padding-left', '12px');
  await expect(editor).toHaveCSS('padding-top', '8px');
  await expect(editor).toHaveCSS('border-radius', '8px');
  await editor.click();
  const select = page.locator('.app-settings [data-slot="native-select"]').first();
  await expect(select).toHaveCSS('padding-left', '12px');
  await expect(select).toHaveCSS('padding-right', '36px');
  await expect(select).toHaveCSS('padding-top', '8px');
});

test('palette uses registry command items without a second button styling system', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Command palette', exact: true }).click();
  const option = page.getByRole('option').first();
  expect(await option.evaluate((element) => element.tagName)).toBe('DIV');
  await expect(option).toHaveCSS('padding-left', '8px');
  await expect(option).toHaveCSS('padding-top', '6px');
  await expect(option).toHaveCSS('border-radius', '6px');
  await expect(option).toHaveAttribute('data-selected', 'true');
  await expect(option).toHaveCSS('background-color', 'oklch(0.269 0 0)');
});

test('registry resets do not capture an unowned same-named data-slot', async ({ page }) => {
  const styles = await page.evaluate(() => {
    const container = document.createElement('div');
    document.body.append(container);
    return [true, false].map((slotted) => {
      const button = document.createElement('button');
      if (slotted) button.dataset.slot = 'button';
      button.textContent = 'Unowned fixture';
      container.append(button);
      const style = getComputedStyle(button);
      return [style.padding, style.borderStyle, style.fontSize, style.color];
    });
  });
  expect(styles[0]).toEqual(styles[1]);
});

test('unset theme keeps dark tokens and dark registry variants aligned', async ({ page }) => {
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  const cancel = page.getByTestId('dialog-cancel');
  const background = await cancel.evaluate((element) => getComputedStyle(element).backgroundColor);
  const border = await cancel.evaluate((element) => getComputedStyle(element).borderTopColor);
  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  await expect(page.locator('body')).toHaveCSS('background-color', 'oklch(0.145 0 0)');
  await expect(cancel).toHaveCSS('background-color', background);
  await expect(cancel).toHaveCSS('border-top-color', border);
});

test('selected file remains distinct from hovered rows in both themes', async ({ page }) => {
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: theme, exact: true }).click();
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    const selected = page.getByTestId('file-Welcome.md');
    const hovered = page.locator('.tree-row:not(.selected)').first();
    await hovered.hover();
    await expect(selected).toHaveCSS('box-shadow', /inset/);
    await expect(hovered).toHaveCSS('box-shadow', 'none');
    await expect(selected).toHaveCSS('font-weight', '500');
    await selected.hover();
    await expect(selected).toHaveCSS('box-shadow', /inset/);
  }
});
