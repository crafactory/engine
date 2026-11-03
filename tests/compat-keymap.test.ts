import {it,expect,vi} from 'vitest';
import {Keymap,Scope} from '../src/compat-keymap';
const key=(key:string,extra:Partial<KeyboardEvent>={})=>({key,ctrlKey:false,metaKey:false,altKey:false,shiftKey:false,defaultPrevented:false,preventDefault(this:{defaultPrevented:boolean}){this.defaultPrevented=true;},...extra}) as KeyboardEvent;
it('dispatches the active pushed scope and restores its predecessor on pop',()=>{
  const root=new Scope(),first=new Scope(),second=new Scope(),calls:string[]=[],manager=new Keymap(root);
  expect(manager.getRootScope()).toBe(root);
  for(const [scope,name]of [[root,'root'],[first,'first'],[second,'second']] as const)scope.register([],'k',()=>{calls.push(name);return false;});
  manager.pushScope(first);manager.pushScope(second);manager.dispatch(key('k'));manager.popScope(second);manager.dispatch(key('k'));manager.popScope(first);manager.dispatch(key('k'));expect(calls).toEqual(['second','first','root']);
});
it('translates real key modifiers and middle clicks to the documented pane types',()=>{
  expect(Keymap.isModEvent()).toBe(false);expect(Keymap.isModEvent(key('x'))).toBe(false);
  expect(Keymap.isModEvent(key('x',{ctrlKey:true}))).toBe('tab');
  expect(Keymap.isModEvent(key('x',{ctrlKey:true,altKey:true}))).toBe('split');
  expect(Keymap.isModEvent(key('x',{ctrlKey:true,altKey:true,shiftKey:true}))).toBe('window');
  expect(Keymap.isModEvent({...key('x'),button:1})).toBe('tab');expect(Keymap.isModifier(key('x',{shiftKey:true}),'Shift')).toBe(true);
});
it('returns a public handler with its actual scope and string modifiers',()=>{
  const scope=new Scope(),handler=scope.register(['Ctrl','Shift'],'K',()=>false);
  expect(handler.scope).toBe(scope);expect(handler.scope.keys).toContain(handler);
  expect(typeof handler.modifiers).toBe('string');
  expect(scope.dispatch(key('k',{ctrlKey:true,shiftKey:true}))).toBe(true);
  scope.unregister(handler);expect(scope.keys).not.toContain(handler);
});
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
it('deduplicates platform-expanded Mod aliases',()=>{
  const scope=new Scope(),callback=vi.fn(()=>false);
  const mac=typeof navigator!=='undefined'&&/Mac/i.test(navigator.platform);
  scope.register(['Mod',mac?'Meta':'Ctrl'],'k',callback);
  expect(scope.dispatch(key('k',mac?{metaKey:true}:{ctrlKey:true}))).toBe(true);expect(callback).toHaveBeenCalledOnce();
});
