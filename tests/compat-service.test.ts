import {describe,it,expect,vi} from 'vitest';
import {createCompatRuntime} from '../src/compat';
import {createCompatService} from '../src/compat/service';
import {COMPAT_CONTRACT,COMPAT_VERSION,compatPlugin,type CompatService} from '../src/services/compat';

const manifest={id:'fixture',name:'Fixture',version:'1.0.0'};
const callbacks={
  snapshot:()=>({name:'V',entries:[],notes:[],active:'',editor:null}),
  commands:()=>{},operation:async()=>null,notice:()=>{},failure:()=>{}
};
const controller={ready:Promise.resolve(),sync:()=>{},stop:async()=>{}};

describe('engine.compat/v1',()=>{
  it('registers and resolves the support service',async()=>{
    const service:CompatService={start:()=>controller,capabilities:()=>({worker:true,renderer:true})};
    const runtime=await createCompatRuntime({service});
    expect(runtime.kernel.runtime.services.resolve(COMPAT_CONTRACT,`^${COMPAT_VERSION}`).ok).toBe(true);
    expect(runtime.service).toBe(service);
    await runtime.kernel.stop();
  });

  it('dispatches worker and renderer starts with the same host callbacks',()=>{
    const worker=vi.fn(()=>controller),renderer=vi.fn(()=>controller);
    const service=createCompatService({worker,renderer});
    expect(service.capabilities()).toEqual({worker:true,renderer:true});
    service.start({package:{manifest,code:'worker'},mode:'worker',callbacks});
    expect(worker).toHaveBeenCalledWith(manifest,'worker',callbacks.snapshot,callbacks.commands,callbacks.operation,callbacks.notice,callbacks.failure);
    service.start({package:{manifest,code:'renderer'},mode:'renderer',callbacks});
    expect(renderer).toHaveBeenCalledWith(manifest,'renderer',callbacks.snapshot,callbacks.commands,callbacks.operation,callbacks.notice,callbacks.failure,expect.any(Function),expect.any(Function),undefined,undefined);
  });

  it('exposes the support plugin metadata',()=>{
    const plugin=compatPlugin({start:()=>controller,capabilities:()=>({worker:true,renderer:false})});
    expect(plugin.manifest.id).toBe('engine.compat');
    expect(plugin.manifest.provides).toEqual([{contract:COMPAT_CONTRACT,version:COMPAT_VERSION}]);
  });
});
