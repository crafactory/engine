import {describe,it,expect,vi} from 'vitest';
import {Kernel,AssemblyError,EffectScope,EventBus,parseVersion,satisfiesVersion,compareVersions,type Diagnostic,type PluginContext,type PluginManifest} from '../src/kernel';

/** Build a valid manifest with optional overrides. */
const manifest=(id:string,extra:Partial<PluginManifest>={}):PluginManifest=>({id,name:id,version:'1.0.0',...extra});
const codes=(kernel:Kernel)=>kernel.diagnostics.map(diagnostic=>diagnostic.code);

describe('bounded semantic-version matching',()=>{
  it('parses strict versions and rejects loose ones',()=>{
    expect(parseVersion('v1.2.3')).toEqual({major:1,minor:2,patch:3,prerelease:[]});
    expect(parseVersion('1.2.3-beta.1')).toMatchObject({prerelease:['beta','1']});
    expect(parseVersion('1.2')).toBeNull();expect(parseVersion('latest')).toBeNull();
  });
  it('orders prereleases below their core release',()=>{
    const beta=parseVersion('1.0.0-beta')!,release=parseVersion('1.0.0')!;
    expect(compareVersions(beta,release)).toBe(-1);expect(compareVersions(release,beta)).toBe(1);
  });
  it('matches caret, tilde, comparator, wildcard and alternative ranges',()=>{
    expect(satisfiesVersion('1.2.3','^1.2.0')).toBe(true);expect(satisfiesVersion('2.0.0','^1.2.0')).toBe(false);
    expect(satisfiesVersion('0.2.5','^0.2.3')).toBe(true);expect(satisfiesVersion('0.3.0','^0.2.3')).toBe(false);
    expect(satisfiesVersion('1.2.9','~1.2.3')).toBe(true);expect(satisfiesVersion('1.3.0','~1.2.3')).toBe(false);
    expect(satisfiesVersion('1.9.9','1.x')).toBe(true);expect(satisfiesVersion('2.0.0','1.x')).toBe(false);
    expect(satisfiesVersion('1.5.0','>=1.2.0 <2.0.0')).toBe(true);expect(satisfiesVersion('2.0.0','>=1.2.0 <2.0.0')).toBe(false);
    expect(satisfiesVersion('2.0.0','1.2.3 || 2.x')).toBe(true);
    expect(satisfiesVersion('1.0.0','*')).toBe(true);
  });
  it('rejects numeric identifiers that are not exactly representable',()=>{
    expect(parseVersion('9007199254740991.0.0')).toBeNull();
    expect(parseVersion('9007199254740990.0.0')).toMatchObject({major:9007199254740990});
    expect(parseVersion('1.0.0-9007199254740991')).toBeNull();
    expect(satisfiesVersion('9007199254740990.0.0','=9007199254740992.0.0')).toBe(false);
  });
  it('rounds partial comparator bounds to the last specified field',()=>{
    expect(satisfiesVersion('1.0.1','>1')).toBe(false);expect(satisfiesVersion('2.0.0','>1')).toBe(true);
    expect(satisfiesVersion('1.2.9','>1.2')).toBe(false);expect(satisfiesVersion('1.3.0','>1.2')).toBe(true);
    expect(satisfiesVersion('1.2.5','<=1.2')).toBe(true);expect(satisfiesVersion('1.3.0','<=1.2')).toBe(false);
    expect(satisfiesVersion('1.0.1','>1.0.0')).toBe(true);
  });
  it('gates prerelease versions behind a matching prerelease comparator',()=>{
    expect(satisfiesVersion('2.0.0-beta.1','^1.2.0')).toBe(false);
    expect(satisfiesVersion('1.3.0-beta','~1.2.3')).toBe(false);
    expect(satisfiesVersion('1.0.0-beta','*')).toBe(false);
    expect(satisfiesVersion('1.2.3-beta.2','^1.2.3-beta')).toBe(true);
    expect(satisfiesVersion('1.2.4-beta','^1.2.3-beta')).toBe(false);
    expect(satisfiesVersion('1.2.3','^1.2.3-beta')).toBe(true);
    expect(satisfiesVersion('1.2.3-beta.2','1.2.3-beta')).toBe(false);
  });
});

