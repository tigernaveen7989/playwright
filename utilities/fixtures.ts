import { test as base, expect, request, Page, TestInfo } from '@playwright/test';
import jsonhandler from './jsonhandler';
import * as path from 'path';
import { Assertions } from './assertions';
import { LoggerFactory } from './logger';
import { BaseTest } from '../tests/basetest';

type TestData = Record<string, any>;

const logger = LoggerFactory.getLogger(__filename);
const assert = new Assertions();

// Extend base test with custom fixtures
const test = base.extend<{
  testData: TestData;
  logger: typeof logger;
  assert: Assertions;
  testInfo: TestInfo;
}>({
  testInfo: async ({}, use, testInfo) => {
    await use(testInfo);
  },

  testData: async ({}, use, testInfo: TestInfo) => {
    const testCaseName = testInfo.title.split('@')[0].trim();

    const ENVIRONMENT = process.env.ENVIRONMENT?.toLowerCase();
    const SUBENVIRONMENT = process.env.SUBENVIRONMENT?.toLowerCase();
    const TENANT = process.env.TENANT?.toLowerCase();
    const PROJECT = testInfo.project.name.toLowerCase();

    const fileName =
      PROJECT === 'call-center' ? 'call-center-ui.json' : `${PROJECT}.json`;

    const testDataPath = path.join(
      __dirname,
      '..',
      'testdata',
      ENVIRONMENT || '',
      SUBENVIRONMENT || '',
      TENANT || '',
      fileName
    );

    const jsonHandler = new jsonhandler(testDataPath);

    let testData: Map<string, any>;

    try {
      testData = jsonHandler.loadTestData(testCaseName);
    } catch (error) {
      logger.error(`${error.message}`);
      testInfo.status = 'failed';
      throw error;
    }

    await use(testData);
  },

  logger: async ({}, use) => {
    await use(logger);
  },

  assert: async ({}, use) => {
    await use(assert);
  },
});

// Register hooks once globally
BaseTest.registerHooks(test);

export { test, expect, request, Page };