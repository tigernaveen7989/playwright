import { test, expect } from '../../utilities/fixtures';
import {loginPage, BaseTest} from '../basetest';
test.describe.configure({ mode: 'parallel' });

// Register setup/teardown hooks once here
BaseTest.registerHooks(test);

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


    await loginPage.login(userName, password);
  }
);

test(
  'TC3_Verify_Login_Into_Call_Center_And_Create_Paid_Order_And_Add_Free_Seat',
  async ({ testData }, testInfo) => {

    const userName: string = testData.get('userName')?.toString();
    const password: string = testData.get('password')?.toString();
    const seatType = testData.get('seatType') as Record<string, string>;
    const tenant = process.env.TENANT;

    expect(tenant).toBe('VA');

    const hasFreeSeat = Object.values(seatType).some(value => value.includes("FREE"));

    await loginPage.login(userName, password);
  }
);