describe('assembly and service contracts',()=>{
  it('activates providers before consumers and resolves versioned services',async()=>{
    const order:string[]=[],kernel=new Kernel({engineVersion:'1.0.0'});
    kernel.register({manifest:manifest('store',{provides:[{contract:'engine.store/v1',version:'1.2.0'}]}),setup(context){order.push('store');context.provide('engine.store/v1','1.2.0',{value:42});}});
    kernel.register({manifest:manifest('reader',{consumes:[{contract:'engine.store/v1',range:'^1.0.0'}]}),setup(context){order.push('reader');expect(context.service<{value:number}>('engine.store/v1').value).toBe(42);}});
    await kernel.start();
    expect(order).toEqual(['store','reader']);
    expect(kernel.diagnostics).toEqual([]);
  });
  it('reports a missing provider without running any setup',async()=>{
    const kernel=new Kernel({engineVersion:'1.0.0'});const setup=vi.fn();
    kernel.register({manifest:manifest('reader',{consumes:[{contract:'engine.store/v1'}]}),setup});
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(codes(kernel)).toContain('missing-provider');expect(setup).not.toHaveBeenCalled();
  });
  it('allows an optional missing provider',async()=>{
    const kernel=new Kernel({engineVersion:'1.0.0'});
    kernel.register({manifest:manifest('reader',{consumes:[{contract:'engine.store/v1',optional:true}]}),setup(context){expect(()=>context.service('engine.store/v1')).toThrow('not provided');}});
    await kernel.start();
    expect(codes(kernel)).not.toContain('missing-provider');
  });
  it('reports version mismatch instead of resolving a wrong version',async()=>{
    const kernel=new Kernel({engineVersion:'1.0.0'});
    kernel.register({manifest:manifest('store',{provides:[{contract:'engine.store/v1',version:'1.0.0'}]}),setup(context){context.provide('engine.store/v1','1.0.0',{});}});
    kernel.register({manifest:manifest('reader',{consumes:[{contract:'engine.store/v1',range:'^2.0.0'}]}),setup(){}});
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(codes(kernel)).toContain('version-mismatch');
  });
  it('rejects two providers of the same contract in one scope',async()=>{
    const kernel=new Kernel({engineVersion:'1.0.0'});
    for(const id of ['one','two'])kernel.register({manifest:manifest(id,{provides:[{contract:'engine.store/v1',version:'1.0.0'}]}),setup(context){context.provide('engine.store/v1','1.0.0',id);}});
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(codes(kernel)).toContain('duplicate-provider');
  });
  it('detects a dependency cycle',async()=>{
    const kernel=new Kernel({engineVersion:'1.0.0'});
    kernel.register({manifest:manifest('alpha',{provides:[{contract:'engine.a/v1',version:'1.0.0'}],consumes:[{contract:'engine.b/v1'}]}),setup(context){context.provide('engine.a/v1','1.0.0',{});}});
    kernel.register({manifest:manifest('beta',{provides:[{contract:'engine.b/v1',version:'1.0.0'}],consumes:[{contract:'engine.a/v1'}]}),setup(context){context.provide('engine.b/v1','1.0.0',{});}});
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(codes(kernel)).toContain('dependency-cycle');
  });
  it('checks the engine range and the optional contract allowlist',async()=>{
    const kernel=new Kernel({engineVersion:'2.0.0',contracts:['engine.known/v1']});
    kernel.register({manifest:manifest('future',{engine:'^3.0.0'}),setup(){}});
    kernel.register({manifest:manifest('strange',{provides:[{contract:'engine.unknown/v1',version:'1.0.0'}]}),setup(context){context.provide('engine.unknown/v1','1.0.0',{});}});
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(codes(kernel)).toContain('engine-mismatch');expect(codes(kernel)).toContain('unknown-contract');
  });
});

