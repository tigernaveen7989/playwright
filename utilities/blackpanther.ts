import path from 'path';
import fs from 'fs';
import { Page, Locator, expect } from '@playwright/test';
import { attachment, step } from 'allure-js-commons';
import { LoggerFactory } from '../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

/**
 * Parses the current call stack and returns a formatted hierarchy string showing
 * the spec file → page object → blackpanther chain, e.g.:
 *   createordertest.spec.ts:125
 *   addpaymenttonewreservationpage.ts:60
 *   blackpanther.ts:77
 */
function buildCallHierarchy(): string {
  const stack = new Error().stack ?? '';
  const lines = stack.split('\n').slice(1); // drop "Error" header line

  const projectRoot = path.resolve(__dirname, '..');
  const relevant: string[] = [];

  for (const line of lines) {
    // Match lines like:  at Foo.bar (C:\...\file.ts:12:34)  or  at file.ts:12:34
    const match = line.match(/\((.+?):(\d+):\d+\)/) ?? line.match(/at (.+?):(\d+):\d+/);
    if (!match) continue;

    const filePath = match[1];
    const lineNo = match[2];

    // Only include files inside the project (skip node_modules, playwright internals)
    if (!filePath.startsWith(projectRoot) && !filePath.includes('PlaywrightTypescript')) continue;
    if (filePath.includes('node_modules')) continue;
    if (filePath.includes('blackpanther.ts') && relevant.length > 0) continue; // skip repeated blackpanther frames

    const fileName = path.basename(filePath);
    // Include spec files, page objects, and blackpanther itself (first occurrence)
    if (
      fileName.endsWith('.spec.ts') ||
      fileName.endsWith('page.ts') ||
      fileName === 'blackpanther.ts'
    ) {
      const entry = `  ${fileName}:${lineNo}`;
      if (!relevant.includes(entry)) relevant.push(entry);
    }
  }

  return relevant.length > 0
    ? '\nCall hierarchy:\n' + relevant.join('\n')
    : '';
}

export class BlackPanther {

  private environment: string;
  private subenvironment: string;
  private tenant: string;
  protected page: Page;

  constructor(page: Page) {
    this.environment = process.env.ENVIRONMENT || '';
    this.subenvironment = process.env.SUBENVIRONMENT || '';
    this.tenant = process.env.TENANT || '';
    this.page = page;

    if (!this.environment || !this.subenvironment || !this.tenant) {
      throw new Error('Missing ENVIRONMENT, SUBENVIRONMENT, or TENANT environment variable.');
    }
  }

  private getTestDataPath(fileName: string = 'url-and-accounts.json'): string {
    return path.join(
      __dirname,
      '..',
      'testdata',
      this.environment.toLowerCase(),
      this.subenvironment.toLowerCase(),
      this.tenant.toLowerCase(),
      fileName
    );
  }

