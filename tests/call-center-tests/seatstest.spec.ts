import { test } from '../../utilities/fixtures';
import { LoggerFactory } from '../../utilities/logger';
import jsonhandler from '../../utilities/jsonhandler';
import {
  loginPage, homePage, passengerDetailsPage,
  addPaymentToNewReservationPage, payByCreditCardPage,
  bookingConfirmationPage, seatSelectionPage
} from '../basetest';

test.describe.configure({ mode: 'parallel' });
const logger = LoggerFactory.getLogger(__filename);

test.describe('@PaidSeats @WLV_CC_REGRESSION @allure.label.feature:CALLCENTER-Paid-Seats', () => {

  test.beforeEach(async ({ testData, assert }, testInfo) => {

    testInfo.annotations.push({ type: 'tag', description: 'PaidSeats' });

    const userName = testData.get('userName')?.toString()!;
    const password = testData.get('password')?.toString()!;
    const tripType = testData.get('tripType')?.toString()!;
    const origin = testData.get('origin')?.toString()!;
    const destination = testData.get('destination')?.toString()!;
    const paxType = testData.get('paxType')?.toString()!;
    const todayPlusDate = testData.get('todayPlusDate')?.toString()!;
    const cabinType = testData.get('cabinType')?.toString()!;
    const cardType = testData.get('cardType')?.toString()!;
    const cardNumber = testData.get('cardNumber')?.toString()!;
    const cardName = testData.get('cardName')?.toString()!;
    const cvv = testData.get('cvv')?.toString()!;
    const expirationDate = testData.get('expirationDate')?.toString()!;

    let originAndDestinations: string[] = [];
    let departureDateAndTimes: string[] = [];
    let arrivalDateAndTimes: string[] = [];

    // ── Step 1: Login ──────────────────────────────────────────────────────
    logger.info(`Logging in with user ${userName}`);
    await loginPage.login(userName, password);

    await assert.toEqual(
      'Welcome, ',
      await homePage.getWelcomeText(),
      'Verify Welcome Text Is Matching'
    );

    // ── Step 2: Create Reservation ─────────────────────────────────────────
    logger.info(`Creating reservation: ${tripType} ${origin}->${destination}, pax=${paxType}`);
    await homePage.clickReservationsLink();
    await homePage.clickNewReservationLink();
    await homePage.selectTripType(tripType);
    await homePage.selectCityPair(tripType, origin, destination);
    await homePage.selectTravelDates(tripType, todayPlusDate);
    await homePage.selectPassengers(paxType);
    await homePage.clickOnShopButton();
    await homePage.clickOnOfferRadioButton(cabinType);

    originAndDestinations = await homePage.getOriginAndDestinations();
    departureDateAndTimes = await homePage.getDepartureDateAndTimes();
    arrivalDateAndTimes = await homePage.getArrivalDateAndTimes();

    await homePage.clickOnBookButton();
    await homePage.clickOnAgreeButton();

    // ── Step 3: Passenger Details ──────────────────────────────────────────
    logger.info('Entering passenger details');
    await passengerDetailsPage.enterAndGetPassengerDetails(paxType);
    await passengerDetailsPage.clickOnSaveButton();
    await passengerDetailsPage.clickOnYesButton();

    // ── Step 4: Payment ────────────────────────────────────────────────────
    logger.info(`Processing payment using card type: ${cardType}`);
    await addPaymentToNewReservationPage.fillPayerDetails();
    await addPaymentToNewReservationPage.selectCardType(cardType);
    await addPaymentToNewReservationPage.clickOnContinueButton();

    await payByCreditCardPage.enterCardDetails(
      cardNumber,
      cardName,
      cvv,
      expirationDate
    );

    await payByCreditCardPage.clickOnCompletePaymentButton();

    // ── Step 5: Booking Confirmation ───────────────────────────────────────
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

    await assert.toStrictEqual(
      originAndDestinations,
      await bookingConfirmationPage.getOriginAndDestinations(),
      'Verify Origin And Destinations Are Matching'
    );

    await assert.toStrictEqual(
      departureDateAndTimes,
      await bookingConfirmationPage.getDepartureDateAndTimes(),
      'Verify Departure Dates And Times Are Matching'
    );

    await assert.toStrictEqual(
      arrivalDateAndTimes,
      await bookingConfirmationPage.getArrivalDateAndTimes(),
      'Verify Arrival Date And Times Are Matching'
    );

    logger.info(`PNR=${pnrAndOrderNumberMap.get('pnrNumber')}, Order=${pnrAndOrderNumberMap.get('orderNumber')}`);

    // ── Step 6: Open Seat Assignment ───────────────────────────────────────
    logger.info('Opening seat assignment popup');
    await bookingConfirmationPage.clickOnAssignSeatsLink();
  });

  /***
    * TC1: Assign free seats after paid order creation and verify seats are assigned for all passengers.
    * Expected: Seat assignment saves successfully without additional seat payment.
   */
  test('TC1_Verify_Free_Seats_After_Creating_Paid_Order', async ({ testData, assert }) => {

    const seatType = testData.get('seatType') as Record<string, string>;

    logger.info('TC1_Verify_Free_Seats_After_Creating_Paid_Order — started');

    // ── Assign Seats ───────────────────────────────────────────────────────
    const seatAssignments = jsonhandler.parseSeatType(seatType);
    const assignmentEntries = Array.from(seatAssignments.entries());

    for (let i = 0; i < assignmentEntries.length; i++) {
      const segmentIndex = assignmentEntries[i][0];
      const paxEntries = assignmentEntries[i][1];

      logger.info(`Assigning free seats for segment ${segmentIndex + 1}`);
      await seatSelectionPage.assignSeatsForSegment(segmentIndex, paxEntries);
    }

    // ── Verify Seat Assignments ────────────────────────────────────────────
    logger.info('Verifying seat assignments');
    const assignedSeats = await seatSelectionPage.getAssignedSeats();

    for (let i = 0; i < assignedSeats.length; i++) {
      await assert.notToBeNull(
        assignedSeats[i],
        `Verify seat assigned for passenger ${i + 1}`
      );
    }

    const charges = await seatSelectionPage.getPassengerCharges();

    for (let i = 0; i < charges.length; i++) {
      logger.info(`Passenger ${i + 1} seat charge: ${charges[i]}`);
    }

    // ── Save Seat Assignments ──────────────────────────────────────────────
    await seatSelectionPage.clickSaveButton();

    logger.info('TC1_Verify_Free_Seats_After_Creating_Paid_Order — completed');
  });

  /***
    * TC2: Assign paid seats after paid order creation, complete seat payment, and validate updated order details.
    * Expected: Paid seat assignment and payment complete successfully with order number available.
   */
  test('TC2_Verify_Paid_Seats_After_Creating_Paid_Order', async ({ testData, assert }) => {

    const seatType = testData.get('seatType') as Record<string, string>;
    const cardType = testData.get('cardType')?.toString()!;
    const cardNumber = testData.get('cardNumber')?.toString()!;
    const cardName = testData.get('cardName')?.toString()!;
    const cvv = testData.get('cvv')?.toString()!;
    const expirationDate = testData.get('expirationDate')?.toString()!;

    logger.info('TC2_Verify_Paid_Seats_After_Creating_Paid_Order — started');

    // ── Assign Seats ───────────────────────────────────────────────────────
    const seatAssignments = jsonhandler.parseSeatType(seatType);
    const assignmentEntries = Array.from(seatAssignments.entries());

    for (let i = 0; i < assignmentEntries.length; i++) {
      const segmentIndex = assignmentEntries[i][0];
      const paxEntries = assignmentEntries[i][1];

      logger.info(`Assigning paid seats for segment ${segmentIndex + 1}`);
      await seatSelectionPage.assignSeatsForSegment(segmentIndex, paxEntries);
    }

    // ── Verify Seat Assignments ────────────────────────────────────────────
    logger.info('Verifying seat assignments');
    const assignedSeats = await seatSelectionPage.getAssignedSeats();

    for (let i = 0; i < assignedSeats.length; i++) {
      await assert.notToBeNull(
        assignedSeats[i],
        `Verify seat assigned for passenger ${i + 1}`
      );
    }

    const charges = await seatSelectionPage.getPassengerCharges();

    for (let i = 0; i < charges.length; i++) {
      logger.info(`Passenger ${i + 1} seat charge: ${charges[i]}`);
    }

    // ── Save and Pay for Seats ─────────────────────────────────────────────
    await seatSelectionPage.clickSaveButton();

    logger.info('Processing seat payment for paid seats');
    await addPaymentToNewReservationPage.fillPayerDetails();
    await addPaymentToNewReservationPage.selectCardType(cardType);
    await addPaymentToNewReservationPage.clickOnContinueButton();

    await payByCreditCardPage.enterCardDetails(
      cardNumber,
      cardName,
      cvv,
      expirationDate
    );

    await payByCreditCardPage.clickOnCompletePaymentButton();

    const seatPaymentOrder =
      await bookingConfirmationPage.getPNRAndOrderNumber();

    await assert.notToBeNull(
      seatPaymentOrder.get('orderNumber'),
      'Verify order number is available after seat payment'
    );

    logger.info('TC2_Verify_Paid_Seats_After_Creating_Paid_Order — completed');
  });

  /***
    * TC3: Assign emergency-exit seats after paid order creation, complete seat payment, and validate order details.
    * Expected: Emergency-exit seat assignment and payment complete successfully with order number available.
   */
  test('TC3_Verify_Emergency_Exit_Seats_After_Creating_Paid_Order', async ({ testData, assert }) => {

    const seatType = testData.get('seatType') as Record<string, string>;
    const cardType = testData.get('cardType')?.toString()!;
    const cardNumber = testData.get('cardNumber')?.toString()!;
    const cardName = testData.get('cardName')?.toString()!;
    const cvv = testData.get('cvv')?.toString()!;
    const expirationDate = testData.get('expirationDate')?.toString()!;

    logger.info('TC3_Verify_Emergency_Exit_Seats_After_Creating_Paid_Order — started');

    // ── Assign Seats ───────────────────────────────────────────────────────
    const seatAssignments = jsonhandler.parseSeatType(seatType);
    const assignmentEntries = Array.from(seatAssignments.entries());

    for (let i = 0; i < assignmentEntries.length; i++) {
      const segmentIndex = assignmentEntries[i][0];
      const paxEntries = assignmentEntries[i][1];

      logger.info(`Assigning emergency-exit seats for segment ${segmentIndex + 1}`);
      await seatSelectionPage.assignSeatsForSegment(segmentIndex, paxEntries);
    }

    // ── Verify Seat Assignments ────────────────────────────────────────────
    logger.info('Verifying seat assignments');
    const assignedSeats = await seatSelectionPage.getAssignedSeats();

    for (let i = 0; i < assignedSeats.length; i++) {
      await assert.notToBeNull(
        assignedSeats[i],
        `Verify seat assigned for passenger ${i + 1}`
      );
    }

    const charges = await seatSelectionPage.getPassengerCharges();

    for (let i = 0; i < charges.length; i++) {
      logger.info(`Passenger ${i + 1} seat charge: ${charges[i]}`);
    }

    // ── Save and Pay for Seats ─────────────────────────────────────────────
    await seatSelectionPage.clickSaveButton();

    logger.info('Processing seat payment for emergency-exit seats');
    await addPaymentToNewReservationPage.fillPayerDetails();
    await addPaymentToNewReservationPage.selectCardType(cardType);
    await addPaymentToNewReservationPage.clickOnContinueButton();

    await payByCreditCardPage.enterCardDetails(
      cardNumber,
      cardName,
      cvv,
      expirationDate
    );

    await payByCreditCardPage.clickOnCompletePaymentButton();

    const seatPaymentOrder =
      await bookingConfirmationPage.getPNRAndOrderNumber();

    await assert.notToBeNull(
      seatPaymentOrder.get('orderNumber'),
      'Verify order number is available after seat payment'
    );

    logger.info('TC3_Verify_Emergency_Exit_Seats_After_Creating_Paid_Order — completed');
  });
});
