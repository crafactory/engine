import {it,expect,vi} from 'vitest';
import {Scope} from '../src/compat-keymap';
const key=(key:string,extra:Partial<KeyboardEvent>={})=>({key,ctrlKey:false,metaKey:false,altKey:false,shiftKey:false,defaultPrevented:false,preventDefault(this:{defaultPrevented:boolean}){this.defaultPrevented=true;},...extra}) as KeyboardEvent;
it('matches exact modifiers, consumes false, and unregisters handlers',()=>{
  const scope=new Scope(),callback=vi.fn(()=>false);
  const handler=scope.register(['Ctrl'],'K',callback);
  expect(scope.dispatch(key('k'))).toBe(false);expect(callback).not.toHaveBeenCalled();
  expect(scope.dispatch(key('k',{ctrlKey:true,altKey:true}))).toBe(false);
  const event=key('k',{ctrlKey:true});expect(scope.dispatch(event)).toBe(true);expect(event.defaultPrevented).toBe(true);
  scope.unregister(handler);expect(scope.dispatch(key('k',{ctrlKey:true}))).toBe(false);expect(callback).toHaveBeenCalledTimes(1);
});
it('uses reverse registration priority, parent fallback and wildcard handlers',()=>{
  const parent=new Scope(),scope=new Scope(parent),calls:string[]=[];
  parent.register([],'Enter',()=>{calls.push('parent');return false;});
  scope.register([],'Enter',()=>{calls.push('older');});
  const newest=scope.register([],'Enter',()=>{calls.push('newest');return false;});
  scope.dispatch(key('Enter'));expect(calls).toEqual(['newest']);
  scope.unregister(newest);scope.dispatch(key('Enter'));expect(calls).toEqual(['newest','older','parent']);
  scope.register(null,null,()=>false);expect(scope.dispatch(key('x',{metaKey:true}))).toBe(true);
});
