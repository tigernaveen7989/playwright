import { test, expect } from '../../utilities/fixtures';
import BaseTest from '../basetest';
import { Page } from '@playwright/test';
import { label } from 'allure-js-commons';
test.describe.configure({ mode: 'parallel' });

test.describe('Call Center', () => {
  let base: BaseTest;
  let page: Page;
  

  test.beforeEach(async ({}, testInfo) => {
    const browserName = testInfo.project.use.browserName ?? 'chromium'; 
    label('suite', 'call-center');
    base = new BaseTest();
    page = await base.setup(browserName);
  });

  test.afterEach(async () => {
    await base.teardown();
  });

  test(
    'TC1_Verify_Login_Into_Call_Center_And_Create_Paid_Order' +
      ' @allure.label.feature:SinglePax-PaidOrder', async ({ testData }, testInfo) => {
      const userName : String = testData.get('userName')?.toString();
      const password : String = testData.get('password')?.toString();
      const seatType : String = testData.get('seatType')?.toString();

      const tenant = process.env.TENANT;
      console.log(`Tenant is: ${tenant}`);

      expect(tenant).toBe('VA');
    }
  );

  test(
    'TC2_Verify_Login_Into_Call_Center_And_Create_Unpaid_Order' +
      ' @allure.label.feature:SinglePax-UnpaidOrder', async ({ testData }, testInfo) => {
      const userName : string = testData.get('userName')?.toString();
      const password : string = testData.get('password')?.toString();
      const seatType = testData.get('seatType') as Record<string, string>;
      const tenant = process.env.TENANT;

      expect(tenant).toBe('VA');

      await base.loginPage.login(userName, password);
    }
  );
});
