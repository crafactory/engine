import {describe,it,expect,vi} from 'vitest';
import {createCompatRuntime} from '../src/compat';
import {createCompatService} from '../src/compat/service';
import {COMPAT_CONTRACT,COMPAT_VERSION,compatPlugin,type CompatHost,type CompatService} from '../src/services/compat';

const manifest={id:'fixture',name:'Fixture',version:'1.0.0'};
const host:CompatHost={
  loadData:vi.fn(async()=>null),saveData:vi.fn(async()=>null),read:vi.fn(async()=> 'text'),
  create:vi.fn(async()=>null),modify:vi.fn(async()=>null),append:vi.fn(async()=>null),writeLegacy:vi.fn(async()=>null),
  rename:vi.fn(async(_from,to)=>to),trash:vi.fn(async()=>{}),mkdir:vi.fn(async()=>{}),asset:vi.fn(async()=> 'data:'),
  open:vi.fn(async()=>{}),editor:vi.fn(async()=>{})
};
const callbacks={snapshot:()=>({name:'V',entries:[],notes:[],active:'',editor:null}),commands:()=>{},host,notice:()=>{},failure:()=>{}};
const controller={ready:Promise.resolve(),sync:()=>{},stop:async()=>{}};

describe('engine.compat/v1',()=>{
  it('registers and resolves the support service',async()=>{
    const service:CompatService={list:async()=>[],start:()=>controller,capabilities:()=>({worker:true,renderer:true})};
    const runtime=await createCompatRuntime({service});
    expect(runtime.kernel.runtime.services.resolve(COMPAT_CONTRACT,`^${COMPAT_VERSION}`).ok).toBe(true);
    expect(runtime.service).toBe(service);
    await runtime.kernel.stop();
  });

  it('discovers and validates packages through the support service',async()=>{
    const service=createCompatService({discover:async()=>[{manifest,code:'ok'},{manifest:{...manifest,id:'Bad ID'},code:'bad'}]});
    expect(await service.list()).toEqual([{manifest,code:'ok'}]);
  });

  it('dispatches worker and renderer starts with typed host callbacks',()=>{
    const worker=vi.fn(()=>controller),renderer=vi.fn(()=>controller);
    const service=createCompatService({worker,renderer});
    expect(service.capabilities()).toEqual({worker:true,renderer:true});
    service.start({package:{manifest,code:'worker'},mode:'worker',callbacks});
    expect(worker).toHaveBeenCalledWith(manifest,'worker',callbacks.snapshot,callbacks.commands,expect.any(Function),callbacks.notice,callbacks.failure);
    service.start({package:{manifest,code:'renderer'},mode:'renderer',callbacks});
    expect(renderer).toHaveBeenCalledWith(manifest,'renderer',callbacks.snapshot,callbacks.commands,expect.any(Function),callbacks.notice,callbacks.failure,expect.any(Function),expect.any(Function),undefined,undefined);
  });

  it('maps bounded operations to host primitives and enforces permissions',async()=>{
    const worker=vi.fn(()=>controller);
    const service=createCompatService({worker});
    service.start({package:{manifest:{...manifest,permissions:['vault:read']},code:''},mode:'worker',callbacks});
    const operation=(worker.mock.calls[0] as unknown[])[4] as (name:string,args:unknown[])=>Promise<unknown>;
    await expect(operation('read',['A.md'])).resolves.toBe('text');
    expect(host.read).toHaveBeenCalledWith('A.md');
    await expect(operation('create',['A.md','x'])).rejects.toThrow('vault:write');
    await expect(operation('nope',[])).rejects.toThrow('Unsupported plugin host operation');
  });

  it('rejects non-string content and non-integer editor ranges before dispatch',async()=>{
    const worker=vi.fn(()=>controller);
    const service=createCompatService({worker});
    service.start({package:{manifest,code:''},mode:'worker',callbacks});
    const operation=(worker.mock.calls[0] as unknown[])[4] as (name:string,args:unknown[])=>Promise<unknown>;
    await expect(operation('create',['A.md',null])).rejects.toThrow('Invalid plugin text');
    await expect(operation('editor',['A.md','base','next',null,0])).rejects.toThrow('Invalid editor mutation');
    expect(host.create).not.toHaveBeenCalledWith('A.md','null');
  });

  it('exposes the support plugin metadata',()=>{
    const plugin=compatPlugin({list:async()=>[],start:()=>controller,capabilities:()=>({worker:true,renderer:false})});
    expect(plugin.manifest.id).toBe('engine.compat');
    expect(plugin.manifest.provides).toEqual([{contract:COMPAT_CONTRACT,version:COMPAT_VERSION}]);
  });
});
