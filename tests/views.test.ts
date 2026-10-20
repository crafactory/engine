import {describe,it,expect} from 'vitest';
import {Kernel} from '../src/kernel';
import {ViewContributions, viewsPlugin, VIEWS_CONTRACT, type ViewsService} from '../src/services';
import {createViewsRuntime, loadViewComponent, ViewBoundary} from '../src/views';

describe('view contributions', () => {
  it('registers, replaces, lists and revokes loaders', () => {
    const views = new ViewContributions();
    const first = {viewType: 'custom', label: 'First', load: async () => null};
    const replace = views.register(first);
    expect(views.resolve('custom')?.label).toBe('First');
    const second = {viewType: 'custom', label: 'Second', load: async () => null};
    const restore = views.register(second);
    expect(views.resolve('custom')?.label).toBe('Second');
    restore();
    expect(views.resolve('custom')?.label).toBe('First');
    replace();
    expect(views.resolve('custom')).toBeUndefined();
  });
  it('rejects malformed contributions', () => {
    const views = new ViewContributions();
    expect(() => views.register({viewType: '', load: async () => null})).toThrow('Invalid view contribution');
    expect(() => views.register({viewType: 'x', load: null as unknown as () => Promise<unknown>})).toThrow('Invalid view contribution');
  });
  it('assembles the built-in views and disposes them with their plugin scope', async () => {
    const runtime = await createViewsRuntime();
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.views.list().map(view => view.viewType).sort()).toEqual(['base', 'canvas', 'markdown']);
    await runtime.kernel.disable('engine.view.canvas');
    expect(runtime.views.resolve('canvas')).toBeUndefined();
    await runtime.kernel.enable('engine.view.canvas');
    expect(runtime.views.resolve('canvas')).toBeDefined();
    await runtime.kernel.stop();
  });
  it('resolves a view registry through a consumer contract', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(viewsPlugin());
    let seen: string[] = [];
    kernel.register({manifest: {id: 'engine.probe', name: 'Probe', version: '1.0.0', consumes: [{contract: VIEWS_CONTRACT}]}, setup(context) {
      const views = context.service<ViewsService>(VIEWS_CONTRACT);
      context.effect(views.register({viewType: 'probe', load: async () => null}));
      seen = views.list().map(view => view.viewType);
    }});
    await kernel.start();
    expect(seen).toEqual(['probe']);
  });
  it('contains a failed view with a controlled fallback state', () => {
    expect(ViewBoundary.getDerivedStateFromError()).toEqual({failed: true});
  });
  it('interprets loaders as function or default-export components', async () => {
    const component = () => null;
    expect(await loadViewComponent({viewType: 'x', load: async () => component})).toBe(component);
    expect(await loadViewComponent({viewType: 'y', load: async () => ({default: component})})).toBe(component);
    await expect(loadViewComponent({viewType: 'z', load: async () => ({})})).rejects.toThrow('did not provide a component');
  });
});
