import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../utilities/blackpanther';

export default class homepage extends BlackPanther {
  private readonly welcomeMessage: Locator;
  private readonly newReservationLink: Locator;
  private readonly oneWayRadioButton: Locator;
  private readonly reservationsLink: Locator;
  private readonly roundTripRadioButton: Locator;
  private readonly rtFromDropDown: Locator;
  private readonly firstValueFromDropdown: Locator;
  private readonly firstValueToDropdown: Locator;
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

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.welcomeMessage = page.locator("header[class='spark-header'] h3");
    this.reservationsLink = page.locator('[role="menuitemcheckbox"]:has-text("Reservations")').last();
    this.newReservationLink = page.locator('[id=anchorLeftMenuReservationsNewReservation]').last();
    this.oneWayRadioButton = page.locator("label[id='lblRbxAvailabilityTripTypeOw'] span[class='spark-radio__box']").first();
    this.roundTripRadioButton = page.locator("label[id='lblRbxAvailabilityTripTypeRt'] span[class='spark-radio__box']");
    this.rtFromDropDown = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityAirportFrom')]").first();
    this.rtToDropDown = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityAirportTo')]").first();
    this.owFromDropDown = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityAirportFrom')]").last();
    this.owToDropDown = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityAirportTo')]").last();
    this.rtDepartureDateEditbox = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityDepDate')]").first();
    this.owDepartureDateEditbox = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityDepDate')]").last();
    this.arrivalDateEditbox = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityReturnDate')]");
    this.firstValueFromDropdown = page.locator("xpath=//button[contains(@id,'btnAvailabilityAirportFrom')]/following-sibling::ul//li[@class='ui-menu-item']").first();
    this.firstValueToDropdown = page.locator("xpath=//button[contains(@id,'btnAvailabilityAirportTo')]/following-sibling::ul//li[@class='ui-menu-item']").first();
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
    await this.welcomeMessage.waitFor({ state: 'visible' }); // Explicit wait
    return await this.welcomeMessage.textContent();
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
    }
  }

  async selectCityPair(tripType: string, origin: string, destination: string) {
    if (tripType.match('RT')) {
      await this.fill(this.rtFromDropDown, origin);
      await this.pressTab();
      await this.fill(this.rtToDropDown, destination);
      await this.pressTab();
    } else if (tripType.match('OW')) {
      await this.fill(this.owFromDropDown, origin);
      await this.pressTab();
      await this.fill(this.owToDropDown, destination);
      await this.pressTab();
    }
  }

  async selectTravelDates(tripType: string, todayPlusDate: string): Promise<void> {
    if (tripType.match('RT')) {
      await this.click(this.rtDepartureDateEditbox);
      await this.fill(this.rtDepartureDateEditbox, this.getTravelDates(tripType, todayPlusDate)[0]);
      await this.pressTab();
      await this.click(this.arrivalDateEditbox);
      await this.fill(this.arrivalDateEditbox, this.getTravelDates(tripType, todayPlusDate)[1]);
      await this.pressTab();
    } else if(tripType.match('OW')){
      await this.click(this.owDepartureDateEditbox);
      await this.fill(this.owDepartureDateEditbox, this.getTravelDates(tripType, todayPlusDate)[0]);
      await this.pressTab();
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
    if (this.plusIcon) {
      await this.click(this.plusIcon);
    }
    const offerRadioButton = await this.getOfferRadioButton(brandType);
    await this.click(offerRadioButton);
  }

  async clickOnBookButton(): Promise<void> {
    await this.click(this.bookButton);
  }

  async clickOnAgreeButton(): Promise<void> {
    await this.click(this.agreeButton);
  }

  async getOfferRadioButton(brandType: string): Promise<Locator> {
    const xpath = `xpath=//div[@class='row full-width']//span[contains(text(),'${brandType}')]/ancestor::div[@class='row full-width']/following-sibling::div[@class='custom-radioButton']`;
    return this.page.locator(xpath).first();
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
      console.log(originAndDestination);
      originAndDestinations.push(originAndDestination.trim());
    }
    return originAndDestinations;
  }
}