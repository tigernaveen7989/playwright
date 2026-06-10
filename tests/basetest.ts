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
import * as allure from 'allure-js-commons';

import POManager from '../pageobjects/call-center/pageobjectmanager';
import LoginPage from '../pageobjects/call-center/loginpage';
import HomePage from '../pageobjects/call-center/homepage';
import PassengerDetailsPage from '../pageobjects/call-center/passengerdetailspage';
import AddPaymentToNewReservationPage from '../pageobjects/call-center/addpaymenttonewreservationpage';
import PayByCreditCardPage from '../pageobjects/call-center/paybycreditcardpage';
import BookingConfirmationPage from '../pageobjects/call-center/bookingconfirmationpage';
import SeatSelectionPage from '../pageobjects/call-center/seatselectionpage';
import AirExchangePage from '../pageobjects/call-center/airexchangepage';
import AncillaryPage from '../pageobjects/call-center/ancillarypage';
import DwresPageObjectManager from '../pageobjects/dwres/pageobjectmanager';
import DwresLoginPage from '../pageobjects/dwres/loginpage';
import DwresHomePage from '../pageobjects/dwres/homepage';
import DwresCreateOrderPage from '../pageobjects/dwres/createorderpage';
import DwresOrderViewPage from '../pageobjects/dwres/orderviewpage';
import DwresPaymentPage from '../pageobjects/dwres/paymentpage';
import DxVasmPageObjectManager from '../pageobjects/dx-vasm/pageobjectmanager';
import DxVasmHomePage from '../pageobjects/dx-vasm/homepage';
import DxVasmFlightSelectionPage from '../pageobjects/dx-vasm/flightselectionpage';
import DxVasmPassengerDetailsPage from '../pageobjects/dx-vasm/passengerdetailspage';
import DxVasmAncillariesPage from '../pageobjects/dx-vasm/ancillariespage';
import DxVasmPaymentPage from '../pageobjects/dx-vasm/paymentpage';
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

  // Static exposed variables — Call Center
  static loginPage: LoginPage;
  static homePage: HomePage;
  static passengerDetailsPage: PassengerDetailsPage;
  static addPaymentToNewReservationPage: AddPaymentToNewReservationPage;
  static payByCreditCardPage: PayByCreditCardPage;
  static bookingConfirmationPage: BookingConfirmationPage;
  static seatSelectionPage: SeatSelectionPage;
  static airExchangePage: AirExchangePage;
  static ancillaryPage: AncillaryPage;

  // Static exposed variables — DWRES
  static dwresLoginPage: DwresLoginPage;
  static dwresHomePage: DwresHomePage;
  static dwresCreateOrderPage: DwresCreateOrderPage;
  static dwresOrderViewPage: DwresOrderViewPage;
  static dwresPaymentPage: DwresPaymentPage;

  // Static exposed variables — DX-VASM
  static dxVasmHomePage: DxVasmHomePage;
  static dxVasmFlightSelectionPage: DxVasmFlightSelectionPage;
  static dxVasmPassengerDetailsPage: DxVasmPassengerDetailsPage;
  static dxVasmAncillariesPage: DxVasmAncillariesPage;
  static dxVasmPaymentPage: DxVasmPaymentPage;

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
    this.blackPanther = new BlackPanther(this.page);

    const projectName = testInfo.project.name.toLowerCase();

    if (projectName === 'dwres') {
      const dwresPoManager = new DwresPageObjectManager(this.page, testInfo);
      BaseTest.dwresLoginPage = dwresPoManager.loginPage;
      BaseTest.dwresHomePage = dwresPoManager.homePage;
      BaseTest.dwresCreateOrderPage = dwresPoManager.createOrderPage;
      BaseTest.dwresOrderViewPage = dwresPoManager.orderViewPage;
      BaseTest.dwresPaymentPage = dwresPoManager.paymentPage;
    } else if (projectName === 'dx-vasm') {
      const dxVasmPoManager = new DxVasmPageObjectManager(this.page, testInfo);
      BaseTest.dxVasmHomePage = dxVasmPoManager.homePage;
      BaseTest.dxVasmFlightSelectionPage = dxVasmPoManager.flightSelectionPage;
      BaseTest.dxVasmPassengerDetailsPage = dxVasmPoManager.passengerDetailsPage;
      BaseTest.dxVasmAncillariesPage = dxVasmPoManager.ancillariesPage;
      BaseTest.dxVasmPaymentPage = dxVasmPoManager.paymentPage;
    } else {
      this.poManager = new POManager(this.page, testInfo);
      BaseTest.loginPage = this.poManager.loginPage;
      BaseTest.homePage = this.poManager.homePage;
      BaseTest.passengerDetailsPage = this.poManager.passengerDetailsPage;
      BaseTest.addPaymentToNewReservationPage = this.poManager.addPaymentToNewReservationPage;
      BaseTest.payByCreditCardPage = this.poManager.payByCreditCardPage;
      BaseTest.bookingConfirmationPage = this.poManager.bookingConfirmationPage;
      BaseTest.seatSelectionPage = this.poManager.seatSelectionPage;
      BaseTest.airExchangePage = this.poManager.airExchangePage;
      BaseTest.ancillaryPage = this.poManager.ancillaryPage;
    }
  }

  async teardown(): Promise<void> {
    await this.browser.close();
  }

  static registerHooks(test: typeof baseTest) {
    test.beforeEach(async ({ }, testInfo) => {
      const browserName = testInfo.project.use.browserName ?? 'chromium';
      label('suite', testInfo.project.name.toLowerCase());

      BaseTest.baseTestInstance = new BaseTest();
      await BaseTest.baseTestInstance.setup(browserName, testInfo);
    });

    test.afterEach(async ({ }, testInfo) => {
      if (BaseTest.baseTestInstance) {
        const { page } = BaseTest.baseTestInstance;

        // Read values from annotations
        const pnrNumber = testInfo.annotations.find(
          annotation => annotation.type === 'PNRNumber'
        )?.description;

        const orderId = testInfo.annotations.find(
          annotation => annotation.type === 'OrderId'
        )?.description;

        await allure.parameter(
          'PNR Number',
          pnrNumber || 'Order not created'
        );

        await allure.parameter(
          'Order ID',
          orderId || 'Order not created'
        );

        if (testInfo.status !== testInfo.expectedStatus) {
          try {
            // const screenshotBuffer = await page.screenshot({
            //   fullPage: true,
            // });

            // // Attach screenshot to Playwright report
            // await testInfo.attach('Failure Screenshot', {
            //   body: screenshotBuffer,
            //   contentType: 'image/png',
            // });

            // // Attach screenshot to Allure
            // await allure.attachment(
            //   'Failure Screenshot',
            //   screenshotBuffer,
            //   'image/png'
            // );

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

// Call Center proxies
export const loginPage = createPageProxy<LoginPage>('loginPage');
export const homePage = createPageProxy<HomePage>('homePage');
export const passengerDetailsPage = createPageProxy<PassengerDetailsPage>('passengerDetailsPage');
export const addPaymentToNewReservationPage = createPageProxy<AddPaymentToNewReservationPage>('addPaymentToNewReservationPage');
export const payByCreditCardPage = createPageProxy<PayByCreditCardPage>('payByCreditCardPage');
export const bookingConfirmationPage = createPageProxy<BookingConfirmationPage>('bookingConfirmationPage');
export const seatSelectionPage = createPageProxy<SeatSelectionPage>('seatSelectionPage');
export const airExchangePage = createPageProxy<AirExchangePage>('airExchangePage');
export const ancillaryPage = createPageProxy<AncillaryPage>('ancillaryPage');

// DWRES proxies
export const dwresLoginPage = createPageProxy<DwresLoginPage>('dwresLoginPage');
export const dwresHomePage = createPageProxy<DwresHomePage>('dwresHomePage');
export const dwresCreateOrderPage = createPageProxy<DwresCreateOrderPage>('dwresCreateOrderPage');
export const dwresOrderViewPage = createPageProxy<DwresOrderViewPage>('dwresOrderViewPage');
export const dwresPaymentPage = createPageProxy<DwresPaymentPage>('dwresPaymentPage');

// DX-VASM proxies
export const dxVasmHomePage = createPageProxy<DxVasmHomePage>('dxVasmHomePage');
export const dxVasmFlightSelectionPage = createPageProxy<DxVasmFlightSelectionPage>('dxVasmFlightSelectionPage');
export const dxVasmPassengerDetailsPage = createPageProxy<DxVasmPassengerDetailsPage>('dxVasmPassengerDetailsPage');
export const dxVasmAncillariesPage = createPageProxy<DxVasmAncillariesPage>('dxVasmAncillariesPage');
export const dxVasmPaymentPage = createPageProxy<DxVasmPaymentPage>('dxVasmPaymentPage');