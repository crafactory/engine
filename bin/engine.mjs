#!/usr/bin/env node
import {Vault} from '../core/vault.mjs';
import fs from 'node:fs/promises';
const args=process.argv.slice(2),flag=args.indexOf('--vault');
const root=flag>=0?args.splice(flag,2)[1]:process.env.CRAFACTORY_VAULT;
const [command,...values]=args;
if(!root || !command || command==='help') {
  console.log(`Crafactory Engine CLI

Usage: node bin/engine.mjs --vault /path/to/vault COMMAND [arguments]

  list                         List visible vault entries as JSON
  read NOTE.md                 Print note content
  write NOTE.md SOURCE_FILE    Write source file content, with conflict detection
  create NOTE.md [TEXT]        Create a new note (never overwrite)
  append NOTE.md TEXT          Append text to a note
  mkdir FOLDER                 Create a folder
  rename OLD NEW               Rename/move a file (no link rewriting in CLI)
  trash PATH                   Move a file or folder to vault-local trash
  snapshots NOTE.md            List recovery snapshots as JSON
  restore SNAPSHOT_ID          Restore a prior version
  find TEXT                    Simple full-text substring search

No sync, telemetry, or proprietary dependencies.
`);
  process.exit(root?0:1);
}
try {
  const vault=await new Vault(root).init();
  const note=values[0];
  switch(command) {
    case'list':console.log(JSON.stringify(await vault.list(),null,2));break;
    case'read':process.stdout.write((await vault.read(note)).content);break;
    case'write':{
      let previous;try{previous=await vault.read(note);}catch(e){if(e.code!=='ENOENT')throw e;}
      const result=await vault.write(note,await fs.readFile(values[1],'utf8'),previous?.version);
      console.log(JSON.stringify({path:result.path,version:result.version}));break;
    }
    case'create':{
      if((await vault.list()).some(e=>e.path===note))throw new Error('File already exists');
      const result=await vault.write(note,values.slice(1).join(' ')||'# '+note.replace(/\.md$/,'')+'\n\n');console.log(result.path);break;
    }
    case'append':{
      const previous=await vault.read(note);await vault.write(note,previous.content+'\n'+values.slice(1).join(' ')+'\n',previous.version);console.log(note);break;
    }
    case'mkdir':await vault.mkdir(note);break;
    case'rename':await vault.rename(note,values[1]);break;
    case'trash':await vault.trash(note);break;
    case'snapshots':console.log(JSON.stringify(await vault.snapshots(note),null,2));break;
    case'restore':console.log((await vault.restore(note)).path);break;
    case'find':{
      const query=values.join(' ').toLowerCase();
      for(const e of (await vault.list()).filter(e=>!e.folder&&e.path.endsWith('.md'))){const n=await vault.read(e.path);if(n.content.toLowerCase().includes(query))console.log(n.path);}
      break;
    }
    default:throw new Error('Unknown command: '+command);
  }
}catch(e){console.error(e.message);process.exitCode=1;}
