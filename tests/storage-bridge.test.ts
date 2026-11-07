import {describe,it,expect,vi} from 'vitest';
import {BridgeStorage, createStorageRuntime, DOCUMENTS_CONTRACT, EXPLORER_CONTRACT, STORAGE_CONTRACT} from '../src/services';
import type {Bridge, VaultState} from '../src/types';

function fakeBridge(overrides: Partial<Bridge> = {}): Bridge {
  const base: Bridge = {
    desktop: false,
    vault: async () => ({name: 'V', root: 'r', entries: [], state: {settings: {theme: 'dark'}} as Partial<VaultState>}),
    choose: async () => true,
    list: async () => [],
    read: async path => ({path, content: 'body', version: 'fp'}),
    write: async (path, content, version) => ({path, content, version: version ?? 'v'}),
    create: async (path, content) => ({path, content, version: 'new'}),
    append: async (path, content) => ({path, content, version: 'v2'}),
    pluginData: async () => null,
    mkdir: async () => {},
    rename: async () => {},
    trash: async () => {},
    state: async () => {},
    asset: async () => '',
    attach: async () => 'Attachments/x.png',
    snapshots: async path => [{id: '1', path, time: 5}],
    restore: async () => ({path: 'One.md', content: 'one', version: 'v0'}),
    plugins: async () => [],
    print: async () => {},
    onChange: () => () => {}
  };
  return {...base, ...overrides} as Bridge;
}

describe('bridge-backed storage provider', () => {
  it('normalizes notes and delegates reads/writes', async () => {
    const write = vi.fn(async (path: string, content: string, version?: string) => ({path, content, version: version ?? 'computed'}));
    const storage = new BridgeStorage(fakeBridge({write}));
    expect(await storage.read('One.md')).toEqual({path: 'One.md', content: 'body', version: 'fp'});
    expect(await storage.write('One.md', 'next', 'base')).toEqual({path: 'One.md', content: 'next', version: 'base'});
    expect(write).toHaveBeenCalledWith('One.md', 'next', 'base');
    expect(await storage.create('New.md', 'x')).toEqual({path: 'New.md', content: 'x', version: 'new'});
  });
  it('rejects a bridge read that omits the content fingerprint', async () => {
    const storage = new BridgeStorage(fakeBridge({read: async path => ({path, content: 'body'})}));
    await expect(storage.read('One.md')).rejects.toThrow('no content version');
  });
  it('delegates snapshots, restore, trash, assets and plugin data', async () => {
    const pluginData = vi.fn(async () => ({saved: true}));
    const storage = new BridgeStorage(fakeBridge({pluginData}));
    expect(await storage.snapshots('One.md')).toEqual([{id: '1', path: 'One.md', time: 5}]);
    expect(await storage.restore('1')).toEqual({path: 'One.md', content: 'one', version: 'v0'});
    expect(await storage.attach('x.png', [1])).toBe('Attachments/x.png');
    await storage.pluginData('alpha', {a: 1}, true);
    expect(pluginData).toHaveBeenCalledWith('alpha', {a: 1}, true);
  });
  it('round-trips workspace state through the bridge', async () => {
    const state = vi.fn(async (_value: VaultState) => {});
    const storage = new BridgeStorage(fakeBridge({state}));
    expect(await storage.loadState()).toEqual({settings: {theme: 'dark'}});
    await storage.saveState({settings: {theme: 'light'}});
    expect(state).toHaveBeenCalledWith({settings: {theme: 'light'}});
  });
});

describe('app storage runtime composition', () => {
  it('provides storage and documents over the bridge', async () => {
    const runtime = await createStorageRuntime({bridge: fakeBridge()});
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.kernel.runtime.services.resolve(STORAGE_CONTRACT).ok).toBe(true);
    expect(runtime.kernel.runtime.services.resolve(DOCUMENTS_CONTRACT).ok).toBe(true);
    expect(runtime.kernel.runtime.services.resolve(EXPLORER_CONTRACT).ok).toBe(true);
    expect(runtime.explorer).toBeDefined();
    expect(await runtime.documents.history('One.md')).toEqual([{id: '1', path: 'One.md', time: 5}]);
    expect(await runtime.documents.restore('1')).toEqual({path: 'One.md', content: 'one', version: 'v0'});
    expect(runtime.documents.formatOf('Board.canvas')?.view).toBe('canvas');
  });
});
