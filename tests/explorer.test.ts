import {describe,it,expect} from 'vitest';
import {AssemblyError, Kernel} from '../src/kernel';
import {Explorer, explorerPlugin, createExplorerRuntime, EXPLORER_CONTRACT, MemoryStorage, STORAGE_CONTRACT} from '../src/services';
import type {Entry} from '../src/types';

const entry = (path: string, folder = false, mtime = 0): Entry => ({path, name: path.split('/').pop()!, folder, size: 0, mtime, ctime: 0});
const entries: Entry[] = [
  entry('Folder', true, 1),
  entry('Folder/B.md', false, 20),
  entry('Folder/A.md', false, 10),
  entry('Root.md', false, 5)
];

describe('explorer service', () => {
  it('lists children folders-first, then by name or modification time', () => {
    const explorer = new Explorer(new MemoryStorage());
    expect(explorer.children(entries, '').map(item => item.path)).toEqual(['Folder', 'Root.md']);
    expect(explorer.children(entries, 'Folder').map(item => item.path)).toEqual(['Folder/A.md', 'Folder/B.md']);
    expect(explorer.children(entries, 'Folder', 'modified').map(item => item.path)).toEqual(['Folder/B.md', 'Folder/A.md']);
  });
  it('breaks modified-time ties by name for a stable order', () => {
    const explorer = new Explorer(new MemoryStorage());
    const tied = [entry('Folder/B.md', false, 5), entry('Folder/A.md', false, 5), entry('Folder/C.md', false, 5)];
    expect(explorer.sort(tied, 'modified').map(item => item.path)).toEqual(['Folder/A.md', 'Folder/B.md', 'Folder/C.md']);
  });
  it('sorts the storage listing', async () => {
    const storage = new MemoryStorage();
    await storage.write('B.md', '');
    await storage.write('A.md', '');
    await storage.mkdir('Folder');
    const explorer = new Explorer(storage);
    expect((await explorer.list()).map(item => item.path)).toEqual(['Folder', 'A.md', 'B.md']);
  });
});

describe('explorer plugin and dependency flow', () => {
  it('resolves after storage and provides the contract', async () => {
    const runtime = await createExplorerRuntime();
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.kernel.runtime.services.resolve(EXPLORER_CONTRACT).ok).toBe(true);
    expect(runtime.kernel.runtime.services.resolve(STORAGE_CONTRACT).ok).toBe(true);
    expect(await runtime.explorer.list()).toEqual([]);
  });
  it('rejects explorer when storage is missing', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(explorerPlugin());
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(kernel.diagnostics.some(diagnostic => diagnostic.code === 'missing-provider' && diagnostic.contract === STORAGE_CONTRACT)).toBe(true);
  });
});
