import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../utilities/blackpanther';
import { faker } from '@faker-js/faker';
import { title } from 'process';

export default class passengerdetailspage extends BlackPanther {
  private readonly lastNameEditbox: Locator;
  private readonly firstNameEditbox: Locator;
  private readonly genderDropdown: Locator;
  private readonly middleNameEditbox: Locator;
  private readonly titleDropdown: Locator;
  private readonly mobilePhoneEditbox: Locator;
  private readonly emailEdibox: Locator;
  private readonly dateOfBirthEditbox: Locator;
  private readonly updateButton: Locator;
  private readonly nextPaxButton: Locator;
  private readonly saveButton: Locator;
  private readonly yesButtonFromPaymentPopup: Locator;
  private readonly noButtonFromPaymentPopup: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.lastNameEditbox = page.locator("xpath=//input[@id='tbxResLastNamePax']");
    this.firstNameEditbox = page.locator("xpath=//input[@id='tbxResFirstNamePax']");
    this.genderDropdown = page.locator("xpath=//select[@id='ddlResGenderPax']");
    this.middleNameEditbox = page.locator("xpath=//input[@id='tbxResMiddleNamePax']");
    this.titleDropdown = page.locator("xpath=//select[@id='ddlResInfoTitlePax']");
    this.mobilePhoneEditbox = page.locator("xpath=//input[@id='tbxResCellPhonePax']");
    this.emailEdibox = page.locator("xpath=//input[@id='tbxResEmailPax']");
    this.dateOfBirthEditbox = page.locator("xpath=//input[@id='tbxPaxDob']");
    this.updateButton = page.locator("xpath=//button[@id='btnResUpdatePaxInfo']");
    this.nextPaxButton = page.locator("xpath=//button[@id='btnResNextPax']");
    this.saveButton = page.locator("xpath=//button[@id='btnResSavePax_0']");
    this.yesButtonFromPaymentPopup = page.locator("#button-1");
    this.noButtonFromPaymentPopup = page.locator("#button-0");
  }

  async enterPassengerDetails(paxType: string): Promise<void> {

    const paxMap: Map<string, string> = this.getPaxType(paxType);
    for (const [paxKey, paxType] of paxMap.entries()) {
      const firstName: string = faker.person.firstName();
      const lastName: string = faker.person.lastName();
      const middleName: string = faker.person.middleName();
      const email: string = `${firstName}.${lastName}@sabre.com`;
      let title = ["MR", "MRS", "DR", "MS"][Math.floor(Math.random() * 4)];
      const mobileNumber = '822347686461';
      let dateOfBirth: Date = faker.date.birthdate({ min: 18, max: 40, mode: 'age' });
      let dob = `${String(dateOfBirth.getMonth() + 1).padStart(2, "0")}/${String(dateOfBirth.getDate()).padStart(2, "0")}/${dateOfBirth.getFullYear()}`;
      let sex = faker.person.sex(); // returns 'male' or 'female'
      sex = sex === 'male' ? 'M' : 'F';

      await this.fill(this.firstNameEditbox, firstName);
      await this.fill(this.lastNameEditbox, lastName);
      await this.fill(this.middleNameEditbox, middleName);
      await this.fill(this.emailEdibox, email);
      await this.selectValueFromDropdown(this.genderDropdown, sex);
      if (paxType.match('CNN')) {
        dob = '06/06/2020';
        title = ["MSTR", "MISS"][Math.floor(Math.random() * 2)];
      }
      await this.selectValueFromDropdown(this.titleDropdown, title);
      await this.fill(this.mobilePhoneEditbox, mobileNumber);
      await this.click(this.dateOfBirthEditbox);
      await this.fill(this.dateOfBirthEditbox, dob);
      await this.pressTab();
      if(await this.nextPaxButton.isEnabled({timeout:3000})){
        await this.click(this.nextPaxButton);
        await this.sleep(5000);
      }
    }
    if(await this.updateButton.isEnabled({timeout:3000})){
        await this.click(this.updateButton);
        await this.sleep(2000);
      }
  }

  async clickOnSaveButton(): Promise<void> {
    await this.click(this.saveButton);
    await this.sleep(5000);
  }

  async clickOnYesButton(): Promise<void> {
    this.click(this.yesButtonFromPaymentPopup);
  }

  async clickOnNoButton(): Promise<void> {
    this.click(this.noButtonFromPaymentPopup);
  }
}