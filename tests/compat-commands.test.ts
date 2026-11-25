import { expect, it, vi } from 'vitest';
import { createCompatibilityRuntime, type PluginSnapshot } from '../src/compat-core';
import { Scope } from '../src/compat-keymap';

it('gates mobile-only commands and repeats shortcuts only when opted in', async () => {
  const scope = new Scope(),
    mobile = vi.fn(),
    repeating = vi.fn(),
    commands = vi.fn();
  const snapshot: PluginSnapshot = {
    name: 'Test',
    active: '',
    editor: null,
    entries: [],
    notes: [],
  };
  const runtime = createCompatibilityRuntime(
    { id: 'probe', name: 'Probe', version: '1.0.0' },
    snapshot,
    {
      commands,
      notice: () => {},
      request: async () => undefined,
      ui: {
        scope,
        exports: {},
        workspace: {},
        statusBar: () => {
          throw new Error('Unexpected status bar call');
        },
        settingTab: () => () => {},
        editorExtension: () => () => {},
        updateOptions: () => {},
        registerView: () => () => {},
      },
    },
  );
  const press = (key: string, repeat = false) =>
    scope.dispatch({ key, repeat, preventDefault() {} } as KeyboardEvent);
  class Probe extends (runtime.api as any).Plugin {
    onload() {
      this.addCommand({
        id: 'x',
        name: 'X',
        mobileOnly: true,
        hotkeys: [{ key: 'x', modifiers: [] }],
        callback: mobile,
      });
      this.addCommand({
        id: 'y',
        name: 'Y',
        repeatable: true,
        hotkeys: [{ key: 'y', modifiers: [] }],
        callback: repeating,
      });
    }
  }
  await runtime.boot(Probe);
  expect(commands).toHaveBeenLastCalledWith([{ id: 'y', name: 'Probe: Y' }]);
  expect(press('x')).toBe(false);
  await expect(runtime.run('x')).rejects.toThrow(/unavailable/i);
  runtime.sync({ ...snapshot, platform: 'android' });
  expect(commands).toHaveBeenLastCalledWith([
    { id: 'x', name: 'Probe: X' },
    { id: 'y', name: 'Probe: Y' },
  ]);
  expect(press('x')).toBe(true);
  expect(press('x', true)).toBe(true);
  expect(press('y', true)).toBe(true);
  expect(mobile).toHaveBeenCalledTimes(1);
  expect(repeating).toHaveBeenCalledTimes(1);
});
