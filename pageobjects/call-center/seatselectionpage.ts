import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../../utilities/blackpanther';
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

// ── Constants ──────────────────────────────────────────────────────────────────
const TIMEOUT = 3000;

export default class SeatSelectionPage extends BlackPanther {

  // ── Locators ────────────────────────────────────────────────────────────────
  private readonly seatAssignmentPopup: Locator;
  private readonly segmentRadioButtons: Locator;
  private readonly passengerRadioButtons: Locator;
  private readonly seatMapTable: Locator;
  private readonly saveButton: Locator;
  private readonly closeButton: Locator;
  private readonly availablePaidSeat: Locator;
  private readonly availableFreeSeat: Locator;
  private readonly availableEmergencyExitSeat: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.seatAssignmentPopup = page.locator('#seatAssignmentPopupContent');
    this.segmentRadioButtons = page.locator('#lstSeatmapItinerary li');
    this.passengerRadioButtons = page.locator('#lstSeatmapPassengers li');
    this.seatMapTable = page.locator('#tblSeatmapMain');
    this.saveButton = page.locator("xpath=//button[contains(@data-bind,'saveSeatAssignment') or contains(text(),'Save')]");
    this.closeButton = page.locator("xpath=//button[contains(@data-bind,'closeSeatAssignment') or contains(@class,'spark-modal__close')]");
    this.availablePaidSeat = page.locator('.planeAvailablePaidSeat');
    this.availableFreeSeat = page.locator('.planeAvailableSeat:not(.planeAvailablePaidSeat)');
    this.availableEmergencyExitSeat = page.locator('.planeAvailableEmergencyExitSeat, .planeAvailableEmergencySeat, .planeAvailableExitSeat, .planeAvailableEESSeat');
  }

  // ── Public Methods ──────────────────────────────────────────────────────────

  /**
   * Selects a flight segment from the itinerary panel on the left side of the seat map.
   * Segments are 0-indexed: segment 0 = first flight, segment 1 = return flight.
   *
   * @param segmentIndex - Zero-based index of the segment to select, e.g. 0 for SEGMENT_1
   */
  async selectSegment(segmentIndex: number): Promise<void> {
    logger.info(`Selecting segment at index: ${segmentIndex}`);
    const segmentRadio = this.segmentRadioButtons.nth(segmentIndex).locator('#rdoSeatmapLf');
    await this.click(segmentRadio);
    // seat map reloads via AJAX after segment switch
    await this.sleep(TIMEOUT);
    logger.info(`Segment ${segmentIndex} selected`);
  }

  /**
   * Selects a passenger from the passengers panel on the left side of the seat map.
   * Passengers are 0-indexed: PAX1 = index 0, PAX2 = index 1, etc.
   *
   * @param passengerIndex - Zero-based index of the passenger to select, e.g. 0 for PAX1
   */
  async selectPassenger(passengerIndex: number): Promise<void> {
    logger.info(`Selecting passenger at index: ${passengerIndex}`);
    const paxRadio = this.passengerRadioButtons.nth(passengerIndex).locator('input[name="seatMapPassengers"]');
    await this.click(paxRadio);
    // seat availability highlights refresh after passenger switch
    await this.sleep(TIMEOUT);
    logger.info(`Passenger ${passengerIndex} selected`);
  }

  /**
   * Clicks on the first available paid seat in the seat map for the currently selected passenger.
   * A paid seat has the CSS class 'planeAvailablePaidSeat'. After clicking, the seat
   * transitions to 'planeSelectedSeat' status.
   *
   * @param seatCount - Number of available paid seats to click (default 1)
   */
  async selectFirstAvailablePaidSeat(seatCount: number = 1): Promise<void> {
    logger.info(`Selecting ${seatCount} available paid seat(s)`);
    for (let i = 0; i < seatCount; i++) {
      await this.click(this.availablePaidSeat.first());
      // UI animates seat state transition before next selection is possible
      await this.sleep(TIMEOUT);
      logger.info(`Paid seat ${i + 1} selected`);
    }
    logger.info(`${seatCount} paid seat(s) selected`);
  }

  /**
   * Clicks on the first available free seat in the seat map for the currently selected passenger.
   * A free seat has the CSS class 'planeAvailableSeat' but NOT 'planeAvailablePaidSeat'.
   *
   * @param seatCount - Number of available free seats to click (default 1)
   */
  async selectFirstAvailableFreeSeat(seatCount: number = 1): Promise<void> {
    logger.info(`Selecting ${seatCount} available free seat(s)`);
    for (let i = 0; i < seatCount; i++) {
      await this.click(this.availableFreeSeat.first());
      // UI animates seat state transition before next selection is possible
      await this.sleep(TIMEOUT);
      logger.info(`Free seat ${i + 1} selected`);
    }
    logger.info(`${seatCount} free seat(s) selected`);
  }

  /**
   * Clicks on the first available emergency-exit seat in the seat map for the
   * currently selected passenger.
   *
   * @param seatCount - Number of available emergency-exit seats to click (default 1)
   */
  async selectFirstAvailableEmergencyExitSeat(seatCount: number = 1): Promise<void> {
    logger.info(`Selecting ${seatCount} available emergency-exit seat(s)`);
    for (let i = 0; i < seatCount; i++) {
      await this.click(this.availableEmergencyExitSeat.first());
      // UI animates seat state transition before next selection is possible
      await this.sleep(TIMEOUT);
      logger.info(`Emergency-exit seat ${i + 1} selected`);
    }
    logger.info(`${seatCount} emergency-exit seat(s) selected`);
  }

  /**
   * Assigns seats for all passengers on a given segment based on the parsed seat type map.
   * Iterates through each passenger entry, selects the passenger, and clicks the
   * appropriate seat type (PAID or FREE).
   *
   * @param segmentIndex - Zero-based index of the segment (0 = SEGMENT_1)
   * @param paxSeatEntries - Array of { paxIndex, seatCount, seatType } from parseSeatType()
   */
  async assignSeatsForSegment(
    segmentIndex: number,
    paxSeatEntries: Array<{ paxIndex: number; seatCount: number; seatType: string }>
  ): Promise<void> {
    logger.info(`Assigning seats for segment ${segmentIndex + 1}`);
    await this.selectSegment(segmentIndex);

    for (const entry of paxSeatEntries) {
      await this.selectPassenger(entry.paxIndex);

      if (entry.seatType === 'PAID') {
        await this.selectFirstAvailablePaidSeat(entry.seatCount);
      } else if (entry.seatType === 'EMERGENCY_EXIT') {
        await this.selectFirstAvailableEmergencyExitSeat(entry.seatCount);
      } else {
        await this.selectFirstAvailableFreeSeat(entry.seatCount);
      }
    }
    logger.info(`Seats assigned for segment ${segmentIndex + 1}`);
  }

  /**
   * Clicks the Save button on the seat assignment popup to confirm all seat selections.
   * Waits for the popup to close after saving.
   */
  async clickSaveButton(): Promise<void> {
    logger.info('Clicking Save button on seat assignment popup');
    await this.click(this.saveButton);
    // backend processes seat assignment and closes the popup
    await this.sleep(TIMEOUT);
    logger.info('Seat assignments saved');
  }

  /**
   * Returns the seat charge text for each passenger from the passengers panel.
   * Reads the 'Charge:' field for all passengers listed in the seat map sidebar.
   *
   * @returns Array of charge strings, e.g. ['13.00 EUR', '13.00 EUR', '0.00 EUR']
   */
  async getPassengerCharges(): Promise<string[]> {
    logger.info('Reading passenger seat charges');
    const charges: string[] = [];
    const count = await this.passengerRadioButtons.count();

    for (let i = 0; i < count; i++) {
      const chargeLocator = this.passengerRadioButtons.nth(i).locator("span[data-bind*='formatCharges']");
      const chargeText = await chargeLocator.textContent() ?? '0.00';
      charges.push(chargeText.trim());
    }

    logger.info(`Passenger charges: ${JSON.stringify(charges)}`);
    logger.info('Passenger seat charges read completed');
    return charges;
  }

  /**
   * Returns the assigned seat label for each passenger from the passengers panel.
   * Reads the 'Seat:' field for all passengers listed in the seat map sidebar.
   *
   * @returns Array of seat labels, e.g. ['9A', '9C', ''] (empty string if no seat assigned)
   */
  async getAssignedSeats(): Promise<string[]> {
    logger.info('Reading assigned seats for all passengers');
    const seats: string[] = [];
    const count = await this.passengerRadioButtons.count();

    for (let i = 0; i < count; i++) {
      const seatLocator = this.passengerRadioButtons.nth(i).locator("span[data-bind*='RowNum() + Seat()']");
      const seatText = await seatLocator.textContent() ?? '';
      seats.push(seatText.trim());
    }

    logger.info(`Assigned seats: ${JSON.stringify(seats)}`);
    logger.info('Assigned seats read completed');
    return seats;
  }
}
