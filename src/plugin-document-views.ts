/** Host-owned file overrides; not an Obsidian compatibility API. */
export interface PluginDocumentView {viewType:string;pluginId:string;leafId:string}

export function recordPluginDocumentView(views:Map<string,PluginDocumentView>,pluginId:string,viewType:string|null,path:string,leafId:string){
  if(viewType){
    for(const [known,view]of views)if(view.pluginId===pluginId&&view.leafId===leafId&&known!==path)views.delete(known);
    views.set(path,{viewType,pluginId,leafId});
  }else if(views.get(path)?.pluginId===pluginId&&views.get(path)?.leafId===leafId)views.delete(path);
}
