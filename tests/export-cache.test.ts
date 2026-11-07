import { describe, it, expect } from 'vitest';
import { retainExportCache, shareWithCancellation } from '../src/mobile/export-cache';
describe('explicit native share completion and cancellation', () => {
  it('accepts successful completion', async () => {
    await expect(
      shareWithCancellation(async () => ({ activityType: 'test-recipient' })),
    ).resolves.toBeUndefined();
  });
  it('treats the observed Android cancellation as normal completion', async () => {
    await expect(
      shareWithCancellation(async () => {
        throw { message: 'Share canceled' };
      }),
    ).resolves.toBeUndefined();
  });
  it('preserves genuine native failures for the visible error surface', async () => {
    const error = new Error('Permission denied');
    await expect(
      shareWithCancellation(async () => {
        throw error;
      }),
    ).rejects.toBe(error);
  });
  it('does not broadly suppress strings or similar error messages', async () => {
    await expect(
      shareWithCancellation(async () => {
        throw 'Share canceled';
      }),
    ).rejects.toBe('Share canceled');
    await expect(
      shareWithCancellation(async () => {
        throw new Error('Share canceled: unexpected failure');
      }),
    ).rejects.toThrow('unexpected failure');
  });
});
describe('Android share cache retention', () => {
  it('prunes only expired exports and preserves recipients for 24 hours', async () => {
    const removed: string[] = [];
    await retainExportCache(
      [
        { path: 'old', mtime: 1, bytes: 10 },
        { path: 'recent', mtime: 100_000_000, bytes: 20 },
      ],
      10,
      async (path) => {
        removed.push(path);
      },
      100_000_001,
    );
    expect(removed).toEqual(['old']);
  });
  it('bounds retained copies even when shares are canceled', async () => {
    await expect(
      retainExportCache(
        Array.from({ length: 12 }, (_, i) => ({ path: String(i), mtime: 10, bytes: 1 })),
        1,
        async () => {},
        11,
      ),
    ).rejects.toThrow('cache is full');
    await expect(
      retainExportCache(
        [{ path: 'large', mtime: 10, bytes: 256 * 1024 * 1024 }],
        1,
        async () => {},
        11,
      ),
    ).rejects.toThrow('cache is full');
  });
  it('does not hide cleanup failures', async () => {
    await expect(
      retainExportCache(
        [{ path: 'old', mtime: 1, bytes: 10 }],
        1,
        async () => {
          throw new Error('denied');
        },
        100_000_000,
      ),
    ).rejects.toThrow('denied');
  });
});
