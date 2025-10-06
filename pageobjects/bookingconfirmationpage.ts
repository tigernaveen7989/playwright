import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../utilities/blackpanther';

export default class bookingconfirmationpage extends BlackPanther {
  private readonly pnrAndOrderIdText: Locator;
  private readonly flightDetailsListInItineraryTable: Locator;
  private readonly passengerDetailsInPassengersTable: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.pnrAndOrderIdText = page.locator("span[data-bind='text: resStatusHeaderDisplay']");
    this.flightDetailsListInItineraryTable = page.locator("xpath=//tr[contains(@data-bind,'displaySelectedFlightDetailsModal')]");
    this.passengerDetailsInPassengersTable = page.locator("xpath=//tr[@class='k-state-selected']");

  }

  async getPNRAndOrderNumber(): Promise<Map<string, string>> {
    const pnrAndOrderNumberMap: Map<string, string> = new Map<string, string>();
    await this.sleep(20000);

    await this.pnrAndOrderIdText.waitFor({ state: 'visible' });
    const rawText: string | null = await this.pnrAndOrderIdText.textContent();

    const pnrNumber: any = rawText?.split(" ")[0];
    const orderNumber: any = rawText?.split(" ")[2];
    pnrAndOrderNumberMap.set("pnrNumber", pnrNumber.trim());
    pnrAndOrderNumberMap.set("orderNumber", orderNumber.trim());

    return pnrAndOrderNumberMap;
  }


  async getOriginAndDestinations(): Promise<string[]> {
    const originDestinations: string[] = [];
    await this.flightDetailsListInItineraryTable.first().waitFor({state:'visible'});
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
    await this.flightDetailsListInItineraryTable.first().waitFor({state:'visible'});
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
    await this.flightDetailsListInItineraryTable.first().waitFor({state:'visible'});
    const rowCount = await this.flightDetailsListInItineraryTable.count();

    for (let i = 0; i < rowCount; i++) {
      const row = this.flightDetailsListInItineraryTable.nth(i);
      const columnText = await row.locator('td').nth(5).innerText(); // 3rd column
      arrivalDateAndTimes.push(columnText.trim());
    }

    return arrivalDateAndTimes;
  }

}