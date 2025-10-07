import { description } from 'allure-js-commons';
import { test, expect } from '../../utilities/fixtures';
import { loginPage, homePage, passengerDetailsPage, addPaymentToNewReservationPage, payByCreditCardPage, bookingConfirmationPage } from '../basetest';

test.describe.configure({ mode: 'parallel' });

test.describe('@PaidOrder @WLV_CC_REGRESSION @allure.label.feature:Singlepax-Paid-Seats', () => {

  test.beforeEach(({ }, testInfo) => {
    // Add custom tag label
    testInfo.annotations.push({ type: 'tag', description: 'PaidOrder' });
  });

  test('TC1_Verify_Login_Into_Call_Center_And_Create_Paid_Order', async ({ testData, assert }) => {
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
    let originAndDestinations: string[] = [];
    let departureDateAndTimes: string[] = [];
    let arrivalDateAndTimes: string[] = [];
    let pnrAndOrderNumberMap: Map<string, string> = new Map<string, string>();

    await loginPage.login(userName, password);
    await assert.toEqual("Welcome, ", await homePage.getWelcomeText(), "Verify Welcome Text Is Matching");
    await homePage.clickReservationsLink();
    await homePage.clickNewReservationLink();
    await homePage.selectTripType(tripType);
    await homePage.selectCityPair(tripType, origin, destination);
    await homePage.selectTravelDates(tripType, todayPlusDate);
    await homePage.selectPassengers(paxType);
    await homePage.clickOnShopButton();
    await homePage.clickOnOfferRadioButton(brandType);
    originAndDestinations = await homePage.getOriginAndDestinations();
    departureDateAndTimes = await homePage.getDepartureDateAndTimes();
    arrivalDateAndTimes = await homePage.getArrivalDateAndTimes();
    await homePage.clickOnBookButton();
    await homePage.clickOnAgreeButton();

    await passengerDetailsPage.enterPassengerDetails(paxType);
    await passengerDetailsPage.clickOnSaveButton();
    await passengerDetailsPage.clickOnYesButton();

    await addPaymentToNewReservationPage.selectCardType(cardType);
    await addPaymentToNewReservationPage.clickOnContinueButton();

    await payByCreditCardPage.enterCardDetails(cardNumber, cardName, cvv, expirationDate);
    await payByCreditCardPage.clickOnCompletePaymentButton();

    pnrAndOrderNumberMap = await bookingConfirmationPage.getPNRAndOrderNumber();
    await assert.notToBeNull(pnrAndOrderNumberMap.get("pnrNumber"), "Verify PNR Number is Not Null");
    await assert.notToBeNull(pnrAndOrderNumberMap.get("orderNumber"), "Verify Order Number is Not Null");
    await assert.toStrictEqual(originAndDestinations, await bookingConfirmationPage.getOriginAndDestinations(), "Verify Origin And Destinations Are Matching");
    await assert.toStrictEqual(departureDateAndTimes, await bookingConfirmationPage.getDepartureDateAndTimes(), "Verify Departure Dates And Times Are Matching");
    await assert.toStrictEqual(arrivalDateAndTimes, await bookingConfirmationPage.getArrivalDateAndTimes(), "Verify Arrival Date And Times Are Matching");
    //await assert.toBe(pnrAndOrderNumberMap.get("orderNumber"), "ABCD1234", "Verify Order Number is ABCD1234");
  });

  test('TC2_Verify_Login_Into_Call_Center_And_Create_Paid_Order_Using_Cash', async ({ testData, assert, logger }) => {
    const userName = testData.get('userName')?.toString()!;
    const password = testData.get('password')?.toString()!;
    const tripType = testData.get('tripType')?.toString()!;
    const origin = testData.get('origin')?.toString()!;
    const destination = testData.get('destination')?.toString()!;
    const paxType = testData.get('paxType')?.toString()!;
    const todayPlusDate = testData.get('todayPlusDate')?.toString()!;
    const cabinType = testData.get('cabinType')?.toString()!;
    const brandType = testData.get('brandType')?.toString()!;
    const paymentType = testData.get('paymentType')?.toString()!;
    let originAndDestinations: string[] = [];
    let departureDateAndTimes: string[] = [];
    let arrivalDateAndTimes: string[] = [];
    let pnrAndOrderNumberMap: Map<string, string> = new Map<string, string>();

    await loginPage.login(userName, password);
    await assert.toEqual("Welcome, ", await homePage.getWelcomeText(), "Verify Welcome Text Is Matching");
    await homePage.clickReservationsLink();
    await homePage.clickNewReservationLink();
    await homePage.selectTripType(tripType);
    await homePage.selectCityPair(tripType, origin, destination);
    await homePage.selectTravelDates(tripType, todayPlusDate);
    await homePage.selectPassengers(paxType);
    await homePage.clickOnShopButton();
    await homePage.clickOnOfferRadioButton(brandType);
    originAndDestinations = await homePage.getOriginAndDestinations();
    departureDateAndTimes = await homePage.getDepartureDateAndTimes();
    arrivalDateAndTimes = await homePage.getArrivalDateAndTimes();
    await homePage.clickOnBookButton();
    await homePage.clickOnAgreeButton();

    await passengerDetailsPage.enterPassengerDetails(paxType);
    await passengerDetailsPage.clickOnSaveButton();
    await passengerDetailsPage.clickOnYesButton();

    await addPaymentToNewReservationPage.selectPaymentType(paymentType);
    await addPaymentToNewReservationPage.clickOnContinueButton();

    pnrAndOrderNumberMap = await bookingConfirmationPage.getPNRAndOrderNumber();
    await assert.notToBeNull(pnrAndOrderNumberMap.get("pnrNumber"), "Verify PNR Number is Not Null");
    await assert.notToBeNull(pnrAndOrderNumberMap.get("orderNumber"), "Verify Order Number is Not Null");
    await assert.toStrictEqual(originAndDestinations, await bookingConfirmationPage.getOriginAndDestinations(), "Verify Origin And Destinations Are Matching");
    await assert.toStrictEqual(departureDateAndTimes, await bookingConfirmationPage.getDepartureDateAndTimes(), "Verify Departure Dates And Times Are Matching");
    await assert.toStrictEqual(arrivalDateAndTimes, await bookingConfirmationPage.getArrivalDateAndTimes(), "Verify Arrival Date And Times Are Matching");
    //await assert.toBe(pnrAndOrderNumberMap.get("orderNumber"), "ABCD1234", "Verify Order Number is ABCD1234");
  });

  /**
   * 
   */
  test('TC3_Verify_Multipax_OW_And_Create_Unpaid_Order', async ({ testData, assert, logger }) => {
    const userName = testData.get('userName')?.toString()!;
    const password = testData.get('password')?.toString()!;
    const tripType = testData.get('tripType')?.toString()!;
    const origin = testData.get('origin')?.toString()!;
    const destination = testData.get('destination')?.toString()!;
    const paxType = testData.get('paxType')?.toString()!;
    const todayPlusDate = testData.get('todayPlusDate')?.toString()!;
    const cabinType = testData.get('cabinType')?.toString()!;
    const brandType = testData.get('brandType')?.toString()!;
    let originAndDestinations: string[] = [];
    let departureDateAndTimes: string[] = [];
    let arrivalDateAndTimes: string[] = [];
    let pnrAndOrderNumberMap: Map<string, string> = new Map<string, string>();

    await loginPage.login(userName, password);
    await assert.toEqual("Welcome, ", await homePage.getWelcomeText(), "Verify Welcome Text Is Matching");
    await homePage.clickReservationsLink();
    await homePage.clickNewReservationLink();
    await homePage.selectTripType(tripType);
    await homePage.selectCityPair(tripType, origin, destination);
    await homePage.selectTravelDates(tripType, todayPlusDate);
    await homePage.selectPassengers(paxType);
    await homePage.clickOnShopButton();
    await homePage.clickOnOfferRadioButton(brandType);
    originAndDestinations = await homePage.getOriginAndDestinations();
    departureDateAndTimes = await homePage.getDepartureDateAndTimes();
    arrivalDateAndTimes = await homePage.getArrivalDateAndTimes();
    await homePage.clickOnBookButton();
    await homePage.clickOnAgreeButton();

    await passengerDetailsPage.enterPassengerDetails(paxType);
    await passengerDetailsPage.clickOnSaveButton();
    await passengerDetailsPage.clickOnNoButton();

    pnrAndOrderNumberMap = await bookingConfirmationPage.getPNRAndOrderNumber();
    await assert.notToBeNull(pnrAndOrderNumberMap.get("pnrNumber"), "Verify PNR Number is Not Null");
    await assert.notToBeNull(pnrAndOrderNumberMap.get("orderNumber"), "Verify Order Number is Not Null");
    await assert.toStrictEqual(originAndDestinations, await bookingConfirmationPage.getOriginAndDestinations(), "Verify Origin And Destinations Are Matching");
    await assert.toStrictEqual(departureDateAndTimes, await bookingConfirmationPage.getDepartureDateAndTimes(), "Verify Departure Dates And Times Are Matching");
    await assert.toStrictEqual(arrivalDateAndTimes, await bookingConfirmationPage.getArrivalDateAndTimes(), "Verify Arrival Date And Times Are Matching");
    await assert.toContain(await bookingConfirmationPage.getPriceGuaranteeTimeLimitText(), "Price Guarantee Time Limit", "Verify Price Guarantee Time Limit Text is Visible");
    await assert.toContain(await bookingConfirmationPage.getPaymentTimeLimitText(), "Payment Time Limit", "Verify Payment Time Limit Text is Visible");
    await assert.toBe(pnrAndOrderNumberMap.get("orderNumber"), "ABCD1234", "Verify Order Number is ABCD1234");
  });
});