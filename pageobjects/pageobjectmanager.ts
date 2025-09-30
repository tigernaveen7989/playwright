// pageobjects/POManager.ts
import { Page, TestInfo } from '@playwright/test';
import LoginPage from './loginpage';
import HomePage from './homepage';
import PassengerDetailsPage from './passengerdetailspage';

export default class pageobjectmanager {
  public loginPage: LoginPage;
  public homePage: HomePage;
  public passengerDetailsPage: PassengerDetailsPage;

  constructor(page: Page, testInfo: TestInfo) {
    this.loginPage = new LoginPage(page, testInfo);
    this.homePage = new HomePage(page);
    this.passengerDetailsPage = new PassengerDetailsPage(page);
  }
}
