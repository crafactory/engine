export interface InlineLink {from:number;to:number;target:string;label:string;external:boolean}
/** Parse bounded inline links, excluding code, images, escapes and unsafe URI schemes. */
export function inlineLinks(text:string):InlineLink[] {
  const result:InlineLink[]=[];
  const pattern=/(`+)[\s\S]*?\1|!?\[\[([^\]\n]+)\]\]|!?\[([^\]\n]+)\]\((<[^>\n]+>|[^)\s]+)\)/g;
  for(const match of text.matchAll(pattern)){
    const from=match.index!;
    const escapes=text.slice(0,from).match(/\\+$/)?.[0].length||0;
    if(match[1]||match[0].startsWith('!')||escapes%2===1)continue;
    const [wikiTarget,...alias]=(match[2]||'').split('|');
    let target=match[2]?wikiTarget:match[4].replace(/^<|>$/g,'');
    try{target=decodeURIComponent(target);}catch{}
    if(!target||/[\u0000-\u001f\u007f]/.test(target)||target.trim()!==target)continue;
    const scheme=target.match(/^([a-z][a-z\d+.-]*):/i)?.[1].toLowerCase();
    if(scheme&&!['http','https','mailto'].includes(scheme))continue;
    if(target.startsWith('//'))continue;
    result.push({from,to:from+match[0].length,target,label:match[2]?(alias.join('|')||wikiTarget):match[3],external:!!scheme});
  }
  return result;
}
