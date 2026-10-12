export const normalizeText=text=>text.replace(/\r\n/g,'\n');
export function parseParityLedger(text,coreSource,apiSource){
  const slug=name=>name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  let section='';const items=[];
  for(const line of normalizeText(text).split('\n')){
    if(line.startsWith('## '))section=line.slice(3).trim();
    if(!line.startsWith('|'))continue;
    const cells=line.slice(1,-1).split('|').map(s=>s.trim());
    if(!['Implemented subset','Not implemented','Excluded'].includes(cells[1]))continue;
    const core=section==='Core plugins';
    items.push({id:(core?'CORE-':'AREA-')+slug(cells[0]),section,title:cells[0],
      status:cells[1]==='Excluded'?'excluded':cells[1]==='Not implemented'?'missing':'partial',
      reference:core?coreSource:cells[0]==='Community plugin API'?apiSource:'https://help.obsidian.md',
      implemented:cells[2],remaining:cells[3]||cells[2],evidence:[]});
  }
  return items;
}
