import {describe,it,expect} from 'vitest';
import {createCompatibilityRuntime,type CompatHost,type CompatNativeServices,type PluginSnapshot} from '../src/compat-core';
import {Kernel} from '../src/kernel';
import {NotesIndex, indexPlugin, INDEX_CONTRACT} from '../src/services/notes-index';
import {createCodeMirrorEditorPlugin, CODEMIRROR_EDITOR_CONTRACT} from '../src/services/editor';

const manifest = {id: 'fixture', name: 'Fixture', version: '1.0.0'};
const snapshot = (): PluginSnapshot => ({
  name: 'Test vault', active: 'One.md',
  entries: [
    {path: 'One.md', name: 'One.md', folder: false, size: 3, ctime: 1, mtime: 2},
    {path: 'Two.md', name: 'Two.md', folder: false, size: 3, ctime: 1, mtime: 2}
  ],
  notes: [{path: 'One.md', content: 'one'}, {path: 'Two.md', content: 'two'}],
  editor: {text: 'one', from: 0, to: 0}
});

function harness(native?: CompatNativeServices) {
  const calls: {operation: string; args: unknown[]}[] = [];
  const host: CompatHost = {
    request: async (operation, args) => { calls.push({operation, args}); return null; },
    commands: () => {},
    notice: () => {},
    native
  };
  return {runtime: createCompatibilityRuntime(manifest, snapshot(), host), calls};
}

describe('compatibility facade over native services', () => {
  it('resolves link destinations through the native index', () => {
    const {runtime} = harness({resolveLink: (link, from) => link === 'Alias' && from === 'One.md' ? 'Two.md' : undefined});
    expect((runtime.app.metadataCache.getFirstLinkpathDest('Alias', 'One.md') as any).path).toBe('Two.md');
    // Exact file paths resolve before the native alias/title resolver; a miss stays null.
    expect((runtime.app.metadataCache.getFirstLinkpathDest('One', 'Two.md') as any).path).toBe('One.md');
    expect(runtime.app.metadataCache.getFirstLinkpathDest('Missing', 'One.md') as any).toBeNull();
  });
  it('falls back to snapshot resolution when no native index is supplied', () => {
    const {runtime} = harness();
    expect((runtime.app.metadataCache.getFirstLinkpathDest('Two', 'One.md') as any).path).toBe('Two.md');
  });
  it('navigates existing links through the native resolver', async () => {
    const {runtime, calls} = harness({resolveLink: link => link === 'Alias' ? 'Two.md' : undefined});
    await runtime.app.workspace.openLinkText('Alias', 'One.md');
    expect(calls).toContainEqual({operation: 'open', args: ['Two.md']});
  });
  it('rejects CodeMirror-only extensions when the active editor is not CodeMirror', () => {
    const {runtime} = harness({editor: {providerId: 'engine.editor.plain', codeMirrorExtensions: false}});
    const plugin = new (runtime.api as any).Plugin();
    expect(() => plugin.registerEditorExtension({})).toThrow(/CodeMirror.*engine\.editor\.plain/);
    expect(runtime.editorCompatibility()).toEqual({providerId: 'engine.editor.plain', codeMirrorExtensions: false});
  });
  it('reports the active editor capability for callers', () => {
    const {runtime} = harness({editor: {providerId: 'engine.editor.codemirror', codeMirrorExtensions: true}});
    expect(runtime.editorCompatibility()).toEqual({providerId: 'engine.editor.codemirror', codeMirrorExtensions: true});
  });
  it('disables a facade-style consumer when the index dependency is lost', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(indexPlugin(new NotesIndex()));
    kernel.register(createCodeMirrorEditorPlugin());
    kernel.register({manifest: {id: 'engine.obsidian-facade', name: 'Facade', version: '1.0.0', consumes: [{contract: INDEX_CONTRACT}, {contract: CODEMIRROR_EDITOR_CONTRACT}]}, setup(context) {
      context.service(INDEX_CONTRACT);
      context.service(CODEMIRROR_EDITOR_CONTRACT);
    }});
    await kernel.start();
    expect(kernel.runtime.instances.has('engine.obsidian-facade')).toBe(true);
    await kernel.disable('engine.index');
    expect(kernel.runtime.instances.has('engine.obsidian-facade')).toBe(false);
    await kernel.enable('engine.index');
    expect(kernel.runtime.instances.has('engine.obsidian-facade')).toBe(true);
    expect(kernel.diagnostics.some(diagnostic => diagnostic.code === 'dependency-disabled')).toBe(true);
  });
});
