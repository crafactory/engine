import {describe,it,expect} from 'vitest';
import {AssemblyError, Kernel} from '../src/kernel';
import {TemplateEngine, UniqueNotes, uniqueNotePlugin, createUniqueNoteRuntime, UNIQUE_NOTE_CONTRACT, TEMPLATES_CONTRACT} from '../src/services';

const date = new Date(Date.UTC(2026, 0, 2, 3, 4, 5));
const expectedName = '20260102030405';

describe('unique note service', () => {
  it('uses a UTC timestamp path and a default heading without a template', () => {
    const note = new UniqueNotes(new TemplateEngine()).create({date});
    expect(note.path).toBe(expectedName + '.md');
    expect(note.content).toBe('# ' + expectedName + '\n\n');
  });
  it('applies template tokens through the templates provider', () => {
    const note = new UniqueNotes(new TemplateEngine()).create({date, templateContent: '# {{title}}\n\nBody'});
    expect(note.path).toBe(expectedName + '.md');
    expect(note.content).toBe('# ' + expectedName + '\n\nBody');
  });
});

describe('unique note plugin and dependency flow', () => {
  it('resolves after templates and provides the contract', async () => {
    const runtime = await createUniqueNoteRuntime();
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.kernel.runtime.services.resolve(UNIQUE_NOTE_CONTRACT).ok).toBe(true);
    expect(runtime.kernel.runtime.services.resolve(TEMPLATES_CONTRACT).ok).toBe(true);
    expect(runtime.uniqueNote.create({date}).path).toBe(expectedName + '.md');
  });
  it('rejects unique note when templates is missing', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(uniqueNotePlugin());
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(kernel.diagnostics.some(diagnostic => diagnostic.code === 'missing-provider' && diagnostic.contract === TEMPLATES_CONTRACT)).toBe(true);
  });
  it('disables unique note with its template provider', async () => {
    const runtime = await createUniqueNoteRuntime();
    await runtime.kernel.disable('engine.templates');
    expect(runtime.kernel.runtime.instances.has('engine.unique-note')).toBe(false);
    expect(runtime.kernel.diagnostics.some(diagnostic => diagnostic.code === 'dependency-disabled')).toBe(true);
  });
});
