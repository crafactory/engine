import { expect, it, vi } from 'vitest';
import {
  recordPluginDocumentView,
  retirePluginFileViews,
  recoverPluginFileViews,
  type PluginDocumentView,
} from '../src/plugin-document-views';

it('moves only the same owner/leaf registration to its new path', () => {
  const views = new Map<string, PluginDocumentView>();
  recordPluginDocumentView(views, 'owner', 'drawing', 'Old.md', 'leaf');
  recordPluginDocumentView(views, 'owner', 'board', 'Other.md', 'other-leaf');
  recordPluginDocumentView(views, 'another-owner', 'text', 'Foreign.md', 'leaf');
  recordPluginDocumentView(views, 'owner', 'drawing', 'New.md', 'leaf');
  expect([...views.keys()]).toEqual(['Other.md', 'Foreign.md', 'New.md']);
  expect(views.get('New.md')).toEqual({ pluginId: 'owner', viewType: 'drawing', leafId: 'leaf' });
});

it('does not retire any owner when another owner cannot finish its final save', async () => {
  const change = { seal: vi.fn(), commit: vi.fn(async () => {}), rollback: vi.fn() },
    restore = vi.fn(),
    error = new Error('save failed');
  await expect(
    retirePluginFileViews(
      [
        { prepareFileViews: async () => change },
        {
          prepareFileViews: async () => {
            throw error;
          },
        },
      ],
      'Note.md',
      restore,
    ),
  ).rejects.toBe(error);
  expect(change.seal).not.toHaveBeenCalled();
  expect(change.commit).not.toHaveBeenCalled();
  expect(change.rollback).toHaveBeenCalledOnce();
  expect(restore).not.toHaveBeenCalled();
});

it('rolls back all seals before retirement if a draft changed during preparation', async () => {
  const first = { seal: vi.fn(), commit: vi.fn(async () => {}), rollback: vi.fn() },
    second = {
      seal: vi.fn(() => {
        throw new Error('draft changed');
      }),
      commit: vi.fn(async () => {}),
      rollback: vi.fn(),
    },
    restore = vi.fn();
  await expect(
    retirePluginFileViews(
      [{ prepareFileViews: async () => first }, { prepareFileViews: async () => second }],
      'Note.md',
      restore,
    ),
  ).rejects.toThrow('draft changed');
  for (const change of [first, second]) {
    expect(change.commit).not.toHaveBeenCalled();
    expect(change.rollback).toHaveBeenCalledOnce();
  }
  expect(restore).not.toHaveBeenCalled();
});

it('restores persisted views if owner cleanup fails after retirement starts', async () => {
  const first = {
      seal: vi.fn(),
      commit: vi.fn(async () => {}),
      rollback: vi.fn(),
      restore: vi.fn(async () => {}),
    },
    second = {
      seal: vi.fn(),
      commit: vi.fn(async () => {
        throw new Error('close failed');
      }),
      rollback: vi.fn(),
      restore: vi.fn(async () => {}),
    },
    restore = vi.fn();
  await expect(
    retirePluginFileViews(
      [{ prepareFileViews: async () => first }, { prepareFileViews: async () => second }],
      'Note.md',
      restore,
    ),
  ).rejects.toThrow('close failed');
  expect(restore).toHaveBeenCalledOnce();
  expect(first.rollback).toHaveBeenCalledOnce();
  expect(second.rollback).toHaveBeenCalledOnce();
  expect(first.restore).toHaveBeenCalledOnce();
  expect(second.restore).toHaveBeenCalledOnce();
});
it('returns restoration for a host filesystem failure after successful retirement', async () => {
  const change = {
    seal: vi.fn(),
    commit: vi.fn(async () => {}),
    rollback: vi.fn(),
    restore: vi.fn(async () => {}),
  };
  const restore = await retirePluginFileViews(
    [{ prepareFileViews: async () => change }],
    'Note.md',
    vi.fn(),
  );
  expect(change.restore).not.toHaveBeenCalled();
  await restore();
  expect(change.rollback).toHaveBeenCalledOnce();
  expect(change.restore).toHaveBeenCalledOnce();
});

it('attempts every owner and host mapping even when restoration throws', async () => {
  const original = new Error('close failed'),
    restoreFailure = new Error('reload failed'),
    mapping = vi.fn();
  const first = {
    seal() {},
    async commit() {},
    rollback: vi.fn(),
    restore: vi.fn(async () => {
      throw restoreFailure;
    }),
  };
  const second = {
    seal() {},
    async commit() {
      throw original;
    },
    rollback: vi.fn(),
    restore: vi.fn(async () => {}),
  };
  const failure = await retirePluginFileViews(
    [{ prepareFileViews: async () => first }, { prepareFileViews: async () => second }],
    'Note.md',
    mapping,
  ).catch((error) => error);
  expect(failure).toBeInstanceOf(AggregateError);
  expect(failure.cause).toBe(original);
  expect(mapping).toHaveBeenCalledOnce();
  for (const change of [first, second]) {
    expect(change.rollback).toHaveBeenCalledOnce();
    expect(change.restore).toHaveBeenCalledOnce();
  }
});
it('preserves a host failure and still restores a second file after the first recovery fails', async () => {
  const original = new Error('rename failed'),
    reload = new Error('reload failed'),
    next = vi.fn();
  const failure = await recoverPluginFileViews(original, [
    async () => {
      throw reload;
    },
    next,
  ]).catch((error) => error);
  expect(failure.cause).toBe(original);
  expect(failure.errors).toEqual([original, reload]);
  expect(next).toHaveBeenCalledOnce();
});

it('ignores stale/foreign close notifications and removes only the current matching registration', () => {
  const views = new Map<string, PluginDocumentView>();
  recordPluginDocumentView(views, 'owner', 'drawing', 'Old.md', 'leaf');
  recordPluginDocumentView(views, 'owner', 'drawing', 'New.md', 'leaf');
  recordPluginDocumentView(views, 'owner', null, 'Old.md', 'leaf');
  recordPluginDocumentView(views, 'owner', null, 'New.md', 'old-leaf');
  recordPluginDocumentView(views, 'another-owner', null, 'New.md', 'leaf');
  expect([...views.keys()]).toEqual(['New.md']);
  recordPluginDocumentView(views, 'owner', null, 'New.md', 'leaf');
  expect(views.size).toBe(0);
});
