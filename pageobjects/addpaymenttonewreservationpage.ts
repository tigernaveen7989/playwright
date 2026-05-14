import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../utilities/blackpanther';
import { faker } from '@faker-js/faker';

export default class addpaymenttonewreservationpage extends BlackPanther {
  private readonly selectCreditCardDropdown: Locator;
  private readonly continueButton: Locator;
  private readonly otherTab: Locator;
  private readonly paymentTypeDropdown: Locator;

  // Payer details section locators
  private readonly payerAddress1: Locator;
  private readonly payerCity: Locator;
  private readonly payerStateProv: Locator;
  private readonly payerPostal: Locator;
  private readonly payerCountryDropdown: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.selectCreditCardDropdown = page.locator("#ddlResAddPymtPaymentType");
    this.continueButton = page.locator("#BtnAddPayment");
    this.otherTab = page.locator('#anchorOtherPayment');
    this.paymentTypeDropdown = page.locator('#ddlResAddPymtOtherPaymentType');

    // Payer details section
    this.payerAddress1 = page.locator('#tbxResAddPymtAddress1');
    this.payerCity = page.locator('#tbxResAddPymtCity');
    this.payerStateProv = page.locator('#tbxResAddPymtStateProv');
    this.payerPostal = page.locator('#tbxResAddPymtPostal');
    this.payerCountryDropdown = page.locator('#ddlResAddPymtCountry');
  }

  async selectCardType(cardType: string): Promise<void> {
    await this.sleep(3000);
    await this.selectValueFromDropdown(this.selectCreditCardDropdown, cardType);
  }

  async clickOnContinueButton(): Promise<void> {
    await this.click(this.continueButton);
  }

  async selectPaymentType(paymentType: string): Promise<void> {
    await this.click(this.otherTab);
    await this.selectValueFromDropdown(this.paymentTypeDropdown, paymentType);
  }

  async fillPayerDetails(): Promise<void> {
    await this.sleep(3000);

    const address1 = faker.location.streetAddress();
    const city = faker.location.city();
    const stateProv = faker.location.state({ abbreviated: true });
    const postalCode = faker.location.zipCode('#####');

    const address1Value = await this.payerAddress1.inputValue().catch(() => '');
    if (!address1Value) {
      await this.fill(this.payerAddress1, address1);
    }

    const cityValue = await this.payerCity.inputValue().catch(() => '');
    if (!cityValue) {
      await this.fill(this.payerCity, city);
    }

    const stateValue = await this.payerStateProv.inputValue().catch(() => '');
    if (!stateValue) {
      await this.fill(this.payerStateProv, stateProv);
    }

    const postalValue = await this.payerPostal.inputValue().catch(() => '');
    if (!postalValue) {
      await this.fill(this.payerPostal, postalCode);
    }

    try {
      const countryValue = await this.payerCountryDropdown.inputValue();
      if (!countryValue) {
        await this.selectValueFromDropdown(this.payerCountryDropdown, 'US - UNITED STATES');
      }
    } catch {
      // Country may already be set or not required
    }
  }
}
