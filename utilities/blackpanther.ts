import path from 'path';
import fs from 'fs';
import { Page, Locator } from '@playwright/test';
import { attachment, step } from 'allure-js-commons';
import { LoggerFactory } from '../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

export class BlackPanther {

  private environment: string;
  private subenvironment: string;
  private tenant: string;
  protected page: Page;

  constructor(page?: Page) {
    this.environment = process.env.ENVIRONMENT || '';
    this.subenvironment = process.env.SUBENVIRONMENT || '';
    this.tenant = process.env.TENANT || '';

    if (!this.environment || !this.subenvironment || !this.tenant) {
      throw new Error('Missing ENVIRONMENT, SUBENVIRONMENT, or TENANT environment variable.');
    }

    if (page) {
      this.page = page;
    }
  }

  private getTestDataPath(): string {
    return path.join(
      __dirname,
      '..',
      'testdata',
      this.environment.toLowerCase(),
      this.subenvironment.toLowerCase(),
      this.tenant.toLowerCase(),
      'url-and-accounts.json'
    );
  }

  public loadConfig(): any {
    const testDataPath = this.getTestDataPath();

    if (!fs.existsSync(testDataPath)) {
      throw new Error(`Test data file not found at path: ${testDataPath}`);
    }

    const config = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
    const subenvConfig = config[this.subenvironment];

    if (!subenvConfig) {
      throw new Error(`Subenvironment '${this.subenvironment}' not found in config.`);
    }

    return subenvConfig;
  }

  protected async click(locator: Locator): Promise<void> {
    await this.sleep(1000);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
    await step(`Clicked on: ${await locator.textContent()}`, async () => {
      logger.info(`Clicked on locator: ${await locator.toString()}`);
    });
  }

  protected async fill(locator: Locator, value: string): Promise<void> {
    await this.sleep(1000);
    await locator.waitFor({ state: 'visible' });
    await locator.fill(value);
    await step(`Filled '${value}' into: ${await locator.toString()}`, async () => {
      logger.info(`Filled value '${value}' into locator: ${await locator.toString()}`);
    });
  }

  protected async clickOnCheckbox(locator: Locator): Promise<void> {
    await this.sleep(1000);
    await locator.waitFor({ state: 'visible' });
    const isChecked = await locator.isChecked();
    if (!isChecked) {
      await locator.click();
      await step(`Checked checkbox: ${await locator.toString()}`, async () => {
        logger.info(`Checked checkbox: ${await locator.toString()}`);
      });
    } else {
      logger.info(`Checkbox already checked: ${await locator.toString()}`);
    }
  }

  protected async selectValueFromDropdown(locator: Locator, value: string): Promise<void> {
    await this.sleep(1000);
    await locator.waitFor({ state: 'visible' });
    await locator.selectOption({ label: value });
    await step(`Selected '${value}' from dropdown: ${await locator.toString()}`, async () => {
      logger.info(`Selected value '${value}' from dropdown: ${await locator.toString()}`);
    });
  }


  protected formatDateMMDDYYYY(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  protected getTravelDates(tripType: string, todayPlusDate: string): string[] {
    const today = new Date();
    const offsets = todayPlusDate.split(',').map(Number);

    if (tripType === 'OW') {
      const departureDate = new Date(today);
      departureDate.setDate(today.getDate() + offsets[0]);
      return [this.formatDateMMDDYYYY(departureDate)];
    }

    if (tripType === 'RT') {
      const departureDate = new Date(today);
      const returnDate = new Date(today);
      departureDate.setDate(today.getDate() + offsets[0]);
      returnDate.setDate(today.getDate() + offsets[1]);
      return [this.formatDateMMDDYYYY(departureDate), this.formatDateMMDDYYYY(returnDate)];
    }

    throw new Error("Invalid tripType. Use 'OW' or 'RT'.");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
 * Presses the Tab key on the given page.
 * @param page - The Playwright Page object
 * @param count - Optional number of times to press Tab (default is 1)
 */
  protected async pressTab(count: number = 1): Promise<void> {
    for (let i = 0; i < count; i++) {
      await this.page.keyboard.press('Tab');
    }
  }
}
