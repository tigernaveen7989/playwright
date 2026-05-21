/**
 * Builds the Price XML request payload from the IATA OfferPriceRQ template.
 *
 * Usage:
 *   new PriceXmlPayloadBuilder()
 *     .withPaxIdOffersItemIdsMap(paxIdOffersItemIdsMap)  // from ShopXmlResponseParser
 *     .withOwnerCode('VA')
 *     .withCurrency('AUD')
 *     .withLocationCode('SYD')
 *     .withCountryCode('AU')
 *     .withSellerOrgId('')
 *     .withCarrierOrgId('')
 *     .build();
 */
import { readFileSync } from 'fs';
import { XmlTemplateProcessor } from '../../api-base/xml-template-processor';
import { LoggerFactory } from '../../utilities/logger';

const logger = LoggerFactory.getLogger(__filename);

export class PriceXmlPayloadBuilder {
  private readonly xmlProcessor = new XmlTemplateProcessor();
  private readonly priceTemplatePath = `${process.cwd()}/xml-api/payloads/price/price.txt`;
  private readonly selectedOfferItemTemplatePath = `${process.cwd()}/xml-api/payloads/price/selectedofferitem.txt`;

  private paxIdOffersItemIdsMap: Map<string, string> = new Map();
  private ownerCode: string = '';
  private currency: string = 'AUD';
  private locationCode: string = '';
  private countryCode: string = '';
  private sellerOrgId: string = '';
  private carrierOrgId: string = '';

  // ─── Offer Map ───────────────────────────────────────────────────────────

  /**
   * Provides the PAX → OfferItemID map produced by ShopXmlResponseParser.
   * Must contain an 'OfferId' key and one 'PAX*' key per passenger.
   * @param map result of ShopXmlResponseParser.getPaxOfferItemIdsMap()
   */
  withPaxIdOffersItemIdsMap(map: Map<string, string>): this {
    this.paxIdOffersItemIdsMap = map;
    return this;
  }

  // ─── Owner ───────────────────────────────────────────────────────────────

  /**
   * Sets the owner (airline) code used in SelectedOffer.
   * @param code e.g. 'VA'
   */
  withOwnerCode(code: string): this {
    this.ownerCode = code;
    return this;
  }

  // ─── Currency ────────────────────────────────────────────────────────────

  /**
   * Sets the response currency code.
   * @param currency e.g. 'AUD'
   */
  withCurrency(currency: string): this {
    this.currency = currency;
    return this;
  }

  // ─── POS Config ──────────────────────────────────────────────────────────

  /**
   * Sets the IATA location code for the POS/City block.
   * @param code e.g. 'SYD'
   */
  withLocationCode(code: string): this {
    this.locationCode = code;
    return this;
  }

  /**
   * Sets the country code for the POS block.
   * @param code e.g. 'AU'
   */
  withCountryCode(code: string): this {
    this.countryCode = code;
    return this;
  }

  // ─── Org IDs ─────────────────────────────────────────────────────────────

  /**
   * Sets the seller organisation ID in the DistributionChain.
   * @param id org ID string, can be empty
   */
  withSellerOrgId(id: string): this {
    this.sellerOrgId = id;
    return this;
  }

  /**
   * Sets the carrier organisation ID in the DistributionChain.
   * @param id org ID string, can be empty
   */
  withCarrierOrgId(id: string): this {
    this.carrierOrgId = id;
    return this;
  }

  // ─── Build ───────────────────────────────────────────────────────────────

  /**
   * Builds the complete Price XML payload string by expanding the SelectedOfferItem
   * blocks from the paxIdOffersItemIdsMap and merging with the price template.
   *
   * @returns Complete IATA_OfferPriceRQ XML string ready to send.
   */
  build(): string {
    const offerId = this.paxIdOffersItemIdsMap.get('OfferId');
    if (!offerId) throw new Error('PriceXmlPayloadBuilder: OfferId not found in paxIdOffersItemIdsMap');

    const selectedOfferItemXml = this.buildSelectedOfferItemXml();
    const replacements: Record<string, string> = {
      '$OFFERID': offerId,
      '$OWNER_CODE': this.ownerCode,
      '$CURRENCY': this.currency,
      '$LOCATION_CODE': this.locationCode,
      '$COUNTRY_CODE': this.countryCode,
      '$SELLER_ORGID': this.sellerOrgId,
      '$CARRIER_ORGID': this.carrierOrgId,
      '#{@SELECTEDOFFERITEM}': selectedOfferItemXml
    };

    const xmlPayload = this.xmlProcessor.replacePlaceholders(replacements, this.priceTemplatePath);
    logger.info(`Price XML payload built for offerId: ${offerId}`);
    return xmlPayload;
  }

  // Reads selectedofferitem.txt once and repeats it for each PAX* entry
  private buildSelectedOfferItemXml(): string {
    const template = readFileSync(this.selectedOfferItemTemplatePath, 'utf-8');
    const blocks: string[] = [];

    for (const [key, value] of Array.from(this.paxIdOffersItemIdsMap.entries())) {
      if (key.startsWith('PAX')) {
        const block = template
          .replace(/\$PAXID/g, key)
          .replace(/\$OFFER_ITEM_REF_ID/g, value);
        blocks.push(block);
      }
    }

    if (blocks.length === 0) throw new Error('PriceXmlPayloadBuilder: no PAX entries found in paxIdOffersItemIdsMap');
    return blocks.join('\n');
  }
}
