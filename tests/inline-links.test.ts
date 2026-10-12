import {describe,it,expect} from 'vitest';
import {inlineLinks} from '../src/inline-links';
describe('bounded Live link tokens',()=>{
  it('retains aliases, fragments and decoded Markdown destinations',()=>{
    expect(inlineLinks('[[Board.canvas|Board]] [Section](Note%20name.md#Heading)').map(l=>[l.target,l.label,l.external])).toEqual([['Board.canvas','Board',false],['Note name.md#Heading','Section',false]]);
  });
  it('classifies external schemes without admitting executable or protocol-relative URLs',()=>{
    expect(inlineLinks('[web](https://example.com) [mail](mailto:a@example.com) [bad](javascript:alert) [file](file:///etc/passwd) [net](//evil.test)').map(l=>l.target)).toEqual(['https://example.com','mailto:a@example.com']);
  });
  it('does not activate inline code, images or escaped links',()=>expect(inlineLinks('`[[Code]]` ![[Image]] ![x](x.png) \\[[Escaped]]')).toEqual([]));
});
