import {describe,it,expect} from 'vitest';
import {frontmatter,setProperties,links,tags,resolveLink,headings,section,rewriteLinks,search,fuzzy,applyTemplate} from '../src/knowledge';
import {baseFilter,expression} from '../src/base-expression';
const notes=[
  {path:'Ideas/Alpha.md',content:'---\ntags: [thinking]\naliases: [First]\nstatus: active\nprice: 12\n---\n# Alpha\nA happy cat and dog.\n\n## Section\n- [ ] call Alice\n- [x] email Bob\n\nA block. ^one\n\n[[Beta]]\n'},
  {path:'Beta.md',content:'# Beta\nA meeting about work.\n[[Ideas/Alpha#Section|Alpha]]\n#work/project\n'},
  {path:'Other.md',content:'# Other\nA personal meetup.\n```md\n[[Fake]] #fake\n```\n`#inline` %% #hidden %%\n'}
];
describe('Markdown metadata and index',()=>{
  it('parses YAML properties and body',()=>{expect(frontmatter(notes[0].content).properties.price).toBe(12);expect(frontmatter(notes[0].content).body.startsWith('# Alpha')).toBe(true);});
  it('round-trips typed properties',()=>{expect(frontmatter(setProperties(notes[0].content,{done:true,count:2,items:['a']})).properties).toEqual({done:true,count:2,items:['a']});});
  it('does not silently overwrite malformed frontmatter',()=>{expect(frontmatter('---\na: [\n---\nText').error).toBeTruthy();expect(()=>setProperties('---\na: [\n---\nText',{})).toThrow();});
  it('rejects non-mapping YAML',()=>expect(frontmatter('---\n- a\n---\n').error).toBeTruthy());
  it('ignores links and tags in fenced code, inline code, and comments',()=>{expect(links(notes[2].content)).toEqual([]);expect(tags(notes[2].content)).toEqual([]);});
  it('parses wikilink aliases, headings, blocks, embeds and Markdown links',()=>{
    expect(links('[[Alpha#Section|A]] ![[Beta#^one]] [B](Beta.md) [web](https://example.com)')).toEqual([
      {target:'Alpha',label:'A',fragment:'Section',embed:false},
      {target:'Beta',label:'Beta',fragment:'^one',embed:true},
      {target:'Beta.md',label:'Beta',fragment:'',embed:false}
    ]);
  });
  it('collects nested and frontmatter tags without duplicates',()=>expect(tags(notes[0].content+'\n#thinking #知识/图谱 #42')).toEqual(['thinking','知识/图谱']));
  it('resolves paths, filenames, aliases, URL encoding and local self links',()=>{
    expect(resolveLink('Alpha','Beta.md',notes)?.path).toBe('Ideas/Alpha.md');
    expect(resolveLink('First','Beta.md',notes)?.path).toBe('Ideas/Alpha.md');
    expect(resolveLink('Ideas/Alpha.md','Beta.md',notes)?.path).toBe('Ideas/Alpha.md');
    expect(resolveLink('','Beta.md',notes)?.path).toBe('Beta.md');
  });
  it('indexes headings while excluding code',()=>expect(headings('# One\n```\n# Nope\n```\n## Two').map(h=>h.text)).toEqual(['One','Two']));
  it('extracts heading sections and block references',()=>{expect(section(notes[0].content,'Section')).toContain('call Alice');expect(section(notes[0].content,'^one')).toBe('A block.');});
  it('rewrites resolved links without changing aliases and fragments',()=>{
    const next=rewriteLinks(notes[1].content,'Ideas/Alpha.md','Ideas/Renamed.md','Beta.md',notes);
    expect(next).toContain('[[Ideas/Renamed#Section|Alpha]]');expect(next).toContain('#work/project');
  });
  it('rewrites Markdown internal links',()=>expect(rewriteLinks('[A](Ideas/Alpha.md#Section)','Ideas/Alpha.md','Renamed.md','Beta.md',notes)).toBe('[A](Renamed.md#Section)'));
});
describe('search query language',()=>{
  const paths=(query:string)=>search(notes,query).map(n=>n.path);
  it('implicit AND matches terms anywhere',()=>expect(paths('happy dog')).toEqual(['Ideas/Alpha.md']));
  it('supports OR',()=>expect(paths('meeting OR meetup')).toEqual(['Beta.md','Other.md']));
  it('supports nested groups and exclusion',()=>expect(paths('(meeting OR meetup) -personal')).toEqual(['Beta.md']));
  it('supports quoted phrases',()=>expect(paths('"happy cat"')).toEqual(['Ideas/Alpha.md']));
  it('supports file and path operators',()=>{expect(paths('path:Ideas file:Alpha')).toEqual(['Ideas/Alpha.md']);expect(paths('path:"Ideas/"')).toEqual(['Ideas/Alpha.md']);});
  it('supports regexp',()=>expect(paths('/h.ppy/')).toEqual(['Ideas/Alpha.md']));
  it('tolerates invalid regex without crashing',()=>expect(paths('/[/')).toEqual([]));
  it('supports tag operators',()=>expect(paths('tag:#thinking')).toEqual(['Ideas/Alpha.md']));
  it('supports property existence, values and comparison',()=>{expect(paths('[status]')).toEqual(['Ideas/Alpha.md']);expect(paths('[status:active]')).toEqual(['Ideas/Alpha.md']);expect(paths('[price:>10]')).toEqual(['Ideas/Alpha.md']);});
  it('supports task states and nested task query',()=>{expect(paths('task-todo:call')).toEqual(['Ideas/Alpha.md']);expect(paths('task-done:call')).toEqual([]);expect(paths('task:(call OR email)')).toEqual(['Ideas/Alpha.md']);});
  it('supports same-line, block, and section queries',()=>{expect(paths('line:(happy dog)')).toEqual(['Ideas/Alpha.md']);expect(paths('block:(cat call)')).toEqual([]);expect(paths('section:(call email)')).toEqual(['Ideas/Alpha.md']);});
  it('supports case sensitivity',()=>{expect(paths('match-case:Happy')).toEqual([]);expect(search(notes,'Alpha',true).length).toBe(2);});
});
describe('templates and quick switcher',()=>{
  it('uses local dates and interpolates title / date / time',()=>{
    expect(applyTemplate('{{title}} {{date}} {{date:YYYY/MM/DD}} {{time}}','Note',new Date(2026,9,11,9,5))).toBe('Note 2026-10-11 2026/10/11 09:05');
  });
  it('fuzzy matches initials',()=>{expect(fuzzy('scf','Save current file')).toBeGreaterThan(0);expect(fuzzy('zz','Save file')).toBe(-1);});
});
describe('Bases safe expression interpreter',()=>{
  const evaluate=(s:string)=>expression(s,notes[0],undefined,notes);
  it('reads note and file properties',()=>{expect(evaluate('price')).toBe(12);expect(evaluate('note.status')).toBe('active');expect(evaluate('file.folder')).toBe('Ideas');});
  it('handles arithmetic precedence and grouping',()=>{expect(evaluate('price * 2 + 1')).toBe(25);expect(evaluate('(price + 1) * 2')).toBe(26);});
  it('supports comparisons and boolean operators',()=>expect(evaluate('price > 5 && status == "active"')).toBe(true));
  it('supports functions and formulas',()=>{
    expect(evaluate('file.hasTag("thinking")')).toBe(true);expect(evaluate('if(price > 5, "high", "low")')).toBe('high');
    expect(expression('formula.total',notes[0],undefined,notes,{total:'price * 3'})).toBe(36);
  });
  it('supports composed filters',()=>expect(baseFilter({and:['price > 10',{not:['status == "done"']}]},notes[0],undefined,notes,{})).toBe(true));
  it('reports unsupported functions rather than evaluating JavaScript',()=>{expect(()=>evaluate('process.exit()')).toThrow('Unsupported function');expect(()=>evaluate('file.name.toUpperCase()')).toThrow();});
  it('rejects prototype lookup',()=>expect(()=>evaluate('constructor')).toThrow('Forbidden'));
  it('reports circular formulas',()=>expect(()=>expression('formula.a',notes[0],undefined,notes,{a:'formula.b',b:'formula.a'})).toThrow('Circular'));
});
