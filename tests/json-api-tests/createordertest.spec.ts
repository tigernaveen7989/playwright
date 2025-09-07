import { test, expect, request } from '../../utilities/fixtures';
import { activateJwtToken } from "../../api-base/activatejwttoken";
import { shopApi } from '../../json-api/request-and-get-response/shop-api-request';
import { priceApi } from '../../json-api/request-and-get-response/price-api-request';
import { ShopJsonObject } from '../../json-api/create-payload/shop-json-object';
import { LoggerFactory } from '../../utilities/logger';

const logger = LoggerFactory.getLogger(__filename);

test.describe.configure({ mode: 'parallel' });

/**
 * Test 1:
 * Verify JWT token activation and basic GET request with headers.
 */
test('API test with JWT', async ({ request }, testInfo) => {
  let activatejwttoken: activateJwtToken;
  let headers: Record<string, string>;
  let response: any;

  // Assignments
  activatejwttoken = new activateJwtToken();
  headers = await activatejwttoken.getJwtToken(testInfo);
  response = await request.get('https://your-api-endpoint.com', { headers });

  expect(response.ok()).toBeTruthy();
});

/**
 * Test 2:
 * Verify shop API works for single pax scenario and create a paid order.
 */
test(
  'TC1_Verify_Add_One_Way_Single_Pax_One_Way_Create_Paid_Order @allure.label.feature:JSON-SinglePax-PaidOrder',
  async ({ testData }, testInfo) => {
    // 🔹 Variable declarations on top
    let userName: string;
    let password: string;
    let seatType: string;
    let paxType: string;
    let activatejwttoken: activateJwtToken;
    let headers: Record<string, string>;
    let apiContext: any;
    let shopJsonObject: ShopJsonObject;
    let payload: any;
    let response: any;
    let responseBody: string;

    // 🔹 Assignments
    userName = testData.get('userName')?.toString()!;
    password = testData.get('password')?.toString()!;
    seatType = testData.get('seatType')?.toString()!;
    paxType = seatType;

    activatejwttoken = new activateJwtToken();
    headers = await activatejwttoken.getJwtToken(testInfo);
    apiContext = await request.newContext();
    shopJsonObject = new ShopJsonObject("SYD", "BNE", 10, 8, 2025, "EUR");
    payload = JSON.parse(shopJsonObject.getShopPayload(paxType));

    response = await apiContext.post(
      'https://wolverine-retailing-mixer-wl-ut1-rmx-va.apps.cert-02.us-east4.cert.sabre-gcp.com/shop',
      {
        headers: { ...headers, 'Content-Type': 'application/json' },
        data: JSON.stringify(payload),
      }
    );

    responseBody = JSON.stringify(await response.json(), null, 2);
    logger.info("Shop API Response: ", responseBody);
    expect(response.ok()).toBeTruthy();
  }
);

/**
 * Test 3:
 * Verify multi-pax shop + price API integration and create paid order.
 */
test.only(
  'TC2_Verify_Multi_Pax_One_Way_Create_Paid_Order @allure.label.feature:JSON-MultiPax-PaidOrder',
  async ({ testData }, testInfo) => {
    // 🔹 Declarations
    let paxType: string;
    let cityPair: string;
    let seatType: string;
    let activatejwttoken: activateJwtToken;
    let headers: Record<string, string>;
    let rmxApiJson: string;
    let shop: shopApi;
    let price: priceApi;
    let shopResponse: any;
    let priceResponse: any;
    let responseBody: string;
    let paxTypeMap: Map<string, string>;
    let paxIdOffersItemIdsMap: Map<string, string>;

    // 🔹 Assignments
    paxType = testData.get('paxType')?.toString()!;
    cityPair = testData.get('password')?.toString()!;
    seatType = testData.get('seatType')?.toString()!;

    activatejwttoken = new activateJwtToken();
    headers = await activatejwttoken.getJwtToken(testInfo);
    ({ rmxApiJson } = await activatejwttoken.loadConfig());

    shop = new shopApi('SYD', 'BNE', 10, 9, 2025, 'EUR');
    price = new priceApi();

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

    responseBody = JSON.stringify(await priceResponse.json(), null, 2);
    //logger.info('Price API Response:', responseBody);
    expect(priceResponse.ok()).toBe(true);
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
    let shop: shopApi;
    let price: priceApi;
    let shopResponse: any;
    let priceResponse: any;
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
    ({ rmxApiJson } = await activatejwttoken.loadConfig());

    shop = new shopApi('SYD', 'BNE', 10, 9, 2025, 'EUR');
    price = new priceApi();

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

    responseBody = JSON.stringify(await priceResponse.json(), null, 2);
    //logger.info('Price API Response:', responseBody);
    expect(priceResponse.ok()).toBe(true);
  }
);
