import { test } from '../../utilities/fixtures';
import { LoggerFactory } from '../../utilities/logger';
import { activateJwtToken } from '../../api-base/activatejwttoken';
import { ShopXmlPayloadBuilder } from '../../xml-api/builders/shop-xml-payload-builder';
import { PriceXmlPayloadBuilder } from '../../xml-api/builders/price-xml-payload-builder';
import { ShopXmlApiClient } from '../../xml-api/clients/shop-xml-api-client';
import { PriceXmlApiClient } from '../../xml-api/clients/price-xml-api-client';
import { ShopXmlResponseParser } from '../../xml-api/response-parsers/shop-xml-response-parser';
import { PriceXmlResponseParser } from '../../xml-api/response-parsers/price-xml-response-parser';
import { APIResponse } from '@playwright/test';

const logger = LoggerFactory.getLogger(__filename);

test.describe.configure({ mode: 'parallel' });

test.describe('@allure.label.feature:XML-Multipax-PaidOrder+Seats', () => {

  let headers: Record<string, string>;
  let rmxNdcXml: string;

  test.beforeEach(async ({ testInfo }) => {
    const token = new activateJwtToken();
    headers = await token.getJwtToken(testInfo);
    ({ rmxNdcXml } = await token.loadConfig());
  });

  test('TC1_Verify_Add_One_Way_Single_Pax_One_Way_Create_Paid_Order', async ({ testData, assert }) => {
    // ── Declare all variables at the top ─────────────────────────────────
    const paxType = testData.get('paxType')?.toString()!;
    const shopParser = new ShopXmlResponseParser();
    const priceParser = new PriceXmlResponseParser();
    let paxTypeMap: Map<string, string>;
    let paxIdOffersItemIdsMap: Map<string, string>;
    let passengerDetailsMap: Map<string, Map<string, string>>;
    let offerId: string;
    let shopResponse: APIResponse;
    let priceResponse: APIResponse;
    let shopResponseText: string;
    let priceResponseText: string;

    logger.info('TC1_Verify_Add_One_Way_Single_Pax_One_Way_Create_Paid_Order — started');

    // Shop
    paxTypeMap = shopParser.getPaxType(paxType);
    const shopPayload = new ShopXmlPayloadBuilder()
      .withOrigin('SYD')
      .withDestination('MEL')
      .withDepartureDate('2025-10-16')
      .withPassengers(paxTypeMap)
      .withCurrency('AUD')
      .withAgentDuty('NDC')
      .withCityCode('DNN')
      .withCountryCode('AU')
      .withSellerOrgId('')
      .withCarrierOrgId('')
      .build();

    shopResponse = await new ShopXmlApiClient().shop(`${rmxNdcXml}/shop`, headers, shopPayload);
    await assert.toBe(shopResponse.status(), 200, 'Verify shop response status is 200');
    shopResponseText = await shopResponse.text();
    paxIdOffersItemIdsMap = shopParser.getPaxOfferItemIdsMap(paxTypeMap, shopResponseText);

    // Price
    const pricePayload = new PriceXmlPayloadBuilder()
      .withPaxIdOffersItemIdsMap(paxIdOffersItemIdsMap)
      .withOwnerCode('VA')
      .withCurrency('AUD')
      .withLocationCode('SYD')
      .withCountryCode('AU')
      .withSellerOrgId('')
      .withCarrierOrgId('')
      .build();

    priceResponse = await new PriceXmlApiClient().price(`${rmxNdcXml}/price`, headers, pricePayload);
    await assert.toBe(priceResponse.status(), 200, 'Verify price response status is 200');
    priceResponseText = await priceResponse.text();
    passengerDetailsMap = priceParser.getPassengerDetailsMap(priceResponseText, paxTypeMap);
    offerId = priceParser.getOfferID(priceResponseText);
    await assert.notToBeNull(offerId, 'Verify offer ID is not null');

    logger.info(`TC1_Verify_Add_One_Way_Single_Pax_One_Way_Create_Paid_Order — offerId: ${offerId}`);
    logger.info('TC1_Verify_Add_One_Way_Single_Pax_One_Way_Create_Paid_Order — completed');
  });

  test('TC2_Verify_Add_One_Way_Multi_Pax_Create_Paid_Order', async ({ testData, assert }) => {
    // ── Declare all variables at the top ─────────────────────────────────
    const paxType = testData.get('paxType')?.toString()!;
    const shopParser = new ShopXmlResponseParser();
    const priceParser = new PriceXmlResponseParser();
    let paxTypeMap: Map<string, string>;
    let paxIdOffersItemIdsMap: Map<string, string>;
    let passengerDetailsMap: Map<string, Map<string, string>>;
    let offerId: string;
    let shopResponse: APIResponse;
    let priceResponse: APIResponse;
    let shopResponseText: string;
    let priceResponseText: string;

    logger.info('TC2_Verify_Add_One_Way_Multi_Pax_Create_Paid_Order — started');

    // Shop
    paxTypeMap = shopParser.getPaxType(paxType);
    const shopPayload = new ShopXmlPayloadBuilder()
      .withOrigin('SYD')
      .withDestination('MEL')
      .withDepartureDate('2025-10-16')
      .withPassengers(paxTypeMap)
      .withCurrency('AUD')
      .withAgentDuty('NDC')
      .withCityCode('DNN')
      .withCountryCode('AU')
      .withSellerOrgId('')
      .withCarrierOrgId('')
      .build();

    shopResponse = await new ShopXmlApiClient().shop(`${rmxNdcXml}/shop`, headers, shopPayload);
    await assert.toBe(shopResponse.status(), 200, 'Verify shop response status is 200');
    shopResponseText = await shopResponse.text();
    paxIdOffersItemIdsMap = shopParser.getPaxOfferItemIdsMap(paxTypeMap, shopResponseText);

    // Price
    const pricePayload = new PriceXmlPayloadBuilder()
      .withPaxIdOffersItemIdsMap(paxIdOffersItemIdsMap)
      .withOwnerCode('VA')
      .withCurrency('AUD')
      .withLocationCode('SYD')
      .withCountryCode('AU')
      .withSellerOrgId('')
      .withCarrierOrgId('')
      .build();

    priceResponse = await new PriceXmlApiClient().price(`${rmxNdcXml}/price`, headers, pricePayload);
    await assert.toBe(priceResponse.status(), 200, 'Verify price response status is 200');
    priceResponseText = await priceResponse.text();
    passengerDetailsMap = priceParser.getPassengerDetailsMap(priceResponseText, paxTypeMap);
    offerId = priceParser.getOfferID(priceResponseText);
    await assert.notToBeNull(offerId, 'Verify offer ID is not null');

    logger.info(`TC2_Verify_Add_One_Way_Multi_Pax_Create_Paid_Order — offerId: ${offerId}`);
    logger.info('TC2_Verify_Add_One_Way_Multi_Pax_Create_Paid_Order — completed');
  });
});
