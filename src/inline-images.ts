export interface InlineImage {from:number;to:number;src:string;alt:string;external:boolean}
const IMAGE=/\.(?:png|jpe?g|gif|webp|svg|bmp|avif)$/i;
const SAFE=/^(?:https?:|data:|blob:)/i;
/** Parse bounded inline images, excluding escapes, code and non-image wiki embeds. */
export function inlineImages(text:string):InlineImage[] {
  const result:InlineImage[]=[];
  const pattern=/(!)\[([^\]\n]*)\]\((<[^>\n]+>|[^)\s]+)\)|(!)\[\[([^\]\n]+)\]\]/g;
  for(const match of text.matchAll(pattern)){
    const from=match.index!;
    const escapes=text.slice(0,from).match(/\\+$/)?.[0].length||0;
    if(escapes%2===1)continue;
    if(match[1]){
      const src=match[3].replace(/^<|>$/g,'');
      if(!SAFE.test(src)&&!IMAGE.test(src))continue;
      if(/[\u0000-\u001f\u007f]/.test(src))continue;
      result.push({from,to:from+match[0].length,src,alt:match[2]||src.split('/').pop()||'',external:SAFE.test(src)});
    }else{
      const [target]=match[5].split('|');
      if(!IMAGE.test(target)||/[\u0000-\u001f\u007f]/.test(target))continue;
      result.push({from,to:from+match[0].length,src:target,alt:target.split('/').pop()||target,external:false});
    }
  }
  return result;
}
