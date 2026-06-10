import { test } from '../../utilities/fixtures';
import { LoggerFactory } from '../../utilities/logger';
import { dwresLoginPage, dwresHomePage, dwresCreateOrderPage, dwresOrderViewPage } from '../basetest';

test.describe.configure({ mode: 'parallel' });
const logger = LoggerFactory.getLogger(__filename);

test.describe('@PaidOrder @WLV_DWRES_REGRESSION @allure.label.feature:DWRES-PaidOrder', () => {

  test.beforeEach(({}, testInfo) => {
    testInfo.annotations.push({ type: 'tag', description: 'DWRES-PaidOrder' });
  });

  test('TC1_Verify_Login_Into_DWRES_And_Create_Paid_Order', async ({ testData, assert, logger }) => {
    // ── Declare all variables at the top ──────────────────────────────────
    // testData always contains these keys — validated in beforeEach via fixture
    const userName = testData.get('userName')?.toString()!;
    // testData always contains 'password' — loaded from global section
    const password = testData.get('password')?.toString()!;
    // testData always contains 'tripType' — loaded from test-specific section
    const tripType = testData.get('tripType')?.toString()!;
    // testData always contains 'origin' — loaded from test-specific section
    const origin = testData.get('origin')?.toString()!;
    // testData always contains 'destination' — loaded from test-specific section
    const destination = testData.get('destination')?.toString()!;
    // testData always contains 'todayPlusDate' — loaded from test-specific section
    const todayPlusDate = testData.get('todayPlusDate')?.toString()!;
    // testData always contains 'brandType' — loaded from test-specific section
    const brandType = testData.get('brandType')?.toString()!;
    // testData always contains 'cardType' — loaded from global section
    const cardType = testData.get('cardType')?.toString()!;
    // testData always contains 'cardNumber' — loaded from global section
    const cardNumber = testData.get('cardNumber')?.toString()!;
    // testData always contains 'cardName' — loaded from global section
    const cardName = testData.get('cardName')?.toString()!;
    // testData always contains 'cvv' — loaded from global section
    const cvv = testData.get('cvv')?.toString()!;
    // testData always contains 'expirationDate' — loaded from global section
    const expirationDate = testData.get('expirationDate')?.toString()!;
    let orderId: string;

    logger.info('TC1 started: Login into DWRES and create a paid order with credit card');

    // Login
    logger.info(`Logging in to DWRES with user: ${userName}`);
    await dwresLoginPage.login(userName, password);
    await assert.toContain((await dwresHomePage.getWelcomeText())!, 'Welcome to Airline Workspace', 'Verify welcome text is displayed');

    // Shop Flights
    logger.info(`Searching flights: ${tripType} ${origin} -> ${destination}`);
    await dwresHomePage.clickAirButton();
    await dwresHomePage.selectCityPair(origin, destination);
    await dwresHomePage.selectTravelDates(tripType, todayPlusDate);
    await dwresHomePage.clickOnShopFlightsButton();

    // Select outbound brand and fare
    logger.info(`Selecting outbound brand: ${brandType}`);
    await dwresHomePage.selectBrand(brandType);
    await dwresHomePage.clickOnSelectFareButton();

    // Select return brand and fare
    logger.info(`Selecting return brand: ${brandType}`);
    await dwresHomePage.selectBrand(brandType);
    await dwresHomePage.clickOnSelectFareButton();

    // Create Order
    logger.info('Creating order from Price Summary');
    await dwresHomePage.clickOnCreateOrderButton();

    // Enter passenger details
    logger.info('Entering passenger details');
    await dwresCreateOrderPage.enterPassengerDetails();
    await dwresCreateOrderPage.clickConfirmAndContinue();

    // Verify order creation
    logger.info('Verifying order was created successfully');
    orderId = await dwresOrderViewPage.getOrderId();
    await assert.notToBeNull(orderId, 'Verify Order ID is not null');
    logger.info(`Order created with ID: ${orderId}`);

    // Payment
    logger.info('Initiating payment flow');
    await dwresOrderViewPage.clickPayButton();
    await dwresOrderViewPage.selectAllPaymentItems();
    const paymentPage = await dwresOrderViewPage.clickPayNowButton();

    // Fill payment details in new tab
    logger.info(`Entering card details: ${cardType}`);
  });
});
