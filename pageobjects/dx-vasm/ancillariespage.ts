import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../../utilities/blackpanther';
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

const TIMEOUT = 3000;

export default class DxVasmAncillariesPage extends BlackPanther {

  // ── Locators ────────────────────────────────────────────────────────────────
  private readonly continueButton: Locator;
  private readonly addBaggageButton: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.continueButton = page.getByRole('button', { name: 'Continue' });
    this.addBaggageButton = page.getByRole('button', { name: 'ADD' });
  }

  // ── Public Methods ──────────────────────────────────────────────────────────

  /**
   * Clicks the Continue button to skip adding any extras/baggage
   * and proceed to the payment page.
   */
  async clickContinue(): Promise<void> {
    logger.info('Clicking Continue button to skip ancillaries');
    await this.click(this.continueButton);
    await this.sleep(TIMEOUT);
    logger.info('Ancillaries skipped, proceeding to payment');
  }
}
