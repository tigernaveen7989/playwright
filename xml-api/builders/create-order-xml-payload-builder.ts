/**
 * Builds the Create Order XML request payload from the IATA OrderCreateRQ template.
 * Generates randomised passenger data (name, DOB, gender) using Faker.
 *
 * Usage:
 *   new CreateOrderXmlPayloadBuilder()
 *     .withPassengerDetailsMap(passengerDetailsMap)  // from PriceXmlResponseParser
 *     .withOfferId(offerId)                          // from PriceXmlResponseParser
 *     .withOwnerCode('VA')
 *     .withCountryCode('AU')
 *     .build();
 */
import { readFileSync } from 'fs';
import { faker } from '@faker-js/faker';
import { XmlTemplateProcessor } from '../../api-base/xml-template-processor';
import { LoggerFactory } from '../../utilities/logger';

const logger = LoggerFactory.getLogger(__filename);

export class CreateOrderXmlPayloadBuilder {
  private readonly xmlProcessor = new XmlTemplateProcessor();
  private readonly createOrderTemplatePath = `${process.cwd()}/xml-api/payloads/create-order/createorder.txt`;
  private readonly paxTemplatePath = `${process.cwd()}/xml-api/payloads/create-order/pax.txt`;
  private readonly selectedPricedOfferTemplatePath = `${process.cwd()}/xml-api/payloads/create-order/selectedpricedoffer.txt`;
  private readonly offerAssociationTemplatePath = `${process.cwd()}/xml-api/payloads/create-order/offerassociation.txt`;

  private passengerDetailsMap: Map<string, Map<string, string>> = new Map();
  private offerId: string = '';
  private ownerCode: string = '';
  private countryCode: string = '';

  // ─── Passenger Details ───────────────────────────────────────────────────

  /**
   * Provides the passenger details map produced by PriceXmlResponseParser.
   * Each entry maps a PAX ID to an inner map containing offerItemId, price,
   * passengerJourneyIds, and paxTypeCode.
   * @param map result of PriceXmlResponseParser.getPassengerDetailsMap()
   */
  withPassengerDetailsMap(map: Map<string, Map<string, string>>): this {
    this.passengerDetailsMap = map;
    return this;
  }

  // ─── Offer ───────────────────────────────────────────────────────────────

  /**
   * Sets the Offer ID from the price response.
   * @param id result of PriceXmlResponseParser.getOfferID()
   */
  withOfferId(id: string): this {
    this.offerId = id;
    return this;
  }

  // ─── Owner ───────────────────────────────────────────────────────────────

  /**
   * Sets the owner (airline) code used in SelectedPricedOffer and OfferAssociation.
   * @param code e.g. 'VA'
   */
  withOwnerCode(code: string): this {
    this.ownerCode = code;
    return this;
  }

  // ─── POS Config ──────────────────────────────────────────────────────────

  /**
   * Sets the country code for the POS block.
   * @param code e.g. 'AU'
   */
  withCountryCode(code: string): this {
    this.countryCode = code;
    return this;
  }

  // ─── Build ───────────────────────────────────────────────────────────────

  /**
   * Builds the complete Create Order XML payload. Generates randomised passenger
   * names, DOB, and gender via Faker. Calculates total price from the passenger
   * details map. Logs offerId and computed total amount.
   *
   * @returns Complete IATA_OrderCreateRQ XML string ready to send.
   */
  build(): string {
    if (!this.offerId) throw new Error('CreateOrderXmlPayloadBuilder: offerId is required — call withOfferId()');
    if (this.passengerDetailsMap.size === 0) throw new Error('CreateOrderXmlPayloadBuilder: passengerDetailsMap must not be empty');

    const totalAmount = this.calculateTotalAmount();
    const replacements: Record<string, string> = {
      '$COUNTRY_CODE': this.countryCode,
      '$TOTAL_AMOUNT': totalAmount,
      '#{@PAX}': this.buildPaxXml(),
      '#{@OFFER_ASSOCIATION}': this.buildOfferAssociationXml(),
      '#{@SELECTED_PRICED_OFFER}': this.buildSelectedPricedOfferXml()
    };

    const xmlPayload = this.xmlProcessor.replacePlaceholders(replacements, this.createOrderTemplatePath);
    logger.info(`Create Order XML payload built — offerId: ${this.offerId}, totalAmount: ${totalAmount}`);
    return xmlPayload;
  }

  // Builds <Pax> blocks with randomised personal data; CNN pax get a fixed child DOB
  private buildPaxXml(): string {
    const template = readFileSync(this.paxTemplatePath, 'utf-8');
    const blocks: string[] = [];

    for (const [paxId, paxDetails] of Array.from(this.passengerDetailsMap.entries())) {
      const paxTypeCode = paxDetails.get('paxTypeCode')!;
      const dob = paxTypeCode.match('CNN')
        ? '2018-07-09'
        : faker.date.birthdate({ min: 18, max: 65, mode: 'age' }).toISOString().split('T')[0];

      const sex = faker.person.sex();
      const block = template
        .replace(/\$PAXID/g, paxId)
        .replace(/\$PAXTYPE/g, paxTypeCode)
        .replace(/\$FIRST_NAME/g, faker.person.firstName())
        .replace(/\$LAST_NAME/g, faker.person.lastName())
        .replace(/\$MIDDLE_NAME/g, faker.person.middleName())
        .replace(/\$TITLE/g, faker.person.prefix().replace('.', ''))
        .replace(/\$DATE_OF_BIRTH/g, dob)
        .replace(/\$GENDER_CODE/g, sex === 'male' ? 'M' : 'F');
      blocks.push(block);
    }
    return blocks.join('\n');
  }

  // Builds <OfferAssociation> blocks — one per passenger
  private buildOfferAssociationXml(): string {
    const template = readFileSync(this.offerAssociationTemplatePath, 'utf-8');
    return Array.from(this.passengerDetailsMap.values())
      .map(paxDetails =>
        template
          .replace(/\$OFFER_ITEM_REF_ID/g, paxDetails.get('offerItemId')!)
          .replace(/\$OFFER_REF_ID/g, this.offerId)
          .replace(/\$OWNER_CODE/g, this.ownerCode)
      )
      .join('\n');
  }

  // Builds <SelectedPricedOffer> blocks — one per passenger
  private buildSelectedPricedOfferXml(): string {
    const template = readFileSync(this.selectedPricedOfferTemplatePath, 'utf-8');
    return Array.from(this.passengerDetailsMap.entries())
      .map(([paxId, paxDetails]) =>
        template
          .replace(/\$OFFER_ITEM_REF_ID/g, paxDetails.get('offerItemId')!)
          .replace(/\$OFFER_REF_ID/g, this.offerId)
          .replace(/\$OWNER_CODE/g, this.ownerCode)
          .replace(/\$PAXID/g, paxId)
      )
      .join('\n');
  }

  // Sums all passenger prices from the map to produce the order total
  private calculateTotalAmount(): string {
    return Array.from(this.passengerDetailsMap.values())
      .map(paxDetails => parseFloat(paxDetails.get('price') || '0'))
      .reduce((sum, price) => sum + price, 0)
      .toFixed(2);
  }
}
