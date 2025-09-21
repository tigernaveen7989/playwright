import { test, expect } from '../../utilities/fixtures';
import { activateJwtToken } from "../../api-base/activatejwttoken";
import { ShopApi } from '../../xml-api/request-and-get-response/shop-xml-request';
import { LoggerFactory } from '../../utilities/logger';
import { PriceApi } from '../../xml-api/request-and-get-response/price-xml-request';
import { CreateOrderApi } from '../../xml-api/request-and-get-response/create-order-xml-request';
import { Assertions} from '../../utilities/assertions';

test.describe.configure({ mode: 'parallel' });
const assert = new Assertions();
const logger = LoggerFactory.getLogger(__filename);

/**
 * TC1: Verify creating a paid order for one-way trip with a single passenger.
 * Steps: Shop request → Verify offers
 */
test(
  'TC1_Verify_Add_One_Way_Single_Pax_One_Way_Create_Paid_Order' +
  ' @allure.label.feature:XML-SinglePax-PaidOrder',
  async ({ testData }, testInfo) => {
    // --------------------- Variable Declarations ---------------------
    const paxType: string = testData.get('paxType')?.toString()!;
    let paxTypeMap: Map<string, string>;
    let paxIdOffersItemIdsMap: Map<string, string>;
    const activateToken = new activateJwtToken();
    const shop = new ShopApi();
    const price = new PriceApi();
    const createOrder = new CreateOrderApi();

    // --------------------- Step 1: Get JWT Token ---------------------
    const headers = await activateToken.getJwtToken(testInfo);
    const { rmxNdcXml, omsNdcXml } = await activateToken.loadConfig();

    const replacements: Record<string, string> = {
      '$DESTINATION': 'MEL',
      '$ARRIVAL': 'BNE',
      '$DATE': '2025-10-20',
      '$SELLER_ORGID': '',
      '$CARRIER_ORGID': '',
      '$AGENT_DUTY': 'NDC',
      '$CITY_CODE': 'DNN',
      '$COUNTRY_CODE': 'AU',
      '$CURRENCY': 'AUD',
      '$LOCATION_CODE': 'SYD',
      '$OWNER_CODE': 'VA'
    };

    // --------------------- Step 2: Shop Request ---------------------
    paxTypeMap = await shop.getPaxType(paxType);
    logger.info('Pax Type Map: ' + JSON.stringify(Object.fromEntries(paxTypeMap), null, 2));

    const shopResponse = await shop.sendRequestAndGetResponse(
      rmxNdcXml + "/shop",
      headers,
      testInfo,
      replacements,
      paxTypeMap
    );

    await assert.toBe(shopResponse.ok(), true, 'Validate Shop Response Is OK');
    await assert.toBe('Hello', 'Hai', 'Validate Hello Text');
    logger.info('Shop request successful');

    // --------------------- Step 3: Parse Shop Response ---------------------
    paxIdOffersItemIdsMap = await shop.getPaxOfferItemIdsMap(
      paxTypeMap,
      await shopResponse.text()
    );

    logger.info('Pax ID → Offer Item ID Map: ' +
      JSON.stringify(Object.fromEntries(paxIdOffersItemIdsMap), null, 2));

    // --------------------- Step 4: Price Request ---------------------
    const priceResponse = await price.sendRequestAndGetResponse(
      rmxNdcXml + "/price",
      headers,
      testInfo,
      replacements,
      paxIdOffersItemIdsMap
    );

    expect(priceResponse.ok()).toBe(true);
    logger.info('Price request successful');

    const passengerDetailsMap: Map<string, Map<string, string>> = await price.getPassengerDetailsMap(await priceResponse.text(), paxTypeMap);

    const offerId: string = await price.getOfferID(await priceResponse.text());
    logger.info('offer id ', offerId);

    const createOrderResponse = await createOrder.sendRequestAndGetResponse(
      omsNdcXml + "/v21_3/orders/create",
      headers,
      testInfo,
      replacements,
      passengerDetailsMap,
      offerId
    );

    expect(createOrderResponse.ok()).toBe(true);
    logger.info('Create Order request successful');
  }
);

/**
 * TC2: Verify creating a paid order for one-way trip with multiple passengers.
 * Steps: Shop request → Get offers → Price request → Verify price
 */
test(
  'TC2_Verify_Add_One_Way_Multi_Pax_Create_Paid_Order' +
  ' @allure.label.feature:XML-Multipax-PaidOrder',
  async ({ testData }, testInfo) => {
    // --------------------- Variable Declarations ---------------------
    const paxType: string = testData.get('paxType')?.toString()!;
    let paxTypeMap: Map<string, string>;
    let paxIdOffersItemIdsMap: Map<string, string>;
    const activateToken = new activateJwtToken();
    const shop = new ShopApi();
    const price = new PriceApi();
    const createOrder = new CreateOrderApi();

    // --------------------- Step 1: Get JWT Token ---------------------
    const headers = await activateToken.getJwtToken(testInfo);
    const { rmxNdcXml, omsNdcXml } = await activateToken.loadConfig();

    const replacements: Record<string, string> = {
      '$DESTINATION': 'MEL',
      '$ARRIVAL': 'SYD',
      '$DATE': '2025-10-16',
      '$SELLER_ORGID': '',
      '$CARRIER_ORGID': '',
      '$AGENT_DUTY': 'NDC',
      '$CITY_CODE': 'DNN',
      '$COUNTRY_CODE': 'AU',
      '$CURRENCY': 'AUD',
      '$LOCATION_CODE': 'SYD',
      '$OWNER_CODE': 'VA'
    };

    // --------------------- Step 2: Shop Request ---------------------
    paxTypeMap = await shop.getPaxType(paxType);
    logger.info('Pax Type Map: ' + JSON.stringify(Object.fromEntries(paxTypeMap), null, 2));

    let shopResponse = await shop.sendRequestAndGetResponse(
      rmxNdcXml + "/shop",
      headers,
      testInfo,
      replacements,
      paxTypeMap
    );

    expect(shopResponse.ok()).toBe(true);
    logger.info('Shop request successful');

    // --------------------- Step 3: Parse Shop Response ---------------------
    paxIdOffersItemIdsMap = await shop.getPaxOfferItemIdsMap(
      paxTypeMap,
      await shopResponse.text()
    );

    logger.info('Pax ID → Offer Item ID Map: ' +
      JSON.stringify(Object.fromEntries(paxIdOffersItemIdsMap), null, 2));

    // --------------------- Step 4: Price Request ---------------------
    const priceResponse = await price.sendRequestAndGetResponse(
      rmxNdcXml + "/price",
      headers,
      testInfo,
      replacements,
      paxIdOffersItemIdsMap
    );

    expect(priceResponse.ok()).toBe(true);
    logger.info('Price request successful');

    const passengerDetailsMap: Map<string, Map<string, string>> = await price.getPassengerDetailsMap(await priceResponse.text(), paxTypeMap);

    const offerId: string = await price.getOfferID(await priceResponse.text());
    logger.info('offer id ', offerId);

    const createOrderResponse = await createOrder.sendRequestAndGetResponse(
      omsNdcXml + "/v21_3/orders/create",
      headers,
      testInfo,
      replacements,
      passengerDetailsMap,
      offerId
    );

    expect(createOrderResponse.ok()).toBe(true);
    logger.info('Create Order request successful');
  }
);
