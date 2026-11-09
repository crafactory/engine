import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test('native chrome keeps the content-first layout with standard neutral controls', async ({
  page,
}) => {
  await fixture(page, { settings: { mode: 'source', theme: 'dark' } });
  await expect(page.locator('body')).toHaveCSS('background-color', 'oklch(0.145 0 0)');
  const files = page.getByRole('button', { name: 'Mobile files', exact: true });
  await expect(files).toHaveCSS('border-radius', '8px');
  await expect(files).toHaveCSS('border-top-style', 'solid');
  await expect(files).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('.mobile-nav button')).toHaveCount(6);
  await expect(page.locator('.ribbon,.tabs,.breadcrumbs,.statusbar')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mobile tools', exact: true }).click();
  await page.getByRole('button', { name: 'Mobile settings', exact: true }).click();
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await expect(page.locator('body')).toHaveCSS('background-color', 'oklch(1 0 0)');
});

const desktopLayout = {
  tabs: ['A.md', 'B.md'],
  active: 'A.md',
  split: 'B.md',
  left: true,
  right: true,
  mode: 'source',
};

/** Owned browser bridge fixture; native filesystem/IME certification is a separate APK gate. */
async function fixture(page: Page, state: Record<string, unknown> = {}) {
  const files = new Map([
    ['A.md', { content: '# Alpha\n\nShared editor body.\n', version: '1' }],
    ['B.md', { content: '# Beta\n\nOther note.\n', version: '1' }],
  ]);
  let saved: Record<string, any> = {
      settings: { mode: 'source' },
      layout: structuredClone(desktopLayout),
      ...state,
    },
    failWrites = false;
  const exports: { bytes: number[] }[] = [];
  const entries = () =>
    [...files].map(([path, file]) => ({
      path,
      name: path,
      folder: false,
      size: file.content.length,
      mtime: 1,
      ctime: 1,
    }));
  await page.exposeFunction('fixtureCall', async (method: string, ...args: any[]) => {
    if (method === 'vault')
      return { name: 'Mobile fixture', root: 'fixture', entries: entries(), state: saved };
    if (method === 'list') return entries();
    if (method === 'read') {
      const file = files.get(args[0]);
      if (!file) throw new Error('File not found');
      return { path: args[0], ...file };
    }
    if (method === 'state') {
      saved = args[0];
      return;
    }
    if (method === 'export') {
      exports.push(args[0]);
      return;
    }
    if (method === 'write' || method === 'create') {
      if (failWrites) throw new Error('Fixture disk write failed');
      const [path, content, version] = args,
        old = files.get(path);
      if (method === 'create' && old) throw new Error('File exists');
      if (method === 'write' && version && old?.version !== version) throw new Error('CONFLICT');
      const file = { content, version: String(Number(old?.version ?? 0) + 1) };
      files.set(path, file);
      return { path, ...file };
    }
    throw new Error('Unimplemented fixture method ' + method);
  });
  await page.addInitScript(() => {
    const call = (method: string, ...args: unknown[]) =>
        (window as any).fixtureCall(method, ...args),
      handlers = new Set<() => Promise<boolean>>();
    document.addEventListener('DOMContentLoaded', () =>
      document.body.classList.add('native-android'),
    );
    (window as any).fixtureBack = async () => {
      for (const handler of [...handlers].reverse()) if (await handler()) return true;
      return false;
    };
    (window as any).engine = {
      desktop: false,
      persistent: true,
      platform: 'android',
      formFactor: 'phone',
      vault: () => call('vault'),
      list: () => call('list'),
      read: (path: string) => call('read', path),
      write: (...args: unknown[]) => call('write', ...args),
      create: (...args: unknown[]) => call('create', ...args),
      state: (value: unknown) => call('state', value),
      plugins: async () => [],
      pluginData: async () => null,
      exportFile: async (_name: string, blob: Blob) =>
        call('export', { bytes: Array.from(new Uint8Array(await blob.arrayBuffer())) }),
      nativePlugins: async () => false,
      unsafeEval: async () => false,
      onChange: () => () => {},
      onSuspend: () => () => {},
      onBack: (handler: () => Promise<boolean>) => {
        handlers.add(handler);
        return () => handlers.delete(handler);
      },
    };
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('cannot be given refs'))
      errors.push(message.text());
  });
  await page.goto('/');
  await expect(page.locator('.workspace-loading')).toHaveCount(0);
  await expect(page.locator('.note-title h1')).toBeVisible();
  return {
    files,
    state: () => saved,
    exports,
    errors,
    failWrites: (value: boolean) => {
      failWrites = value;
    },
  };
}
async function tools(page: Page) {
  await page.getByRole('button', { name: 'Mobile tools', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Tools', exact: true })).toBeVisible();
}
async function command(page: Page, text: string) {
  await tools(page);
  await page.getByRole('button', { name: 'Mobile commands', exact: true }).click();
  await page.getByTestId('palette-input').fill(text);
  await page.locator('.palette-list [role="option"]').filter({ hasText: text }).first().click();
}

test('Android mounts only native chrome across portrait, landscape and tablet widths', async ({
  page,
}) => {
  const f = await fixture(page);
  for (const size of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1200, height: 900 },
    { width: 320, height: 720 },
  ]) {
    await page.setViewportSize(size);
    for (const selector of [
      '.ribbon',
      '.tabbar',
      '.note-toolbar',
      '.statusbar',
      '.secondary-pane',
      '.left-sidebar',
      '.right-sidebar',
      '[draggable=true]',
    ])
      await expect(page.locator(selector)).toHaveCount(0);
    await expect(page.locator('.workspace-pane')).toHaveCount(1);
    const bounds = await page
      .locator('.mobile-nav button,.mobile-topbar button')
      .evaluateAll((buttons) =>
        buttons.map((button) => {
          const r = button.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }),
      );
    expect(bounds).toHaveLength(9);
    for (const box of bounds) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(size.width);
      expect(box.y + box.height).toBeLessThanOrEqual(size.height);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Reading view', exact: true }).click();
  await expect(page.locator('.reading-surface')).toBeVisible();
  await page.getByRole('button', { name: 'Edit note', exact: true }).click();
  await expect(page.getByTestId('note-editor')).toBeVisible();
  await tools(page);
  await expect(page.getByTestId('mode-source')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('mode-live').click();
  await expect(page.locator('.mobile-sheet')).not.toBeVisible();
  await tools(page);
  await page.getByTestId('mode-source').click();
  const editor = page.getByTestId('note-editor');
  await editor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.insertText('\n手机 draft');
  await expect.poll(() => f.files.get('A.md')?.content).toContain('手机 draft');
  await tools(page);
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('Saved locally');
  await page.getByRole('button', { name: 'Close mobile sheet' }).click();
  expect(f.errors).toEqual([]);
});

test('mobile tab sheet switches and closes real tabs, with native Back before history', async ({
  page,
}) => {
  const f = await fixture(page);
  await expect(page.getByRole('button', { name: 'Mobile back', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Mobile new note' }).click();
  await page.getByTestId('dialog-input').fill('C.md');
  await page.getByTestId('dialog-submit').click();
  await expect(page.locator('.note-title h1')).toHaveText('C');
  await page.getByRole('button', { name: 'Mobile open tabs' }).click();
  await expect(page.getByRole('dialog', { name: 'Open tabs' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close mobile sheet' })).toBeFocused();
  await page.getByRole('button', { name: 'Close tab B.md', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open tab B.md', exact: true })).toHaveCount(0);
  await expect(page.locator('.mobile-tab-count')).toHaveText('2');
  expect(await page.evaluate(() => (window as any).fixtureBack())).toBe(true);
  await expect(page.getByRole('dialog', { name: 'Open tabs' })).not.toBeVisible();
  await expect(page.locator('.note-title h1')).toHaveText('C');
  await page.getByRole('button', { name: 'Mobile open tabs' }).click();
  await page.getByRole('button', { name: 'Open tab A.md', exact: true }).click();
  await expect(page.locator('.note-title h1')).toHaveText('A');
  await page.getByRole('button', { name: 'Mobile back', exact: true }).click();
  await expect(page.locator('.note-title h1')).toHaveText('C');
  await page.getByRole('button', { name: 'Mobile forward', exact: true }).click();
  await expect(page.locator('.note-title h1')).toHaveText('A');
  await page.getByRole('button', { name: 'Mobile open tabs' }).click();
  await page.getByRole('button', { name: 'Close tab A.md', exact: true }).click();
  await page.getByRole('button', { name: 'Close tab C.md', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Open tabs' })).toContainText('No open notes.');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Mobile new note' }).click();
  await page.getByTestId('dialog-input').fill('D.md');
  await page.getByTestId('dialog-submit').click();
  await expect(page.locator('.note-title h1')).toHaveText('D');
  await expect.poll(() => f.state().mobileLayout?.active).toBe('D.md');
  await page.reload();
  await expect(page.locator('.note-title h1')).toHaveText('D');
  expect(f.files.has('A.md')).toBe(true);
  expect(f.files.has('C.md')).toBe(true);
  expect(f.errors).toEqual([]);
});

test('mobile restoration and named workspaces never overwrite desktop layout or restore drawers', async ({
  page,
}) => {
  const f = await fixture(page, {
    mobileLayout: { ...desktopLayout, active: 'B.md', mode: 'live' },
    workspaces: { Desktop: desktopLayout },
  });
  await expect(page.locator('.note-title h1')).toHaveText('B');
  await tools(page);
  await expect(page.getByTestId('mode-live')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Mobile files' }).click();
  await expect(page.locator('.left-sidebar')).toBeVisible();
  await expect
    .poll(() => f.state().mobileLayout)
    .toMatchObject({ active: 'B.md', left: false, right: false, split: null });
  expect(f.state().layout).toEqual(desktopLayout);
  await page.reload();
  await expect(page.locator('.note-title h1')).toHaveText('B');
  await expect(page.locator('.left-sidebar,.right-sidebar,.secondary-pane')).toHaveCount(0);
  await command(page, 'Load a workspace');
  await page.getByTestId('palette-item-Desktop').click();
  await expect(page.locator('.note-title h1')).toHaveText('A');
  await expect(page.locator('.left-sidebar,.right-sidebar,.secondary-pane')).toHaveCount(0);
  await expect.poll(() => f.state().mobileLayout?.active).toBe('A.md');
  expect(f.state().layout).toEqual(desktopLayout);
  expect(f.errors).toEqual([]);
});

test('Tools retains plugin hosts and exposes settings/context without blocking plugin modals', async ({
  page,
}) => {
  // Registry Button transitions include flex-shrink. Geometry mutations must be
  // instantaneous in both directions, rather than measuring an animation frame.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const f = await fixture(page);
  await page.evaluate(() => {
    const host = document.getElementById('plugin-ribbon')!;
    (window as any).originalRibbon = host;
    const status = document.getElementById('plugin-status')!;
    const toggle = document.createElement('button');
    toggle.textContent = 'Owned toggle';
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-checked', 'false');
    toggle.onclick = () =>
      toggle.setAttribute('aria-checked', String(toggle.getAttribute('aria-checked') !== 'true'));
    const tab = document.createElement('button');
    tab.textContent = 'Owned tab';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    tab.onclick = () => tab.setAttribute('aria-selected', 'true');
    status.append(toggle, tab);
    const button = document.createElement('button');
    button.textContent = 'Owned probe action';
    button.onclick = () => {
      const modal = document.createElement('div');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-label', 'Owned probe dialog');
      modal.className = 'plugin-modal';
      modal.style.cssText = 'position:fixed;inset:40px;z-index:1000;background:white';
      const input = document.createElement('input'),
        select = document.createElement('select');
      select.add(new Option('One', 'one'));
      modal.append(input, select);
      const close = document.createElement('button');
      close.textContent = 'Close owned probe';
      close.onclick = () => modal.remove();
      modal.append(close);
      document.body.append(modal);
    };
    host.append(button);
  });
  await tools(page);
  await expect(page.getByRole('button', { name: 'Owned probe action' })).toBeVisible();
  await page.getByRole('switch', { name: 'Owned toggle' }).click();
  await expect(page.getByRole('switch', { name: 'Owned toggle' })).toBeChecked();
  await page.getByRole('tab', { name: 'Owned tab' }).click();
  await expect(page.getByRole('tab', { name: 'Owned tab' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('dialog', { name: 'Tools', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Mobile tools', exact: true })).toBeFocused();
  expect(
    await page.evaluate(
      () => document.getElementById('plugin-ribbon') === (window as any).originalRibbon,
    ),
  ).toBe(true);
  await tools(page);
  await page.getByRole('button', { name: 'Owned probe action' }).click();
  await expect(page.getByRole('dialog', { name: 'Tools', exact: true })).not.toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Owned probe dialog' })).toBeVisible();
  expect(
    await page
      .locator('.plugin-modal input,.plugin-modal select')
      .evaluateAll(
        (controls) =>
          controls.length === 2 &&
          controls.every((control) => control.getBoundingClientRect().height >= 44),
      ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Close owned probe' }).click();
  await tools(page);
  await page.getByRole('button', { name: 'Note context', exact: true }).click();
  await expect(page.locator('.right-sidebar')).toBeVisible();
  expect(await page.evaluate(() => (window as any).fixtureBack())).toBe(true);
  await tools(page);
  await page.getByRole('button', { name: 'Bookmarks', exact: true }).click();
  await expect(page.locator('.left-sidebar')).toContainText('Bookmarks');
  expect(await page.evaluate(() => (window as any).fixtureBack())).toBe(true);
  await tools(page);
  await page.getByRole('button', { name: 'Mobile commands', exact: true }).click();
  await page.getByTestId('palette-input').fill('Split editor');
  await expect(page.locator('.palette-list')).toContainText('No matches');
  await page.keyboard.press('Escape');
  await tools(page);
  await page.getByRole('button', { name: 'Mobile settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible();
  const oldShrink = await page.addStyleTag({
    content: '.settings-modal>nav>button{flex-shrink:1!important}',
  });
  expect(
    await page
      .locator('.settings-modal>nav>button')
      .evaluateAll((buttons) =>
        buttons.every((button) => button.scrollWidth <= button.clientWidth + 1),
      ),
  ).toBe(false);
  await oldShrink.evaluate((style) => style.remove());
  expect(
    await page
      .locator('.settings-modal>nav>button')
      .evaluateAll((buttons) =>
        buttons.every((button) => button.scrollWidth <= button.clientWidth + 1),
      ),
  ).toBe(true);
  expect(
    await page.locator('.settings-modal>nav').evaluate((nav) => nav.scrollWidth > nav.clientWidth),
  ).toBe(true);
  await page.getByRole('button', { name: 'Core plugins', exact: true }).click();
  const switchBounds = await page
    .getByRole('switch', { name: 'Enable Search', exact: true })
    .boundingBox();
  expect(switchBounds!.width).toBeGreaterThanOrEqual(44);
  expect(switchBounds!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('switch', { name: 'Enable Search', exact: true }).uncheck();
  await page.getByRole('switch', { name: 'Enable Command palette', exact: true }).uncheck();
  await page.getByTestId('settings-close').click();
  await expect(page.getByRole('button', { name: 'Mobile search', exact: true })).toBeDisabled();
  await tools(page);
  await expect(page.getByRole('button', { name: 'Mobile commands', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Mobile settings', exact: true })).toBeEnabled();
  await page.keyboard.press('Escape');
  expect(f.errors).toEqual([]);
});

test('Android reading startup restores the preferred editing mode and ZIP preserves both layouts', async ({
  page,
}) => {
  const mobileLayout = {
    ...desktopLayout,
    tabs: ['B.md', 'A.md'],
    active: 'B.md',
    split: null,
    left: false,
    right: false,
    mode: 'reading',
  };
  const f = await fixture(page, { mobileLayout, propertyTypes: { project: 'text' } });
  await expect(page.locator('.reading-surface')).toBeVisible();
  await page.getByRole('button', { name: 'Edit note', exact: true }).click();
  await tools(page);
  await expect(page.getByTestId('mode-source')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await command(page, 'Export entire vault');
  await expect.poll(() => f.exports.length).toBe(1);
  const zip = await JSZip.loadAsync(new Uint8Array(f.exports[0].bytes));
  const state = JSON.parse(await zip.file('.crafactory/state.json')!.async('string'));
  expect(state.layout).toEqual(desktopLayout);
  expect(state.propertyTypes).toEqual({ project: 'text' });
  expect(state.mobileLayout).toMatchObject({ ...mobileLayout, mode: 'source' });
  expect(await zip.file('B.md')!.async('string')).toBe(f.files.get('B.md')!.content);
  expect(f.errors).toEqual([]);
});

test('native shell keeps failed drafts visible and permits explicit save retry', async ({
  page,
}) => {
  const f = await fixture(page);
  f.failWrites(true);
  await page.getByTestId('note-editor').click();
  await page.keyboard.press('Control+End');
  await page.keyboard.insertText('\nKeep this draft');
  await expect(page.locator('.error-banner')).toContainText('Fixture disk write failed');
  expect(f.files.get('A.md')?.content).not.toContain('Keep this draft');
  await expect(page.locator('.mobile-unsaved-dot')).toHaveAttribute('aria-label', '1 unsaved');
  await tools(page);
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('1 unsaved');
  await page.keyboard.press('Escape');
  f.failWrites(false);
  await command(page, 'Save all pending changes');
  await expect.poll(() => f.files.get('A.md')?.content).toContain('Keep this draft');
  await expect(page.locator('.mobile-unsaved-dot')).toHaveCount(0);
  expect(f.errors).toEqual([]);
});

test.describe('shadcn theme follows the application preference', () => {
  test.use({ hasTouch: false });
  for (const theme of ['light', 'dark'] as const)
    test(`${theme} ignores the opposite system theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme === 'light' ? 'dark' : 'light' });
      const f = await fixture(page, { settings: { mode: 'source', theme } });
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const button = page.getByRole('button', { name: 'Mobile more actions', exact: true });
      await button.hover();
      const expected = await page.evaluate((theme) => {
        const probe = document.createElement('span');
        probe.style.backgroundColor =
          theme === 'dark' ? 'color-mix(in oklab, var(--hover) 50%, transparent)' : 'var(--hover)';
        document.body.append(probe);
        const value = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return value;
      }, theme);
      await expect
        .poll(() => button.evaluate((element) => getComputedStyle(element).backgroundColor))
        .toBe(expected);
      expect(f.errors).toEqual([]);
    });
});
