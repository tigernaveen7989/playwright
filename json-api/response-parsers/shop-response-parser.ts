export class ShopResponseParser {
  getPaxType(paxType: string): Map<string, string> {
    const paxMap = new Map<string, string>();
    let paxIndex = 1;

    const regex = /(\d+)(INS|A|C|I)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(paxType)) !== null) {
      const count = parseInt(match[1], 10);
      const typeCode = match[2];

      let paxTypeLabel: string;
      switch (typeCode) {
        case 'A':   paxTypeLabel = 'ADT'; break;
        case 'C':   paxTypeLabel = 'CNN'; break;
        case 'I':   paxTypeLabel = 'INF'; break;
        case 'INS': paxTypeLabel = 'INS'; break;
        default: throw new Error(`Unknown pax type: ${typeCode}`);
      }

      for (let i = 0; i < count; i++) {
        paxMap.set(`PAX${paxIndex++}`, paxTypeLabel);
      }
    }

    if (paxMap.size === 0) {
      throw new Error('Invalid paxType format.');
    }

    return paxMap;
  }

  getPaxOfferItemIdsMap(
    paxMap: Map<string, string>,
    responseBody: string
  ): Map<string, string> {
    const paxIdOfferItemIdsMap = new Map<string, string>();
    const assignedOfferItemIds = new Set<string>();

    let offerResponse: {
      offers: Array<{
        definition: { id: string };
        offerItems: Array<{
          id: string;
          services: Array<{ passengerIds: string[] }>;
        }>;
      }>;
    };

    try {
      offerResponse = JSON.parse(responseBody);
    } catch {
      throw new Error('Invalid JSON string passed as responseBody');
    }

    for (const offer of offerResponse.offers) {
      const offerId = offer.definition.id;

      for (const [paxId] of paxMap) {
        const offerItem = offer.offerItems.find(oi => {
          const allPassengerIds = oi.services.flatMap(service => service.passengerIds);
          return allPassengerIds.includes(paxId) && !assignedOfferItemIds.has(oi.id);
        });

        if (offerItem) {
          paxIdOfferItemIdsMap.set(paxId, offerItem.id);
          assignedOfferItemIds.add(offerItem.id);
        }
      }

      paxIdOfferItemIdsMap.set('OfferId', offerId);
    }

    return paxIdOfferItemIdsMap;
  }
}
