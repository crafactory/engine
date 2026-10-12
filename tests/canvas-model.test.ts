import {it,expect} from 'vitest';
import {parseCanvas} from '../src/canvas-model';
const node={id:'a',type:'text',x:0,y:0,width:200,height:120,text:'Safe'};
it('accepts optional empty arrays and retains unknown document/node fields without mutating source',()=>{
  expect(parseCanvas('{}')).toEqual({data:{nodes:[],edges:[]},error:''});
  const input=JSON.stringify({extension:'keep',nodes:[{...node,x:0.5,extra:{keep:true}}]});
  const parsed=parseCanvas(input);expect(parsed.error).toBe('');expect(parsed.data.extension).toBe('keep');expect(parsed.data.nodes[0].extra).toEqual({keep:true});
});
it('rejects malformed edges and non-string rendered text instead of crashing React',()=>{
  expect(parseCanvas('{"nodes":[],"edges":[null]}').error).toBeTruthy();
  expect(parseCanvas(JSON.stringify({nodes:[{...node,text:{invalid:true}}]})).error).toBeTruthy();
});
it('rejects malformed top levels, arrays, geometry and unknown renderer types',()=>{
  for(const value of [null,[],{nodes:{}},{nodes:[{...node,width:0}]},{nodes:[{...node,type:'script'}]}])expect(parseCanvas(JSON.stringify(value)).error).toBeTruthy();
});
it('rejects duplicate node and edge identities',()=>{
  expect(parseCanvas(JSON.stringify({nodes:[node,node]})).error).toBeTruthy();
  const edge={id:'edge',fromNode:'a',toNode:'a'};
  expect(parseCanvas(JSON.stringify({nodes:[node],edges:[edge,edge]})).error).toBeTruthy();
});
