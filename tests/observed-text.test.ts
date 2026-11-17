import { describe, expect, it, vi } from 'vitest';
import { observePluginText } from '../src/compat/observed-text';

const note = (version: string) => ({ path: 'Test.md', content: 'content ' + version, version });

describe('per-plugin observed text versions', () => {
  it('tracks both read forms and advances after successful adapter writes', async () => {
    const read = vi.fn().mockResolvedValueOnce(note('2')).mockResolvedValueOnce(note('4')),
      write = vi.fn().mockResolvedValueOnce(note('3')).mockResolvedValueOnce(note('5')),
      text = observePluginText(read, write, () => {});
    expect(await text.read('Test.md')).toBe('content 2');
    await text.write('Test.md', 'three');
    expect(write).toHaveBeenLastCalledWith('Test.md', 'three', '2');
    expect(await text.readVersioned('Test.md')).toEqual(note('4'));
    await text.write('Test.md', 'five');
    expect(write).toHaveBeenLastCalledWith('Test.md', 'five', '4');
    write.mockResolvedValueOnce(note('6'));
    await text.write('Test.md', 'six');
    expect(write).toHaveBeenLastCalledWith('Test.md', 'six', '5');
  });

  it('failed reads and writes do not advance the observed version', async () => {
    const read = vi.fn().mockResolvedValueOnce(note('2')).mockRejectedValueOnce(new Error('read')),
      write = vi.fn().mockRejectedValueOnce(new Error('CONFLICT')).mockResolvedValueOnce(note('3')),
      text = observePluginText(read, write, () => {});
    await text.read('Test.md');
    await expect(text.write('Test.md', 'stale')).rejects.toThrow('CONFLICT');
    await expect(text.read('Test.md')).rejects.toThrow('read');
    await text.write('Test.md', 'retry');
    expect(write).toHaveBeenLastCalledWith('Test.md', 'retry', '2');
  });

  it('isolates paths and plugin instances', async () => {
    const read = vi.fn().mockResolvedValue(note('2')),
      write = vi.fn().mockResolvedValue(note('3')),
      first = observePluginText(read, write, () => {}),
      second = observePluginText(read, write, () => {});
    await first.read('Test.md');
    await second.write('Test.md', 'second plugin');
    expect(write).toHaveBeenLastCalledWith('Test.md', 'second plugin', undefined);
    await first.write('Other.md', 'other path');
    expect(write).toHaveBeenLastCalledWith('Other.md', 'other path', undefined);
    await first.write('Test.md', 'first plugin');
    expect(write).toHaveBeenLastCalledWith('Test.md', 'first plugin', '2');
  });

  it('rejects a read completed after its vault closes', async () => {
    let open = true;
    const read = vi.fn(async () => {
      open = false;
      return note('2');
    });
    const text = observePluginText(read, vi.fn(), () => {
      if (!open) throw new Error('closed vault');
    });
    await expect(text.read('Test.md')).rejects.toThrow('closed vault');
    await expect(text.write('Test.md', 'late')).rejects.toThrow('closed vault');
  });
});
