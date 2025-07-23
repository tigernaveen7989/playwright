import { test, expect } from '../utilities/fixtures';
import BaseTest from './basetest';
import { Page } from '@playwright/test';
import { label } from 'allure-js-commons';
import * as allure from "allure-js-commons";
test.describe.configure({ mode: 'serial' });

let base: BaseTest;
let page: Page;


test.beforeEach(async ({ }, testInfo) => {
  const browserName = testInfo.project.use.browserName ?? 'chromium';
  label('suite', 'call-center');
  base = new BaseTest();
  page = await base.setup(browserName);
});

test.afterEach(async () => {
  await base.teardown();
});

test(
  'TC1_Verify_Login_Into_Call_Center_And_Create_Paid_Order_And_Add_Paid_Seats' +
  ' @allure.label.feature:Singlepax-Paid-Seats', async ({ testData }, testInfo) => {
    const userName: String = testData.get('userName')?.toString();
    const password: String = testData.get('password')?.toString();
    const seatType: String = testData.get('seatType')?.toString();

    const tenant = process.env.TENANT;
    console.log(`Tenant is: ${tenant}`);

    expect(tenant).toBe('VA');
  }
);

test(
  'TC2_Verify_Login_Into_Call_Center_And_Create_Unpaid_Order_And_Add_Free_Seat' +
  ' @allure.label.feature:Multipax-Free-Seats', async ({ testData }, testInfo) => {
    const userName: string = testData.get('userName')?.toString();
    const password: string = testData.get('password')?.toString();
    const seatType = testData.get('seatType') as Record<string, string>;
    const tenant = process.env.TENANT;

    expect(tenant).toBe('VA');


    const hasFreeSeat = Object.values(seatType).some(value => value.includes("FREE"));


    await base.loginPage.login(userName, password);
  }
);

test.only(
  'TC3_Verify_Login_Into_Call_Center_And_Create_Paid_Order_And_Add_Free_Seat', async ({ testData }, testInfo) => {

    await allure.description("The test checks if an active user with a valid password can sign in to the app.");
    await allure.epic("Signing in");
    await allure.feature("Sign in with a password");
    await allure.story("As an active user, I want to successfully sign in using a valid password");
    await allure.tags("signin", "ui", "positive");
    const userName: string = testData.get('userName')?.toString();
    const password: string = testData.get('password')?.toString();
    const seatType = testData.get('seatType') as Record<string, string>;
    const tenant = process.env.TENANT;

    expect(tenant).toBe('VA');


    const hasFreeSeat = Object.values(seatType).some(value => value.includes("FREE"));


    await base.loginPage.login(userName, password);
  }
);
