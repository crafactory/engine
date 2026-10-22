import {describe,it,expect,vi} from 'vitest';
import {Kernel} from '../src/kernel';
import {UiContributions, uiPlugin, UI_CONTRACT, createUiRuntime, type UiService} from '../src/services';
import {loadSettingsComponent} from '../src/ui/contract';

describe('ui contributions', () => {
  it('registers ribbon and status items and orders them', () => {
    const ui = new UiContributions();
    ui.register({kind: 'status', id: 'words', label: 'Words', text: '10'});
    ui.register({kind: 'ribbon', id: 'later', label: 'Later', run: () => {}, order: 10});
    ui.register({kind: 'ribbon', id: 'first', label: 'First', run: () => {}, order: 1});
    expect(ui.ribbon().map(item => item.id)).toEqual(['first', 'later']);
    expect(ui.status().map(item => item.text)).toEqual(['10']);
    expect(ui.list('ribbon')).toHaveLength(2);
    expect(ui.list()).toHaveLength(3);
    ui.register({kind: 'settings', id: 'prefs', label: 'Preferences', load: async () => ({})});
    expect(ui.settings().map(item => item.id)).toEqual(['prefs']);
    expect(ui.list()).toHaveLength(4);
  });
  it('replaces and revokes contributions with nearest-predecessor semantics', () => {
    const ui = new UiContributions();
    const first = {kind: 'ribbon' as const, id: 'run', label: 'Run', run: () => {}};
    const dispose = ui.register(first);
    const second = {kind: 'ribbon' as const, id: 'run', label: 'Run again', run: () => {}};
    const restore = ui.register(second);
    expect(ui.ribbon()[0].label).toBe('Run again');
    restore();
    expect(ui.ribbon()[0].label).toBe('Run');
    dispose();
    expect(ui.ribbon()).toEqual([]);
  });
  it('notifies subscribers on registration and removal', () => {
    const ui = new UiContributions(), listener = vi.fn();
    const unsubscribe = ui.subscribe(listener);
    const dispose = ui.register({kind: 'status', id: 's', label: 'Status', text: 'ok'});
    dispose();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    ui.register({kind: 'status', id: 't', label: 'Status', text: 'ok'});
    expect(listener).toHaveBeenCalledTimes(2);
  });
  it('isolates a throwing subscriber so registration still returns a disposer', () => {
    const ui = new UiContributions(), error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const seen = vi.fn();
    ui.subscribe(() => { throw new Error('boom'); });
    ui.subscribe(seen);
    const dispose = ui.register({kind: 'status', id: 's', label: 'Status', text: 'ok'});
    expect(seen).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledWith('UI contribution listener failed', expect.any(Error));
    expect(() => dispose()).not.toThrow();
    error.mockRestore();
  });
  it('rejects malformed contributions', () => {
    const ui = new UiContributions();
    expect(() => ui.register({kind: 'ribbon', id: '', label: 'x', run: () => {}})).toThrow('id');
    expect(() => ui.register({kind: 'ribbon', id: 'x', label: ' ', run: () => {}})).toThrow('label');
    expect(() => ui.register({kind: 'ribbon', id: 'x', label: 'x', run: null as unknown as () => void})).toThrow('run');
    expect(() => ui.register({kind: 'status', id: 'x', label: 'x', text: null as unknown as string})).toThrow('text');
    expect(() => ui.register({kind: 'settings', id: 'x', label: 'x', load: null as unknown as () => Promise<unknown>})).toThrow('loader');
    expect(() => ui.register({kind: 'other', id: 'x', label: 'x'} as never)).toThrow('kind');
  });
  it('interprets settings loaders as function or default-export components', async () => {
    const component = () => null;
    expect(await loadSettingsComponent({kind: 'settings', id: 'a', label: 'A', load: async () => component})).toBe(component);
    expect(await loadSettingsComponent({kind: 'settings', id: 'b', label: 'B', load: async () => ({default: component})})).toBe(component);
    const exotic = {$$typeof: Symbol.for('react.memo')};
    expect(await loadSettingsComponent({kind: 'settings', id: 'm', label: 'M', load: async () => exotic})).toBe(exotic);
    await expect(loadSettingsComponent({kind: 'settings', id: 'c', label: 'C', load: async () => ({})})).rejects.toThrow('did not provide a component');
  });
  it('assembles a runtime and serves a consumer', async () => {
    const runtime = await createUiRuntime();
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.ui.list()).toEqual([]);
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(uiPlugin());
    let seen: string[] = [];
    kernel.register({manifest: {id: 'engine.probe', name: 'Probe', version: '1.0.0', consumes: [{contract: UI_CONTRACT}]}, setup(context) {
      const ui = context.service<UiService>(UI_CONTRACT);
      context.effect(ui.register({kind: 'ribbon', id: 'probe', label: 'Probe', run: () => {}}));
      seen = ui.ribbon().map(item => item.label);
    }});
    await kernel.start();
    expect(seen).toEqual(['Probe']);
  });
});
