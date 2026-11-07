/** Original implementation of the documented hierarchical keyboard scope contract. */
type Modifier='Mod'|'Ctrl'|'Meta'|'Alt'|'Shift';
type Handler={scope:Scope;modifiers:string|null;key:string|null;func:(event:KeyboardEvent,context:{vkey:string;modifiers:string})=>unknown};
export class Scope {
  private handlers:Handler[]=[];
  /** Observed desktop-private alias. Mutating the returned array changes registrations. */
  get keys(){return this.handlers;}
  constructor(private parent?:Scope){}
  register(modifiers:Modifier[]|null,key:string|null,func:Handler['func']):Handler{
    const handler={scope:this,modifiers:modifiers===null?null:modifiers.join('+'),key,func};this.handlers.push(handler);return handler;
  }
  unregister(handler:Handler){const index=this.handlers.indexOf(handler);if(index>=0)this.handlers.splice(index,1);}
  /** Host-only dispatch; returns true when a callback consumed the event. */
  dispatch(event:KeyboardEvent):boolean{
    const mac=typeof navigator!=='undefined'&&/Mac/i.test(navigator.platform);
    const actual=new Set<string>();
    if(event.ctrlKey)actual.add('Ctrl');if(event.metaKey)actual.add('Meta');
    if(event.altKey)actual.add('Alt');if(event.shiftKey)actual.add('Shift');
    for(const handler of [...this.handlers].reverse()){
      const expected=handler.modifiers===null?null:[...new Set(handler.modifiers.split('+').filter(Boolean).map(value=>value==='Mod'?(mac?'Meta':'Ctrl'):value))];
      if(expected&&(expected.length!==actual.size||expected.some(value=>!actual.has(value))))continue;
      if(handler.key!==null&&handler.key.toLowerCase()!==event.key.toLowerCase())continue;
      if(handler.func(event,{vkey:event.key,modifiers:[...actual].join('+')})===false){event.preventDefault();return true;}
      if(event.defaultPrevented)return true;
    }
    return this.parent?.dispatch(event)??false;
  }
}
/** Original public Keymap helpers and a host-owned active-scope stack. */
export class Keymap {
  constructor(private root=new Scope(),private scopes:Scope[]=[]){}
  getRootScope(){return this.root;}
  pushScope(scope:Scope){if(!(scope instanceof Scope))throw new Error('Expected Scope');this.scopes.push(scope);}
  popScope(scope:Scope){const index=this.scopes.lastIndexOf(scope);if(index>=0)this.scopes.splice(index,1);}
  dispatch(event:KeyboardEvent){return (this.scopes.at(-1)??this.root).dispatch(event);}
  static isModifier(event:Pick<KeyboardEvent,'ctrlKey'|'metaKey'|'altKey'|'shiftKey'>,modifier:Modifier){const mac=typeof navigator!=='undefined'&&/Mac/i.test(navigator.platform);return modifier==='Mod'?(mac?event.metaKey:event.ctrlKey):modifier==='Ctrl'?event.ctrlKey:modifier==='Meta'?event.metaKey:modifier==='Alt'?event.altKey:modifier==='Shift'?event.shiftKey:false;}
  static isModEvent(event?:(Pick<KeyboardEvent,'ctrlKey'|'metaKey'|'altKey'|'shiftKey'>&{button?:number})|null):'tab'|'split'|'window'|false{
    if(!event)return false;const mod=this.isModifier(event,'Mod');if(mod&&event.altKey)return event.shiftKey?'window':'split';return mod||event.button===1?'tab':false;
  }
}
