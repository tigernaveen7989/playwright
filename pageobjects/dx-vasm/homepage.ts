import { Page, Locator, TestInfo } from '@playwright/test';
import { BlackPanther } from '../../utilities/blackpanther';
import { step } from 'allure-js-commons';
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

const TIMEOUT = 3000;
const LOADING_TIMEOUT = 60000;

export default class DxVasmHomePage extends BlackPanther {

  // ── Locators ────────────────────────────────────────────────────────────────
  private readonly oneWayTab: Locator;
  private readonly returnTab: Locator;
  private readonly departingInput: Locator;
  private readonly arrivingInput: Locator;
  private readonly departureDateInput: Locator;
  private readonly findFlightsButton: Locator;
  private readonly guestsButton: Locator;
  private readonly testInfo: TestInfo;

  constructor(page: Page, testInfo: TestInfo) {
    super(page);
    this.page = page;
    this.testInfo = testInfo;
    this.oneWayTab = page.getByRole('tab', { name: 'One way' });
    this.returnTab = page.getByRole('tab', { name: 'Return' });
    this.departingInput = page.locator('[data-test-id="airport-selection-origin"]').getByRole('textbox', { name: 'Departing' });
    this.arrivingInput = page.locator('[data-test-id="airport-selection-destination"]').getByRole('textbox', { name: 'Departing' });
    this.departureDateInput = page.getByRole('textbox', { name: /DD\/MM\/YYYY/ });
    this.findFlightsButton = page.getByRole('button', { name: 'Find flights' });
    this.guestsButton = page.getByRole('button', { name: /Guests/ });
  }

  // ── Public Methods ──────────────────────────────────────────────────────────

  /**
   * Navigates to the DX-VASM home page URL loaded from url-and-accounts.json.
   * No login required for this application. The URL is resolved via loadConfig()
   * using the active ENVIRONMENT/SUBENVIRONMENT/TENANT settings.
   */
  async navigateTo(): Promise<void> {
    const { dxVasmUrl } = this.loadConfig();
    this.testInfo.annotations.push({ type: 'dxVasmUrl', description: dxVasmUrl });
    await step('Navigate to DX-VASM', async () => {
      await step(`Url: ${dxVasmUrl}`, async () => {});
    });

    logger.info(`Navigating to DX-VASM URL: ${dxVasmUrl}`);
    await this.page.goto(dxVasmUrl, { timeout: LOADING_TIMEOUT });
    await this.sleep(TIMEOUT);
    logger.info('DX-VASM home page loaded');
  }

  /**
   * Selects the One Way trip type tab on the booking search form.
   */
  async selectOneWay(): Promise<void> {
    logger.info('Selecting One Way trip type');
    await this.click(this.oneWayTab);
    await this.sleep(TIMEOUT);
    logger.info('One Way tab selected');
  }

  /**
   * Selects the Return trip type tab on the booking search form.
   */
  async selectReturn(): Promise<void> {
    logger.info('Selecting Return trip type');
    await this.click(this.returnTab);
    await this.sleep(TIMEOUT);
    logger.info('Return tab selected');
  }

  /**
   * Fills the departing and arriving airports in the flight search form.
   * Types the city name to trigger the autosuggest dropdown, then selects the first matching option.
   *
   * @param origin - The departing city or airport name, e.g. 'Sydney'
   * @param destination - The arriving city or airport name, e.g. 'Melbourne'
   */
  async selectCityPair(origin: string, destination: string): Promise<void> {
    logger.info(`Selecting city pair: ${origin} -> ${destination}`);
    await this.departingInput.pressSequentially(origin);
    await this.sleep(TIMEOUT);
    const originOption = this.page.getByRole('option').first();
    await this.click(originOption);

    await this.arrivingInput.pressSequentially(destination);
    await this.sleep(TIMEOUT);
    const destinationOption = this.page.getByRole('option').first();
    await this.click(destinationOption);
    logger.info(`City pair selected: ${origin} -> ${destination}`);
  }

  /**
   * Fills the departure date in the flight search form.
   * Clears the existing date value and enters the new date in DD/MM/YYYY format.
   *
   * @param date - The departure date in DD/MM/YYYY format, e.g. '15/06/2026'
   */
  async selectDepartureDate(date: string): Promise<void> {
    logger.info(`Setting departure date: ${date}`);
    await this.clearAndFill(this.departureDateInput, date);
    logger.info(`Departure date set: ${date}`);
  }

  /**
   * Clicks the Find flights button to submit the search and load flight results.
   * Waits for the results page to load after clicking.
   */
  async clickFindFlights(): Promise<void> {
    logger.info('Clicking Find flights button');
    await this.click(this.findFlightsButton);
    await this.sleep(TIMEOUT);
    logger.info('Find flights clicked, waiting for results');
  }
}
