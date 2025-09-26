import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../utilities/blackpanther';

export default class homepage extends BlackPanther {
  private page: Page;
  private readonly welcomeMessage: Locator;
  private readonly newReservationLink: Locator;
  private readonly oneWayTripType: Locator;
  private readonly reservationsLink: Locator;


  constructor(page: Page) {
    super();
    this.page = page;
    this.welcomeMessage = page.locator("header[class='spark-header'] h3");
    this.reservationsLink = page.locator('[role="menuitemcheckbox"]:has-text("Reservations")').last();
    this.newReservationLink = page.locator('[id=anchorLeftMenuReservationsNewReservation]').last();
    this.oneWayTripType = page.locator('#lblRbxAvailabilityTripTypeOw span').first();

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

  async selectOneWayTrip(): Promise<void> {
    await this.click(this.oneWayTripType);
  }

}
