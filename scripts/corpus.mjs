import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const config=JSON.parse(await fs.readFile(new URL('../docs/compatibility/community-corpus.json',import.meta.url),'utf8'));
const root=path.resolve(process.env.ENGINE_PLUGIN_CORPUS||'.compat-corpus');
await fs.mkdir(root,{recursive:true});
for(const plugin of config.plugins){
  const folder=path.join(root,plugin.directory);await fs.mkdir(folder,{recursive:true});
  for(const [file,expected]of [['main.js',plugin.main_sha256],['manifest.json',plugin.manifest_sha256]]){
    const full=path.join(folder,file);
    try{await fs.access(full);}catch{
      execFileSync('curl',['-fLsS',`https://github.com/${plugin.repo}/releases/download/${plugin.tag}/${file}`,'-o',full],{stdio:'inherit'});
    }
    assert.equal(crypto.createHash('sha256').update(await fs.readFile(full)).digest('hex'),expected,'Corpus fingerprint changed: '+plugin.name+' '+file);
  }
  const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));
  assert.equal(manifest.version,plugin.manifest_version);
  console.log(plugin.name+' tag '+plugin.tag+' / manifest '+manifest.version+' verified');
}
console.log('Test inputs are not packaged. Execute only against disposable vaults.');
