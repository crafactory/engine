import MarkdownIt from 'markdown-it';

export type LiveBlockKind='table'|'code'|'diagram'|'quote'|'callout'|'math'|'embed'|'rule';
export interface LiveBlock {from:number;to:number;kind:LiveBlockKind;content:string}
const parser=new MarkdownIt({html:false});

/** Public Markdown grammar, original range mapping. Offsets are UTF-16, like CodeMirror. */
export function liveRegions(content:string):{blocks:LiveBlock[];literal:{from:number;to:number}[]} {
  const lines=content.split('\n'),starts:number[]=[];let offset=0;
  for(const line of lines){starts.push(offset);offset+=line.length+1;}
  const blocks:LiveBlock[]=[],literal:{from:number;to:number}[]=[];
  for(const token of parser.parse(content,{})){
    if(!token.map)continue;
    const [first,last]=token.map;
    const from=starts[first],to=last<lines.length?starts[last]-1:content.length;
    const source=content.slice(from,to);
    if(token.type==='fence'||token.type==='code_block')literal.push({from,to});
    if(token.level!==0)continue;
    let kind:LiveBlockKind|undefined;
    if(token.type==='table_open')kind='table';
    else if(token.type==='fence'||token.type==='code_block')kind=token.info.trim()==='mermaid'?'diagram':'code';
    else if(token.type==='blockquote_open')kind=/^>\s*\[![\w-]+\]/.test(source)?'callout':'quote';
    else if(token.type==='hr')kind='rule';
    else if(token.type==='paragraph_open'){
      if(/^\$\$(?:[^\n]*\$\$|\s*\n[\s\S]*\n\$\$)\s*$/.test(source))kind='math';
      else if(/^(?:!\[\[[^\]\n]+\]\]|!\[[^\]\n]*\]\([^\n]+\))\s*$/.test(source))kind='embed';
    }
    if(kind&&from!==undefined&&to>from)blocks.push({from,to,kind,content:source});
  }
  return {blocks,literal};
}
/** Return only renderable top-level blocks, excluding the literal-region inventory. */
export function liveBlocks(content:string):LiveBlock[]{return liveRegions(content).blocks;}

/** Test half-open source overlap, including a caret located inside a block. */
export function touchesRange(from:number,to:number,ranges:readonly {from:number;to:number}[]):boolean {
  return ranges.some(r=>r.from===r.to?r.from>=from&&r.from<to:r.from<to&&r.to>from);
}

export interface TableCell {from:number;to:number;value:string}
export interface TableRow {cells:TableCell[];header:boolean}
/** Split unescaped pipes, keeping pipes inside matched code spans intact. */
export function tableCells(line:string,offset=0):TableCell[] {
  const boundaries:number[]=[];let code=0;
  for(let i=0;i<line.length;i++){
    let slashCount=0;for(let j=i-1;j>=0&&line[j]==='\\';j--)slashCount++;
    if(slashCount%2)continue;
    if(line[i]==='`'){
      let length=1;while(line[i+length]==='`')length++;
      if(!code)code=length;else if(code===length)code=0;
      i+=length-1;
    }else if(line[i]==='|'&&!code)boundaries.push(i);
  }
  if(!boundaries.length)return [{from:offset,to:offset+line.length,value:line.trim()}];
  const leading=line.slice(0,boundaries[0]).trim()==='';
  const trailing=line.slice(boundaries[boundaries.length-1]+1).trim()==='';
  const points=[-1,...boundaries,line.length],cells:TableCell[]=[];
  for(let i=0;i<points.length-1;i++){
    if((i===0&&leading)||(i===points.length-2&&trailing))continue;
    const start=points[i]+1,end=points[i+1];
    cells.push({from:offset+start,to:offset+end,value:line.slice(start,end).trim().replace(/\\\|/g,'|')});
  }
  return cells;
}
/** Map header and body cells to source offsets while omitting the Markdown separator row. */
export function tableRows(content:string):TableRow[] {
  const rows:TableRow[]=[];let offset=0;
  content.split('\n').forEach((line,index)=>{
    if(index!==1)rows.push({cells:tableCells(line,offset),header:index===0});
    offset+=line.length+1;
  });
  return rows;
}
/** Replace one cell, preserving surrounding whitespace and escaping structural pipes. */
export function replaceTableCell(content:string,cell:TableCell,value:string):string {
  if(value===cell.value)return content;
  const previous=content.slice(cell.from,cell.to);
  const leading=previous.match(/^\s*/)?.[0]||'',trailing=previous.match(/\s*$/)?.[0]||'';
  const escaped=value.replace(/[\r\n]+/g,' ').replace(/(?<!\\)\|/g,'\\|');
  return content.slice(0,cell.from)+leading+escaped+(previous.trim()?trailing:leading? '':' ')+content.slice(cell.to);
}
/** Reduce a block replacement to the changed UTF-16 span so unchanged source and widgets can map forward. */
export function minimalBlockChange(from:number,before:string,after:string):{from:number;to:number;insert:string}|null {
  if(before===after)return null;
  let start=0,endBefore=before.length,endAfter=after.length;
  while(start<endBefore&&start<endAfter&&before[start]===after[start])start++;
  while(endBefore>start&&endAfter>start&&before[endBefore-1]===after[endAfter-1]){endBefore--;endAfter--;}
  return {from:from+start,to:from+endBefore,insert:after.slice(start,endAfter)};
}
