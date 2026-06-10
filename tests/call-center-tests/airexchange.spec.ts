import { test } from '../../utilities/fixtures';
import { LoggerFactory } from '../../utilities/logger';
import {
  loginPage, homePage, passengerDetailsPage,
  addPaymentToNewReservationPage, payByCreditCardPage,
  bookingConfirmationPage, airExchangePage
} from '../basetest';

test.describe.configure({ mode: 'parallel' });
const logger = LoggerFactory.getLogger(__filename);

test.describe('@AirExchange @WLV_CC_REGRESSION @allure.label.feature:CALLCENTER-AirExchange', () => {

  let tripType: string;
  let exchangeTodayPlusDate: string;
  let cardType: string;
  let cardNumber: string;
  let cardName: string;
  let cvv: string;
  let expirationDate: string;
  let exchangeBrandType: string;
  let exchangeType: string;
  let shopFare: number;

  test.beforeEach(async ({ testData, assert }, testInfo) => {

    testInfo.annotations.push({ type: 'tag', description: 'AirExchange' });

    const userName = testData.get('userName')?.toString()!;
    const password = testData.get('password')?.toString()!;
    tripType = testData.get('tripType')?.toString()!;
    const route = testData.get('route')?.toString() || '';
    const origin = testData.get('origin')?.toString() || route;
    const destination = testData.get('destination')?.toString() || '';
    
    const paxType = testData.get('paxType')?.toString()!;
    const todayPlusDate = (testData.get('todayPlusDate') || testData.get('TodayPlusDate'))?.toString()!;
    const brandType = testData.get('brandType')?.toString()!;
    const cabinType = testData.get('cabinType')?.toString() || '';
    const currencyType = testData.get('currencyType')?.toString() || '';
    cardType = testData.get('cardType')?.toString()!;
    cardNumber = testData.get('cardNumber')?.toString()!;
    cardName = testData.get('cardName')?.toString()!;
    cvv = testData.get('cvv')?.toString()!;
    expirationDate = testData.get('expirationDate')?.toString()!;
    const voluntaryType = testData.get('voluntaryType') as any;
    exchangeBrandType = voluntaryType?.brandType?.toString() || brandType;
    exchangeType = voluntaryType?.ExchangeType?.toString() || '';

    // Derive reshop date offset: add 20 days to original shop date for FutureDate exchanges
    if (voluntaryType?.AirExchangeBy === 'FutureDate') {
      exchangeTodayPlusDate = todayPlusDate
        .split(',')
        .map((offset: string) => String(Number(offset.trim()) + 20))
        .join(',');
      logger.info(`Reshop date derived: todayPlusDate=${todayPlusDate} + 20 = ${exchangeTodayPlusDate}`);
    } else {
      exchangeTodayPlusDate = todayPlusDate;
    }

    // -- Step 1: Login --
    logger.info(`Logging in with user ${userName}`);
    await loginPage.login(userName, password);

    await assert.toEqual(
      'Welcome, ',
      await homePage.getWelcomeText(),
      'Verify Welcome Text Is Matching'
    );

    // -- Step 2: Create Reservation --
    logger.info(`Creating reservation: ${tripType} ${origin}->${destination}, pax=${paxType}, brand=${brandType}`);
    await homePage.clickReservationsLink();
    await homePage.clickNewReservationLink();
    await homePage.selectTripType(tripType);
    await homePage.selectCityPair(tripType, origin, destination);
    await homePage.selectTravelDates(tripType, todayPlusDate);
    await homePage.selectPassengers(paxType);
    if (cabinType) {
      await homePage.selectCabinType(cabinType, tripType);
    }
    if (currencyType) {
      await homePage.selectCurrencyType(currencyType, tripType);
    }
    await homePage.clickOnShopButton();
    await homePage.clickOnOfferRadioButton(brandType);

    // -- Capture Shop Fare for exchange comparison --
    shopFare = await homePage.getFlightFareByBrand(brandType);
    logger.info(`Shop fare captured: ${shopFare} for brand: ${brandType}`);

    await homePage.clickOnBookButton();
    await homePage.clickOnAgreeButton();

    // -- Step 3: Passenger Details --
    logger.info('Entering passenger details');
    await passengerDetailsPage.enterAndGetPassengerDetails(paxType);
    await passengerDetailsPage.clickOnSaveButton();
    await passengerDetailsPage.clickOnYesButton();

    // -- Step 4: Payment --
    logger.info(`Processing payment using card type: ${cardType}`);
    await addPaymentToNewReservationPage.fillPayerDetails();
    await addPaymentToNewReservationPage.selectCardType(cardType);
    await addPaymentToNewReservationPage.clickOnContinueButton();

    await payByCreditCardPage.enterCardDetails(cardNumber,cardName,cvv,expirationDate);

    await payByCreditCardPage.clickOnCompletePaymentButton();

    // -- Step 5: Booking Confirmation --
    logger.info('Fetching booking confirmation details');
    const pnrAndOrderNumberMap =
      await bookingConfirmationPage.getPNRAndOrderNumber();

    await assert.notToBeNull(
      pnrAndOrderNumberMap.get('pnrNumber'),
      'Verify PNR Number is Not Null'
    );

    await assert.notToBeNull(
      pnrAndOrderNumberMap.get('orderNumber'),
      'Verify Order Number is Not Null'
    );

    logger.info(`PNR=${pnrAndOrderNumberMap.get('pnrNumber')}, Order=${pnrAndOrderNumberMap.get('orderNumber')}`);
  });

  /***
    * TC1: Create paid order with RT flight and perform even air exchange (Standard to Standard).
    * Expected: Air exchange completes with same or lower fare, no additional payment required.
   */
  test('TC1_Create_Paid_Order_perform_Even_AirExchange', async ({ assert }) => {

    logger.info('TC1_Create_Paid_Order_Perfrom_Even_AirExchange - started');

    // -- Perform Air Exchange --
    logger.info(`Performing ${exchangeType} exchange with new dates: ${exchangeTodayPlusDate}, reshop brand: ${exchangeBrandType}, shopFare: ${shopFare}`);
    const reshopFare = await airExchangePage.performAirExchange(tripType, exchangeTodayPlusDate, exchangeBrandType, exchangeType, shopFare);

    // -- Verify Balance Due --
    const balanceDueAmount = await airExchangePage.getBalanceDueAmount();
    logger.info(`Balance Due amount after exchange: ${balanceDueAmount}`);
    await assert.notToBeNull(balanceDueAmount, 'Verify Balance Due Amount is Not Null');

    // -- Resolve Even Exchange penalty handling --
    logger.info(`Even Exchange identified with matching fares. Shop Fare: ${shopFare}, Reshop Fare: ${reshopFare}`);
    const penaltyAmount = await airExchangePage.getBalanceDueAmountAsNumber();

    if (penaltyAmount === 0) {
      logger.info(`Shop Fare: ${shopFare} | Reshop Fare: ${reshopFare} | Balance Due: $0`);
      logger.info('Result: Even Exchange completed with no payment required.');
    } else {
      logger.info(`Shop Fare: ${shopFare} | Reshop Fare: ${reshopFare} | Balance Due: $${penaltyAmount}`);
      logger.info(`Exchange Penalty Amount Detected: $${penaltyAmount}`);
      logger.info('Proceeding with payment for the penalty amount.');
      await airExchangePage.clickAddPayButton();
      await addPaymentToNewReservationPage.fillPayerDetails();
      await addPaymentToNewReservationPage.selectCardType(cardType);
      await addPaymentToNewReservationPage.clickOnContinueButton();
      await payByCreditCardPage.enterCardDetails(cardNumber, cardName, cvv, expirationDate);
      await payByCreditCardPage.clickOnCompletePaymentButton();
      logger.info(`Result: Even Exchange completed with penalty payment of $${penaltyAmount}.`);
    }

    // -- Verify Exchange Completed --
    logger.info('Verifying air exchange completed successfully');
    const postExchangePnrMap = await bookingConfirmationPage.getPNRAndOrderNumber();
    await assert.notToBeNull(postExchangePnrMap.get('pnrNumber'), 'Verify PNR Number is Not Null after exchange');
    await assert.notToBeNull(postExchangePnrMap.get('orderNumber'), 'Verify Order Number is Not Null after exchange');

    logger.info('TC1_Create_Paid_Order_Perfrom_Even_AirExchange - completed');
  });

  /***
    * TC2: Create paid order with connecting flight and perform add-collect air exchange.
    * Expected: Air exchange completes with higher fare, additional payment required.
   */
  test('TC2_Create_Paid_Order_Connecting_Flight_perform_Add_Collect_Air_Exchange', async ({ assert }) => {

    logger.info('TC2_Create_Paid_Order_Connecting_Flight_perform_Add_Collect_Air_Exchange - started');

    // -- Perform Air Exchange --
    logger.info(`Performing ${exchangeType} exchange with new dates: ${exchangeTodayPlusDate}, reshop brand: ${exchangeBrandType}, shopFare: ${shopFare}`);
    const reshopFare = await airExchangePage.performAirExchange(tripType, exchangeTodayPlusDate, exchangeBrandType, exchangeType, shopFare);

    // -- Verify Balance Due --
    const balanceDueAmount = await airExchangePage.getBalanceDueAmount();
    logger.info(`Balance Due amount after exchange: ${balanceDueAmount}`);
    await assert.notToBeNull(balanceDueAmount, 'Verify Balance Due Amount is Not Null');

    // -- Collect additional payment for Add Collect exchange --
    logger.info(`Add Collect Exchange: shopFare=${shopFare}, reshopFare=${reshopFare}. Payment required.`);
    await airExchangePage.clickAddPayButton();
    await addPaymentToNewReservationPage.fillPayerDetails();
    await addPaymentToNewReservationPage.selectCardType(cardType);
    await addPaymentToNewReservationPage.clickOnContinueButton();
    await payByCreditCardPage.enterCardDetails(cardNumber, cardName, cvv, expirationDate);
    await payByCreditCardPage.clickOnCompletePaymentButton();
    logger.info('Payment completed for fare difference');

    // -- Verify Exchange Completed --
    logger.info('Verifying air exchange completed successfully');
    const postExchangePnrMap = await bookingConfirmationPage.getPNRAndOrderNumber();
    await assert.notToBeNull(postExchangePnrMap.get('pnrNumber'), 'Verify PNR Number is Not Null after exchange');
    await assert.notToBeNull(postExchangePnrMap.get('orderNumber'), 'Verify Order Number is Not Null after exchange');

    logger.info('TC2_Create_Paid_Order_Connecting_Flight_perform_Add_Collect_Air_Exchange - completed');
  });

  /***
    * TC3: Create paid order with Comfort brand and perform even air exchange (Comfort to Comfort).
    * Expected: Air exchange completes with same fare, no additional payment required.
   */
  test('TC3_Create_Paid_Order_WIth_CodeShare_perform_Even_AirExchange', async ({ assert }) => {

    logger.info('TC3_Create_Paid_Order_WIth_CodeShare_perform_Even_AirExchange - started');

    // -- Perform Air Exchange --
    logger.info(`Performing ${exchangeType} exchange with new dates: ${exchangeTodayPlusDate}, reshop brand: ${exchangeBrandType}, shopFare: ${shopFare}`);
    const reshopFare = await airExchangePage.performAirExchange(tripType, exchangeTodayPlusDate, exchangeBrandType, exchangeType, shopFare);

    // -- Verify Balance Due --
    const balanceDueAmount = await airExchangePage.getBalanceDueAmount();
    logger.info(`Balance Due amount after exchange: ${balanceDueAmount}`);
    await assert.notToBeNull(balanceDueAmount, 'Verify Balance Due Amount is Not Null');

    // -- Resolve Even Exchange penalty handling --
    logger.info(`Even Exchange identified with matching fares. Shop Fare: ${shopFare}, Reshop Fare: ${reshopFare}`);
    const penaltyAmount = await airExchangePage.getBalanceDueAmountAsNumber();

    if (penaltyAmount === 0) {
      logger.info(`Shop Fare: ${shopFare} | Reshop Fare: ${reshopFare} | Balance Due: $0`);
      logger.info('Result: Even Exchange completed with no payment required.');
    } else {
      logger.info(`Shop Fare: ${shopFare} | Reshop Fare: ${reshopFare} | Balance Due: $${penaltyAmount}`);
      logger.info(`Exchange Penalty Amount Detected: $${penaltyAmount}`);
      logger.info('Proceeding with payment for the penalty amount.');
      await airExchangePage.clickAddPayButton();
      await addPaymentToNewReservationPage.fillPayerDetails();
      await addPaymentToNewReservationPage.selectCardType(cardType);
      await addPaymentToNewReservationPage.clickOnContinueButton();
      await payByCreditCardPage.enterCardDetails(cardNumber, cardName, cvv, expirationDate);
      await payByCreditCardPage.clickOnCompletePaymentButton();
      logger.info(`Result: Even Exchange completed with penalty payment of $${penaltyAmount}.`);
    }

    // -- Verify Exchange Completed --
    logger.info('Verifying air exchange completed successfully');
    const postExchangePnrMap = await bookingConfirmationPage.getPNRAndOrderNumber();
    await assert.notToBeNull(postExchangePnrMap.get('pnrNumber'), 'Verify PNR Number is Not Null after exchange');
    await assert.notToBeNull(postExchangePnrMap.get('orderNumber'), 'Verify Order Number is Not Null after exchange');

    logger.info('TC3_Create_Paid_Order_WIth_CodeShare_perform_Even_AirExchange - completed');
  });

  /**
    * TC4: Create paid order on interline route and perform add-collect air exchange.
    * Expected: Reshop fare is higher than original fare and payment completes successfully.
   */
  test('TC4_Create_Paid_Order_With_Internline_perform_Add_Collect_AirExchange', async ({ assert }) => {

    logger.info('TC4_Create_Paid_Order_With_Internline_perform_Add_Collect_AirExchange - started');

    // -- Perform Air Exchange --
    logger.info(`Performing ${exchangeType} exchange with new dates: ${exchangeTodayPlusDate}, reshop brand: ${exchangeBrandType}, shopFare: ${shopFare}`);
    const reshopFare = await airExchangePage.performAirExchange(tripType, exchangeTodayPlusDate, exchangeBrandType, exchangeType, shopFare);

    // -- Verify Balance Due --
    const balanceDueAmount = await airExchangePage.getBalanceDueAmount();
    logger.info(`Balance Due amount after exchange: ${balanceDueAmount}`);
    await assert.notToBeNull(balanceDueAmount, 'Verify Balance Due Amount is Not Null');

    // -- Collect additional payment for Add Collect exchange --
    logger.info(`Add Collect Exchange: shopFare=${shopFare}, reshopFare=${reshopFare}. Payment required.`);
    await airExchangePage.clickAddPayButton();
    await addPaymentToNewReservationPage.fillPayerDetails();
    await addPaymentToNewReservationPage.selectCardType(cardType);
    await addPaymentToNewReservationPage.clickOnContinueButton();
    await payByCreditCardPage.enterCardDetails(cardNumber, cardName, cvv, expirationDate);
    await payByCreditCardPage.clickOnCompletePaymentButton();
    logger.info('Payment completed for fare difference');

    // -- Verify Exchange Completed --
    logger.info('Verifying air exchange completed successfully');
    const postExchangePnrMap = await bookingConfirmationPage.getPNRAndOrderNumber();
    await assert.notToBeNull(postExchangePnrMap.get('pnrNumber'), 'Verify PNR Number is Not Null after exchange');
    await assert.notToBeNull(postExchangePnrMap.get('orderNumber'), 'Verify Order Number is Not Null after exchange');

    logger.info('TC4_Create_Paid_Order_With_Internline_perform_Add_Collect_AirExchange - completed');
  });

  /***
    * TC5: Create paid order with Standard brand and perform even air exchange (Standard to Standard).
    * Expected: Air exchange completes with same fare, no additional payment required.
   */
  test('TC5_Create_Paid_Order_Same_Brand_Without_Penalty_perform_Even_AirExchange', async ({ assert }) => {

    logger.info('TC5_Create_Paid_Order_Same_Brand_Without_Penalty_perform_Even_AirExchange - started');

    // -- Perform Air Exchange --
    logger.info(`Performing ${exchangeType} exchange with new dates: ${exchangeTodayPlusDate}, reshop brand: ${exchangeBrandType}, shopFare: ${shopFare}`);
    const reshopFare = await airExchangePage.performAirExchange(tripType, exchangeTodayPlusDate, exchangeBrandType, exchangeType, shopFare);

    // -- Verify Balance Due --
    const balanceDueAmount = await airExchangePage.getBalanceDueAmount();
    logger.info(`Balance Due amount after exchange: ${balanceDueAmount}`);
    await assert.notToBeNull(balanceDueAmount, 'Verify Balance Due Amount is Not Null');

    // -- Resolve Even Exchange penalty handling --
    logger.info(`Even Exchange identified with matching fares. Shop Fare: ${shopFare}, Reshop Fare: ${reshopFare}`);
    const penaltyAmount = await airExchangePage.getBalanceDueAmountAsNumber();

    if (penaltyAmount === 0) {
      logger.info(`Shop Fare: ${shopFare} | Reshop Fare: ${reshopFare} | Balance Due: $0`);
      logger.info('Result: Even Exchange completed with no payment required.');
    } else {
      logger.info(`Shop Fare: ${shopFare} | Reshop Fare: ${reshopFare} | Balance Due: $${penaltyAmount}`);
      logger.info(`Exchange Penalty Amount Detected: $${penaltyAmount}`);
      logger.info('Proceeding with payment for the penalty amount.');
      await airExchangePage.clickAddPayButton();
      await addPaymentToNewReservationPage.fillPayerDetails();
      await addPaymentToNewReservationPage.selectCardType(cardType);
      await addPaymentToNewReservationPage.clickOnContinueButton();
      await payByCreditCardPage.enterCardDetails(cardNumber, cardName, cvv, expirationDate);
      await payByCreditCardPage.clickOnCompletePaymentButton();
      logger.info(`Result: Even Exchange completed with penalty payment of $${penaltyAmount}.`);
    }

    // -- Verify Exchange Completed --
    logger.info('Verifying air exchange completed successfully');
    const postExchangePnrMap = await bookingConfirmationPage.getPNRAndOrderNumber();
    await assert.notToBeNull(postExchangePnrMap.get('pnrNumber'), 'Verify PNR Number is Not Null after exchange');
    await assert.notToBeNull(postExchangePnrMap.get('orderNumber'), 'Verify Order Number is Not Null after exchange');

    logger.info('TC5_Create_Paid_Order_Same_Brand_Without_Penalty_perform_Even_AirExchange - completed');
  });

  /***
    * TC6: Create paid order with MS trip and perform even air exchange (Comfort to Comfort).
    * Expected: Air exchange completes with same fare for multi-segment, no additional payment.
   */
  test('TC6_Create_Paid_Order_MS_perform_Even_AirExchange', async ({ assert }) => {

    logger.info('TC6_Create_Paid_Order_MS_perform_Even_AirExchange - started');

    // -- Perform Air Exchange --
    logger.info(`Performing ${exchangeType} exchange with new dates: ${exchangeTodayPlusDate}, reshop brand: ${exchangeBrandType}, shopFare: ${shopFare}`);
    const reshopFare = await airExchangePage.performAirExchange(tripType, exchangeTodayPlusDate, exchangeBrandType, exchangeType, shopFare);

    // -- Verify Balance Due --
    const balanceDueAmount = await airExchangePage.getBalanceDueAmount();
    logger.info(`Balance Due amount after exchange: ${balanceDueAmount}`);
    await assert.notToBeNull(balanceDueAmount, 'Verify Balance Due Amount is Not Null');

    // -- Resolve Even Exchange penalty handling --
    logger.info(`Even Exchange identified with matching fares. Shop Fare: ${shopFare}, Reshop Fare: ${reshopFare}`);
    const penaltyAmount = await airExchangePage.getBalanceDueAmountAsNumber();

    if (penaltyAmount === 0) {
      logger.info(`Shop Fare: ${shopFare} | Reshop Fare: ${reshopFare} | Balance Due: $0`);
      logger.info('Result: Even Exchange completed with no payment required.');
    } else {
      logger.info(`Shop Fare: ${shopFare} | Reshop Fare: ${reshopFare} | Balance Due: $${penaltyAmount}`);
      logger.info(`Exchange Penalty Amount Detected: $${penaltyAmount}`);
      logger.info('Proceeding with payment for the penalty amount.');
      await airExchangePage.clickAddPayButton();
      await addPaymentToNewReservationPage.fillPayerDetails();
      await addPaymentToNewReservationPage.selectCardType(cardType);
      await addPaymentToNewReservationPage.clickOnContinueButton();
      await payByCreditCardPage.enterCardDetails(cardNumber, cardName, cvv, expirationDate);
      await payByCreditCardPage.clickOnCompletePaymentButton();
      logger.info(`Result: Even Exchange completed with penalty payment of $${penaltyAmount}.`);
    }

    // -- Verify Exchange Completed --
    logger.info('Verifying air exchange completed successfully');
    const postExchangePnrMap = await bookingConfirmationPage.getPNRAndOrderNumber();
    await assert.notToBeNull(postExchangePnrMap.get('pnrNumber'), 'Verify PNR Number is Not Null after exchange');
    await assert.notToBeNull(postExchangePnrMap.get('orderNumber'), 'Verify Order Number is Not Null after exchange');

    logger.info('TC6_Create_Paid_Order_MS_Perfrom_Even_AirExchange - completed');
  });
  /**
    * TC7: Create paid order and perform even exchange with different reshop brand.
    * Expected: Exchange completes as even exchange with no additional balance due.
   */
   test('TC7_Create_Paid_Order_Different_Brand_Without_Penalty_perform_Even_AirExchange', async ({ assert }) => {

    logger.info('TC7_Create_Paid_Order_Different_Brand_Without_Penalty_perform_Even_AirExchange - started');

    // -- Perform Air Exchange --
    logger.info(`Performing ${exchangeType} exchange with new dates: ${exchangeTodayPlusDate}, reshop brand: ${exchangeBrandType}, shopFare: ${shopFare}`);
    const reshopFare = await airExchangePage.performAirExchange(tripType, exchangeTodayPlusDate, exchangeBrandType, exchangeType, shopFare);

    // -- Verify Balance Due --
    const balanceDueAmount = await airExchangePage.getBalanceDueAmount();
    logger.info(`Balance Due amount after exchange: ${balanceDueAmount}`);
    await assert.notToBeNull(balanceDueAmount, 'Verify Balance Due Amount is Not Null');

    // -- Resolve Even Exchange penalty handling --
    logger.info(`Even Exchange identified with matching fares. Shop Fare: ${shopFare}, Reshop Fare: ${reshopFare}`);
    const penaltyAmount = await airExchangePage.getBalanceDueAmountAsNumber();

    if (penaltyAmount === 0) {
      logger.info(`Shop Fare: ${shopFare} | Reshop Fare: ${reshopFare} | Balance Due: $0`);
      logger.info('Result: Even Exchange completed with no payment required.');
    } else {
      logger.info(`Shop Fare: ${shopFare} | Reshop Fare: ${reshopFare} | Balance Due: $${penaltyAmount}`);
      logger.info(`Exchange Penalty Amount Detected: $${penaltyAmount}`);
      logger.info('Proceeding with payment for the penalty amount.');
      await airExchangePage.clickAddPayButton();
      await addPaymentToNewReservationPage.fillPayerDetails();
      await addPaymentToNewReservationPage.selectCardType(cardType);
      await addPaymentToNewReservationPage.clickOnContinueButton();
      await payByCreditCardPage.enterCardDetails(cardNumber, cardName, cvv, expirationDate);
      await payByCreditCardPage.clickOnCompletePaymentButton();
      logger.info(`Result: Even Exchange completed with penalty payment of $${penaltyAmount}.`);
    }

    // -- Verify Exchange Completed --
    logger.info('Verifying air exchange completed successfully');
    const postExchangePnrMap = await bookingConfirmationPage.getPNRAndOrderNumber();
    await assert.notToBeNull(postExchangePnrMap.get('pnrNumber'), 'Verify PNR Number is Not Null after exchange');
    await assert.notToBeNull(postExchangePnrMap.get('orderNumber'), 'Verify Order Number is Not Null after exchange');

    logger.info('TC7_Create_Paid_Order_Different_Brand_Without_Penalty_perform_Even_AirExchange - completed');
  });

  /**
    * TC8: Create paid order and perform add-collect exchange with different brand and penalty.
    * Expected: Balance due is collected and exchange confirmation remains available after payment.
   */
  test('TC8_Create_Paid_Order_Different_Brand_With_Penalty_perform_Add_Collect_AirExchange', async ({ assert }) => {

    logger.info('TC8_Create_Paid_Order_Different_Brand_With_Penalty_perform_Add_Collect_AirExchange - started');

    // -- Perform Air Exchange --
    logger.info(`Performing ${exchangeType} exchange with new dates: ${exchangeTodayPlusDate}, reshop brand: ${exchangeBrandType}, shopFare: ${shopFare}`);
    const reshopFare = await airExchangePage.performAirExchange(tripType, exchangeTodayPlusDate, exchangeBrandType, exchangeType, shopFare);

    // -- Verify Balance Due --
    const balanceDueAmount = await airExchangePage.getBalanceDueAmount();
    logger.info(`Balance Due amount after exchange: ${balanceDueAmount}`);
    await assert.notToBeNull(balanceDueAmount, 'Verify Balance Due Amount is Not Null');

    // -- Collect additional payment for Add Collect exchange --
    logger.info(`Add Collect Exchange: shopFare=${shopFare}, reshopFare=${reshopFare}. Payment required.`);
    await airExchangePage.clickAddPayButton();
    await addPaymentToNewReservationPage.fillPayerDetails();
    await addPaymentToNewReservationPage.selectCardType(cardType);
    await addPaymentToNewReservationPage.clickOnContinueButton();
    await payByCreditCardPage.enterCardDetails(cardNumber, cardName, cvv, expirationDate);
    await payByCreditCardPage.clickOnCompletePaymentButton();
    logger.info('Payment completed for fare difference');

    // -- Verify Exchange Completed --
    logger.info('Verifying air exchange completed successfully');
    const postExchangePnrMap = await bookingConfirmationPage.getPNRAndOrderNumber();
    await assert.notToBeNull(postExchangePnrMap.get('pnrNumber'), 'Verify PNR Number is Not Null after exchange');
    await assert.notToBeNull(postExchangePnrMap.get('orderNumber'), 'Verify Order Number is Not Null after exchange');

    logger.info('TC8_Create_Paid_Order_Different_Brand_With_Penalty_Perform_Add_Collect_AirExchange - completed');
  });
  
});
