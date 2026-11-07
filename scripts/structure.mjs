import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

/** Owned source files only: generated Android assets and pinned plugin inputs are excluded. */
export const ownedSource = file =>
  (/^(?:src|core|electron|scripts|bin|tests|e2e|e2e-desktop)\//.test(file) &&
  /\.(?:[cm]?js|tsx?|css|java)$/.test(file)) ||
  /^[^/]+\.config\.(?:[cm]?js|ts)$/.test(file) ||
  /^android\/app\/src\/main\/java\/.*\.java$/.test(file);

export function structureIssues(file, text, policy) {
  const issues=[];
  const lines=text.replace(/\r\n/g,'\n').replace(/\n$/,'').split('\n').length;
  const limit=policy.legacyLimits[file]??policy.maxLines;
  if(lines>limit)issues.push(`${file}: ${lines} lines exceeds ${limit}; extract a focused module`);
  if(file.startsWith('src/')){
    const parts=file.split('/');
    if(parts.length===2&&!policy.legacyRootFiles.includes(file))
      issues.push(`${file}: put new source modules in an existing domain directory`);
    if(parts.length>2&&!policy.sourceDirectories.includes(parts[1]))
      issues.push(`${file}: unapproved source directory ${parts[1]}`);
    if(parts.length>policy.maxSourcePathSegments)
      issues.push(`${file}: source directory nesting exceeds the policy`);
  }
  return issues;
}

async function main(){
  const policy=JSON.parse(await fs.readFile('.source-policy.json','utf8'));
  const files=[...new Set(execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{encoding:'utf8'}).split('\0'))].filter(ownedSource);
  const issues=[];
  for(const file of files){
    let text;
    try{text=await fs.readFile(file,'utf8');}
    catch(error){if(error.code==='ENOENT')continue;throw error;}
    issues.push(...structureIssues(file,text,policy));
  }
  if(issues.length){console.error(issues.join('\n'));process.exitCode=1;}
  else console.log(`Source structure and line budgets passed (${files.length} owned files).`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
