import { test } from '../../utilities/fixtures';
import { LoggerFactory } from '../../utilities/logger';
import { activateJwtToken } from '../../api-base/activatejwttoken';
import { ShopXmlPayloadBuilder } from '../../xml-api/builders/shop-xml-payload-builder';
import { PriceXmlPayloadBuilder } from '../../xml-api/builders/price-xml-payload-builder';
import { CreateOrderXmlPayloadBuilder } from '../../xml-api/builders/create-order-xml-payload-builder';
import { ShopXmlApiClient } from '../../xml-api/clients/shop-xml-api-client';
import { PriceXmlApiClient } from '../../xml-api/clients/price-xml-api-client';
import { CreateOrderXmlApiClient } from '../../xml-api/clients/create-order-xml-api-client';
import { ShopXmlResponseParser } from '../../xml-api/response-parsers/shop-xml-response-parser';
import { PriceXmlResponseParser } from '../../xml-api/response-parsers/price-xml-response-parser';
import { CreateOrderXmlResponseParser } from '../../xml-api/response-parsers/create-order-xml-response-parser';
import { APIResponse } from '@playwright/test';

const logger = LoggerFactory.getLogger(__filename);

test.describe.configure({ mode: 'parallel' });

test.describe('@allure.label.feature:XML-PaidOrder', () => {

  let headers: Record<string, string>;
  let rmxNdcXml: string;
  let omsNdcXml: string;

  test.beforeEach(async ({ testInfo }) => {
    const token = new activateJwtToken();
    headers = await token.getJwtToken(testInfo);
    ({ rmxNdcXml, omsNdcXml } = await token.loadConfig());
  });

  test('TC1_Verify_Add_One_Way_Single_Pax_One_Way_Create_Paid_Order', async ({ testData, assert }) => {
    // ── Declare all variables at the top ─────────────────────────────────
    const paxType = testData.get('paxType')?.toString()!;
    const shopParser = new ShopXmlResponseParser();
    const priceParser = new PriceXmlResponseParser();
    const createOrderParser = new CreateOrderXmlResponseParser();
    let paxTypeMap: Map<string, string>;
    let paxIdOffersItemIdsMap: Map<string, string>;
    let passengerDetailsMap: Map<string, Map<string, string>>;
    let offerId: string;
    let shopResponse: APIResponse;
    let priceResponse: APIResponse;
    let createOrderResponse: APIResponse;
    let shopResponseText: string;
    let priceResponseText: string;
    let orderId: string | null;

    logger.info('TC1_Verify_Add_One_Way_Single_Pax_One_Way_Create_Paid_Order — started');

    // Shop
    paxTypeMap = shopParser.getPaxType(paxType);
    const shopPayload = new ShopXmlPayloadBuilder()
      .withOrigin('BNE')
      .withDestination('MEL')
      .withDepartureDate('2026-06-20')
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
    offerId = priceParser.getOfferId(passengerDetailsMap);

    // Create Order
    const createOrderPayload = new CreateOrderXmlPayloadBuilder()
      .withPassengerDetailsMap(passengerDetailsMap)
      .withOfferId(offerId)
      .withOwnerCode('VA')
      .withCountryCode('AU')
      .build();

    createOrderResponse = await new CreateOrderXmlApiClient().createOrder(`${omsNdcXml}/v21_3/orders/create`, headers, createOrderPayload);
    await assert.toBe(createOrderResponse.status(), 200, 'Verify create order response status is 200');
    orderId = createOrderParser.getOrderId(await createOrderResponse.text());
    await assert.notToBeNull(orderId, 'Verify Order Id is Not Null');

    logger.info('TC1_Verify_Add_One_Way_Single_Pax_One_Way_Create_Paid_Order — completed');
  });

  test('TC2_Verify_Add_One_Way_Multi_Pax_Create_Paid_Order', async ({ testData, assert }) => {
    // ── Declare all variables at the top ─────────────────────────────────
    const paxType = testData.get('paxType')?.toString()!;
    const shopParser = new ShopXmlResponseParser();
    const priceParser = new PriceXmlResponseParser();
    const createOrderParser = new CreateOrderXmlResponseParser();
    let paxTypeMap: Map<string, string>;
    let paxIdOffersItemIdsMap: Map<string, string>;
    let passengerDetailsMap: Map<string, Map<string, string>>;
    let offerId: string;
    let shopResponse: APIResponse;
    let priceResponse: APIResponse;
    let createOrderResponse: APIResponse;
    let shopResponseText: string;
    let priceResponseText: string;
    let createOrderResponseText: string;
    let warningMessage: string;
    let orderId: string | null;

    logger.info('TC2_Verify_Add_One_Way_Multi_Pax_Create_Paid_Order — started');

    // Shop
    paxTypeMap = shopParser.getPaxType(paxType);
    const shopPayload = new ShopXmlPayloadBuilder()
      .withOrigin('SYD')
      .withDestination('MEL')
      .withDepartureDate('2026-06-16')
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
    offerId = priceParser.getOfferId(passengerDetailsMap);

    // Create Order
    const createOrderPayload = new CreateOrderXmlPayloadBuilder()
      .withPassengerDetailsMap(passengerDetailsMap)
      .withOfferId(offerId)
      .withOwnerCode('VA')
      .withCountryCode('AU')
      .build();

    createOrderResponse = await new CreateOrderXmlApiClient().createOrder(`${omsNdcXml}/v21_3/orders/create`, headers, createOrderPayload);
    await assert.toBe(createOrderResponse.status(), 200, 'Verify create order response status is 200');
    createOrderResponseText = await createOrderResponse.text();
    warningMessage = createOrderParser.getWarningMessage(createOrderResponseText);
    orderId = createOrderParser.getOrderId(createOrderResponseText);
    await assert.toBeEmpty(warningMessage, 'Verify Warning Message is Empty');
    await assert.notToBeNull(orderId, 'Verify Order Id is Not Null');

    logger.info('TC2_Verify_Add_One_Way_Multi_Pax_Create_Paid_Order — completed');
  });

  test('TC280_Verify_Mpax_RT_Shop_EnforcedAccountCode_Create_Paid_Order', async ({ testData, assert }) => {
    // ── Declare all variables at the top ─────────────────────────────────
    const paxType = testData.get('paxType')?.toString()!;
    const accountCode = testData.get('accountCode')?.toString()!;
    const origin = testData.get('origin')?.toString()!;
    const destination = testData.get('destination')?.toString()!;
    const departureDate = testData.get('departureDate')?.toString()!;
    const returnDate = testData.get('returnDate')?.toString()!;
    const shopParser = new ShopXmlResponseParser();
    const priceParser = new PriceXmlResponseParser();
    const createOrderParser = new CreateOrderXmlResponseParser();
    let paxTypeMap: Map<string, string>;
    let paxIdOffersItemIdsMap: Map<string, string>;
    let passengerDetailsMap: Map<string, Map<string, string>>;
    let offerId: string;
    let shopResponse: APIResponse;
    let priceResponse: APIResponse;
    let createOrderResponse: APIResponse;
    let shopResponseText: string;
    let priceResponseText: string;
    let createOrderResponseText: string;
    let warningMessage: string;
    let orderId: string | null;
    let responseAccountCode: string;

    logger.info('TC280_Verify_Mpax_RT_Shop_EnforcedAccountCode_Create_Paid_Order — started');

    // Shop with Enforce Account Code
    paxTypeMap = shopParser.getPaxType(paxType);
    const shopPayload = new ShopXmlPayloadBuilder()
      .withOrigin(origin)
      .withDestination(destination)
      .withDepartureDate(departureDate)
      .withReturnDate(returnDate)
      .withPassengers(paxTypeMap)
      .withCurrency('AUD')
      .withAgentDuty('NDC')
      .withCityCode('DNN')
      .withCountryCode('AU')
      .withSellerOrgId('')
      .withCarrierOrgId('')
      .withEnforceAccountCode(true)
      .withAccountCode(accountCode)
      .withAirlineCode('VA')
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
    offerId = priceParser.getOfferId(passengerDetailsMap);

    // Create Order
    const createOrderPayload = new CreateOrderXmlPayloadBuilder()
      .withPassengerDetailsMap(passengerDetailsMap)
      .withOfferId(offerId)
      .withOwnerCode('VA')
      .withCountryCode('AU')
      .build();

    createOrderResponse = await new CreateOrderXmlApiClient().createOrder(`${omsNdcXml}/v21_3/orders/create`, headers, createOrderPayload);
    await assert.toBe(createOrderResponse.status(), 200, 'Verify create order response status is 200');
    createOrderResponseText = await createOrderResponse.text();
    warningMessage = createOrderParser.getWarningMessage(createOrderResponseText);
    orderId = createOrderParser.getOrderId(createOrderResponseText);
    responseAccountCode = createOrderParser.getAccountCode(createOrderResponseText);
    await assert.toBeEmpty(warningMessage, 'Verify Warning Message is Empty');
    await assert.notToBeNull(orderId, 'Verify Order Id is Not Null');
    await assert.toBe(responseAccountCode, accountCode, `Verify Account Code '${accountCode}' is present in Create Order response`);

    logger.info('TC280_Verify_Mpax_RT_Shop_EnforcedAccountCode_Create_Paid_Order — completed');
  });
});
