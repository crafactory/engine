/** Locate a task marker after Markdown list/blockquote prefixes, not inside arbitrary prose. */
export function taskMarker(line:string):number|null {
  const match=line.match(/^(\s*(?:>\s*)*(?:[-*+]|\d+[.)])\s+)\[([ xX])\](?=\s|$)/);
  return match?match[1].length:null;
}
/** Change a verified source marker only; return null when the captured location is no longer valid. */
export function setTaskChecked(content:string,offset:number,checked:boolean):string|null {
  if(!Number.isInteger(offset)||offset<0||!/^\[[ xX]\]$/.test(content.slice(offset,offset+3)))return null;
  return content.slice(0,offset+1)+(checked?'x':' ')+content.slice(offset+2);
}
