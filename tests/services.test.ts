import {describe,it,expect,beforeEach,afterEach,vi} from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {Vault} from '../core/vault.mjs';
import {Kernel} from '../src/kernel';
import {
  MemoryStorage, LocalStorage, STORAGE_CONTRACT, COMMANDS_CONTRACT, DOCUMENTS_CONTRACT,
  CommandRegistry, DocumentStore, createCommandsPlugin, registerDefaultServices,
  type StorageService
} from '../src/services';

interface StorageFixture {service: StorageService; dispose: () => Promise<void>}

/** Run the identical storage contract against a provider factory. */
function storageContract(label: string, create: () => Promise<StorageFixture>): void {
  describe(`${label} storage contract`, () => {
    let fixture: StorageFixture;
    beforeEach(async () => { fixture = await create(); });
    afterEach(async () => { await fixture.dispose(); });

    it('writes and reads text with a content fingerprint', async () => {
      const written = await fixture.service.write('Ideas/Hello.md', '# Hello');
      expect(written.version).toBeTruthy();
      expect(await fixture.service.read('Ideas/Hello.md')).toEqual(written);
    });
    it('create refuses overwrite and admits exactly one competing create', async () => {
      await fixture.service.create('Create.md', 'first');
      await expect(fixture.service.create('Create.md', 'second')).rejects.toThrow();
      const competing = await Promise.allSettled([fixture.service.create('Race.md', 'a'), fixture.service.create('Race.md', 'b')]);
      expect(competing.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    });
    it('detects a stale version without overwriting newer content', async () => {
      const first = await fixture.service.write('One.md', 'one');
      await fixture.service.write('One.md', 'two');
      await expect(fixture.service.write('One.md', 'mine', first.version)).rejects.toThrow(/CONFLICT/);
      expect((await fixture.service.read('One.md')).content).toBe('two');
    });
    it('serializes concurrent appends', async () => {
      await fixture.service.create('Append.md', 'start');
      await Promise.all([fixture.service.append('Append.md', ' A'), fixture.service.append('Append.md', ' B')]);
      expect((await fixture.service.read('Append.md')).content).toBe('start A B');
      await expect(fixture.service.append('Missing.md', 'x')).rejects.toThrow();
    });
    it('lists folders and files while hiding metadata', async () => {
      await fixture.service.write('One.md', 'one');
      await fixture.service.mkdir('Empty');
      expect((await fixture.service.list()).map(entry => entry.path)).toEqual(['Empty', 'One.md']);
    });
    it('rejects parent, hidden, absolute and NUL paths', async () => {
      for (const candidate of ['../escaped.md', 'A/../../escaped.md', '/tmp/escaped.md', '.crafactory/state.json', 'A/../escaped.md', 'bad\0.md']) {
        await expect(fixture.service.write(candidate, 'bad')).rejects.toThrow();
      }
    });
    it('rejects executable formats', async () => {
      await expect(fixture.service.write('run.sh', 'rm')).rejects.toThrow();
    });
    it('renames without overwriting and moves a folder subtree', async () => {
      await fixture.service.write('One.md', 'one');
      await fixture.service.write('Two.md', 'two');
      await expect(fixture.service.rename('One.md', 'Two.md')).rejects.toThrow();
      await fixture.service.write('Folder/Inner.md', 'inner');
      await fixture.service.rename('Folder', 'Moved');
      expect((await fixture.service.read('Moved/Inner.md')).content).toBe('inner');
    });
    it('moves deleted files out of the visible vault', async () => {
      await fixture.service.write('One.md', 'one');
      await fixture.service.trash('One.md');
      expect((await fixture.service.list()).some(entry => entry.path === 'One.md')).toBe(false);
    });
    it('trashes an existing empty folder', async () => {
      await fixture.service.mkdir('Empty');
      await fixture.service.trash('Empty');
      expect((await fixture.service.list()).some(entry => entry.path === 'Empty')).toBe(false);
    });
    it('snapshots changed content only and restores previous versions', async () => {
      const first = await fixture.service.write('One.md', 'one');
      await fixture.service.write('One.md', 'two', first.version);
      const snapshots = await fixture.service.snapshots('One.md');
      expect(snapshots).toHaveLength(1);
      expect((await fixture.service.restore(snapshots[0].id)).content).toBe('one');
      expect(await fixture.service.snapshots('One.md')).toHaveLength(2);
      const unchanged = await fixture.service.write('Two.md', 'same');
      await fixture.service.write('Two.md', 'same', unchanged.version);
      expect(await fixture.service.snapshots('Two.md')).toEqual([]);
    });
    it('isolates plugin data by id and bounds its size', async () => {
      expect(await fixture.service.pluginData('alpha')).toBeNull();
      await fixture.service.pluginData('alpha', {a: 1}, true);
      await fixture.service.pluginData('beta', {b: 2}, true);
      expect(await fixture.service.pluginData('alpha')).toEqual({a: 1});
      expect(await fixture.service.pluginData('beta')).toEqual({b: 2});
      for (const id of ['../beta', 'Alpha', 'a/b', '']) await expect(fixture.service.pluginData(id, {}, true)).rejects.toThrow();
      await expect(fixture.service.pluginData('alpha', 'x'.repeat(1024 * 1024), true)).rejects.toThrow();
    });
    it('round-trips workspace state', async () => {
      await fixture.service.saveState({settings: {theme: 'light'}});
      expect(await fixture.service.loadState()).toEqual({settings: {theme: 'light'}});
    });
    it('stores attachments under the configured folder and avoids collisions', async () => {
      await fixture.service.saveState({settings: {attachmentFolder: 'Media'}});
      const first = await fixture.service.attach('image.png', [1, 2, 3]);
      const second = await fixture.service.attach('image.png', [4]);
      expect(first).toBe('Media/image.png');
      expect(second).not.toBe(first);
      expect(await fixture.service.asset(first)).toBe('data:image/png;base64,AQID');
    });
    it('preserves Unicode paths and content', async () => {
      const name = '想法/你好世界.md';
      await fixture.service.write(name, '# 你好世界\n\n中文内容。');
      expect((await fixture.service.read(name)).content).toBe('# 你好世界\n\n中文内容。');
      expect((await fixture.service.list()).some(entry => entry.path === name)).toBe(true);
    });
    it('reads JavaScript sources used by custom views', async () => {
      await fixture.service.create('View.js', 'dv.paragraph("view");');
      await fixture.service.create('View.mjs', 'export default 1;');
      expect((await fixture.service.read('View.js')).content).toBe('dv.paragraph("view");');
      expect((await fixture.service.read('View.mjs')).content).toBe('export default 1;');
    });
    it('keeps attachments resolvable across a rename', async () => {
      const attached = await fixture.service.attach('image.png', [1, 2, 3]);
      await fixture.service.rename(attached, 'Moved.png');
      expect(await fixture.service.asset('Moved.png')).toBe('data:image/png;base64,AQID');
    });
  });
}

storageContract('memory', async () => ({service: new MemoryStorage(), dispose: async () => {}}));
storageContract('local', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-contract-'));
  // core/vault.mjs is plain JavaScript; assert its Vault-like surface at the boundary.
  return {service: new LocalStorage(await new Vault(root).init() as unknown as StorageService), dispose: () => fs.rm(root, {recursive: true, force: true})};
});

