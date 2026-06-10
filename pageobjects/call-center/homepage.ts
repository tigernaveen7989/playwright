import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../../utilities/blackpanther';
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

export default class homepage extends BlackPanther {
  private readonly welcomeMessage: Locator;
  private readonly newReservationLink: Locator;
  private readonly oneWayRadioButton: Locator;
  private readonly reservationsLink: Locator;
  private readonly roundTripRadioButton: Locator;
  private readonly rtFromDropDown: Locator;
  private readonly rtToDropDown: Locator;
  private readonly rtDepartureDateEditbox: Locator;
  private readonly owDepartureDateEditbox: Locator;
  private readonly arrivalDateEditbox: Locator;
  private readonly adultEditbox: Locator;
  private readonly childEditbox: Locator;
  private readonly infantEditbox: Locator;
  private readonly infantWithSeatEditbox: Locator;
  private readonly shopButton: Locator;
  private readonly bookButton: Locator;
  private readonly plusIcon: Locator;
  private readonly agreeButton: Locator;
  private readonly flightSelectionList: Locator;
  private readonly owFromDropDown: Locator;
  private readonly owToDropDown: Locator;
  private readonly multiSegmentRadioButton: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.welcomeMessage = page.locator("header[class='spark-header'] h3");
    this.reservationsLink = page.locator('[role="menuitemcheckbox"]:has-text("Reservations")').last();
    this.newReservationLink = page.locator('[id=anchorLeftMenuReservationsNewReservation]').last();
    this.oneWayRadioButton = page.locator("label[id='lblRbxAvailabilityTripTypeOw'] span[class='spark-radio__box']").first();
    this.roundTripRadioButton = page.locator("label[id='lblRbxAvailabilityTripTypeRt'] span[class='spark-radio__box']");
    this.multiSegmentRadioButton = page.locator("label[id='lblRbxAvailabilityTripTypeMs'] span[class='spark-radio__box']");
    this.rtFromDropDown = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityAirportFrom')]").first();
    this.rtToDropDown = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityAirportTo')]").first();
    this.owFromDropDown = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityAirportFrom')]").last();
    this.owToDropDown = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityAirportTo')]").last();
    this.rtDepartureDateEditbox = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityDepDate')]").first();
    this.owDepartureDateEditbox = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityDepDate')]").last();
    this.arrivalDateEditbox = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityReturnDate')]");
    this.adultEditbox = page.locator("[id=numAvailabilityPtc_ADT]");
    this.childEditbox = page.locator("[id=numAvailabilityPtc_CNN]");
    this.infantEditbox = page.locator("[id=numAvailabilityPtc_INF]");
    this.infantWithSeatEditbox = page.locator("[id=numAvailabilityPtc_INS]");
    this.shopButton = page.locator("[id=btnAvailabilitySearchMs]").last();
    this.bookButton = page.locator('[id=btnAvailabilityCheckValidate]');
    this.plusIcon = page.locator('[id=add-0]');
    this.agreeButton = page.locator("[id=btnResGDPRModalClose]");
    this.flightSelectionList = page.locator("xpath=//div[contains(@data-bind,'kendoGridAvailSelection')]//table//tbody/tr");
  }

  async getWelcomeText(): Promise<string | null> {
    try {
      await this.welcomeMessage.waitFor({ state: 'visible', timeout: 60_000 });
    } catch {
      throw new Error('Welcome message was not visible within 60 seconds.');
    }

    return this.welcomeMessage.textContent();
  }

  async clickReservationsLink(): Promise<void> {
    await this.click(this.reservationsLink);
  }

  async clickNewReservationLink(): Promise<void> {
    await this.click(this.newReservationLink);
  }

  async selectTripType(tripType: string): Promise<void> {
    if (tripType.match('OW')) {
      await this.click(this.oneWayRadioButton);
    } else if (tripType.match('RT')) {
      await this.click(this.roundTripRadioButton);
    } else if (tripType.match('MS')) {
      await this.click(this.multiSegmentRadioButton);
    }
  }

  async selectCityPair(tripType: string, origin: string, destination: string) {
    if (tripType.match('RT')) {
      await this.fill(this.rtFromDropDown, origin + " ");
      await this.selectAirportFromSuggestions(origin);
      await this.fill(this.rtToDropDown, destination + " ");
      await this.selectAirportFromSuggestions(destination);
    } else if (tripType.match('OW')) {
      await this.fill(this.owFromDropDown, origin + " ");
      await this.selectAirportFromSuggestions(origin);
      await this.fill(this.owToDropDown, destination + " ");
      await this.selectAirportFromSuggestions(destination);
    } else if (tripType.match('MS')) {
      // MS origin/destination format: "BUD-BEG,BEG-TIV" (comma-separated segments)
      const segments = origin.includes(',') ? origin.split(',') : [origin + '-' + destination];
      for (let i = 0; i < segments.length; i++) {
        const [segOrigin, segDest] = segments[i].split('-').map(s => s.trim());
        const msFromLocator = this.page.locator(`#tbxAvailabilityOriginAirportCodeMs_${i}`);
        const msToLocator = this.page.locator(`#tbxAvailabilityDestAirportCodeMs_${i}`);
        await this.fill(msFromLocator, segOrigin + " ");
        await this.pressTab();
        await this.fill(msToLocator, segDest + " ");
        await this.pressTab();
      }
    }
  }

  private async selectAirportFromSuggestions(airportCode: string): Promise<void> {
    const escapedCode = airportCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const visibleSuggestions = this.page.locator("xpath=//li[contains(@class,'ui-menu-item') and not(contains(@style,'display: none'))]");

    await this.sleep(500);

    const exactCodeSuggestion = visibleSuggestions
      .filter({ hasText: new RegExp(`^\\s*${escapedCode}\\b`, 'i') })
      .first();

    if (await exactCodeSuggestion.count() > 0) {
      await this.click(exactCodeSuggestion);
      return;
    }

    const anyCodeSuggestion = visibleSuggestions
      .filter({ hasText: new RegExp(`\\b${escapedCode}\\b`, 'i') })
      .first();

    if (await anyCodeSuggestion.count() > 0) {
      await this.click(anyCodeSuggestion);
      return;
    }

    throw new Error(`No airport suggestion matched code '${airportCode}'.`);
  }

  /**
   * Selects the cabin type from the Cabin type dropdown on the search form.
   * The dropdown uses jqSimpleSelect which hides the native select and renders a custom UI.
   * Flow: Click the label to open the dropdown, then click the desired option text.
   *
   * @param cabinType - The cabin type to select, e.g. 'ECONOMY', 'BUSINESS'
   * @param tripType - The trip type: 'OW', 'RT', or 'MS' (default 'RT')
   */
  async selectCabinType(cabinType: string, tripType: string = 'RT'): Promise<void> {
    logger.info(`Selecting cabin type: ${cabinType}`);
    const cabinValueMap: Record<string, string> = {
      'ECONOMY': 'Y',
      'BUSINESS': 'J,C'
    };
    const optionValue = cabinValueMap[cabinType.toUpperCase()] || cabinType;
    // The visible cabin dropdown is inside spark-accordion__content-five; click label to activate then force select
    const cabinLabel = this.page.locator('.spark-accordion__content-five .new_reservation_cabin_type #lblDdlAvailabilitycabinType');
    await this.click(cabinLabel);
    await this.sleep(500); // Wait for dropdown to activate
    const cabinSelect = this.page.locator('.spark-accordion__content-five .new_reservation_cabin_type #ddlAvailabilitycabinType');
    await cabinSelect.selectOption({ value: optionValue }, { force: true });
    logger.info(`Cabin type '${cabinType}' selected`);
  }

  /**
   * Selects the currency type from the Currency To Display dropdown on the search form.
   * The dropdown uses jqSimpleSelect which hides the native select and renders a custom UI.
   * Flow: Click the label to open the dropdown, then click the desired currency code.
   *
   * @param currencyType - The currency code to select, e.g. 'EUR', 'USD', 'GBP'
   * @param tripType - The trip type: 'OW', 'RT', or 'MS' (default 'RT')
   */
  async selectCurrencyType(currencyType: string, tripType: string = 'RT'): Promise<void> {
    logger.info(`Selecting currency type: ${currencyType}`);
    // The visible currency dropdown is inside spark-accordion__content-five; click label to activate then force select
    const currencyLabel = this.page.locator('.spark-accordion__content-five .new_reservation_currency_to_display #lblDdlAvailabilityCurrency');
    await this.click(currencyLabel);
    await this.sleep(500); // Wait for dropdown to activate
    const currencySelect = this.page.locator('.spark-accordion__content-five .new_reservation_currency_to_display #ddlAvailabilityCurrency');
    await currencySelect.selectOption({ value: currencyType }, { force: true });
    logger.info(`Currency type '${currencyType}' selected`);
  }

  async selectTravelDates(tripType: string, todayPlusDate: string): Promise<void> {
    const travelDates = this.getTravelDates(tripType, todayPlusDate);

    if (tripType === 'RT') {
      await this.click(this.rtDepartureDateEditbox);
      await this.fill(this.rtDepartureDateEditbox, travelDates[0]);
      await this.pressTab();

      await this.click(this.arrivalDateEditbox);
      await this.fill(this.arrivalDateEditbox, travelDates[1]);
      await this.pressTab();
    } else if (tripType === 'OW') {
      await this.click(this.owDepartureDateEditbox);
      await this.fill(this.owDepartureDateEditbox, travelDates[0]);
      await this.pressTab();
    } else if (tripType === 'MS') {
      for (let i = 0; i < travelDates.length; i++) {
        const msDateLocator = this.page.locator(`#tbxavailabilitystartdatems_${i}`);
        await this.click(msDateLocator);
        await this.fill(msDateLocator, travelDates[i]);
        await this.pressTab();
      }
    } else {
      throw new Error(`Invalid tripType: ${tripType}`);
    }
  }

  async selectPassengers(paxType: string): Promise<void> {
    const adultMatch = paxType.match(/(\d+)A/);
    const childMatch = paxType.match(/(\d+)C/);
    const infantMatch = paxType.match(/(\d+)I(?!NS)/); // Match I not followed by NS
    const insMatch = paxType.match(/(\d+)INS/);

    const adultCount: string = adultMatch ? adultMatch[1] : "0";
    const childCount: string = childMatch ? childMatch[1] : "0";
    const infantCount: string = infantMatch ? infantMatch[1] : "0";
    const insCount: string = insMatch ? insMatch[1] : "0";

    await this.fill(this.adultEditbox, adultCount);
    await this.fill(this.childEditbox, childCount);
    await this.fill(this.infantEditbox, infantCount);
    await this.fill(this.infantWithSeatEditbox, insCount);
  }

  async clickOnShopButton(): Promise<void> {
    await this.click(this.shopButton);
  }

  async clickOnOfferRadioButton(brandType: string): Promise<void> {
    try {
      if (this.plusIcon) {
        await this.click(this.plusIcon);
      }
    } catch (e) {
      logger.info('Plus icon not visible, proceeding without clicking it.');

    }
    const offerRadioButton = await this.getOfferRadioButton(brandType);
    await this.click(offerRadioButton);
  }

  /**
   * Captures the fare amount displayed for a given brand on the Shop page.
   * Extracts the numeric fare from the brand container that matches the brandType text.
   * @param brandType - The brand name to capture fare for, e.g. 'STANDARD', 'COMFORT', 'BUSINESS'
   * @returns The fare amount as a number (e.g., 115.36)
   */
  async getFlightFareByBrand(brandType: string): Promise<number> {
    logger.info(`Capturing fare for brand: ${brandType}`);
    const brandContainer = this.page.locator(`xpath=//div[@class='row full-width']//span[contains(text(),'${brandType}')]/ancestor::div[contains(@class,'fare-container')]`).first();
    await brandContainer.waitFor({ state: 'visible', timeout: 30000 });
    const fareSpan = brandContainer.locator("span.normal_price span[data-bind*='Fare']").first();
    const fareText = await fareSpan.textContent() || '0';
    const fare = parseFloat(fareText.trim());
    logger.info(`Shop fare for brand '${brandType}': ${fare}`);
    return fare;
  }

  async clickOnBookButton(): Promise<void> {
    await this.click(this.bookButton);
  }

  async clickOnAgreeButton(): Promise<void> {
    try {
      await this.agreeButton.waitFor({ state: 'visible', timeout: 10_000 });
      await this.click(this.agreeButton);
    } catch {
      // If the agree button does not appear, continue without action.
    }
  }

  async getOfferRadioButton(brandType: string): Promise<Locator> {
    const locator = this.page.locator(
      `//div[@class='row full-width']//span[contains(text(),'${brandType}')]/ancestor::div[@class='row full-width']/following-sibling::div[@class='custom-radioButton']`
    );

    const count = await locator.count();

    logger.info(`Found ${count} radio button locator(s) for brand type: ${brandType}`);

    for (let i = 0; i < count; i++) {
      const element = locator.nth(i);

      try {
        if (
          await element.isVisible() &&
          await element.isEnabled()
        ) {
          logger.info(`Returning visible and enabled locator at index: ${i}`);
          return element;
        }
      } catch (error) {
        logger.info(`Locator at index ${i} is not usable`);
      }
    }

    throw new Error(`No visible and enabled radio button found for brand type: ${brandType}`);
  }

  async getDepartureDateAndTimes(): Promise<string[]> {
    const departureDateAndTimes: string[] = [];

    const rowCount = await this.flightSelectionList.count();

    for (let i = 0; i < rowCount; i++) {
      const row = this.flightSelectionList.nth(i);
      const columnText = await row.locator('td').nth(3).innerText(); // 3rd column
      const departureTimeAndDate = columnText.split(" ")[3] + " " + columnText.split(" ")[4];
      departureDateAndTimes.push(departureTimeAndDate.trim());
    }
    return departureDateAndTimes;
  }

  async getArrivalDateAndTimes(): Promise<string[]> {
    const arrivalDateAndTimes: string[] = [];

    const rowCount = await this.flightSelectionList.count();

    for (let i = 0; i < rowCount; i++) {
      const row = this.flightSelectionList.nth(i);
      const columnText = await row.locator('td').nth(3).innerText(); // 3rd column
      const arrivalTimeAndDate = columnText.split(" ")[3] + " " + columnText.split(" ")[5];
      arrivalDateAndTimes.push(arrivalTimeAndDate.trim());
    }
    return arrivalDateAndTimes;
  }

  async getOriginAndDestinations(): Promise<string[]> {
    const originAndDestinations: string[] = [];
    await this.flightSelectionList.first().waitFor({ state: 'visible' });
    const rowCount = await this.flightSelectionList.count();

    for (let i = 0; i < rowCount; i++) {
      const row = this.flightSelectionList.nth(i);
      const columnText: any = await row.locator('td').nth(2).textContent(); // 3rd column
      const originAndDestination = columnText.split(" ")[2];
      originAndDestinations.push(originAndDestination.trim());
    }
    return originAndDestinations;
  }
}