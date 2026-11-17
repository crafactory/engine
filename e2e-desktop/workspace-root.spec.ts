import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { nativeTestEnv } from './native-env';

let root: string, profile: string, app: ElectronApplication, page: Page;
test.beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-root-contract-'));
  profile = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-root-profile-'));
  await fs.writeFile(path.join(root, 'Test.md'), '# Root contract\n');
  const dir = path.join(root, '.crafactory/plugins/root-contract');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, 'manifest.json'),
    JSON.stringify({
      id: 'root-contract',
      name: 'Root contract',
      version: '1.0.0',
      minAppVersion: '0.1.0',
    }),
  );
  await fs.writeFile(
    path.join(dir, 'main.js'),
    `const {Plugin,ItemView}=require('obsidian');
    module.exports=class extends Plugin {
      onload(){this.registerView('root-contract-view',leaf=>new class extends ItemView {
        name='Initial';
        getViewType(){return 'root-contract-view';}
        getDisplayText(){return this.name;}
        async setState(state){this.name=state.name;this.contentEl.setText(state.name);}
      }(leaf));}
    };`,
  );
  const executablePath = process.env.E2E_EXECUTABLE_PATH;
  app = await electron.launch({
    executablePath,
    args: [
      '--no-sandbox',
      ...(executablePath ? [] : [path.resolve('electron/main.cjs')]),
      '--vault',
      root,
      '--user-data-dir=' + profile,
    ],
    env: nativeTestEnv(profile),
  });
  page = await app.firstWindow();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Community plugins', exact: true }).click();
  await page.getByLabel('Runtime for Root contract', { exact: true }).selectOption('renderer');
  await page.getByRole('switch', { name: 'Enable Root contract', exact: true }).click();
  await page.getByTestId('dialog-submit').click();
  await expect(
    page.getByRole('switch', { name: 'Enable Root contract', exact: true }),
  ).toBeChecked();
  await page.getByTestId('settings-close').click();
});
test.afterEach(async () => {
  await app?.close();
  await fs.rm(root, { recursive: true, force: true });
  await fs.rm(profile, { recursive: true, force: true });
});

test('DOM getAttr preserves missing, empty and SVG attribute semantics', async () => {
  expect(
    await page.evaluate(() => {
      const html = document.createElement('div') as any;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as any;
      return [html, svg].map((el) => {
        const missing = el.getAttr('data-probe');
        el.setAttribute('data-probe', '');
        const empty = el.getAttr('data-probe');
        el.setAttribute('data-probe', '中文<&');
        const value = el.getAttr('data-probe');
        el.removeAttribute('data-probe');
        return {
          missing,
          empty,
          value,
          removed: el.getAttr('data-probe'),
          enumerable: Object.keys(Object.getPrototypeOf(el)).includes('getAttr'),
        };
      });
    }),
  ).toEqual(
    Array(2).fill({ missing: null, empty: '', value: '中文<&', removed: null, enumerable: false }),
  );
});

test('same-window leaves share a stable actual document root and container', async () => {
  expect(
    await page.evaluate(async () => {
      const workspace = (window as any).app.workspace;
      const first = workspace.getLeaf(true),
        second = workspace.getRightLeaf(false);
      const root = first.getRoot();
      const result = {
        shared: root === second.getRoot() && root === workspace.rootSplit,
        container: root === first.getContainer() && root === root.getContainer(),
        document: root.doc === document && root.win === window,
        actual: root.containerEl === document.querySelector('main'),
        stable: root === root.getRoot() && first.getRoot() === first.getRoot(),
      };
      await first.detach();
      await second.detach();
      return result;
    }),
  ).toEqual({ shared: true, container: true, document: true, actual: true, stable: true });
});

test('adapter existence queries see current disk state and reject unsafe paths', async () => {
  const exists = (name: string) =>
    page.evaluate((name) => (window as any).app.vault.adapter.exists(name), name);
  expect(await exists('')).toBe(true);
  expect(await exists('Unindexed')).toBe(false);
  await fs.mkdir(path.join(root, 'Unindexed'));
  await fs.writeFile(path.join(root, 'Unindexed/中文.bin'), new Uint8Array([0, 255]));
  expect(await exists('Unindexed')).toBe(true);
  expect(await exists('Unindexed/中文.bin')).toBe(true);
  await fs.unlink(path.join(root, 'Unindexed/中文.bin'));
  expect(await exists('Unindexed/中文.bin')).toBe(false);
  expect(await page.evaluate(() => (window as any).app.vault.adapter.read('Test.md'))).toBe(
    '# Root contract\n',
  );
  await expect(exists('../escape')).rejects.toThrow('Invalid plugin vault path');
  await expect(exists('.crafactory')).rejects.toThrow('Invalid plugin vault path');
});

test('reused view refreshes its host title and close label without replacing the view', async () => {
  await page.evaluate(async () => {
    const leaf = (window as any).app.workspace.getLeaf(true);
    await leaf.setViewState({ type: 'root-contract-view', state: { name: 'Before' } });
  });
  await expect(page.getByRole('button', { name: 'Close Before', exact: true })).toBeVisible();
  expect(
    await page.evaluate(async () => {
      const leaf = (window as any).app.workspace.getLeavesOfType('root-contract-view')[0],
        previous = leaf.view;
      await leaf.setViewState({ type: 'root-contract-view', state: { name: 'After 中文' } });
      return leaf.view === previous;
    }),
  ).toBe(true);
  await expect(page.locator('.plugin-view-header strong')).toHaveText('After 中文');
  await page.getByRole('button', { name: 'Close After 中文', exact: true }).click();
  await expect(page.locator('.plugin-view-pane')).toHaveCount(0);
});

test('adapter writes preserve exact text, reject unsafe paths and refresh native notes', async () => {
  const write = (name: string, data: string) =>
    page.evaluate(({ name, data }) => (window as any).app.vault.adapter.write(name, data), {
      name,
      data,
    });
  await write('Test.md', '# Adapter 中文\n\nSaved from adapter\n');
  expect(await fs.readFile(path.join(root, 'Test.md'), 'utf8')).toBe(
    '# Adapter 中文\n\nSaved from adapter\n',
  );
  await expect(page.getByRole('textbox', { name: 'Note editor', exact: true })).toContainText(
    'Saved from adapter',
  );
  await write('Fixture.json', '{"中文":true}\n');
  await write('Fixture.json', '{"中文":false}\n');
  expect(await fs.readFile(path.join(root, 'Fixture.json'), 'utf8')).toBe('{"中文":false}\n');
  for (const unsafe of ['../escape.md', '.crafactory/state.json', 'image.bin'])
    await expect(write(unsafe, 'do not write')).rejects.toThrow();
  await expect(
    page.evaluate(() => (window as any).app.vault.adapter.write('Test.md', 'bad', { mtime: 0 })),
  ).rejects.toThrow('options');
  expect(await fs.readFile(path.join(root, 'Test.md'), 'utf8')).toBe(
    '# Adapter 中文\n\nSaved from adapter\n',
  );
});
