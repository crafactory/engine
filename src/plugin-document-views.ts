/** Host-owned file overrides; not an Obsidian compatibility API. */
export interface PluginDocumentView {viewType:string;pluginId:string;leafId:string}
export interface PluginFileViewChange {seal():void;commit():Promise<void>;rollback():void;restore?():Promise<void>}

/** Attempt every recovery independently, retaining the original failure if recovery also fails. */
export async function recoverPluginFileViews(error:unknown,recoveries:Iterable<()=>void|Promise<void>>):Promise<never>{
  const errors:unknown[]=[error];
  for(const recovery of recoveries)try{await recovery();}catch(failure){errors.push(failure);}
  if(errors.length>1)throw new AggregateError(errors,'File operation failed; some plugin views could not be restored',{cause:error});
  throw error;
}

/** Finish every fallible save before closing any owner's views. */
export async function retirePluginFileViews(controllers:Iterable<{prepareFileViews?(path:string):Promise<PluginFileViewChange>}>,path:string,restore:()=>void){
  const prepared:PluginFileViewChange[]=[];let retiring=false;
  /** Roll back every owner before attempting any view recreation. */
  async function restoreOwners(){
    const errors:unknown[]=[];
    for(const change of prepared)try{change.rollback();}catch(error){errors.push(error);}
    for(const change of prepared)try{await change.restore?.();}catch(error){errors.push(error);}
    if(errors.length)throw new AggregateError(errors,'Some plugin file views could not be restored');
  }
  try{
    for(const controller of controllers)if(controller.prepareFileViews)prepared.push(await controller.prepareFileViews(path));
    for(const change of prepared)change.seal();
    retiring=true;for(const change of prepared)await change.commit();
    return restoreOwners;
  }catch(error){
    prepared.reverse();
    if(retiring)return recoverPluginFileViews(error,[restoreOwners,restore]);
    return recoverPluginFileViews(error,prepared.map(change=>()=>change.rollback()));
  }
}

/** Replace only this owner's same-leaf path; ignore stale and foreign close notifications. */
export function recordPluginDocumentView(views:Map<string,PluginDocumentView>,pluginId:string,viewType:string|null,path:string,leafId:string){
  if(viewType){
    for(const [known,view]of views)if(view.pluginId===pluginId&&view.leafId===leafId&&known!==path)views.delete(known);
    views.set(path,{viewType,pluginId,leafId});
  }else if(views.get(path)?.pluginId===pluginId&&views.get(path)?.leafId===leafId)views.delete(path);
}
