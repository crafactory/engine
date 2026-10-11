import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./e2e',timeout:30000,fullyParallel:false,workers:1,
  use:{baseURL:'http://127.0.0.1:5173',headless:true,channel:'chromium',viewport:{width:1440,height:940},screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:'npm run dev',port:5173,reuseExistingServer:!process.env.CI},
  reporter:[['list']]
});
