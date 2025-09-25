import { Page, Locator } from '@playwright/test';

export default class homepage {
  private page: Page;
  private welcomeMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeMessage = page.locator("header[class='spark-header'] h3");
  }

  async getWelcomeText(): Promise<string | null> {
  await this.welcomeMessage.waitFor({ state: 'visible' }); // Explicit wait
  return await this.welcomeMessage.textContent();
}
}
