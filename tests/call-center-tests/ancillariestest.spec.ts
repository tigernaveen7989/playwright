import { test } from '../../utilities/fixtures';
import { LoggerFactory } from '../../utilities/logger';
import {
    loginPage,
    homePage,
    passengerDetailsPage,
    ancillaryPage,
    addPaymentToNewReservationPage,
    payByCreditCardPage,
    bookingConfirmationPage,
} from '../basetest';
import jsonhandler from '../../utilities/jsonhandler';

test.describe.configure({ mode: 'parallel' });
const logger = LoggerFactory.getLogger(__filename);

test.describe('@Ancillaries @WLV_CC_REGRESSION @allure.label.feature:CALLCENTER-Initial-Ancillaries', () => {

    test.beforeEach(({ }, testInfo) => {
        testInfo.annotations.push({ type: 'tag', description: 'Ancillaries' });
    });

    /**
     * Order flow with initial ancillaries for Baggage and Standalone.
     * Adds ancillaries after passenger save and validates ancillary selections before payment.
     */
    test('TC1_Create_Order_Add_Initial_Ancillaries_Complete_Payment_Validate_Ancillaries', async ({ testData, assert }) => {
        // testData values are guaranteed present — loaded from JSON and merged with globals by fixture
        const userName = testData.get('userName')?.toString()!;
        const password = testData.get('password')?.toString()!;
        const tripType = testData.get('tripType')?.toString()!;
        const origin = testData.get('origin')?.toString()!;
        const destination = testData.get('destination')?.toString()!;
        const departure = testData.get('departure')?.toString()!;
        const returnDate = testData.get('returnDate')?.toString()!;
        const paxType = testData.get('paxType')?.toString()!;
        const todayPlusDate = testData.get('todayPlusDate')?.toString()!;
        const cabinType = testData.get('cabinType')?.toString()!;
        const cardType = testData.get('cardType')?.toString()!;
        const cardNumber = testData.get('cardNumber')?.toString()!;
        const cardName = testData.get('cardName')?.toString()!;
        const cvv = testData.get('cvv')?.toString()!;
        const expirationDate = testData.get('expirationDate')?.toString()!;
        const initialAncillaryTypeRaw = testData.get('initialAncillaryType');
        const initialAncillaryType =
            typeof initialAncillaryTypeRaw === 'string'
                ? (JSON.parse(initialAncillaryTypeRaw) as Record<string, Record<string, string>>)
                : (initialAncillaryTypeRaw as Record<string, Record<string, string>>);
        const parsedInitialAncillaries = jsonhandler.parseInitialAncillaryType(initialAncillaryType);
        let expectedAncillaryCount = 0;
        let selectedAncillaryCount = 0;
        let selectedAncillarySummary = '';
        let assignedServiceDetails: Map<string, unknown>;
        let assignedServices: Array<{ ancillaryName: string; price: string; passenger: string; segment: string }>;
        let totalNewCharges = '';
        let confirmationMap: Map<string, string>;
        let postOrderServiceDetails: Map<string, unknown>;
        let postOrderServices: Array<{ ancillaryName: string; price: string; passenger: string; segment: string }>;
        let expectedServiceSignatures: string[] = [];
        let actualServiceSignatures: string[] = [];

        logger.info('TC1 started: create order with initial ancillary flow and payment');

        logger.info(`Logging in and validating welcome message for user: ${userName}`);
        await loginPage.login(userName, password);

        await assert.toEqual('Welcome, ', await homePage.getWelcomeText(), 'Verify Welcome Text Is Matching');
        logger.info(`Creating reservation: ${tripType} ${origin}->${destination}, departure=${departure}, return=${returnDate}, pax=${paxType}`);
        await homePage.clickReservationsLink();
        await homePage.clickNewReservationLink();
        await homePage.selectTripType(tripType);
        await homePage.selectCityPair(tripType, origin, destination);
        await homePage.selectTravelDates(tripType, todayPlusDate);
        await homePage.selectPassengers(paxType);
        await homePage.clickOnShopButton();
        await homePage.clickOnOfferRadioButton(cabinType);
        await homePage.clickOnBookButton();
        await homePage.clickOnAgreeButton();

        logger.info('Entering passenger details and opening Add Serv after save confirmation');
        await passengerDetailsPage.enterAndGetPassengerDetails(paxType);

        await ancillaryPage.clickAddServButton();
        logger.info('Applying initial ancillary entries by route and passenger assignments');
        expectedAncillaryCount = await ancillaryPage.selectAncillaries(parsedInitialAncillaries);
        logger.info('Validating ancillary selections before payment step');
        selectedAncillaryCount = await ancillaryPage.getSelectedAncillaryCount();
        selectedAncillarySummary = await ancillaryPage.getSelectedAncillarySummaryText();
        await assert.toBeGreaterThanOrEqual(selectedAncillaryCount, expectedAncillaryCount, 'Verify selected ancillary count is at least expected ancillary quantity');
        await assert.notToBe(selectedAncillarySummary.trim(), '', 'Verify ancillary summary text is populated after ancillary selection');
        logger.info('Capturing assigned service details before accepting');
        assignedServiceDetails = await ancillaryPage.getAssignedServiceDetails();
        assignedServices = assignedServiceDetails.get('services') as Array<{ ancillaryName: string; price: string; passenger: string; segment: string }>;
        totalNewCharges = assignedServiceDetails.get('totalNewCharges') as string;
        logger.info(`Assigned services=${assignedServices.length}, totalNewCharges='${totalNewCharges}'`);
        await ancillaryPage.clickOnAcceptAndContinue();

        await passengerDetailsPage.clickOnSaveButton();
        await passengerDetailsPage.clickOnYesButton();

        logger.info(`Processing payment using card type: ${cardType}`);
        await addPaymentToNewReservationPage.fillPayerDetails();
        await addPaymentToNewReservationPage.selectCardType(cardType);
        await addPaymentToNewReservationPage.clickOnContinueButton();

        await payByCreditCardPage.enterCardDetails(cardNumber, cardName, cvv, expirationDate);
        await payByCreditCardPage.clickOnCompletePaymentButton();

        logger.info('Fetching booking confirmation details and validating outputs');
        confirmationMap = await bookingConfirmationPage.getPNRAndOrderNumber();
        await assert.notToBeNull(confirmationMap.get('pnrNumber'), 'Verify PNR Number is Not Null');
        await assert.notToBeNull(confirmationMap.get('orderNumber'), 'Verify Order Number is Not Null');

        logger.info('Validating ancillary details on confirmation Services tab');
        await bookingConfirmationPage.clickOnServicesTab();
        postOrderServiceDetails = await bookingConfirmationPage.getServiceTabAncillaryDetails();
        postOrderServices = postOrderServiceDetails.get('services') as Array<{ ancillaryName: string; price: string; passenger: string; segment: string }>;
        expectedServiceSignatures = assignedServices.map((service) => `${service.ancillaryName}|${service.price}|${service.passenger}|${service.segment}`).sort();
        actualServiceSignatures = postOrderServices.map((service) => `${service.ancillaryName}|${service.price}|${service.passenger}|${service.segment}`).sort();
        await assert.toBe(actualServiceSignatures.length, expectedServiceSignatures.length, 'Verify post-order ancillary count matches assigned ancillary count');
        await assert.toEqual(actualServiceSignatures.join('||'), expectedServiceSignatures.join('||'), 'Verify post-order ancillary details match assigned ancillary details');

        logger.info(`TC1 completed successfully. PNR=${confirmationMap.get('pnrNumber')}, Order=${confirmationMap.get('orderNumber')}`);
    });

    /**
     * Order flow with initial ancillaries for Baggage using API.
     * Fetches ancillaries from API and validates selections.
     */
    test.only('TC2_Create_Order_Add_Initial_Baggage_Ancillaries_Complete_Payment_Validate_Ancillaries', async ({ testData, assert }) => {
        // testData values are guaranteed present — loaded from JSON and merged with globals by fixture
        const userName = testData.get('userName')?.toString()!;
        const password = testData.get('password')?.toString()!;
        const tripType = testData.get('tripType')?.toString()!;
        const origin = testData.get('origin')?.toString()!;
        const destination = testData.get('destination')?.toString()!;
        const departure = testData.get('departure')?.toString()!;
        const returnDate = testData.get('returnDate')?.toString()!;
        const paxType = testData.get('paxType')?.toString()!;
        const todayPlusDate = testData.get('todayPlusDate')?.toString()!;
        const brandType = testData.get('brandType')?.toString()!;
        const cardType = testData.get('cardType')?.toString()!;
        const cardNumber = testData.get('cardNumber')?.toString()!;
        const cardName = testData.get('cardName')?.toString()!;
        const cvv = testData.get('cvv')?.toString()!;
        const expirationDate = testData.get('expirationDate')?.toString()!;
        const initialAncillaryTypeRaw = testData.get('initialAncillaryType');
        const initialAncillaryType =
            typeof initialAncillaryTypeRaw === 'string'
                ? (JSON.parse(initialAncillaryTypeRaw) as Record<string, Record<string, string>>)
                : (initialAncillaryTypeRaw as Record<string, Record<string, string>>);
        let expectedAncillaryCount = 0;
        let assignedServiceDetails: Map<string, unknown>;
        let assignedServices: Array<{ ancillaryName: string; price: string; passenger: string; segment: string }>;
        let totalNewCharges = '';
        let confirmationMap: Map<string, string>;
        let postOrderServiceDetails: Map<string, unknown>;
        let postOrderServices: Array<{ ancillaryName: string; price: string; passenger: string; segment: string }>;
        let expectedServiceSignatures: string[] = [];
        let actualServiceSignatures: string[] = [];

        logger.info('initialAncillaryType: ' + JSON.stringify(initialAncillaryType, null, 2));

        logger.info('TC2 started: create order with API-based ancillary selection');
        logger.info(`Logging in and validating welcome message for user: ${userName}`);
        await loginPage.login(userName, password);

        await assert.toEqual('Welcome, ', await homePage.getWelcomeText(), 'Verify Welcome Text Is Matching');
        logger.info(`Creating reservation: ${tripType} ${origin}->${destination}, departure=${departure}, return=${returnDate}, pax=${paxType}`);
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

        const flightDetails = await passengerDetailsPage.getFlightDetails();
        logger.info(`Captured flight details: ${JSON.stringify(flightDetails)}`);

        logger.info('Entering passenger details and opening Add Serv after save confirmation');
        const passengerDetails = await passengerDetailsPage.enterAndGetPassengerDetails(paxType);
        logger.info(`Passenger details captured: ${passengerDetails.length} passenger(s) entered`);

        await ancillaryPage.clickAddServButton();
        logger.info('Fetching ancillaries from API and selecting by passenger, route, and ancillary type');
        expectedAncillaryCount = await ancillaryPage.selectAncillariesFromAPI(flightDetails, passengerDetails, initialAncillaryType);
        logger.info('Capturing assigned service details before accepting');
        assignedServiceDetails = await ancillaryPage.getAssignedServiceDetails();
        assignedServices = assignedServiceDetails.get('services') as Array<{ ancillaryName: string; price: string; passenger: string; segment: string }>;
        totalNewCharges = assignedServiceDetails.get('totalNewCharges') as string;
        logger.info(`Assigned services=${assignedServices.length}, totalNewCharges='${totalNewCharges}'`);
        await ancillaryPage.clickOnAcceptAndContinue();

        await passengerDetailsPage.clickOnSaveButton();
        await passengerDetailsPage.clickOnYesButton();

        logger.info(`Processing payment using card type: ${cardType}`);
        await addPaymentToNewReservationPage.fillPayerDetails();
        await addPaymentToNewReservationPage.selectCardType(cardType);
        await addPaymentToNewReservationPage.clickOnContinueButton();

        await payByCreditCardPage.enterCardDetails(cardNumber, cardName, cvv, expirationDate);
        await payByCreditCardPage.clickOnCompletePaymentButton();

        logger.info('Fetching booking confirmation details and validating outputs');
        confirmationMap = await bookingConfirmationPage.getPNRAndOrderNumber();
        await assert.notToBeNull(confirmationMap.get('pnrNumber'), 'Verify PNR Number is Not Null');
        await assert.notToBeNull(confirmationMap.get('orderNumber'), 'Verify Order Number is Not Null');

        logger.info('Validating ancillary details on confirmation Services tab');
        await bookingConfirmationPage.clickOnServicesTab();
        postOrderServiceDetails = await bookingConfirmationPage.getServiceTabAncillaryDetails();
        postOrderServices = postOrderServiceDetails.get('services') as Array<{ ancillaryName: string; price: string; passenger: string; segment: string }>;
        expectedServiceSignatures = assignedServices.map((service) => `${service.ancillaryName}|${service.price}|${service.passenger}|${service.segment}`).sort();
        actualServiceSignatures = postOrderServices.map((service) => `${service.ancillaryName}|${service.price}|${service.passenger}|${service.segment}`).sort();
        await assert.toEqual(actualServiceSignatures.join('||'), expectedServiceSignatures.join('||'), 'Verify post-order ancillary details match assigned ancillary details');
        await assert.toBe(actualServiceSignatures.length, expectedServiceSignatures.length, 'Verify post-order ancillary count matches assigned ancillary count');

        logger.info(`TC2 completed successfully. PNR=${confirmationMap.get('pnrNumber')}, Order=${confirmationMap.get('orderNumber')}`);
    });
});
