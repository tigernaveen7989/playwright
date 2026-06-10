import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../../utilities/blackpanther';
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

/**
 * AirExchangePage — handles the Modify Air Reservation (Exchange) workflow
 * including clicking edit, selecting exchange option, entering new dates,
 * shopping for flights, selecting a flight, booking, and confirming the modify summary.
 */
export default class AirExchangePage extends BlackPanther {

  // Edit (pencil) icon on booking confirmation to open Modify Reservation
  private readonly editPencilIcon: Locator;

  // Exchange option dropdown for each segment (new reshop UI)
  private readonly exchangeOptionDropdownSegment0: Locator;
  private readonly exchangeOptionDropdownSegment1: Locator;

  // Departure date inputs in the reshop form
  private readonly reshopDepartureDateSegment0: Locator;
  private readonly reshopDepartureDateSegment1: Locator;

  // Shop button inside the modify/reshop form
  private readonly reshopShopButton: Locator;

  // Flight selection list in reshop results
  private readonly reshopFlightSelectionList: Locator;

  // Book button inside the reshop availability results
  private readonly reshopBookButton: Locator;

  // Modify Summary popup - Continue button
  private readonly modifySummaryContinueButton: Locator;

  // Modify Summary popup - Cancel button
  private readonly modifySummaryCancelButton: Locator;

  // Modify Summary popup - Previous button
  private readonly modifySummaryPreviousButton: Locator;

  // Balance Due amount field on booking confirmation
  private readonly balanceDueInput: Locator;

  // Add Pay button on booking confirmation
  private readonly addPayButton: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;

    // Pencil icon that opens the Modify Air Reservation dialog
    this.editPencilIcon = page.locator("xpath=//i[@class='spark-icon spark-icon-pencil spark-icon--md']").last();

    // Exchange option dropdowns for segment 0 and segment 1
    this.exchangeOptionDropdownSegment0 = page.locator('#ddlResExchangeOption_0');
    this.exchangeOptionDropdownSegment1 = page.locator('#ddlResExchangeOption_1');

    // Departure date fields in the reshop form
    this.reshopDepartureDateSegment0 = page.locator('#tbxReShopAvailabilityDepDateOw_0');
    this.reshopDepartureDateSegment1 = page.locator('#tbxReShopAvailabilityDepDateOw_1');

    // Shop button (visible in modify mode with new exchange UI)
    this.reshopShopButton = page.locator("#btnAvailabilitySearchMs[data-bind*='reshopShopping']");

    // Flight selection radio buttons in reshop results
    this.reshopFlightSelectionList = page.locator("xpath=//div[contains(@data-bind,'kendoGridAvailSelection')]//table//tbody/tr");

    // Book button inside the reshop results
    this.reshopBookButton = page.locator('#btnAvailabilityCheckValidate');

    // Modify Summary popup buttons
    this.modifySummaryContinueButton = page.locator('#btnCancelReservationContinue').last();
    this.modifySummaryCancelButton = page.locator('#btnCancelReservationCancel');
    this.modifySummaryPreviousButton = page.locator('#btnCancelReservationPrevious');

