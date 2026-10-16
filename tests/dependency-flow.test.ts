import {describe,it,expect} from 'vitest';
import {Kernel, type PluginManifest} from '../src/kernel';
import {Bookmarks, bookmarksPlugin, BOOKMARKS_CONTRACT} from '../src/services';

const manifest = (id: string, extra: Partial<PluginManifest> = {}): PluginManifest => ({id, name: id, version: '1.0.0', ...extra});

describe('provider disable and enable flow', () => {
  it('disables a provider and its required consumer, then rebinds a fresh provider on enable', async () => {
    let counter = 0, consumerValue: {n: number} | undefined;
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register({manifest: manifest('provider', {provides: [{contract: 'engine.a/v1', version: '1.0.0'}]}), setup(context) { context.provide('engine.a/v1', '1.0.0', {n: ++counter}); }});
    kernel.register({manifest: manifest('consumer', {consumes: [{contract: 'engine.a/v1'}]}), setup(context) { consumerValue = context.service('engine.a/v1'); }});
    await kernel.start();
    expect(consumerValue).toEqual({n: 1});

    await kernel.disable('provider');
    expect(kernel.runtime.instances.has('provider')).toBe(false);
    expect(kernel.runtime.instances.has('consumer')).toBe(false);
    expect(kernel.runtime.services.has('engine.a/v1')).toBe(false);
    expect(kernel.diagnostics.some(diagnostic => diagnostic.code === 'dependency-disabled')).toBe(true);

    await kernel.enable('provider');
    expect(kernel.runtime.isActive).toBe(true);
    expect(consumerValue).toEqual({n: 2});
    await expect(kernel.enable('missing')).rejects.toThrow('not disabled');
    await expect(kernel.disable('missing')).rejects.toThrow('not active');
  });
  it('keeps an optional consumer active when its provider is disabled', async () => {
    let optionalPresent: boolean | undefined;
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register({manifest: manifest('provider', {provides: [{contract: 'engine.a/v1', version: '1.0.0'}]}), setup(context) { context.provide('engine.a/v1', '1.0.0', {}); }});
    kernel.register({manifest: manifest('optional', {consumes: [{contract: 'engine.a/v1', optional: true}]}), setup(context) { optionalPresent = context.active; }});
    await kernel.start();
    await kernel.disable('provider');
    expect(kernel.runtime.instances.has('optional')).toBe(true);
    expect(optionalPresent).toBe(true);
  });
  it('disables a whole required dependency chain transitively', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register({manifest: manifest('a', {provides: [{contract: 'engine.a/v1', version: '1.0.0'}]}), setup(context) { context.provide('engine.a/v1', '1.0.0', {}); }});
    kernel.register({manifest: manifest('b', {provides: [{contract: 'engine.b/v1', version: '1.0.0'}], consumes: [{contract: 'engine.a/v1'}]}), setup(context) { context.provide('engine.b/v1', '1.0.0', {}); }});
    kernel.register({manifest: manifest('c', {consumes: [{contract: 'engine.b/v1'}]}), setup() {}});
    await kernel.start();
    expect([...kernel.runtime.instances.keys()].sort()).toEqual(['a', 'b', 'c']);
    await kernel.disable('a');
    expect([...kernel.runtime.instances.keys()]).toEqual([]);
    await kernel.enable('a');
    expect([...kernel.runtime.instances.keys()].sort()).toEqual(['a', 'b', 'c']);
  });
  it('stops a dependent child scope and restarts it on enable', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register({manifest: manifest('index', {provides: [{contract: 'engine.index/v1', version: '1.0.0'}]}), setup(context) { context.provide('engine.index/v1', '1.0.0', {}); }});
    kernel.register({manifest: manifest('storage', {scopes: ['vault'], consumes: [{contract: 'engine.index/v1'}]}), setup() {}});
    const vault = kernel.createScope('vault', 'a');
    await kernel.start();
    expect(vault.isActive).toBe(true);
    await kernel.disable('index');
    expect(vault.isActive).toBe(false);
    await kernel.enable('index');
    expect(kernel.runtime.isActive).toBe(true);
    expect(vault.isActive).toBe(true);
  });
  it('treats a migrated core-feature plugin as a normal provider', async () => {
    let probeSeen: string[] | undefined;
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(bookmarksPlugin(new Bookmarks(['A.md'])));
    kernel.register({manifest: manifest('probe', {consumes: [{contract: BOOKMARKS_CONTRACT}]}), setup(context) { probeSeen = context.service<Bookmarks>(BOOKMARKS_CONTRACT).list(); }});
    await kernel.start();
    expect(probeSeen).toEqual(['A.md']);
    await kernel.disable('engine.bookmarks');
    expect(kernel.runtime.instances.has('probe')).toBe(false);
    await kernel.enable('engine.bookmarks');
    expect(probeSeen).toEqual(['A.md']);
    expect(kernel.diagnostics.filter(diagnostic => diagnostic.code === 'dependency-disabled')).toHaveLength(1);
  });
  it('still reloads a scope and rebinds consumers', async () => {
    let value: {n: number} | undefined, counter = 0;
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register({manifest: manifest('provider', {provides: [{contract: 'engine.a/v1', version: '1.0.0'}]}), setup(context) { context.provide('engine.a/v1', '1.0.0', {n: ++counter}); }});
    kernel.register({manifest: manifest('consumer', {consumes: [{contract: 'engine.a/v1'}]}), setup(context) { value = context.service('engine.a/v1'); }});
    await kernel.start();
    await kernel.reload('provider');
    expect(value).toEqual({n: 2});
  });
});
