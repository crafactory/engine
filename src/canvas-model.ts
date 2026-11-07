/** Validate fields used by Engine's renderer against the public JSON Canvas shape, preserving extensions. */
export function parseCanvas(content:string):{data:{nodes:any[];edges:any[];[key:string]:any};error:string} {
  try{
    const value=JSON.parse(content);
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Canvas must be an object');
    const nodes=value.nodes===undefined?[]:value.nodes,edges=value.edges===undefined?[]:value.edges;
    if(!Array.isArray(nodes)||!Array.isArray(edges))throw new Error('Canvas nodes and edges must be arrays');
    const ids=new Set<string>(),edgeIds=new Set<string>();
    for(const node of nodes){
      if(!node||typeof node!=='object'||typeof node.id!=='string'||ids.has(node.id))throw new Error('Invalid or duplicate Canvas node id');
      ids.add(node.id);
      if(!['text','file','link','group'].includes(node.type))throw new Error('Unsupported Canvas node type');
      if(![node.x,node.y,node.width,node.height].every(Number.isFinite)||node.width<=0||node.height<=0)throw new Error('Invalid Canvas node geometry');
      const required=node.type==='text'?'text':node.type==='file'?'file':node.type==='link'?'url':null;
      if(required&&typeof node[required]!=='string')throw new Error('Canvas '+node.type+' needs a string '+required);
      for(const field of ['text','file','url','label','color','subpath'])if(node[field]!==undefined&&typeof node[field]!=='string')throw new Error('Canvas node '+field+' must be a string');
    }
    for(const edge of edges){
      if(!edge||typeof edge!=='object'||typeof edge.id!=='string'||edgeIds.has(edge.id)||typeof edge.fromNode!=='string'||typeof edge.toNode!=='string')throw new Error('Invalid or duplicate Canvas edge');
      edgeIds.add(edge.id);
      for(const field of ['label','color','fromSide','toSide','fromEnd','toEnd'])if(edge[field]!==undefined&&typeof edge[field]!=='string')throw new Error('Canvas edge '+field+' must be a string');
    }
    return {data:{...value,nodes,edges},error:''};
  }catch(error){return {data:{nodes:[],edges:[]},error:String(error)};}
}
