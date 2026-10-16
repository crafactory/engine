/* Native editor service contract (`engine.editor/v1`).
 *
 * The contract is a DOM-free document editing model: text, selection, viewport, undo
 * history and drafts. Two independent providers satisfy it — a CodeMirror
 * `@codemirror/state` provider and a plain-text provider — to demonstrate that the
 * editor is replaceable. CodeMirror-specific capabilities are exposed as the optional
 * `engine.editor.codemirror/v1` contract, so a provider swap can report the difference
 * instead of pretending a proprietary extension still applies.
 *
 * The contract does not render anything and does not touch the DOM; the running
 * application's CodeMirror view is wired in later work.
 */
import {EditorState} from '@codemirror/state';
import {Kernel, type PluginDefinition} from '../kernel';
import {ENGINE_VERSION} from './version';

export const EDITOR_CONTRACT = 'engine.editor/v1';
export const EDITOR_VERSION = '1.0.0';
export const CODEMIRROR_EDITOR_CONTRACT = 'engine.editor.codemirror/v1';
export const CODEMIRROR_EDITOR_VERSION = '1.0.0';

export interface EditorSelection {anchor: number; head: number}
export interface EditorViewport {anchor: number; head: number}
export interface EditorDraft {path: string; text: string; selection: EditorSelection; viewport: EditorViewport; version: string; dirty: boolean}
export interface EditorCapabilities {codeMirrorExtensions: boolean; livePreview: boolean}
export interface EditorOpenOptions {text: string; version: string}

/** One editable document bound to a provider. All positions are UTF-16 offsets. */
export interface EditorSession {
  readonly path: string;
  text(): string;
  version(): string;
  isDirty(): boolean;
  setText(text: string, options?: {expected?: string}): boolean;
  track(text: string): void;
  insert(text: string): boolean;
  selection(): EditorSelection;
  setSelection(selection: EditorSelection): void;
  viewport(): EditorViewport;
  setViewport(viewport: EditorViewport): void;
  undo(): boolean;
  redo(): boolean;
  markSaved(version: string): void;
  draft(): EditorDraft;
  restore(draft: EditorDraft): void;
}

/** An editor engine that opens sessions and declares its optional capabilities. */
export interface EditorProvider {
  readonly id: string;
  capabilities(): EditorCapabilities;
  open(path: string, options: EditorOpenOptions): EditorSession;
  openDraft(draft: EditorDraft): EditorSession;
}

interface HistoryEntry {text: string; selection: EditorSelection}

/** Clamp a selection or viewport into the document bounds. */
function clamp(range: EditorSelection, length: number): EditorSelection {
  return {anchor: Math.max(0, Math.min(length, range.anchor)), head: Math.max(0, Math.min(length, range.head))};
}

/** Length of the common prefix of two strings. */
function commonPrefix(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let index = 0;
  while (index < limit && a[index] === b[index]) index++;
  return index;
}

/** Length of the common suffix of two strings, not overlapping the given prefix. */
function commonSuffix(a: string, b: string, prefix: number): number {
  const limit = Math.min(a.length, b.length) - prefix;
  let length = 0;
  while (length < limit && a[a.length - 1 - length] === b[b.length - 1 - length]) length++;
  return length;
}

/** Shift one offset across a replacement of `[from, to)` with `inserted` characters. */
function adjustOffset(offset: number, from: number, to: number, inserted: number): number {
  if (offset >= to) return offset + inserted - (to - from);
  if (offset > from) return from + inserted;
  return offset;
}

/** Adjust a viewport after an edit so it keeps pointing at the same text. */
function adjustViewport(viewport: EditorViewport, from: number, to: number, inserted: number): EditorViewport {
  return {anchor: adjustOffset(viewport.anchor, from, to, inserted), head: adjustOffset(viewport.head, from, to, inserted)};
}

