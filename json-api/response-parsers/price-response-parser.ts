import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

export class PriceResponseParser {
  getPassengerDetailsMap(
    responseJson: any,
    passengerTypeMap: Map<string, string>
  ): Map<string, Map<string, string>> {
    const result = new Map<string, Map<string, string>>();

    const passengerList = responseJson?.dataLists?.passengers ?? [];
    const paxTypeCodeMap = new Map<string, string>();
    for (const passenger of passengerList) {
      if (passenger.id && passenger.passengerTypeCode) {
        paxTypeCodeMap.set(passenger.id, passenger.passengerTypeCode);
      }
    }

    const offerItems = responseJson?.pricedOffer?.offerItems ?? [];

    for (const offerItem of offerItems) {
      const offerItemId = offerItem.id;
      const price = offerItem.price?.totalAmount?.amount || '';
      const services = offerItem.services ?? [];

      for (const service of services) {
        const paxIds = service.passengerIds ?? [];
        const journeyIds = service.offerServiceAssociation?.journey?.passengerJourneyIds ?? [];

        for (const paxId of paxIds) {
          if (!passengerTypeMap.has(paxId)) continue;

          const infoMap = result.get(paxId) ?? new Map<string, string>();

          if (!infoMap.has('offerItemId')) infoMap.set('offerItemId', offerItemId);
          if (!infoMap.has('price')) infoMap.set('price', price);
          if (journeyIds.length > 0 && !infoMap.has('passengerJourneyIds')) {
            infoMap.set('passengerJourneyIds', journeyIds.join(','));
          }
          if (!infoMap.has('paxTypeCode') && paxTypeCodeMap.has(paxId)) {
            infoMap.set('paxTypeCode', paxTypeCodeMap.get(paxId)!);
          }

          result.set(paxId, infoMap);
        }
      }
    }

    logger.info('Passenger details map:', JSON.stringify(Object.fromEntries([...result].map(([k, v]) => [k, Object.fromEntries(v)])), null, 2));
    return result;
  }

  getOfferId(response: any): string {
    const id = response?.pricedOffer?.definition?.id;
    if (!id) {
      throw new Error('Offer ID not found in response');
    }
    return id;
  }
}
