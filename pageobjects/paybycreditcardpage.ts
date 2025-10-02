import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../utilities/blackpanther';

export default class paybycreditcardpage extends BlackPanther {
  private readonly nameOnCardEditbox: Locator;
  private readonly creditCardNumberEditbox: Locator;
  private readonly expirationDateEditbox: Locator;
  private readonly cvvEditbox: Locator;
  private readonly completePaymentButton: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.nameOnCardEditbox = page.locator("input[name='name']");
    this.creditCardNumberEditbox = page.locator("#ccNum");
    this.expirationDateEditbox = page.locator("#expiration");
    this.cvvEditbox = page.locator("input[name='cvv']");
    this.completePaymentButton = page.locator("#btnPayByCreditCardContinue");
  }


  async enterCardDetails(cardNumber: string, cardName: string, cvv: string, expirationDate:string): Promise<void> {
    await this.fill(this.nameOnCardEditbox, cardName);
    await this.fill(this.creditCardNumberEditbox, cardNumber);
    await this.fill(this.expirationDateEditbox, expirationDate);
    await this.fill(this.cvvEditbox, cvv);
  }

  async clickOnCompletePaymentButton(): Promise<void> {
    await this.click(this.completePaymentButton);
    await this.sleep(5000);
  }
}