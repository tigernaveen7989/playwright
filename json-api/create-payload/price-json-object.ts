import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

export class PriceJsonObject {
  origin: string;
  destination: string;
  day: number;
  month: number;
  year: number;
  currency: string;

  constructor() {

  }

  public getPricePayload(paxIdOffersItemIdsMap): string {
    logger.info('pax id offer items map', JSON.stringify(Object.fromEntries(paxIdOffersItemIdsMap), null, 2));
    const payload: any = {
      point_of_sale: {
        channel: 'STANDARD',
        country: {
          code: 'AU'
        },
        city: {
          code: 'SYD'
        }
      },
      sender: {
        enabled_system: {},
        marketing_carrier: {
          airline_designator_code: 'VA'
        }
      },
      request: this.getSelectedOffersJSONArray(paxIdOffersItemIdsMap),
      diagnostics: {}
    };


    logger.info('price payload request is : ', JSON.stringify(payload));
    return JSON.stringify(payload);
  }

  private getSelectedOffersJSONArray(paxOfferItemIdsMap: Map<string, string>): any {
    const offerId = paxOfferItemIdsMap.get("OfferId"); // ✅ use .get()

    const selected_offer_items = Array.from(paxOfferItemIdsMap.entries())
      .filter(([key]) => key !== "OfferId") // skip OfferId
      .map(([paxId, offerItemId]) => ({
        id: offerItemId,
        passenger_ids: [paxId],
        selected_fares: []
      }));

    return {
      selected_offers: [
        {
          id: offerId,
          selected_offer_items
        }
      ],
      override_currency: "AUD",
      response_parameters: {
        disable_availability_check: false,
        disable_tax_calculation: false,
        booking_category: "ALL"
      }
    };
  }
}
