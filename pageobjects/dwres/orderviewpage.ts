import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../../utilities/blackpanther';
import { LoggerFactory } from '../../utilities/logger';
import { step } from 'allure-js-commons';
const logger = LoggerFactory.getLogger(__filename);

const TIMEOUT = 5000;
const ORDER_LOAD_TIMEOUT = 30000;

export default class OrderViewPage extends BlackPanther {

  // ── Locators ────────────────────────────────────────────────────────────────
  private readonly orderIdText: Locator;
  private readonly pnrButton: Locator;
  private readonly payButton: Locator;
  private readonly selectAllCheckbox: Locator;
  private readonly payNowButton: Locator;
  private readonly paidWithCashButton: Locator;
  private readonly cancelPaymentButton: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.orderIdText = page.getByTestId('qa-view-order-header-order-id');
    this.pnrButton = page.locator('[data-testid="flight-path-pnr-button"]');
    this.payButton = page.getByRole('button', { name: /^PAY AUD/ });
    this.selectAllCheckbox = page.getByTestId('qa-make-payment-table-head-row-service-type-cell-checkbox-input');
    this.payNowButton = page.getByTestId('qa-make-payment-modal-submit-button');
    this.paidWithCashButton = page.getByRole('button', { name: 'PAID WITH CASH' });
    this.cancelPaymentButton = page.getByRole('button', { name: 'Cancel' });
  }

  // ── Public Methods ──────────────────────────────────────────────────────────

  /**
   * Retrieves the Order ID displayed on the order view page header.
   * Waits for the order to fully load before extracting the ID text.
   *
   * @returns The order ID string, e.g. 'VA7952A56Z87Y'
   */
  async getOrderId(): Promise<string> {
    logger.info('Waiting for order ID to appear');
    await this.sleep(ORDER_LOAD_TIMEOUT);
    await this.orderIdText.waitFor({ state: 'visible', timeout: TIMEOUT });
    const orderId = await this.orderIdText.textContent() ?? '';
    logger.info(`Order ID found: ${orderId}`);
    return orderId.trim();
  }

  /**
   * Retrieves the PNR (Passenger Name Record) from the order view page.
   * Extracts the PNR text from the PNR button element.
   *
   * @returns The PNR string, e.g. 'QOLNLD'
   */
  async getPnr(): Promise<string> {
    logger.info('Retrieving PNR from order view');
    const pnrElement = this.page.locator('[data-testid="qa-view-order-header-pnr"]');
    // pnr is inside a button, extract from text
    const headerText = await this.page.locator('[data-testid="qa-view-order-header"]').textContent() ?? '';
    const pnrMatch = headerText.match(/([A-Z]{6})/);
    const pnr = pnrMatch ? pnrMatch[1] : '';
    logger.info(`PNR found: ${pnr}`);
    return pnr;
  }

  /**
   * Clicks the PAY button on the order view to open the payment selection panel.
   * The PAY button displays the total amount due (e.g. 'PAY AUD 442.00').
   */
  async clickPayButton(): Promise<void> {
    logger.info('Clicking PAY button');
    await step('Click PAY button to initiate payment', async () => {
      await this.click(this.payButton);
    });
    await this.sleep(TIMEOUT);
    logger.info('PAY button clicked, payment panel opened');
  }

  /**
   * Selects all payment items using the Select All checkbox in the payment table.
   * This enables the PAY NOW and PAID WITH CASH buttons.
   */
  async selectAllPaymentItems(): Promise<void> {
    logger.info('Selecting all payment items');
    await this.clickOnCheckbox(this.selectAllCheckbox);
    await this.sleep(TIMEOUT);
    logger.info('All payment items selected');
  }

  /**
   * Clicks the PAY NOW button to proceed with credit card payment.
   * Opens a new browser tab with the payment gateway form.
   * Should be called after selectAllPaymentItems().
   *
   * @returns The new Page object for the payment tab
   */
  async clickPayNowButton(): Promise<Page> {
    logger.info('Clicking PAY NOW button');
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.click(this.payNowButton),
    ]);
    await newPage.waitForLoadState('domcontentloaded');
    await this.sleep(TIMEOUT);
    logger.info('PAY NOW clicked, payment page opened in new tab');
    return newPage;
  }
}
