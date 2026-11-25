import { test, expect, _electron as electron, chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { nativeTestEnv } from './native-env';

test('plugin secret IPC fails closed outside the desktop native profile', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-secret-vault-'));
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-secret-profile-'));
  try {
    const app = await launch(root, profile);
    try {
      const page = await app.firstWindow();
      expect(
        await page.evaluate((root) => window.engine!.pluginSecrets!(root, 'available'), root),
      ).toBe(false);
      await expect(
        page.evaluate((root) => window.engine!.pluginSecrets!(root, 'list'), root),
      ).rejects.toThrow('Plugin secrets unavailable');
    } finally {
      await app.close();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(profile, { recursive: true, force: true });
  }
});

test('OS keychain round trips synthetic data after restart without mixing vaults', async () => {
  test.skip(!process.env.ENGINE_TEST_OS_KEYCHAIN, 'Requires an isolated OS keychain');
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-secret-integration-'));
  const root = path.join(work, 'vault'),
    other = path.join(work, 'other'),
    profile = path.join(work, 'profile');
  try {
    for (const dir of [root, other, profile]) await fs.mkdir(dir);
    await fs.writeFile(path.join(profile, 'trusted-renderer.json'), '{"nativePlugins":true}');
    for (const [vault, operation, expected] of [
      [root, 'set', 'synthetic-only'],
      [other, 'read', null],
      [root, 'read', 'synthetic-only'],
    ] as const) {
      await withRealKeychain(vault, profile, async (page) => {
        const result = await page.evaluate(
          ({ vault, operation }) => {
            const storage = window.engine!.pluginSecrets!;
            if (!storage(vault, 'available')) throw new Error('OS keychain unavailable');
            if (operation === 'set') storage(vault, 'set', 'fixture-key', 'synthetic-only');
            return storage(vault, 'get', 'fixture-key');
          },
          { vault, operation },
        );
        expect(result).toBe(expected);
      });
    }
    const directory = path.join(profile, 'plugin-secrets');
    const scopes = await fs.readdir(directory);
    expect(scopes).toHaveLength(1);
    const encrypted = await fs.readFile(path.join(directory, scopes[0], 'fixture-key'));
    expect(encrypted.includes(Buffer.from('synthetic-only'))).toBe(false);
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
});

test('pinned Copilot reaches its SharedArrayBuffer boundary with an isolated OS keychain', async () => {
  test.skip(
    !process.env.ENGINE_TEST_OS_KEYCHAIN || !process.env.ENGINE_PLUGIN_CORPUS,
    'Requires an isolated OS keychain and verified upstream input',
  );
  const lock = JSON.parse(
    await fs.readFile(
      new URL('../docs/compatibility/community-corpus.json', import.meta.url),
      'utf8',
    ),
  );
  const pin = lock.plugins.find((plugin: { name: string }) => plugin.name === 'Copilot');
  const source = path.join(process.env.ENGINE_PLUGIN_CORPUS!, pin.directory);
  const manifest = await fs.readFile(path.join(source, 'manifest.json'));
  expect(createHash('sha256').update(manifest).digest('hex')).toBe(pin.manifest_sha256);
  const { id, name } = JSON.parse(manifest.toString('utf8'));
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-copilot-keychain-'));
  const root = path.join(work, 'vault'),
    profile = path.join(work, 'profile'),
    dir = path.join(root, '.crafactory/plugins', id);
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.mkdir(profile);
    await fs.writeFile(path.join(root, 'Test.md'), '# Synthetic fixture\n');
    await fs.writeFile(path.join(profile, 'trusted-renderer.json'), '{"nativePlugins":true}');
    const bundle = await fs.readFile(path.join(source, 'main.js'));
    expect(createHash('sha256').update(bundle).digest('hex')).toBe(pin.main_sha256);
    await fs.writeFile(path.join(dir, 'main.js'), bundle);
    await fs.writeFile(path.join(dir, 'manifest.json'), manifest);
    await withRealKeychain(root, profile, async (page) => {
      expect(
        await page.evaluate((vault) => window.engine!.pluginSecrets!(vault, 'available'), root),
      ).toBe(true);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error' && message.text().includes('failed to start'))
          errors.push(message.text());
      });
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await page.getByRole('button', { name: 'Community plugins', exact: true }).click();
      await page.getByLabel('Runtime for ' + name, { exact: true }).selectOption('renderer');
      await page.getByRole('switch', { name: 'Enable ' + name, exact: true }).click();
      await page.getByTestId('dialog-submit').click();
      await page.getByTestId('settings-close').click();
      await page.getByRole('button', { name: 'Command palette', exact: true }).click();
      await page.getByTestId('palette-input').fill(name + ':');
      await expect.poll(() => errors[0]).toContain('SharedArrayBuffer is not defined');
      await expect(page.locator('.palette-list')).not.toContainText(/copilot:.*chat/i);
    });
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
});

function launch(root: string, profile: string) {
  const executablePath = process.env.E2E_EXECUTABLE_PATH;
  return electron.launch({
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
}

/** Playwright's _electron launcher forces --password-store=basic and a mock Keychain. */
async function withRealKeychain(
  root: string,
  profile: string,
  run: (page: import('@playwright/test').Page) => Promise<void>,
) {
  const packaged = process.env.E2E_EXECUTABLE_PATH;
  const electronBinary = packaged || createRequire(import.meta.url)('electron');
  const child = spawn(
    electronBinary,
    [
      '--no-sandbox',
      '--remote-debugging-address=127.0.0.1',
      '--remote-debugging-port=0',
      ...(process.platform === 'linux' ? ['--password-store=gnome-libsecret'] : []),
      ...(packaged ? [] : [path.resolve('electron/main.cjs')]),
      '--vault',
      root,
      '--user-data-dir=' + profile,
    ],
    { env: nativeTestEnv(profile), stdio: ['ignore', 'ignore', 'pipe'] },
  );
  const exited = once(child, 'exit');
  try {
    const endpoint = await new Promise<string>((resolve, reject) => {
      let buffer = '';
      child.stderr.on('data', (chunk) => {
        buffer = (buffer + chunk).slice(-4096);
        const url = buffer.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/)?.[1];
        if (url) resolve(url);
      });
      child.once('error', reject);
      child.once('exit', (code) => reject(new Error(`Electron exited before CDP: ${code}`)));
    });
    const client = await chromium.connectOverCDP(endpoint);
    try {
      const context = client.contexts()[0];
      const page = context.pages()[0] ?? (await context.waitForEvent('page'));
      await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
      await run(page);
    } finally {
      await client.close();
    }
  } finally {
    child.kill();
    await exited.catch(() => {});
  }
}
