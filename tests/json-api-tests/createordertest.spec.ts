import { test, expect, request } from '../../utilities/fixtures';
import { activateJwtToken } from "../../api-base/activatejwttoken";
import { shopApi } from '../../json-api/request-and-get-response/shop-api-request';
import { priceApi } from '../../json-api/request-and-get-response/price-api-request';
import { createOrderApi } from '../../json-api/request-and-get-response/create-order-api-request';
import { ShopJsonObject } from '../../json-api/create-payload/shop-json-object';
import { LoggerFactory } from '../../utilities/logger';

const logger = LoggerFactory.getLogger(__filename);

test.describe.configure({ mode: 'parallel' });

/**
 * Test 3:
 * Verify multi-pax shop + price API integration and create paid order.
 */
test(
  'TC2_Verify_Multi_Pax_One_Way_Create_Paid_Order @allure.label.feature:JSON-MultiPax-PaidOrder',
  async ({ testData }, testInfo) => {
    // 🔹 Declarations
    let paxType: string;
    let cityPair: string;
    let seatType: string;
    let activatejwttoken: activateJwtToken;
    let headers: Record<string, string>;
    let rmxApiJson: string;
    let omsApiJson: string;
    let shop: shopApi;
    let price: priceApi;
    let createOrder: createOrderApi;
    let shopResponse: any;
    let priceResponse: any;
    let createOrderResponse: any;
    let responseBody: string;
    let paxTypeMap: Map<string, string>;
    let paxIdOffersItemIdsMap: Map<string, string>;

    // 🔹 Assignments
    paxType = testData.get('paxType')?.toString()!;
    cityPair = testData.get('password')?.toString()!;
    seatType = testData.get('seatType')?.toString()!;

    activatejwttoken = new activateJwtToken();
    headers = await activatejwttoken.getJwtToken(testInfo);
    ({ rmxApiJson, omsApiJson } = await activatejwttoken.loadConfig());

    shop = new shopApi('SYD', 'BNE', 10, 10, 2025, 'EUR');
    price = new priceApi();
    createOrder = new createOrderApi();

    shopResponse = await shop.sendRequestAndGetResponse(
      `${rmxApiJson}/shop`,
      headers,
      testInfo,
      paxType
    );
    expect(shopResponse.ok()).toBe(true);

    responseBody = JSON.stringify(await shopResponse.json(), null, 2);

    paxTypeMap = await shop.getPaxType(paxType);
    logger.info('Pax type map:', JSON.stringify(Object.fromEntries(paxTypeMap), null, 2));

    paxIdOffersItemIdsMap = await shop.getPaxOfferItemIdsMap(paxTypeMap, responseBody);
    logger.info('Pax-Offer mapping:', JSON.stringify(Object.fromEntries(paxIdOffersItemIdsMap), null, 2));

    priceResponse = await price.sendRequestAndGetResponse(
      `${rmxApiJson}/price`,
      headers,
      testInfo,
      paxIdOffersItemIdsMap
    );

    // Parse JSON response **once**
    const priceResponseJson = await priceResponse.json();

    // Optional logging
    responseBody = JSON.stringify(priceResponseJson, null, 2);
    // logger.info('Price API Response:', responseBody);

    // Validate response
    expect(priceResponse.ok()).toBe(true);

    // Call your function with parsed JSON
    const passengerDetailsMap: Map<string, Map<string, string>> = price.getPassengerDetailsMap(priceResponseJson, paxTypeMap);
    const offerId: string = await price.getOfferId(priceResponseJson);

    createOrderResponse = await createOrder.sendRequestAndGetResponse(
      `${omsApiJson}/create`,
      headers,
      testInfo,
      passengerDetailsMap,
      offerId
    );

    // Parse JSON response **once**
    const createOrderResponseJson = await createOrderResponse.json();

    // Optional logging
    responseBody = JSON.stringify(createOrderResponseJson, null, 2);

    // Validate response
    expect(createOrderResponse.ok()).toBe(true);
  }
);

/**
 * Test 4:
 * Verify single pax shop + price API integration and create paid order.
 */
test(
  'TC3_Verify_Single_Pax_One_Way_Create_Paid_Order @allure.label.feature:JSON-SinglePax-PaidOrder',
  async ({ testData }, testInfo) => {
    // 🔹 Declarations
    let paxType: string;
    let cityPair: string;
    let seatType: string;
    let activatejwttoken: activateJwtToken;
    let headers: Record<string, string>;
    let rmxApiJson: string;
    let omsApiJson: string;
    let shop: shopApi;
    let price: priceApi;
    let createOrder: createOrderApi;
    let shopResponse: any;
    let priceResponse: any;
    let createOrderResponse: any;
    let responseBody: string;
    let paxTypeMap: Map<string, string>;
    let paxIdOffersItemIdsMap: Map<string, string>;

    // 🔹 Assignments
    paxType = testData.get('paxType')?.toString()!;
    cityPair = testData.get('password')?.toString()!;
    seatType = testData.get('seatType')?.toString()!;

    logger.info('Paxtype:', paxType);

    activatejwttoken = new activateJwtToken();
    headers = await activatejwttoken.getJwtToken(testInfo);
    ({ rmxApiJson, omsApiJson } = await activatejwttoken.loadConfig());

    shop = new shopApi('SYD', 'BNE', 10, 10, 2025, 'EUR');
    price = new priceApi();
    createOrder = new createOrderApi();

    shopResponse = await shop.sendRequestAndGetResponse(
      `${rmxApiJson}/shop`,
      headers,
      testInfo,
      paxType
    );
    expect(shopResponse.ok()).toBe(true);

    responseBody = JSON.stringify(await shopResponse.json(), null, 2);

    paxTypeMap = await shop.getPaxType(paxType);
    logger.info('Pax type map:', JSON.stringify(Object.fromEntries(paxTypeMap), null, 2));

    paxIdOffersItemIdsMap = await shop.getPaxOfferItemIdsMap(paxTypeMap, responseBody);

    priceResponse = await price.sendRequestAndGetResponse(
      `${rmxApiJson}/price`,
      headers,
      testInfo,
      paxIdOffersItemIdsMap
    );

    // Parse JSON response **once**
    const priceResponseJson = await priceResponse.json();

    // Optional logging
    responseBody = JSON.stringify(priceResponseJson, null, 2);
    // logger.info('Price API Response:', responseBody);

    // Validate response
    expect(priceResponse.ok()).toBe(true);

    const passengerDetailsMap: Map<string, Map<string, string>> = await price.getPassengerDetailsMap(priceResponseJson, paxTypeMap);
    const offerId: string = await price.getOfferId(priceResponseJson);

    createOrderResponse = await createOrder.sendRequestAndGetResponse(
      `${omsApiJson}/create`,
      headers,
      testInfo,
      passengerDetailsMap,
      offerId
    );

    // Parse JSON response **once**
    const createOrderResponseJson = await createOrderResponse.json();

    // Optional logging
    responseBody = JSON.stringify(createOrderResponseJson, null, 2);

    // Validate response
    expect(createOrderResponse.ok()).toBe(true);
  }
);
