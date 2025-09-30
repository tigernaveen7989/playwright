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

  timeout: 5 * 60 * 1000,
  expect: {
    timeout: 60 * 1000,
  },

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never', print: false }],
    //['list'],
    //['./utilities/email-reporter.ts'],
    ['allure-playwright', {
      resultsDir: 'allure-results',
      detail: false,
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
    viewport: null, // Uses full available screen size
    launchOptions: {
      args: ['--start-maximized'], // Chromium only
    },
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
