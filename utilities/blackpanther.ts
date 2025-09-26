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

  constructor() {
    this.environment = process.env.ENVIRONMENT || '';
    this.subenvironment = process.env.SUBENVIRONMENT || '';
    this.tenant = process.env.TENANT || '';

    if (!this.environment || !this.subenvironment || !this.tenant) {
      throw new Error('Missing ENVIRONMENT, SUBENVIRONMENT, or TENANT environment variable.');
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
    await locator.waitFor({ state: 'visible' });
    await locator.click();
    await step(`Clicked on: ${await locator.textContent()}`, async () => {
      logger.info(`Clicked on locator: ${await locator.toString()}`);
    });
  }

  protected async fill(locator: Locator, value: string): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.fill(value);
    await step(`Filled '${value}' into: ${await locator.toString()}`, async () => {
      logger.info(`Filled value '${value}' into locator: ${await locator.toString()}`);
    });
  }

  protected async clickOnCheckbox(locator: Locator): Promise<void> {
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
    await locator.waitFor({ state: 'visible' });
    await locator.selectOption({ label: value });
    await step(`Selected '${value}' from dropdown: ${await locator.toString()}`, async () => {
      logger.info(`Selected value '${value}' from dropdown: ${await locator.toString()}`);
    });
  }
}
