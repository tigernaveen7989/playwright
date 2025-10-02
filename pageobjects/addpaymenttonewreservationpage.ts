import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../utilities/blackpanther';

export default class addpaymenttonewreservationpage extends BlackPanther {
  private readonly selectCreditCardDropdown: Locator;
  private readonly continueButton: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.selectCreditCardDropdown = page.locator("#ddlResAddPymtPaymentType");
    this.continueButton = page.locator("#BtnAddPayment");
  }


  async selectCardType(cardType: string): Promise<void> {
    await this.selectValueFromDropdown(this.selectCreditCardDropdown, cardType);
  }

  async clickOnContinueButton(): Promise<void> {
    await this.click(this.continueButton);
  }
}