    // Balance Due and Add Pay on booking confirmation after exchange
    this.balanceDueInput = page.locator('#tbxResBalanceDuePax_0');
    this.addPayButton = page.locator('#btnAddResPaymentPax_0');
  }

  /**
   * Clicks the edit (pencil) icon on the booking confirmation page to open the Modify Reservation dialog.
   * This initiates the air exchange workflow.
   */
  async clickEditPencilIcon(): Promise<void> {
    logger.info('Clicking edit pencil icon to open Modify Reservation dialog');
    await this.click(this.editPencilIcon);
    await this.sleep(3000); // Wait for the modify dialog to fully load
    logger.info('Modify Reservation dialog opened');
  }

  /**
   * Selects the exchange option (Exchange/Retain/Delete) from the dropdown for a given segment.
   * @param segmentIndex - The zero-based index of the segment (0 or 1)
   * @param option - The option to select: "Exchange", "Retain", or "Delete"
   */
  async selectExchangeOption(segmentIndex: number, option: string): Promise<void> {
    logger.info(`Selecting exchange option '${option}' for segment ${segmentIndex}`);
    const dropdown = segmentIndex === 0 ? this.exchangeOptionDropdownSegment0 : this.exchangeOptionDropdownSegment1;
    await this.selectValueFromDropdown(dropdown, option);
    await this.sleep(1000);
    logger.info(`Exchange option '${option}' selected for segment ${segmentIndex}`);
  }

  /**
   * Enters the departure date for a given segment in the reshop form.
   * @param segmentIndex - The zero-based index of the segment (0 or 1)
   * @param date - The date string to enter (e.g., "12/07/2026" in the tenant's date format)
   */
  async enterDepartureDate(segmentIndex: number, date: string): Promise<void> {
    logger.info(`Entering departure date '${date}' for segment ${segmentIndex}`);
    const dateInput = segmentIndex === 0 ? this.reshopDepartureDateSegment0 : this.reshopDepartureDateSegment1;
    await dateInput.waitFor({ state: 'visible', timeout: 10000 });
    await dateInput.click();
    await dateInput.clear();
    await dateInput.fill(date);
    await this.pressTab(1);
    await this.sleep(1000);
    logger.info(`Departure date '${date}' entered for segment ${segmentIndex}`);
  }

  /**
   * Enters the new travel dates for the exchange based on tripType and todayPlusDate.
   * Uses the BlackPanther getTravelDates method for tenant-aware date formatting.
   * @param tripType - The trip type: "OW" or "RT"
   * @param todayPlusDate - Comma-separated days to add (e.g., "10,15" for RT or "10" for OW)
   */
  async enterExchangeTravelDates(tripType: string, todayPlusDate: string): Promise<void> {
    logger.info(`Entering exchange travel dates: tripType=${tripType}, todayPlusDate=${todayPlusDate}`);
    const dates: string[] = await this.getTravelDates(tripType, todayPlusDate);
    await this.enterDepartureDate(0, dates[0]);
    if (tripType === 'RT' && dates.length > 1 || tripType == "MS" && dates.length>1) {
      await this.enterDepartureDate(1, dates[1]);
    }
    logger.info('Exchange travel dates entered successfully');
  }

  /**
   * Clicks the Shop button inside the Modify/Reshop form to search for available flights.
   */
  async clickShopButton(): Promise<void> {
    logger.info('Clicking Shop button in reshop form');
    await this.click(this.reshopShopButton);
    await this.sleep(5000); // Wait for reshop results to load
    logger.info('Shop button clicked, waiting for reshop results');
  }

  /**
   * Selects the first available flight offer from the reshop results by brand type.
   * Clicks the radio button associated with the specified brand type.
   * @param brandType - The brand type to select, e.g. "ECONOMY", "STANDARD"
   */
  async selectFlightOffer(brandType: string): Promise<void> {
    logger.info(`Selecting flight offer for cabin type: ${brandType}`);
    const offerRadioButton = this.page.locator(`xpath=//div[@class='row full-width']//span[contains(text(),'${brandType}')]/ancestor::div[@class='row full-width']/following-sibling::div[@class='custom-radioButton']`).first();
    await offerRadioButton.waitFor({ state: 'visible', timeout: 30000 });
    await this.click(offerRadioButton);
    await this.sleep(2000);
    logger.info(`Flight offer selected for cabin type: ${brandType}`);
  }

  /**
   * Retrieves all brand names and their fare amounts from the reshop results page.
   * Iterates through all fare-container elements and extracts brand name + fare.
   * @returns Array of objects containing brandName and fare for each available offer
   */
  async getAllBrandFares(): Promise<Array<{ brandName: string; fare: number; index: number }>> {
    logger.info('Extracting all brand fares from reshop results');
    const fareContainers = this.page.locator("div.fare-container");
    await fareContainers.first().waitFor({ state: 'visible', timeout: 30000 });
    const count = await fareContainers.count();
    const brandFares: Array<{ brandName: string; fare: number; index: number }> = [];

    for (let i = 0; i < count; i++) {
      const container = fareContainers.nth(i);
      const brandSpan = container.locator("span[class='brand-design']");
      const fareSpan = container.locator("span.normal_price span[data-bind*='Fare']").first();

      if (await brandSpan.count() > 0 && await fareSpan.count() > 0) {
        const brandName = (await brandSpan.textContent() || '').trim();
        const fareText = (await fareSpan.textContent() || '0').trim();
        const fare = parseFloat(fareText);
        if (brandName && !isNaN(fare)) {
          brandFares.push({ brandName, fare, index: i });
          logger.info(`Reshop offer [${i}]: brand='${brandName}', fare=${fare}`);
        }
      }
    }
    logger.info(`Total reshop offers found: ${brandFares.length}`);
    return brandFares;
  }

  /**
   * Selects a flight on the Reshop page that has the same brand and same fare as the Shop page.
   * Used for Even Exchange scenarios where no additional payment should be required.
   * @param shopFare - The fare amount captured from the Shop page
   * @param brandType - The brand type to match, e.g. 'STANDARD', 'COMFORT'
   * @returns The fare of the selected reshop flight
   */
  async selectFlightForEvenExchange(shopFare: number, brandType: string): Promise<number> {
    logger.info(`Selecting flight for Even Exchange: shopFare=${shopFare}, brandType=${brandType}`);
    const allFares = await this.getAllBrandFares();

    // Find a flight with same brand and fare <= shopFare (even exchange = no extra payment)
    const matchingFlight = allFares.find(
      offer => offer.brandName.toUpperCase().includes(brandType.toUpperCase()) && offer.fare <= shopFare
    );

    if (!matchingFlight) {
      throw new Error(`No matching fare found for Even Exchange. Shop fare: ${shopFare}, Brand: ${brandType}. Available reshop fares: ${JSON.stringify(allFares)}`);
    }

    logger.info(`Even Exchange match found: brand='${matchingFlight.brandName}', fare=${matchingFlight.fare}`);

    // Click the radio button for the matching offer
    const fareContainers = this.page.locator("div.fare-container");
    const matchedContainer = fareContainers.nth(matchingFlight.index);
    const radioButton = matchedContainer.locator("div.custom-radioButton");
    await this.click(radioButton);
    await this.sleep(2000);

    logger.info(`Even Exchange flight selected: fare=${matchingFlight.fare} (shopFare=${shopFare})`);
    return matchingFlight.fare;
  }

  /**
   * Selects a flight on the Reshop page that has a higher fare than the Shop page.
   * Used for Add Collect Exchange scenarios where additional payment is required.
   * Selects the lowest available fare that is greater than the original shop fare.
   * @param shopFare - The fare amount captured from the Shop page
   * @param brandType - The brand type to match, e.g. 'BUSINESS', 'COMFORT'
   * @returns The fare of the selected reshop flight
   */
  async selectFlightForAddCollectExchange(shopFare: number, brandType: string): Promise<number> {
    logger.info(`Selecting flight for Add Collect Exchange: shopFare=${shopFare}, brandType=${brandType}`);
    const allFares = await this.getAllBrandFares();

    // Find flights with matching brand and fare > shopFare
    const higherFareFlights = allFares
      .filter(offer => offer.brandName.toUpperCase().includes(brandType.toUpperCase()) && offer.fare > shopFare)
      .sort((a, b) => a.fare - b.fare); // Sort ascending to get lowest higher fare

    if (higherFareFlights.length === 0) {
      throw new Error(`No higher price flight found for Add Collect Exchange. Shop fare: ${shopFare}, Brand: ${brandType}. Available reshop fares: ${JSON.stringify(allFares)}`);
    }

    const selectedFlight = higherFareFlights[0]; // Lowest fare that is still > shopFare
    logger.info(`Add Collect match found: brand='${selectedFlight.brandName}', fare=${selectedFlight.fare}`);

    // Click the radio button for the matching offer
    const fareContainers = this.page.locator("div.fare-container");
    const matchedContainer = fareContainers.nth(selectedFlight.index);
    const radioButton = matchedContainer.locator("div.custom-radioButton");
    await this.click(radioButton);
    await this.sleep(2000);

    logger.info(`Add Collect flight selected: fare=${selectedFlight.fare} (shopFare=${shopFare}, diff=${(selectedFlight.fare - shopFare).toFixed(2)})`);
    return selectedFlight.fare;
  }

  /**
   * Clicks the Book button in the reshop results to proceed with the exchange booking.
   */
  async clickBookButton(): Promise<void> {
    logger.info('Clicking Book button in reshop results');
    await this.click(this.reshopBookButton);
    await this.sleep(5000); // Wait for Modify Summary popup to appear
    logger.info('Book button clicked, Modify Summary popup should appear');
  }

  /**
   * Clicks the Continue button on the Modify Summary popup to confirm the exchange.
   */
  async clickModifySummaryContinueButton(): Promise<void> {
    logger.info('Clicking Continue button on Modify Summary popup');
    await this.modifySummaryContinueButton.waitFor({ state: 'visible', timeout: 30000 });
    await this.click(this.modifySummaryContinueButton);
    await this.sleep(5000); // Wait for exchange to complete
    logger.info('Continue button clicked on Modify Summary popup');
  }

  /**
   * Clicks the Cancel button on the Modify Summary popup.
   */
  async clickModifySummaryCancelButton(): Promise<void> {
    logger.info('Clicking Cancel button on Modify Summary popup');
    await this.click(this.modifySummaryCancelButton);
    logger.info('Cancel button clicked on Modify Summary popup');
  }

  /**
   * Retrieves the Balance Due amount displayed on the booking confirmation page.
   * @returns The balance due amount as a string (e.g., "EUR 45.00")
   */
  async getBalanceDueAmount(): Promise<string> {
    logger.info('Retrieving Balance Due amount');
    await this.balanceDueInput.waitFor({ state: 'visible', timeout: 10000 });
    const amount = await this.balanceDueInput.inputValue();
    logger.info(`Balance Due amount: ${amount}`);
    return amount;
  }

  /**
   * Retrieves the Balance Due amount as a numeric value.
   * Strips any currency symbols/text and returns a parsed float.
   * Returns 0 if the field is empty or cannot be parsed.
   * @returns The balance due amount as a number
   */
  async getBalanceDueAmountAsNumber(): Promise<number> {
    const rawAmount = await this.getBalanceDueAmount();
    // Strip non-numeric characters except dot and minus (handles formats like "EUR 45.00", "$50.00", "45.00")
    const numericString = rawAmount.replace(/[^0-9.\-]/g, '').trim();
    const parsedAmount = parseFloat(numericString);
    const result = isNaN(parsedAmount) ? 0 : parsedAmount;
    logger.info(`Balance Due parsed as number: ${result} (raw: '${rawAmount}')`);
    return result;
  }

  /**
   * Clicks the Add Pay button on the booking confirmation page to initiate payment for balance due.
   */
  async clickAddPayButton(): Promise<void> {
    logger.info('Clicking Add Pay button for balance due payment');
    await this.click(this.addPayButton);
    await this.sleep(3000); // Wait for payment form to load
    logger.info('Add Pay button clicked, payment form should appear');
  }

  /**
   * Performs the complete air exchange flow:
   * 1. Click edit pencil icon
   * 2. Select "Exchange" option for all segments
   * 3. Enter new travel dates
   * 4. Click Shop
   * 5. Select a flight based on ExchangeType
   * 6. Click Book
   * 7. Click Continue on Modify Summary
   * @param tripType - The trip type: "OW", "RT", or "MS"
   * @param todayPlusDate - Comma-separated days to add for new dates (e.g., "20,25")
   * @param brandType - The cabin/brand type to select from reshop results (e.g., "STANDARD", "COMFORT")
   * @param exchangeType - The exchange type: "EvenExchange" or "AddCollect" (default uses selectFlightOffer)
   * @param shopFare - The fare captured from the Shop page for comparison (required for EvenExchange/AddCollect)
   * @returns The reshop fare selected (0 if default flow used)
   */
  async performAirExchange(tripType: string, todayPlusDate: string, brandType: string, exchangeType: string = '', shopFare: number = 0): Promise<number> {
    logger.info(`Starting air exchange flow: tripType=${tripType}, todayPlusDate=${todayPlusDate}, brandType=${brandType}, exchangeType=${exchangeType}, shopFare=${shopFare}`);
    await this.clickEditPencilIcon();
    await this.selectExchangeOption(0, 'Exchange');
    if (tripType === 'RT' || tripType === 'MS') {
      await this.selectExchangeOption(1, 'Exchange');
    }
    await this.enterExchangeTravelDates(tripType, todayPlusDate);
    await this.clickShopButton();

    let reshopFare = 0;
    if (exchangeType === 'EvenExchange') {
      reshopFare = await this.selectFlightForEvenExchange(shopFare, brandType);
    } else if (exchangeType === 'AddCollect') {
      reshopFare = await this.selectFlightForAddCollectExchange(shopFare, brandType);
    } else {
      await this.selectFlightOffer(brandType);
    }

    await this.clickBookButton();
    await this.clickModifySummaryContinueButton();
    logger.info('Air exchange flow completed successfully');
    return reshopFare;
  }
}
