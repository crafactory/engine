import {describe,it,expect} from 'vitest';
import {Kernel} from '../src/kernel';
import {validatePluginPackage, requiredPermission, checkPermission, readableSnapshot, PLUGIN_PERMISSIONS} from '../src/kernel';

const valid = {manifest: {id: 'sample.plugin', name: 'Sample', version: '1.2.3'}};

describe('plugin package validation', () => {
  it('accepts a minimal valid package and a known permission set', () => {
    expect(validatePluginPackage(valid, '1.0.0')).toEqual({ok: true, issues: []});
    expect(validatePluginPackage({manifest: {...valid.manifest, permissions: ['vault:read', 'vault:write']}}, '1.0.0').ok).toBe(true);
  });
  it('rejects malformed ids, names and versions', () => {
    expect(validatePluginPackage({manifest: {...valid.manifest, id: 'Bad ID'}}).issues.map(i => i.code)).toContain('id');
    expect(validatePluginPackage({manifest: {...valid.manifest, name: ' '}}).issues.map(i => i.code)).toContain('name');
    expect(validatePluginPackage({manifest: {...valid.manifest, version: '1.0'}}).issues.map(i => i.code)).toContain('version');
    expect(validatePluginPackage({manifest: {...valid.manifest, version: '1.0.0'}, entry: '/abs/main.js'}).issues.map(i => i.code)).toContain('entry');
    expect(validatePluginPackage({manifest: {...valid.manifest, version: '1.0.0'}, entry: '../main.js'}).issues.map(i => i.code)).toContain('entry');
    expect(validatePluginPackage({manifest: {...valid.manifest, version: '1.0.0'}, entry: 'main.txt'}).issues.map(i => i.code)).toContain('entry');
  });
  it('checks the declared engine range against the running engine', () => {
    expect(validatePluginPackage({manifest: {...valid.manifest, engine: '^1.0.0'}}, '1.0.0').ok).toBe(true);
    expect(validatePluginPackage({manifest: {...valid.manifest, engine: '>=2.0.0'}}, '1.0.0').issues.map(i => i.code)).toContain('engine');
    expect(validatePluginPackage({manifest: {...valid.manifest, engine: ''}}, '1.0.0').issues.map(i => i.code)).toContain('engine');
  });
  it('rejects unknown or duplicate permissions', () => {
    expect(validatePluginPackage({manifest: {...valid.manifest, permissions: ['vault:admin']}}).issues.map(i => i.code)).toContain('permissions');
    expect(validatePluginPackage({manifest: {...valid.manifest, permissions: ['vault:read', 'vault:read']}}).issues.map(i => i.code)).toContain('permissions');
    expect(validatePluginPackage({manifest: {...valid.manifest, permissions: 'vault:read'}}).issues.map(i => i.code)).toContain('permissions');
  });
  it('validates service declarations', () => {
    expect(validatePluginPackage({manifest: {...valid.manifest, provides: [{contract: 'x', version: '1.0.0'}]}}).ok).toBe(true);
    expect(validatePluginPackage({manifest: {...valid.manifest, provides: [{contract: 'x', version: '1'}]}}).issues.map(i => i.code)).toContain('provides');
    expect(validatePluginPackage({manifest: {...valid.manifest, consumes: [{contract: 'x', range: ''}]}}).issues.map(i => i.code)).toContain('consumes');
    expect(validatePluginPackage({manifest: {...valid.manifest, consumes: [{contract: 'x', optional: 'yes'}]}}).issues.map(i => i.code)).toContain('consumes');
  });
  it('maps host operations to permissions and enforces declared sets', () => {
    expect(PLUGIN_PERMISSIONS).toContain('vault:write');
    expect(requiredPermission('read')).toBe('vault:read');
    expect(requiredPermission('trash')).toBe('vault:trash');
    expect(requiredPermission('editor')).toBe('editor:write');
    expect(requiredPermission('rename')).toBe('vault:write');
    expect(requiredPermission('loadData')).toBe('storage:plugin-data');
    expect(requiredPermission('unknown')).toBeNull();
    expect(() => checkPermission({}, 'writeLegacy')).not.toThrow();
    expect(() => checkPermission({permissions: ['vault:read']}, 'read')).not.toThrow();
    expect(() => checkPermission({permissions: ['vault:read']}, 'create')).toThrow('vault:write');
  });
  it('strips note content and editor state without vault:read', () => {
    const snapshot = {name: 'vault', entries: [{path: 'A.md'}], notes: [{path: 'A.md', content: 'secret'}], active: 'A.md', editor: {text: 'secret'}};
    expect(readableSnapshot(snapshot, {permissions: ['vault:read']})).toBe(snapshot);
    expect(readableSnapshot(snapshot, {})).toBe(snapshot);
    expect(readableSnapshot(snapshot, {permissions: ['storage:plugin-data']})).toEqual({...snapshot, notes: [], editor: null});
  });
  it('starts an empty kernel without implicit services or diagnostics', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    await kernel.start();
    expect(kernel.runtime.services.list()).toEqual([]);
    expect(kernel.diagnostics).toEqual([]);
    await kernel.stop();
  });
});
