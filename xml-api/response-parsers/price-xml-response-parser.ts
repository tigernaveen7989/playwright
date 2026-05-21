import * as xpath from 'xpath';
import { DOMParser } from 'xmldom';
import { LoggerFactory } from '../../utilities/logger';

const logger = LoggerFactory.getLogger(__filename);

export class PriceXmlResponseParser {

  /**
   * Extracts the OfferID from the Price XML response.
   * Throws if the OfferID element is absent or empty.
   *
   * @param xmlString Raw Price XML response text
   * @returns OfferID string
   */
  getOfferID(xmlString: string): string {
    const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
    if (!doc?.documentElement) throw new Error('PriceXmlResponseParser: invalid XML document in getOfferID');

    const nodes = xpath.select(`//*[local-name()='OfferID']`, doc);
    if (!Array.isArray(nodes) || nodes.length === 0) {
      throw new Error('PriceXmlResponseParser: OfferID not found in price response');
    }

    const offerId = (nodes[0] as any).textContent?.trim() ?? '';
    if (!offerId) throw new Error('PriceXmlResponseParser: OfferID is empty in price response');

    logger.info(`Price response — OfferID: ${offerId}`);
    return offerId;
  }

  /**
   * Builds a passenger details map from the Price XML response.
   * Each passenger entry contains offerItemId, price, passengerJourneyIds,
   * and paxTypeCode sourced from the provided paxTypeMap.
   * Passengers not present in paxTypeMap are skipped.
   * Throws if the XML document is invalid.
   *
   * @param xmlString Raw Price XML response text
   * @param paxTypeMap Map produced by ShopXmlResponseParser.getPaxType()
   * @returns Map of PAX ID → { offerItemId, price, passengerJourneyIds, paxTypeCode }
   */
  getPassengerDetailsMap(xmlString: string, paxTypeMap: Map<string, string>): Map<string, Map<string, string>> {
    const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
    if (!doc?.documentElement) throw new Error('PriceXmlResponseParser: invalid XML document in getPassengerDetailsMap');

    const passengerDetailsMap = new Map<string, Map<string, string>>();
    const offerItemNodes = xpath.select(`//*[local-name()='OfferItem']`, doc) as any[];

    for (const offerItemNode of offerItemNodes) {
      const offerItemId = this.extractText(offerItemNode, `./*[local-name()='OfferItemID']`);
      const price = this.extractText(offerItemNode, `./*[local-name()='Price']/*[local-name()='TotalAmount']`);
      const paxRefId = this.extractText(offerItemNode, `./*[local-name()='Service']/*[local-name()='PaxRefID']`);

      // Skip offer items whose PAX ID is not in the requested paxTypeMap
      if (!paxRefId || !paxTypeMap.has(paxRefId)) continue;

      // Keep only the FIRST offer's items per PAX — prevents mixing OfferIDs across multiple priced offers
      if (passengerDetailsMap.has(paxRefId)) continue;

      // Extract the parent offer's OfferID (sibling of OfferItem in the PricedOffer container)
      const offerId = offerItemNode.parentNode
        ? this.extractText(offerItemNode.parentNode, `./*[local-name()='OfferID']`)
        : '';

      const passengerJourneyIds = this.extractText(
        offerItemNode,
        `./*[local-name()='Service']/*[local-name()='OfferServiceAssociation']/*[local-name()='PaxJourneyRef']/*[local-name()='PaxJourneyRefID']`
      );

      const paxDetails = new Map<string, string>();
      paxDetails.set('offerId', offerId);
      paxDetails.set('offerItemId', offerItemId);
      paxDetails.set('price', price);
      paxDetails.set('passengerJourneyIds', passengerJourneyIds);
      paxDetails.set('paxTypeCode', paxTypeMap.get(paxRefId)!);

      passengerDetailsMap.set(paxRefId, paxDetails);
    }

    logger.info(
      'Price response — passenger details map: ',
      JSON.stringify(
        Object.fromEntries(Array.from(passengerDetailsMap.entries()).map(([k, v]) => [k, Object.fromEntries(Array.from(v.entries()))])),
        null,
        2
      )
    );
    return passengerDetailsMap;
  }

  /**
   * Extracts the OfferID from a populated passengerDetailsMap.
   * Always consistent with the OfferItemIDs stored in the map — use this
   * instead of getOfferID() when building a CreateOrder request.
   * Throws if the map is empty or the offerId entry is missing.
   *
   * @param passengerDetailsMap result of getPassengerDetailsMap()
   * @returns OfferID string
   */
  getOfferId(passengerDetailsMap: Map<string, Map<string, string>>): string {
    const firstEntry = Array.from(passengerDetailsMap.values())[0];
    if (!firstEntry) throw new Error('PriceXmlResponseParser: passengerDetailsMap is empty');
    const offerId = firstEntry.get('offerId') ?? '';
    if (!offerId) throw new Error('PriceXmlResponseParser: offerId not found in passengerDetailsMap');
    logger.info(`Price response — selected OfferId: ${offerId}`);
    return offerId;
  }

  // Extracts trimmed text content from the first matching XPath node; returns '' if not found
  private extractText(contextNode: any, xpathExpr: string): string {
    const nodes = xpath.select(xpathExpr, contextNode);
    const node = Array.isArray(nodes) && nodes.length > 0 ? nodes[0] : null;
    return (node as any)?.textContent?.trim() ?? '';
  }
}
