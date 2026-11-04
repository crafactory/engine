/** Native black-box tests must not hand host service credentials to plugin processes. */
export function nativeTestEnv(home:string):NodeJS.ProcessEnv{
  const env:NodeJS.ProcessEnv={HOME:home,USERPROFILE:home,ENGINE_DEV:'0'};
  for(const name of ['PATH','DISPLAY','XAUTHORITY','LANG','LC_ALL','TZ','SYSTEMROOT','WINDIR','COMSPEC','TEMP','TMP','LD_LIBRARY_PATH','DBUS_SESSION_BUS_ADDRESS','XDG_RUNTIME_DIR','USER','LOGNAME']){
    if(process.env[name]!==undefined)env[name]=process.env[name];
  }
  return env;
}
