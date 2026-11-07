import {describe,it,expect} from 'vitest';
import {parseMetadata} from '../src/metadata';

const content=`---
tags: [alpha, beta]
status: active
---
# Heading

A [[Target|Alias]] and ![[Embed#Part]] and [label](Note.md).

- [x] done #inline
  - child ^block1
`;
const offset=(text:string)=>content.indexOf(text);

describe('bounded CachedMetadata derivation',()=>{
  const cache=parseMetadata(content);
  it('exposes frontmatter and its full-file position',()=>{
    expect(cache.frontmatter).toEqual({tags:['alpha','beta'],status:'active'});
    expect(cache.frontmatterPosition?.start).toEqual({line:0,col:0,offset:0});
    expect(cache.frontmatterPosition?.end.offset).toBe(offset('# Heading')-1);
  });
  it('maps headings, links and embeds to offsets',()=>{
    expect(cache.headings).toHaveLength(1);
    expect(cache.headings![0]).toMatchObject({heading:'Heading',level:1,position:{start:{line:4,col:0,offset:offset('# Heading')}}});
    expect(cache.links?.map(link=>link.link)).toEqual(['Target','Embed','Note.md']);
    expect(cache.links?.find(link=>link.link==='Target')?.displayText).toBe('Alias');
    expect(cache.embeds).toHaveLength(1);
    expect(cache.embeds![0]).toMatchObject({link:'Embed'});expect(cache.embeds![0].displayText).toBeUndefined();
    expect(cache.links?.find(link=>link.link==='Note.md')?.displayText).toBe('label');
  });
  it('maps inline and frontmatter tags with hash prefixes',()=>{
    expect(cache.tags?.map(tag=>tag.tag)).toEqual(['#inline','#alpha','#beta']);
    expect(cache.tags?.[0].position.start).toMatchObject({line:8,col:11,offset:offset('#inline')});
  });
  it('maps list items, tasks and block ids',()=>{
    expect(cache.listItems).toHaveLength(2);
    expect(cache.listItems![0]).toMatchObject({line:8,parent:-1,task:'x'});
    expect(cache.listItems![1]).toMatchObject({line:9,parent:8});expect(cache.listItems![1].task).toBeUndefined();
    expect(cache.blocks?.block1).toMatchObject({id:'block1',type:'paragraph'});
  });
  it('creates yaml and heading sections',()=>{
    expect(cache.sections?.map(section=>section.type)).toEqual(['yaml','heading']);
    expect(cache.sections?.[1].id).toBe('Heading');
  });
});
