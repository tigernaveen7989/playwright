import { test } from '../../utilities/fixtures';
import { LoggerFactory } from '../../utilities/logger';
import { dxVasmHomePage, dxVasmFlightSelectionPage, dxVasmPassengerDetailsPage, dxVasmAncillariesPage, dxVasmPaymentPage } from '../basetest';

test.describe.configure({ mode: 'parallel' });
const logger = LoggerFactory.getLogger(__filename);

test.describe('@CreateOrder @WLV_DXVASM_REGRESSION @allure.label.feature:DXVASM-CreateOrder', () => {

  test.beforeEach(({}, testInfo) => {
    testInfo.annotations.push({ type: 'tag', description: 'DXVASM-CreateOrder' });
  });

  test('TC1_Verify_DxVasm_Create_Order_With_Credit_Card', async ({ testData, assert, logger }) => {
    // ── Declare all variables at the top ──────────────────────────────────
    const origin = testData.get('origin')?.toString()!;
    const destination = testData.get('destination')?.toString()!;
    const paxType = testData.get('paxType')?.toString()!;
    const brandType = testData.get('brandType')?.toString()!;
    const cardNumber = testData.get('cardNumber')?.toString()!;
    const expiryDate = testData.get('expiryDate')?.toString()!;
    const cvc = testData.get('cvc')?.toString()!;
    const cardName = testData.get('cardName')?.toString()!;

    logger.info('TC1 started: Navigate to DX-VASM and create order with credit card payment');

    // Navigate to DX-VASM home page (URL resolved via loadConfig from url-and-accounts.json)
    logger.info('Navigating to DX-VASM');
    await dxVasmHomePage.navigateTo();

    // Select One Way trip and city pair
    logger.info(`Creating reservation: OW ${origin} -> ${destination}`);
    await dxVasmHomePage.selectOneWay();
    await dxVasmHomePage.selectCityPair(origin, destination);

    // Click Find flights
    logger.info('Searching for flights');
    await dxVasmHomePage.clickFindFlights();

    // Select brand offer for the first available flight
    logger.info(`Selecting ${brandType} brand offer`);
    await dxVasmFlightSelectionPage.selectBrandOffer(brandType);

    // Continue from flight review
    logger.info('Confirming flight selection');
    await dxVasmFlightSelectionPage.clickContinue();

    // Enter passenger details (faker-generated, matching call-center pattern)
    logger.info('Entering passenger details');
    await dxVasmPassengerDetailsPage.enterPassengerDetails(paxType);

    // Skip seat selection
    logger.info('Skipping seat selection');
    await dxVasmPassengerDetailsPage.clickSkipSeatSelection();

    // Skip baggage and continue
    logger.info('Skipping baggage, continuing to payment');
    await dxVasmAncillariesPage.clickContinue();

    // Enter credit card payment details
    logger.info(`Processing payment using credit card`);
    await dxVasmPaymentPage.enterCardDetails(cardNumber, expiryDate, cvc, cardName);

    // Check Looks good checkbox
    logger.info('Checking Looks good! checkbox');
    await dxVasmPaymentPage.checkLooksGood();

    // Click complete booking button
    logger.info('Clicking complete booking button');
    await dxVasmPaymentPage.clickCompleteBooking();

    logger.info('TC1 completed: DX-VASM create order with credit card payment');
  });
});
