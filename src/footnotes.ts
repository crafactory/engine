/* Source-positioned footnotes. The AST library supplies Markdown contexts and UTF-16
 * ranges; no application/plugin implementation is copied or inspected. */
import {fromMarkdown} from 'mdast-util-from-markdown';
import {gfmFootnoteFromMarkdown} from 'mdast-util-gfm-footnote';
import {gfmFootnote} from 'micromark-extension-gfm-footnote';
import {frontmatter} from './knowledge';

interface Node {
  type:string;identifier?:string;label?:string|null;value?:string;alt?:string|null;children?:Node[];
  position?:{start:{offset?:number};end:{offset?:number}};
}
interface Range {from:number;to:number}
export interface Footnote {
  /** Source-stable identity, never the displayed ordinal. */
  key:string;label:string;kind:'named'|'inline';text:string;
  definition:Range;editOffset:number;references:Range[];
}
export interface FootnotesRequest {id:number;content:string}
export interface FootnotesResponse {id:number;items?:Footnote[];error?:string}
const parse=(content:string):Node=>fromMarkdown(content,{extensions:[gfmFootnote()],mdastExtensions:[gfmFootnoteFromMarkdown()]});
const range=(node:Node):Range=>({from:node.position?.start.offset??0,to:node.position?.end.offset??0});
function linkTail(node:Node,source:string):Range|undefined{
  if(node.type!=='link'&&node.type!=='linkReference')return;
  if(source[range(node).from]!=='[')return range(node); // Angle autolink: its label is a literal URL.
  const labelEnd=node.children?.at(-1)?.position?.end.offset??range(node).from;
  const close=source.indexOf(']',labelEnd);
  if(close>=0&&close<range(node).to)return {from:close+1,to:range(node).to};
}
const walk=(node:Node,visit:(node:Node)=>void)=>{visit(node);for(const child of node.children??[])walk(child,visit);};
const blank=(text:string)=>text.replace(/[^\r\n]/g,' ');
const escaped=(text:string,index:number)=>{let slashes=0;while(index>0&&text[--index]==='\\')slashes++;return slashes%2===1;};
/** Merge nested/adjacent literal spans once; lookup never rescans every range. */
function indexRanges(ranges:Range[]){
  const merged:Range[]=[];
  for(const span of ranges.sort((a,b)=>a.from-b.from)){
    const previous=merged.at(-1);
    if(previous&&span.from<=previous.to)previous.to=Math.max(previous.to,span.to);
    else merged.push({...span});
  }
  return (offset:number):Range|undefined=>{
    let lo=0,hi=merged.length-1;
    while(lo<=hi){const mid=(lo+hi)>>>1,span=merged[mid];if(offset<span.from)hi=mid-1;else if(offset>=span.to)lo=mid+1;else return span;}
  };
}
/** Plain display text only; the panel never injects note-authored HTML. */
function display(node:Node):string{
  if(node.value!==undefined)return node.value.replace(/\r\n?/g,'\n').replace(/\u200B/g,'');
  if(node.type==='break')return '\n';
  if(node.type==='image')return node.alt??'';
  if(node.type==='footnoteReference')return '[^'+(node.label??node.identifier)+']';
  const block=['root','footnoteDefinition','blockquote','list','listItem'].includes(node.type);
  return (node.children??[]).map(display).join(block?'\n':'');
}
/** Hide frontmatter and Obsidian comments without changing line endings or offsets.
 * A literal %% inside inline/fenced/indented code must not swallow later prose. */
function proseSource(content:string):string{
  const prefix=frontmatter(content).raw.length;
  const source=blank(content.slice(0,prefix))+content.slice(prefix);
  const code:Range[]=[];
  walk(parse(source),node=>{
    if(['code','inlineCode','image','html'].includes(node.type))code.push(range(node));
    const tail=linkTail(node,source);if(tail)code.push(tail);
  });
  const literalAt=indexRanges(code),chunks:string[]=[];
  let cursor=0,last=0;
  while(cursor<source.length){
    const from=source.indexOf('%%',cursor);if(from<0)break;
    if(escaped(source,from)){cursor=from+1;continue;}
    const literal=literalAt(from);
    if(literal){cursor=literal.to;continue;}
    const close=source.indexOf('%%',from+2),to=close<0?source.length:close+2;
    // Spaces before remaining prose would turn an inline comment into indented code.
    // Invisible non-whitespace keeps the original block context and UTF-16 offsets.
    chunks.push(source.slice(last,from),source.slice(from,to).replace(/[^\r\n]/g,'\u200B'));last=to;cursor=to;
  }
  chunks.push(source.slice(last));return chunks.join('');
}
/** List all named definitions (including unreferenced ones) and inline ^[notes].
 * Source remains untouched: editing/navigation delegates to the real source editor,
 * retaining source structure, undo history, conflict checks and normal persistence. */
export function footnotes(content:string):Footnote[]{
  const source=proseSource(content),tree=parse(source),definitions=new Map<string,Footnote>();
  const references:{label:string;span:Range}[]=[],paragraphs:Range[]=[],literal:Range[]=[];
  walk(tree,node=>{
    if(node.type==='footnoteDefinition'){
      const span=range(node),head=content.slice(span.from,span.to).match(/^\[\^((?:\\.|[^\]\\])+)\]:[ \t]*/);
      // Keep label matching/duplicate winner consistent with Engine's Markdown renderer:
      // exact labels, last definition wins. AST-normalized identifiers are not used.
      if(!head)return;
      const label=head[1];
      definitions.set(label,{key:'named:'+label,label,kind:'named',text:display(node),definition:span,
        editOffset:span.from+head[0].length,references:[]});
    }else if(node.type==='footnoteReference'){
      const span=range(node);references.push({label:content.slice(span.from+2,span.to-1),span});
    }
    if(node.type==='paragraph'||node.type==='heading')paragraphs.push(range(node));
    if(['code','inlineCode','image','html','definition','footnoteReference'].includes(node.type))literal.push(range(node));
    const tail=linkTail(node,source);if(tail)literal.push(tail);
  });
  for(const reference of references)definitions.get(reference.label)?.references.push(reference.span);
  const result=[...definitions.values()],literalAt=indexRanges(literal);
  for(const paragraph of paragraphs){
    // One bracket pass also handles many unterminated outer notes without O(n²)
    // rescanning. A valid outer note owns its nested bracket candidates.
    const stack:{from:number;note:boolean}[]=[],candidates:Range[]=[];
    for(let pos=paragraph.from;pos<paragraph.to;pos++){
      const skip=literalAt(pos);if(skip){pos=skip.to-1;continue;}
      if(escaped(source,pos))continue;
      if(source[pos]==='[')stack.push({from:pos,note:pos>paragraph.from&&source[pos-1]==='^'&&!escaped(source,pos-1)});
      else if(source[pos]===']'){
        const open=stack.pop();
        if(open?.note&&pos>open.from+1)candidates.push({from:open.from-1,to:pos+1});
      }
    }
    let covered=paragraph.from;
    for(const {from,to} of candidates.sort((a,b)=>a.from-b.from)){
      if(from<covered)continue;
      covered=to;
      const end=to-1;
      result.push({key:'inline:'+from,label:'Inline',kind:'inline',text:display(parse(source.slice(from+2,end))),
        definition:{from,to},editOffset:from+2,references:[{from,to}]});
    }
  }
  return result.sort((a,b)=>(a.references[0]?.from??a.definition.from)-(b.references[0]?.from??b.definition.from));
}
