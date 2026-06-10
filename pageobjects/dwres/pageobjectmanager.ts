import { Page, TestInfo } from '@playwright/test';
import LoginPage from './loginpage';
import HomePage from './homepage';
import CreateOrderPage from './createorderpage';
import OrderViewPage from './orderviewpage';
import PaymentPage from './paymentpage';

export default class DwresPageObjectManager {
  public loginPage: LoginPage;
  public homePage: HomePage;
  public createOrderPage: CreateOrderPage;
  public orderViewPage: OrderViewPage;
  public paymentPage: PaymentPage;

  constructor(page: Page, testInfo: TestInfo) {
    this.loginPage = new LoginPage(page, testInfo);
    this.homePage = new HomePage(page);
    this.createOrderPage = new CreateOrderPage(page);
    this.orderViewPage = new OrderViewPage(page);
    this.paymentPage = new PaymentPage(page);
  }
}
