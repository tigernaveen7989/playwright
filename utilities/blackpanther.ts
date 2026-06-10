import path from 'path';
import fs from 'fs';
import { Page, Locator, expect } from '@playwright/test';
import { step } from 'allure-js-commons';
import { LoggerFactory } from '../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

// Default timeouts used across all interaction methods
const DEFAULT_VISIBILITY_TIMEOUT = 60000;
const DEFAULT_SHORT_TIMEOUT = 10000;
const PRE_ACTION_DELAY = 1000;

/**
 * Parses the current call stack and returns a formatted hierarchy string showing
 * the spec file → page object → blackpanther chain, e.g.:
 *   createordertest.spec.ts:125
 *   addpaymenttonewreservationpage.ts:60
 *   blackpanther.ts:77
 */
function buildCallHierarchy(): string {
  const stack = new Error().stack ?? '';
  const lines = stack.split('\n').slice(1);

  const projectRoot = path.resolve(__dirname, '..');
  const relevant: string[] = [];

  for (const line of lines) {
    const match = line.match(/\((.+?):(\d+):\d+\)/) ?? line.match(/at (.+?):(\d+):\d+/);
    if (!match) continue;

    const filePath = match[1];
    const lineNo = match[2];

    if (!filePath.startsWith(projectRoot) && !filePath.includes('PlaywrightTypescript')) continue;
    if (filePath.includes('node_modules')) continue;
    if (filePath.includes('blackpanther.ts') && relevant.length > 0) continue;

    const fileName = path.basename(filePath);
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

/**
 * BlackPanther — the single source of truth for all Playwright browser interactions.
 * Every page object must extend this class. Every UI interaction must go through
 * its protected methods — never call raw Playwright APIs in page objects.
 */
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

  // ─── Config & Test Data ────────────────────────────────────────────────────

  /** Returns the absolute path to a test data file for the active tenant/subenv. */
  private getTestDataPath(fileName: string = 'url-and-accounts.json'): string {
    if (fileName === 'url-and-accounts.json') {
      return path.join(__dirname, '..', 'testdata', this.tenant.toLowerCase(), fileName);
    }
    return path.join(
      __dirname,
      '..',
      'testdata',
      this.tenant.toLowerCase(),
      this.subenvironment.toLowerCase(),
      fileName
    );
  }

  /** Reads the dateFormat from call-center-ui.json global config, defaults to MM/DD/YYYY. */
  private getDateFormat(): string {
    const configPath = this.getTestDataPath('call-center-ui.json');
    if (!fs.existsSync(configPath)) {
      return 'MM/DD/YYYY';
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config?.global?.[0]?.dateFormat || 'MM/DD/YYYY';
  }

  /**
   * Loads url-and-accounts.json for the active env/subenv/tenant.
   * @returns The sub-environment config object
   */
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

  /** Validates the page is available and not closed before any interaction. */
  private assertPageOpen(): void {
    if (!this.page || this.page.isClosed()) {
      throw new Error('Page is not available or already closed');
    }
  }

  // ─── Core Interaction Methods ──────────────────────────────────────────────

  /**
   * Waits for the element to be visible, then clicks it. Logs the action to Allure.
   * @param locator - The Playwright Locator to click
   */
  protected async click(locator: Locator): Promise<void> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await this.page.waitForTimeout(PRE_ACTION_DELAY);
      await expect(locator).toBeVisible({ timeout: DEFAULT_VISIBILITY_TIMEOUT });
      await locator.click();
      await step(`Clicked on locator: ${locator.toString()}`, async () => {
        logger.info(`Clicked on locator: ${locator.toString()}`);
      });
    } catch (error) {
      logger.info(`Failed to click on locator: ${locator.toString()}`);
      throw new Error(`Failed to click on locator: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  /**
   * Clicks an element with force, bypassing pointer-intercept checks from overlapping containers.
   * Use only when the element is inside a modal or tab-restricted panel that wraps pointer events.
   * @param locator - The Playwright Locator to force-click
   */
  protected async clickWithForce(locator: Locator): Promise<void> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await this.page.waitForTimeout(PRE_ACTION_DELAY);
      await expect(locator).toBeVisible({ timeout: DEFAULT_VISIBILITY_TIMEOUT });
      await locator.click({ force: true });
      await step(`Force-clicked on locator: ${locator.toString()}`, async () => {
        logger.info(`Force-clicked on locator: ${locator.toString()}`);
      });
    } catch (error) {
      logger.info(`Failed to force-click on locator: ${locator.toString()}`);
      throw new Error(`Failed to force-click on locator: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  /**
   * Waits for the element to be visible, then fills it with the given value. Logs to Allure.
   * @param locator - The Playwright Locator to fill
   * @param value - The text value to enter
   */
  protected async fill(locator: Locator, value: string): Promise<void> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await this.page.waitForTimeout(PRE_ACTION_DELAY);
      await expect(locator).toBeVisible({ timeout: DEFAULT_VISIBILITY_TIMEOUT });
      await locator.fill(value);
      await step(`Filled '${value}' into: ${locator.toString()}`, async () => {
        logger.info(`Filled value '${value}' into locator: ${locator.toString()}`);
      });
    } catch (error) {
      throw new Error(`Failed to fill value '${value}' into locator: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  /**
   * Double-clicks the element after waiting for visibility. Logs to Allure.
   * @param locator - The Playwright Locator to double-click
   */
  protected async doubleClick(locator: Locator): Promise<void> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await this.page.waitForTimeout(PRE_ACTION_DELAY);
      await expect(locator).toBeVisible({ timeout: DEFAULT_VISIBILITY_TIMEOUT });
      await locator.dblclick();
      await step(`Double-clicked on: ${locator.toString()}`, async () => {
        logger.info(`Double-clicked on locator: ${locator.toString()}`);
      });
    } catch (error) {
      throw new Error(`Failed to double-click on locator: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  /**
   * Hovers over the element after waiting for visibility. Logs to Allure.
   * @param locator - The Playwright Locator to hover over
   */
  protected async hover(locator: Locator): Promise<void> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await expect(locator).toBeVisible({ timeout: DEFAULT_VISIBILITY_TIMEOUT });
      await locator.hover();
      await step(`Hovered on: ${locator.toString()}`, async () => {
        logger.info(`Hovered on locator: ${locator.toString()}`);
      });
    } catch (error) {
      throw new Error(`Failed to hover on locator: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  /**
   * Focuses the element after waiting for visibility. Logs to Allure.
   * @param locator - The Playwright Locator to focus
   */
  protected async focus(locator: Locator): Promise<void> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await expect(locator).toBeVisible({ timeout: DEFAULT_VISIBILITY_TIMEOUT });
      await locator.focus();
      await step(`Focused on: ${locator.toString()}`, async () => {
        logger.info(`Focused on locator: ${locator.toString()}`);
      });
    } catch (error) {
      throw new Error(`Failed to focus on locator: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  /**
   * Clears the input field and optionally fills a new value. Logs to Allure.
   * @param locator - The Playwright Locator of the input to clear
   * @param newValue - Optional new value to fill after clearing
   */
  protected async clearAndFill(locator: Locator, newValue: string = ''): Promise<void> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await this.page.waitForTimeout(PRE_ACTION_DELAY);
      await expect(locator).toBeVisible({ timeout: DEFAULT_VISIBILITY_TIMEOUT });
      await locator.clear();
      if (newValue) {
        await locator.fill(newValue);
      }
      await step(`Cleared and filled '${newValue}' into: ${locator.toString()}`, async () => {
        logger.info(`Cleared and filled '${newValue}' into locator: ${locator.toString()}`);
      });
    } catch (error) {
      throw new Error(`Failed to clear/fill locator: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  /**
   * Waits for the checkbox to be visible, then clicks it only if it is not already checked.
   * @param locator - The Playwright Locator of the checkbox
   */
  protected async clickOnCheckbox(locator: Locator): Promise<void> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await locator.waitFor({ state: 'visible', timeout: DEFAULT_VISIBILITY_TIMEOUT });
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

  /**
   * Unchecks a checkbox only if it is currently checked. Logs to Allure.
   * @param locator - The Playwright Locator of the checkbox
   */
  protected async uncheckCheckbox(locator: Locator): Promise<void> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await locator.waitFor({ state: 'visible', timeout: DEFAULT_VISIBILITY_TIMEOUT });
      const isChecked = await locator.isChecked();
      if (isChecked) {
        await locator.click();
        await step(`Unchecked checkbox: ${locator.toString()}`, async () => {
          logger.info(`Unchecked checkbox: ${locator.toString()}`);
        });
      } else {
        logger.info(`Checkbox already unchecked: ${locator.toString()}`);
      }
    } catch (error) {
      throw new Error(`Failed to uncheck checkbox: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  /**
   * Selects an option from a dropdown by its visible label text. Logs to Allure.
   * @param locator - The Playwright Locator of the select element
   * @param value - The visible label text of the option to select
   */
  protected async selectValueFromDropdown(locator: Locator, value: string): Promise<void> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await locator.waitFor({ state: 'visible', timeout: DEFAULT_SHORT_TIMEOUT });
      await locator.selectOption({ label: value }, { timeout: DEFAULT_SHORT_TIMEOUT });
      await step(`Selected '${value}' from dropdown: ${locator.toString()}`, async () => {
        logger.info(`Selected value '${value}' from dropdown: ${locator.toString()}`);
      });
    } catch (error) {
      throw new Error(`Failed to select '${value}' from dropdown '${locator.toString()}': ${error}${hierarchy}`);
    }
  }

  /**
   * Selects an option from a dropdown by its value attribute. Logs to Allure.
   * @param locator - The Playwright Locator of the select element
   * @param value - The value attribute of the option to select
   */
  protected async selectOptionByValue(locator: Locator, value: string): Promise<void> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await locator.waitFor({ state: 'visible', timeout: DEFAULT_SHORT_TIMEOUT });
      await locator.selectOption({ value }, { timeout: DEFAULT_SHORT_TIMEOUT });
      await step(`Selected value='${value}' from dropdown: ${locator.toString()}`, async () => {
        logger.info(`Selected option value '${value}' from dropdown: ${locator.toString()}`);
      });
    } catch (error) {
      throw new Error(`Failed to select value '${value}' from dropdown '${locator.toString()}': ${error}${hierarchy}`);
    }
  }

  // ─── Text & Attribute Extraction ───────────────────────────────────────────

  /**
   * Waits for the element to be visible and returns its text content.
   * @param locator - The Playwright Locator to read text from
   * @param timeout - Optional visibility timeout in ms (default 20000)
   * @returns The text content of the element, or empty string if null
   */
  protected async getTextContent(locator: Locator, timeout: number = DEFAULT_VISIBILITY_TIMEOUT): Promise<string> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await locator.waitFor({ state: 'visible', timeout });
      const text = await locator.textContent() ?? '';
      await step(`Got textContent from: ${locator.toString()}`, async () => {
        logger.info(`Text content: '${text}' from locator: ${locator.toString()}`);
      });
      return text;
    } catch (error) {
      throw new Error(`Failed to get textContent from locator: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  /**
   * Waits for the element to be visible and returns its inner text (rendered text).
   * @param locator - The Playwright Locator to read inner text from
   * @param timeout - Optional visibility timeout in ms (default 20000)
   * @returns The inner text of the element
   */
  protected async getInnerText(locator: Locator, timeout: number = DEFAULT_VISIBILITY_TIMEOUT): Promise<string> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await locator.waitFor({ state: 'visible', timeout });
      const text = await locator.innerText();
      await step(`Got innerText from: ${locator.toString()}`, async () => {
        logger.info(`Inner text: '${text}' from locator: ${locator.toString()}`);
      });
      return text;
    } catch (error) {
      throw new Error(`Failed to get innerText from locator: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  /**
   * Waits for the input element to be visible and returns its current value.
   * @param locator - The Playwright Locator of the input element
   * @param timeout - Optional visibility timeout in ms (default 20000)
   * @returns The current input value
   */
  protected async getInputValue(locator: Locator, timeout: number = DEFAULT_VISIBILITY_TIMEOUT): Promise<string> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await locator.waitFor({ state: 'visible', timeout });
      const value = await locator.inputValue();
      await step(`Got inputValue from: ${locator.toString()}`, async () => {
        logger.info(`Input value: '${value}' from locator: ${locator.toString()}`);
      });
      return value;
    } catch (error) {
      throw new Error(`Failed to get inputValue from locator: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  /**
   * Waits for the element to be visible and returns the value of the specified attribute.
   * @param locator - The Playwright Locator to read the attribute from
   * @param attribute - The name of the HTML attribute to retrieve, e.g. 'href', 'data-id'
   * @param timeout - Optional visibility timeout in ms (default 20000)
   * @returns The attribute value, or null if the attribute does not exist
   */
  protected async getAttribute(locator: Locator, attribute: string, timeout: number = DEFAULT_VISIBILITY_TIMEOUT): Promise<string | null> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await locator.waitFor({ state: 'visible', timeout });
      const value = await locator.getAttribute(attribute);
      await step(`Got attribute '${attribute}' from: ${locator.toString()}`, async () => {
        logger.info(`Attribute '${attribute}': '${value}' from locator: ${locator.toString()}`);
      });
      return value;
    } catch (error) {
      throw new Error(`Failed to get attribute '${attribute}' from locator: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  // ─── Element State Checks ─────────────────────────────────────────────────

  /**
   * Returns the number of elements matching the locator.
   * @param locator - The Playwright Locator to count
   * @returns The number of matching elements
   */
  protected async getElementCount(locator: Locator): Promise<number> {
    this.assertPageOpen();
    const count = await locator.count();
    logger.info(`Element count for ${locator.toString()}: ${count}`);
    return count;
  }

  /**
   * Checks whether the element is currently visible on the page.
   * Does not throw if the element is not visible — returns false instead.
   * @param locator - The Playwright Locator to check
   * @param timeout - Optional timeout to wait before checking (default 5000)
   * @returns true if visible, false otherwise
   */
  protected async isElementVisible(locator: Locator, timeout: number = 5000): Promise<boolean> {
    this.assertPageOpen();
    try {
      await locator.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks whether the element is currently enabled (not disabled).
   * @param locator - The Playwright Locator to check
   * @param timeout - Optional timeout to wait for visibility before checking (default 5000)
   * @returns true if enabled, false otherwise
   */
  protected async isElementEnabled(locator: Locator, timeout: number = 5000): Promise<boolean> {
    this.assertPageOpen();
    try {
      await locator.waitFor({ state: 'visible', timeout });
      return await locator.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Checks whether the checkbox or radio button element is currently checked.
   * @param locator - The Playwright Locator of the checkbox/radio
   * @param timeout - Optional timeout to wait for visibility before checking (default 5000)
   * @returns true if checked, false otherwise
   */
  protected async isElementChecked(locator: Locator, timeout: number = 5000): Promise<boolean> {
    this.assertPageOpen();
    try {
      await locator.waitFor({ state: 'visible', timeout });
      return await locator.isChecked();
    } catch {
      return false;
    }
  }

  // ─── Wait Methods ─────────────────────────────────────────────────────────

  /**
   * Waits for the element to reach the specified state within the given timeout.
   * @param locator - The Playwright Locator to wait for
   * @param state - The desired state: 'visible', 'hidden', 'attached', or 'detached'
   * @param timeout - Optional timeout in ms (default 20000)
   */
  protected async waitForElement(locator: Locator, state: 'visible' | 'hidden' | 'attached' | 'detached', timeout: number = DEFAULT_VISIBILITY_TIMEOUT): Promise<void> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await locator.waitFor({ state, timeout });
      logger.info(`Element reached state '${state}': ${locator.toString()}`);
    } catch (error) {
      throw new Error(`Timed out waiting for element to be '${state}': ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  /**
   * Waits for the page to reach the specified load state.
   * @param state - The load state: 'load', 'domcontentloaded', or 'networkidle'
   * @param timeout - Optional timeout in ms (default 30000)
   */
  protected async waitForPageLoad(state: 'load' | 'domcontentloaded' | 'networkidle' = 'load', timeout: number = 30000): Promise<void> {
    this.assertPageOpen();
    await this.page.waitForLoadState(state, { timeout });
    logger.info(`Page reached load state: '${state}'`);
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  /**
   * Navigates the page to the specified URL and waits for the page to load.
   * @param url - The URL to navigate to
   * @param timeout - Optional navigation timeout in ms (default 60000)
   */
  protected async navigateTo(url: string, timeout: number = 60000): Promise<void> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await this.page.goto(url, { timeout });
      await step(`Navigated to: ${url}`, async () => {
        logger.info(`Navigated to URL: ${url}`);
      });
    } catch (error) {
      throw new Error(`Failed to navigate to URL: ${url}\n${error}${hierarchy}`);
    }
  }

  /**
   * Reloads the current page and waits for the page to load.
   * @param timeout - Optional timeout in ms (default 30000)
   */
  protected async reloadPage(timeout: number = 30000): Promise<void> {
    this.assertPageOpen();
    await this.page.reload({ timeout });
    logger.info('Page reloaded');
  }

  /**
   * Navigates back in browser history.
   * @param timeout - Optional timeout in ms (default 30000)
   */
  protected async goBack(timeout: number = 30000): Promise<void> {
    this.assertPageOpen();
    await this.page.goBack({ timeout });
    logger.info('Navigated back');
  }

  // ─── Keyboard Actions ─────────────────────────────────────────────────────

  /**
   * Presses the Tab key one or more times on the page.
   * @param count - Number of times to press Tab (default 1)
   */
  protected async pressTab(count: number = 1): Promise<void> {
    this.assertPageOpen();
    for (let i = 0; i < count; i++) {
      await this.page.keyboard.press('Tab');
    }
    logger.info(`Pressed Tab ${count} time(s)`);
  }

  /**
   * Presses the Enter key on the page.
   */
  protected async pressEnter(): Promise<void> {
    this.assertPageOpen();
    await this.page.keyboard.press('Enter');
    logger.info('Pressed Enter');
  }

  /**
   * Presses the Escape key on the page.
   */
  protected async pressEscape(): Promise<void> {
    this.assertPageOpen();
    await this.page.keyboard.press('Escape');
    logger.info('Pressed Escape');
  }

  /**
   * Presses any keyboard key on the page. Supports modifiers like 'Control+A', 'Shift+Tab'.
   * @param key - The key or key combination to press, e.g. 'ArrowDown', 'Control+C'
   */
  protected async pressKey(key: string): Promise<void> {
    this.assertPageOpen();
    await this.page.keyboard.press(key);
    logger.info(`Pressed key: ${key}`);
  }

  /**
   * Types text character by character with an optional delay between keystrokes.
   * Use this instead of fill() when the target input requires keystroke events.
   * @param locator - The Playwright Locator of the input element
   * @param text - The text to type
   * @param delay - Optional delay in ms between keystrokes (default 50)
   */
  protected async typeText(locator: Locator, text: string, delay: number = 50): Promise<void> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await expect(locator).toBeVisible({ timeout: DEFAULT_VISIBILITY_TIMEOUT });
      await locator.pressSequentially(text, { delay });
      await step(`Typed '${text}' into: ${locator.toString()}`, async () => {
        logger.info(`Typed text into locator: ${locator.toString()}`);
      });
    } catch (error) {
      throw new Error(`Failed to type text into locator: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  // ─── Scroll ───────────────────────────────────────────────────────────────

  /**
   * Scrolls the element into view if it is not already visible in the viewport.
   * @param locator - The Playwright Locator to scroll into view
   */
  protected async scrollIntoView(locator: Locator): Promise<void> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await locator.scrollIntoViewIfNeeded();
      logger.info(`Scrolled into view: ${locator.toString()}`);
    } catch (error) {
      throw new Error(`Failed to scroll into view: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  // ─── File Upload ──────────────────────────────────────────────────────────

  /**
   * Uploads one or more files using a file input element.
   * @param locator - The Playwright Locator of the file input element
   * @param filePaths - A single file path or array of file paths to upload
   */
  protected async uploadFile(locator: Locator, filePaths: string | string[]): Promise<void> {
    this.assertPageOpen();
    const hierarchy = buildCallHierarchy();
    try {
      await locator.setInputFiles(filePaths);
      const fileNames = Array.isArray(filePaths)
        ? filePaths.map(f => path.basename(f)).join(', ')
        : path.basename(filePaths);
      await step(`Uploaded file(s): ${fileNames}`, async () => {
        logger.info(`Uploaded file(s): ${fileNames} via locator: ${locator.toString()}`);
      });
    } catch (error) {
      throw new Error(`Failed to upload file(s) via locator: ${locator.toString()}\n${error}${hierarchy}`);
    }
  }

  // ─── Screenshot ───────────────────────────────────────────────────────────

  /**
   * Takes a screenshot of the current page and saves it to the specified path.
   * @param screenshotPath - The file path where the screenshot will be saved
   */
  protected async takeScreenshot(screenshotPath: string): Promise<void> {
    this.assertPageOpen();
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    logger.info(`Screenshot saved to: ${screenshotPath}`);
  }

  // ─── Utility Methods ──────────────────────────────────────────────────────

  /**
   * Promise-based delay. Use only when a UI transition genuinely requires a fixed wait.
   * Always add a comment in the calling code explaining why the delay is necessary.
   * @param ms - The number of milliseconds to wait
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ─── Date & Travel Helpers ────────────────────────────────────────────────

  /**
   * Formats a Date object as a date string in the specified format.
   * @param date - The Date object to format
   * @param format - The date format string: 'MM/DD/YYYY' or 'DD/MM/YYYY' (default 'MM/DD/YYYY')
   * @returns The formatted date string, e.g. '06/15/2026' or '15/06/2026'
   */
  protected formatDateMMDDYYYY(date: Date, format: string = 'MM/DD/YYYY'): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    if (format === 'DD/MM/YYYY') {
      return `${day}/${month}/${year}`;
    }
    return `${month}/${day}/${year}`;
  }

  /**
   * Returns departure (and optionally return) date strings based on today's date plus offsets.
   * Uses the tenant-aware date format from call-center-ui.json global config.
   * @param tripType - 'OW' for one-way or 'RT' for round-trip
   * @param todayPlusDate - Comma-separated day offsets from today, e.g. '10' or '10,17'
   * @returns Array of formatted date strings: [departureDate] for OW, [departure, return] for RT
   */
  protected getTravelDates(tripType: string, todayPlusDate: string): string[] {
    const today = new Date();
    const dateFormat = this.getDateFormat();

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

    if (tripType === 'MS') {
      return offsets.map(offset => this.formatDateMMDDYYYY(addDays(today, offset), dateFormat));
    }

    throw new Error(`Invalid tripType: ${tripType}`);
  }

  // ─── Passenger Type Parser ────────────────────────────────────────────────

  /**
   * Parses a passenger type string like '2A1C' into a Map of PAX IDs to type codes.
   * @param paxType - The passenger type string, e.g. '2A1C' or '1A1INF'
   * @returns Map where key is PAX ID (e.g. 'PAX1') and value is type code ('ADT', 'CNN', 'INF')
   */
  protected getPaxType(paxType: string): Map<string, string> {
    const paxMap = new Map<string, string>();
    const regex = /(\d+)(A|C|INF|INS)/g;
    const matches = Array.from(paxType.matchAll(regex));

    let paxCounter = 1;

    for (const match of matches) {
      const count = parseInt(match[1], 10);
      const typeCode = match[2];

      let paxCategory = '';
      switch (typeCode) {
        case 'A':
          paxCategory = 'ADT';
          break;
        case 'C':
          paxCategory = 'CNN';
          break;
        case 'I':
          paxCategory = 'INF';
          break;
        case 'IS':
          paxCategory = 'INS';
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
