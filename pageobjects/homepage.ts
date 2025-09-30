import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../utilities/blackpanther';

export default class homepage extends BlackPanther {
  private readonly welcomeMessage: Locator;
  private readonly newReservationLink: Locator;
  private readonly oneWayRadioButton: Locator;
  private readonly reservationsLink: Locator;
  private readonly roundTripRadioButton: Locator;
  private readonly fromDropDown: Locator;
  private readonly firstValueFromDropdown: Locator;
  private readonly firstValueToDropdown: Locator;
  private readonly toDropDown: Locator;
  private readonly departureDateEditbox: Locator;
  private readonly arrivalDateEditbox: Locator;
  private readonly adultEditbox: Locator;
  private readonly childEditbox: Locator;
  private readonly infantEditbox: Locator;
  private readonly infantWithSeatEditbox: Locator;
  private readonly shopButton: Locator;
  private readonly bookButton: Locator;
  private readonly plusIcon: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.welcomeMessage = page.locator("header[class='spark-header'] h3");
    this.reservationsLink = page.locator('[role="menuitemcheckbox"]:has-text("Reservations")').last();
    this.newReservationLink = page.locator('[id=anchorLeftMenuReservationsNewReservation]').last();
    this.oneWayRadioButton = page.locator("label[id='lblRbxAvailabilityTripTypeOw'] span[class='spark-radio__box']").first();
    this.roundTripRadioButton = page.locator("label[id='lblRbxAvailabilityTripTypeRt'] span[class='spark-radio__box']");
    this.fromDropDown = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityAirportFrom')]").first();
    this.toDropDown = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityAirportTo')]").first();
    this.departureDateEditbox = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityDepDate')]").first();
    this.arrivalDateEditbox = page.locator("xpath=//input[starts-with(@id, 'tbxAvailabilityReturnDate')]");
    this.firstValueFromDropdown = page.locator("xpath=//button[contains(@id,'btnAvailabilityAirportFrom')]/following-sibling::ul//li[@class='ui-menu-item']").first();
    this.firstValueToDropdown = page.locator("xpath=//button[contains(@id,'btnAvailabilityAirportTo')]/following-sibling::ul//li[@class='ui-menu-item']").first();
    this.adultEditbox = page.locator("[id=numAvailabilityPtc_ADT]");
    this.childEditbox = page.locator("[id=numAvailabilityPtc_CNN]");
    this.infantEditbox = page.locator("[id=numAvailabilityPtc_INF]");
    this.infantWithSeatEditbox = page.locator("[id=numAvailabilityPtc_INS]");
    this.shopButton = page.locator("[id=btnAvailabilitySearchMs]");
    this.bookButton = page.locator('[id=btnAvailabilityCheckValidate]');
    this.plusIcon = page.locator('[id=add-0]');
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
    // await this.selectValueFromDropdown(this.fromDropDown, origin);
    // await this.selectValueFromDropdown(this.toDropDown, destination);
    await this.fill(this.fromDropDown, origin);
    await this.pressTab();
    await this.fill(this.toDropDown, destination);
    await this.pressTab();
  }

  async selectTravelDates(tripType: string, todayPlusDate: string): Promise<void> {
    await this.click(this.departureDateEditbox);
    await this.fill(this.departureDateEditbox, this.getTravelDates(tripType, todayPlusDate)[0]);
    await this.pressTab();
    if (tripType.match('RT')) {
      await this.click(this.arrivalDateEditbox);
      await this.fill(this.arrivalDateEditbox, this.getTravelDates(tripType, todayPlusDate)[1]);
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

  async getOfferRadioButton(brandType: string): Promise<Locator> {
    const xpath = `xpath=//div[@class='row full-width']//span[contains(text(),'${brandType}')]/ancestor::div[@class='row full-width']/following-sibling::div[@class='custom-radioButton']`;
    return this.page.locator(xpath).first();
  }
}