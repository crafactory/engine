export interface CachedExport {path:string;mtime:number;bytes:number}
export async function shareWithCancellation(share:()=>Promise<unknown>):Promise<void>{
  try{await share();}
  catch(error){
    // Exact cancellation observed from Android Share. Never hide other failures,
    // or apply this exception to cache writes and permission/path checks.
    if(!error||typeof error!=='object'||!('message'in error)||error.message!=='Share canceled')throw error;
  }
}
/** Retain recipient access for 24h, then prune; reject new exports at a bounded budget. */
export async function retainExportCache(entries:CachedExport[],incoming:number,remove:(path:string)=>Promise<void>,now=Date.now()){
  const retained:CachedExport[]=[];
  for(const entry of entries){
    if(now-entry.mtime>24*60*60*1000)await remove(entry.path);
    else retained.push(entry);
  }
  if(retained.length>=12||retained.reduce((sum,entry)=>sum+entry.bytes,0)+incoming>256*1024*1024){
    throw new Error('Export cache is full. Existing shares are retained for 24 hours; try later or clear the Android app cache (not app data).');
  }
}
