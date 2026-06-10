import { Page, Locator, TestInfo } from '@playwright/test';
import { BlackPanther } from '../../utilities/blackpanther';
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

export default class bookingconfirmationpage extends BlackPanther {
  private readonly pnrAndOrderIdText: Locator;
  private readonly flightDetailsListInItineraryTable: Locator;
  private readonly passengerDetailsInPassengersTable: Locator;
  private readonly priceGuaranteeTimeLimitText: Locator;
  private readonly paymentTimeLimitText: Locator;
  private readonly assignSeatsLink: Locator;
  private readonly servicesTab: Locator;
  private readonly serviceSummaryRows: Locator;
  private testInfo: TestInfo;

  constructor(page: Page, testInfo: TestInfo) {
    super(page);
    this.page = page;
    this.testInfo = testInfo;
    this.pnrAndOrderIdText = page.locator("span[data-bind='text: resStatusHeaderDisplay']");
    this.flightDetailsListInItineraryTable = page.locator("xpath=//tr[contains(@data-bind,'displaySelectedFlightDetailsModal')]");
    this.passengerDetailsInPassengersTable = page.locator("xpath=//tr[@class='k-state-selected']");
    this.priceGuaranteeTimeLimitText = page.locator('body > div:nth-child(1) > main:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(3) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(5) > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(5) > div:nth-child(1) > span:nth-child(1)');
    this.paymentTimeLimitText = page.locator('body > div:nth-child(1) > main:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(3) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(5) > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(6) > div:nth-child(1) > span:nth-child(1)');
    this.assignSeatsLink = page.locator('#anchorLeftMenuReservationsAssignSeats').and(page.locator(':visible')).first();
    this.servicesTab = page.locator('#servicesTab');
    this.serviceSummaryRows = page.locator('#kendoGridSsrs .k-grid-content tbody[role="rowgroup"] tr.k-master-row');

  }

  /**
   * Clicks the Assign Seats link in the left navigation menu on the booking confirmation screen.
   * Opens the seat assignment popup modal. Uses .first() to resolve the visible instance
   * since the menu renders the same link ID in multiple DOM locations.
   */
  async clickOnAssignSeatsLink(): Promise<void> {
    await this.click(this.assignSeatsLink);
    await this.sleep(3000);
    logger.info('Assign Seats link clicked and popup loaded');
  }

  /**
   * Opens the Services tab on booking confirmation to view ancillary service details.
   */
  async clickOnServicesTab(): Promise<void> {
    logger.info('Clicking Services tab on booking confirmation');
    await this.click(this.servicesTab);
    await this.waitForElement(this.serviceSummaryRows.first(), 'visible');
    logger.info('Services tab opened');
  }

  /**
   * Reads ancillary rows from the Services tab grid.
   * Captures ancillary name, price, passenger, and segment for each row.
   * @returns Map with key 'services' and value array of ancillary detail objects.
   */
  async getServiceTabAncillaryDetails(): Promise<Map<string, unknown>> {
    logger.info('Reading ancillary services from Services tab grid');
    const result = new Map<string, unknown>();
    const services: Array<{ ancillaryName: string; price: string; passenger: string; segment: string }> = [];

    const rowCount = await this.serviceSummaryRows.count();
    for (let i = 0; i < rowCount; i++) {
      const row = this.serviceSummaryRows.nth(i);
      const ancillaryName = (await row.locator('td:nth-child(2)').innerText()).trim();
      const passenger = (await row.locator('td:nth-child(4)').innerText()).trim();
      const segment = (await row.locator('td:nth-child(5)').innerText()).trim();
      const price = (await row.locator('td:nth-child(9)').innerText()).trim();
      services.push({ ancillaryName, price, passenger, segment });
      logger.info(`Service tab row ${i + 1}: ancillary='${ancillaryName}', price='${price}', passenger='${passenger}', segment='${segment}'`);
    }

    result.set('services', services);
    logger.info(`Services tab ancillary count=${services.length}`);
    return result;
  }

  async getPNRAndOrderNumber(): Promise<Map<string, string>> {
    const pnrAndOrderNumberMap: Map<string, string> = new Map<string, string>();
    await this.sleep(30000);

    await this.pnrAndOrderIdText.waitFor({ state: 'visible', timeout: 3000 });
    const rawText: string | null = await this.pnrAndOrderIdText.textContent();

    const pnrNumber: any = rawText?.split(" ")[0];
    const orderNumber: any = rawText?.split(" ")[2];
    pnrAndOrderNumberMap.set("pnrNumber", pnrNumber.trim());
    pnrAndOrderNumberMap.set("orderNumber", orderNumber.trim());

    // Add to Playwright report
    this.testInfo.annotations.push({
      type: 'PNRNumber',
      description: pnrNumber
    });

    this.testInfo.annotations.push({
      type: 'OrderId',
      description: orderNumber
    });

    return pnrAndOrderNumberMap;
  }


  async getOriginAndDestinations(): Promise<string[]> {
    const originDestinations: string[] = [];
    await this.flightDetailsListInItineraryTable.first().waitFor({ state: 'visible' });
    const rowCount = await this.flightDetailsListInItineraryTable.count();

    for (let i = 0; i < rowCount; i++) {
      const row = this.flightDetailsListInItineraryTable.nth(i);
      const columnText: any = await row.locator('td').nth(3).textContent(); // 3rd column
      originDestinations.push(columnText.trim());
    }

    return originDestinations;
  }

  async getDepartureDateAndTimes(): Promise<string[]> {
    const departureDateAndTimes: string[] = [];
    await this.flightDetailsListInItineraryTable.first().waitFor({ state: 'visible' });
    const rowCount = await this.flightDetailsListInItineraryTable.count();

    for (let i = 0; i < rowCount; i++) {
      const row = this.flightDetailsListInItineraryTable.nth(i);
      const columnText = await row.locator('td').nth(4).innerText(); // 3rd column
      departureDateAndTimes.push(columnText.trim());
    }

    return departureDateAndTimes;
  }

  async getArrivalDateAndTimes(): Promise<string[]> {
    const arrivalDateAndTimes: string[] = [];
    await this.flightDetailsListInItineraryTable.first().waitFor({ state: 'visible' });
    const rowCount = await this.flightDetailsListInItineraryTable.count();

    for (let i = 0; i < rowCount; i++) {
      const row = this.flightDetailsListInItineraryTable.nth(i);
      const columnText = await row.locator('td').nth(5).innerText(); // 3rd column
      arrivalDateAndTimes.push(columnText.trim());
    }

    return arrivalDateAndTimes;
  }

  async getPriceGuaranteeTimeLimitText(): Promise<string> {
    await this.priceGuaranteeTimeLimitText.waitFor({ state: 'visible', timeout: 3000 });
    const text: string = await this.priceGuaranteeTimeLimitText.textContent() ?? '';
    return text;
  }

  async getPaymentTimeLimitText(): Promise<string> {
    await this.paymentTimeLimitText.waitFor({ state: 'visible', timeout: 3000 });
    const text: string = await this.paymentTimeLimitText.textContent() ?? '';
    return text;
  }

}