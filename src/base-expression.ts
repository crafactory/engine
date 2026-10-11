import {frontmatter,tags,links,title,resolveLink} from './knowledge';
import type {Note,Entry} from './types';
type Value=any;
type Token={type:'number'|'string'|'name'|'op';value:string};
/** Small, non-eval interpreter. No property access to prototypes or global objects. */
export function expression(source:string,note:Note,entry:Entry|undefined,notes:Note[],formulas:Record<string,string>={},chain:string[]=[]):Value {
  const tokens:Token[]=[];let cursor=0;
  const re=/\s*(?:(\d+(?:\.\d+)?)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([a-zA-Z_][\w.]*)|(==|!=|>=|<=|&&|\|\||[()+\-*/%,!<>]))/y;
  while(cursor<source.length) {
    re.lastIndex=cursor;const match=re.exec(source);
    if(!match){if(!source.slice(cursor).trim())break;throw new Error('Unsupported expression near '+source.slice(cursor));}
    cursor=re.lastIndex;tokens.push({type:match[1]?'number':match[2]?'string':match[3]?'name':'op',value:match[1]||match[2]||match[3]||match[4]});
  }
  let i=0;const properties=frontmatter(note.content).properties;
  const file:Record<string,Value>={name:title(note.path),path:note.path,ext:note.path.split('.').pop(),folder:note.path.includes('/')?note.path.slice(0,note.path.lastIndexOf('/')):'',size:entry?.size||note.content.length,mtime:entry?.mtime,ctime:entry?.ctime,tags:tags(note.content),links:links(note.content).map(l=>l.target)};
  const functions:Record<string,(...args:Value[])=>Value>={
    'file.hasTag':(tag)=>tags(note.content).includes(String(tag).replace(/^#/,'')),
    'file.inFolder':(folder)=>note.path.startsWith(String(folder).replace(/\/$/,'')+'/'),
    'file.hasLink':(target)=>links(note.content).some(l=>l.target===target||resolveLink(l.target,note.path,notes)?.path===target),
    'file.hasProperty':(key)=>key in properties,
    'if':(cond,yes,no)=>cond?yes:no,'min':Math.min,'max':Math.max,'round':Math.round,
    'contains':(a,b)=>a?.includes?.(b)||false,'length':(value)=>value?.length||0,'number':Number,'string':String,'lower':(value)=>String(value).toLowerCase()
  };
  const lookup=(name:string):Value=>{
    if(name==='true')return true;if(name==='false')return false;if(name==='null')return null;
    if(name.startsWith('file.')){const key=name.slice(5);if(!(key in file))throw new Error('Unsupported file property: '+key);return file[key];}
    if(name.startsWith('formula.')){
      const key=name.slice(8);if(chain.includes(key))throw new Error('Circular formula: '+key);
      if(!(key in formulas))throw new Error('Unknown formula: '+key);
      return expression(formulas[key],note,entry,notes,formulas,[...chain,key]);
    }
    const key=name.replace(/^note\./,'');
    if(['__proto__','constructor','prototype'].includes(key))throw new Error('Forbidden property');
    return properties[key]??null;
  };
  const atom=():Value=>{
    const token=tokens[i++];if(!token)throw new Error('Incomplete expression');
    if(token.value==='!')return !atom();if(token.value==='-')return -Number(atom());
    if(token.value==='('){const value=parse(0);if(tokens[i++]?.value!==')')throw new Error('Missing closing parenthesis');return value;}
    if(token.type==='number')return Number(token.value);
    if(token.type==='string')return token.value.slice(1,-1).replace(/\\(["'\\])/g,'$1');
    if(token.type==='name'){
      if(tokens[i]?.value==='('){
        i++;const args:Value[]=[];
        while(tokens[i]?.value!==')'){args.push(parse(0));if(tokens[i]?.value!==',')break;i++;}
        if(tokens[i++]?.value!==')')throw new Error('Missing closing parenthesis');
        if(!functions[token.value])throw new Error('Unsupported function: '+token.value);
        return functions[token.value](...args);
      }
      return lookup(token.value);
    }
    throw new Error('Unexpected token: '+token.value);
  };
  const precedence:Record<string,number>={'||':1,'&&':2,'==':3,'!=':3,'>':4,'<':4,'>=':4,'<=':4,'+':5,'-':5,'*':6,'/':6,'%':6};
  const apply=(operator:string,a:Value,b:Value):Value=>{
    switch(operator){case'||':return a||b;case'&&':return a&&b;case'==':return a===b;case'!=':return a!==b;case'>':return a>b;case'<':return a<b;case'>=':return a>=b;case'<=':return a<=b;case'+':return typeof a==='string'||typeof b==='string'?String(a)+String(b):Number(a)+Number(b);case'-':return Number(a)-Number(b);case'*':return Number(a)*Number(b);case'/':return Number(a)/Number(b);case'%':return Number(a)%Number(b);}
  };
  const parse=(min:number):Value=>{let value=atom();while(i<tokens.length&&(precedence[tokens[i].value]||0)>min){const operator=tokens[i++].value;value=apply(operator,value,parse(precedence[operator]));}return value;};
  const result=parse(0);if(i<tokens.length)throw new Error('Unexpected token: '+tokens[i].value);return result;
}
export function baseFilter(filter:any,note:Note,entry:Entry|undefined,notes:Note[],formulas:Record<string,string>):boolean {
  if(!filter)return true;
  if(typeof filter==='string')return !!expression(filter,note,entry,notes,formulas);
  if(Array.isArray(filter.and))return filter.and.every((f:any)=>baseFilter(f,note,entry,notes,formulas));
  if(Array.isArray(filter.or))return filter.or.some((f:any)=>baseFilter(f,note,entry,notes,formulas));
  if(Array.isArray(filter.not))return !filter.not.every((f:any)=>baseFilter(f,note,entry,notes,formulas));
  throw new Error('Unsupported filter');
}
