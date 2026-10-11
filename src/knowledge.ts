import {parse, stringify} from 'yaml';
import type {Note} from './types';

export const title = (path: string) => path.split('/').pop()!.replace(/\.(md|markdown|canvas|base)$/i,'');
export const isNote = (path: string) => /\.(md|markdown)$/i.test(path);
export function frontmatter(content: string): {properties: Record<string, any>; body: string; raw: string; error?: string} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if(!match) return {properties:{},body:content,raw:''};
  try {
    const properties=parse(match[1]) || {};
    if(typeof properties!=='object' || Array.isArray(properties))throw new Error('Properties must be a YAML mapping');
    return {properties,body:content.slice(match[0].length),raw:match[0]};
  } catch(e) {return {properties:{},body:content.slice(match[0].length),raw:match[0],error:String(e)};}
}
export function setProperties(content: string, properties: Record<string,any>) {
  const parsed=frontmatter(content);
  if(parsed.error)throw new Error('Fix invalid YAML in source mode before editing properties');
  return Object.keys(properties).length ? `---\n${stringify(properties).trim()}\n---\n${parsed.body}` : parsed.body;
}
export function prose(content: string) {
  return frontmatter(content).body.replace(/(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2[^\n]*/g,'')
    .replace(/`[^`]*`/g,'').replace(/%%[\s\S]*?%%/g,'');
}
export interface Link {target: string; label: string; embed: boolean; fragment: string}
export function links(content: string): Link[] {
  const body=prose(content),result:Link[]=[];
  const regex=/(!?)\[\[([^\]]+)\]\]|(!?)\[[^\]]*\]\(([^)]+)\)/g;
  for(const m of body.matchAll(regex)) {
    const raw=(m[2] || m[4]).split('|')[0].replace(/^<|>$/g,'');
    if(/^[a-z]+:\/\//i.test(raw) || /^data:/i.test(raw))continue;
    let decoded=raw;try{decoded=decodeURIComponent(raw);}catch{}
    const [target,...fragment]=decoded.split('#');
    result.push({target,label:m[2]?.split('|')[1] || title(target),embed:!!(m[1] || m[3]),fragment:fragment.join('#')});
  }
  return result;
}
export function tags(content: string): string[] {
  const body=prose(content), properties=frontmatter(content).properties;
  const meta=properties.tags || [];
  const list=Array.isArray(meta)?meta:String(meta).split(/[,\s]+/);
  return [...new Set([...list.map(v=>String(v).replace(/^#/,'')),...Array.from(body.matchAll(/(?:^|[\s(])#([\p{L}\p{N}_/-]*[\p{L}_/-][\p{L}\p{N}_/-]*)/gu),m=>m[1])].filter(Boolean))];
}
export function headings(content: string) {
  let fence=false,offset=0;const result:{level:number;text:string;offset:number}[]=[];
  for(const line of content.split('\n')) {
    if(/^\s*(```|~~~)/.test(line))fence=!fence;
    const match=line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if(match&&!fence)result.push({level:match[1].length,text:match[2],offset});
    offset+=line.length+1;
  }
  return result;
}
export function resolveLink(target: string, from: string, notes: Note[]): Note | undefined {
  if(!target)return notes.find(n=>n.path===from);
  const normalized=target.replace(/^\.\//,'');
  const parent=from.includes('/')?from.slice(0,from.lastIndexOf('/')+1):'';
  const candidates=[normalized,normalized+'.md',parent+normalized,parent+normalized+'.md'];
  for(const candidate of candidates){const match=notes.find(n=>n.path.toLowerCase()===candidate.toLowerCase());if(match)return match;}
  return notes.find(n=>title(n.path).toLowerCase()===title(normalized).toLowerCase()
    || (frontmatter(n.content).properties.aliases || []).includes?.(target));
}
export function section(content:string,fragment:string) {
  if(!fragment)return frontmatter(content).body;
  if(fragment.startsWith('^')) {
    const blocks=content.split(/\n\s*\n/);
    return blocks.find(b=>b.includes(fragment))?.replace(/\s+\^[\w-]+\s*$/,'') || '';
  }
  const hs=headings(content),index=hs.findIndex(h=>h.text.toLowerCase()===fragment.toLowerCase());
  if(index<0)return '';
  const end=hs.slice(index+1).find(h=>h.level<=hs[index].level)?.offset ?? content.length;
  return content.slice(hs[index].offset,end);
}
export function rewriteLinks(content:string,from:string,to:string,source:string,notes:Note[]) {
  return content.replace(/(!?)\[\[([^\]]+)\]\]/g,(whole,bang,inner)=>{
    const [destination,...alias]=inner.split('|'),[target,...fragment]=destination.split('#');
    const resolved=resolveLink(target,source,notes);
    if(resolved?.path!==from)return whole;
    const next=target.includes('/')?to.replace(/\.md$/i,''):title(to);
    return `${bang}[[${next}${fragment.length?'#'+fragment.join('#'):''}${alias.length?'|'+alias.join('|'):''}]]`;
  }).replace(/(!?)\[([^\]]*)\]\(([^)]+)\)/g,(whole,bang,label,href)=>{
    const [target,...fragment]=href.split('#');
    let decoded=target;try{decoded=decodeURIComponent(target);}catch{}
    if(resolveLink(decoded,source,notes)?.path!==from)return whole;
    return `${bang}[${label}](${encodeURI(to)}${fragment.length?'#'+fragment.join('#'):''})`;
  });
}
type Expr = {type:'term';value:string} | {type:'and'|'or';left:Expr;right:Expr} | {type:'not';value:Expr};
function tokenize(query:string) {
  const result:string[]=[];let i=0;
  while(i<query.length) {
    if(/\s/.test(query[i])){i++;continue;}
    if('()-'.includes(query[i])){result.push(query[i++]);continue;}
    let token='',quote=false,regex=false,bracket=false,escape=false;
    while(i<query.length) {
      const c=query[i];
      if(!quote&&!regex&&!bracket&&(/[\s()]/.test(c)))break;
      token+=c;i++;
      if(escape){escape=false;continue;}
      if(c==='\\'){escape=true;continue;}
      if(c==='"'&&!regex)quote=!quote;
      if(c==='/'&&!quote&&!bracket&&(regex || token.length===1 || token.endsWith(':/')))regex=!regex;
      if(c==='['&&!quote&&!regex)bracket=true;
      if(c===']'&&!quote&&!regex)bracket=false;
      if(c===':'&&!quote&&!regex&&!bracket&&query[i]==='(')break;
    }
    if(token)result.push(token);else i++;
  }
  return result;
}
function parseSearch(query:string):Expr|null {
  const tokens=tokenize(query);let i=0;
  const factor=():Expr=>{
    if(tokens[i]==='-'){i++;return {type:'not',value:factor()};}
    if(tokens[i]==='('){i++;const node=or();if(tokens[i]===')')i++;return node;}
    const value=tokens[i++] || '';
    if(value.endsWith(':')&&tokens[i]==='(') {
      i++;let depth=1,nested='';
      while(i<tokens.length&&depth){const token=tokens[i++];if(token==='(')depth++;if(token===')')depth--;if(depth)nested+=' '+token;}
      return {type:'term',value:value+'('+nested.trim()+')'};
    }
    return {type:'term',value};
  };
  const and=():Expr=>{let node=factor();while(i<tokens.length&&tokens[i]!==')'&&tokens[i]!=='OR'){if(tokens[i]==='AND')i++;node={type:'and',left:node,right:factor()};}return node;};
  const or=():Expr=>{let node=and();while(tokens[i]==='OR'){i++;node={type:'or',left:node,right:and()};}return node;};
  return tokens.length?or():null;
}
function matches(text:string,term:string,sensitive=false):boolean {
  if(term.startsWith('(')&&term.endsWith(')'))return evaluate(parseSearch(term.slice(1,-1)),{path:'',content:text},sensitive);
  if(term.startsWith('/')&&term.lastIndexOf('/')>0) {
    try {const end=term.lastIndexOf('/');return new RegExp(term.slice(1,end),term.slice(end+1) || (sensitive?'':'i')).test(text);}catch{return false;}
  }
  const raw=term.replace(/^"|"$/g,'').replace(/\\"/g,'"');
  return sensitive?text.includes(raw):text.toLowerCase().includes(raw.toLowerCase());
}
function termMatch(note:Note,term:string,sensitive:boolean) {
  const body=note.content;
  if(term.startsWith('[')&&term.endsWith(']')) {
    const [key,...value]=term.slice(1,-1).split(':');const p=frontmatter(body).properties;
    if(!(key in p))return false;
    if(!value.length)return true;
    const raw=value.join(':').trim();
    if(raw==='null')return p[key]===null;
    const comparison=raw.match(/^([<>]=?)(-?\d+(?:\.\d+)?)$/);
    if(comparison) {const v=Number(p[key]),n=Number(comparison[2]);return comparison[1]==='>'?v>n:comparison[1]==='<'?v<n:comparison[1]==='>='?v>=n:v<=n;}
    return matches(String(p[key]),raw,sensitive);
  }
  const operator=term.match(/^([\w-]+):(.*)$/s);
  if(!operator)return matches(body,term,sensitive);
  const [,kind,arg]=operator;
  if(kind==='file')return matches(note.path.split('/').pop()!,arg,sensitive);
  if(kind==='path')return matches(note.path,arg,sensitive);
  if(kind==='tag')return tags(body).some(tag=>tag===arg.replace(/^#/,'')||tag.startsWith(arg.replace(/^#/,'')+'/'));
  if(kind==='content')return matches(body,arg,sensitive);
  if(kind==='match-case')return matches(body,arg,true);
  if(kind==='ignore-case')return matches(body,arg,false);
  if(kind==='line')return body.split('\n').some(line=>matches(line,arg,sensitive));
  if(kind==='block')return body.split(/\n\s*\n/).some(block=>matches(block,arg,sensitive));
  if(kind==='section')return body.split(/(?:^|\n)#{1,6} /).some(s=>matches(s,arg,sensitive));
  if(kind.startsWith('task'))return body.split('\n').filter(line=>kind==='task-todo'?/^\s*[-*+] \[ \]/.test(line):kind==='task-done'?/^\s*[-*+] \[[^\s\]]\]/.test(line):/^\s*[-*+] \[.\]/.test(line)).some(line=>matches(line,arg,sensitive));
  return matches(body,term,sensitive);
}
function evaluate(expr:Expr|null,note:Note,sensitive:boolean):boolean {
  if(!expr)return true;
  if(expr.type==='term')return termMatch(note,expr.value,sensitive);
  if(expr.type==='not')return !evaluate(expr.value,note,sensitive);
  if(expr.type==='and')return evaluate(expr.left,note,sensitive)&&evaluate(expr.right,note,sensitive);
  return evaluate(expr.left,note,sensitive)||evaluate(expr.right,note,sensitive);
}
export function search(notes:Note[],query:string,sensitive=false) {const expr=parseSearch(query);return notes.filter(n=>evaluate(expr,n,sensitive));}
export function fuzzy(needle:string,haystack:string) {
  let i=0,score=0,last=-2;
  for(let j=0;j<haystack.length&&i<needle.length;j++)if(haystack[j].toLowerCase()===needle[i].toLowerCase()){score+=last===j-1?5:1;last=j;i++;}
  return i===needle.length?score:-1;
}
export function applyTemplate(template:string,name:string,date=new Date()) {
  const pad=(n:number)=>String(n).padStart(2,'0');
  const dateStr=`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  return template.replace(/\{\{title\}\}/g,name).replace(/\{\{date(?::([^}]+))?\}\}/g,(_,format)=>format?format.replace(/YYYY/g,String(date.getFullYear())).replace(/MM/g,pad(date.getMonth()+1)).replace(/DD/g,pad(date.getDate())):dateStr)
    .replace(/\{\{time\}\}/g,`${pad(date.getHours())}:${pad(date.getMinutes())}`);
}
