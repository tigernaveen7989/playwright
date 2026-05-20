/**
 * Builds the shop request payload.
 *
 * Usage:
 *   new ShopPayloadBuilder()
 *     .withRoute('SYD', 'BNE')
 *     .withDepartureDate(10, 6, 2026)
 *     .withCurrency('AUD')
 *     .withPassengers('2A1C')
 *     .build();
 */
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

export class ShopPayloadBuilder {
  private origin: string = '';
  private destination: string = '';
  private day: number = 0;
  private month: number = 0;
  private year: number = 0;
  private currency: string = 'AUD';
  private paxtype: string = '';

  // ─── Route ───────────────────────────────────────────────────────────────

  withRoute(origin: string, destination: string): this {
    this.origin = origin;
    this.destination = destination;
    return this;
  }

  // ─── Date ────────────────────────────────────────────────────────────────

  withDepartureDate(day: number, month: number, year: number): this {
    this.day = day;
    this.month = month;
    this.year = year;
    return this;
  }

  // ─── Currency ────────────────────────────────────────────────────────────

  withCurrency(currency: string): this {
    this.currency = currency;
    return this;
  }

  // ─── Passengers ──────────────────────────────────────────────────────────

  withPassengers(paxtype: string): this {
    this.paxtype = paxtype;
    return this;
  }

  // ─── Build ───────────────────────────────────────────────────────────────

  build(): object {
    const payload = {
      request: {
        origin_destinations_criteria: [
          {
            origin_departure_criteria: {
              date: { month: this.month, year: this.year, day: this.day },
              airportCode: this.origin
            },
            destination_arrival_criteria: {
              airportCode: this.destination
            }
          }
        ],
        passengers: this.buildPassengers(),
        requestType: 'ADVCAL30',
        offer_criteria: { program: { programAccountIds: [] } },
        currency: this.currency
      },
      sender: {
        enabled_system: { name: 'POS' },
        marketing_carrier: { airline_designator_code: 'VA' }
      },
      point_of_sale: {
        country: { code: 'CA' },
        city: { code: 'ORD' },
        channel: 'STANDARD'
      }
    };
    logger.info('Shop payload:', JSON.stringify(payload));
    return payload;
  }

  private buildPassengers(): { passenger_type_code: string; id: string }[] {
    const passengers: { passenger_type_code: string; id: string }[] = [];
    let paxId = 1;

    const numAdults = parseInt(this.paxtype.match(/(\d+)A/)?.[1] ?? '0', 10);
    const numChildren = parseInt(this.paxtype.match(/(\d+)C/)?.[1] ?? '0', 10);

    for (let i = 0; i < numAdults; i++) {
      passengers.push({ passenger_type_code: 'ADT', id: `PAX${paxId++}` });
    }
    for (let i = 0; i < numChildren; i++) {
      passengers.push({ passenger_type_code: 'CNN', id: `PAX${paxId++}` });
    }

    logger.info('Shop passengers:', JSON.stringify(passengers));
    return passengers;
  }
}
