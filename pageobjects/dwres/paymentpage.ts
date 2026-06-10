import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../../utilities/blackpanther';
import { LoggerFactory } from '../../utilities/logger';
import { step } from 'allure-js-commons';
const logger = LoggerFactory.getLogger(__filename);

const TIMEOUT = 5000;

export default class PaymentPage extends BlackPanther {

  // ── Locators ────────────────────────────────────────────────────────────────
  private readonly cardNumberInput: Locator;
  private readonly expirationDateInput: Locator;
  private readonly cvvInput: Locator;
  private readonly nameOnCardInput: Locator;
  private readonly termsCheckbox: Locator;
  private readonly payButton: Locator;
  private readonly cancelPaymentButton: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.cardNumberInput = page.getByRole('textbox', { name: 'Card Number' });
    this.expirationDateInput = page.getByRole('textbox', { name: 'Expiration Date' });
    this.cvvInput = page.getByRole('textbox', { name: 'CVV' });
    this.nameOnCardInput = page.getByRole('textbox', { name: 'Name on Card' });
    this.termsCheckbox = page.getByRole('checkbox', { name: 'Yes, I agree to the Virgin Australia Terms & Conditions' });
    this.payButton = page.getByRole('button', { name: /^Pay \d/ });
    this.cancelPaymentButton = page.getByRole('button', { name: 'CANCEL PAYMENT' });
  }

  // ── Public Methods ──────────────────────────────────────────────────────────

  /**
   * Fills in credit card details on the payment gateway page.
   * Enters the card number, expiration date, CVV, and cardholder name.
   *
   * @param cardNumber - The credit card number, e.g. '5123456789012346'
   * @param cardName - The name on the card, e.g. 'Test User'
   * @param cvv - The card verification value, e.g. '123'
   * @param expirationDate - The card expiration date in MM/YY format, e.g. '12/29'
   */
  async enterCardDetails(cardNumber: string, cardName: string, cvv: string, expirationDate: string): Promise<void> {
    logger.info('Entering credit card details on payment page');
    await this.cardNumberInput.waitFor({ state: 'visible', timeout: 40000 });
    await this.fill(this.cardNumberInput, cardNumber);
    await this.fill(this.expirationDateInput, expirationDate);
    await this.fill(this.cvvInput, cvv);
    await this.fill(this.nameOnCardInput, cardName);
    logger.info('Card details entered');
  }

  /**
   * Checks the Terms & Conditions acceptance checkbox.
   * Must be checked before the Pay button becomes enabled.
   */
  async acceptTermsAndConditions(): Promise<void> {
    logger.info('Accepting Terms & Conditions');
    await this.clickOnCheckbox(this.termsCheckbox);
    logger.info('Terms & Conditions accepted');
  }

  /**
   * Clicks the Pay button to submit the credit card payment.
   * The button displays the total amount (e.g. 'Pay 442.00 AUD').
   * Waits for the payment to be processed.
   */
  async clickPayButton(): Promise<void> {
    logger.info('Clicking Pay button to complete payment');
    await step('Click Pay button to submit credit card payment', async () => {
      await this.click(this.payButton);
    });
    await this.sleep(TIMEOUT);
    logger.info('Payment submitted');
  }
}