describe('local storage provider specifics', () => {
  it('rejects symlinks that leave the vault', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-contract-'));
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-outside-'));
    try {
      const vault = await new Vault(root).init();
      await fs.symlink(outside, path.join(root, 'External'));
      await expect(vault.write('External/Test.md', 'bad')).rejects.toThrow('Symlink');
    } finally {
      await fs.rm(root, {recursive: true, force: true});
      await fs.rm(outside, {recursive: true, force: true});
    }
  });
});

describe('commands contract', () => {
  it('registers, checks, runs and unregisters commands', async () => {
    const registry = new CommandRegistry(), ran: string[] = [];
    const dispose = registry.register({id: 'hello', name: 'Hello', hotkey: 'mod+h', run: context => { ran.push(context?.open ? 'with-context' : 'plain'); return 42; }});
    registry.register({id: 'never', name: 'Never', check: () => false, run: () => ran.push('never')});
    expect(registry.list().map(command => command.id)).toEqual(['hello', 'never']);
    expect(registry.hotkeys()).toEqual({'mod+h': 'hello'});
    expect(await registry.run('hello')).toBe(42);
    await expect(registry.run('never')).rejects.toThrow('unavailable');
    await expect(registry.run('missing')).rejects.toThrow('not found');
    dispose();
    expect(registry.list().map(command => command.id)).toEqual(['never']);
  });
  it('rejects duplicate ids and malformed definitions', () => {
    const registry = new CommandRegistry();
    registry.register({id: 'a', name: 'A', run: () => {}});
    expect(() => registry.register({id: 'a', name: 'Again', run: () => {}})).toThrow('already registered');
    expect(() => registry.register({id: '', name: 'X', run: () => {}})).toThrow('Invalid command');
  });
  it('disposers only remove their own registration', () => {
    const registry = new CommandRegistry();
    const stale = registry.register({id: 'x', name: 'First', run: () => {}});
    registry.unregister('x');
    registry.register({id: 'x', name: 'Second', run: () => {}});
    stale();
    expect(registry.list().map(command => command.name)).toEqual(['Second']);
  });
  it('builds a started runtime with the command service', async () => {
    const {createCommandsRuntime} = await import('../src/services');
    const runtime = await createCommandsRuntime();
    expect(runtime.kernel.diagnostics).toEqual([]);
    const dispose = runtime.service.register({id: 'probe', name: 'Probe', hotkey: 'mod+k', run: () => 7});
    expect(runtime.service.hotkeys()).toEqual({'mod+k': 'probe'});
    expect(await runtime.service.run('probe')).toBe(7);
    dispose();
    expect(runtime.service.list()).toEqual([]);
  });
  it('is provided to the kernel as a runtime service', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(createCommandsPlugin());
    await kernel.start();
    const resolution = kernel.runtime.services.resolve(COMMANDS_CONTRACT, '^1.0.0');
    expect(resolution.ok).toBe(true);
    if (resolution.ok) (resolution.binding.value as CommandRegistry).register({id: 'x', name: 'X', run: () => {}});
  });
});

