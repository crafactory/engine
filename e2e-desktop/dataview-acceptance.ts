import { expect, type Page, type TestInfo } from '@playwright/test';

/** Verify unchanged public query scenarios and retain actual DOM evidence on inline failure. */
export async function acceptDataviewReading(page: Page, testInfo: TestInfo) {
  const blocks = page.locator('.reading-surface .plugin-code-block');
  await expect(blocks).toHaveCount(9);
  await expect(blocks.nth(0)).toContainText('Name');
  await expect(blocks.nth(0)).toContainText('Modified');
  await expect(blocks.nth(0)).toContainText('Third');
  await expect(blocks.nth(1)).toContainText('Task one');
  await expect(blocks.nth(1)).toContainText('Task two');
  await expect(blocks.nth(1)).toContainText('Third task');
  await expect(blocks.nth(2)).toContainText('Third');
  await expect(blocks.nth(3)).toContainText('Second');
  expect(
    (await blocks.nth(4).innerText())
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  ).toEqual(['Third', 'Test']);
  await expect(blocks.nth(5)).toContainText('Folder');
  await expect(blocks.nth(5)).toContainText('Third');
  await expect(blocks.nth(5)).toContainText('2');
  await expect(blocks.nth(6)).toContainText('#alpha');
  await expect(blocks.nth(7)).toContainText('JS Test');
  await expect(blocks.nth(8)).toContainText('VIEW Test');
  const reading = page.locator('.reading-surface');
  try {
    await expect(reading).toContainText(/Inline:\s*Test/);
  } catch (error) {
    await testInfo.attach('dataview-reading-dom', {
      body: await reading.innerHTML(),
      contentType: 'text/html',
    });
    await testInfo.attach('dataview-reading-screen', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    throw error;
  }
  await expect(reading).not.toContainText('= this.file.name');
  await expect(page.locator('.toast')).toHaveCount(0);
}
