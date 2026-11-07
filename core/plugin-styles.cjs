// Original bounded stylesheet reader. Only this short-lived process changes cwd.
const fs=require('node:fs/promises');
const {constants}=require('node:fs');
const path=require('node:path');
const limit=4*1024*1024;
/** Compare lossless file identities; filesystems without an inode identity fail closed. */
const same=(a,b)=>String(a.ino)!=='0'&&String(a.dev)===String(b.dev)&&String(a.ino)===String(b.ino);
/** Walk from the inherited root cwd, validating each entered directory's identity. */
async function readPluginStyles(root,identity,id){
  if(!/^[\w-]+$/.test(id))throw new Error('Invalid plugin id');
  const rootStat=await fs.stat('.',{bigint:true}),relative=path.relative(root,process.cwd());
  if(relative||!rootStat.isDirectory()||!same(rootStat,identity))throw new Error('Plugin root changed');
  for(const name of ['.crafactory','plugins',id]){
    const expected=await fs.lstat(name,{bigint:true});
    if(!expected.isDirectory()||expected.isSymbolicLink())throw new Error('Symlinked plugin directory');
    process.chdir(name);
    const entered=await fs.stat('.',{bigint:true}),location=path.relative(root,process.cwd());
    if(!same(expected,entered)||location==='..'||location.startsWith('..'+path.sep)||path.isAbsolute(location))throw new Error('Plugin directory changed');
  }
  const expected=await fs.lstat('styles.css',{bigint:true});
  if(!expected.isFile()||expected.isSymbolicLink())throw new Error('Stylesheet is not a regular file');
  const handle=await fs.open('styles.css',constants.O_RDONLY|(constants.O_NOFOLLOW??0)|(constants.O_NONBLOCK??0));
  try{
    const actual=await handle.stat({bigint:true});
    if(!actual.isFile()||!same(expected,actual))throw new Error('Stylesheet changed');
    if(actual.size>BigInt(limit))throw new Error('Plugin stylesheet too large');
    const bytes=Buffer.alloc(limit+1);let length=0;
    while(length<bytes.length){const read=await handle.read(bytes,length,bytes.length-length,null);if(!read.bytesRead)break;length+=read.bytesRead;}
    if(length>limit)throw new Error('Plugin stylesheet too large');
    return bytes.subarray(0,length);
  }finally{await handle.close();}
}
module.exports={readPluginStyles};
if(require.main===module){
  readPluginStyles(process.argv[2],JSON.parse(process.argv[3]),process.argv[4]).then(bytes=>process.stdout.write(bytes),error=>{process.stderr.write(String(error.code||error.message));process.exitCode=error.code==='ENOENT'?2:1;});
}