describe('manifest validation',()=>{
  it('rejects malformed ids, versions and contracts',()=>{
    const kernel=new Kernel({engineVersion:'1.0.0'});
    expect(()=>kernel.register({manifest:manifest('Bad Id'),setup(){}})).toThrow(AssemblyError);
    expect(()=>kernel.register({manifest:{id:'ok',name:'',version:'1.0.0'},setup(){}})).toThrow(AssemblyError);
    expect(()=>kernel.register({manifest:manifest('ok',{provides:[{contract:'not-a-contract',version:'1.0.0'}]}),setup(){}})).toThrow(AssemblyError);
    expect(()=>kernel.register({manifest:{...manifest('odd'),provides:{}} as unknown as PluginManifest,setup(){}})).toThrow(AssemblyError);
  });
  it('rejects duplicate plugin ids and invalid kernel versions',()=>{
    const kernel=new Kernel({engineVersion:'1.0.0'});
    kernel.register({manifest:manifest('same'),setup(){}});
    expect(()=>kernel.register({manifest:manifest('same'),setup(){}})).toThrow(AssemblyError);
    expect(()=>new Kernel({engineVersion:'nope'})).toThrow('Invalid kernel engine version');
  });
});

describe('startup rollback',()=>{
  it('cleans providers, effects and services when a later plugin fails',async()=>{
    const events:string[]=[],kernel=new Kernel({engineVersion:'1.0.0'});
    kernel.register({manifest:manifest('store',{provides:[{contract:'engine.store/v1',version:'1.0.0'}]}),setup(context){
      events.push('store:setup');context.provide('engine.store/v1','1.0.0',{});
      context.effect(()=>events.push('store:effect'));
    }});
    kernel.register({manifest:manifest('reader',{consumes:[{contract:'engine.store/v1'}]}),setup(context){
      events.push('reader:setup');context.effect(()=>events.push('reader:effect'));throw new Error('boom');
    }});
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(events).toEqual(['store:setup','reader:setup','reader:effect','store:effect']);
    expect(kernel.diagnostics.some(d=>d.code==='activation-failure'&&/boom/.test(d.message))).toBe(true);
    expect(kernel.runtime.services.has('engine.store/v1')).toBe(false);
    expect(kernel.runtime.isActive).toBe(false);
  });
  it('records cleanup failures during rollback instead of hiding them',async()=>{
    const kernel=new Kernel({engineVersion:'1.0.0'});
    kernel.register({manifest:manifest('store',{provides:[{contract:'engine.store/v1',version:'1.0.0'}]}),setup(context){context.provide('engine.store/v1','1.0.0',{});context.effect(()=>{throw new Error('cleanup failed');});}});
    kernel.register({manifest:manifest('reader',{consumes:[{contract:'engine.store/v1'}]}),setup(){throw new Error('startup failed');}});
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(codes(kernel)).toContain('cleanup-failure');
  });
  it('fails when a declared provision is never supplied',async()=>{
    const kernel=new Kernel({engineVersion:'1.0.0'});
    kernel.register({manifest:manifest('store',{provides:[{contract:'engine.store/v1',version:'1.0.0'}]}),setup(){}});
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(kernel.diagnostics.some(d=>d.code==='activation-failure'&&/did not provide/.test(d.message))).toBe(true);
  });
  it('rejects a provided version that differs from the manifest',async()=>{
    const kernel=new Kernel({engineVersion:'1.0.0'});
    kernel.register({manifest:manifest('store',{provides:[{contract:'engine.store/v1',version:'1.0.0'}]}),setup(context){context.provide('engine.store/v1','2.0.0',{});}});
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(kernel.diagnostics.some(d=>d.code==='activation-failure'&&/declared 1.0.0/.test(d.message))).toBe(true);
    expect(kernel.runtime.services.has('engine.store/v1')).toBe(false);
  });
});

