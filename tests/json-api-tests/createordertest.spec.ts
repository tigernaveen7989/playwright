import { test, expect } from '../../utilities/fixtures';
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
    const paxType = testData.get('paxType')?.toString()!;
    const shopParser = new ShopResponseParser();
    const priceParser = new PriceResponseParser();
    const orderParser = new CreateOrderResponseParser();

    // Shop
    const shopPayload = new ShopPayloadBuilder()
      .withRoute('SYD', 'BNE')
      .withDepartureDate(10, 6, 2026)
      .withCurrency('AUD')
      .withPassengers(paxType)
      .build();

    const shopResponse = await new ShopApiClient().shop(`${rmxApiJson}/shop`, headers, shopPayload);
    await assert.toBe(shopResponse.ok(), true, 'Verify Shop Response is OK');

    const paxTypeMap = shopParser.getPaxType(paxType);
    const paxIdOffersItemIdsMap = shopParser.getPaxOfferItemIdsMap(paxTypeMap, JSON.stringify(await shopResponse.json()));

    // Price
    const pricePayload = new PricePayloadBuilder()
      .withOfferItems(paxIdOffersItemIdsMap)
      .build();

    const priceResponse = await new PriceApiClient().price(`${rmxApiJson}/price`, headers, pricePayload);
    await assert.toBe(priceResponse.ok(), true, 'Verify Price Response is OK');

    const priceJson = await priceResponse.json();
    const passengerDetailsMap = priceParser.getPassengerDetailsMap(priceJson, paxTypeMap);
    const offerId = priceParser.getOfferId(priceJson);

    // Create Order
    const createOrderPayload = new CreateOrderPayloadBuilder()
      .withOfferId(offerId)
      .withPassengerDetails(passengerDetailsMap)
      .build();

    const createOrderResponse = await new CreateOrderApiClient().createOrder(`${omsApiJson}/create`, headers, createOrderPayload);
    await assert.toBe(createOrderResponse.ok(), true, 'Verify Create Order Response is OK');

    const orderResult = orderParser.getOrderIdAndWarningMessage(await createOrderResponse.text());
    await assert.toBeEmpty(orderResult.warningMessage, 'Verify Warning Message is Empty');
    await assert.notToBeNull(orderResult.orderId, 'Verify Order Id is Not Null');
  });

  test('TC3_Verify_Single_Pax_One_Way_Create_Paid_Order', async ({ testData, assert }) => {
    const paxType = testData.get('paxType')?.toString()!;
    const shopParser = new ShopResponseParser();
    const priceParser = new PriceResponseParser();
    const orderParser = new CreateOrderResponseParser();

    // Shop
    const shopPayload = new ShopPayloadBuilder()
      .withRoute('SYD', 'BNE')
      .withDepartureDate(10, 6, 2026)
      .withCurrency('AUD')
      .withPassengers(paxType)
      .build();

    const shopResponse = await new ShopApiClient().shop(`${rmxApiJson}/shop`, headers, shopPayload);
    await assert.toBe(shopResponse.ok(), true, 'Verify Shop Response is OK');

    const paxTypeMap = shopParser.getPaxType(paxType);
    const paxIdOffersItemIdsMap = shopParser.getPaxOfferItemIdsMap(paxTypeMap, JSON.stringify(await shopResponse.json()));

    // Price
    const pricePayload = new PricePayloadBuilder()
      .withOfferItems(paxIdOffersItemIdsMap)
      .build();

    const priceResponse = await new PriceApiClient().price(`${rmxApiJson}/price`, headers, pricePayload);
    await assert.toBe(priceResponse.ok(), true, 'Verify Price Response is OK');

    const priceJson = await priceResponse.json();
    const passengerDetailsMap = priceParser.getPassengerDetailsMap(priceJson, paxTypeMap);
    const offerId = priceParser.getOfferId(priceJson);

    // Create Order
    const createOrderPayload = new CreateOrderPayloadBuilder()
      .withOfferId(offerId)
      .withPassengerDetails(passengerDetailsMap)
      .build();

    const createOrderResponse = await new CreateOrderApiClient().createOrder(`${omsApiJson}/create`, headers, createOrderPayload);
    await assert.toBe(createOrderResponse.ok(), true, 'Verify Create Order Response is OK');

    const orderResult = orderParser.getOrderIdAndWarningMessage(await createOrderResponse.text());
    await assert.notToBeNull(orderResult.orderId, 'Verify Order Id is Not Null');
  });
});
