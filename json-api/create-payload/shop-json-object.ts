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

  getShopPayload(): string {
    const payload = {
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
        passengers: [{ passenger_type_code: 'ADT', id: 'PAX1' }],
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

    return JSON.stringify(payload);
  }
}
