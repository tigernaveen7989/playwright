import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../../utilities/blackpanther';
import { LoggerFactory } from '../../utilities/logger';
import { faker } from '@faker-js/faker';
const logger = LoggerFactory.getLogger(__filename);

const TIMEOUT = 3000;

export default class CreateOrderPage extends BlackPanther {

  // ── Locators ────────────────────────────────────────────────────────────────
  private readonly titleSelect: Locator;
  private readonly firstNameInput: Locator;
  private readonly middleNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly genderSelect: Locator;
  private readonly dobDayInput: Locator;
  private readonly dobMonthInput: Locator;
  private readonly dobYearInput: Locator;
  private readonly emailInput: Locator;
  private readonly confirmAndContinueButton: Locator;
  private readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.titleSelect = page.getByTestId('qa-select-qa-title-prefix');
    this.firstNameInput = page.getByTestId('qa-first-name');
    this.middleNameInput = page.getByTestId('qa-middle-name');
    this.lastNameInput = page.getByTestId('qa-last-name');
    this.genderSelect = page.getByTestId('qa-select-qa-gender');
    this.dobDayInput = page.getByRole('textbox', { name: 'Date of Birth day' });
    this.dobMonthInput = page.getByRole('textbox', { name: 'Date of Birth month' });
    this.dobYearInput = page.getByRole('textbox', { name: 'Date of Birth year' });
    this.emailInput = page.getByTestId('qa-email');
    this.confirmAndContinueButton = page.getByTestId('qa-create-order-confirm-button');
    this.cancelButton = page.getByRole('button', { name: 'CANCEL Button' });
  }

  // ── Public Methods ──────────────────────────────────────────────────────────

  /**
   * Fills in traveler details on the Create Order page using random data from Faker.
   * Populates title, first name, middle name, last name, gender, date of birth, and email.
   * Generates realistic passenger information for a single adult traveler.
   */
  async enterPassengerDetails(): Promise<void> {
    logger.info('Entering passenger details on Create Order page');
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const middleName = faker.person.middleName();
    const email = `${firstName}.${lastName}@sabre.com`;
    const sex = faker.person.sex();
    const gender = sex === 'male' ? 'Male' : 'Female';
    const title = sex === 'male' ? 'Mr' : 'Mrs';
    const dateOfBirth = faker.date.birthdate({ min: 18, max: 40, mode: 'age' });
    const dobDay = String(dateOfBirth.getDate()).padStart(2, '0');
    const dobMonth = dateOfBirth.toLocaleString('en-US', { month: 'short' });
    const dobYear = String(dateOfBirth.getFullYear());

    await this.selectValueFromDropdown(this.titleSelect, title);
    await this.fill(this.firstNameInput, firstName);
    await this.fill(this.middleNameInput, middleName);
    await this.fill(this.lastNameInput, lastName);
    await this.selectValueFromDropdown(this.genderSelect, gender);
    await this.fill(this.dobDayInput, dobDay);
    await this.fill(this.dobMonthInput, dobMonth);
    await this.fill(this.dobYearInput, dobYear);
    await this.fill(this.emailInput, email);
    logger.info(`Passenger details entered: ${title} ${firstName} ${middleName} ${lastName}, ${gender}, DOB: ${dobDay}/${dobMonth}/${dobYear}`);
  }

  /**
   * Clicks the CONFIRM & CONTINUE button to submit the traveler details
   * and proceed to the order view/confirmation page.
   * Waits for the order to be created after clicking.
   */
  async clickConfirmAndContinue(): Promise<void> {
    logger.info('Clicking CONFIRM & CONTINUE button');
    await this.click(this.confirmAndContinueButton);
    await this.sleep(TIMEOUT);
    logger.info('CONFIRM & CONTINUE clicked, order creation in progress');
  }
}
