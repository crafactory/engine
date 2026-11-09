import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.note-title h1')).toHaveText('Welcome');
});

async function add(page: Page, key: string, type: string) {
  await page.getByRole('button', { name: 'Add property', exact: true }).click();
  await page.getByTestId('dialog-input').fill(key);
  await page.getByTestId('dialog-submit').click();
  await page.getByRole('button', { name: `Property type ${key}`, exact: true }).click();
  await page
    .getByRole('menuitemradio', { name: type, exact: true })
    .or(page.getByRole('menuitem', { name: type, exact: true }))
    .click();
}

test('property controls and keyboard type menu use standard owned registry primitives', async ({
  page,
}) => {
  const input = page.getByRole('textbox', { name: 'status', exact: true });
  await expect(input).toHaveAttribute('data-slot', 'input');
  await expect(input).toHaveAttribute('data-engine-ui', '');
  await expect(input).toHaveCSS('border-top-width', '1px');
  await expect(input).toHaveCSS('height', '36px');
  const trigger = page.getByRole('button', { name: 'Property type status', exact: true });
  await trigger.focus();
  await trigger.press('ArrowDown');
  await expect(page.getByRole('menu')).toBeVisible();
  await expect(page.getByRole('menuitemradio', { name: 'Automatic', exact: true })).toBeFocused();
  await page.keyboard.press('n');
  await expect(page.getByRole('menuitemradio', { name: 'Number', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await page.getByRole('menuitemradio', { name: 'Text', exact: true }).click();
  await expect(trigger).toBeFocused();
  await expect(input).toHaveValue('evergreen');
});

test('composition Enter does not publish a partial text value', async ({ page }) => {
  const status = page.getByRole('textbox', { name: 'status', exact: true });
  await status.fill('2026-08-06');
  await status.dispatchEvent('compositionstart');
  await status.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
  await expect(status).toHaveAttribute('type', 'text');
  await status.dispatchEvent('compositionend');
  await status.press('Escape');
  await expect(status).toHaveValue('evergreen');
});

test('composition Enter does not publish a partial list chip', async ({ page }) => {
  const tags = page.getByRole('combobox', { name: 'tags', exact: true });
  await tags.fill('中文');
  await tags.dispatchEvent('compositionstart');
  await tags.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
  await expect(
    page.getByRole('button', { name: 'Remove tags value 中文', exact: true }),
  ).toHaveCount(0);
  await expect(tags).toHaveValue('中文');
  await tags.dispatchEvent('compositionend');
  await tags.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Remove tags value 中文', exact: true }),
  ).toBeVisible();
  await expect(tags).toHaveValue('');
});

test('empty explicit number stays null instead of becoming zero and retains its chosen type', async ({
  page,
}) => {
  await add(page, 'rating', 'Number');
  const rating = page.getByRole('spinbutton', { name: 'rating', exact: true });
  await rating.fill('12.5');
  await rating.press('Enter');
  await rating.fill('');
  await rating.press('Enter');
  await expect(rating).toHaveValue('');
  await page.getByTestId('mode-source').click();
  await expect(page.getByTestId('note-editor')).toContainText('rating: null');
  await page.getByTestId('mode-live').click();
  await expect(rating).toHaveValue('');
  await page.getByTestId('file-Ideas/Connected thinking.md').click();
  await page.getByTestId('file-Welcome.md').click();
  await expect(rating).toHaveValue('');
});

test('invalid exponent cannot replace the last number and Escape cancels the draft', async ({
  page,
}) => {
  await add(page, 'rating', 'Number');
  const rating = page.getByRole('spinbutton', { name: 'rating', exact: true });
  await rating.fill('12.5');
  await rating.press('Enter');
  await rating.fill('');
  await rating.pressSequentially('1e');
  await rating.press('Enter');
  await expect(rating).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('alert')).toContainText('finite number');
  await rating.press('Escape');
  await expect(rating).toHaveValue('12.5');
  await expect(rating).not.toHaveAttribute('aria-invalid', 'true');
  await page.getByTestId('mode-source').click();
  await expect(page.getByTestId('note-editor')).toContainText('rating: 12.5');
});

test('Escape discards a list draft without adding a chip when focus subsequently leaves', async ({
  page,
}) => {
  const tags = page.getByRole('combobox', { name: 'tags', exact: true });
  await tags.fill('discard-me');
  await tags.press('Escape');
  await expect(tags).toHaveValue('');
  await page.getByRole('button', { name: 'Property type tags', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Remove tags value discard-me', exact: true }),
  ).toHaveCount(0);
});

test('property menu closes on outside click and note switch in both themes at narrow widths', async ({
  page,
}) => {
  const toggle = async (label: string) => {
    await page.keyboard.press('Control+p');
    await page.getByTestId('palette-input').fill(label);
    await page.getByRole('option', { name: label, exact: true }).click();
  };
  await toggle('Toggle left sidebar');
  await toggle('Toggle right sidebar');
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const trigger = page.getByRole('button', { name: 'Property type status', exact: true });
      await trigger.click();
      const menu = page.getByRole('menu');
      await expect(menu).toBeVisible();
      const bounds = await menu.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await page.locator('.note-title h1').click();
      await expect(menu).toHaveCount(0);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await toggle('Toggle left sidebar');
  await page.getByRole('button', { name: 'Property type status', exact: true }).click();
  await page.getByTestId('file-Ideas/Connected thinking.md').click();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(page.locator('.note-title h1')).toHaveText('Connected thinking');
});

for (const type of ['Number', 'Date', 'Date & time']) {
  test(`reselecting checked ${type} leaves a cleared property null`, async ({ page }) => {
    await add(page, 'cleared', type);
    const input = page.locator('input[aria-label="cleared"]');
    await input.fill('');
    await input.press('Enter');
    await page.getByRole('button', { name: 'Property type cleared', exact: true }).click();
    await page.getByRole('menuitemradio', { name: type, exact: true }).click();
    await expect(input).toHaveValue('');
    await page.getByTestId('mode-source').click();
    await expect(page.getByTestId('note-editor')).toContainText('cleared: null');
  });
}

for (const fragment of ['-', 'e']) {
  test(`a lone numeric ${fragment} draft cannot silently clear a saved value`, async ({ page }) => {
    await add(page, 'rating', 'Number');
    const rating = page.getByRole('spinbutton', { name: 'rating', exact: true });
    await rating.fill('12.5');
    await rating.press('Enter');
    await rating.fill('');
    await rating.pressSequentially(fragment);
    await rating.press('Enter');
    await expect(rating).toHaveAttribute('aria-invalid', 'true');
    await rating.press('Escape');
    await expect(rating).toHaveValue('12.5');
    await page.getByTestId('mode-source').click();
    await expect(page.getByTestId('note-editor')).toContainText('rating: 12.5');
  });
}

test('scalar blur waits for final composition before committing the changed value', async ({
  page,
}) => {
  const status = page.locator('input[aria-label="status"]');
  await status.fill('2026-08-06');
  await status.dispatchEvent('compositionstart');
  await page.getByRole('combobox', { name: 'tags', exact: true }).focus();
  await expect(status).toHaveAttribute('type', 'text');
  await status.dispatchEvent('compositionend');
  await expect(status).toHaveAttribute('type', 'date');
  await page.getByTestId('mode-source').click();
  await expect(page.getByTestId('note-editor')).toContainText('status: 2026-08-06');
});

test('list blur waits for final composition before publishing one completed chip', async ({
  page,
}) => {
  const tags = page.getByRole('combobox', { name: 'tags', exact: true });
  await tags.fill('中文');
  await tags.dispatchEvent('compositionstart');
  await page.getByRole('textbox', { name: 'status', exact: true }).focus();
  const chip = page.getByRole('button', { name: 'Remove tags value 中文', exact: true });
  await expect(chip).toHaveCount(0);
  await tags.dispatchEvent('compositionend');
  await expect(chip).toHaveCount(1);
  await expect(tags).toHaveValue('');
});

test('Escape resets native invalid-number state even when the saved value is null', async ({
  page,
}) => {
  await add(page, 'rating', 'Number');
  const rating = page.getByRole('spinbutton', { name: 'rating', exact: true });
  await rating.fill('');
  await rating.press('Enter');
  await rating.pressSequentially('-');
  await rating.press('Enter');
  await expect(rating).toHaveAttribute('aria-invalid', 'true');
  await rating.press('Escape');
  await expect(rating).not.toHaveAttribute('aria-invalid', 'true');
  expect(await rating.evaluate((element: HTMLInputElement) => element.validity.badInput)).toBe(
    false,
  );
  await page.getByRole('button', { name: 'Property type rating', exact: true }).focus();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByTestId('mode-source').click();
  await expect(page.getByTestId('note-editor')).toContainText('rating: null');
});
