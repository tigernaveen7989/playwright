import { Page, TestInfo } from '@playwright/test';
import DxVasmHomePage from './homepage';
import DxVasmFlightSelectionPage from './flightselectionpage';
import DxVasmPassengerDetailsPage from './passengerdetailspage';
import DxVasmAncillariesPage from './ancillariespage';
import DxVasmPaymentPage from './paymentpage';

export default class DxVasmPageObjectManager {
  public homePage: DxVasmHomePage;
  public flightSelectionPage: DxVasmFlightSelectionPage;
  public passengerDetailsPage: DxVasmPassengerDetailsPage;
  public ancillariesPage: DxVasmAncillariesPage;
  public paymentPage: DxVasmPaymentPage;

  constructor(page: Page, testInfo: TestInfo) {
    this.homePage = new DxVasmHomePage(page, testInfo);
    this.flightSelectionPage = new DxVasmFlightSelectionPage(page);
    this.passengerDetailsPage = new DxVasmPassengerDetailsPage(page);
    this.ancillariesPage = new DxVasmAncillariesPage(page);
    this.paymentPage = new DxVasmPaymentPage(page);
  }
}
