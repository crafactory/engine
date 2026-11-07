import { test, expect } from '@playwright/test';

test('Android Back owns visible drawers and settings while plugin discovery is pending', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const handlers = new Set<() => Promise<boolean>>();
    let release!: () => void;
    const discovery = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entries = [
      { path: 'Welcome.md', name: 'Welcome.md', folder: false, size: 9, mtime: 1, ctime: 1 },
    ];
    (window as any).releaseDiscovery = release;
    (window as any).fixtureBack = async () => {
      for (const handler of [...handlers].reverse()) if (await handler()) return true;
      return false;
    };
    (window as any).engine = {
      desktop: false,
      persistent: true,
      platform: 'android',
      formFactor: 'phone',
      vault: async () => ({ name: 'Startup fixture', root: 'fixture', entries, state: {} }),
      list: async () => entries,
      read: async (path: string) => ({ path, content: '# Welcome', version: 'original' }),
      plugins: async () => {
        await discovery;
        return [];
      },
      state: async () => {},
      onChange: () => () => {},
      onSuspend: () => () => {},
      onBack: (handler: () => Promise<boolean>) => {
        handlers.add(handler);
        return () => handlers.delete(handler);
      },
      pluginData: async () => null,
      unsafeEval: async () => false,
      nativePlugins: async () => false,
    };
  });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await expect(page.locator('.workspace-loading')).toBeVisible();
  await page.getByRole('button', { name: 'Mobile files', exact: true }).click();
  await expect(page.locator('.left-sidebar')).toBeVisible();
  expect(await page.evaluate(() => (window as any).fixtureBack())).toBe(true);
  await expect(page.locator('.left-sidebar')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mobile tools', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Tools', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).fixtureBack())).toBe(true);
  await expect(page.getByRole('dialog', { name: 'Tools', exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Mobile tools', exact: true }).click();
  await page.getByRole('button', { name: 'Mobile settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).fixtureBack())).toBe(true);
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toHaveCount(0);
  await page.evaluate(() => (window as any).releaseDiscovery());
  await expect(page.locator('.note-title h1')).toHaveText('Welcome');
  await expect(page.locator('.workspace-loading')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mobile files', exact: true }).click();
  expect(await page.evaluate(() => (window as any).fixtureBack())).toBe(true);
  await expect(page.locator('.left-sidebar')).toHaveCount(0);
});
