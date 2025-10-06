// pageobjects/POManager.ts
import { Page, TestInfo } from '@playwright/test';
import LoginPage from './loginpage';
import HomePage from './homepage';
import PassengerDetailsPage from './passengerdetailspage';
import AddPaymentToNewReservationPage from './addpaymenttonewreservationpage';
import PayByCreditCardPage from './paybycreditcardpage';
import BookingConfirmationPage from './bookingconfirmationpage';

export default class pageobjectmanager {
  public loginPage: LoginPage;
  public homePage: HomePage;
  public passengerDetailsPage: PassengerDetailsPage;
  public addPaymentToNewReservationPage: AddPaymentToNewReservationPage;
  public payByCreditCardPage: PayByCreditCardPage;
  public bookingConfirmationPage: BookingConfirmationPage;

  constructor(page: Page, testInfo: TestInfo) {
    this.loginPage = new LoginPage(page, testInfo);
    this.homePage = new HomePage(page);
    this.passengerDetailsPage = new PassengerDetailsPage(page);
    this.addPaymentToNewReservationPage = new AddPaymentToNewReservationPage(page);
    this.payByCreditCardPage = new PayByCreditCardPage(page);
    this.bookingConfirmationPage = new BookingConfirmationPage(page);
  }
}
