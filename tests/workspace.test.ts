import {describe,it,expect} from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {AssemblyError, Kernel} from '../src/kernel';
import {
  FormatRegistry, WorkspaceViews, renderPlugin, workspacePlugin,
  createWorkspaceRuntime, createCanvasFormatPlugin, registerDefaultServices,
  RENDER_CONTRACT, WORKSPACE_CONTRACT
} from '../src/services';

describe('render format registry', () => {
  it('resolves formats case-insensitively and ignores unknown extensions', () => {
    const registry = new FormatRegistry(), dispose = registry.registerFormat({extension: '.CANVAS', viewType: 'canvas'});
    expect(registry.resolve('Board.canvas')?.viewType).toBe('canvas');
    expect(registry.resolve('Board.CANVAS')?.viewType).toBe('canvas');
    expect(registry.resolve('Note.zip')).toBeUndefined();
    expect(registry.list()).toEqual([{extension: 'canvas', viewType: 'canvas'}]);
    dispose();
    expect(registry.resolve('Board.canvas')).toBeUndefined();
  });
  it('never restores a revoked superseded registration', () => {
    const registry = new FormatRegistry();
    const a = registry.registerFormat({extension: 'md', viewType: 'a'});
    const b = registry.registerFormat({extension: 'md', viewType: 'b'});
    const c = registry.registerFormat({extension: 'md', viewType: 'c'});
    b();
    expect(registry.resolve('x.md')?.viewType).toBe('c');
    c();
    expect(registry.resolve('x.md')?.viewType).toBe('a');
    a();
    expect(registry.resolve('x.md')).toBeUndefined();
  });
  it('rejects malformed registrations', () => {
    const registry = new FormatRegistry();
    expect(() => registry.registerFormat({extension: '', viewType: 'x'})).toThrow();
    expect(() => registry.registerFormat({extension: 'md', viewType: ''})).toThrow();
  });
});

describe('workspace view slots', () => {
  it('registers views, orders them and resolves a path through the format registry', () => {
    const registry = new FormatRegistry();
    registry.registerFormat({extension: 'canvas', viewType: 'canvas'});
    const workspace = new WorkspaceViews(registry);
    workspace.registerView({viewType: 'markdown', slot: 'main', order: 0});
    workspace.registerView({viewType: 'canvas', slot: 'main', order: 10});
    workspace.registerView({viewType: 'outline', slot: 'right', order: 5});
    expect(workspace.viewsForSlot('main').map(view => view.viewType)).toEqual(['markdown', 'canvas']);
    expect(workspace.viewsForSlot('right').map(view => view.viewType)).toEqual(['outline']);
    expect(workspace.resolveView('Board.canvas')?.viewType).toBe('canvas');
    expect(workspace.resolveView('Note.md')).toBeUndefined();
  });
  it('never restores a revoked superseded view', () => {
    const workspace = new WorkspaceViews(new FormatRegistry());
    const a = workspace.registerView({viewType: 'x', slot: 'main', order: 1});
    const b = workspace.registerView({viewType: 'x', slot: 'main', order: 2});
    const c = workspace.registerView({viewType: 'x', slot: 'main', order: 3});
    b();
    expect(workspace.list().map(view => view.order)).toEqual([3]);
    c();
    expect(workspace.list().map(view => view.order)).toEqual([1]);
    a();
    expect(workspace.list()).toEqual([]);
  });
  it('rejects unknown slots', () => {
    const workspace = new WorkspaceViews(new FormatRegistry());
    expect(() => workspace.registerView({viewType: 'x', slot: 'nowhere' as never})).toThrow();
  });
});

describe('workspace composition', () => {
  it('activates the format plugins and resolves Markdown, Canvas and Bases', async () => {
    const runtime = await createWorkspaceRuntime();
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.workspace.resolveView('Idea.md')?.viewType).toBe('markdown');
    expect(runtime.workspace.resolveView('Board.canvas')?.viewType).toBe('canvas');
    expect(runtime.workspace.resolveView('Library.base')?.viewType).toBe('base');
    expect(runtime.workspace.resolveView('archive.zip')).toBeUndefined();
  });
  it('revokes format and view registrations when the scope stops', async () => {
    const runtime = await createWorkspaceRuntime();
    await runtime.kernel.stop();
    expect(runtime.render.resolve('Board.canvas')).toBeUndefined();
    expect(runtime.workspace.list()).toEqual([]);
  });
  it('rejects the workspace provider when render is missing', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(workspacePlugin());
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(kernel.diagnostics.some(diagnostic => diagnostic.code === 'missing-provider' && diagnostic.contract === RENDER_CONTRACT)).toBe(true);
  });
  it('exposes the provided contracts on the runtime scope', async () => {
    const runtime = await createWorkspaceRuntime();
    expect(runtime.kernel.runtime.services.resolve(RENDER_CONTRACT).ok).toBe(true);
    expect(runtime.kernel.runtime.services.resolve(WORKSPACE_CONTRACT).ok).toBe(true);
  });
  it('binds workspace resolution to the render provider it consumes', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    const render = new FormatRegistry();
    kernel.register(renderPlugin(render));
    kernel.register(workspacePlugin());
    await kernel.start();
    const resolved = kernel.runtime.services.resolve(WORKSPACE_CONTRACT, '^1.0.0');
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const workspace = resolved.binding.value as WorkspaceViews;
    render.registerFormat({extension: 'foo', viewType: 'foo'});
    workspace.registerView({viewType: 'foo', slot: 'main'});
    expect(workspace.resolveView('a.foo')?.viewType).toBe('foo');
  });
  it('is additive with the storage/documents/commands providers', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    registerDefaultServices(kernel, {storage: 'memory'});
    const render = new FormatRegistry();
    kernel.register(renderPlugin(render));
    kernel.register(workspacePlugin());
    kernel.register(createCanvasFormatPlugin());
    await kernel.start();
    expect(kernel.diagnostics).toEqual([]);
    const resolved = kernel.runtime.services.resolve(WORKSPACE_CONTRACT, '^1.0.0');
    expect(resolved.ok).toBe(true);
    if (resolved.ok) expect((resolved.binding.value as WorkspaceViews).resolveView('Board.canvas')?.viewType).toBe('canvas');
  });
  it('registers a format plugin through a replacement render provider', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    const render = new FormatRegistry();
    kernel.register(renderPlugin(render));
    kernel.register(workspacePlugin());
    kernel.register(createCanvasFormatPlugin());
    await kernel.start();
    expect(render.resolve('a.canvas')?.viewType).toBe('canvas');
  });
});

describe('kernel stays independent of view implementations', () => {
  it('imports only its own relative modules', async () => {
    const directory = fileURLToPath(new URL('../src/kernel', import.meta.url));
    const files: string[] = [];
    const walk = async (dir: string) => {
      for (const entry of await fs.readdir(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (entry.name.endsWith('.ts')) files.push(full);
      }
    };
    await walk(directory);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = await fs.readFile(file, 'utf8');
      const specifiers = [...source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
      for (const specifier of specifiers) {
        expect(specifier.startsWith('./'), `${path.relative(directory, file)} imports ${specifier}`).toBe(true);
      }
    }
  });
});
