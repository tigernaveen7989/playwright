import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../utilities/blackpanther';

export default class addpaymenttonewreservationpage extends BlackPanther {
  private readonly selectCreditCardDropdown: Locator;
  private readonly continueButton: Locator;
  private readonly otherTab: Locator;
  private readonly paymentTypeDropdown: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.selectCreditCardDropdown = page.locator("#ddlResAddPymtPaymentType");
    this.continueButton = page.locator("#BtnAddPayment");
    this.otherTab = page.locator('#anchorOtherPayment');
    this.paymentTypeDropdown = page.locator('#ddlResAddPymtOtherPaymentType');
  }


  async selectCardType(cardType: string): Promise<void> {
    await this.selectValueFromDropdown(this.selectCreditCardDropdown, cardType);
  }

  async clickOnContinueButton(): Promise<void> {
    await this.click(this.continueButton);
  }

  async selectPaymentType(paymentType: string): Promise<void> {
    await this.click(this.otherTab);
    await this.selectValueFromDropdown(this.paymentTypeDropdown, paymentType);
  }
}