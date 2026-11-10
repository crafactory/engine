import { expect, type Page } from '@playwright/test';

export const desktopLayout = {
  tabs: ['A.md', 'B.md'],
  active: 'A.md',
  split: 'B.md',
  left: true,
  right: true,
  mode: 'source',
};

/** Owned browser bridge fixture; native filesystem/IME acceptance is a separate APK gate. */
export async function fixture(page: Page, state: Record<string, unknown> = {}) {
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
