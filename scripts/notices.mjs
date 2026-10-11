import checker from 'license-checker';
import fs from 'node:fs/promises';
import path from 'node:path';
const packages=await new Promise((resolve,reject)=>checker.init({start:process.cwd(),production:true},(error,result)=>error?reject(error):resolve(result)));
let output=`# Third-party notices\n\nCrafactory Engine's original code is MIT licensed. Dependencies retain their own licenses. This document is mechanically generated from installed production packages by \`node scripts/notices.mjs\`; JSZip is used under its MIT option and DOMPurify under its Apache-2.0 option. Font files use their included OFL licenses. No Obsidian source or branded asset is included.\n\n`;
for(const [name,info]of Object.entries(packages)){
  if(name.startsWith('crafactory-engine@'))continue;
  output+=`## ${name}\n\nLicense: ${info.licenses}\n\n`;
  if(info.repository)output+=`Project: ${info.repository}\n\n`;
  if(info.publisher)output+=`Publisher: ${info.publisher}\n\n`;
  if(info.licenseFile){
    try{output+='```text\n'+(await fs.readFile(info.licenseFile,'utf8')).replaceAll('```','~~~')+'\n```\n\n';}catch{output+='License text is included in the distributed dependency package.\n\n';}
  }
  for(const candidate of ['NOTICE','NOTICE.txt','NOTICE.md']){
    try{const content=await fs.readFile(path.join(info.path,candidate),'utf8');output+='### '+candidate+'\n\n```text\n'+content.replaceAll('```','~~~')+'\n```\n\n';}catch{}
  }
}
await fs.writeFile('THIRD_PARTY_NOTICES.md',output.trimEnd()+'\n');
console.log(`Generated notices for ${Object.keys(packages).length-1} production dependencies.`);
