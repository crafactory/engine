export const canvasColors:Record<string,string>={'1':'#794a4a','2':'#896347','3':'#8e7e4a','4':'#466b58','5':'#456678','6':'#685b7c'};
/** Accept only the six Canvas palette tokens or hex colors, never CSS image/expression values. */
export function canvasBackground(color?:string):string|undefined {
  if(typeof color!=='string'||!color)return undefined;
  return /^[1-6]$/.test(color)?canvasColors[color]:(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)?color:undefined);
}
/** Pick the higher-contrast black/white foreground for a supported Canvas hex background. */
export function canvasForeground(background:string):string|undefined {
  const match=background.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if(!match)return undefined;
  const hex=match[1].length===3?[...match[1]].map(c=>c+c).join(''):match[1];
  const channels=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
  const luminance=0.2126*channels[0]+0.7152*channels[1]+0.0722*channels[2];
  return (1.05/(luminance+0.05))>=((luminance+0.05)/0.05)?'#ffffff':'#000000';
}
