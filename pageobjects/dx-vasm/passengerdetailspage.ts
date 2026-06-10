import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../../utilities/blackpanther';
import { faker } from '@faker-js/faker';
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

const TIMEOUT = 3000;

export default class DxVasmPassengerDetailsPage extends BlackPanther {

  // ── Locators ────────────────────────────────────────────────────────────────
  private readonly titleSelect: Locator;
  private readonly firstNameInput: Locator;
  private readonly middleNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly genderSelect: Locator;
  private readonly dobDayInput: Locator;
  private readonly dobMonthInput: Locator;
  private readonly dobYearInput: Locator;
  private readonly phoneNumberInput: Locator;
  private readonly emailInput: Locator;
  private readonly skipSeatSelectionButton: Locator;
  private readonly continueButton: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.titleSelect = page.getByRole('combobox', { name: 'Title' });
    this.firstNameInput = page.getByRole('textbox', { name: 'First name' });
    this.middleNameInput = page.getByRole('textbox', { name: 'Middle name' });
    this.lastNameInput = page.getByRole('textbox', { name: 'Last name' });
    this.genderSelect = page.getByRole('combobox', { name: 'Gender' });
    this.dobDayInput = page.getByRole('textbox', { name: 'Date of birth (Adult 12+) day' });
    this.dobMonthInput = page.getByRole('textbox', { name: 'Date of birth (Adult 12+) month' });
    this.dobYearInput = page.getByRole('textbox', { name: 'Date of birth (Adult 12+) year' });
    this.phoneNumberInput = page.getByRole('textbox', { name: /Phone number/ });
    this.emailInput = page.getByRole('textbox', { name: 'Email address' });
    this.skipSeatSelectionButton = page.getByRole('button', { name: 'Skip seat selection' });
    this.continueButton = page.getByRole('button', { name: 'Continue' });
  }

  // ── Public Methods ──────────────────────────────────────────────────────────

  /**
   * Fills in all mandatory passenger details on the Guests information page.
   * Parses paxType (e.g. '1A', '2A1C') via getPaxType() and generates
   * passenger data using faker, matching the call-center pattern.
   *
   * @param paxType - The passenger type string, e.g. '1A', '2A1C'
   */
  async enterPassengerDetails(paxType: string): Promise<void> {
    const paxMap: Map<string, string> = this.getPaxType(paxType);
    for (const [paxKey, paxValue] of paxMap.entries()) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = `${firstName}.${lastName}@sabre.com`;
      const mobileNumber = '295293593';
      let title = ['Mr.', 'Mrs.', 'Ms.'][Math.floor(Math.random() * 3)];
      let dateOfBirth: Date = faker.date.birthdate({ min: 18, max: 40, mode: 'age' });
      let dobDay = String(dateOfBirth.getDate()).padStart(2, '0');
      let dobMonth = String(dateOfBirth.getMonth() + 1).padStart(2, '0');
      let dobYear = String(dateOfBirth.getFullYear());
      let gender = faker.person.sex();
      gender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();

      if (paxValue.match('CNN')) {
        dateOfBirth = faker.date.birthdate({ min: 2, max: 11, mode: 'age' });
        dobDay = String(dateOfBirth.getDate()).padStart(2, '0');
        dobMonth = String(dateOfBirth.getMonth() + 1).padStart(2, '0');
        dobYear = String(dateOfBirth.getFullYear());
        title = ['Mr.', 'Ms.'][Math.floor(Math.random() * 2)];
      }

      logger.info(`Entering ${paxKey} (${paxValue}) passenger details: ${title} ${firstName} ${lastName}`);
      await this.selectValueFromDropdown(this.titleSelect, title);
      await this.fill(this.firstNameInput, firstName);
      await this.fill(this.lastNameInput, lastName);
      await this.selectValueFromDropdown(this.genderSelect, gender);
      await this.fill(this.dobDayInput, dobDay);
      await this.fill(this.dobMonthInput, dobMonth);
      await this.fill(this.dobYearInput, dobYear);
      await this.fill(this.phoneNumberInput, mobileNumber);
      await this.fill(this.emailInput, email);
      logger.info(`Passenger details entered: ${title} ${firstName} ${lastName}, ${gender}, DOB: ${dobDay}/${dobMonth}/${dobYear}`);
    }
  }

  /**
   * Clicks the Skip seat selection button to bypass the seat selection step
   * and proceed to the ancillaries/extras page.
   */
  async clickSkipSeatSelection(): Promise<void> {
    logger.info('Clicking Skip seat selection button');
    await this.click(this.skipSeatSelectionButton);
    await this.sleep(TIMEOUT);
    logger.info('Seat selection skipped');
  }

  /**
   * Clicks the Continue button to proceed to the seat selection step.
   */
  async clickContinue(): Promise<void> {
    logger.info('Clicking Continue button');
    await this.click(this.continueButton);
    await this.sleep(TIMEOUT);
    logger.info('Continue clicked');
  }
}