/** Shared editing behavior over an abstract text/selection store. */
abstract class EditorSessionBase implements EditorSession {
  protected dirty = false;
  protected viewportValue: EditorViewport = {anchor: 0, head: 0};
  private savedVersion: string;
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];

  constructor(readonly path: string, version: string) { this.savedVersion = version; }

  /** Read the current text and selection from the provider-specific store. */
  protected abstract read(): {text: string; selection: EditorSelection};
  /** Write text and selection into the provider-specific store. */
  protected abstract write(text: string, selection: EditorSelection): void;

  text(): string { return this.read().text; }
  version(): string { return this.savedVersion; }
  isDirty(): boolean { return this.dirty; }
  selection(): EditorSelection { return this.read().selection; }

  /** Set the selection, clamped to the document. */
  setSelection(selection: EditorSelection): void {
    const {text} = this.read();
    this.write(text, clamp(selection, text.length));
  }

  /** Replace the whole document, refusing when an expected base does not match. */
  setText(text: string, options: {expected?: string} = {}): boolean {
    const current = this.text();
    if (options.expected !== undefined && options.expected !== current) return false;
    if (text === current) return true;
    this.past.push({text: current, selection: this.selection()});
    this.future = [];
    const prefix = commonPrefix(current, text);
    const suffix = commonSuffix(current, text, prefix);
    this.viewportValue = adjustViewport(this.viewportValue, prefix, current.length - suffix, text.length - prefix - suffix);
    this.write(text, clamp({anchor: 0, head: 0}, text.length));
    this.dirty = true;
    return true;
  }

  /**
   * Synchronize the model with a document a view already changed. Text is replaced
   * without touching undo history, the selection is preserved (clamped) and the viewport
   * shifts by the changed range.
   */
  track(text: string): void {
    const {text: current, selection} = this.read();
    if (text === current) return;
    const prefix = commonPrefix(current, text);
    const suffix = commonSuffix(current, text, prefix);
    this.viewportValue = adjustViewport(this.viewportValue, prefix, current.length - suffix, text.length - prefix - suffix);
    this.write(text, clamp(selection, text.length));
    this.dirty = true;
  }

  /** Insert text at the current selection, replacing it. */
  insert(inserted: string): boolean {
    const {text, selection} = this.read();
    const from = Math.min(selection.anchor, selection.head), to = Math.max(selection.anchor, selection.head);
    this.past.push({text, selection});
    this.future = [];
    const caret = from + inserted.length;
    this.viewportValue = adjustViewport(this.viewportValue, from, to, inserted.length);
    this.write(text.slice(0, from) + inserted + text.slice(to), {anchor: caret, head: caret});
    this.dirty = true;
    return true;
  }

  /** Restore the previous edit, if any. */
  undo(): boolean {
    const entry = this.past.pop();
    if (!entry) return false;
    this.future.push(this.read());
    this.write(entry.text, clamp(entry.selection, entry.text.length));
    this.dirty = true;
    return true;
  }

  /** Reapply the last undone edit, if any. */
  redo(): boolean {
    const entry = this.future.pop();
    if (!entry) return false;
    this.past.push(this.read());
    this.write(entry.text, clamp(entry.selection, entry.text.length));
    this.dirty = true;
    return true;
  }

  /** Mark the document saved at the given version. */
  markSaved(version: string): void { this.savedVersion = version; this.dirty = false; }

  /** Current scroll anchor pair, clamped to the document. */
  viewport(): EditorViewport { return clamp(this.viewportValue, this.text().length); }

  /** Move the scroll anchor pair, clamped to the document. */
  setViewport(viewport: EditorViewport): void { this.viewportValue = clamp(viewport, this.text().length); }

  /** Serialize the session for draft recovery or provider migration. */
  draft(): EditorDraft {
    return {path: this.path, text: this.text(), selection: this.selection(), viewport: this.viewport(), version: this.savedVersion, dirty: this.dirty};
  }

  /** Restore a serialized draft, replacing text, selection, viewport and dirty state. */
  restore(draft: EditorDraft): void {
    if (draft.path !== this.path) throw new Error(`Draft path ${draft.path} does not match session path ${this.path}`);
    this.past = [];
    this.future = [];
    this.write(draft.text, clamp(draft.selection, draft.text.length));
    this.viewportValue = clamp(draft.viewport, draft.text.length);
    this.savedVersion = draft.version;
    this.dirty = draft.dirty;
  }
}

/** CodeMirror `@codemirror/state` backed session. */
class StateEditorSession extends EditorSessionBase {
  private state: EditorState;

  constructor(path: string, options: EditorOpenOptions) {
    super(path, options.version);
    this.state = EditorState.create({doc: options.text});
  }

  protected read(): {text: string; selection: EditorSelection} {
    const main = this.state.selection.main;
    return {text: this.state.doc.toString(), selection: {anchor: main.anchor, head: main.head}};
  }

