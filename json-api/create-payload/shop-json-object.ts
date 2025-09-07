import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

export class ShopJsonObject {
  origin: string;
  destination: string;
  day: number;
  month: number;
  year: number;
  currency: string;

  constructor(
    origin: string,
    destination: string,
    day: number,
    month: number,
    year: number,
    currency: string = 'EUR'
  ) {
    this.origin = origin;
    this.destination = destination;
    this.day = day;
    this.month = month;
    this.year = year;
    this.currency = currency;
  }

  getShopPayload(paxtype: string): string {
    const passengers = this.getPassengersJSONArray(paxtype);
    const payload: any = {
      request: {
        origin_destinations_criteria: [{
          origin_departure_criteria: {
            date: {
              month: this.month,
              year: this.year,
              day: this.day
            },
            airportCode: this.origin
          },
          destination_arrival_criteria: {
            airportCode: this.destination
          }
        }],
        passengers,
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

    logger.info('shop payload request is : ', JSON.stringify(payload));
    return JSON.stringify(payload);
  }



  // Method inside the class
  getPassengersJSONArray(paxtype: string): { passenger_type_code: string; id: string }[] {
    const passengers: { passenger_type_code: string; id: string }[] = [];
    let paxId = 1;

    const matchAdult = paxtype.match(/(\d+)A/);
    const matchChild = paxtype.match(/(\d+)C/);

    const numAdults = matchAdult ? parseInt(matchAdult[1], 10) : 0;
    const numChildren = matchChild ? parseInt(matchChild[1], 10) : 0;

    for (let i = 0; i < numAdults; i++) {
      passengers.push({ passenger_type_code: 'ADT', id: `PAX${paxId++}` });
    }

    for (let i = 0; i < numChildren; i++) {
      passengers.push({ passenger_type_code: 'CNN', id: `PAX${paxId++}` });
    }

    logger.info('passenger object is : '+ passengers);
    return passengers;
  }

}
