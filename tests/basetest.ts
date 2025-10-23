import {
  test as baseTest,
  Browser,
  BrowserContext,
  Page,
  chromium,
  firefox,
  webkit,
  TestInfo
} from '@playwright/test';

import POManager from '../pageobjects/pageobjectmanager';
import LoginPage from '../pageobjects/loginpage';
import HomePage from '../pageobjects/homepage';
import PassengerDetailsPage from '../pageobjects/passengerdetailspage';
import AddPaymentToNewReservationPage from '../pageobjects/addpaymenttonewreservationpage';
import PayByCreditCardPage from '../pageobjects/paybycreditcardpage';
import BookingConfirmationPage from '../pageobjects/bookingconfirmationpage';
import { BlackPanther } from '../utilities/blackpanther';
import { label } from 'allure-js-commons';
import { LoggerFactory } from '../utilities/logger';

const logger = LoggerFactory.getLogger(__filename);

export class BaseTest {
  private browser!: Browser;
  protected context!: BrowserContext;
  protected page!: Page;
  public poManager!: POManager;
  public blackPanther!: BlackPanther;

  // Static exposed variables
  static loginPage: LoginPage;
  static homePage: HomePage;
  static passengerDetailsPage: PassengerDetailsPage;
  static addPaymentToNewReservationPage: AddPaymentToNewReservationPage;
  static payByCreditCardPage: PayByCreditCardPage;
  static bookingConfirmationPage: BookingConfirmationPage;

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

    const { ccUrl } = this.blackPanther.loadConfig();
    testInfo.annotations.push({ type: 'ccUrl', description: ccUrl });

    await this.page.goto(ccUrl);

    // Assign static properties
    BaseTest.loginPage = this.poManager.loginPage;
    BaseTest.homePage = this.poManager.homePage;
    BaseTest.passengerDetailsPage = this.poManager.passengerDetailsPage;
    BaseTest.addPaymentToNewReservationPage = this.poManager.addPaymentToNewReservationPage;
    BaseTest.payByCreditCardPage = this.poManager.payByCreditCardPage;
    BaseTest.bookingConfirmationPage = this.poManager.bookingConfirmationPage;
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

    test.afterEach(async ({}, testInfo) => {
      if (BaseTest.baseTestInstance) {
        const { page } = BaseTest.baseTestInstance;

        if (testInfo.status !== testInfo.expectedStatus) {
          try {
            // const screenshotBuffer = await page.screenshot({ fullPage: true });

            // // Attach to Playwright HTML report
            // await testInfo.attach('Failure Screenshot', {
            //   body: screenshotBuffer,
            //   contentType: 'image/png',
            // });
          } catch (error) {
            logger.error(`Failed to capture screenshot: ${error}`);
          }
        }

        await BaseTest.baseTestInstance.teardown();
      }
    });
  }
}

// Type-safe runtime getter exports
function createPageProxy<T extends object>(
  pageName: keyof typeof BaseTest,
  errorMessage?: string
): T {
  return new Proxy({} as T, {
    get(_, prop: string | symbol) {
      const pageInstance = BaseTest[pageName];
      if (!pageInstance) {
        throw new Error(
          errorMessage ||
            `${String(pageName)} is not initialized. Did you forget to call BaseTest.registerHooks(test)?`
        );
      }
      return (pageInstance as any)[prop];
    },
  });
}

// Usage:
export const loginPage = createPageProxy<LoginPage>('loginPage');
export const homePage = createPageProxy<HomePage>('homePage');
export const passengerDetailsPage = createPageProxy<PassengerDetailsPage>('passengerDetailsPage');
export const addPaymentToNewReservationPage = createPageProxy<AddPaymentToNewReservationPage>('addPaymentToNewReservationPage');
export const payByCreditCardPage = createPageProxy<PayByCreditCardPage>('payByCreditCardPage');
export const bookingConfirmationPage = createPageProxy<BookingConfirmationPage>('bookingConfirmationPage');