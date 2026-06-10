import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../../utilities/blackpanther';
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

const TIMEOUT = 5000;
const LOADING_TIMEOUT = 60000;

export default class DxVasmFlightSelectionPage extends BlackPanther {

  // ── Locators ────────────────────────────────────────────────────────────────
  private readonly continueButton: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.continueButton = page.getByRole('button', { name: 'Continue' });
  }

  // ── Public Methods ──────────────────────────────────────────────────────────

  /**
   * Selects the first available flight with the specified brand offer (e.g. 'Lite', 'Choice', 'Flex').
   * Clicks the brand offer button for the first flight that matches the brand name.
   *
   * @param brandType - The brand name to select, e.g. 'Lite', 'Choice', 'Flex', 'Business'
   */
  async selectBrandOffer(brandType: string): Promise<void> {
    logger.info(`Selecting ${brandType} brand offer for first available flight`);
    const brandButton = this.page.getByRole('button', { name: new RegExp(`Select ${brandType} brand offer`) }).first();
    await brandButton.waitFor({ state: 'visible', timeout: LOADING_TIMEOUT });
    await this.click(brandButton);
    await this.sleep(TIMEOUT);
    logger.info(`${brandType} brand offer selected`);
  }

  /**
   * Clicks the Continue button to confirm the flight selection and proceed to passenger details.
   */
  async clickContinue(): Promise<void> {
    logger.info('Clicking Continue button on flight review');
    await this.click(this.continueButton);
    await this.sleep(TIMEOUT);
    logger.info('Continue clicked, proceeding to next step');
  }
}
