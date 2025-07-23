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
  retries: 0, // Change to 1 or 2 as needed
  workers: process.env.CI ? 1 : undefined,

  timeout: 30 * 1000,
  expect: {
    timeout: 30 * 1000,
  },

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', {
      resultsDir: 'allure-results',
      suiteTitle: false, // disables default suite naming
    }],

  ],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
  },

  projects: [
    {
      name: 'call-center', // replaces 'chromium' in Allure
      use: { browserName: 'chromium' },
    },
  ],
});

export default config;
