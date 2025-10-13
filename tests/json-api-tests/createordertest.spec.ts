import { test, expect } from '../../utilities/fixtures';
import { activateJwtToken } from "../../api-base/activatejwttoken";
import { shopApi } from '../../json-api/request-and-get-response/shop-api-request';
import { priceApi } from '../../json-api/request-and-get-response/price-api-request';
import { createOrderApi } from '../../json-api/request-and-get-response/create-order-api-request';

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

  test('TC2_Verify_Multi_Pax_One_Way_Create_Paid_Order', async ({ testData, assert }, testInfo) => {
    const paxType = testData.get('paxType')?.toString()!;
    const shop = new shopApi('SYD', 'BNE', 10, 12, 2025, 'AUD');
    const shopResponse = await shop.sendRequestAndGetResponse(`${rmxApiJson}/shop`, headers, testInfo, paxType);
    await assert.toBe(shopResponse.ok(), true, "Verify Shop Response is OK");

    const shopJson = await shopResponse.json();
    const paxTypeMap = await shop.getPaxType(paxType);
    const paxIdOffersItemIdsMap = await shop.getPaxOfferItemIdsMap(paxTypeMap, JSON.stringify(shopJson));

    const price = new priceApi();
    const priceResponse = await price.sendRequestAndGetResponse(`${rmxApiJson}/price`, headers, testInfo, paxIdOffersItemIdsMap);
    await assert.toBe(priceResponse.ok(), true, "Verify Price Response is OK");

    const priceJson = await priceResponse.json();
    const passengerDetailsMap = price.getPassengerDetailsMap(priceJson, paxTypeMap);
    const offerId = await price.getOfferId(priceJson);

    const createOrder = new createOrderApi();
    const createOrderResponse = await createOrder.sendRequestAndGetResponse(`${omsApiJson}/create`, headers, testInfo, passengerDetailsMap, offerId);
    await assert.toBe(createOrderResponse.ok(), true, "Verify Create Order Response is OK");
    await assert.toBeEmpty(createOrder.getOrderIdAndWarningMessage(await createOrderResponse.text()).warningMessage, "Verify Warning Message is Empty");
    await assert.notToBeNull(createOrder.getOrderIdAndWarningMessage(await createOrderResponse.text()).orderId, "Verify Order Id is Not Null");
  });

  test('TC3_Verify_Single_Pax_One_Way_Create_Paid_Order', async ({ testData, assert }, testInfo) => {
    const paxType = testData.get('paxType')?.toString()!;
    const shop = new shopApi('SYD', 'BNE', 10, 12, 2025, 'AUD');
    const shopResponse = await shop.sendRequestAndGetResponse(`${rmxApiJson}/shop`, headers, testInfo, paxType);
    await assert.toBe(shopResponse.ok(), true, "Verify Shop Response is OK");

    const shopJson = await shopResponse.json();
    const paxTypeMap = await shop.getPaxType(paxType);
    const paxIdOffersItemIdsMap = await shop.getPaxOfferItemIdsMap(paxTypeMap, JSON.stringify(shopJson));

    const price = new priceApi();
    const priceResponse = await price.sendRequestAndGetResponse(`${rmxApiJson}/price`, headers, testInfo, paxIdOffersItemIdsMap);
    await assert.toBe(priceResponse.ok(), true, "Verify Price Response is OK");

    const priceJson = await priceResponse.json();
    const passengerDetailsMap = await price.getPassengerDetailsMap(priceJson, paxTypeMap);
    const offerId = await price.getOfferId(priceJson);

    const createOrder = new createOrderApi();
    const createOrderResponse = await createOrder.sendRequestAndGetResponse(`${omsApiJson}/create`, headers, testInfo, passengerDetailsMap, offerId);
    await assert.toBe(createOrderResponse.ok(), true, "Verify Create Order Response is OK");
    //await assert.toBeEmpty(createOrder.getOrderIdAndWarningMessage(await createOrderResponse.text()).warningMessage, "Verify Warning Message is Empty");
    await assert.notToBeNull(createOrder.getOrderIdAndWarningMessage(await createOrderResponse.text()).orderId, "Verify Order Id is Not Null");
  });
});