describe('effect ownership and late callbacks',()=>{
  it('runs effects in reverse order and reports late registration',async()=>{
    let captured:PluginContext|undefined;
    const kernel=new Kernel({engineVersion:'1.0.0'}),order:string[]=[];
    kernel.register({manifest:manifest('plug'),setup(context){captured=context;context.effect(()=>order.push('first'));context.effect(()=>order.push('second'));}});
    await kernel.start();
    await kernel.stop();
    expect(order).toEqual(['second','first']);
    expect(captured!.active).toBe(false);expect(captured!.signal.aborted).toBe(true);
    let late=0;captured!.effect(()=>late++);
    expect(late).toBe(1);
    expect(kernel.diagnostics.some(d=>d.code==='late-registration')).toBe(true);
    expect(()=>captured!.emit('engine.any')).toThrow('not active');
  });
  it('aborts waiters so late async continuations can observe cancellation',async()=>{
    let captured:PluginContext|undefined;
    const kernel=new Kernel({engineVersion:'1.0.0'});
    kernel.register({manifest:manifest('plug'),setup(context){captured=context;}});
    await kernel.start();
    const aborted=new Promise<void>(resolve=>captured!.signal.addEventListener('abort',()=>resolve()));
    await kernel.stop();
    await aborted;
    expect(captured!.signal.aborted).toBe(true);
  });
  it('revokes events registered through the context on disposal',async()=>{
    const kernel=new Kernel({engineVersion:'1.0.0',events:{'engine.ping':'sync-broadcast'}}),seen:number[]=[];
    kernel.register({manifest:manifest('plug'),setup(context){context.on('engine.ping',payload=>seen.push(payload as number));}});
    await kernel.start();kernel.events.emit('engine.ping',1);await kernel.stop();kernel.events.emit('engine.ping',2);
    expect(seen).toEqual([1]);
  });
});

describe('cross-vault scope isolation',()=>{
  it('keeps vault-scoped providers, services and effects independent',async()=>{
    const contexts=new Map<string,PluginContext>(),kernel=new Kernel({engineVersion:'1.0.0'});
    kernel.register({manifest:manifest('index',{provides:[{contract:'engine.index/v1',version:'1.0.0'}]}),setup(context){context.provide('engine.index/v1','1.0.0','shared');}});
    kernel.register({manifest:manifest('storage',{scopes:['vault'],provides:[{contract:'engine.storage/v1',version:'1.0.0'}],consumes:[{contract:'engine.index/v1'}]}),setup(context){
      contexts.set(context.scope.key,context);
      context.provide('engine.storage/v1','1.0.0','vault-' + context.scope.key);
      expect(context.service('engine.index/v1')).toBe('shared');
    }});
    const vaultA=kernel.createScope('vault','a'),vaultB=kernel.createScope('vault','b');
    await kernel.start();
    expect(vaultA.services.has('engine.storage/v1')).toBe(true);
    expect(vaultB.services.has('engine.storage/v1')).toBe(true);
    expect(contexts.get('a')!.service('engine.storage/v1')).toBe('vault-a');
    expect(contexts.get('b')!.service('engine.storage/v1')).toBe('vault-b');

    await kernel.stopScope(vaultA);
    expect(vaultA.isActive).toBe(false);expect(vaultA.services.has('engine.storage/v1')).toBe(false);
    expect(contexts.get('a')!.active).toBe(false);expect(contexts.get('b')!.active).toBe(true);
    expect(contexts.get('b')!.service('engine.storage/v1')).toBe('vault-b');
    expect(contexts.get('b')!.service('engine.index/v1')).toBe('shared');
    expect(kernel.runtime.services.has('engine.index/v1')).toBe(true);
  });
  it('rejects a runtime plugin that depends on a vault-scoped service',async()=>{
    const kernel=new Kernel({engineVersion:'1.0.0'});
    kernel.register({manifest:manifest('storage',{scopes:['vault'],provides:[{contract:'engine.storage/v1',version:'1.0.0'}]}),setup(context){context.provide('engine.storage/v1','1.0.0',{});}});
    kernel.register({manifest:manifest('reader',{consumes:[{contract:'engine.storage/v1'}]}),setup(){}});
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(codes(kernel)).toContain('missing-provider');
  });
});

