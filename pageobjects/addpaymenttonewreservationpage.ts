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

  // Phone number locators
  private readonly payerHomePhoneCountryDropdown: Locator;
  private readonly payerHomePhone: Locator;
  private readonly payerCellPhoneCountryDropdown: Locator;
  private readonly payerCellPhone: Locator;
  private readonly payerWorkPhoneCountryDropdown: Locator;
  private readonly payerWorkPhone: Locator;

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

    // Phone locators
    this.payerHomePhoneCountryDropdown = page.locator('#ddlResAddPymtHomePhoneCountryCodePAX');
    this.payerHomePhone = page.locator('#tbxResAddPymtHomePhone');
    this.payerCellPhoneCountryDropdown = page.locator('#ddlResAddPymtCellPhoneCountryCodePAX');
    this.payerCellPhone = page.locator('#tbxResAddPymtCellPhone');
    this.payerWorkPhoneCountryDropdown = page.locator('#ddlResAddPymtWorkPhoneCountryCodePAX');
    this.payerWorkPhone = page.locator('#tbxResAddPymtWorkPhone');
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
    const phoneNumber = faker.string.numeric(9);

    await this.fill(this.payerAddress1, address1);
    await this.fill(this.payerCity, city);
    await this.fill(this.payerStateProv, stateProv);
    await this.fill(this.payerPostal, postalCode);
    await this.selectValueFromDropdown(this.payerCountryDropdown, 'PL - POLAND');
    await this.selectValueFromDropdown(this.payerHomePhoneCountryDropdown, 'PL (+48)');
    await this.fill(this.payerHomePhone, phoneNumber);
    await this.selectValueFromDropdown(this.payerCellPhoneCountryDropdown, 'PL (+48)');
    await this.fill(this.payerCellPhone, phoneNumber);
    await this.selectValueFromDropdown(this.payerWorkPhoneCountryDropdown, 'PL (+48)');
    await this.fill(this.payerWorkPhone, phoneNumber);    
  }
}
