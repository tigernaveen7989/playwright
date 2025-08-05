import { defineConfig, devices, PlaywrightTestConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config({ path: './environment.env' });

/**
 * See https://playwright.dev/docs/test-configuration
 */
const config: PlaywrightTestConfig = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,

  timeout: 30 * 1000,
  expect: {
    timeout: 30 * 1000,
  },

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', {
      resultsDir: 'allure-results',
      detail: true,
      suiteTitle: false,
      environmentInfo: {
        ENVIRONMENT: process.env.ENVIRONMENT,
        SUBENVIRONMENT: process.env.SUBENVIRONMENT,
        TENANT: process.env.TENANT
      },
    }],
  ],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
  },

  projects: [
    {
      name: 'call-center',
      testDir: './tests/call-center-tests',
      use: { browserName: 'chromium' },
    },
    {
      name: 'xml-api',
      testDir: './tests/xml-api-tests'
    },
    {
      name: 'json-api',
      testDir: './tests/json-api-tests'
    },
  ],
});

export default config;