describe('reload and scope lifecycle',()=>{
  it('reloads an active scope and re-establishes services',async()=>{
    const setups=vi.fn(),kernel=new Kernel({engineVersion:'1.0.0'});
    kernel.register({manifest:manifest('store',{provides:[{contract:'engine.store/v1',version:'1.0.0'}]}),setup(context){setups();context.provide('engine.store/v1','1.0.0',{});}});
    await kernel.start();expect(setups).toHaveBeenCalledTimes(1);
    await kernel.reload('store');
    expect(setups).toHaveBeenCalledTimes(2);expect(kernel.runtime.isActive).toBe(true);
    await expect(kernel.reload('missing')).rejects.toThrow('not active');
  });
  it('restarts descendant scopes when a provider scope is reloaded',async()=>{
    const kernel=new Kernel({engineVersion:'1.0.0'}),vaultSetups:number[]=[];
    kernel.register({manifest:manifest('index',{provides:[{contract:'engine.index/v1',version:'1.0.0'}]}),setup(context){context.provide('engine.index/v1','1.0.0',{stamp:Math.random()});}});
    kernel.register({manifest:manifest('storage',{scopes:['vault'],provides:[{contract:'engine.storage/v1',version:'1.0.0'}],consumes:[{contract:'engine.index/v1'}]}),setup(context){vaultSetups.push(1);context.provide('engine.storage/v1','1.0.0',{});expect(context.service('engine.index/v1')).toBeDefined();}});
    const vault=kernel.createScope('vault','a');
    await kernel.start();
    await kernel.reload('index');
    expect(kernel.runtime.isActive).toBe(true);expect(vault.isActive).toBe(true);
    expect(vaultSetups).toHaveLength(2);
  });
  it('stops active descendants when the runtime scope stops',async()=>{
    const kernel=new Kernel({engineVersion:'1.0.0'});
    kernel.register({manifest:manifest('index',{provides:[{contract:'engine.index/v1',version:'1.0.0'}]}),setup(context){context.provide('engine.index/v1','1.0.0',{});}});
    kernel.register({manifest:manifest('storage',{scopes:['vault'],consumes:[{contract:'engine.index/v1'}]}),setup(){}});
    const vault=kernel.createScope('vault','a');
    await kernel.start();
    await kernel.stopScope(kernel.runtime);
    expect(kernel.runtime.isActive).toBe(false);expect(vault.isActive).toBe(false);
  });
  it('serializes a restart behind an in-flight stop',async()=>{
    let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
    const kernel=new Kernel({engineVersion:'1.0.0'});let setups=0;
    kernel.register({manifest:manifest('store',{provides:[{contract:'engine.store/v1',version:'1.0.0'}]}),setup(context){setups++;context.provide('engine.store/v1','1.0.0',{});},async dispose(){await gate;}});
    await kernel.start();
    const stopping=kernel.stopScope(kernel.runtime),starting=kernel.startScope(kernel.runtime);
    release();
    await Promise.all([stopping,starting]);
    expect(kernel.runtime.isActive).toBe(true);
    expect(kernel.runtime.services.has('engine.store/v1')).toBe(true);
    expect(setups).toBe(2);
  });
});

