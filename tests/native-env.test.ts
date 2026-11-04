import {it,expect} from 'vitest';
import {nativeTestEnv} from '../e2e-desktop/native-env';
it('native test processes use temporary home and do not inherit arbitrary service environment',()=>{
  const key='ENGINE_PLUGIN_TEST_SECRET',before=process.env[key];process.env[key]='fixture-only-not-a-credential';
  try{
    const env=nativeTestEnv('/temporary/plugin-home');
    expect(env.HOME).toBe('/temporary/plugin-home');expect(env.USERPROFILE).toBe('/temporary/plugin-home');
    expect(env.ENGINE_DEV).toBe('0');expect(env[key]).toBeUndefined();
    expect(env.PATH).toBe(process.env.PATH);
  }finally{if(before===undefined)delete process.env[key];else process.env[key]=before;}
});
