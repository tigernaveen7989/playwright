import { Page, Locator } from '@playwright/test';

export default class loginpage {
  private page: Page;
  private usernameInput: Locator;
  private passwordInput: Locator;
  private loginButton: Locator;
  private nextButton : Locator;
  private verifyButton : Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('#input28');
    this.passwordInput = page.locator('#input61');
    this.loginButton = page.locator("a[href='/Login/Do']");
    this.nextButton = page.locator("input[value='Next']");
    this.verifyButton =  page.locator("input[value='Verify']");
  }

  async login(username: string, password: string): Promise<void> {
    await this.loginButton.click();
    await this.usernameInput.fill(username);
    await this.nextButton.click();
    await this.passwordInput.fill(password);
    await this.verifyButton.click();
  }
}
