import {describe,it,expect} from 'vitest';
import {AssemblyError, Kernel} from '../src/kernel';
import {
  CodeMirrorEditorProvider, PlainEditorProvider, createPlainEditorPlugin,
  createEditorRuntime, migrateSession, EDITOR_CONTRACT, CODEMIRROR_EDITOR_CONTRACT,
  type EditorProvider
} from '../src/services/editor';

/** Run the identical editor contract against a provider factory. */
function editorContract(label: string, create: () => EditorProvider): void {
  describe(`${label} editor contract`, () => {
    it('opens, edits, tracks dirty state and marks saved', () => {
      const session = create().open('Note.md', {text: 'hello', version: 'v1'});
      expect(session.text()).toBe('hello');
      expect(session.isDirty()).toBe(false);
      expect(session.version()).toBe('v1');
      expect(session.setText('hello world', {expected: 'hello'})).toBe(true);
      expect(session.text()).toBe('hello world');
      expect(session.isDirty()).toBe(true);
      session.markSaved('v2');
      expect(session.isDirty()).toBe(false);
      expect(session.version()).toBe('v2');
    });
    it('inserts at the selection and leaves the caret after the insertion', () => {
      const session = create().open('N.md', {text: 'abc', version: '1'});
      session.setSelection({anchor: 1, head: 1});
      session.insert('X');
      expect(session.text()).toBe('aXbc');
      expect(session.selection()).toEqual({anchor: 2, head: 2});
    });
    it('refuses a conflicting expected base without changing text', () => {
      const session = create().open('N.md', {text: 'current', version: '1'});
      expect(session.setText('next', {expected: 'stale'})).toBe(false);
      expect(session.text()).toBe('current');
      expect(session.isDirty()).toBe(false);
      expect(session.setText('next', {expected: 'current'})).toBe(true);
    });
    it('undoes and redoes edits', () => {
      const session = create().open('N.md', {text: 'one', version: '1'});
      session.setText('two');
      session.setText('three');
      expect(session.undo()).toBe(true);
      expect(session.text()).toBe('two');
      expect(session.undo()).toBe(true);
      expect(session.text()).toBe('one');
      expect(session.undo()).toBe(false);
      expect(session.redo()).toBe(true);
      expect(session.text()).toBe('two');
    });
    it('recovers a draft with selection, viewport and dirty state', () => {
      const provider = create();
      const session = provider.open('N.md', {text: 'abc', version: '1'});
      session.setSelection({anchor: 1, head: 2});
      session.insert('X');
      session.setViewport({anchor: 2, head: 2});
      const reopened = provider.openDraft(session.draft());
      expect(reopened.text()).toBe(session.text());
      expect(reopened.selection()).toEqual(session.selection());
      expect(reopened.viewport()).toEqual(session.viewport());
      expect(reopened.version()).toBe('1');
      expect(reopened.isDirty()).toBe(true);
    });
    it('shifts the viewport when text before it changes', () => {
      const session = create().open('N.md', {text: 'abcdef', version: '1'});
      session.setViewport({anchor: 4, head: 4});
      session.setSelection({anchor: 0, head: 0});
      session.insert('XY');
      expect(session.text()).toBe('XYabcdef');
      expect(session.viewport()).toEqual({anchor: 6, head: 6});
    });
    it('shifts the viewport by the changed range when text is prepended', () => {
      const session = create().open('N.md', {text: 'abcdef', version: '1'});
      session.setViewport({anchor: 4, head: 4});
      session.setText('XYabcdef');
      expect(session.viewport()).toEqual({anchor: 6, head: 6});
    });
    it('tracks a view-driven change without touching history and updates reachable selection', () => {
      const session = create().open('N.md', {text: 'short', version: '1'});
      session.setSelection({anchor: 5, head: 5});
      session.track('a much longer document with content');
      expect(session.text()).toBe('a much longer document with content');
      expect(session.selection()).toEqual({anchor: 5, head: 5});
      expect(session.isDirty()).toBe(true);
      session.setSelection({anchor: 30, head: 30});
      expect(session.selection()).toEqual({anchor: 30, head: 30});
    });
    it('rejects a draft for a different path without changing the session', () => {
      const session = create().open('N.md', {text: 'abc', version: '1'});
      expect(() => session.restore({...session.draft(), path: 'Other.md'})).toThrow();
      expect(session.text()).toBe('abc');
    });
  });
}

editorContract('CodeMirror', () => new CodeMirrorEditorProvider());
editorContract('plain', () => new PlainEditorProvider());

describe('editor provider replacement', () => {
  it('migrates a session between providers preserving text, selection, viewport and dirtiness', () => {
    const from = new CodeMirrorEditorProvider().open('N.md', {text: 'hello', version: 'v1'});
    from.setSelection({anchor: 1, head: 3});
    from.setViewport({anchor: 2, head: 2});
    from.insert('X');
    expect(from.text()).toBe('hXlo');
    const plain = migrateSession(from, new PlainEditorProvider());
    expect(plain.text()).toBe('hXlo');
    expect(plain.selection()).toEqual(from.selection());
    expect(plain.viewport()).toEqual(from.viewport());
    expect(plain.isDirty()).toBe(true);
    const back = migrateSession(plain, new CodeMirrorEditorProvider());
    expect(back.text()).toBe('hXlo');
    expect(back.selection()).toEqual(from.selection());
    expect(back.viewport()).toEqual(from.viewport());
  });
  it('reports the CodeMirror capability difference instead of pretending it is present', () => {
    expect(new CodeMirrorEditorProvider().capabilities()).toEqual({codeMirrorExtensions: true, livePreview: true});
    expect(new PlainEditorProvider().capabilities()).toEqual({codeMirrorExtensions: false, livePreview: false});
  });
  it('rejects a CodeMirror-extension consumer when only the plain editor is active', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(createPlainEditorPlugin());
    kernel.register({manifest: {id: 'engine.probe', name: 'Probe', version: '1.0.0', consumes: [{contract: CODEMIRROR_EDITOR_CONTRACT}]}, setup() {}});
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(kernel.diagnostics.some(diagnostic => diagnostic.code === 'missing-provider' && diagnostic.contract === CODEMIRROR_EDITOR_CONTRACT)).toBe(true);
  });
  it('provides both contracts with the CodeMirror editor and only the base contract with plain', async () => {
    const codemirror = await createEditorRuntime('codemirror');
    expect(codemirror.kernel.diagnostics).toEqual([]);
    expect(codemirror.kernel.runtime.services.resolve(EDITOR_CONTRACT).ok).toBe(true);
    expect(codemirror.kernel.runtime.services.resolve(CODEMIRROR_EDITOR_CONTRACT).ok).toBe(true);
    const plain = await createEditorRuntime('plain');
    expect(plain.kernel.diagnostics).toEqual([]);
    expect(plain.kernel.runtime.services.resolve(EDITOR_CONTRACT).ok).toBe(true);
    expect(plain.kernel.runtime.services.resolve(CODEMIRROR_EDITOR_CONTRACT).ok).toBe(false);
  });
  it('exposes the resolved editor provider from the runtime', async () => {
    const runtime = await createEditorRuntime('plain');
    const session = runtime.provider.open('N.md', {text: 'x', version: '1'});
    expect(runtime.provider.id).toBe('engine.editor.plain');
    expect(session.text()).toBe('x');
  });
});
