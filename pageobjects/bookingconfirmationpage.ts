import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../utilities/blackpanther';

export default class bookingconfirmationpage extends BlackPanther {
  private readonly pnrAndOrderIdText: Locator;
  private readonly flightDetailsListInItineraryTable: Locator;
  private readonly passengerDetailsInPassengersTable: Locator;
  private readonly priceGuaranteeTimeLimitText: Locator;
  private readonly paymentTimeLimitText: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.pnrAndOrderIdText = page.locator("span[data-bind='text: resStatusHeaderDisplay']");
    this.flightDetailsListInItineraryTable = page.locator("xpath=//tr[contains(@data-bind,'displaySelectedFlightDetailsModal')]");
    this.passengerDetailsInPassengersTable = page.locator("xpath=//tr[@class='k-state-selected']");
    this.priceGuaranteeTimeLimitText = page.locator('body > div:nth-child(1) > main:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(3) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(5) > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(5) > div:nth-child(1) > span:nth-child(1)');
    this.paymentTimeLimitText = page.locator('body > div:nth-child(1) > main:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(3) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(5) > div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(6) > div:nth-child(1) > span:nth-child(1)');

  }

  async getPNRAndOrderNumber(): Promise<Map<string, string>> {
    const pnrAndOrderNumberMap: Map<string, string> = new Map<string, string>();
    await this.sleep(20000);

    await this.pnrAndOrderIdText.waitFor({ state: 'visible', timeout: 3000 });
    const rawText: string | null = await this.pnrAndOrderIdText.textContent();

    const pnrNumber: any = rawText?.split(" ")[0];
    const orderNumber: any = rawText?.split(" ")[2];
    pnrAndOrderNumberMap.set("pnrNumber", pnrNumber.trim());
    pnrAndOrderNumberMap.set("orderNumber", orderNumber.trim());

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