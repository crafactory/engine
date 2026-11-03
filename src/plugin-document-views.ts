/** Host-owned file overrides; not an Obsidian compatibility API. */
export interface PluginDocumentView {viewType:string;pluginId:string;leafId:string}
export interface PluginFileViewChange {seal():void;commit():Promise<void>;rollback():void}

/** Finish every fallible save before closing any owner's views. */
export async function retirePluginFileViews(controllers:Iterable<{prepareFileViews?(path:string):Promise<PluginFileViewChange>}>,path:string,restore:()=>void){
  const prepared:PluginFileViewChange[]=[];let retiring=false;
  try{
    for(const controller of controllers)if(controller.prepareFileViews)prepared.push(await controller.prepareFileViews(path));
    for(const change of prepared)change.seal();
    retiring=true;for(const change of prepared)await change.commit();
  }catch(error){for(const change of prepared.reverse())change.rollback();if(retiring)restore();throw error;}
}

export function recordPluginDocumentView(views:Map<string,PluginDocumentView>,pluginId:string,viewType:string|null,path:string,leafId:string){
  if(viewType){
    for(const [known,view]of views)if(view.pluginId===pluginId&&view.leafId===leafId&&known!==path)views.delete(known);
    views.set(path,{viewType,pluginId,leafId});
  }else if(views.get(path)?.pluginId===pluginId&&views.get(path)?.leafId===leafId)views.delete(path);
}
