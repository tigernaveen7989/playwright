import { description } from 'allure-js-commons';
import { test, expect } from '../../utilities/fixtures';
import { loginPage, homePage, passengerDetailsPage, addPaymentToNewReservationPage, payByCreditCardPage } from '../basetest';

test.describe.configure({ mode: 'parallel' });

test.describe('@PaidOrder @WLV_CC_REGRESSION @allure.label.feature:Singlepax-Paid-Seats', () => {

  test.beforeEach(({ }, testInfo) => {
    // Add custom tag label
    testInfo.annotations.push({ type: 'tag', description: 'PaidOrder' });
  });

  test.only('TC1_Verify_Login_Into_Call_Center_And_Create_Paid_Order', async ({ testData, assert }) => {
    const userName = testData.get('userName')?.toString()!;
    const password = testData.get('password')?.toString()!;
    const tripType = testData.get('tripType')?.toString()!;
    const origin = testData.get('origin')?.toString()!;
    const destination = testData.get('destination')?.toString()!;
    const departure = testData.get('departure')?.toString()!;
    const paxType = testData.get('paxType')?.toString()!;
    const todayPlusDate = testData.get('todayPlusDate')?.toString()!;
    const cabinType = testData.get('cabinType')?.toString()!;
    const brandType = testData.get('brandType')?.toString()!;
    const cardType = testData.get('cardType')?.toString()!;
    const cardNumber = testData.get('cardNumber')?.toString()!;
    const cardName = testData.get('cardName')?.toString()!;
    const cvv = testData.get('cvv')?.toString()!;
    const expirationDate = testData.get('expirationDate')?.toString()!;

    await loginPage.login(userName, password);
    await homePage.getWelcomeText();
    assert.toEqual("Welcome, ", await homePage.getWelcomeText(), "Verify Welcome Text Is Matching");
    await homePage.clickReservationsLink();
    await homePage.clickNewReservationLink();
    await homePage.selectTripType(tripType);
    await homePage.selectCityPair(tripType, origin, destination);
    await homePage.selectTravelDates(tripType, todayPlusDate);
    await homePage.selectPassengers(paxType);
    await homePage.clickOnShopButton();
    await homePage.clickOnOfferRadioButton(brandType);
    await homePage.clickOnBookButton();
    await homePage.clickOnAgreeButton();
    await passengerDetailsPage.enterPassengerDetails(paxType);
    await passengerDetailsPage.clickOnSaveButton();
    await passengerDetailsPage.clickOnYesButton();
    await addPaymentToNewReservationPage.selectCardType(cardType);
    await addPaymentToNewReservationPage.clickOnContinueButton();
    await payByCreditCardPage.enterCardDetails(cardNumber, cardName, cvv, expirationDate);
    await payByCreditCardPage.clickOnCompletePaymentButton();
  });

  test('TC2_Verify_Login_Into_Call_Center_And_Create_Unpaid_Order', async ({ testData, assert, logger }) => {
    const userName = testData.get('userName')?.toString()!;
    const password = testData.get('password')?.toString()!;
    const tripType = testData.get('tripType')?.toString()!;
    const origin = testData.get('origin')?.toString()!;
    const destination = testData.get('destination')?.toString()!;
    const departure = testData.get('departure')?.toString()!;
    const paxType = testData.get('paxType')?.toString()!;
    const todayPlusDate = testData.get('todayPlusDate')?.toString()!;
    const cabinType = testData.get('cabinType')?.toString()!;
    const brandType = testData.get('brandType')?.toString()!;

    await loginPage.login(userName, password);
    await homePage.getWelcomeText();
    assert.toEqual("Welcome, ", await homePage.getWelcomeText(), "Verify Welcome Text Is Matching");
    await homePage.clickReservationsLink();
    await homePage.clickNewReservationLink();
    await homePage.selectTripType(tripType);
    await homePage.selectCityPair(tripType, origin, destination);
    await homePage.selectTravelDates(tripType, todayPlusDate);
    await homePage.selectPassengers(paxType);
    await homePage.clickOnShopButton();
    await homePage.clickOnOfferRadioButton(brandType);
    await homePage.clickOnBookButton();
  });

  /**
   * 
   */
  test('TC3_Verify_Login_Into_Call_Center_And_Create_Multipax_Paid_Order', async ({ testData, assert, logger }) => {
    const userName = testData.get('userName')?.toString()!;
    const password = testData.get('password')?.toString()!;
    const tripType = testData.get('tripType')?.toString()!;

    await loginPage.login(userName, password);
    await homePage.getWelcomeText();
    logger.info("Welcome text is", await homePage.getWelcomeText());
    assert.toEqual("Welcome, ", await homePage.getWelcomeText(), "Verify Welcome Text Is Matching");
    await homePage.clickReservationsLink();
    await homePage.clickNewReservationLink();
    await homePage.selectTripType(tripType);
  });

  test.skip('test', async ({ page }) => {
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('Pa$$word@2k25');
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.locator('.eyeicon').first().click();
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('Pa$$word@2k26');
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.goto('https://callcenter-ju-ut1.sabre.com/#/apiWelcome');
    await page.getByRole('menuitemcheckbox', { name: ' Reservations' }).click();
    await page.getByRole('link', { name: 'New Reservation' }).click();
    await page.locator('#lblRbxAvailabilityTripTypeOw span').first().click();
    await page.locator('#lblRbxAvailabilityTripTypeRt span').first().click();
    await page.getByRole('textbox', { name: 'From * ' }).click();
    await page.locator('#btnAvailabilityAirportFromRt').click();
    await page.getByRole('textbox', { name: 'From *  AAL - Aalborg' }).fill('mel');
    await page.locator('#ui-id-1879').click();
    await page.locator('#btnAvailabilityAirportToRt').click();
    await page.getByRole('textbox', { name: 'To *  AMS - Amsterdam' }).fill('beg');
    await page.locator('#ui-id-2025').click();
    await page.getByRole('textbox', { name: 'Depart *' }).click();
    await page.getByRole('link', { name: '27' }).first().click();
    await page.getByRole('link', { name: '30' }).first().click();
    await page.getByRole('button', { name: 'Shop' }).click();
    await page.locator('.flex-column.brands_names.no-border.fare-container.default-step > #single-1 > .flight_details_container > .flight_details_info > #lblflightSelection > .spark-radio__box').first().click();
    await page.getByRole('button', { name: 'Book' }).click();
    await page.getByRole('textbox', { name: 'Last Name *' }).click();
    await page.locator('#formNewPaxInfo').getByText('Last Name', { exact: true }).click();
    await page.locator('#lblTbxResFirstNamePax').getByText('First Name').click();
    await page.getByLabel('MRMRSMS Title').selectOption('MR');
    await page.getByRole('textbox', { name: 'DOB Show Calendar. Only' }).selectOption('MR');
    await page.getByLabel('MRMRSMS Title').click();
    await page.getByRole('textbox', { name: 'DOB Show Calendar. Only' }).click();
    await page.locator('#ui-datepicker-div').getByRole('combobox').nth(1).selectOption('1998');
    await page.getByRole('textbox', { name: 'DOB Show Calendar. Only' }).selectOption('1998');
    await page.getByRole('link', { name: '11' }).click();
    await page.getByText('Mobile Phone').click();
    await page.getByText('Email', { exact: true }).click();
    await page.getByRole('textbox', { name: 'Email *' }).fill('HELLO@COMPANYIS.COm');
    await page.getByRole('button', { name: 'Update' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.getByLabel('Choose...American Express').selectOption('');
    await page.getByRole('button', { name: 'Cancel' }).selectOption('');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'No' }).click();
    await page.goto('https://callcenter-ju-ut1.sabre.com/#/apiReservations/reservation/7143062381758628896959');
    await page.getByRole('link', { name: 'Logout' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
  });
});