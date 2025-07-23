import { Page, Locator } from '@playwright/test';

export default class homepage {
  private page: Page;
  private welcomeMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeMessage = page.locator('#welcome');
  }

  async getWelcomeText(): Promise<string | null> {
    return await this.welcomeMessage.textContent();
  }
}
