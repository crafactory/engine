import type {CapacitorConfig} from '@capacitor/cli';

const config:CapacitorConfig={
  appId:'com.crafactory.engine',
  appName:'Crafactory Engine',
  webDir:'dist',
  android:{minWebViewVersion:111,allowMixedContent:false},
  server:{hostname:'localhost',androidScheme:'https',cleartext:false,allowNavigation:[]}
};
export default config;
