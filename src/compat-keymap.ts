/** Original implementation of the documented hierarchical keyboard scope contract. */
type Modifier='Mod'|'Ctrl'|'Meta'|'Alt'|'Shift';
type Handler={modifiers:Modifier[]|null;key:string|null;func:(event:KeyboardEvent,context:{vkey:string;modifiers:string})=>unknown};
export class Scope {
  private handlers:Handler[]=[];
  constructor(private parent?:Scope){}
  register(modifiers:Modifier[]|null,key:string|null,func:Handler['func']):Handler{
    const handler={modifiers,key,func};this.handlers.push(handler);return handler;
  }
  unregister(handler:Handler){this.handlers=this.handlers.filter(item=>item!==handler);}
  /** Host-only dispatch; returns true when a callback consumed the event. */
  dispatch(event:KeyboardEvent):boolean{
    const mac=typeof navigator!=='undefined'&&/Mac/i.test(navigator.platform);
    const actual=new Set<string>();
    if(event.ctrlKey)actual.add('Ctrl');if(event.metaKey)actual.add('Meta');
    if(event.altKey)actual.add('Alt');if(event.shiftKey)actual.add('Shift');
    for(const handler of [...this.handlers].reverse()){
      const expected=handler.modifiers&&[...new Set(handler.modifiers.map(value=>value==='Mod'?(mac?'Meta':'Ctrl'):value))];
      if(expected&&(expected.length!==actual.size||expected.some(value=>!actual.has(value))))continue;
      if(handler.key!==null&&handler.key.toLowerCase()!==event.key.toLowerCase())continue;
      if(handler.func(event,{vkey:event.key,modifiers:[...actual].join('+')})===false){event.preventDefault();return true;}
      if(event.defaultPrevented)return true;
    }
    return this.parent?.dispatch(event)??false;
  }
}
