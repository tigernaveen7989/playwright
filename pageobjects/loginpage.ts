import { Page, Locator, TestInfo } from '@playwright/test';
import { LoggerFactory } from '../utilities/logger';
import { attachment, step } from 'allure-js-commons';
import { BlackPanther } from '../utilities/blackpanther';
const logger = LoggerFactory.getLogger(__filename);


export default class loginpage extends BlackPanther{
  private usernameInput: Locator;
  private passwordInput: Locator;
  private loginButton: Locator;
  private nextButton: Locator;
  private verifyButton: Locator;
  private testInfo: TestInfo;

  constructor(page: Page, testInfo: TestInfo) {
    super(page);
    this.page = page;
    this.testInfo = testInfo;
    this.usernameInput = page.locator('#input28');
    this.passwordInput = page.locator('#input61');
    this.loginButton = page.locator("a[href='/Login/Do']");
    this.nextButton = page.locator("input[value='Next']");
    this.verifyButton = page.locator("input[value='Verify']");
  }

  public async login(username: string, password: string): Promise<void> {
    let ccUrl: string = '';
    await step('Login into call center', async () => {
      ccUrl = this.testInfo.annotations.find(a => a.type === 'ccUrl')?.description ?? '';

      await step(`Url: ${ccUrl}`, async () => {
        // You can also nest steps if needed
      });

      await step(`Username: ${username}`, async () => {
        // You can also nest steps if needed
      });

      await step(`password: ${password}`, async () => {
        // You can also nest steps if needed
      });

    });
    await this.loginButton.click();
    await this.usernameInput.fill(username);
    await this.nextButton.click();
    await this.passwordInput.fill(password);
    await this.verifyButton.click();
    logger.info("entered " + username + " and password " + password);
    logger.info("login successful");
  }
}
