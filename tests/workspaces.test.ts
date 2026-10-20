import {describe,it,expect} from 'vitest';
import {Kernel} from '../src/kernel';
import {WorkspaceStore, workspacesPlugin, createWorkspacesRuntime, WORKSPACES_CONTRACT, type WorkspacesService} from '../src/services';
import type {Workspace} from '../src/types';

const workspace = (active = 'A.md'): Workspace => ({tabs: [active], active, split: null, left: true, right: true, mode: 'live'});

describe('workspaces service', () => {
  it('saves, lists, reads and removes named workspaces', () => {
    const store = new WorkspaceStore();
    store.save('One', workspace());
    store.save('Two', workspace('B.md'));
    expect(store.list()).toEqual(['One', 'Two']);
    expect(store.get('One')?.active).toBe('A.md');
    store.remove('One');
    expect(store.list()).toEqual(['Two']);
    store.remove('missing');
    expect(store.list()).toEqual(['Two']);
  });
  it('returns isolated snapshots so callers cannot mutate the store', () => {
    const store = new WorkspaceStore({One: workspace()});
    const snapshot = store.get('One')!;
    snapshot.tabs.push('Mutated.md');
    snapshot.active = 'Mutated.md';
    expect(store.get('One')!.tabs).toEqual(['A.md']);
    expect(store.get('One')!.active).toBe('A.md');
  });
  it('replaces sanitized records and gives each subscriber an independent snapshot', () => {
    const store = new WorkspaceStore();
    const received: Workspace[] = [];
    store.subscribe(record => { record.One.active = 'mutated'; });
    store.subscribe(record => { received.push(record.One); });
    store.replace({One: workspace(), '': workspace()});
    expect(received[0].active).toBe('A.md');
    expect(store.get('One')!.active).toBe('A.md');
    expect(store.list()).toEqual(['One']);
  });
  it('does not read inherited properties or lose a __proto__ workspace name', () => {
    const store = new WorkspaceStore();
    expect(store.get('toString')).toBeUndefined();
    expect(store.get('constructor')).toBeUndefined();
    store.save('__proto__', workspace('P.md'));
    expect(store.list()).toContain('__proto__');
    expect(store.get('__proto__')?.active).toBe('P.md');
  });
  it('sanitizes an own __proto__ key from a persisted record', () => {
    const persisted = JSON.parse('{"__proto__":{"tabs":["P.md"],"active":"P.md","split":null,"left":true,"right":true,"mode":"live"}}');
    const store = new WorkspaceStore();
    store.replace(persisted);
    expect(store.list()).toContain('__proto__');
    expect(store.get('__proto__')?.active).toBe('P.md');
  });
});

describe('workspaces plugin and dependency flow', () => {
  it('provides the contract through the kernel', async () => {
    const runtime = await createWorkspacesRuntime({initial: {Seed: workspace()}});
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.kernel.runtime.services.resolve(WORKSPACES_CONTRACT).ok).toBe(true);
    expect(runtime.service.list()).toEqual(['Seed']);
  });
  it('serves a consumer and survives disable/enable rebinding', async () => {
    let seen: string[] | undefined;
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(workspacesPlugin(new WorkspaceStore({Seed: workspace()})));
    kernel.register({manifest: {id: 'engine.probe', name: 'Probe', version: '1.0.0', consumes: [{contract: WORKSPACES_CONTRACT}]}, setup(context) { seen = context.service<WorkspacesService>(WORKSPACES_CONTRACT).list(); }});
    await kernel.start();
    expect(seen).toEqual(['Seed']);
    await kernel.disable('engine.workspaces');
    expect(kernel.runtime.instances.has('engine.probe')).toBe(false);
    await kernel.enable('engine.workspaces');
    expect(kernel.runtime.instances.has('engine.probe')).toBe(true);
    expect(kernel.diagnostics.some(diagnostic => diagnostic.code === 'dependency-disabled')).toBe(true);
  });
});
