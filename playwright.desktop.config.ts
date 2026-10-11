import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./e2e-desktop',timeout:60000,fullyParallel:false,workers:1,
  outputDir:'test-results-desktop',
  reporter:[['list']],use:{trace:'retain-on-failure'}
});