  protected write(text: string, selection: EditorSelection): void {
    this.state = this.state.update({changes: {from: 0, to: this.state.doc.length, insert: text}, selection: {anchor: selection.anchor, head: selection.head}}).state;
  }
}

/** Plain-text session used as the replacement provider. */
class PlainEditorSession extends EditorSessionBase {
  private value: string;
  private cursor: EditorSelection;

  constructor(path: string, options: EditorOpenOptions) {
    super(path, options.version);
    this.value = options.text;
    this.cursor = {anchor: 0, head: 0};
  }

  protected read(): {text: string; selection: EditorSelection} { return {text: this.value, selection: {...this.cursor}}; }
  protected write(text: string, selection: EditorSelection): void { this.value = text; this.cursor = {anchor: selection.anchor, head: selection.head}; }
}

/** Abstract provider that shares draft restoration across implementations. */
abstract class BaseEditorProvider implements EditorProvider {
  abstract readonly id: string;
  abstract capabilities(): EditorCapabilities;
  abstract open(path: string, options: EditorOpenOptions): EditorSession;

  /** Reopen a session from a serialized draft. */
  openDraft(draft: EditorDraft): EditorSession {
    const session = this.open(draft.path, {text: draft.text, version: draft.version});
    session.restore(draft);
    return session;
  }
}

/** Default CodeMirror-state editor provider. */
export class CodeMirrorEditorProvider extends BaseEditorProvider {
  readonly id = 'engine.editor.codemirror';
  capabilities(): EditorCapabilities { return {codeMirrorExtensions: true, livePreview: true}; }
  open(path: string, options: EditorOpenOptions): EditorSession { return new StateEditorSession(path, options); }
}

/** Replacement plain-text editor provider without CodeMirror capabilities. */
export class PlainEditorProvider extends BaseEditorProvider {
  readonly id = 'engine.editor.plain';
  capabilities(): EditorCapabilities { return {codeMirrorExtensions: false, livePreview: false}; }
  open(path: string, options: EditorOpenOptions): EditorSession { return new PlainEditorSession(path, options); }
}

/** Move a session to another provider, preserving text, version, selection, viewport and dirty state. */
export function migrateSession(from: EditorSession, to: EditorProvider): EditorSession { return to.openDraft(from.draft()); }

/** CodeMirror editor provider plugin; provides the base and optional capability contracts. */
export function createCodeMirrorEditorPlugin(): PluginDefinition {
  return {
    manifest: {
      id: 'engine.editor.codemirror', name: 'CodeMirror editor', version: EDITOR_VERSION, scopes: ['runtime'],
      provides: [{contract: EDITOR_CONTRACT, version: EDITOR_VERSION}, {contract: CODEMIRROR_EDITOR_CONTRACT, version: CODEMIRROR_EDITOR_VERSION}]
    },
    setup(context) {
      const provider = new CodeMirrorEditorProvider();
      context.provide(EDITOR_CONTRACT, EDITOR_VERSION, provider);
      context.provide(CODEMIRROR_EDITOR_CONTRACT, CODEMIRROR_EDITOR_VERSION, {providerId: provider.id, capabilities: provider.capabilities()});
    }
  };
}

/** Plain-text editor provider plugin; it deliberately omits the CodeMirror capability. */
export function createPlainEditorPlugin(): PluginDefinition {
  return {
    manifest: {
      id: 'engine.editor.plain', name: 'Plain editor', version: EDITOR_VERSION, scopes: ['runtime'],
      provides: [{contract: EDITOR_CONTRACT, version: EDITOR_VERSION}]
    },
    setup(context) { context.provide(EDITOR_CONTRACT, EDITOR_VERSION, new PlainEditorProvider()); }
  };
}

export interface EditorRuntime {kernel: Kernel; provider: EditorProvider}

/** Build and start an editor kernel with the requested provider. */
export async function createEditorRuntime(kind: 'codemirror' | 'plain' = 'codemirror', options: {engineVersion?: string} = {}): Promise<EditorRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(kind === 'plain' ? createPlainEditorPlugin() : createCodeMirrorEditorPlugin());
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(EDITOR_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Editor service was not provided');
  return {kernel, provider: resolved.binding.value as EditorProvider};
}
