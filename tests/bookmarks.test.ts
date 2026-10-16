import {describe,it,expect,vi} from 'vitest';
import {Kernel} from '../src/kernel';
import {Bookmarks, bookmarksPlugin, createBookmarksRuntime, BOOKMARKS_CONTRACT} from '../src/services';

describe('bookmarks service', () => {
  it('adds, deduplicates, lists in order and ignores empty paths', () => {
    const bookmarks = new Bookmarks();
    bookmarks.add('A.md');
    bookmarks.add('B.md');
    bookmarks.add('A.md');
    bookmarks.add('');
    expect(bookmarks.list()).toEqual(['A.md', 'B.md']);
    expect(bookmarks.has('A.md')).toBe(true);
    expect(bookmarks.has('C.md')).toBe(false);
  });
  it('toggles and removes without error for missing paths', () => {
    const bookmarks = new Bookmarks();
    expect(bookmarks.toggle('C.md')).toBe(true);
    expect(bookmarks.has('C.md')).toBe(true);
    expect(bookmarks.toggle('C.md')).toBe(false);
    expect(bookmarks.has('C.md')).toBe(false);
    bookmarks.remove('missing.md');
    expect(bookmarks.list()).toEqual([]);
  });
  it('replaces sanitized paths and notifies subscribers once', () => {
    const bookmarks = new Bookmarks(), listener = vi.fn();
    const off = bookmarks.subscribe(listener);
    bookmarks.replace(['X.md', 'X.md', '', 'Y.md']);
    expect(bookmarks.list()).toEqual(['X.md', 'Y.md']);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(['X.md', 'Y.md']);
    off();
    bookmarks.add('Z.md');
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it('accepts an initial seed and discards duplicates', () => {
    expect(new Bookmarks(['A.md', 'A.md', 'B.md']).list()).toEqual(['A.md', 'B.md']);
  });
});

describe('bookmarks plugin composition', () => {
  it('provides the contract through the kernel', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(bookmarksPlugin(new Bookmarks(['A.md'])));
    await kernel.start();
    expect(kernel.diagnostics).toEqual([]);
    const resolved = kernel.runtime.services.resolve(BOOKMARKS_CONTRACT, '^1.0.0');
    expect(resolved.ok).toBe(true);
    if (resolved.ok) expect((resolved.binding.value as Bookmarks).list()).toEqual(['A.md']);
  });
  it('builds a started runtime with a seeded service', async () => {
    const runtime = await createBookmarksRuntime({initial: ['Seed.md']});
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.service.list()).toEqual(['Seed.md']);
    expect(runtime.kernel.runtime.services.resolve(BOOKMARKS_CONTRACT).ok).toBe(true);
    runtime.service.toggle('Seed.md');
    expect(runtime.service.list()).toEqual([]);
  });
});
