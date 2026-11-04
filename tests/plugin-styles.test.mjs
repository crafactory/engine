import {it,expect,beforeEach,afterEach} from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile),helper=fileURLToPath(new URL('../core/plugin-styles.cjs',import.meta.url)),limit=4*1024*1024;
let root,outside,dir;
beforeEach(async()=>{root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'engine-style-root-')));outside=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'engine-style-outside-')));dir=path.join(root,'.crafactory/plugins/styled');await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'styles.css'),'inside-only');await fs.writeFile(path.join(outside,'styles.css'),'outside-secret');});
afterEach(async()=>{await fs.rm(root,{recursive:true,force:true});await fs.rm(outside,{recursive:true,force:true});});
// Original test harness changes cwd only in a dedicated child, as production does.
const harness=`
const fs=require('node:fs/promises'),path=require('node:path');
const [root,outside,scenario,helper]=process.argv.slice(1);
(async()=>{
 const identity=await fs.stat('.',{bigint:true}),lstat=fs.lstat,open=fs.open,reads=[];let injected=false;
 fs.lstat=async(name,...options)=>{
  const value=await lstat(name,...options);
  if(scenario==='parent-before-enter'&&name==='plugins'){injected=true;await fs.rename(name,name+'-original');await fs.symlink(outside,name,process.platform==='win32'?'junction':'dir');}
  if(scenario==='parent-after-enter'&&name==='styles.css'){injected=true;const dir=process.cwd();await fs.rename(dir,dir+'-original');await fs.symlink(outside,dir,process.platform==='win32'?'junction':'dir');}
  return value;
 };
 fs.open=async(name,flags)=>{
  if((scenario==='final-symlink'||scenario==='final-follow')&&name==='styles.css'){injected=true;await fs.unlink(name);await fs.symlink(path.join(outside,name),name,'file');}
  const handle=await open(name,scenario==='final-follow'?'r':flags),stat=handle.stat.bind(handle),read=handle.read.bind(handle);
  handle.stat=async(...args)=>{const before=await stat(...args);if(scenario==='growth'){injected=true;await fs.appendFile('styles.css',Buffer.alloc(4*1024*1024+20));}return before;};
  handle.read=async(...args)=>{reads.push(args[2]);return read(...args);};return handle;
 };
 try{const bytes=await require(helper).readPluginStyles(root,identity,'styled');console.log(JSON.stringify({text:bytes.toString(),reads,injected}));}
 catch(error){console.log(JSON.stringify({error:String(error),reads,injected}));}
})().catch(error=>{console.error(error);process.exitCode=1;});`;
async function probe(scenario){const result=await run(process.execPath,['-e',harness,root,outside,scenario,helper],{cwd:root});return JSON.parse(result.stdout);}
it('reads an ordinary stylesheet without changing the host process cwd',async()=>{const cwd=process.cwd(),result=await probe('normal');expect(result.text).toBe('inside-only');expect(process.cwd()).toBe(cwd);});
it('rejects oversized input before any content read',async()=>{await fs.writeFile(path.join(dir,'styles.css'),Buffer.alloc(limit+1));const result=await probe('oversized');expect(result.error).toContain('too large');expect(result.reads).toEqual([]);});
it('bounds content reads if a small file grows after fstat',async()=>{const result=await probe('growth');expect(result.injected).toBe(true);expect(result.error).toContain('too large');expect(result.reads.length).toBeGreaterThan(0);expect(result.reads.every(length=>length<=limit+1)).toBe(true);});
for(const scenario of ['final-symlink','final-follow','parent-before-enter'])it('rejects '+scenario+' without reading outside bytes',async()=>{const result=await probe(scenario);expect(result.injected).toBe(true);expect(result.error).toBeTruthy();expect(result.reads).toEqual([]);expect(result.text).toBeUndefined();});
it('keeps an entered directory anchored, or the OS refuses its rename',async()=>{const result=await probe('parent-after-enter');expect(result.injected).toBe(true);if(process.platform==='win32'&&result.error){expect(result.error).toMatch(/EPERM|EACCES|EBUSY/);expect(result.reads).toEqual([]);}else{expect(result.text).toBe('inside-only');expect(result.text).not.toContain('outside-secret');}});
