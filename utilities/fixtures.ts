import { test as base, expect, TestInfo } from '@playwright/test';
import jsonhandler from './jsonhandler';

type TestData = Record<string, any>; // You can replace `any` with a more specific type based on your JSON

const test = base.extend<{
  testData: TestData;
}>({
  testData: async ({}, use, testInfo: TestInfo) => {
    const testCaseName = testInfo.title;
    const jsonHandler = new jsonhandler('../testData/testData.json');
    const testData = jsonHandler.loadTestData(testCaseName.split('@')[0].trim());
    await use(testData);
  },
});

export { test, expect };