  private getDateFormat(): string {
    const configPath = this.getTestDataPath('call-center-ui.json');
    if (!fs.existsSync(configPath)) {
      return 'MM/DD/YYYY';
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config?.global?.[0]?.dateFormat || 'MM/DD/YYYY';
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

  protected async click(locator: Locator): Promise<any> {
    if (!this.page || this.page.isClosed()) {
      throw new Error("Page is not available or already closed");
    }
    const hierarchy = buildCallHierarchy();
    try {
      await this.page.waitForTimeout(1000);
      await expect(locator).toBeVisible({ timeout: 20000 });
      const text = await locator.textContent({ timeout: 2000 }).catch(() => locator.toString());
      await locator.click();
      await step(`Clicked on: ${text}`, async () => {
        logger.info(`Clicked on locator: ${locator.toString()}`);
      });
    } catch (error) {
      logger.info(`Failed to click on locator: ${locator.toString()}`);
      throw new Error(`Failed to click on locator: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  protected async fill(locator: Locator, value: string): Promise<any> {
    if (!this.page || this.page.isClosed()) {
      throw new Error("Page is not available or already closed");
    }
    const hierarchy = buildCallHierarchy();
    try {
      await this.page.waitForTimeout(1000);
      await expect(locator).toBeVisible({ timeout: 20000 });
      await locator.fill(value);
      await step(`Filled '${value}' into: ${locator.toString()}`, async () => {
        logger.info(`Filled value '${value}' into locator: ${locator.toString()}`);
      });
    } catch (error) {
      throw new Error(`Failed to fill value '${value}' into locator: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  protected async clickOnCheckbox(locator: Locator): Promise<void> {
    if (!this.page || this.page.isClosed()) {
      throw new Error("Page is not available or already closed");
    }
    const hierarchy = buildCallHierarchy();
    try {
      await locator.waitFor({ state: 'visible', timeout: 20000 });
      const isChecked = await locator.isChecked();
      if (!isChecked) {
        await locator.click();
        await step(`Checked checkbox: ${locator.toString()}`, async () => {
          logger.info(`Checked checkbox: ${locator.toString()}`);
        });
      } else {
        logger.info(`Checkbox already checked: ${locator.toString()}`);
      }
    } catch (error) {
      throw new Error(`Failed to interact with checkbox: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  protected async selectValueFromDropdown(locator: Locator, value: string): Promise<void> {
    if (!this.page || this.page.isClosed()) {
      throw new Error("Page is not available or already closed");
    }
    const hierarchy = buildCallHierarchy();
    try {
      // fail fast in 10s
      await locator.waitFor({ state: 'visible', timeout: 10000 });
      await locator.selectOption({ label: value }, { timeout: 10000 });

      await step(`Selected '${value}' from dropdown: ${locator.toString()}`, async () => {
        logger.info(`Selected value '${value}' from dropdown: ${locator.toString()}`);
      });
    } catch (error) {
      throw new Error(`Failed to select '${value}' from dropdown '${locator.toString()}': ${error}${hierarchy}`);
    }
  }

  protected formatDateMMDDYYYY(date: Date, format: string = 'MM/DD/YYYY'): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    if (format === 'DD/MM/YYYY') {
      return `${day}/${month}/${year}`;
    }
    return `${month}/${day}/${year}`;
  }

  protected getTravelDates(tripType: string, todayPlusDate: string): string[] {
    const today = new Date();
    const dateFormat = this.getDateFormat();

    // Remove spaces and convert safely
    const offsets = todayPlusDate
      .split(',')
      .map(value => parseInt(value.trim(), 10));

    if (offsets.some(isNaN)) {
      throw new Error(`Invalid todayPlusDate value: ${todayPlusDate}`);
    }

    const addDays = (baseDate: Date, days: number): Date => {
      const newDate = new Date(baseDate);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    };

    if (tripType === 'OW') {
      const departureDate = addDays(today, offsets[0]);

      return [this.formatDateMMDDYYYY(departureDate, dateFormat)];
    }

    if (tripType === 'RT') {
      if (offsets.length < 2) {
        throw new Error(`RT trip requires 2 offsets. Received: ${todayPlusDate}`);
      }

      const departureDate = addDays(today, offsets[0]);
      const returnDate = addDays(today, offsets[1]);

      return [
        this.formatDateMMDDYYYY(departureDate, dateFormat),
        this.formatDateMMDDYYYY(returnDate, dateFormat)
      ];
    }

    throw new Error(`Invalid tripType: ${tripType}`);
  }

  protected sleep(ms: number): Promise<void> {
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

  protected getPaxType(paxType: string): Map<string, string> {
    const paxMap = new Map<string, string>();
    const regex = /(\d+)(A|C|INF|INS)/g;
    const matches = [...paxType.matchAll(regex)];

    let paxCounter = 1;

    for (const match of matches) {
      const count = parseInt(match[1], 10);
      const typeCode = match[2];

      // Normalize type codes
      let paxCategory = '';
      switch (typeCode) {
        case 'A':
          paxCategory = 'ADT';
          break;
        case 'C':
          paxCategory = 'CNN';
          break;
        case 'INF':
        case 'INS':
          paxCategory = 'INF';
          break;
      }

      for (let i = 0; i < count; i++) {
        paxMap.set(`PAX${paxCounter}`, paxCategory);
        paxCounter++;
      }
    }

    return paxMap;
  }
}
