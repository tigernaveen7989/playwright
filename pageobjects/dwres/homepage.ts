import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../../utilities/blackpanther';
import { LoggerFactory } from '../../utilities/logger';
import { step } from 'allure-js-commons';
const logger = LoggerFactory.getLogger(__filename);

const TIMEOUT = 3000;
const LOADING_TIMEOUT = 60000;

export default class HomePage extends BlackPanther {

  // ── Locators ────────────────────────────────────────────────────────────────
  private readonly welcomeMessage: Locator;
  private readonly airButton: Locator;
  private readonly reservationsButton: Locator;
  private readonly originCombobox: Locator;
  private readonly destinationCombobox: Locator;
  private readonly departureDateDay: Locator;
  private readonly departureDateMonth: Locator;
  private readonly departureDateYear: Locator;
  private readonly returnDateDay: Locator;
  private readonly returnDateMonth: Locator;
  private readonly returnDateYear: Locator;
  private readonly shopFlightsButton: Locator;
  private readonly selectFareButton: Locator;
  private readonly createOrderButton: Locator;
  private readonly tripTypeCombobox: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.welcomeMessage = page.locator("text=Welcome to Airline Workspace.");
    this.airButton = page.getByRole('button', { name: 'Air' });
    this.reservationsButton = page.getByRole('button', { name: 'Reservations' });
    this.originCombobox = page.getByTestId('qa-origin-field-input');
    this.destinationCombobox = page.getByTestId('qa-destination-field-input');
    this.departureDateDay = page.getByRole('textbox', { name: 'Departure Date day' });
    this.departureDateMonth = page.getByRole('textbox', { name: 'Departure Date month' });
    this.departureDateYear = page.getByRole('textbox', { name: 'Departure Date year' });
    this.returnDateDay = page.getByRole('textbox', { name: 'Return Date day' });
    this.returnDateMonth = page.getByRole('textbox', { name: 'Return Date month' });
    this.returnDateYear = page.getByRole('textbox', { name: 'Return Date year' });
    this.shopFlightsButton = page.getByRole('button', { name: 'SHOP FLIGHTS Button' });
    this.selectFareButton = page.getByTestId('qa-select-fare-button');
    this.createOrderButton = page.getByTestId('qa-price-summary-header-create-order-button');
    this.tripTypeCombobox = page.locator('#flightType');
  }

  // ── Public Methods ──────────────────────────────────────────────────────────

  /**
   * Waits for the welcome message to appear and returns its text content.
   * Used to verify successful login into the Airline Workspace.
   *
   * @returns The welcome message text content, or null if not found
   */
  async getWelcomeText(): Promise<string | null> {
    logger.info('Waiting for welcome message to appear');
    try {
      await this.welcomeMessage.waitFor({ state: 'visible', timeout: LOADING_TIMEOUT });
    } catch {
      throw new Error('Welcome message was not visible within 60 seconds.');
    }
    const text = await this.welcomeMessage.textContent();
    logger.info(`Welcome text found: ${text}`);
    return text;
  }

  /**
   * Clicks the Air button in the navigation bar to open the flight search panel.
   * Waits for the search form to appear after clicking.
   */
  async clickAirButton(): Promise<void> {
    logger.info('Clicking Air button');
    await this.click(this.airButton);
    await this.sleep(TIMEOUT);
    logger.info('Air button clicked, search panel opened');
  }

  /**
   * Fills the origin and destination airport codes in the flight search form.
   * Types each code character by character to trigger the autosuggest dropdown,
   * then selects the first matching option.
   *
   * @param origin - The 3-letter IATA airport code for departure, e.g. 'SYD'
   * @param destination - The 3-letter IATA airport code for arrival, e.g. 'BNE'
   */
  async selectCityPair(origin: string, destination: string): Promise<void> {
    logger.info(`Selecting city pair: ${origin} -> ${destination}`);
    await this.originCombobox.pressSequentially(origin);
    await this.sleep(TIMEOUT);
    const originOption = this.page.locator('[role="option"]').first();
    await this.click(originOption);

    await this.destinationCombobox.pressSequentially(destination);
    await this.sleep(TIMEOUT);
    const destinationOption = this.page.locator('[role="option"]').first();
    await this.click(destinationOption);
    logger.info(`City pair selected: ${origin} -> ${destination}`);
  }

  /**
   * Fills the departure and return date fields in the flight search form.
   * For Round Trip, fills both departure and return dates.
   * For One Way, fills only the departure date.
   * Dates are calculated as today + the offset days specified in todayPlusDate.
   *
   * @param tripType - 'RT' for Round Trip or 'OW' for One Way
   * @param todayPlusDate - Comma-separated day offsets from today, e.g. '10,17' for RT or '10' for OW
   */
  async selectTravelDates(tripType: string, todayPlusDate: string): Promise<void> {
    logger.info(`Selecting travel dates for ${tripType} with offsets: ${todayPlusDate}`);
    const offsets = todayPlusDate.split(',').map(s => parseInt(s.trim(), 10));
    const today = new Date();

    const departureDate = new Date(today);
    departureDate.setDate(today.getDate() + offsets[0]);

    const depDay = String(departureDate.getDate()).padStart(2, '0');
    const depMonth = departureDate.toLocaleString('en-US', { month: 'short' });
    const depYear = String(departureDate.getFullYear());

    await this.fill(this.departureDateDay, depDay);
    await this.fill(this.departureDateMonth, depMonth);
    await this.fill(this.departureDateYear, depYear);

    if (tripType === 'RT' && offsets.length > 1) {
      const returnDate = new Date(today);
      returnDate.setDate(today.getDate() + offsets[1]);

      const retDay = String(returnDate.getDate()).padStart(2, '0');
      const retMonth = returnDate.toLocaleString('en-US', { month: 'short' });
      const retYear = String(returnDate.getFullYear());

      await this.fill(this.returnDateDay, retDay);
      await this.fill(this.returnDateMonth, retMonth);
      await this.fill(this.returnDateYear, retYear);
    }
    logger.info('Travel dates filled');
  }

  /**
   * Clicks the SHOP FLIGHTS button to submit the search form and load flight results.
   * Waits for the results to load after clicking.
   */
  async clickOnShopFlightsButton(): Promise<void> {
    logger.info('Clicking SHOP FLIGHTS button');
    await this.click(this.shopFlightsButton);
    await this.sleep(TIMEOUT);
    logger.info('SHOP FLIGHTS clicked, waiting for results');
  }

  /**
   * Selects a brand (fare family) for the first available flight in the results.
   * Clicks the brand button matching the specified brand type (e.g. 'CHOICE', 'LITE', 'FLEX').
   *
   * @param brandType - The brand name to select, e.g. 'CHOICE', 'LITE', 'FLEX', 'BUSINESS'
   */
  async selectBrand(brandType: string): Promise<void> {
    logger.info(`Selecting brand: ${brandType}`);
    const brandButton = this.page.getByRole('button', { name: `Brand ${brandType}` }).first();
    await this.click(brandButton);
    logger.info(`Brand '${brandType}' selected`);
  }

  /**
   * Clicks the Select Fare button to confirm the currently selected brand/fare for a flight leg.
   * Should be called after selectBrand() for each flight leg (outbound and return).
   */
  async clickOnSelectFareButton(): Promise<void> {
    logger.info('Clicking Select Fare button');
    await this.click(this.selectFareButton);
    await this.sleep(TIMEOUT);
    logger.info('Fare selected');
  }

  /**
   * Clicks the CREATE ORDER button on the Price Summary panel.
   * This finalizes the flight selection and proceeds to the passenger details form.
   * Should be called after both outbound and return fares have been selected.
   */
  async clickOnCreateOrderButton(): Promise<void> {
    logger.info('Clicking CREATE ORDER button');
    await step('Click CREATE ORDER to proceed to passenger details', async () => {
      await this.click(this.createOrderButton);
    });
    await this.sleep(TIMEOUT);
    logger.info('CREATE ORDER clicked');
  }
}
