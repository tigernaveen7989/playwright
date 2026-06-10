import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../../utilities/blackpanther';
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

const TIMEOUT = 5000;

export default class DxVasmPaymentPage extends BlackPanther {

  // ── Locators ────────────────────────────────────────────────────────────────
  private readonly cardNumberInput: Locator;
  private readonly expiryDateInput: Locator;
  private readonly cvcInput: Locator;
  private readonly nameOnCardInput: Locator;
  private readonly looksGoodCheckbox: Locator;
  private readonly completeBookingButton: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.cardNumberInput = page.getByRole('textbox', { name: 'Card number' });
    this.expiryDateInput = page.getByRole('textbox', { name: 'Expiry date' });
    this.cvcInput = page.getByRole('textbox', { name: 'CVC' });
    this.nameOnCardInput = page.getByRole('textbox', { name: 'Name on card' });
    this.looksGoodCheckbox = page.getByText('Looks good!');
    this.completeBookingButton = page.getByRole('button', { name: 'To complete your booking...' });
  }

  // ── Public Methods ──────────────────────────────────────────────────────────

  /**
   * Fills in credit card payment details on the payment page.
   * Enters the card number, expiry date, CVC, and name on card.
   *
   * @param cardNumber - The credit card number, e.g. '5123456789012346'
   * @param expiryDate - The card expiry date in MM-YY format, e.g. '12-29'
   * @param cvc - The card verification code, e.g. '123'
   * @param nameOnCard - The name on the card, e.g. 'John Smith'
   */
  async enterCardDetails(cardNumber: string, expiryDate: string, cvc: string, nameOnCard: string): Promise<void> {
    logger.info('Entering credit card details on payment page');
    await this.fill(this.cardNumberInput, cardNumber);
    await this.fill(this.expiryDateInput, expiryDate);
    await this.fill(this.cvcInput, cvc);
    await this.fill(this.nameOnCardInput, nameOnCard);
    logger.info('Card details entered');
  }

  /**
   * Clicks the "Looks good!" label text to check the acknowledgement checkbox.
   * The native checkbox input is overlaid by a spark-checkbox__box span that intercepts
   * pointer events, so clicking the label text is the reliable approach.
   */
  async checkLooksGood(): Promise<void> {
    logger.info('Checking Looks good! checkbox');
    await this.click(this.looksGoodCheckbox);
    logger.info('Looks good! checkbox checked');
  }

  /**
   * Clicks the "To complete your booking..." button to submit the payment and finalize the booking.
   * Waits for the booking confirmation page to load.
   */
  async clickCompleteBooking(): Promise<void> {
    logger.info('Clicking To complete your booking button');
    await this.click(this.completeBookingButton);
    await this.sleep(TIMEOUT);
    logger.info('Complete booking clicked, waiting for confirmation');
  }
}
