import { Page, Locator, TestInfo } from '@playwright/test';
import { LoggerFactory } from '../../utilities/logger';
import { attachment, step } from 'allure-js-commons';
import { BlackPanther } from '../../utilities/blackpanther';
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
    const { ccUrl } = this.loadConfig();
    this.testInfo.annotations.push({ type: 'ccUrl', description: ccUrl });
    await step('Login into call center', async () => {
      await step(`Url: ${ccUrl}`, async () => {});
      await step(`Username: ${username}`, async () => {});
      await step(`Password: ${password}`, async () => {});
    });

    await this.page.goto(ccUrl, { timeout: 60000 });
    await this.click(this.loginButton);
    await this.fill(this.usernameInput, username);
    await this.click(this.nextButton);
    await this.fill(this.passwordInput, password);
    await this.click(this.verifyButton);
    logger.info("entered " + username + " and password " + password);
    logger.info("login successful");
  }
}