describe('declared event strategies',()=>{
  it('broadcasts synchronously to every listener and aggregates errors',()=>{
    const bus=new EventBus();bus.declare('e','sync-broadcast');const order:number[]=[];
    bus.on('e',()=>order.push(1));bus.on('e',()=>{order.push(2);throw new Error('x');});bus.on('e',()=>order.push(3));
    expect(()=>bus.emit('e')).toThrow(AggregateError);expect(order).toEqual([1,2,3]);
  });
  it('runs concurrent listeners together even when one rejects',async()=>{
    const bus=new EventBus();bus.declare('e','async-concurrent');const order:number[]=[];
    bus.on('e',async()=>{await Promise.resolve();order.push(1);});
    bus.on('e',async()=>{order.push(2);throw new Error('bad');});
    await expect(bus.emit('e') as Promise<void>).rejects.toBeInstanceOf(AggregateError);
    expect(order.sort()).toEqual([1,2]);
  });
  it('stops serial delivery at the first rejection',async()=>{
    const bus=new EventBus();bus.declare('e','async-serial');const order:number[]=[];
    bus.on('e',()=>{order.push(1);});bus.on('e',()=>{throw new Error('stop');});bus.on('e',()=>{order.push(3);});
    await expect(bus.emit('e') as Promise<void>).rejects.toThrow('stop');expect(order).toEqual([1]);
  });
  it('honors an abort signal for abortable delivery',async()=>{
    const bus=new EventBus();bus.declare('e','abortable');const controller=new AbortController(),order:number[]=[];
    bus.on('e',()=>{order.push(1);controller.abort();});bus.on('e',()=>order.push(2));
    await (bus.emit('e',undefined,{signal:controller.signal}) as Promise<void>);
    expect(order).toEqual([1]);
  });
  it('rejects undeclared events and strategy changes',()=>{
    const bus=new EventBus();expect(()=>bus.on('nope',()=>{})).toThrow('not declared');bus.declare('e','async-serial');
    expect(()=>bus.declare('e','sync-broadcast')).toThrow('already declared');expect(bus.strategy('e')).toBe('async-serial');
  });
});

describe('effect scope',()=>{
  it('disposes once, in reverse order, and reports failed cleanups',async()=>{
    const scope=new EffectScope(),order:number[]=[];
    scope.add(()=>order.push(1));scope.add(()=>{throw new Error('bad');});scope.add(()=>order.push(3));
    const failed=await scope.dispose();await scope.dispose();
    expect(order).toEqual([3,1]);expect(failed).toBe(1);expect(scope.isActive).toBe(false);
  });
  it('runs a late cleanup immediately and signals the owner',()=>{
    const onLate=vi.fn(),scope=new EffectScope(onLate);let ran=0;
    scope.add(()=>ran++);scope.add(()=>ran++);
    void scope.dispose();
    scope.add(()=>ran++);
    expect(onLate).toHaveBeenCalledWith(1);
  });
  it('runs each cleanup once when scope and handle disposal overlap',async()=>{
    const scope=new EffectScope();let ran=0;
    const handle=scope.add(()=>ran++);
    await scope.dispose();
    handle.dispose();
    expect(ran).toBe(1);expect(handle.disposed).toBe(true);
  });
});

describe('diagnostic observer',()=>{
  it('forwards every recorded diagnostic to the observer',async()=>{
    const observed:Diagnostic[]=[],kernel=new Kernel({engineVersion:'1.0.0',onDiagnostic:d=>observed.push(d)});
    kernel.register({manifest:manifest('reader',{consumes:[{contract:'engine.store/v1'}]}),setup(){}});
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(observed.map(d=>d.code)).toContain('missing-provider');
  });
  it('contains a throwing observer and still throws AssemblyError',async()=>{
    const kernel=new Kernel({engineVersion:'1.0.0',onDiagnostic(){throw new Error('observer failed');}});
    kernel.register({manifest:manifest('reader',{consumes:[{contract:'engine.store/v1'}]}),setup(){}});
    await expect(kernel.start()).rejects.toBeInstanceOf(AssemblyError);
    expect(kernel.diagnostics.map(d=>d.code)).toContain('missing-provider');
  });
});