describe('documents contract', () => {
  it('resolves formats case-insensitively and restores registrations', () => {
    const store = new DocumentStore(new MemoryStorage());
    expect(store.formatOf('Projects/Upper.CANVAS')?.view).toBe('canvas');
    expect(store.formatOf('Library.base')?.view).toBe('base');
    expect(store.formatOf('notes.md')?.view).toBe('markdown');
    expect(store.formatOf('archive.zip')).toBeUndefined();
    const restore = store.registerFormat({extension: '.foo', view: 'foo'});
    expect(store.formatOf('a.foo')?.view).toBe('foo');
    restore();
    expect(store.formatOf('a.foo')).toBeUndefined();
  });
  it('format disposers do not clobber a newer registration', () => {
    const store = new DocumentStore(new MemoryStorage());
    const stale = store.registerFormat({extension: 'foo', view: 'first'});
    const current = store.registerFormat({extension: 'foo', view: 'second'});
    stale();
    expect(store.formatOf('a.foo')?.view).toBe('second');
    current();
    expect(store.formatOf('a.foo')?.view).toBe('first');
  });
  it('renames documents and exposes history through storage', async () => {
    const storage = new MemoryStorage(), store = new DocumentStore(storage);
    const first = await storage.write('Note.md', 'one');
    await storage.write('Note.md', 'two', first.version);
    const history = await store.history('Note.md');
    expect(history).toHaveLength(1);
    expect((await store.restore(history[0].id)).content).toBe('one');
    await store.rename('Note.md', 'Moved.md');
    expect((await store.read('Moved.md')).content).toBe('one');
  });
  it('is assembled after its storage dependency and resolves the contract', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    registerDefaultServices(kernel, {storage: 'memory'});
    await kernel.start();
    expect(kernel.diagnostics).toEqual([]);
    const documents = kernel.runtime.services.resolve(DOCUMENTS_CONTRACT, '^1.0.0');
    expect(documents.ok).toBe(true);
    expect(kernel.runtime.services.resolve(STORAGE_CONTRACT).ok).toBe(true);
    if (documents.ok) expect((documents.binding.value as DocumentStore).formatOf('a.canvas')?.view).toBe('canvas');
  });
});

describe('default provider composition', () => {
  it('registers memory, commands and documents together without diagnostics', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    registerDefaultServices(kernel, {storage: 'memory'});
    const observer = vi.fn();
    kernel.register({manifest: {id: 'engine.probe', name: 'Probe', version: '1.0.0', consumes: [{contract: COMMANDS_CONTRACT}]}, setup(context) {
      const commands = context.service<CommandRegistry>(COMMANDS_CONTRACT);
      observer(commands.list().length);
    }});
    await kernel.start();
    expect(observer).toHaveBeenCalledWith(0);
    expect(kernel.diagnostics).toEqual([]);
  });
  it('rejects the local profile without a vault', () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    expect(() => registerDefaultServices(kernel, {storage: 'local'})).toThrow('requires a vault');
  });
});
