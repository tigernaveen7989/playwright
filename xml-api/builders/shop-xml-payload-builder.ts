/**
 * Builds the Shop XML request payload from the IATA AirShoppingRQ template.
 *
 * Usage:
 *   new ShopXmlPayloadBuilder()
 *     .withOrigin('SYD')
 *     .withDestination('MEL')
 *     .withDepartureDate('2025-12-20')
 *     .withPassengers(paxTypeMap)        // Map from ShopXmlResponseParser.getPaxType()
 *     .withCurrency('AUD')
 *     .withAgentDuty('NDC')
 *     .withCityCode('DNN')
 *     .withCountryCode('AU')
 *     .withSellerOrgId('')
 *     .withCarrierOrgId('')
 *     .build();
 */
import { readFileSync } from 'fs';
import { XmlTemplateProcessor } from '../../api-base/xml-template-processor';
import { LoggerFactory } from '../../utilities/logger';

const logger = LoggerFactory.getLogger(__filename);

export class ShopXmlPayloadBuilder {
  private readonly xmlProcessor = new XmlTemplateProcessor();
  private readonly shopTemplatePath = `${process.cwd()}/xml-api/payloads/shop/shop.txt`;
  private readonly paxListTemplatePath = `${process.cwd()}/xml-api/payloads/shop/paxlist.txt`;

  private origin: string = '';
  private destination: string = '';
  private departureDate: string = '';
  private paxTypeMap: Map<string, string> = new Map();
  private currency: string = 'AUD';
  private agentDuty: string = 'NDC';
  private cityCode: string = '';
  private countryCode: string = '';
  private sellerOrgId: string = '';
  private carrierOrgId: string = '';

  // ─── Route ───────────────────────────────────────────────────────────────

  /**
   * Sets the departure (origin) airport code.
   * Maps to the $ARRIVAL placeholder in the shop template (OriginDepCriteria).
   * @param code IATA airport code, e.g. 'SYD'
   */
  withOrigin(code: string): this {
    this.origin = code;
    return this;
  }

  /**
   * Sets the arrival (destination) airport code.
   * Maps to the $DESTINATION placeholder in the shop template (DestArrivalCriteria).
   * @param code IATA airport code, e.g. 'MEL'
   */
  withDestination(code: string): this {
    this.destination = code;
    return this;
  }

  // ─── Date ────────────────────────────────────────────────────────────────

  /**
   * Sets the departure date in YYYY-MM-DD format.
   * @param date e.g. '2025-12-20'
   */
  withDepartureDate(date: string): this {
    this.departureDate = date;
    return this;
  }

  // ─── Passengers ──────────────────────────────────────────────────────────

  /**
   * Provides the pax type map used to build the PaxList XML block.
   * Obtain this from ShopXmlResponseParser.getPaxType() before calling build().
   * @param paxTypeMap Map of PAX1→ADT, PAX2→ADT, PAX3→CNN, etc.
   */
  withPassengers(paxTypeMap: Map<string, string>): this {
    this.paxTypeMap = paxTypeMap;
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
   * Sets the agent duty code for the POS block.
   * @param duty e.g. 'NDC' or 'STANDARD'
   */
  withAgentDuty(duty: string): this {
    this.agentDuty = duty;
    return this;
  }

  /**
   * Sets the IATA city code for the POS block.
   * @param code e.g. 'DNN'
   */
  withCityCode(code: string): this {
    this.cityCode = code;
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
   * Builds the complete Shop XML payload string by combining the pax list
   * with the main shop template. Logs a summary of key parameters.
   *
   * @returns Complete IATA_AirShoppingRQ XML string ready to send.
   */
  build(): string {
    if (!this.origin || !this.destination) throw new Error('ShopXmlPayloadBuilder: origin and destination are required');
    if (!this.departureDate) throw new Error('ShopXmlPayloadBuilder: departureDate is required');
    if (this.paxTypeMap.size === 0) throw new Error('ShopXmlPayloadBuilder: paxTypeMap must not be empty — call withPassengers()');

    const paxListXml = this.buildPaxListXml();
    const replacements: Record<string, string> = {
      '$ARRIVAL': this.origin,       // template names origin departure as $ARRIVAL
      '$DESTINATION': this.destination,
      '$DATE': this.departureDate,
      '$CURRENCY': this.currency,
      '$AGENT_DUTY': this.agentDuty,
      '$CITY_CODE': this.cityCode,
      '$COUNTRY_CODE': this.countryCode,
      '$SELLER_ORGID': this.sellerOrgId,
      '$CARRIER_ORGID': this.carrierOrgId,
      '#{@PAXLIST}': paxListXml
    };

    const xmlPayload = this.xmlProcessor.replacePlaceholders(replacements, this.shopTemplatePath);
    logger.info(`Shop XML payload built for route: ${this.origin} → ${this.destination} on ${this.departureDate}`);
    return xmlPayload;
  }

  // Reads paxlist.txt once and repeats it for each passenger in sorted order
  private buildPaxListXml(): string {
    const template = readFileSync(this.paxListTemplatePath, 'utf-8');
    const sorted = Array.from(this.paxTypeMap.entries()).sort(([a], [b]) => {
      const ax = parseInt(/(\d+)$/.exec(a)?.[1] ?? '0', 10);
      const bx = parseInt(/(\d+)$/.exec(b)?.[1] ?? '0', 10);
      return ax - bx || a.localeCompare(b);
    });

    return sorted
      .map(([paxId, ptc]) => {
        if (!ptc) throw new Error(`Missing PTC for ${paxId}`);
        return template.replace(/\$PAXID/g, paxId).replace(/\$PAXTYPE/g, ptc);
      })
      .join('\n');
  }
}
