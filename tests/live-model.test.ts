import {describe,it,expect} from 'vitest';
import {liveBlocks,liveRegions,touchesRange,tableCells,tableRows,replaceTableCell,fenceLanguage,fenceSource,listMarker} from '../src/live-model';

describe('original live Markdown block mapping',()=>{
  it('maps top-level tables, fenced diagrams, quotes, math and embeds',()=>{
    const text='# Title\n\n| Name | State |\n| --- | --- |\n| One | Open |\n\n```mermaid\nflowchart LR\nA-->B\n```\n\n> [!note]- Details\n> Body\n\n$$\nx^2\n$$\n\n![[Linked]]\n\n---\n';
    const blocks=liveBlocks(text);
    expect(blocks.map(b=>b.kind)).toEqual(['table','diagram','callout','math','embed','rule']);
    blocks.forEach(b=>expect(text.slice(b.from,b.to)).toBe(b.content));
  });
  it('does not decorate table or math-looking text inside code',()=>{
    expect(liveBlocks('```\n| A | B |\n|---|---|\n$$\nx\n$$\n```').map(b=>b.kind)).toEqual(['code']);
  });
  it('keeps fenced content intact with different marker lengths',()=>{
    const text='````js\nconst code = "```";\n```\n````';
    expect(liveBlocks(text)).toEqual([{from:0,to:text.length,kind:'code',content:text}]);
  });
  it('ignores nested blocks instead of overlapping range decorations',()=>{
    const blocks=liveBlocks('> quote\n>\n> ```\n> code\n> ```');
    expect(blocks).toHaveLength(1);expect(blocks[0].kind).toBe('quote');
  });
  it('retains literal ranges for code nested inside lists',()=>{
    const text='- Example\n\n  ```md\n  - [ ] Not a real task\n  $notMath$\n  ```\n';
    const regions=liveRegions(text);expect(regions.blocks).toHaveLength(0);expect(regions.literal).toHaveLength(1);
    expect(text.slice(regions.literal[0].from,regions.literal[0].to)).toContain('Not a real task');
  });
  it('supports single-line display math',()=>expect(liveBlocks('$$x^2$$')[0]?.kind).toBe('math'));
  it('handles UTF-16 offsets and CRLF without shifting source spans',()=>{
    const text='中文😀\r\n\r\n```js\r\nconst x=1;\r\n```\r\n';
    const block=liveBlocks(text)[0];expect(block.from).toBe(text.indexOf('```'));expect(text.slice(block.from,block.to)).toBe(block.content);
  });
  it('exposes any block touched by any selection, but not adjacent blocks',()=>{
    expect(touchesRange(10,20,[{from:0,to:15}])).toBe(true);
    expect(touchesRange(10,20,[{from:0,to:0},{from:12,to:12}])).toBe(true);
    expect(touchesRange(10,20,[{from:20,to:20}])).toBe(false);
    expect(touchesRange(10,20,[{from:0,to:10}])).toBe(false);
  });
});
describe('loss-minimizing live table cell edits',()=>{
  it('handles optional outer pipes and empty cells',()=>{
    expect(tableCells('Name | Value').map(c=>c.value)).toEqual(['Name','Value']);
    expect(tableCells('| A | |').map(c=>c.value)).toEqual(['A','']);
  });
  it('respects escaped pipes and matching backticks',()=>{
    expect(tableCells('| A\\|B | `a|b` | ``x`|y`` |').map(c=>c.value)).toEqual(['A|B','`a|b`','``x`|y``']);
  });
  it('edits one cell and preserves separators, alignment and neighboring text',()=>{
    const text='| Name | Value |\n| :--- | ---: |\n| One | Old |';
    const rows=tableRows(text);expect(rows).toHaveLength(2);
    expect(replaceTableCell(text,rows[1].cells[1],'New | value')).toBe('| Name | Value |\n| :--- | ---: |\n| One | New \\| value |');
  });
  it('flattens newlines rather than creating extra table rows',()=>{
    const text='| A | B |\n|---|---|\n| X | Y |';
    expect(replaceTableCell(text,tableRows(text)[1].cells[0],'Line\nbreak')).toContain('| Line break | Y |');
  });
  it('does not rewrite cell escaping when committing an unchanged value',()=>{
    const text='| A | B |\n|---|---|\n| X\\|Y | Z |',cell=tableRows(text)[1].cells[0];
    expect(replaceTableCell(text,cell,cell.value)).toBe(text);
  });
});

describe('fenced block helpers',()=>{
  it('reads a language with permitted indentation',()=>{
    expect(fenceLanguage('```mermaid\nA-->B\n```')).toBe('mermaid');
    expect(fenceLanguage('   ```mermaid title\nA-->B\n   ```')).toBe('mermaid');
    expect(fenceLanguage('~~~js\n1\n~~~')).toBe('js');
  });
  it('keeps the last body line for an unclosed fence',()=>{
    expect(fenceSource('```mermaid\nA-->B\n```')).toBe('A-->B');
    expect(fenceSource('```mermaid\nA-->B')).toBe('A-->B');
  });
});

describe('list markers',()=>{
  it('maps bullets and ordered markers with their source ranges',()=>{
    expect(listMarker('- item',10)).toMatchObject({marker:'-',ordered:false,from:10,to:12,depth:0});
    expect(listMarker('  2. item',0)).toMatchObject({marker:'2.',ordered:true,from:2,to:5,depth:1});
    expect(listMarker('\t1) item',0)).toMatchObject({marker:'1)',ordered:true,depth:2});
  });
  it('ignores non-list lines and requires trailing space',()=>{
    expect(listMarker('plain')).toBeUndefined();
    expect(listMarker('-item')).toBeUndefined();
    expect(listMarker('---')).toBeUndefined();
  });
});
