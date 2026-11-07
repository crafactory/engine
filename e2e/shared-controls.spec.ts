import { test, expect, type Page } from '@playwright/test';

async function command(page: Page, text: string) {
  await page.getByRole('button', { name: 'Command palette', exact: true }).click();
  await page.getByTestId('palette-input').fill(text);
  await page.keyboard.press('Enter');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.note-title h1')).toHaveText('Welcome');
});

test('registry prompt selects text, traps Tab and cancels without creating a note', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'New note', exact: true });
  await trigger.click();
  const input = page.getByTestId('dialog-input');
  await expect(input).toBeFocused();
  expect(
    await input.evaluate((e: HTMLInputElement) =>
      e.value.slice(e.selectionStart!, e.selectionEnd!),
    ),
  ).toBe('Untitled.md');
  await input.fill('Cancelled migration.md');
  for (let index = 0; index < 7; index++) {
    await page.keyboard.press('Tab');
    await expect(page.locator('.app-prompt :focus')).toHaveCount(1);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('.app-prompt')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByTestId('file-Cancelled migration.md')).toHaveCount(0);
  await trigger.click();
  await page.locator('[data-slot="dialog-overlay"]').click({ position: { x: 8, y: 8 } });
  await expect(page.locator('.app-prompt')).toHaveCount(0);
});

test('palette releases focus to the next prompt and confirmation starts on Cancel', async ({
  page,
}) => {
  await command(page, 'Create new note');
  await expect(page.getByTestId('dialog-input')).toBeFocused();
  await page.getByTestId('dialog-input').fill('Keep migration.md');
  await page.keyboard.press('Enter');
  await expect(page.locator('.note-title h1')).toHaveText('Keep migration');
  await command(page, 'Move current file to trash');
  await expect(page.getByTestId('dialog-cancel')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('file-Keep migration.md')).toBeVisible();
  await expect(page.locator('.app-prompt')).toHaveCount(0);
});

test('switcher arrows select real results and composition Enter cannot create a note', async ({
  page,
}) => {
  await command(page, 'Open quick switcher');
  const input = page.getByTestId('palette-input');
  await input.fill('');
  const options = page.getByRole('option');
  await expect(options.first()).toHaveAttribute('data-selected', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(options.nth(1)).toHaveAttribute('data-selected', 'true');
  const chosen = await options.nth(1).locator('strong').innerText();
  await page.keyboard.press('Enter');
  await expect(page.locator('.note-title h1')).toHaveText(
    chosen.replace(/\.md$/, '').split('/').at(-1)!,
  );
  await command(page, 'Open quick switcher');
  await input.fill('No matches composition fixture');
  await expect(options).toHaveCount(0);
  await input.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
  await expect(input).toBeFocused();
  await expect(page.getByTestId('file-No matches composition fixture.md')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(page.locator('.note-title h1')).toHaveText('No matches composition fixture');
});

test('settings navigation is reachable at phone and short landscape sizes in both themes', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  for (const size of [
    { width: 375, height: 812 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    for (const name of [
      'Appearance',
      'Editor',
      'Files & links',
      'Hotkeys',
      'Core plugins',
      'Community plugins',
      'Extensions',
      'About',
    ]) {
      await page.locator('.app-settings > nav').getByRole('button', { name, exact: true }).click();
      await expect(page.locator('.settings-content > header h2')).toHaveText(name);
    }
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    for (const theme of ['light', 'dark']) {
      await page.getByTestId('theme-' + theme).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const bounds = await page.locator('.app-settings').boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(size.width + 1);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(size.height + 1);
    }
  }
});
