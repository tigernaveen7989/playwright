import { test, expect } from '../../utilities/fixtures';
import { activateJwtToken } from "../../api-base/activatejwttoken";
import { ShopApi } from '../../xml-api/request-and-get-response/shop-xml-request';
import { PriceApi } from '../../xml-api/request-and-get-response/price-xml-request';
import { CreateOrderApi } from '../../xml-api/request-and-get-response/create-order-xml-request';

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

  const getReplacements = (destination: string, arrival: string, date: string): Record<string, string> => ({
    '$DESTINATION': destination,
    '$ARRIVAL': arrival,
    '$DATE': date,
    '$SELLER_ORGID': '',
    '$CARRIER_ORGID': '',
    '$AGENT_DUTY': 'NDC',
    '$CITY_CODE': 'DNN',
    '$COUNTRY_CODE': 'AU',
    '$CURRENCY': 'AUD',
    '$LOCATION_CODE': 'SYD',
    '$OWNER_CODE': 'VA'
  });

  test('TC1_Verify_Add_One_Way_Single_Pax_One_Way_Create_Paid_Order', async ({ testData, assert }, testInfo) => {
    const paxType = testData.get('paxType')?.toString()!;
    const replacements = getReplacements('MEL', 'BNE', '2025-12-20');
    const shop = new ShopApi(), price = new PriceApi(), createOrder = new CreateOrderApi(replacements);

    const paxTypeMap = await shop.getPaxType(paxType);
    const shopResponse = await shop.sendRequestAndGetResponse(`${rmxNdcXml}/shop`, headers, testInfo, replacements, paxTypeMap);
    await assert.toBe(shopResponse.ok(), true, 'Validate Shop Response Is OK');

    const paxIdOffersItemIdsMap = await shop.getPaxOfferItemIdsMap(paxTypeMap, await shopResponse.text());
    const priceResponse = await price.sendRequestAndGetResponse(`${rmxNdcXml}/price`, headers, testInfo, replacements, paxIdOffersItemIdsMap);
    await assert.toBe(priceResponse.ok(), true, 'Validate Price Response Is OK');

    const priceText = await priceResponse.text();
    const passengerDetailsMap = await price.getPassengerDetailsMap(priceText, paxTypeMap);
    const offerId = await price.getOfferID(priceText);

    const createOrderResponse = await createOrder.sendRequestAndGetResponse(`${omsNdcXml}/v21_3/orders/create`, headers, testInfo, replacements, passengerDetailsMap, offerId);
    await assert.toBe(createOrderResponse.ok(), true, 'Validate Create Order Response Is OK');
    //await assert.toBeEmpty(createOrder.getWarningMessage(await createOrderResponse), "Verify Warning Message is Empty");
    await assert.notToBeNull(createOrder.getOrderId(await createOrderResponse.text()), "Verify Order Id is Not Null");
  });

  test('TC2_Verify_Add_One_Way_Multi_Pax_Create_Paid_Order', async ({ testData, assert }, testInfo) => {
    const paxType = testData.get('paxType')?.toString()!;
    const replacements = getReplacements('MEL', 'SYD', '2025-12-16');
    const shop = new ShopApi(), price = new PriceApi(), createOrder = new CreateOrderApi(replacements);

    const paxTypeMap = await shop.getPaxType(paxType);
    const shopResponse = await shop.sendRequestAndGetResponse(`${rmxNdcXml}/shop`, headers, testInfo, replacements, paxTypeMap);
    await assert.toBe(shopResponse.ok(), true, 'Validate Shop Response Is OK');

    const paxIdOffersItemIdsMap = await shop.getPaxOfferItemIdsMap(paxTypeMap, await shopResponse.text());
    const priceResponse = await price.sendRequestAndGetResponse(`${rmxNdcXml}/price`, headers, testInfo, replacements, paxIdOffersItemIdsMap);
    await assert.toBe(priceResponse.ok(), true, 'Validate Price Response Is OK');
    const priceText = await priceResponse.text();
    const passengerDetailsMap = await price.getPassengerDetailsMap(priceText, paxTypeMap);
    const offerId = await price.getOfferID(priceText);

    const createOrderResponse = await createOrder.sendRequestAndGetResponse(`${omsNdcXml}/v21_3/orders/create`, headers, testInfo, replacements, passengerDetailsMap, offerId);
    await assert.toBe(createOrderResponse.ok(), true, 'Validate Create Order Response Is OK');
    await assert.toBeEmpty(createOrder.getWarningMessage(await createOrderResponse.text()), "Verify Warning Message is Empty");
    await assert.notToBeNull(createOrder.getOrderId(await createOrderResponse.text()), "Verify Order Id is Not Null");
  });
});
