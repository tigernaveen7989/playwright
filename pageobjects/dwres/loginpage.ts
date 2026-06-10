import { Page, Locator, TestInfo } from '@playwright/test';
import { LoggerFactory } from '../../utilities/logger';
import { step } from 'allure-js-commons';
import { BlackPanther } from '../../utilities/blackpanther';
const logger = LoggerFactory.getLogger(__filename);

const TIMEOUT = 3000;

export default class LoginPage extends BlackPanther {

  // ── Locators ────────────────────────────────────────────────────────────────
  private readonly loginButton: Locator;
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly nextButton: Locator;
  private readonly verifyButton: Locator;
  private readonly testInfo: TestInfo;

  constructor(page: Page, testInfo: TestInfo) {
    super(page);
    this.page = page;
    this.testInfo = testInfo;
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.usernameInput = page.locator('#input28');
    this.passwordInput = page.locator('#input61');
    this.nextButton = page.locator("input[value='Next']");
    this.verifyButton = page.locator("input[value='Verify']");
  }

  // ── Public Methods ──────────────────────────────────────────────────────────

  /**
   * Logs into the DWRES Airline Workspace application via Okta SSO.
   * Navigates to the DWRES URL, clicks the Login button on the landing page,
   * then completes the Okta username/password flow.
   *
   * @param username - The Okta username/email to authenticate with
   * @param password - The Okta password for authentication
   */
  async login(username: string, password: string): Promise<void> {
    const { dwresUrl } = this.loadConfig();
    this.testInfo.annotations.push({ type: 'dwresUrl', description: dwresUrl });
    await step('Login into DWRES Airline Workspace', async () => {
      await step(`Url: ${dwresUrl}`, async () => {});
      await step(`Username: ${username}`, async () => {});
    });

    logger.info(`Navigating to DWRES URL: ${dwresUrl}`);
    await this.page.goto(dwresUrl, { timeout: 60000 });
    await this.click(this.loginButton);
    await this.fill(this.usernameInput, username);
    await this.click(this.nextButton);
    await this.fill(this.passwordInput, password);
    await this.click(this.verifyButton);
    logger.info(`Login completed for user: ${username}`);
  }
}
