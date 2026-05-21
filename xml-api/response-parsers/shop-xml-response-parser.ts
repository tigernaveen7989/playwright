import { LoggerFactory } from '../../utilities/logger';

const logger = LoggerFactory.getLogger(__filename);

export class ShopXmlResponseParser {

  /**
   * Parses a pax type string into a Map of PAX IDs to IATA passenger type codes.
   * This map is required by ShopXmlPayloadBuilder and all downstream parsers.
   *
   * @param paxType Compact pax string e.g. '2A1C', '1A', '1A1INS'
   * @returns Map e.g. { PAX1 → 'ADT', PAX2 → 'ADT', PAX3 → 'CNN' }
   */
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
        default:    throw new Error(`ShopXmlResponseParser: unknown pax type code '${typeCode}'`);
      }

      for (let i = 0; i < count; i++) {
        paxMap.set(`PAX${paxIndex++}`, paxTypeLabel);
      }
    }

    if (paxMap.size === 0) throw new Error(`ShopXmlResponseParser: invalid paxType format '${paxType}'`);
    logger.info(`Parsed paxType '${paxType}' → ${JSON.stringify(Object.fromEntries(paxMap))}`);
    return paxMap;
  }

  /**
   * Extracts the OfferId and one OfferItemID per passenger from the Shop XML response.
   * Throws if OfferId is missing or any PAX ID in the paxMap has no matching OfferItemID.
   *
   * @param paxMap Map produced by getPaxType()
   * @param responseBody Raw Shop XML response text
   * @returns Map with key 'OfferId' plus one 'PAX*' → offerItemId entry per passenger
   */
  getPaxOfferItemIdsMap(paxMap: Map<string, string>, responseBody: string): Map<string, string> {
    const result = new Map<string, string>();

    // Decode HTML entities that may be present in the XML response
    const xml = responseBody
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    const offerIdMatch = xml.match(/<cns:OfferID>([^<]+)<\/cns:OfferID>/);
    if (!offerIdMatch) throw new Error('ShopXmlResponseParser: OfferID not found in shop response');
    result.set('OfferId', offerIdMatch[1].trim());

    const offerItemBlocks = xml.match(/<cns:OfferItem\b[\s\S]*?<\/cns:OfferItem>/g) || [];
    const matchedPaxIds = new Set<string>();

    for (const block of offerItemBlocks) {
      const itemIdMatch = block.match(/<cns:OfferItemID>([^<]+)<\/cns:OfferItemID>/);
      const paxMatch = block.match(/<cns:PaxRefID>([^<]+)<\/cns:PaxRefID>/);

      if (itemIdMatch && paxMatch) {
        const paxId = paxMatch[1].trim();
        const offerItemId = itemIdMatch[1].trim();

        if (paxMap.has(paxId) && !matchedPaxIds.has(paxId)) {
          result.set(paxId, offerItemId);
          matchedPaxIds.add(paxId);
        }
      }

      if (matchedPaxIds.size === paxMap.size) break;
    }

    for (const paxId of Array.from(paxMap.keys())) {
      if (!result.has(paxId)) throw new Error(`ShopXmlResponseParser: no OfferItemID found for ${paxId}`);
    }

    logger.info(`Shop response parsed — OfferId: ${result.get('OfferId')}, pax matched: ${matchedPaxIds.size}`);
    return result;
  }
}
