import {describe,it,expect} from 'vitest';
import {AssemblyError, Kernel} from '../src/kernel';
import {
  TemplateEngine, templatesPlugin, createTemplatesRuntime,
  DailyNotes, dailyNotesPlugin, createDailyNotesRuntime,
  TEMPLATES_CONTRACT, DAILY_NOTES_CONTRACT, type TemplateService
} from '../src/services';

const date = new Date(2026, 0, 2, 3, 4);

describe('template engine', () => {
  it('interpolates title, date, formatted date and time with an injected clock', () => {
    const engine = new TemplateEngine();
    expect(engine.apply('# {{title}}', {title: 'Note', date})).toBe('# Note');
    expect(engine.apply('{{date}}', {title: '', date})).toBe('2026-01-02');
    expect(engine.apply('{{date:YYYY/MM/DD}}', {title: '', date})).toBe('2026/01/02');
    expect(engine.apply('{{time}}', {title: '', date})).toBe('03:04');
    expect(engine.apply('{{unknown}}', {title: '', date})).toBe('{{unknown}}');
  });
});

describe('daily notes', () => {
  it('computes the date path and interpolated content', () => {
    const service = new DailyNotes(new TemplateEngine());
    const note = service.today({folder: 'Daily notes', templateContent: '# {{title}}\n\n{{date}} {{time}}', date});
    expect(note.path).toBe('Daily notes/2026-01-02.md');
    expect(note.content).toBe('# 2026-01-02\n\n2026-01-02 03:04');
    expect(note.date).toBe('2026-01-02');
  });
  it('activates after templates and resolves both contracts', async () => {
    const runtime = await createDailyNotesRuntime();
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.kernel.runtime.services.resolve(TEMPLATES_CONTRACT).ok).toBe(true);
    expect(runtime.kernel.runtime.services.resolve(DAILY_NOTES_CONTRACT).ok).toBe(true);
    expect(runtime.dailyNotes.today({folder: 'D', templateContent: '{{date}}', date}).path).toBe('D/2026-01-02.md');
  });
  it('rejects daily notes when templates is missing', async () => {
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(dailyNotesPlugin());
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(kernel.diagnostics.some(diagnostic => diagnostic.code === 'missing-provider' && diagnostic.contract === TEMPLATES_CONTRACT)).toBe(true);
  });
  it('exposes the templates provider to a plugin that consumes it', async () => {
    const runtime = await createTemplatesRuntime();
    expect(runtime.kernel.runtime.services.resolve(TEMPLATES_CONTRACT).ok).toBe(true);
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(templatesPlugin(new TemplateEngine()));
    kernel.register({manifest: {id: 'engine.probe', name: 'Probe', version: '1.0.0', consumes: [{contract: TEMPLATES_CONTRACT}]}, setup(context) {
      expect(context.service<TemplateService>(TEMPLATES_CONTRACT).apply('{{title}}', {title: 'X', date})).toBe('X');
    }});
    await kernel.start();
    expect(kernel.diagnostics).toEqual([]);
  });
  it('disables and rebinds the daily-notes consumer with its template provider', async () => {
    const runtime = await createDailyNotesRuntime();
    await runtime.kernel.disable('engine.templates');
    expect(runtime.kernel.runtime.instances.has('engine.daily-notes')).toBe(false);
    expect(runtime.kernel.diagnostics.some(diagnostic => diagnostic.code === 'dependency-disabled')).toBe(true);
    await runtime.kernel.enable('engine.templates');
    expect(runtime.kernel.runtime.instances.has('engine.daily-notes')).toBe(true);
  });
});
