import { it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { runInNewContext } from 'node:vm';
it('preload close readiness tracks active subscribers with idempotent cleanup', () => {
  const ipcRenderer = Object.assign(new EventEmitter(), {
    invoke: vi.fn(async (_name: string) => undefined),
  });
  let api: any;
  runInNewContext(readFileSync(new URL('../electron/preload.cjs', import.meta.url), 'utf8'), {
    require: (name: string) => {
      if (name !== 'electron') throw new Error('Unexpected preload dependency');
      return {
        ipcRenderer,
        contextBridge: {
          exposeInMainWorld: (_name: string, value: unknown) => {
            api = value;
          },
        },
      };
    },
    console,
  });
  const first = vi.fn(),
    second = vi.fn(),
    offFirst = api.onBeforeClose(first),
    offSecond = api.onBeforeClose(second);
  expect(ipcRenderer.invoke.mock.calls.map((call) => call[0])).toEqual([
    'engine:close-listener-ready',
  ]);
  ipcRenderer.emit('engine:before-close');
  expect(first).toHaveBeenCalledOnce();
  expect(second).toHaveBeenCalledOnce();
  offFirst();
  offFirst();
  expect(ipcRenderer.listenerCount('engine:before-close')).toBe(1);
  expect(ipcRenderer.invoke).toHaveBeenCalledTimes(1);
  offSecond();
  expect(ipcRenderer.listenerCount('engine:before-close')).toBe(0);
  expect(ipcRenderer.invoke.mock.calls.map((call) => call[0])).toEqual([
    'engine:close-listener-ready',
    'engine:close-listener-unready',
  ]);
  const offAgain = api.onBeforeClose(vi.fn());
  offAgain();
  expect(ipcRenderer.invoke.mock.calls.map((call) => call[0])).toEqual([
    'engine:close-listener-ready',
    'engine:close-listener-unready',
    'engine:close-listener-ready',
    'engine:close-listener-unready',
  ]);
});
