import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../../utilities/blackpanther';
import { LoggerFactory } from '../../utilities/logger';
import { faker } from '@faker-js/faker';

const logger = LoggerFactory.getLogger(__filename);

interface PassengerDetail {
  paxId: string;
  firstName: string;
  lastName: string;
  middleName: string;
  dateOfBirth: string;
  email: string;
  gender: string;
  age: number;
  title: string;
  mobileNumber: string;
}

interface FlightDetail {
  segment: string;
  route: string;
  departureTime: string;
  arrivalTime: string;
  cabin: string;
  flightNumber: string;
  brandType: string;
}

export { PassengerDetail, FlightDetail };

export default class passengerdetailspage extends BlackPanther {
  private readonly lastNameEditbox: Locator;
  private readonly firstNameEditbox: Locator;
  private readonly genderDropdown: Locator;
  private readonly middleNameEditbox: Locator;
  private readonly titleDropdown: Locator;
  private readonly mobilePhoneEditbox: Locator;
  private readonly emailEdibox: Locator;
  private readonly dateOfBirthEditbox: Locator;
  private readonly updateButton: Locator;
  private readonly nextPaxButton: Locator;
  private readonly saveButton: Locator;
  private readonly yesButtonFromPaymentPopup: Locator;
  private readonly noButtonFromPaymentPopup: Locator;
  private readonly flightTableGrid: Locator;
  private readonly flightTableRows: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.lastNameEditbox = page.locator("xpath=//input[@id='tbxResLastNamePax']");
    this.firstNameEditbox = page.locator("xpath=//input[@id='tbxResFirstNamePax']");
    this.genderDropdown = page.locator("xpath=//select[@id='ddlResGenderPax']");
    this.middleNameEditbox = page.locator("xpath=//input[@id='tbxResMiddleNamePax']");
    this.titleDropdown = page.locator("xpath=//select[@id='ddlResInfoTitlePax']");
    this.mobilePhoneEditbox = page.locator("xpath=//input[contains(@id,'CellPhonePax')]");
    this.emailEdibox = page.locator("xpath=//input[@id='tbxResEmailPax']");
    this.dateOfBirthEditbox = page.locator("xpath=//input[@id='tbxPaxDob']");
    this.updateButton = page.locator("xpath=//button[@id='btnResUpdatePaxInfo']");
    this.nextPaxButton = page.locator("xpath=//button[@id='btnResNextPax']");
    this.saveButton = page.locator("xpath=//button[@id='btnResSavePax_0']");
    this.yesButtonFromPaymentPopup = page.locator("#button-1");
    this.noButtonFromPaymentPopup = page.locator("#button-0");
    this.flightTableGrid = page.locator("#kendoGridReservationItinerary");
    this.flightTableRows = page.locator("#kendoGridReservationItinerary tbody tr");
  }

  /**
   * Enters passenger details for each passenger in the paxType composition.
   * Fills all required fields (name, email, gender, title, DOB, phone) and captures passenger information.
   * @param paxType - Passenger composition string, e.g. '2A1C' (2 adults, 1 child).
   * @returns Array of passenger details captured (one entry per passenger with PAXID, names, age, email, etc.).
   */
  async enterAndGetPassengerDetails(paxType: string): Promise<PassengerDetail[]> {
    logger.info(`Starting passenger details entry for paxType='${paxType}'`);
    const passengerDetailsArray: PassengerDetail[] = [];
    const paxMap: Map<string, string> = this.getPaxType(paxType);
    let paxIndex = 1;

    for (const [paxKey, paxTypeValue] of paxMap.entries()) {
      const firstName: string = faker.person.firstName();
      const lastName: string = faker.person.lastName();
      const middleName: string = faker.person.middleName();
      const email: string = faker.internet.email({ firstName, lastName });
      let title = ["MR", "MRS", "DR", "MS"][Math.floor(Math.random() * 4)];
      const mobileNumber = faker.string.numeric(faker.number.int({ min: 9, max: 20 })); // Generates a random 10-digit phone number
      const today = new Date();
      const randomAge = Math.floor(Math.random() * (40 - 20 + 1)) + 20;
      const birthYear = today.getFullYear() - randomAge;
      let dob = `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}/${birthYear}`;
      let sex = faker.person.sex(); // returns 'male' or 'female'
      sex = sex === 'male' ? 'M' : 'F';

      if (paxTypeValue.match('CNN')) {
        const childAge = Math.floor(Math.random() * (11 - 3 + 1)) + 3;
        const childYear = today.getFullYear() - childAge;
        dob = `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}/${childYear}`;
        title = ["MSTR", "MISS"][Math.floor(Math.random() * 2)];
      } else if (paxTypeValue.match('INF') || paxTypeValue.match('INS')) {
        const infantAge = Math.floor(Math.random() * (3 - 1 + 1)) + 1;
        const infantYear = today.getFullYear() - infantAge;
        dob = `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}/${infantYear}`;
        title = ["MSTR", "MISS"][Math.floor(Math.random() * 2)];
      }

      logger.info(`Entering details for PAX${paxIndex}: firstName='${firstName.toUpperCase()}', lastName='${lastName.toUpperCase()}', paxType='${paxTypeValue}'`);

      await this.fill(this.firstNameEditbox, firstName.toUpperCase());
      await this.fill(this.lastNameEditbox, lastName.toUpperCase());
      await this.fill(this.middleNameEditbox, middleName.toUpperCase());
      await this.fill(this.emailEdibox, email.toUpperCase());
      await this.selectValueFromDropdown(this.genderDropdown, sex);
      await this.selectValueFromDropdown(this.titleDropdown, title);
      await this.fill(this.mobilePhoneEditbox, mobileNumber);
      await this.click(this.dateOfBirthEditbox);
      await this.fill(this.dateOfBirthEditbox, dob);
      await this.pressTab();

      // Capture passenger details into the map
      const passengerDetail: PassengerDetail = {
        paxId: `PAX${paxIndex}`,
        firstName: firstName.toUpperCase(),
        lastName: lastName.toUpperCase(),
        middleName: middleName.toUpperCase(),
        dateOfBirth: dob,
        email: email.toUpperCase(),
        gender: sex,
        age: randomAge,
        title,
        mobileNumber
      };
      passengerDetailsArray.push(passengerDetail);
      logger.info(`PAX${paxIndex} details captured: ${JSON.stringify(passengerDetail)}`);

      if (await this.nextPaxButton.isEnabled({ timeout: 3000 })) {
        await this.click(this.nextPaxButton);
        await this.sleep(5000);
      }

      paxIndex++;
    }

    if (await this.updateButton.isEnabled({ timeout: 3000 })) {
      await this.click(this.updateButton);
      await this.sleep(2000);
    }

    logger.info(`Passenger details entry completed. Total passengers captured=${passengerDetailsArray.length}`);
    return passengerDetailsArray;
  }

  /**
   * Captures flight details from the flight itinerary grid table.
   * Extracts segment number, route (origin-destination), departure/arrival times, cabin type, flight number, and brand type.
   * @returns Array of flight details with segment, route, departureTime, arrivalTime, cabin, flightNumber, and brandType.
   */
  async getFlightDetails(): Promise<FlightDetail[]> {
    logger.info('Starting flight details capture from itinerary grid');
    const flightDetailsArray: FlightDetail[] = [];

    try {
      // Wait for flight table to be visible
      await this.flightTableGrid.waitFor({ state: 'visible', timeout: 30000 });
      logger.info('Flight table grid is visible');

      // Get all flight rows from the table
      const rows = await this.flightTableRows.all();
      logger.info(`Found ${rows.length} flight row(s) in the itinerary grid`);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Extract each column value from the row (matching the order from attachment)
        const cells = row.locator('td');
        const cellCount = await cells.count();
        
        if (cellCount < 7) {
          logger.info(`Row ${i} has insufficient columns (${cellCount}), skipping`);
          continue;
        }

        // Column indices: Seg(0), Type(1), Flt Num(2), Route(3), Dep Date & Time(4), Arr Date & Time(5), Cabin(6)
        const segment = await cells.nth(0).textContent() || '';
        const flightNumber = await cells.nth(2).textContent() || '';
        const route = await cells.nth(3).textContent() || '';
        const departureTime = await cells.nth(4).textContent() || '';
        const arrivalTime = await cells.nth(5).textContent() || '';
        const cabin = await cells.nth(6).textContent() || '';

        // Extract brand type from the offer/brand information if available
        // Looking for the brand type that was selected during booking (e.g., ECONOMY, BUSINESS, etc.)
        const brandType = cabin.trim() || 'ECONOMY';

        const flightDetail: FlightDetail = {
          segment: `segment${segment.trim()}`,
          route: route.trim(),
          departureTime: departureTime.trim(),
          arrivalTime: arrivalTime.trim(),
          cabin: cabin.trim(),
          flightNumber: flightNumber.trim(),
          brandType: brandType
        };

        flightDetailsArray.push(flightDetail);
        logger.info(`Flight ${i + 1} captured: ${JSON.stringify(flightDetail)}`);
      }

      logger.info(`Flight details capture completed. Total flights captured=${flightDetailsArray.length}`);
    } catch (error) {
      logger.info(`Error capturing flight details: ${error}`);
      throw new Error(`Failed to capture flight details: ${error}`);
    }

    return flightDetailsArray;
  }

  /**
   * Clicks the Save button to save passenger details.
   */
  async clickOnSaveButton(): Promise<void> {
    logger.info('Clicking Save button for passenger details');
    await this.click(this.saveButton);
    await this.sleep(5000);
    logger.info('Save button clicked');
  }

  /**
   * Clicks the Yes button from the payment popup.
   */
  async clickOnYesButton(): Promise<void> {
    logger.info('Clicking Yes button from payment popup');
    await this.click(this.yesButtonFromPaymentPopup);
    logger.info('Yes button clicked');
  }

  /**
   * Clicks the No button from the payment popup.
   */
  async clickOnNoButton(): Promise<void> {
    logger.info('Clicking No button from payment popup');
    await this.click(this.noButtonFromPaymentPopup);
    logger.info('No button clicked');
  }
}