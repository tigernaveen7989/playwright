import { test as base, expect, TestInfo, request } from '@playwright/test';
import jsonhandler from './jsonhandler';
import * as path from 'path';

type TestData = Record<string, any>;

const test = base.extend<{
  testData: TestData;
}>({
  testData: async ({}, use, testInfo: TestInfo) => {
    const testCaseName = testInfo.title.split('@')[0].trim();

    // Read environment variables
    const ENVIRONMENT = process.env.ENVIRONMENT?.toLowerCase();
    const SUBENVIRONMENT = process.env.SUBENVIRONMENT?.toLowerCase();
    const TENANT = process.env.TENANT?.toLowerCase();
    const PROJECT = testInfo.project.name.toLowerCase();

    // Determine the correct JSON file name
    const fileName =
      PROJECT === 'call-center' ? 'call-center-ui.json' : `${PROJECT}.json`;

    // Construct full path to the test data file
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
    const testData = jsonHandler.loadTestData(testCaseName);

    await use(testData);
  },
});

export { test, expect, request };
