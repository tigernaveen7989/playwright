import { test } from '../../utilities/fixtures';
import { LoggerFactory } from '../../utilities/logger';
import { activateJwtToken } from '../../api-base/activatejwttoken';
import { ShopPayloadBuilder } from '../../json-api/builders/shop-payload-builder';
import { PricePayloadBuilder } from '../../json-api/builders/price-payload-builder';
import { CreateOrderPayloadBuilder } from '../../json-api/builders/create-order-payload-builder';
import { ShopApiClient } from '../../json-api/clients/shop-api-client';
import { PriceApiClient } from '../../json-api/clients/price-api-client';
import { CreateOrderApiClient } from '../../json-api/clients/create-order-api-client';
import { ShopResponseParser } from '../../json-api/response-parsers/shop-response-parser';
import { PriceResponseParser } from '../../json-api/response-parsers/price-response-parser';
import { CreateOrderResponseParser } from '../../json-api/response-parsers/create-order-response-parser';
import { APIResponse } from '@playwright/test';

const logger = LoggerFactory.getLogger(__filename);

test.describe.configure({ mode: 'parallel' });

test.describe('@allure.label.feature:JSON-PaidOrder', () => {
  let headers: Record<string, string>;
  let rmxApiJson: string;
  let omsApiJson: string;

  test.beforeEach(async ({ testInfo }) => {
    const token = new activateJwtToken();
    headers = await token.getJwtToken(testInfo);
    ({ rmxApiJson, omsApiJson } = await token.loadConfig());
  });

  test('TC2_Verify_Multi_Pax_One_Way_Create_Paid_Order', async ({ testData, assert }) => {
    // ── Declare all variables at the top ─────────────────────────────────
    const paxType = testData.get('paxType')?.toString()!;
    const shopParser = new ShopResponseParser();
    const priceParser = new PriceResponseParser();
    const orderParser = new CreateOrderResponseParser();
    let paxTypeMap: Map<string, string>;
    let paxIdOffersItemIdsMap: Map<string, string>;
    let passengerDetailsMap: Map<string, Map<string, string>>;
    let offerId: string;
    let shopResponse: APIResponse;
    let priceResponse: APIResponse;
    let createOrderResponse: APIResponse;
    let priceJson: any;
    let orderResult: { orderId: string | null; warningMessage: string };

    logger.info('TC2_Verify_Multi_Pax_One_Way_Create_Paid_Order — started');

    // Shop
    const shopPayload = new ShopPayloadBuilder()
      .withRoute('SYD', 'BNE')
      .withDepartureDate(10, 6, 2026)
      .withCurrency('AUD')
      .withPassengers(paxType)
      .build();

    shopResponse = await new ShopApiClient().shop(`${rmxApiJson}/shop`, headers, shopPayload);
    await assert.toBe(shopResponse.status(), 200, 'Verify shop response status is 200');

    paxTypeMap = shopParser.getPaxType(paxType);
    paxIdOffersItemIdsMap = shopParser.getPaxOfferItemIdsMap(paxTypeMap, JSON.stringify(await shopResponse.json()));

    // Price
    const pricePayload = new PricePayloadBuilder()
      .withOfferItems(paxIdOffersItemIdsMap)
      .build();

    priceResponse = await new PriceApiClient().price(`${rmxApiJson}/price`, headers, pricePayload);
    await assert.toBe(priceResponse.status(), 200, 'Verify price response status is 200');

    priceJson = await priceResponse.json();
    passengerDetailsMap = priceParser.getPassengerDetailsMap(priceJson, paxTypeMap);
    offerId = priceParser.getOfferId(priceJson);

    // Create Order
    const createOrderPayload = new CreateOrderPayloadBuilder()
      .withOfferId(offerId)
      .withPassengerDetails(passengerDetailsMap)
      .build();

    createOrderResponse = await new CreateOrderApiClient().createOrder(`${omsApiJson}/create`, headers, createOrderPayload);
    await assert.toBe(createOrderResponse.status(), 200, 'Verify create order response status is 200');

    orderResult = orderParser.getOrderIdAndWarningMessage(await createOrderResponse.text());
    await assert.toBeEmpty(orderResult.warningMessage, 'Verify Warning Message is Empty');
    await assert.notToBeNull(orderResult.orderId, 'Verify Order Id is Not Null');

    logger.info('TC2_Verify_Multi_Pax_One_Way_Create_Paid_Order — completed');
  });

  test('TC3_Verify_Single_Pax_One_Way_Create_Paid_Order', async ({ testData, assert }) => {
    // ── Declare all variables at the top ─────────────────────────────────
    const paxType = testData.get('paxType')?.toString()!;
    const shopParser = new ShopResponseParser();
    const priceParser = new PriceResponseParser();
    const orderParser = new CreateOrderResponseParser();
    let paxTypeMap: Map<string, string>;
    let paxIdOffersItemIdsMap: Map<string, string>;
    let passengerDetailsMap: Map<string, Map<string, string>>;
    let offerId: string;
    let shopResponse: APIResponse;
    let priceResponse: APIResponse;
    let createOrderResponse: APIResponse;
    let priceJson: any;
    let orderResult: { orderId: string | null; warningMessage: string };

    logger.info('TC3_Verify_Single_Pax_One_Way_Create_Paid_Order — started');

    // Shop
    const shopPayload = new ShopPayloadBuilder()
      .withRoute('SYD', 'BNE')
      .withDepartureDate(10, 6, 2026)
      .withCurrency('AUD')
      .withPassengers(paxType)
      .build();

    shopResponse = await new ShopApiClient().shop(`${rmxApiJson}/shop`, headers, shopPayload);
    await assert.toBe(shopResponse.status(), 200, 'Verify shop response status is 200');

    paxTypeMap = shopParser.getPaxType(paxType);
    paxIdOffersItemIdsMap = shopParser.getPaxOfferItemIdsMap(paxTypeMap, JSON.stringify(await shopResponse.json()));

    // Price
    const pricePayload = new PricePayloadBuilder()
      .withOfferItems(paxIdOffersItemIdsMap)
      .build();

    priceResponse = await new PriceApiClient().price(`${rmxApiJson}/price`, headers, pricePayload);
    await assert.toBe(priceResponse.status(), 200, 'Verify price response status is 200');

    priceJson = await priceResponse.json();
    passengerDetailsMap = priceParser.getPassengerDetailsMap(priceJson, paxTypeMap);
    offerId = priceParser.getOfferId(priceJson);

    // Create Order
    const createOrderPayload = new CreateOrderPayloadBuilder()
      .withOfferId(offerId)
      .withPassengerDetails(passengerDetailsMap)
      .build();

    createOrderResponse = await new CreateOrderApiClient().createOrder(`${omsApiJson}/create`, headers, createOrderPayload);
    await assert.toBe(createOrderResponse.status(), 200, 'Verify create order response status is 200');

    orderResult = orderParser.getOrderIdAndWarningMessage(await createOrderResponse.text());
    await assert.notToBeNull(orderResult.orderId, 'Verify Order Id is Not Null');

    logger.info('TC3_Verify_Single_Pax_One_Way_Create_Paid_Order — completed');
  });
});
