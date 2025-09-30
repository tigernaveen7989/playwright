// basetest.ts
import { test as baseTest, Browser, BrowserContext, Page, chromium, firefox, webkit, TestInfo } from '@playwright/test';
import POManager from '../pageobjects/pageobjectmanager';
import LoginPage from '../pageobjects/loginpage';
import HomePage from '../pageobjects/homepage';
import PassengerDetailsPage from '../pageobjects/passengerdetailspage';
import { BlackPanther } from '../utilities/blackpanther';
import { label } from 'allure-js-commons';
import { LoggerFactory } from '../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

export class BaseTest {
  private browser!: Browser;
  protected context!: BrowserContext;
  protected page!: Page;
  public poManager!: POManager;
  public blackPanther : BlackPanther;

  // Static exposed variables
  static loginPage: LoginPage;
  static homePage: HomePage;
  static passengerDetailsPage: PassengerDetailsPage;

  static baseTestInstance: BaseTest;

  async setup(browserName: string, testInfo: TestInfo): Promise<void> {
    switch (browserName) {
      case 'firefox':
        this.browser = await firefox.launch();
        break;
      case 'webkit':
        this.browser = await webkit.launch();
        break;
      case 'chromium':
      default:
        this.browser = await chromium.launch();
        break;
    }

    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    this.poManager = new POManager(this.page, testInfo);
    this.blackPanther = new BlackPanther(this.page);
    const {ccUrl} = this.blackPanther.loadConfig();
    testInfo.annotations.push({ type: 'ccUrl', description: ccUrl });

    await this.page.goto(ccUrl);

    // Assign static properties here:
    BaseTest.loginPage = this.poManager.loginPage;
    BaseTest.homePage = this.poManager.homePage;
    BaseTest.passengerDetailsPage = this.poManager.passengerDetailsPage;
  }

  async teardown(): Promise<void> {
    await this.browser.close();
  }

  static registerHooks(test: typeof baseTest) {
    test.beforeEach(async ({}, testInfo) => {
      const browserName = testInfo.project.use.browserName ?? 'chromium';
      label('suite', 'call-center');

      BaseTest.baseTestInstance = new BaseTest();
      await BaseTest.baseTestInstance.setup(browserName, testInfo);
    });

    test.afterEach(async () => {
      if (BaseTest.baseTestInstance) {
        await BaseTest.baseTestInstance.teardown();
      }
    });
  }
}

// Type-safe runtime getter exports
export const loginPage: LoginPage = new Proxy({} as LoginPage, {
  get(_, prop) {
    if (!BaseTest.loginPage) {
      throw new Error('loginPage is not initialized. Did you forget to call BaseTest.registerHooks(test)?');
    }
    return (BaseTest.loginPage as any)[prop];
  }
});

export const homePage: HomePage = new Proxy({} as HomePage, {
  get(_, prop) {
    if (!BaseTest.homePage) {
      throw new Error('homePage is not initialized.');
    }
    return (BaseTest.homePage as any)[prop];
  }
});

export const passengerDetailsPage: PassengerDetailsPage = new Proxy({} as PassengerDetailsPage, {
  get(_, prop) {
    if (!BaseTest.passengerDetailsPage) {
      throw new Error('passengerDetailsPage is not initialized.');
    }
    return (BaseTest.passengerDetailsPage as any)[prop];
  }
});
