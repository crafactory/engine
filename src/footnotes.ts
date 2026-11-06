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
const parse=(content:string):Node=>fromMarkdown(content,{extensions:[gfmFootnote()],mdastExtensions:[gfmFootnoteFromMarkdown()]});
const range=(node:Node):Range=>({from:node.position?.start.offset??0,to:node.position?.end.offset??0});
const walk=(node:Node,visit:(node:Node)=>void)=>{visit(node);for(const child of node.children??[])walk(child,visit);};
const blank=(text:string)=>text.replace(/[^\r\n]/g,' ');
const escaped=(text:string,index:number)=>{let slashes=0;while(index>0&&text[--index]==='\\')slashes++;return slashes%2===1;};
/** Plain display text only; the panel never injects note-authored HTML. */
function display(node:Node):string{
  if(node.value!==undefined)return node.value.replace(/\r\n?/g,'\n').replace(/\u200B/g,'');
  if(node.type==='image')return node.alt??'';
  if(node.type==='footnoteReference')return '[^'+(node.label??node.identifier)+']';
  const block=['root','footnoteDefinition','blockquote','list','listItem'].includes(node.type);
  return (node.children??[]).map(display).join(block?'\n':'');
}
/** Hide frontmatter and Obsidian comments without changing line endings or offsets.
 * A literal %% inside inline/fenced/indented code must not swallow later prose. */
function proseSource(content:string):string{
  const prefix=frontmatter(content).raw.length;
  let source=blank(content.slice(0,prefix))+content.slice(prefix);
  const code:Range[]=[];
  walk(parse(source),node=>{if(node.type==='code'||node.type==='inlineCode')code.push(range(node));});
  let cursor=0;
  while(cursor<source.length){
    const from=source.indexOf('%%',cursor);if(from<0)break;
    const literal=code.find(item=>from>=item.from&&from<item.to);
    if(literal){cursor=literal.to;continue;}
    const close=source.indexOf('%%',from+2),to=close<0?source.length:close+2;
    // Spaces before remaining prose would turn an inline comment into indented code.
    // Invisible non-whitespace keeps the original block context and UTF-16 offsets.
    source=source.slice(0,from)+source.slice(from,to).replace(/[^\r\n]/g,'\u200B')+source.slice(to);cursor=to;
  }
  return source;
}
/** List all named definitions (including unreferenced ones) and inline ^[notes].
 * Source remains untouched: editing/navigation delegates to the real source editor,
 * retaining source structure, undo history, conflict checks and normal persistence. */
export function footnotes(content:string):Footnote[]{
  const source=proseSource(content),tree=parse(source),definitions=new Map<string,Footnote>();
  const references:{label:string;span:Range}[]=[],paragraphs:Range[]=[],literal:Range[]=[];
  walk(tree,node=>{
    if(node.type==='footnoteDefinition'){
      const span=range(node),head=content.slice(span.from,span.to).match(/^\[\^[^\]]+\]:[ \t]*/);
      // Keep label matching/duplicate winner consistent with Engine's Markdown renderer:
      // exact labels, last definition wins. AST-normalized identifiers are not used.
      const label=node.label??node.identifier??'';
      definitions.set(label,{key:'named:'+label,label,kind:'named',text:display(node),definition:span,
        editOffset:head?span.from+head[0].length:span.from,references:[]});
    }else if(node.type==='footnoteReference')references.push({label:node.label??node.identifier??'',span:range(node)});
    if(node.type==='paragraph'||node.type==='heading')paragraphs.push(range(node));
    if(['code','inlineCode','image','html','definition','footnoteReference'].includes(node.type))literal.push(range(node));
    if(node.type==='link'||node.type==='linkReference'){
      const labelEnd=node.children?.at(-1)?.position?.end.offset??range(node).from;
      const close=source.indexOf(']',labelEnd);
      if(close>=0&&close<range(node).to)literal.push({from:close+1,to:range(node).to});
    }
  });
  for(const reference of references)definitions.get(reference.label)?.references.push(reference.span);
  const result=[...definitions.values()];
  for(const paragraph of paragraphs){
    for(let from=paragraph.from;from<paragraph.to-2;from++){
      if(source[from]!=='^'||source[from+1]!=='['||escaped(source,from))continue;
      if(literal.some(item=>from>=item.from&&from<item.to))continue;
      let depth=1,end=from+2;
      for(;end<paragraph.to;end++){
        const code=literal.find(item=>end>=item.from&&end<item.to);
        if(code){end=code.to-1;continue;}
        if(escaped(source,end))continue;
        if(source[end]==='[')depth++;
        else if(source[end]===']'&&!--depth)break;
      }
      if(depth||end===from+2)continue;
      result.push({key:'inline:'+from,label:'Inline',kind:'inline',text:display(parse(source.slice(from+2,end))),
        definition:{from,to:end+1},editOffset:from+2,references:[{from,to:end+1}]});
      from=end;
    }
  }
  return result.sort((a,b)=>(a.references[0]?.from??a.definition.from)-(b.references[0]?.from??b.definition.from));
}
