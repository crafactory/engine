import {describe,it,expect} from 'vitest';
import {Kernel} from '../src/kernel';
import {NotesIndex, indexPlugin, createIndexRuntime, INDEX_CONTRACT, type IndexService} from '../src/services';

const notes = [
  {path: 'Ideas/Alpha.md', content: '---\naliases: [A1, A2]\ntags: [project]\nstatus: active\n---\n# Alpha\n\nLink to [[Ideas/Beta|Beta alias]] and #inline.\n\n## Section\n'},
  {path: 'Ideas/Beta.md', content: '# Beta\n\nBack to [[Alpha]].\n'},
  {path: 'Gamma.md', content: '# Gamma\n\nSee [[A1]] by alias.\n'},
  {path: 'Notes/Quiet.md', content: '---\nalias: Whisper\n---\n# Quiet\n'},
  {path: 'Search.md', content: '# Search\n\nneedle here and Needle too.\n'}
];

describe('notes index', () => {
  it('derives title, aliases, tags, headings, links, properties and body', () => {
    const index = new NotesIndex();
    index.rebuild(notes);
    expect(index.size()).toBe(5);
    const alpha = index.note('Ideas/Alpha.md')!;
    expect(alpha.title).toBe('Alpha');
    expect(alpha.aliases).toEqual(['A1', 'A2']);
    expect(alpha.tags).toContain('project');
    expect(alpha.tags).toContain('inline');
    expect(alpha.headings.map(heading => heading.text)).toEqual(['Alpha', 'Section']);
    expect(alpha.links.find(link => link.target === 'Ideas/Beta')?.label).toBe('Beta alias');
    expect(alpha.properties.status).toBe('active');
    expect(alpha.body.startsWith('# Alpha')).toBe(true);
  });
  it('resolves links by path, sibling, title and alias', () => {
    const index = new NotesIndex();
    index.rebuild(notes);
    expect(index.resolve('Beta', 'Ideas/Alpha.md')).toBe('Ideas/Beta.md');
    expect(index.resolve('Ideas/Beta', 'Gamma.md')).toBe('Ideas/Beta.md');
    expect(index.resolve('A1', 'Gamma.md')).toBe('Ideas/Alpha.md');
    expect(index.resolve('Missing', 'Gamma.md')).toBeUndefined();
  });
  it('resolves a singular alias that differs from the title', () => {
    const index = new NotesIndex();
    index.rebuild(notes);
    expect(index.note('Notes/Quiet.md')!.aliases).toEqual(['Whisper']);
    expect(index.resolve('Whisper', 'Gamma.md')).toBe('Notes/Quiet.md');
  });
  it('preserves ordered title/alias resolution across notes', () => {
    const index = new NotesIndex();
    index.rebuild([{path: 'One.md', content: '---\naliases: Shared\n---\n# One\n'}, {path: 'Folder/Shared.md', content: '# Shared\n'}]);
    expect(index.resolve('Shared', 'Other.md')).toBe('One.md');
    index.remove('One.md');
    expect(index.resolve('Shared', 'Other.md')).toBe('Folder/Shared.md');
  });
  it('preserves substring matching for a string alias', () => {
    const index = new NotesIndex();
    index.rebuild([{path: 'Proj.md', content: '---\naliases: Project Alpha\n---\n# Proj\n'}]);
    expect(index.resolve('Alpha', 'Other.md')).toBe('Proj.md');
  });
  it('deduplicates paths on rebuild, keeping the last entry', () => {
    const index = new NotesIndex();
    index.rebuild([{path: 'A.md', content: 'first'}, {path: 'A.md', content: 'second'}]);
    expect(index.size()).toBe(1);
    expect(index.note('A.md')!.body).toContain('second');
  });
  it('returns isolated snapshots from note, outgoing and properties', () => {
    const index = new NotesIndex();
    index.rebuild(notes);
    const snapshot = index.note('Ideas/Alpha.md')!;
    snapshot.links.length = 0;
    snapshot.properties.status = 'mutated';
    expect(index.outgoing('Ideas/Alpha.md').length).toBeGreaterThan(0);
    expect(index.properties('Ideas/Alpha.md').status).toBe('active');
  });
  it('computes backlinks once per source and outgoing links per note', () => {
    const index = new NotesIndex();
    index.rebuild(notes);
    expect(index.outgoing('Ideas/Alpha.md').map(link => link.target)).toContain('Ideas/Beta');
    const backlinks = index.backlinks('Ideas/Alpha.md').map(entry => entry.path).sort();
    expect(backlinks).toEqual(['Gamma.md', 'Ideas/Beta.md']);
    expect(index.backlinks('Ideas/Beta.md').map(entry => entry.path)).toEqual(['Ideas/Alpha.md']);
    expect(index.backlinks('Ideas/Alpha.md').find(entry => entry.path === 'Gamma.md')?.context).toBe('A1');
  });
  it('aggregates tag counts', () => {
    const index = new NotesIndex();
    index.rebuild(notes);
    const tags = index.tags();
    expect(tags).toContainEqual({tag: 'project', count: 1});
    expect(tags).toContainEqual({tag: 'inline', count: 1});
  });
  it('limits tag counts to the given paths', () => {
    const index = new NotesIndex();
    index.rebuild(notes);
    expect(index.tags(['Ideas/Alpha.md'])).toEqual([{tag: 'inline', count: 1}, {tag: 'project', count: 1}]);
    expect(index.tags(['Ideas/Beta.md'])).toEqual([]);
  });
  it('lists unique frontmatter property keys in first-seen order', () => {
    const index = new NotesIndex();
    index.rebuild(notes);
    expect(index.propertyKeys()).toEqual(['aliases', 'tags', 'status', 'alias']);
  });
  it('searches with optional case sensitivity', () => {
    const index = new NotesIndex();
    index.rebuild(notes);
    expect(index.search('needle')).toContain('Search.md');
    expect(index.search('needle', {caseSensitive: true})).toContain('Search.md');
    expect(index.search('NEEDLE', {caseSensitive: true})).not.toContain('Search.md');
    expect(index.search('needle', {caseSensitive: true})).not.toContain('Ideas/Beta.md');
  });
  it('passes search operators through to the note set', () => {
    const index = new NotesIndex();
    index.rebuild(notes);
    expect(index.search('path:Gamma')).toEqual(['Gamma.md']);
    expect(index.search('file:Alpha')).toContain('Ideas/Alpha.md');
    expect(index.search('tag:project')).toContain('Ideas/Alpha.md');
  });
  it('updates and removes notes and invalidates their derivations', () => {
    const index = new NotesIndex();
    index.rebuild(notes);
    index.update('Search.md', '# Search\n\nchanged only\n');
    expect(index.note('Search.md')!.body).toContain('changed only');
    index.update('New.md', '# New\n');
    expect(index.size()).toBe(6);
    expect(index.note('New.md')!.title).toBe('New');
    index.remove('Search.md');
    expect(index.note('Search.md')).toBeUndefined();
    expect(index.paths()).not.toContain('Search.md');
    expect(index.size()).toBe(5);
  });
});

describe('notes index plugin and dependency flow', () => {
  it('provides the contract through the kernel', async () => {
    const runtime = await createIndexRuntime();
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.kernel.runtime.services.resolve(INDEX_CONTRACT).ok).toBe(true);
    runtime.index.rebuild(notes);
    expect(runtime.index.search('needle')).toContain('Search.md');
  });
  it('serves a consumer and survives disable/enable rebinding', async () => {
    let probeSize = -1;
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(indexPlugin(new NotesIndex()));
    kernel.register({manifest: {id: 'engine.probe', name: 'Probe', version: '1.0.0', consumes: [{contract: INDEX_CONTRACT}]}, setup(context) { probeSize = context.service<IndexService>(INDEX_CONTRACT).size(); }});
    await kernel.start();
    expect(probeSize).toBe(0);
    await kernel.disable('engine.index');
    expect(kernel.runtime.instances.has('engine.probe')).toBe(false);
    await kernel.enable('engine.index');
    expect(kernel.runtime.instances.has('engine.probe')).toBe(true);
    expect(kernel.diagnostics.some(diagnostic => diagnostic.code === 'dependency-disabled')).toBe(true);
  });
});
