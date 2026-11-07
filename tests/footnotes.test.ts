import {describe,it,expect} from 'vitest';
import {footnotes} from '../src/footnotes';
import MarkdownIt from 'markdown-it';
import renderFootnotes from 'markdown-it-footnote';

describe('source-positioned footnotes',()=>{
  it('lists named, repeated, inline and unreferenced footnotes in source order',()=>{
    const text='中文😀[^a] again[^a]. Inline ^[with **bold** and [link](target)].\n\n[^a]: A definition\n\n[^orphan]: Not referenced';
    const items=footnotes(text);
    expect(items.map(item=>[item.label,item.text,item.references.length])).toEqual([['a','A definition',2],['Inline','with bold and link',1],['orphan','Not referenced',0]]);
    expect(items[0].references.map(ref=>text.slice(ref.from,ref.to))).toEqual(['[^a]','[^a]']);
    expect(items[0].editOffset).toBe(text.indexOf('A definition'));
    expect(items[1].editOffset).toBe(text.indexOf('with **bold**'));
  });
  it('preserves full-file UTF-16 offsets with CRLF frontmatter and multiline definitions',()=>{
    const text='---\r\nexample: "[^fake]"\r\n---\r\n😀[^中]\r\n\r\n[^中]: first\r\n    second\r\n\r\n    third';
    const [item]=footnotes(text);
    expect(item.label).toBe('中');expect(item.text).toBe('first\nsecond\nthird');
    expect(item.references[0].from).toBe(text.indexOf('[^中]'));
    expect(text.slice(item.definition.from,item.definition.to)).toBe('[^中]: first\r\n    second\r\n\r\n    third');
    expect(item.editOffset).toBe(text.indexOf('first'));
  });
  it('ignores frontmatter, comments, code, escaped markers and unresolved references',()=>{
    const text='---\nfake: "[^fake]"\n---\n`literal ^[inline] [^a] %%`\n\n```md\n[^fake]: fenced\n^[fenced]\n%%\n```\n\n    ^[indented]\n\n%% ^[comment] [^a]\n[^fake]: comment\n%%\n\n\\^[escaped] \\[^a] [^missing]. Real[^a].\n\n[^a]: body';
    const items=footnotes(text);
    expect(items).toHaveLength(1);expect(items[0].label).toBe('a');
    expect(items[0].references).toHaveLength(1);
    expect(items[0].references[0].from).toBe(text.indexOf('Real[^a]')+4);
  });
  it('does not let code percent signs hide later actual comments',()=>{
    const text='`%%` literal.\n\n%% ^[hidden] %% Visible ^[shown].';
    expect(footnotes(text).map(item=>item.text)).toEqual(['shown']);
  });
  it('treats escaped and link/image/HTML percent signs as literal context',()=>{
    const text='\\%% literal. [link](https://example.com/a%%b) ![%%](pixel.png) <i title="%%">x</i>. ^[visible].';
    expect(footnotes(text).map(item=>item.text)).toEqual(['visible']);
  });
  it('handles inline nested brackets, escaped closers and code-span brackets',()=>{
    const text='One ^[a [link](https://example.com) and `]` and \\] literal]. Next ^[two].';
    const items=footnotes(text);
    expect(items).toHaveLength(2);expect(items[0].text).toBe('a link and ] and ] literal');
    expect(text.slice(items[0].definition.from,items[0].definition.to)).toBe('^[a [link](https://example.com) and `]` and \\] literal]');
    expect(items[1].text).toBe('two');
  });
  it('does not interpret image alt text, HTML attributes or link destinations as inline notes',()=>{
    expect(footnotes('![^[alt]](pixel.png) [label](https://example.com/^[url]) <https://example.com/^[autolink]> <img alt="^[html]">')).toEqual([]);
  });
  it('keeps renderer-compatible exact label matching and last-definition precedence',()=>{
    const items=footnotes('Real[^a], mismatch[^A].\n\n[^a]: first\n\n[^a]: last');
    expect(items).toHaveLength(1);expect(items[0].text).toBe('last');expect(items[0].references).toHaveLength(1);
  });
  it('finds definitions in blockquotes and lists without losing their source location',()=>{
    const text='Ref[^quote] and[^list].\n\n> [^quote]: quoted\n>     continued\n\n- [^list]: listed';
    const items=footnotes(text);
    expect(items.map(item=>item.label)).toEqual(['quote','list']);
    expect(items[0].editOffset).toBe(text.indexOf('quoted'));
    expect(items[1].editOffset).toBe(text.indexOf('listed'));
  });
  it('does not capture malformed or empty inline notes across separate blocks',()=>{
    expect(footnotes('Broken ^[unterminated\n\nlater ] and ^[]')).toEqual([]);
  });
  it('displays hard line breaks and keeps escaped definition-label offsets',()=>{
    const text='Ref[^a\\]b].\n\n[^a\\]b]: first  \n    second';
    const [item]=footnotes(text);expect(item.text).toBe('first\nsecond');
    expect(item.editOffset).toBe(text.indexOf('first'));
  });
  it('preserves distinct raw entity labels, checked against black-box renderer tokens',()=>{
    const text='One[^a&amp;b], two[^a&b], unmatched[^a&#38;b].\n\n[^a&amp;b]: encoded\n\n[^a&b]: literal';
    const items=footnotes(text);
    expect(items.map(item=>[item.label,item.text,item.references.length])).toEqual([['a&amp;b','encoded',1],['a&b','literal',1]]);
    const rendered=new MarkdownIt().use(renderFootnotes).parse(text,{});
    expect(rendered.filter(token=>token.type==='footnote_open').map(token=>token.meta.label)).toEqual(items.map(item=>item.label));
  });
  it('handles many unterminated outer prefixes without losing the valid inner note',()=>{
    const items=footnotes('^['.repeat(2000)+'valid]');
    expect(items).toHaveLength(1);expect(items[0].text).toBe('valid');
  });
  it('indexes many literal ranges and retains a long inline body and percent comments',()=>{
    const prefix=Array.from({length:500},(_,i)=>'`code '+i+' %%`').join(' ');
    const body='long '.repeat(2000);
    const text=prefix+' %% ^[hidden] %% ^['+body+']',items=footnotes(text);
    expect(items).toHaveLength(1);expect(items[0].text).toBe(body.trimEnd());
    expect(text.slice(items[0].editOffset,items[0].definition.to-1)).toBe(body);
  });
});
