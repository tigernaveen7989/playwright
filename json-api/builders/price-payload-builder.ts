/**
 * Builds the price request payload.
 *
 * Usage:
 *   new PricePayloadBuilder()
 *     .withOfferItems(paxIdOffersItemIdsMap)
 *     .build();
 */
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

export class PricePayloadBuilder {
  private paxIdOffersItemIdsMap: Map<string, string> = new Map();

  // ─── Offer Items ─────────────────────────────────────────────────────────

  withOfferItems(paxIdOffersItemIdsMap: Map<string, string>): this {
    this.paxIdOffersItemIdsMap = paxIdOffersItemIdsMap;
    return this;
  }

  // ─── Build ───────────────────────────────────────────────────────────────

  build(): object {
    logger.info('Pax id offer items map:', JSON.stringify(Object.fromEntries(this.paxIdOffersItemIdsMap)));
    const offerId = this.paxIdOffersItemIdsMap.get('OfferId');

    const selected_offer_items = Array.from(this.paxIdOffersItemIdsMap.entries())
      .filter(([key]) => key !== 'OfferId')
      .map(([paxId, offerItemId]) => ({
        id: offerItemId,
        passenger_ids: [paxId],
        selected_fares: []
      }));

    const payload = {
      point_of_sale: {
        channel: 'STANDARD',
        country: { code: 'AU' },
        city: { code: 'SYD' }
      },
      sender: {
        enabled_system: {},
        marketing_carrier: { airline_designator_code: 'VA' }
      },
      request: {
        selected_offers: [{ id: offerId, selected_offer_items }],
        override_currency: 'AUD',
        response_parameters: {
          disable_availability_check: false,
          disable_tax_calculation: false,
          booking_category: 'ALL'
        }
      },
      diagnostics: {}
    };
    logger.info('Price payload:', JSON.stringify(payload));
    return payload;
  }
}
