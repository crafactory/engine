import {describe,it,expect} from 'vitest';
import {AssemblyError, Kernel} from '../src/kernel';
import {NotesIndex, NotesNavigation, navigationPlugin, createNavigationRuntime, NAVIGATION_CONTRACT, INDEX_CONTRACT} from '../src/services';

const notes = [
  {path: 'B.md', content: '# B'},
  {path: 'A.md', content: '# A'},
  {path: 'Board.canvas', content: '{}'}
];

describe('navigation service', () => {
  it('orders quick-switch paths with recent first and otherwise keeps index order', () => {
    const index = new NotesIndex();
    index.rebuild(notes);
    const navigation = new NotesNavigation(index, () => 0);
    expect(navigation.quickSwitch()).toEqual(['B.md', 'A.md', 'Board.canvas']);
    expect(navigation.quickSwitch({recent: ['Board.canvas']})[0]).toBe('Board.canvas');
  });
  it('returns a deterministic random markdown note and ignores non-markdown paths', () => {
    const index = new NotesIndex();
    index.rebuild(notes);
    expect(new NotesNavigation(index, () => 0).randomNote()).toBe('B.md');
    expect(new NotesNavigation(index, () => 0.99).randomNote()).toBe('A.md');
    const canvasOnly = new NotesIndex();
    canvasOnly.rebuild([{path: 'x.canvas', content: '{}'}]);
    expect(new NotesNavigation(canvasOnly).randomNote()).toBeUndefined();
  });
});

describe('navigation plugin and dependency flow', () => {
  it('resolves after the index and provides navigation', async () => {
    const runtime = await createNavigationRuntime();
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.kernel.runtime.services.resolve(NAVIGATION_CONTRACT).ok).toBe(true);
    runtime.index.rebuild(notes);
    expect(runtime.navigation.quickSwitch()[0]).toBe('B.md');
    expect(runtime.navigation.randomNote()).toBeDefined();
  });
  it('rejects navigation when the index is missing', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(navigationPlugin());
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(kernel.diagnostics.some(diagnostic => diagnostic.code === 'missing-provider' && diagnostic.contract === INDEX_CONTRACT)).toBe(true);
  });
  it('disables navigation with its index provider', async () => {
    const runtime = await createNavigationRuntime();
    await runtime.kernel.disable('engine.index');
    expect(runtime.kernel.runtime.instances.has('engine.navigation')).toBe(false);
    expect(runtime.kernel.diagnostics.some(diagnostic => diagnostic.code === 'dependency-disabled')).toBe(true);
  });
});
