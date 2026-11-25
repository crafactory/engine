import { expect, test } from '@playwright/test';

test('keyboard opens the menu, moves focus and hands it off to a prompt', async ({ page }) => {
  await page.goto('/');
  const row = page.getByTestId('file-Welcome.md');
  await row.focus();
  await row.press('Shift+F10');
  const menu = page.getByRole('menu', { name: 'File actions' });
  await expect(menu.getByRole('menuitem', { name: 'Open', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'Open in split' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(row).toBeFocused();
  await row.press('Shift+F10');
  await menu.getByRole('menuitem', { name: 'Rename or move' }).press('Enter');
  await expect(menu).toHaveCount(0);
  await expect(page.getByTestId('dialog-input')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(row).toBeFocused();
});

for (const theme of ['dark', 'light']) {
  test(`right-click collision is bounded in short landscape (${theme})`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByTestId('theme-' + theme).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.getByTestId('settings-close').click();
    await page.setViewportSize({ width: 700, height: 240 });
    const row = page.getByTestId('file-Guides/Getting started.md');
    await row.click({ button: 'right' });
    const menu = page.getByRole('menu', { name: 'File actions' });
    await expect(menu).toBeVisible();
    await expect
      .poll(async () => {
        const box = (await menu.boundingBox())!;
        return box.y >= 0 && box.x >= 0 && box.y + box.height <= 241 && box.x + box.width <= 701;
      })
      .toBe(true);
    await page.keyboard.press('End');
    await expect(menu.getByRole('menuitem', { name: 'Move to trash' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(row).toBeFocused();
  });
}
