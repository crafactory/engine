import {describe,it,expect} from 'vitest';
import {NoteComposer, noteComposerPlugin, createNoteComposerRuntime, NOTE_COMPOSER_CONTRACT} from '../src/services';
import {Kernel} from '../src/kernel';

describe('note composer service', () => {
  it('appends the source body without its frontmatter and keeps the target intact', () => {
    const composer = new NoteComposer();
    expect(composer.merge('Target', '---\ntags: [x]\n---\n# Source\n\nBody')).toBe('Target\n\n# Source\n\nBody');
    expect(composer.merge('# Target\n', 'Source only')).toBe('# Target\n\n\nSource only');
    expect(composer.merge('Target', '')).toBe('Target\n\n');
  });
  it('builds a wikilink without the Markdown extension', () => {
    const composer = new NoteComposer();
    expect(composer.extractLink('Notes/A.md')).toBe('[[Notes/A]]');
    expect(composer.extractLink('A')).toBe('[[A]]');
  });
  it('resolves the contract from a runtime and serves a consumer', async () => {
    const runtime = await createNoteComposerRuntime();
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.kernel.runtime.services.resolve(NOTE_COMPOSER_CONTRACT).ok).toBe(true);
    expect(runtime.service.extractLink('A.md')).toBe('[[A]]');
    let merged = '';
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(noteComposerPlugin(new NoteComposer()));
    kernel.register({manifest: {id: 'engine.probe', name: 'Probe', version: '1.0.0', consumes: [{contract: NOTE_COMPOSER_CONTRACT}]}, setup(context) { merged = context.service<NoteComposer>(NOTE_COMPOSER_CONTRACT).merge('A', 'B'); }});
    await kernel.start();
    expect(merged).toBe('A\n\nB');
  });
});
